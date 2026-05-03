import { sign } from 'hono/jwt'
import { HTTPException } from 'hono/http-exception'
import { Bindings } from '../types'
import { verifyPassword, hashPassword } from '../auth-utils'
import { EmailService } from './email.service'
import { getDb } from '#/index'
import { users, userIdentities, passwordResets, passkeys, adminInvitations, userHouseholds, backupCodes } from '#/schema'
import { eq, or, and, gt, sql } from 'drizzle-orm'
import { VaultService } from '../utils/vault.service'

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

    // --- LOCKOUT CHECK (Titan Guard v2.1) ---
    if (user.lockoutUntil) {
      const lockoutDate = new Date(user.lockoutUntil);
      if (lockoutDate > new Date()) {
        const remainingMinutes = Math.ceil((lockoutDate.getTime() - Date.now()) / (1000 * 60));
        console.warn(`[Auth] Account locked for ${identifier}. Remaining: ${remainingMinutes}m`);
        throw new HTTPException(403, { 
          message: `Account is temporarily locked due to multiple failed attempts. Please try again in ${remainingMinutes} minutes.` 
        });
      }
    }

    if (!user.passwordHash) {
      console.warn('[Auth] Attempted password login on social-only account:', identifier)
      throw new HTTPException(401, { message: 'Account linked via social provider. Please use Discord or Google login.' })
    }
    
    const isMatch = await verifyPassword(password, user.passwordHash)
    
    if (!isMatch) { 
      console.warn('[Auth] Password mismatch for:', identifier)
      
      // Increment failed attempts
      const newAttempts = (user.failedLoginAttempts || 0) + 1;
      const updateData: any = { failedLoginAttempts: newAttempts };
      
      if (newAttempts >= 5) {
        const lockoutMinutes = 30;
        const lockoutUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000).toISOString();
        updateData.lockoutUntil = lockoutUntil;
        console.error(`[Auth] Triggering lockout for ${identifier} (Attempts: ${newAttempts})`);
      }
      
      await db.update(users).set(updateData).where(eq(users.id, user.id));
      
      const remaining = 5 - newAttempts;
      throw new HTTPException(401, { 
        message: remaining > 0 
          ? `Invalid credentials. ${remaining} attempts remaining before account lockout.` 
          : 'Account has been locked for 30 minutes due to too many failed attempts.' 
      })
    }

    // --- RESET LOCKOUT ON SUCCESS ---
    if (user.failedLoginAttempts !== 0 || user.lockoutUntil) {
      await db.update(users).set({ 
        failedLoginAttempts: 0, 
        lockoutUntil: null 
      }).where(eq(users.id, user.id));
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

  async verify2FA(user: any, recoveryCode?: string, metadata?: any) {
    // TOTP Decommissioned in v6.1 - Only backup codes and passkeys (handled via WebAuthn routes) remain
    if (recoveryCode) {
      console.log(`[Auth] Attempting backup code verification for user ${user.id}`)
      const isValid = await this.verifyBackupCode(user.id, recoveryCode)
      if (!isValid) {
        throw new HTTPException(401, { message: 'Invalid recovery code' })
      }
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
      sid: sid, // Session Tracker
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
          username: profile.email || userId,
          displayName: profile.name || `${provider} User`,
          avatarUrl: profile.avatar || null,
        })
      }
      
      const vaultService = new VaultService(db, this.env.ENCRYPTION_KEY)
      const identityId = crypto.randomUUID()
      const expiresAt = tokens?.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null
      
      await db.insert(userIdentities).values({
        id: identityId,
        userId: userId,
        provider: provider,
        providerUserId: profile.id,
        email: profile.email ?? null,
        name: profile.name ?? null,
        avatarUrl: profile.avatar ?? null,
        accessToken: null, // Moved to vault
        refreshToken: null, // Moved to vault
        tokenExpiresAt: expiresAt,
      })

      if (tokens) {
        if (tokens.access_token) {
          await vaultService.setSecret(userId, 'OAUTH_ACCESS', provider, tokens.access_token)
        }
        if (tokens.refresh_token) {
          await vaultService.setSecret(userId, 'OAUTH_REFRESH', provider, tokens.refresh_token)
        }
      }
    } else if (tokens) {
      const vaultService = new VaultService(db, this.env.ENCRYPTION_KEY)
      const expiresAt = tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null
      
      await db.update(userIdentities).set({
        email: profile.email ?? null,
        name: profile.name ?? null,
        avatarUrl: profile.avatar ?? null,
        accessToken: null, // Moved to vault
        refreshToken: null, // Moved to vault
        tokenExpiresAt: expiresAt,
        updatedAt: new Date().toISOString()
      }).where(and(eq(userIdentities.provider, provider), eq(userIdentities.providerUserId, profile.id)))

      if (tokens.access_token) {
        await vaultService.setSecret(userId, 'OAUTH_ACCESS', provider, tokens.access_token);
      }
      if (tokens.refresh_token) {
        await vaultService.setSecret(userId, 'OAUTH_REFRESH', provider, tokens.refresh_token);
      }
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
      const vaultService = new VaultService(db, this.env.ENCRYPTION_KEY)
      const identityId = crypto.randomUUID()
      const expiresAt = tokens?.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null
      
      await db.insert(userIdentities).values({
        id: identityId,
        userId: userId,
        provider: provider,
        providerUserId: profile.id,
        email: profile.email ?? null,
        name: profile.name ?? null,
        avatarUrl: profile.avatar ?? null,
        accessToken: tokens?.access_token ? '[ENCRYPTED]' : null,
        refreshToken: tokens?.refresh_token ? '[ENCRYPTED]' : null,
        tokenExpiresAt: expiresAt,
      })

      if (tokens) {
        if (tokens.access_token) {
          await vaultService.setSecret(userId, 'OAUTH_ACCESS', provider, tokens.access_token);
        }
        if (tokens.refresh_token) {
          await vaultService.setSecret(userId, 'OAUTH_REFRESH', provider, tokens.refresh_token);
        }
      }
    } else {
      const vaultService = new VaultService(db, this.env.ENCRYPTION_KEY)
      const expiresAt = tokens?.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null
      
      await db.update(userIdentities).set({
        email: profile.email ?? null,
        name: profile.name ?? null,
        avatarUrl: profile.avatar ?? null,
        accessToken: tokens?.access_token ? '[ENCRYPTED]' : null,
        refreshToken: tokens?.refresh_token ? '[ENCRYPTED]' : null,
        tokenExpiresAt: expiresAt,
        updatedAt: new Date().toISOString()
      }).where(and(
        eq(userIdentities.provider, provider), 
        eq(userIdentities.providerUserId, profile.id), 
        eq(userIdentities.userId, userId)
      ))

      if (tokens) {
        if (tokens.access_token) {
          await vaultService.setSecret(userId, 'OAUTH_ACCESS', provider, tokens.access_token);
        }
        if (tokens.refresh_token) {
          await vaultService.setSecret(userId, 'OAUTH_REFRESH', provider, tokens.refresh_token);
        }
      }
    }

    return userId
  }


  async createAdminInvite(role: string = 'super_admin') {
    const db = getDb(this.env)
    const token = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24))))
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 32)
    
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    await db.insert(adminInvitations).values({
      id: crypto.randomUUID(),
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

  // --- BACKUP CODES (Titan Guard v6.1 - Gold Standard) ---
  async generateBackupCodes(userId: string) {
    const db = getDb(this.env)
    
    // 1. Clear existing codes
    await db.delete(backupCodes).where(eq(backupCodes.userId, userId))
    
    // 2. Generate 10 new codes
    const newCodes = Array.from({ length: 10 }, () => 
      Math.random().toString(36).substring(2, 10).toUpperCase()
    )
    
    // 3. Hash and save
    const insertPromises = newCodes.map(async (code) => {
      const codeHash = await hashPassword(code)
      return db.insert(backupCodes).values({
        id: crypto.randomUUID(),
        userId,
        codeHash,
      })
    })
    
    await Promise.all(insertPromises)
    
    // 4. Ensure legacy field is cleared
    await db.update(users).set({ backupCodesJson: '[]' }).where(eq(users.id, userId))
    
    return newCodes
  }

  async verifyBackupCode(userId: string, code: string) {
    const db = getDb(this.env)
    const storedCodes = await db.select().from(backupCodes).where(eq(backupCodes.userId, userId))
    
    if (storedCodes.length === 0) return false
    
    const normalizedCode = code.toUpperCase()
    
    for (const stored of storedCodes) {
      if (await verifyPassword(normalizedCode, stored.codeHash)) {
        // Delete for maximum security
        await db.delete(backupCodes).where(eq(backupCodes.id, stored.id))
        
        console.log(`[Auth] Backup code verified and consumed for user ${userId}`)
        return true
      }
    }
    
    return false
  }

  // --- PERSONALIZATION ---
  async updatePreferences(userId: string, preferences: { locale?: string, theme?: string }) {
    const db = getDb(this.env)
    await db.update(users).set(preferences).where(eq(users.id, userId))
    return true
  }
}
