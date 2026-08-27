import { eq, or, and, gt, sql } from 'drizzle-orm'
import { getDb } from '#/index'
import { users, sessions, userIdentities, passwordResets, adminInvitations, backupCodes } from '#/schema'
import { setCookie, deleteCookie } from 'hono/cookie'
import { AuthConfig, AuthUser } from '../../types'

let lastTimestamp = -1
let sequenceCounter = 0

/**
 * 🆔 Cryptographically Secure RFC 9562 UUIDv7 Generator
 * Natural time-sorting with 48-bit Unix timestamp + 74-bit CSPRNG entropy.
 */
export function generateUUIDv7(): string {
  let now = Date.now()
  if (now <= lastTimestamp) {
    now = lastTimestamp
    sequenceCounter++
  } else {
    lastTimestamp = now
    sequenceCounter = 0
  }

  const timeBytes = new Uint8Array(6)
  timeBytes[0] = (now / 0x10000000000) & 0xff
  timeBytes[1] = (now / 0x100000000) & 0xff
  timeBytes[2] = (now / 0x1000000) & 0xff
  timeBytes[3] = (now / 0x10000) & 0xff
  timeBytes[4] = (now / 0x100) & 0xff
  timeBytes[5] = now & 0xff

  const randomBytes = crypto.getRandomValues(new Uint8Array(10))
  if (sequenceCounter > 0) {
    randomBytes[0] = (randomBytes[0] ^ (sequenceCounter >> 8)) & 0xff
    randomBytes[1] = (randomBytes[1] ^ sequenceCounter) & 0xff
  }

  // Version 7 in byte 6 (0b0111_xxxx)
  const octet6 = (randomBytes[0] & 0x0f) | 0x70
  // Variant 2 in byte 8 (0b10xx_xxxx)
  const octet8 = (randomBytes[2] & 0x3f) | 0x80

  const b = [
    timeBytes[0], timeBytes[1], timeBytes[2], timeBytes[3],
    timeBytes[4], timeBytes[5],
    octet6, randomBytes[1],
    octet8, randomBytes[3],
    randomBytes[4], randomBytes[5], randomBytes[6], randomBytes[7], randomBytes[8], randomBytes[9]
  ]

  const hex = Array.from(b, byte => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/**
 * 🏷️ Generate Type-Prefixed Monotonic Identifier (e.g. "usr_0190...", "sess_0190...")
 */
export function generatePrefixedId(prefix: 'usr' | 'sess' | 'ident' | 'merge' | 'del' | 'inv' | 'passkey' | 'act' | string): string {
  const rawUuid = generateUUIDv7().replace(/-/g, '')
  return `${prefix}_${rawUuid}`
}

const PBKDF2_ITERATIONS = 100000

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

/**
 * 🔒 Enterprise Password Hashing: Native WebCrypto PBKDF2-SHA256
 * Format: v1$pbkdf2-sha256$100000$<saltBase64url>$<hashBase64url>
 */
export async function hashPassword(password: string, pepper: string = ''): Promise<string> {
  const encoder = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  
  // Combine password with pepper via HMAC if pepper is provided
  let inputKeyBytes: Uint8Array
  if (pepper) {
    const pepperKey = await crypto.subtle.importKey('raw', encoder.encode(pepper), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const hmacSig = await crypto.subtle.sign('HMAC', pepperKey, encoder.encode(password))
    inputKeyBytes = new Uint8Array(hmacSig)
  } else {
    inputKeyBytes = encoder.encode(password)
  }

const keyMaterial = await crypto.subtle.importKey('raw', inputKeyBytes.buffer as ArrayBuffer, 'PBKDF2', false, ['deriveBits', 'deriveKey'])
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' }, 
    keyMaterial, 
    256
  )
  
  const saltBase64 = uint8ArrayToBase64(salt).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const hashBase64 = uint8ArrayToBase64(new Uint8Array(derivedBits)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `v1$pbkdf2-sha256$${PBKDF2_ITERATIONS}$${saltBase64}$${hashBase64}`
}

export async function verifyPassword(password: string, storedHash: string, pepper: string = ''): Promise<boolean> {
  try {
    if (!storedHash) return false

    let iterations: number
    let saltBase64: string
    let expectedHashBase64: string

    if (storedHash.startsWith('v1$pbkdf2-sha256$')) {
      const parts = storedHash.split('$')
      iterations = parseInt(parts[2], 10)
      saltBase64 = parts[3]
      expectedHashBase64 = parts[4]
    } else {
      // Legacy unversioned PBKDF2 format fallback: iterations.salt.hash
      const parts = storedHash.split('.')
      if (parts.length !== 3) return false
      iterations = parseInt(parts[0], 10)
      saltBase64 = parts[1]
      expectedHashBase64 = parts[2]
    }

    const salt = base64ToUint8Array(saltBase64.replace(/-/g, '+').replace(/_/g, '/'))
    const encoder = new TextEncoder()

    let inputKeyBytes: Uint8Array
    if (pepper) {
      const pepperKey = await crypto.subtle.importKey('raw', encoder.encode(pepper), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
      const hmacSig = await crypto.subtle.sign('HMAC', pepperKey, encoder.encode(password))
      inputKeyBytes = new Uint8Array(hmacSig)
    } else {
      inputKeyBytes = encoder.encode(password)
    }

const keyMaterial = await crypto.subtle.importKey('raw', inputKeyBytes.buffer as ArrayBuffer, 'PBKDF2', false, ['deriveBits', 'deriveKey'])
    const derivedBits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' }, 
      keyMaterial, 
      256
    )
    const actualHashBase64 = uint8ArrayToBase64(new Uint8Array(derivedBits)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    const cleanExpectedHash = expectedHashBase64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    
    return timingSafeEqual(actualHashBase64, cleanExpectedHash)
  } catch (err: any) {
    console.error('[AuthService] Password verification exception:', err?.message)
    return false
  }
}

let counter = 0
function generateToken(): string {
  counter++
  const random = crypto.getRandomValues(new Uint8Array(32))
  const time = new Uint8Array(8)
  const view = new DataView(time.buffer)
  view.setBigUint64(0, BigInt(Date.now()) + BigInt(counter), false)
  const combined = new Uint8Array(40)
  combined.set(random, 0)
  combined.set(time, 32)
  return uint8ArrayToBase64(combined).replace(/[+/=]/g, (c) => ({ '+': '-', '/': '_', '=': '' })[c] || '')
}

async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return uint8ArrayToBase64(new Uint8Array(hashBuffer))
}

export class AuthService {
  constructor(private env: any, private config: AuthConfig) {}

  private getPepper(): string {
    return this.env?.GLOBAL_PASSWORD_PEPPER || this.env?.ENCRYPTION_KEY || this.env?.JWT_SECRET || 'foundation-core-secret-pepper';
  }

  async validateCredentials(identifier: string, password: string) {
    const db = getDb(this.env)
    const pepper = this.getPepper()

    const result = await db.select().from(users).where(
      or(eq(users.email, identifier), sql`lower(${users.username}) = lower(${identifier})`)
    ).limit(1)
    const user = result[0]
    
    // Constant-time mitigation against user enumeration
    if (!user) {
      await hashPassword(password, pepper)
      return { success: false, error: 'Invalid credentials' } as const
    }

    if (user.status === 'locked' || user.status === 'suspended') {
      return { success: false, error: 'Account is restricted.' } as const
    }

    if (!user.passwordHash) {
      return { success: false, error: 'Account linked via social provider. Please use Discord or Google login.' } as const
    }

    const isMatch = await verifyPassword(password, user.passwordHash, pepper)
    if (!isMatch) {
      await db.update(users).set({ failedLoginAttempts: (user.failedLoginAttempts || 0) + 1 }).where(eq(users.id, user.id))

      if ((user.failedLoginAttempts || 0) + 1 >= 5) {
        const lockMinutes = 30
        const lockUntil = new Date(Date.now() + lockMinutes * 60 * 1000).toISOString()
        await (db.update(users) as any).set({ lockedAt: lockUntil, lockoutUntil: lockUntil }).where(eq(users.id, user.id))
        return { success: false, error: `Account locked for ${lockMinutes} minutes due to multiple failed attempts.` } as const
      }

      return { success: false, error: 'Invalid credentials' } as const
    }

    await (db.update(users) as any).set({ failedLoginAttempts: 0, lockedAt: null, lockoutUntil: null }).where(eq(users.id, user.id))

    return { success: true, user: user as any } as const
  }

  async createSession(userId: string, forensics: any, isPersistent: boolean) {
    const db = getDb(this.env)
    const sessionId = generateToken()
    const expirationHours = isPersistent ? 30 * 24 : 24
    const nowIso = new Date().toISOString()

    await db.insert(sessions).values({
      id: sessionId,
      userId,
      expiresAt: new Date(Date.now() + expirationHours * 60 * 60 * 1000).toISOString(),
      passkeyVerifiedAt: nowIso,
      userAgent: forensics.userAgent || null,
      ipAddress: forensics.connectingIp || null,
      ipV4: forensics.ipV4 || null,
      ipV6: forensics.ipV6 || null,
      cfRay: forensics.cfRay || null,
      isPersistent,
      location: forensics.location || null,
    })

    return { sessionId, expirationHours }
  }

  setSessionCookie(c: any, sessionId: string, expirationHours: number, isLocal: boolean) {
    const host = (c.req.header('host') || '').split(':')[0]
    let domain: string | undefined = undefined
    if (!isLocal && !host.includes('localhost')) {
      if (host.endsWith('gpnet.dev') || host.includes('gpnet.dev')) {
        domain = '.gpnet.dev'
      }
    }
    setCookie(c, 'FOUNDATION_SESSION', sessionId, {
      path: '/',
      domain,
      secure: !isLocal,
      httpOnly: true,
      maxAge: 60 * 60 * expirationHours,
      sameSite: 'Lax',
    })
  }

  clearSessionCookie(c: any) {
    const host = c.req.header('host') || ''
    const domain = host.includes('localhost') ? undefined : (host.endsWith('gpnet.dev') ? '.gpnet.dev' : undefined)
    deleteCookie(c, 'FOUNDATION_SESSION', { path: '/', domain })
  }

  async getSession(sessionId: string) {
    const db = getDb(this.env)
    const session = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1).then(r => r[0])
    if (!session || new Date(session.expiresAt) < new Date()) {
      return null
    }
    const user = await db.select().from(users).where(eq(users.id, session.userId)).limit(1).then(r => r[0])
    if (!user) return null
    return { session, user }
  }

  async createInvitation(email: string, role: string, createdBy: string) {
    const db = getDb(this.env)
    const token = generateToken()
    const tokenHash = await hashToken(token)

    await (db.insert(adminInvitations) as any).values({
      id: generateToken(),
      email,
      role,
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdBy,
    })

    return token
  }

  async acceptInvitation(token: string, displayName: string, password: string, username?: string) {
    const db = getDb(this.env)
    const tokenHash = await hashToken(token)

    const invitation: any = await db.select().from(adminInvitations)
      .where(and(eq(adminInvitations.tokenHash, tokenHash), gt(adminInvitations.expiresAt, new Date().toISOString())))
      .limit(1)
      .then(r => r[0])

    if (!invitation) return { success: false, error: 'Invalid or expired invitation token.' } as const
    if (invitation.acceptedAt || invitation.isClaimed) return { success: false, error: 'Invitation has already been used.' } as const

    const passwordHash = await hashPassword(password)
    const userId = generateToken()

    const finalUsername = (username?.trim() || (invitation.email ? invitation.email.split('@')[0] : '') || '').toLowerCase()
    const taken = await db.select().from(users).where(sql`lower(${users.username}) = lower(${finalUsername})`).limit(1)
    if (taken.length > 0) return { success: false, error: 'That username is already taken.' } as const

    await (db.insert(users) as any).values({
      id: userId,
      email: invitation.email,
      username: finalUsername,
      displayName,
      passwordHash,
      globalRole: invitation.role,
      status: 'active',
    })

    await (db.update(adminInvitations) as any).set({ acceptedAt: new Date().toISOString(), isClaimed: true }).where(eq(adminInvitations.id, invitation.id))

    return { success: true, userId } as const
  }

  async requestPasswordReset(email: string) {
    const db = getDb(this.env)
    const user = await db.select().from(users).where(eq(users.email, email)).limit(1).then(r => r[0])
    if (!user) return { success: true }

    const token = generateToken()
    const tokenHash = await hashToken(token)

    await (db.insert(passwordResets) as any).values({
      id: generateToken(),
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    })

    return { success: true, token }
  }

  async resetPassword(token: string, newPassword: string) {
    const db = getDb(this.env)
    const tokenHash = await hashToken(token)

    const reset: any = await db.select().from(passwordResets)
      .where(and(eq(passwordResets.tokenHash, tokenHash), gt(passwordResets.expiresAt, new Date().toISOString())))
      .limit(1)
      .then(r => r[0])

    if (!reset || reset.usedAt || reset.isUsed) return { success: false, error: 'Invalid or expired reset token.' } as const

    const passwordHash = await hashPassword(newPassword, this.getPepper())
    await (db.update(users) as any).set({ passwordHash, passwordChangedAt: new Date().toISOString(), failedLoginAttempts: 0, lockedAt: null, lockoutUntil: null }).where(eq(users.id, reset.userId))
    await (db.update(passwordResets) as any).set({ usedAt: new Date().toISOString(), isUsed: true }).where(eq(passwordResets.id, reset.id))

    // Revoke all sessions upon password reset
    await db.delete(sessions).where(eq(sessions.userId, reset.userId))

    return { success: true } as const
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const db = getDb(this.env)
    const pepper = this.getPepper()
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1).then(r => r[0])
    if (!user) return { success: false, error: 'User not found.' } as const

    if (!user.passwordHash) {
      await db.update(users).set({ passwordHash: await hashPassword(newPassword, pepper), passwordChangedAt: new Date().toISOString() }).where(eq(users.id, userId))
      return { success: true } as const
    }

    const isMatch = await verifyPassword(currentPassword, user.passwordHash, pepper)
    if (!isMatch) return { success: false, error: 'Current password is incorrect.' } as const

    await db.update(users).set({ passwordHash: await hashPassword(newPassword, pepper), passwordChangedAt: new Date().toISOString() }).where(eq(users.id, userId))
    return { success: true } as const
  }

  async generateBackupCodes(userId: string) {
    const db = getDb(this.env)
    const codes: string[] = []

    await db.delete(backupCodes).where(eq(backupCodes.userId, userId))

    for (let i = 0; i < 10; i++) {
      const code = `1P-${generateToken().slice(0, 20).toUpperCase().replace(/-/g, '').match(/.{1,4}/g)!.join('-')}`
      codes.push(code)
      const codeHash = await hashPassword(code)
      await db.insert(backupCodes).values({
        id: generateToken(),
        userId,
        codeHash,
      })
    }

    return codes
  }

  async verifyBackupCode(userId: string, code: string) {
    const db = getDb(this.env)
    const storedCodes = await db.select().from(backupCodes).where(and(eq(backupCodes.userId, userId), eq(backupCodes.usedAt as any, null)))

    for (const stored of storedCodes) {
      const isValid = await verifyPassword(code, stored.codeHash)
      if (isValid) {
        await db.update(backupCodes).set({ usedAt: new Date().toISOString() }).where(eq(backupCodes.id, stored.id))
        return { success: true } as const
      }
    }

    return { success: false, error: 'Invalid or already used backup code.' } as const
  }
}

export function uint8ArrayToBase64url(bytes: Uint8Array): string {
  return uint8ArrayToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
