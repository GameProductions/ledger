import { sign } from 'hono/jwt'
import { HTTPException } from 'hono/http-exception'
import { Bindings } from '../types'
import { verifyPassword, hashPassword } from '../auth-utils'
import { EmailService } from './email.service'
import { getDb } from '#/index'
import { users, userIdentities, passwordResets, passkeys, adminInvitations, userHouseholds, backupCodes, households } from '#/schema'
import { eq, or, and, gt, sql } from 'drizzle-orm'
import { VaultService } from '../utils/vault.service'
import { hashToken, hashIdentifier } from '../utils/security'

export class AuthService {
  constructor(private env: Bindings) {}

  async validateCredentials(identifier: string, password: string) {
    // Login attempt
    
    const db = getDb(this.env)
    const result = (await db.select().from(users).where(
          or(eq(users.username, identifier), eq(users.email, identifier))
        ).limit(1) as any)
    
    const user = result[0]

    if (!user) {
      // User not found
      throw new HTTPException(401, { message: 'Invalid credentials' })
    }

    // --- LOCKOUT CHECK (Fleet Security v2.1) ---
    if (user.lockoutUntil) {
      const lockoutDate = new Date(user.lockoutUntil);
      if (lockoutDate > new Date()) {
        const remainingMinutes = Math.ceil((lockoutDate.getTime() - Date.now()) / (1000 * 60));
        // Account locked
        throw new HTTPException(403, { 
          message: `Account is temporarily locked due to multiple failed attempts. Please try again in ${remainingMinutes} minutes.` 
        });
      }
    }

    if (!user.passwordHash) {
      // Social-only attempt
      throw new HTTPException(401, { message: 'Account linked via social provider. Please use Discord or Google login.' })
    }
    
    const isMatch = (await verifyPassword(password, user.passwordHash) as any)
    
    if (!isMatch) { 
      // Password mismatch
      
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
      // Upgrading hash
      const newHash = (await hashPassword(password) as any)
      await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, user.id))
    }

    console.log('[Auth] Login successful for:', user.username)

    return user
  }

  // TOTP/2FA logic decommissioned in v6.1 in favor of Biometric Passkeys (handled via WebAuthn routes)

  async generateToken(userId: string, sid?: string, householdId?: string, impersonatorId?: string) {
    const db = getDb(this.env)
    
    // FORENSIC HARDENING: Do not rely on hardcoded defaults for household context
    let targetHouseholdId = householdId
    if (!targetHouseholdId) {
      // @ts-ignore
      const userHh = (await db.select({ householdId: userHouseholds.householdId })
              // @ts-ignore
              .from(userHouseholds)
              .where(eq(userHouseholds.userId, userId))
              .limit(1) as any)
      targetHouseholdId = userHh[0]?.householdId
      
      if (!targetHouseholdId) {
        targetHouseholdId = 'ledger-main-001'
        try {
          // Dynamically seed default household if missing
          await db.insert(households).values({
            id: 'ledger-main-001',
            name: 'Primary Household',
            currency: 'USD'
          }).onConflictDoNothing()
          
          await db.insert(userHouseholds).values({
            userId: userId,
            householdId: 'ledger-main-001',
            role: 'admin'
          }).onConflictDoNothing()
        } catch (err) {
          console.error('[Auth Service] Failed to dynamically seed default household:', err)
        }
      }
    }

    const [user] = (await db.select({ globalRole: users.globalRole }).from(users).where(eq(users.id, userId)).limit(1) as any)

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
    const identityResult = (await db.select({ userId: userIdentities.userId })
          .from(userIdentities)
          .where(and(eq(userIdentities.provider, provider), eq(userIdentities.providerUserId, profile.id)))
          .limit(1) as any)

    let userId = identityResult[0]?.userId

    if (!userId) {
      const userResult = (await db.select({ id: users.id }).from(users).where(eq(users.email, profile.email)).limit(1) as any)
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
    const existingResult = (await db.select({ userId: userIdentities.userId })
          .from(userIdentities)
          .where(and(eq(userIdentities.provider, provider), eq(userIdentities.providerUserId, profile.id)))
          .limit(1) as any)
    
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


  async createAdminInvite(role: string = 'owner') {
    const db = getDb(this.env)
    const token = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24))))
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 32)
    
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    const tokenHash = (await hashToken(token) as any)

    await db.insert(adminInvitations).values({
      id: crypto.randomUUID(),
      tokenHash: tokenHash,
      role: role,
      expiresAt: expiresAt.toISOString(),
    })

    return token
  }

  async consumeAdminInvite(token: string | undefined, username: string, password: string, email: string) {
    const db = getDb(this.env)
    
    // First user setup flow check
    const existingUsers = await db.select({ id: users.id }).from(users).limit(1)
    if (existingUsers.length === 0) {
      const userId = crypto.randomUUID()
      const passwordHash = (await hashPassword(password) as any)
      
      // Create owner user
      await db.insert(users).values({
        id: userId,
        username: username,
        email: email,
        passwordHash: passwordHash,
        globalRole: 'owner',
        status: 'active'
      })
      
      // Create primary default household
      await db.insert(households).values({
        id: 'ledger-main-001',
        name: 'Primary Household',
        currency: 'USD'
      })
      
      // Associate owner with the default household
      await db.insert(userHouseholds).values({
        userId: userId,
        householdId: 'ledger-main-001',
        role: 'admin'
      })
      
      return userId
    }

    // Check duplicate username/email (User Management SOP)
    const duplicate = await db.select({ id: users.id })
      .from(users)
      .where(or(eq(users.username, username), eq(users.email, email)))
      .limit(1)
    if (duplicate.length > 0) {
      throw new HTTPException(409, { message: 'Username or email already exists' })
    }

    if (!token) throw new HTTPException(400, { message: 'Invitation token is required' })
    const tokenHash = (await hashToken(token) as any)
    
    const inviteResult = (await db.select().from(adminInvitations).where(
          and(
            eq(adminInvitations.tokenHash, tokenHash),
            eq(adminInvitations.isClaimed, false),
            gt(adminInvitations.expiresAt, new Date().toISOString())
          )
        ).limit(1) as any)

    const invite = inviteResult[0]
    if (!invite) throw new HTTPException(400, { message: 'Invalid or expired invitation' })

    const userId = crypto.randomUUID()
    const passwordHash = (await hashPassword(password) as any)
    
    await db.insert(users).values({
      id: userId,
      username: username,
      email: email,
      passwordHash: passwordHash,
      globalRole: invite.role,
      status: 'active'
    })
    await db.update(adminInvitations).set({ isClaimed: true }).where(eq(adminInvitations.tokenHash, tokenHash))

    return userId
  }

  async requestPasswordReset(identifier: string) {
    const db = getDb(this.env)
    const userResult = (await db.select({ id: users.id, email: users.email }).from(users).where(
          or(eq(users.email, identifier), eq(users.username, identifier))
        ).limit(1) as any)
    const user = userResult[0]
    if (!user || !user.email) return null 

    const token = crypto.randomUUID()
    const tokenHash = (await hashToken(token) as any)
    const expiresAt = new Date(Date.now() + 3600000).toISOString() 
    
    await db.insert(passwordResets).values({
      id: crypto.randomUUID(),
      userId: user.id,
      tokenHash: tokenHash,
      expiresAt: expiresAt,
    })

    const emailService = new EmailService(this.env)
    try {
      await emailService.sendPasswordResetEmail(user.email, token)
    } catch (e: any) {
      console.error('[AuthService] Failed to send recovery email:', e)
    }

    return token
  }

  async resetPassword(token: string, newPassword: string) {
    const db = getDb(this.env)
    const tokenHash = (await hashToken(token) as any)
    
    const resetResult = (await db.select().from(passwordResets).where(
          and(
            eq(passwordResets.tokenHash, tokenHash),
            eq(passwordResets.isUsed, false),
            gt(passwordResets.expiresAt, new Date().toISOString())
          )
        ).limit(1) as any)
    const reset = resetResult[0]
    if (!reset) throw new HTTPException(400, { message: 'Invalid or expired reset token' })

    const passwordHash = (await hashPassword(newPassword) as any)
    await db.batch([
      db.update(users).set({ passwordHash: passwordHash, forcePasswordChange: false }).where(eq(users.id, reset.userId)),
      db.update(passwordResets).set({ isUsed: true }).where(eq(passwordResets.tokenHash, tokenHash))
    ])
    return true
  }

  async changePassword(userId: string, newPassword: string) {
    const db = getDb(this.env)
    const passwordHash = (await hashPassword(newPassword) as any)
    await db.update(users).set({ passwordHash: passwordHash, forcePasswordChange: false }).where(eq(users.id, userId))
    return true
  }

  async adminResetPassword(userId: string, newPassword: string, isTemporary: boolean = false) {
    const db = getDb(this.env)
    const passwordHash = (await hashPassword(newPassword) as any)
    await db.update(users).set({ passwordHash: passwordHash, forcePasswordChange: !!isTemporary }).where(eq(users.id, userId))
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

  // --- BACKUP CODES (Extreme Hardening - Vault Integrated) ---
  async generateBackupCodes(userId: string) {
    const db = getDb(this.env);
    const vault = new VaultService(db, this.env.JWT_SECRET);
    
    // 1. Generate 10 new high-entropy codes
    const newCodes = Array.from({ length: 10 }, () => {
      const bytes = crypto.getRandomValues(new Uint8Array(8));
      return Array.from(bytes, byte => {
        const val = byte % 36;
        return val < 10 ? String(val) : String.fromCharCode(val - 10 + 65);
      }).join('');
    });
    
    // 2. Hash codes (Layered Security: Hashed before being Encrypted in Vault)
    const hashes = (await Promise.all(newCodes.map(code => hashPassword(code))) as any);
    
    // 3. Store as an encrypted blob in the vault
    await vault.setSecret(userId, 'RECOVERY_CODES', 'internal', JSON.stringify(hashes));
    
    return newCodes;
  }

  async verifyBackupCode(userId: string, code: string) {
    const db = getDb(this.env);
    const vault = new VaultService(db, this.env.JWT_SECRET);
    
    const vaultResult = (await vault.getSecret(userId, 'RECOVERY_CODES', 'internal') as any);
    if (!vaultResult) return false;
    
    const hashes: string[] = JSON.parse(vaultResult);
    if (!Array.isArray(hashes) || hashes.length === 0) return false;
    
    const normalizedCode = code.toUpperCase();
    let verifiedIdx = -1;
    
    for (let i = 0; i < hashes.length; i++) {
      if (await verifyPassword(normalizedCode, hashes[i])) {
        verifiedIdx = i;
        break;
      }
    }
    
    if (verifiedIdx !== -1) {
      // Consume the code
      hashes.splice(verifiedIdx, 1);
      
      if (hashes.length > 0) {
        await vault.setSecret(userId, 'RECOVERY_CODES', 'internal', JSON.stringify(hashes));
      } else {
        await vault.deleteSecret(userId, 'RECOVERY_CODES', 'internal');
      }
      
      console.log(`[Auth] Backup code verified and consumed from vault for user ${userId}`);
      return true;
    }
    
    return false;
  }

  // --- PERSONALIZATION ---
  async updatePreferences(userId: string, preferences: { locale?: string, theme?: string }) {
    const db = getDb(this.env)
    await db.update(users).set(preferences).where(eq(users.id, userId))
    return true
  }
}
