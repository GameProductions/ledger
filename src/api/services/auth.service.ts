import { sign } from 'hono/jwt'
import { HTTPException } from 'hono/http-exception'
import { Bindings } from '../types'
import { verifyPassword, verifyTOTP, hashPassword, generateTOTPSecret } from '../auth-utils'
import { EmailService } from './email.service'
import { getDb } from '../db'
import { users, userIdentities, passwordResets, passkeys, adminInvitations, totps, userHouseholds } from '../db/schema'
import { eq, or, and, gt, sql } from 'drizzle-orm'
import { encrypt, decrypt } from '../utils'

export class AuthService {
  constructor(private env: Bindings) {}

  async validateCredentials(identifier: string, password: string) {
    console.log('[Auth] Attempting login for:', identifier)
    
    const db = getDb(this.env)
    const result = await db.select().from(users).where(
      or(eq(users.username, identifier), eq(users.email, identifier))
    ).limit(1)
    
    const user = result[0]

    if (!user) {
      console.warn('[Auth] User not found:', identifier)
      throw new HTTPException(401, { message: 'Invalid credentials' })
    }

    if (!user.passwordHash) {
      console.warn('[Auth] Attempted password login on social-only account:', identifier)
      throw new HTTPException(401, { message: 'Account linked via social provider. Please use Discord or Google login.' })
    }
    
    const isMatch = await verifyPassword(password, user.passwordHash)
    if (!isMatch) { 
      console.warn('[Auth] Password mismatch for:', identifier)
      throw new HTTPException(401, { message: 'Invalid credentials' })
    }

    // --- RE-HASH ON LOGIN (v3.11.3 Security Hardening) ---
    const [iterations] = user.passwordHash.split('.')
    if (parseInt(iterations) < 100000) {
      console.log('[Auth] Upgrading password hash iterations for:', user.username)
      const newHash = await hashPassword(password)
      await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, user.id))
    }

    console.log('[Auth] Login successful for:', user.username)
    return user
  }

  async verify2FA(user: any, totpCode?: string) {
    if (user.totpEnabled) {
      if (!totpCode) return { requires2FA: true }
      const db = getDb(this.env)
      const userTotps = await db.select({ secret: totps.secret }).from(totps).where(eq(totps.userId, user.id))
      
      let isValid = false
      for (const t of userTotps) {
        let decryptedSecret = t.secret
        if (t.secret.includes('.')) {
          const attempt = await decrypt(t.secret, this.env.ENCRYPTION_KEY || this.env.JWT_SECRET)
          if (attempt !== 'DECRYPTION_FAILED') decryptedSecret = attempt
        }
        
        if (await verifyTOTP(decryptedSecret, totpCode)) {
          isValid = true
          break
        }
      }
      
      if (!isValid) throw new HTTPException(401, { message: 'Invalid 2FA code' })
    }
    return { requires2FA: false }
  }

  async generateToken(userId: string, sid?: string, householdId?: string, impersonatorId?: string) {
    const db = getDb(this.env)
    
    // FORENSIC HARDENING: Do not rely on hardcoded defaults for household context
    let targetHouseholdId = householdId
    if (!targetHouseholdId) {
      // @ts-ignore
      const userHh = await db.select({ householdId: userHouseholds.householdId })
        // @ts-ignore
        .from(userHouseholds)
        .where(eq(userHouseholds.userId, userId))
        .limit(1)
      targetHouseholdId = userHh[0]?.householdId || 'ledger-main-001'
    }

    const [user] = await db.select({ globalRole: users.globalRole }).from(users).where(eq(users.id, userId)).limit(1)

    const payload: any = {
      sub: userId,
      sid: sid, // Forensic Session Tracker
      householdId: targetHouseholdId,
      globalRole: user?.globalRole || 'user',
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    }
    
    if (impersonatorId) payload.impersonatorId = impersonatorId

    if (!this.env.JWT_SECRET) throw new HTTPException(500, { message: 'Internal error' })
    return await sign(payload, this.env.JWT_SECRET, 'HS256')
  }


  async findOrCreateSocialUser(provider: string, profile: { id: string, email: string, avatar?: string, name?: string }, tokens?: { access_token: string, refresh_token?: string, expires_in?: number }) {
    const db = getDb(this.env)
    const identityResult = await db.select({ userId: userIdentities.userId })
      .from(userIdentities)
      .where(and(eq(userIdentities.provider, provider), eq(userIdentities.providerUserId, profile.id)))
      .limit(1)

    let userId = identityResult[0]?.userId

    if (!userId) {
      const userResult = await db.select({ id: users.id }).from(users).where(eq(users.email, profile.email)).limit(1)
      if (userResult[0]) {
        userId = userResult[0].id
      } else {
        userId = crypto.randomUUID()
        await db.insert(users).values({
          id: userId,
          email: profile.email,
          displayName: profile.name || `${provider} User`,
          avatarUrl: profile.avatar || null,
        })
      }
      
      const identityId = crypto.randomUUID()
      const expiresAt = tokens?.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null
      
      const accessTokenEnc = tokens?.access_token ? await encrypt(tokens.access_token, this.env.ENCRYPTION_KEY || this.env.JWT_SECRET) : null
      const refreshTokenEnc = tokens?.refresh_token ? await encrypt(tokens.refresh_token, this.env.ENCRYPTION_KEY || this.env.JWT_SECRET) : null

      await db.insert(userIdentities).values({
        id: identityId,
        userId: userId,
        provider: provider,
        providerUserId: profile.id,
        email: profile.email ?? null,
        name: profile.name ?? null,
        avatarUrl: profile.avatar ?? null,
        accessToken: accessTokenEnc,
        refreshToken: refreshTokenEnc,
        tokenExpiresAt: expiresAt,
      })
    } else if (tokens) {
      const expiresAt = tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null
      
      const accessTokenEnc = tokens.access_token ? await encrypt(tokens.access_token, this.env.ENCRYPTION_KEY || this.env.JWT_SECRET) : null
      const refreshTokenEnc = tokens.refresh_token ? await encrypt(tokens.refresh_token, this.env.ENCRYPTION_KEY || this.env.JWT_SECRET) : null

      await db.update(userIdentities).set({
        email: profile.email ?? null,
        name: profile.name ?? null,
        avatarUrl: profile.avatar ?? null,
        accessToken: accessTokenEnc,
        refreshToken: refreshTokenEnc,
        tokenExpiresAt: expiresAt,
        updatedAt: new Date().toISOString()
      }).where(and(eq(userIdentities.provider, provider), eq(userIdentities.providerUserId, profile.id)))
    }

    return userId
  }

  async linkSocialAccount(userId: string, provider: string, profile: { id: string, email: string, avatar?: string, name?: string }, tokens?: { access_token: string, refresh_token?: string, expires_in?: number }) {
    const db = getDb(this.env)
    const existingResult = await db.select({ userId: userIdentities.userId })
      .from(userIdentities)
      .where(and(eq(userIdentities.provider, provider), eq(userIdentities.providerUserId, profile.id)))
      .limit(1)
    
    const existing = existingResult[0]

    if (existing && existing.userId !== userId) {
      throw new HTTPException(409, { message: `This ${provider} account is already linked to another Ledger user.` })
    }

    if (!existing) {
      const identityId = crypto.randomUUID()
      const expiresAt = tokens?.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null
      
      const accessTokenEnc = tokens?.access_token ? await encrypt(tokens.access_token, this.env.ENCRYPTION_KEY || this.env.JWT_SECRET) : null
      const refreshTokenEnc = tokens?.refresh_token ? await encrypt(tokens.refresh_token, this.env.ENCRYPTION_KEY || this.env.JWT_SECRET) : null

      await db.insert(userIdentities).values({
        id: identityId,
        userId: userId,
        provider: provider,
        providerUserId: profile.id,
        email: profile.email ?? null,
        name: profile.name ?? null,
        avatarUrl: profile.avatar ?? null,
        accessToken: accessTokenEnc,
        refreshToken: refreshTokenEnc,
        tokenExpiresAt: expiresAt,
      })
    } else {
      const expiresAt = tokens?.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null
      
      const accessTokenEnc = tokens?.access_token ? await encrypt(tokens.access_token, this.env.ENCRYPTION_KEY || this.env.JWT_SECRET) : null
      const refreshTokenEnc = tokens?.refresh_token ? await encrypt(tokens.refresh_token, this.env.ENCRYPTION_KEY || this.env.JWT_SECRET) : null

      await db.update(userIdentities).set({
        email: profile.email ?? null,
        name: profile.name ?? null,
        avatarUrl: profile.avatar ?? null,
        accessToken: accessTokenEnc,
        refreshToken: refreshTokenEnc,
        tokenExpiresAt: expiresAt,
        updatedAt: new Date().toISOString()
      }).where(and(
        eq(userIdentities.provider, provider), 
        eq(userIdentities.providerUserId, profile.id), 
        eq(userIdentities.userId, userId)
      ))
    }

    return userId
  }

  async setupTOTP(userId: string) {
    const secret = await generateTOTPSecret()
    return secret
  }

  async verifyAndEnableTOTP(userId: string, code: string, secret: string, name: string = 'Authenticator App') {
    const db = getDb(this.env)
    const isValid = await verifyTOTP(secret, code)
    if (isValid) {
      const encryptedSecret = await encrypt(secret, this.env.ENCRYPTION_KEY || this.env.JWT_SECRET)
      await db.insert(totps).values({
        id: crypto.randomUUID(),
        userId,
        secret: encryptedSecret,
        name
      })
      await db.update(users).set({ totpEnabled: 1 }).where(eq(users.id, userId))
      return true
    }
    return false
  }

  async createAdminInvite(role: string = 'super_admin') {
    const db = getDb(this.env)
    const token = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24))))
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 32)
    
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    await db.insert(adminInvitations).values({
      token: token,
      role: role,
      expiresAt: expiresAt.toISOString(),
    })

    return token
  }

  async consumeAdminInvite(token: string, username: string, password: string, email: string) {
    const db = getDb(this.env)
    const inviteResult = await db.select().from(adminInvitations).where(
      and(
        eq(adminInvitations.token, token),
        eq(adminInvitations.isClaimed, 0),
        gt(adminInvitations.expiresAt, sql`CURRENT_TIMESTAMP`)
      )
    ).limit(1)

    const invite = inviteResult[0]
    if (!invite) throw new HTTPException(400, { message: 'Invalid or expired invitation' })

    const userId = crypto.randomUUID()
    const passwordHash = await hashPassword(password)
    
    await db.batch([
      db.insert(users).values({
        id: userId,
        username: username,
        email: email,
        passwordHash: passwordHash,
        globalRole: invite.role,
        status: 'active'
      }),
      db.update(adminInvitations).set({ isClaimed: 1 }).where(eq(adminInvitations.token, token))
    ])

    return userId
  }

  async requestPasswordReset(identifier: string) {
    const db = getDb(this.env)
    const userResult = await db.select({ id: users.id, email: users.email }).from(users).where(
      or(eq(users.email, identifier), eq(users.username, identifier))
    ).limit(1)
    const user = userResult[0]
    if (!user || !user.email) return null 

    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 3600000).toISOString() 
    
    await db.insert(passwordResets).values({
      id: crypto.randomUUID(),
      userId: user.id,
      token: token,
      expiresAt: expiresAt,
    })

    const emailService = new EmailService(this.env)
    try {
      await emailService.sendPasswordResetEmail(user.email, token)
    } catch (e) {
      console.error('[AuthService] Failed to send recovery email:', e)
    }

    return token
  }

  async resetPassword(token: string, newPassword: string) {
    const db = getDb(this.env)
    const resetResult = await db.select().from(passwordResets).where(
      and(
        eq(passwordResets.token, token),
        eq(passwordResets.isUsed, 0),
        gt(passwordResets.expiresAt, sql`DATETIME("now")`)
      )
    ).limit(1)
    const reset = resetResult[0]
    if (!reset) throw new HTTPException(400, { message: 'Invalid or expired reset token' })

    const passwordHash = await hashPassword(newPassword)
    await db.batch([
      db.update(users).set({ passwordHash: passwordHash, forcePasswordChange: 0 }).where(eq(users.id, reset.userId)),
      db.update(passwordResets).set({ isUsed: 1 }).where(eq(passwordResets.token, token))
    ])
    return true
  }

  async changePassword(userId: string, newPassword: string) {
    const db = getDb(this.env)
    const passwordHash = await hashPassword(newPassword)
    await db.update(users).set({ passwordHash: passwordHash, forcePasswordChange: 0 }).where(eq(users.id, userId))
    return true
  }

  async adminResetPassword(userId: string, newPassword: string, isTemporary: boolean = false) {
    const db = getDb(this.env)
    const passwordHash = await hashPassword(newPassword)
    await db.update(users).set({ passwordHash: passwordHash, forcePasswordChange: isTemporary ? 1 : 0 }).where(eq(users.id, userId))
    return true
  }

  async updatePasskeyName(passkeyId: string, userId: string, name: string, isAdmin: boolean = false) {
    const db = getDb(this.env)
    if (isAdmin) {
      await db.update(passkeys).set({ name }).where(eq(passkeys.id, passkeyId))
    } else {
      await db.update(passkeys).set({ name }).where(and(eq(passkeys.id, passkeyId), eq(passkeys.userId, userId)))
    }
    return true
  }

  async removePasskey(passkeyId: string, userId: string, isAdmin: boolean = false) {
    const db = getDb(this.env)
    if (isAdmin) {
      await db.delete(passkeys).where(eq(passkeys.id, passkeyId))
    } else {
      await db.delete(passkeys).where(and(eq(passkeys.id, passkeyId), eq(passkeys.userId, userId)))
    }
    return true
  }
}
