import { sign } from 'hono/jwt'
import { HTTPException } from 'hono/http-exception'
import { Bindings } from '../types'
import { verifyPassword, verifyTOTP, hashPassword } from '../auth-utils'

export class AuthService {
  constructor(private env: Bindings) {}

  async validateCredentials(username: string, password: string) {
    const user: any = await this.env.DB.prepare(
      'SELECT * FROM users WHERE username = ?'
    ).bind(username).first()

    if (!user) throw new HTTPException(401, { message: 'Invalid credentials' })
    
    const isMatch = await verifyPassword(password, user.password_hash)
    if (!isMatch) { 
      throw new HTTPException(401, { message: 'Invalid credentials' })
    }

    return user
  }

  async verify2FA(user: any, totpCode?: string) {
    if (user.totp_enabled) {
      if (!totpCode) return { requires2FA: true }
      const isValid = await verifyTOTP(user.totp_secret, totpCode)
      if (!isValid) throw new HTTPException(401, { message: 'Invalid 2FA code' })
    }
    return { requires2FA: false }
  }

  async generateToken(userId: string, householdId: string = 'ledger-main-001') {
    const payload = {
      sub: userId,
      householdId,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    }
    
    if (!this.env.JWT_SECRET) throw new HTTPException(500, { message: 'Internal error' })
    return await sign(payload, this.env.JWT_SECRET)
  }

  async findOrCreateSocialUser(provider: string, profile: { id: string, email: string, avatar?: string, name?: string }, tokens?: { access_token: string, refresh_token?: string, expires_in?: number }) {
    let identity: any = await this.env.DB.prepare(
      'SELECT user_id FROM user_identities WHERE provider = ? AND provider_user_id = ?'
    ).bind(provider, profile.id).first()

    let userId = identity?.user_id

    if (!userId) {
      const user: any = await this.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(profile.email).first()
      if (user) {
        userId = user.id
      } else {
        userId = crypto.randomUUID()
        await this.env.DB.prepare('INSERT INTO users (id, email, display_name, avatar_url) VALUES (?, ?, ?, ?)')
          .bind(userId, profile.email, profile.name || `${provider} User`, profile.avatar).run()
      }
      
      const identityId = crypto.randomUUID()
      const expiresAt = tokens?.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null
      await this.env.DB.prepare('INSERT INTO user_identities (id, user_id, provider, provider_user_id, access_token, refresh_token, token_expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(identityId, userId, provider, profile.id, tokens?.access_token, tokens?.refresh_token, expiresAt).run()
    } else if (tokens) {
      // Update tokens for existing identity
      const expiresAt = tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null
      await this.env.DB.prepare('UPDATE user_identities SET access_token = ?, refresh_token = ?, token_expires_at = ? WHERE provider = ? AND provider_user_id = ?')
        .bind(tokens.access_token, tokens.refresh_token, expiresAt, provider, profile.id).run()
    }

    return userId
  }

  async setupTOTP(userId: string) {
    const secret = await generateTOTPSecret()
    await this.env.DB.prepare('UPDATE users SET totp_secret = ? WHERE id = ?')
      .bind(secret, userId).run()
    return secret
  }

  async verifyAndEnableTOTP(userId: string, code: string) {
    const user: any = await this.env.DB.prepare('SELECT totp_secret FROM users WHERE id = ?').bind(userId).first()
    const isValid = await verifyTOTP(user.totp_secret, code)
    if (isValid) {
      await this.env.DB.prepare('UPDATE users SET totp_enabled = 1 WHERE id = ?').bind(userId).run()
      return true
    }
    return false
  }

  async createAdminInvite(role: string = 'super_admin') {
    const token = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24))))
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 32)
    
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24) // 24h expiry

    await this.env.DB.prepare(
      'INSERT INTO admin_invitations (token, role, expires_at) VALUES (?, ?, ?)'
    ).bind(token, role, expiresAt.toISOString()).run()

    return token
  }

  async consumeAdminInvite(token: string, username: string, password: string, email: string) {
    // 1. Verify invitation
    const invite: any = await this.env.DB.prepare(
      'SELECT * FROM admin_invitations WHERE token = ? AND is_claimed = 0 AND expires_at > CURRENT_TIMESTAMP'
    ).bind(token).first()

    if (!invite) throw new HTTPException(400, { message: 'Invalid or expired invitation' })

    // 2. Create User
    const userId = crypto.randomUUID()
    const passwordHash = await hashPassword(password)
    
    await this.env.DB.batch([
      this.env.DB.prepare(
        'INSERT INTO users (id, username, email, password_hash, global_role, status) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(userId, username, email, passwordHash, invite.role, 'active'),
      this.env.DB.prepare(
        'UPDATE admin_invitations SET is_claimed = 1 WHERE token = ?'
      ).bind(token)
    ])

    return userId
  }
}
