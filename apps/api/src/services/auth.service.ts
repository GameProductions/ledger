import { sign } from 'hono/jwt'
import { HTTPException } from 'hono/http-exception'
import { Bindings } from '../types'
import { verifyPassword, verifyTOTP, hashPassword } from '../auth-utils'
import { EmailService } from './email.service'

export class AuthService {
  constructor(private env: Bindings) {}

  async validateCredentials(identifier: string, password: string) {
    console.log('[Auth] Attempting login for:', identifier)
    
    const user: any = await this.env.DB.prepare(
      'SELECT * FROM users WHERE username = ? OR email = ?'
    ).bind(identifier, identifier).first()

    if (!user) {
      console.warn('[Auth] User not found:', identifier)
      throw new HTTPException(401, { message: 'Invalid credentials' })
    }
    
    const isMatch = await verifyPassword(password, user.password_hash)
    if (!isMatch) { 
      console.warn('[Auth] Password mismatch for:', identifier)
      throw new HTTPException(401, { message: 'Invalid credentials' })
    }

    // --- RE-HASH ON LOGIN (v3.11.3 Security Hardening) ---
    // If successful, check if iterations are legacy (100k) and upgrade to 600k
    const [iterations] = user.password_hash.split('.')
    if (parseInt(iterations) < 100000) {
      console.log('[Auth] Upgrading password hash iterations for:', user.username)
      const newHash = await hashPassword(password)
      await this.env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
        .bind(newHash, user.id).run()
    }

    console.log('[Auth] Login successful for:', user.username)
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

  // --- PASSWORD LIFECYCLE (v2.4.0) ---

  async requestPasswordReset(identifier: string) {
    const user: any = await this.env.DB.prepare('SELECT id, email FROM users WHERE email = ? OR username = ?').bind(identifier, identifier).first()
    if (!user) return null // Silent fail for security

    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 3600000).toISOString() // 1h
    
    await this.env.DB.prepare(
      'INSERT INTO password_resets (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)'
    ).bind(crypto.randomUUID(), user.id, token, expiresAt).run()

    // Trigger Email Integration
    const emailService = new EmailService(this.env)
    try {
      await emailService.sendPasswordResetEmail(user.email, token)
    } catch (e) {
      console.error('[AuthService] Failed to send recovery email:', e)
      // We still return the token so dev recovery works via console/DB
    }

    return token
  }

  async resetPassword(token: string, newPassword: string) {
    // Standardize comparison by using unix timestamps or reliable string formats
    const reset: any = await this.env.DB.prepare(
      'SELECT * FROM password_resets WHERE token = ? AND is_used = 0 AND expires_at > DATETIME("now")'
    ).bind(token).first()

    if (!reset) throw new HTTPException(400, { message: 'Invalid or expired reset token' })

    const passwordHash = await hashPassword(newPassword)
    await this.env.DB.batch([
      this.env.DB.prepare('UPDATE users SET password_hash = ?, force_password_change = 0 WHERE id = ?').bind(passwordHash, reset.user_id),
      this.env.DB.prepare('UPDATE password_resets SET is_used = 1 WHERE token = ?').bind(token)
    ])
    return true
  }

  async changePassword(userId: string, newPassword: string) {
    const passwordHash = await hashPassword(newPassword)
    await this.env.DB.prepare('UPDATE users SET password_hash = ?, force_password_change = 0 WHERE id = ?').bind(passwordHash, userId).run()
    return true
  }

  async adminResetPassword(userId: string, newPassword: string, isTemporary: boolean = false) {
    const passwordHash = await hashPassword(newPassword)
    await this.env.DB.prepare('UPDATE users SET password_hash = ?, force_password_change = ? WHERE id = ?')
      .bind(passwordHash, isTemporary ? 1 : 0, userId).run()
    return true
  }

  // --- PASSKEY MANAGEMENT (v2.4.0) ---

  async updatePasskeyName(passkeyId: string, userId: string, name: string, isAdmin: boolean = false) {
    const query = isAdmin 
      ? 'UPDATE passkeys SET name = ? WHERE id = ?' 
      : 'UPDATE passkeys SET name = ? WHERE id = ? AND user_id = ?'
    const params = isAdmin ? [name, passkeyId] : [name, passkeyId, userId]
    
    await this.env.DB.prepare(query).bind(...params).run()
    return true
  }

  async removePasskey(passkeyId: string, userId: string, isAdmin: boolean = false) {
    const query = isAdmin 
      ? 'DELETE FROM passkeys WHERE id = ?' 
      : 'DELETE FROM passkeys WHERE id = ? AND user_id = ?'
    const params = isAdmin ? [passkeyId] : [passkeyId, userId]
    
    await this.env.DB.prepare(query).bind(...params).run()
    return true
  }
}
