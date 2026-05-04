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
import { uint8ArrayToBase64 } from '../../auth-utils'
import { setSignedCookie, getSignedCookie } from 'hono/cookie'
import { getRequestMetadata, logAudit } from '../../utils'
import { EmailService } from '../../services/email.service'
import { HTTPException } from 'hono/http-exception'

const webauthn = new Hono<{ Bindings: Bindings, Variables: Variables }>()

const getRpID = (c: any) => {
  if (c.env.WEB_URL) return new URL(c.env.WEB_URL).hostname;
  if (c.env.ENVIRONMENT === 'production') return 'ledger.gpnet.dev';
  return c.req.header('host')?.split(':')[0] || 'localhost';
};

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
      id: pk.credentialId,
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
    const { credential } = verification.registrationInfo
    const { id: credentialId, publicKey: credentialPublicKey, counter } = credential
    const db = getDb(c.env)
    const id = crypto.randomUUID()
    
    const metadata = getRequestMetadata(c)
    await db.insert(passkeys).values({
      id,
      userId,
      name: `Passkey ${new Date().toLocaleDateString()}`,
      credentialId: uint8ArrayToBase64(new Uint8Array(credentialId)),
      publicKey: uint8ArrayToBase64(new Uint8Array(credentialPublicKey)),
      counter,
      aaguid: verification.registrationInfo.aaguid || null,
      transports: JSON.stringify(body.response.transports || []),
      lastUsedAt: new Date().toISOString(),
      lastUsedIp: metadata.ip,
      lastUsedIpV4: metadata.ipV4,
      lastUsedIpV6: metadata.ipV6,
      lastUsedLocation: metadata.location,
      lastUsedUa: metadata.userAgent
    })

    await logAudit(c, 'passkeys', id, 'REGISTER', null, { name: `Passkey ${new Date().toLocaleDateString()}` })

    // Trigger Security Alert
    const userResult = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1)
    const user = userResult[0]
    if (user?.email) {
      try {
        await new EmailService(c.env).sendSecurityAlertEmail(user.email, 'New Biometric Passkey Enrolled')
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
  
  const passkeysResult = await db.select({ credentialId: passkeys.credentialId }).from(passkeys).where(eq(passkeys.userId, userId))
  
  const options = await generateAuthenticationOptions({
    rpID: getRpID(c),
    allowCredentials: passkeysResult.map(pk => ({
      id: pk.credentialId,
      type: 'public-key'
    })),
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
  
  // Normalize assertion ID
  const normalizedId = assertion.id.replace(/-/g, '+').replace(/_/g, '/')
  const paddedId = normalizedId.padEnd(normalizedId.length + (4 - normalizedId.length % 4) % 4, '=')

  const passkeyResult = await db.select()
    .from(passkeys)
    .where(and(
      eq(passkeys.userId, userId),
      or(
        eq(passkeys.credentialId, assertion.id),
        eq(passkeys.credentialId, paddedId)
      )
    ))
    .limit(1)
  
  const passkey = passkeyResult[0]
  if (!passkey) {
    throw new HTTPException(401, { message: 'Passkey not recognized for this user' })
  }

  const verification = await verifyAuthenticationResponse({
    response: assertion,
    expectedChallenge,
    expectedOrigin: c.env.WEB_URL || (c.req.header('origin') || (c.env.ENVIRONMENT === 'production' ? 'https://ledger.gpnet.dev' : 'http://localhost:5173')),
    expectedRPID: getRpID(c),
    requireUserVerification: true,
    credential: {
      id: passkey.credentialId,
      publicKey: Buffer.from(passkey.publicKey, 'base64'),
      counter: passkey.counter,
      transports: passkey.transports ? JSON.parse(passkey.transports) : undefined
    } as any
  })

  if (!verification.verified) {
    throw new HTTPException(401, { message: 'Step-Up verification failed' })
  }

  // Update counters and session verification timestamp
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
    }).where(eq(sessions.id, sessionId))
  ])

  await logAudit(c, 'sessions', sessionId, 'STEP_UP_VERIFIED', null, { passkeyId: passkey.id })
  
  return c.json({ success: true })
})

export default webauthn
