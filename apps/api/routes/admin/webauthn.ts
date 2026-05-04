import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { 
  generateRegistrationOptions, 
  verifyRegistrationResponse, 
  generateAuthenticationOptions, 
  verifyAuthenticationResponse 
} from '@simplewebauthn/server'
import { Bindings, Variables } from '../../types'
import { getDb } from '#/index'
import { users, passkeys, sessions } from '#/schema'
import { eq, and, or } from 'drizzle-orm'
import { uint8ArrayToBase64, getRpID, hashIdentifier, base64ToUint8Array } from '../../auth-utils'
import { getAAGUIDMetadata } from '../../utils/webauthn-metadata'
import { VaultService } from '../../utils/vault.service'
import { setSignedCookie, getSignedCookie } from 'hono/cookie'
import { getRequestMetadata, logAudit } from '../../utils'
import { EmailService } from '../../services/email.service'
import { HTTPException } from 'hono/http-exception'

const webauthn = new Hono<{ Bindings: Bindings, Variables: Variables }>()

// getRpID is now imported from auth-utils

/**
 * GET /api/admin/webauthn/passkeys
 * Lists all passkeys for the current user.
 */
webauthn.get('/passkeys', async (c) => {
  const userId = c.get('userId')
  if (!userId) return c.json({ error: 'Unauthorized' }, 401)
  
  const db = getDb(c.env)
  const userPasskeys = await db.select({
    id: passkeys.id,
    name: passkeys.name,
    aaguid: passkeys.aaguid,
    createdAt: passkeys.createdAt,
    lastUsedAt: passkeys.lastUsedAt,
    counter: passkeys.counter
  }).from(passkeys).where(eq(passkeys.userId, userId))
  
  return c.json({ passkeys: userPasskeys })
})

/**
 * PUT /api/admin/webauthn/passkeys/:id
 * Renames a passkey.
 */
webauthn.put('/passkeys/:id', zValidator('json', z.object({
  name: z.string().min(1)
})), async (c) => {
  const userId = c.get('userId')
  if (!userId) return c.json({ error: 'Unauthorized' }, 401)
  
  const { id } = c.req.param()
  const { name } = c.req.valid('json')
  const db = getDb(c.env)
  
  await db.update(passkeys).set({ name }).where(and(eq(passkeys.id, id), eq(passkeys.userId, userId)))
  
  await logAudit(c, 'passkeys', id, 'RENAME', null, { name })
  
  return c.json({ success: true })
})

/**
 * DELETE /api/admin/webauthn/passkeys/:id
 * Revokes a passkey.
 */
webauthn.delete('/passkeys/:id', async (c) => {
  const userId = c.get('userId')
  if (!userId) return c.json({ error: 'Unauthorized' }, 401)
  
  const { id } = c.req.param()
  const db = getDb(c.env)
  
  await db.delete(passkeys).where(and(eq(passkeys.id, id), eq(passkeys.userId, userId)))
  
  await logAudit(c, 'passkeys', id, 'REMOVE', null, null)
  
  return c.json({ success: true })
})

/**
 * Step-Up Authentication Standard (Fleet v6.1)
 * Administrative WebAuthn Routes
 */

// 1. Generate Registration Options
webauthn.post('/generate-registration', async (c) => {
  const userId = c.get('userId')
  if (!userId) throw new HTTPException(401, { message: 'Unauthorized' })

  const db = getDb(c.env)
  const userResult = await db.select({ email: users.email, username: users.username }).from(users).where(eq(users.id, userId)).limit(1)
  const user = userResult[0]
  
  if (!user) throw new HTTPException(404, { message: 'User not found' })

  const passkeysResult = await db.select({ credentialId: passkeys.credentialId, transports: passkeys.transports }).from(passkeys).where(eq(passkeys.userId, userId))
  
  const options = await generateRegistrationOptions({
    rpName: 'LEDGER',
    rpID: getRpID(c),
    userID: new TextEncoder().encode(userId) as any,
    userName: user.username || user.email || 'unknown',
    attestationType: 'none',
    excludeCredentials: (passkeysResult || []).map((pk: any) => ({
      id: pk.credentialId, // Note: We need to retrieve raw IDs for exclusion if we want to be strict, but hashed comparison is also possible. For now, we'll retrieve them.
      type: 'public-key',
      transports: pk.transports ? JSON.parse(pk.transports) : [],
    })),
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'required',
    },
  })

  await setSignedCookie(c, 'webauthn_challenge', options.challenge, c.env.JWT_SECRET, {
    path: '/',
    secure: true,
    httpOnly: true,
    sameSite: 'None',
    maxAge: 300
  })

  return c.json(options)
})

// 2. Verify Registration
webauthn.post('/verify-registration', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const expectedChallenge = await getSignedCookie(c, c.env.JWT_SECRET, 'webauthn_challenge')

  if (!expectedChallenge) {
    throw new HTTPException(401, { message: 'Invalid or expired WebAuthn challenge' })
  }

  const verification = await verifyRegistrationResponse({
    response: body,
    expectedChallenge,
    expectedOrigin: c.env.WEB_URL || (c.req.header('origin') || (c.env.ENVIRONMENT === 'production' ? 'https://ledger.gpnet.dev' : 'http://localhost:5173')),
    expectedRPID: getRpID(c),
  })

  if (verification.verified && verification.registrationInfo) {
    const { 
      credentialID, 
      credentialPublicKey, 
      counter,
      credentialDeviceType,
      credentialBackedUp,
      aaguid
    } = verification.registrationInfo

    const db = getDb(c.env)
    const id = crypto.randomUUID()
    const metadata = getRequestMetadata(c)
    
    // 🏷️ Enrich with branding metadata
    const branding = getAAGUIDMetadata(aaguid);
    
    // 🔒 Extreme Security: Store raw secrets in Vault, Hash in DB
    const vault = new VaultService(db, c.env.JWT_SECRET);
    const credIdB64 = uint8ArrayToBase64(credentialID);
    const pubKeyB64 = uint8ArrayToBase64(credentialPublicKey);
    
    // Index by hash for Zero-Knowledge lookups
    const credentialIdHash = await hashIdentifier(credIdB64);
    
    await vault.setSecret(id, 'CREDENTIAL_ID', 'webauthn', credIdB64);
    await vault.setSecret(id, 'PUBLIC_KEY', 'webauthn', pubKeyB64);

    await db.insert(passkeys).values({
      id,
      userId,
      name: body.name || `Admin Passkey ${new Date().toLocaleDateString()}`,
      credentialIdHash,
      counter,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp ? 1 : 0,
      attestationFormat: verification.registrationInfo.fmt || 'none',
      userVerified: 1,
      aaguid: aaguid || null,
      providerName: branding.name,
      icon: branding.icon,
      transports: JSON.stringify(body.response.transports || []),
      
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),

      registrationIp: metadata.ip,
      registrationIpV4: metadata.ipV4,
      registrationIpV6: metadata.ipV6,
      registrationLocation: metadata.location,
      registrationUa: metadata.userAgent,

      lastUsedIp: metadata.ip,
      lastUsedIpV4: metadata.ipV4,
      lastUsedIpV6: metadata.ipV6,
      lastUsedLocation: metadata.location,
      lastUsedUa: metadata.userAgent
    })

    await logAudit(c, 'passkeys', id, 'REGISTER', null, { 
      name: body.name || branding.name,
      context: 'admin' 
    })

    // Trigger Security Alert
    const userResult = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1)
    const user = userResult[0]
    if (user?.email) {
      try {
        await new EmailService(c.env).sendSecurityAlertEmail(user.email, 'New Administrative Passkey Enrolled')
      } catch (e) {
        console.error('[Sentinel] Failed to send security alert:', e)
      }
    }

    return c.json({ verified: true, id })
  }

  return c.json({ verified: false }, 400)
})

// 3. Generate Authentication Options (Step-Up)
webauthn.post('/generate-auth', async (c) => {
  const userId = c.get('userId')
  const db = getDb(c.env)
  const vault = new VaultService(db, c.env.JWT_SECRET)
  
  const userPasskeys = await db.select({ id: passkeys.id }).from(passkeys).where(eq(passkeys.userId, userId))
  
  // 🔑 Retrieve raw IDs from Vault for the allow list
  const allowCredentials = await Promise.all(userPasskeys.map(async pk => {
    const rawId = await vault.getSecret(pk.id, 'CREDENTIAL_ID', 'webauthn')
    return rawId ? { id: rawId, type: 'public-key' as const } : null
  }))

  const options = await generateAuthenticationOptions({
    rpID: getRpID(c),
    allowCredentials: allowCredentials.filter((c): c is { id: string, type: 'public-key' } => c !== null),
    userVerification: 'required',
  })

  await setSignedCookie(c, 'webauthn_challenge', options.challenge, c.env.JWT_SECRET, {
    path: '/',
    secure: true,
    httpOnly: true,
    sameSite: 'None',
    maxAge: 300,
  })

  return c.json(options)
})

// 4. Verify Authentication (Step-Up)
webauthn.post('/verify-auth', zValidator('json', z.object({
  assertion: z.any()
})), async (c) => {
  const userId = c.get('userId')
  const sessionId = c.get('sessionId')
  const { assertion } = c.req.valid('json')
  const expectedChallenge = await getSignedCookie(c, c.env.JWT_SECRET, 'webauthn_challenge')

  if (!expectedChallenge) {
    throw new HTTPException(401, { message: 'Invalid or expired WebAuthn challenge' })
  }

  const db = getDb(c.env)
  const vault = new VaultService(db, c.env.JWT_SECRET)
  
  // 🔒 Zero-Knowledge Lookup by hash
  const credentialIdHash = await hashIdentifier(assertion.id)
  const passkeyResult = await db.select()
    .from(passkeys)
    .where(and(
      eq(passkeys.userId, userId),
      eq(passkeys.credentialIdHash, credentialIdHash)
    ))
    .limit(1)
  
  const passkey = passkeyResult[0]
  if (!passkey) throw new HTTPException(401, { message: 'Passkey not recognized for this user' })

  // 🔑 Retrieve secrets from Vault
  const publicKeyB64 = await vault.getSecret(passkey.id, 'PUBLIC_KEY', 'webauthn')
  const rawCredentialId = await vault.getSecret(passkey.id, 'CREDENTIAL_ID', 'webauthn')
  
  if (!publicKeyB64 || !rawCredentialId) {
    throw new HTTPException(500, { message: 'Security Integrity Error: Cryptographic materials missing from Vault' })
  }

  const verification = await verifyAuthenticationResponse({
    response: assertion,
    expectedChallenge,
    expectedOrigin: c.env.WEB_URL || (c.req.header('origin') || (c.env.ENVIRONMENT === 'production' ? 'https://ledger.gpnet.dev' : 'http://localhost:5173')),
    expectedRPID: getRpID(c),
    requireUserVerification: true,
    credential: {
      id: rawCredentialId,
      publicKey: base64ToUint8Array(publicKeyB64),
      counter: passkey.counter,
      transports: passkey.transports ? JSON.parse(passkey.transports) : undefined
    }
  })

  if (!verification.verified) {
    throw new HTTPException(401, { message: 'Step-Up verification failed' })
  }

  // 📈 Update counters and forensic metadata
  const now = new Date().toISOString()
  const metadata = getRequestMetadata(c)
  
  await db.batch([
    db.update(passkeys).set({ 
      counter: verification.authenticationInfo.newCounter,
      lastUsedAt: now,
      lastUsedIp: metadata.ip,
      lastUsedIpV4: metadata.ipV4,
      lastUsedIpV6: metadata.ipV6,
      lastUsedLocation: metadata.location,
      lastUsedUa: metadata.userAgent
    }).where(eq(passkeys.id, passkey.id)),
    db.update(sessions).set({ 
      passkeyVerifiedAt: now 
    }).where(eq(sessions.id, sessionId || ''))
  ])

  await logAudit(c, 'sessions', sessionId || 'unknown', 'ADMIN_STEP_UP_VERIFIED', null, { passkeyId: passkey.id })
  
  return c.json({ success: true })
})

export default webauthn
