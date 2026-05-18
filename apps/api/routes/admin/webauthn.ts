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
import { eq, and, desc } from 'drizzle-orm'
import { setSignedCookie, getSignedCookie, deleteCookie } from 'hono/cookie'
import { uint8ArrayToBase64, uint8ArrayToBase64url, getRpID, hashIdentifier, base64ToUint8Array } from '../../auth-utils'
import { getAAGUIDMetadata } from '../../utils/webauthn-metadata'
import { VaultService } from '../../utils/vault.service'
import { getForensics } from '../../utils/forensics'
import { logAudit } from '../../utils'
import { EmailService } from '../../services/email.service'
import { HTTPException } from 'hono/http-exception'

const webauthn = new Hono<{ Bindings: Bindings, Variables: Variables }>()

/**
 * GET /api/admin/webauthn/passkeys
 */
webauthn.get('/passkeys', async (c) => {
  const userId = c.get('userId')
  if (!userId) return c.json({ error: 'Unauthorized' }, 401)
  
  const db = getDb(c.env)
  const userPasskeys = await db.select().from(passkeys).where(eq(passkeys.userId, userId)).orderBy(desc(passkeys.createdAt))
  return c.json({ passkeys: userPasskeys })
})

/**
 * PUT /api/admin/webauthn/passkeys/:id
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
 */
webauthn.delete('/passkeys/:id', async (c) => {
  const userId = c.get('userId')
  if (!userId) return c.json({ error: 'Unauthorized' }, 401)
  const { id } = c.req.param()
  const db = getDb(c.env)
  const vault = new VaultService(db, c.env.JWT_SECRET)
  await db.delete(passkeys).where(and(eq(passkeys.id, id), eq(passkeys.userId, userId)))
  await vault.deleteSecret(id, 'CREDENTIAL_ID', 'webauthn')
  await vault.deleteSecret(id, 'PASSKEY_PUBLIC_KEY', 'webauthn')
  await logAudit(c, 'passkeys', id, 'REMOVE', null, null)
  return c.json({ success: true })
})

// 1. Generate Registration Options
webauthn.post('/generate-registration', async (c) => {
  const userId = c.get('userId')
  if (!userId) throw new HTTPException(401, { message: 'Unauthorized' })
  const db = getDb(c.env)
  const userResult = await db.select({ email: users.email, username: users.username }).from(users).where(eq(users.id, userId)).limit(1)
  const user = userResult[0]
  if (!user) throw new HTTPException(404, { message: 'User not found' })

  const options = await generateRegistrationOptions({
    rpName: 'LEDGER',
    rpID: getRpID(c),
    userID: new TextEncoder().encode(userId) as any,
    userName: user.username || user.email || 'unknown',
    attestationType: 'none',
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'required',
    },
  })

  await setSignedCookie(c, 'webauthn_challenge', options.challenge, c.env.JWT_SECRET, {
    path: '/', secure: true, httpOnly: true, sameSite: 'None', maxAge: 300
  })

  return c.json(options)
})

// 2. Verify Registration
webauthn.post('/verify-registration', async (c) => {
  const userId = c.get('userId')
  const { attestation, name } = await c.req.json()
  const expectedChallenge = await getSignedCookie(c, c.env.JWT_SECRET, 'webauthn_challenge')

  if (!expectedChallenge) throw new HTTPException(401, { message: 'Invalid or expired challenge' })
  
  deleteCookie(c, 'webauthn_challenge')

  const verification = await verifyRegistrationResponse({
    response: attestation,
    expectedChallenge,
    expectedOrigin: c.env.WEB_URL || (c.req.header('origin') || (c.env.ENVIRONMENT === 'production' ? 'https://ledger.gpnet.dev' : 'http://localhost:5173')),
    expectedRPID: getRpID(c),
    requireUserVerification: true
  })

  if (verification.verified && verification.registrationInfo) {
    const { credential, aaguid } = verification.registrationInfo
    const { id: credentialID, publicKey: credentialPublicKey, counter } = credential
    const db = getDb(c.env)
    const forensics = getForensics(c)
    const branding = getAAGUIDMetadata(aaguid);
    const vault = new VaultService(db, c.env.JWT_SECRET);
    
    const credIdB64 = credentialID;
    const id = credIdB64;
    const pubKeyB64 = uint8ArrayToBase64url(new Uint8Array(credentialPublicKey));
    
    await vault.setSecret(id, 'CREDENTIAL_ID', 'webauthn', credIdB64);
    await vault.setSecret(id, 'PASSKEY_PUBLIC_KEY', 'webauthn', pubKeyB64);

    await db.insert(passkeys).values({
      id,
      userId,
      name: name || `Admin Passkey ${new Date().toLocaleDateString()}`,
      credentialIdHash: await hashIdentifier(credIdB64),
      counter,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp ? 1 : 0,
      attestationFormat: (verification.registrationInfo as any).fmt || 'none',
      userVerified: 1,
      aaguid: aaguid || null,
      providerName: branding.name,
      icon: branding.icon,
      securityLevel: branding.securityLevel,
      manufacturer: branding.manufacturer,
      logo: branding.logo,
      transports: JSON.stringify(attestation.response.transports || []),
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      registrationIp: forensics.connectingIp,
      registrationIpV4: forensics.ipV4,
      registrationIpV6: forensics.ipV6,
      registrationCity: forensics.city,
      registrationCountry: forensics.country,
      registrationRegion: forensics.region,
      registrationLatitude: forensics.latitude,
      registrationLongitude: forensics.longitude,
      registrationLocation: forensics.location,
      registrationUa: forensics.userAgent,
      lastUsedIp: forensics.connectingIp,
      lastUsedIpV4: forensics.ipV4,
      lastUsedIpV6: forensics.ipV6,
      lastUsedCity: forensics.city,
      lastUsedCountry: forensics.country,
      lastUsedRegion: forensics.region,
      lastUsedLatitude: forensics.latitude,
      lastUsedLongitude: forensics.longitude,
      lastUsedLocation: forensics.location,
      lastUsedUa: forensics.userAgent
    })

    await logAudit(c, 'passkeys', id, 'REGISTER', null, { name: name || branding.name })

    const userResult = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1)
    const user = userResult[0]
    if (user?.email) {
      try {
        await new EmailService(c.env).sendSecurityAlertEmail(user.email, 'New Administrative Passkey Enrolled')
      } catch (e) { console.error('[Sentinel] Alert failed:', e) }
    }
    return c.json({ verified: true, id })
  }
  return c.json({ verified: false }, 400)
})

// 3. Generate Auth Options (Step-Up)
webauthn.post('/generate-auth', async (c) => {
  const userId = c.get('userId')
  const db = getDb(c.env)
  const vault = new VaultService(db, c.env.JWT_SECRET)
  const userPasskeys = await db.select({ id: passkeys.id }).from(passkeys).where(eq(passkeys.userId, userId))
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
    path: '/', secure: true, httpOnly: true, sameSite: 'None', maxAge: 300
  })
  return c.json(options)
})

// 4. Verify Auth (Step-Up)
webauthn.post('/verify-auth', zValidator('json', z.object({
  assertion: z.any()
})), async (c) => {
  const userId = c.get('userId')
  const sessionId = c.get('sessionId')
  const { assertion } = c.req.valid('json')
  const expectedChallenge = await getSignedCookie(c, c.env.JWT_SECRET, 'webauthn_challenge')

  if (!expectedChallenge) throw new HTTPException(401, { message: 'Invalid or expired challenge' })

  const db = getDb(c.env)
  const vault = new VaultService(db, c.env.JWT_SECRET)
  const id = assertion.id;
  const passkeyResult = await db.select().from(passkeys).where(and(eq(passkeys.userId, userId), eq(passkeys.id, id))).limit(1)
  
  const passkey = passkeyResult[0]
  if (!passkey) throw new HTTPException(401, { message: 'Passkey not recognized' })

  const publicKeyB64 = await vault.getSecret(passkey.id, 'PASSKEY_PUBLIC_KEY', 'webauthn')
  const rawCredentialId = await vault.getSecret(passkey.id, 'CREDENTIAL_ID', 'webauthn')
  
  if (!publicKeyB64 || !rawCredentialId) throw new HTTPException(500, { message: 'Biometric material missing from Vault' })

  const verification = await verifyAuthenticationResponse({
    response: assertion,
    expectedChallenge,
    expectedOrigin: c.env.WEB_URL || (c.req.header('origin') || (c.env.ENVIRONMENT === 'production' ? 'https://ledger.gpnet.dev' : 'http://localhost:5173')),
    expectedRPID: getRpID(c),
    requireUserVerification: true,
    credential: {
      id: base64ToUint8Array(rawCredentialId),
      publicKey: base64ToUint8Array(publicKeyB64),
      counter: passkey.counter,
      transports: passkey.transports ? JSON.parse(passkey.transports) : undefined
    }
  })

  if (!verification.verified) throw new HTTPException(401, { message: 'Step-Up verification failed' })

  const now = new Date().toISOString()
  const forensics = getForensics(c)
  
  await db.batch([
    db.update(passkeys).set({ 
      counter: verification.authenticationInfo.newCounter,
      lastUsedAt: now,
      lastUsedIp: forensics.connectingIp,
      lastUsedIpV4: forensics.ipV4,
      lastUsedIpV6: forensics.ipV6,
      lastUsedCity: forensics.city,
      lastUsedCountry: forensics.country,
      lastUsedRegion: forensics.region,
      lastUsedLatitude: forensics.latitude,
      lastUsedLongitude: forensics.longitude,
      lastUsedLocation: forensics.location,
      lastUsedUa: forensics.userAgent
    }).where(eq(passkeys.id, passkey.id)),
    db.update(sessions).set({ passkeyVerifiedAt: now }).where(eq(sessions.id, sessionId || ''))
  ])

  await logAudit(c, 'sessions', sessionId || 'unknown', 'ADMIN_STEP_UP_VERIFIED', null, { passkeyId: passkey.id })
  return c.json({ success: true })
})

export default webauthn
