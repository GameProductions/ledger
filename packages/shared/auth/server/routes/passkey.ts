import { Hono } from 'hono'
import { AuthConfig, AuthEnv, PasskeyEntry } from '../../types'
import { AuthService } from '../services/auth.service'
import { getDb } from '#/index'
import { sessions, passkeys } from '#/schema'
import { eq, and, desc } from 'drizzle-orm'
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server'
import { VaultService } from '~/services/vault.service'

const AAGUID_METADATA: Record<string, { name: string; icon: string; securityLevel: string; manufacturer: string; logo: string }> = {
  // Apple Authenticators
  'ad155505-7d1d-473d-8517-c8a417646a53': {
    name: 'Apple iCloud Keychain',
    icon: 'apple',
    securityLevel: 'Hardware Protected (TEE/SE)',
    manufacturer: 'Apple Inc.',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg'
  },
  'dd2ec1e5-3c85-4d1e-954b-0098bc104ba0': {
    name: 'Apple iCloud Keychain',
    icon: 'apple',
    securityLevel: 'Hardware Protected (Secure Enclave)',
    manufacturer: 'Apple Inc.',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg'
  },
  '3c0a05e8-f995-4c96-8a2e-47ef7a539f8b': {
    name: 'Apple Touch ID / Face ID',
    icon: 'apple',
    securityLevel: 'Hardware Protected (Secure Enclave)',
    manufacturer: 'Apple Inc.',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg'
  },
  '2bce0002-35bc-c60a-648b-0b25f1f05503': {
    name: 'Apple Safari on iOS/iPadOS',
    icon: 'apple',
    securityLevel: 'Hardware Protected (Secure Enclave)',
    manufacturer: 'Apple Inc.',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg'
  },

  // Google Authenticators
  'ea9b8d66-4d01-1d21-3ce4-b6b48cb575d4': {
    name: 'Google Password Manager',
    icon: 'google',
    securityLevel: 'Hardware Protected (TEE)',
    manufacturer: 'Google LLC',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_Logo.svg'
  },
  '9ddd1817-af5a-4672-a2b9-3e205c3d2b5c': {
    name: 'Google Password Manager',
    icon: 'google',
    securityLevel: 'Hardware Protected (TEE)',
    manufacturer: 'Google LLC',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_Logo.svg'
  },
  'adce0002-35bc-c60a-648b-0b25f1f05503': {
    name: 'Google Chrome on macOS',
    icon: 'google',
    securityLevel: 'Hardware Protected (Secure Enclave Sync)',
    manufacturer: 'Google LLC',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/Google_Chrome_icon_%28February_2022%29.svg'
  },

  // Microsoft Authenticators
  '6028c46d-0081-4229-873b-554474775f0a': {
    name: 'Windows Hello',
    icon: 'windows',
    securityLevel: 'Hardware Protected (TPM 2.0)',
    manufacturer: 'Microsoft Corporation',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg'
  },
  '08987058-cad0-4399-b38f-02f6fa2ff0f8': {
    name: 'Windows Hello',
    icon: 'windows',
    securityLevel: 'Hardware Protected (TPM 2.0)',
    manufacturer: 'Microsoft Corporation',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg'
  },

  // Yubico Hardware Security Keys
  'f8a011f3-8c0a-4d15-8006-17111f9edc01': {
    name: 'YubiKey 5 Series (FIDO2/WebAuthn)',
    icon: 'key',
    securityLevel: 'Hardware Security Key (Secure Element)',
    manufacturer: 'Yubico AB',
    logo: 'https://www.yubico.com/wp-content/uploads/2020/09/yubico-logo.png'
  },
  'cb69481e-8ff7-4039-93ec-0a2729a1d67d': {
    name: 'YubiKey 5 NFC / 5C NFC',
    icon: 'key',
    securityLevel: 'Hardware Security Key (Secure Element)',
    manufacturer: 'Yubico AB',
    logo: 'https://www.yubico.com/wp-content/uploads/2020/09/yubico-logo.png'
  },
  'ee690f0a-3c58-4ea7-8b64-0fb42971846b': {
    name: 'YubiKey 5C / 5 Nano',
    icon: 'key',
    securityLevel: 'Hardware Security Key (Secure Element)',
    manufacturer: 'Yubico AB',
    logo: 'https://www.yubico.com/wp-content/uploads/2020/09/yubico-logo.png'
  },
  'fa2b99dc-9e39-4257-8f9a-074d411b0e00': {
    name: 'YubiKey 5Ci',
    icon: 'key',
    securityLevel: 'Hardware Security Key (Secure Element)',
    manufacturer: 'Yubico AB',
    logo: 'https://www.yubico.com/wp-content/uploads/2020/09/yubico-logo.png'
  },
  'b92d8f92-5b9c-4f9e-8c9e-711d9f8b0123': {
    name: 'YubiKey Bio Series (FIDO Edition)',
    icon: 'key',
    securityLevel: 'Hardware Security Key (Biometric + SE)',
    manufacturer: 'Yubico AB',
    logo: 'https://www.yubico.com/wp-content/uploads/2020/09/yubico-logo.png'
  },

  // 1Password
  'b5397666-4885-4026-9f88-4f274a44b584': {
    name: '1Password',
    icon: 'key',
    securityLevel: 'End-to-End Encrypted Vault',
    manufacturer: 'AgileBits Inc.',
    logo: 'https://1password.com/img/brand/1password-logo.svg'
  },

  // Bitwarden
  '6c0a05e8-f995-4c96-8a2e-47ef7a539f8c': {
    name: 'Bitwarden Authenticator',
    icon: 'key',
    securityLevel: 'End-to-End Encrypted Vault',
    manufacturer: 'Bitwarden Inc.',
    logo: 'https://bitwarden.com/images/icon-mobile.png'
  }
}

function getRpID(c: any): string {
  const host = c.req.header('host') || 'foundation.gpnet.dev'
  if (host.includes('localhost') || host.includes('127.0.0.1')) return 'localhost'
  return host.split(':')[0]
}

function getAAGUIDMetadata(aaguid: string) {
  return AAGUID_METADATA[aaguid] || {
    name: 'FIDO2 / WebAuthn Authenticator',
    icon: 'key',
    securityLevel: 'Standard Cryptographic Hardware/Platform',
    manufacturer: 'FIDO Alliance Certified Provider',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/FIDO_Alliance_logo.svg/320px-FIDO_Alliance_logo.svg.png'
  }
}

function getForensics(c: any) {
  const connectingIp = c.req.header('CF-Connecting-IP') || c.req.header('x-forwarded-for') || '127.0.0.1'
  return {
    connectingIp,
    ipV4: c.req.header('CF-Connecting-IP') || null,
    ipV6: c.req.header('CF-Pseudo-IPv4') || null,
    userAgent: c.req.header('User-Agent') || null,
    cfRay: c.req.header('CF-Ray') || null,
    city: c.req.header('CF-IPCity') || null,
    country: c.req.header('CF-IPCountry') || null,
    region: c.req.header('CF-Region') || null,
    latitude: c.req.header('CF-IPLatitude') || null,
    longitude: c.req.header('CF-IPLongitude') || null,
    location: null,
  }
}

export function createPasskeyRoutes(config: AuthConfig) {
  const router = new Hono<AuthEnv>()

  router.post('/generate-registration', async (c) => {
    try {
      const userId = c.get('user_id')
      if (!userId) return c.json({ error: 'Unauthorized.' }, 401)

      const rpID = getRpID(c)
      const db = getDb(c.env)
      const userPasskeys = await db.select().from(passkeys).where(eq(passkeys.userId, userId))

      const options = await generateRegistrationOptions({
        rpName: config.appName,
        rpID,
        userName: userId,
        attestationType: 'none',
        excludeCredentials: userPasskeys.map(pk => ({
          id: pk.id,
          type: 'public-key' as const,
          transports: pk.transports ? JSON.parse(pk.transports) : undefined,
        })),
      })

      await db.update(sessions).set({ passkeyVerifiedAt: options.challenge }).where(eq(sessions.id, c.get('session_id')))

      return c.json({ options })
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  router.post('/verify-registration', async (c) => {
    try {
      const userId = c.get('user_id')
      const sessionId = c.get('session_id')
      if (!userId || !sessionId) return c.json({ error: 'Unauthorized.' }, 401)

      const rpID = getRpID(c)
      const db = getDb(c.env)

      const sessionRecord = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1).then(r => r[0])
      if (!sessionRecord || !sessionRecord.passkeyVerifiedAt) {
        return c.json({ error: 'No active challenge.' }, 400)
      }

      const body = await c.req.json()
      const verification = await verifyRegistrationResponse({
        response: body,
        expectedChallenge: sessionRecord.passkeyVerifiedAt,
        expectedOrigin: c.req.header('origin') || `https://${rpID}`,
        expectedRPID: rpID,
        requireUserVerification: true,
      })

      if (verification.verified && verification.registrationInfo) {
        const { credential, aaguid } = verification.registrationInfo
        const { publicKey, id: credentialID, counter } = credential
        const forensics = getForensics(c)
        const vault = new VaultService(db, c.env.ENCRYPTION_KEY)

        const credentialIdUrl = credentialID
        const publicKeyUrl = Buffer.from(publicKey).toString('base64url')

        await vault.setSecret(credentialIdUrl, 'PASSKEY_PUBLIC_KEY', 'internal', publicKeyUrl)
        const providerMeta = getAAGUIDMetadata(aaguid || '')

        await (db.insert(passkeys) as any).values({
          id: credentialIdUrl,
          userId,
          credentialIdHash: credentialIdUrl,
          counter,
          aaguid: aaguid || null,
          providerName: providerMeta.name,
          icon: providerMeta.icon,
          securityLevel: providerMeta.securityLevel,
          manufacturer: providerMeta.manufacturer,
          logo: providerMeta.logo,
          transports: JSON.stringify(body.response.transports || []),
          registrationIpV4: forensics.ipV4,
          registrationIpV6: forensics.ipV6,
          registrationUa: forensics.userAgent,
          registrationCity: forensics.city,
          registrationCountry: forensics.country,
          registrationRegion: forensics.region,
          registrationLatitude: forensics.latitude,
          registrationLongitude: forensics.longitude,
          createdAt: new Date().toISOString(),
        })

        await db.update(sessions).set({ passkeyVerifiedAt: new Date().toISOString() }).where(eq(sessions.id, sessionId))

        return c.json({ verified: true })
      }

      return c.json({ verified: false }, 400)
    } catch (err: any) {
      return c.json({ error: err.message }, 400)
    }
  })

  router.get('/', async (c) => {
    try {
      const userId = c.get('user_id')
      if (!userId) return c.json({ error: 'Unauthorized.' }, 401)

      const db = getDb(c.env)
      const results = await db.select().from(passkeys).where(eq(passkeys.userId, userId)).orderBy(desc(passkeys.createdAt))

      return c.json({ passkeys: results })
    } catch (err: any) {
      return c.json({ error: 'Failed to retrieve passkeys.' }, 500)
    }
  })

  router.put('/:id', async (c) => {
    try {
      const userId = c.get('user_id')
      const keyId = c.req.param('id')
      const { name } = await c.req.json()
      if (!userId) return c.json({ error: 'Unauthorized.' }, 401)

      const db = getDb(c.env)
      await db.update(passkeys).set({ name }).where(and(eq(passkeys.id, keyId), eq(passkeys.userId, userId)))

      return c.json({ success: true })
    } catch (err: any) {
      return c.json({ error: 'Failed to rename passkey.' }, 500)
    }
  })

  router.delete('/:id', async (c) => {
    try {
      const userId = c.get('user_id')
      const keyId = c.req.param('id')
      if (!userId) return c.json({ error: 'Unauthorized.' }, 401)

      const db = getDb(c.env)
      const vault = new VaultService(db, c.env.ENCRYPTION_KEY)

      await db.delete(passkeys).where(and(eq(passkeys.id, keyId), eq(passkeys.userId, userId)))
      await vault.deleteSecret(keyId, 'PASSKEY_PUBLIC_KEY', 'internal')

      return c.json({ success: true })
    } catch (err: any) {
      return c.json({ error: 'Failed to revoke passkey.' }, 500)
    }
  })

  // 🔑 Unauthenticated Passkey Login Generation (Discoverable Credentials / Passkey Autofill)
  router.post('/generate-authentication', async (c) => {
    try {
      const rpID = getRpID(c)
      const options = await generateAuthenticationOptions({
        rpID,
        userVerification: 'preferred',
      })

      // Store challenge in KV or cookie so unauthenticated verify can look it up
      const tempChallengeId = crypto.randomUUID()
      if (c.env?.FLEET_SECURITY_CACHE?.put) {
        try {
          await c.env.FLEET_SECURITY_CACHE.put(`passkey_challenge:${tempChallengeId}`, options.challenge, { expirationTtl: 300 })
        } catch (e: any) {
          console.warn('[Passkey] Failed to cache challenge in KV:', e.message)
        }
      }

      return c.json({ options, challengeId: tempChallengeId })
    } catch (err: any) {
      console.error('[Passkey] generate-authentication error:', err)
      return c.json({ error: err.message || 'Passkey initialization failed' }, 500)
    }
  })


  // 🔑 Unauthenticated Passkey Login Verification
  router.post('/verify-authentication', async (c) => {
    try {
      const rpID = getRpID(c)
      const db = getDb(c.env)
      const body = await c.req.json()
      const challengeId = c.req.query('challengeId') || body.challengeId

      let expectedChallenge: string | null = null
      if (challengeId && c.env.FLEET_SECURITY_CACHE) {
        expectedChallenge = await c.env.FLEET_SECURITY_CACHE.get(`passkey_challenge:${challengeId}`)
      }

      const passkey = await db.select().from(passkeys)
        .where(eq(passkeys.id, body.id))
        .limit(1).then(r => r[0])

      if (!passkey) return c.json({ success: false, error: 'Passkey not recognized on this account.' }, 404)

      const vault = new VaultService(db, (c.env as any)?.ENCRYPTION_KEY)
      const publicKeyUrl = await vault.getSecret(body.id, 'PASSKEY_PUBLIC_KEY', 'internal')

      const verification = await verifyAuthenticationResponse({
        response: body,
        expectedChallenge: expectedChallenge || body.challenge || '',
        expectedOrigin: c.req.header('origin') || `https://${rpID}`,
        expectedRPID: rpID,
        credential: {
          id: passkey.id,
          publicKey: Buffer.from(publicKeyUrl!, 'base64url'),
          counter: passkey.counter ?? 0,
          transports: passkey.transports ? JSON.parse(passkey.transports) : undefined,
        },
      })

      if (verification.verified) {
        const forensics = getForensics(c)
        await db.update(passkeys).set({
          counter: verification.authenticationInfo.newCounter,
          lastUsedAt: new Date().toISOString(),
          lastUsedIpV4: forensics.ipV4,
          lastUsedIpV6: forensics.ipV6,
          lastUsedUa: forensics.userAgent,
        }).where(eq(passkeys.id, passkey.id))

        const auth = new AuthService(c.env, config)
        const hostStr = c.req.header('host') || ''
        const isLocal = Boolean(c.env.ENVIRONMENT !== 'production' && (hostStr.includes('localhost') || c.req.header('origin')?.includes('localhost')))
        const { sessionId, expirationHours } = await auth.createSession(passkey.userId, forensics, true)
        auth.setSessionCookie(c, sessionId, expirationHours, isLocal)

        return c.json({ success: true, verified: true })
      }

      return c.json({ success: false, error: 'Passkey verification failed.' }, 400)
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 400)
    }
  })

  // 🛡️ Authenticated Step-up Challenge
  router.post('/generate-auth', async (c) => {
    try {
      const userId = c.get('user_id')
      const sessionId = c.get('session_id')
      if (!userId || !sessionId) return c.json({ error: 'Unauthorized.' }, 401)

      const rpID = getRpID(c)
      const db = getDb(c.env)
      const userPasskeys = await db.select().from(passkeys).where(eq(passkeys.userId, userId))

      const options = await generateAuthenticationOptions({
        rpID,
        allowCredentials: userPasskeys.map(pk => ({
          id: pk.id,
          type: 'public-key' as const,
          transports: pk.transports ? JSON.parse(pk.transports) : undefined,
        })),
        userVerification: 'preferred',
      })

      await db.update(sessions).set({ passkeyVerifiedAt: options.challenge }).where(eq(sessions.id, sessionId))

      return c.json({ options })
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  router.post('/verify-auth', async (c) => {
    try {
      const userId = c.get('user_id')
      const sessionId = c.get('session_id')
      if (!userId || !sessionId) return c.json({ error: 'Unauthorized.' }, 401)

      const rpID = getRpID(c)
      const db = getDb(c.env)

      const sessionRecord = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1).then(r => r[0])
      if (!sessionRecord || !sessionRecord.passkeyVerifiedAt) {
        return c.json({ error: 'No active challenge.' }, 400)
      }

      const body = await c.req.json()
      const passkey = await db.select().from(passkeys)
        .where(and(eq(passkeys.userId, userId), eq(passkeys.id, body.id)))
        .limit(1).then(r => r[0])

      if (!passkey) return c.json({ error: 'Passkey not found.' }, 404)

      const vault = new VaultService(db, (c.env as any)?.ENCRYPTION_KEY)
      const publicKeyUrl = await vault.getSecret(body.id, 'PASSKEY_PUBLIC_KEY', 'internal')

      const verification = await verifyAuthenticationResponse({
        response: body,
        expectedChallenge: sessionRecord.passkeyVerifiedAt,
        expectedOrigin: c.req.header('origin') || `https://${rpID}`,
        expectedRPID: rpID,
        credential: {
          id: passkey.id,
          publicKey: Buffer.from(publicKeyUrl!, 'base64url'),
          counter: passkey.counter ?? 0,
          transports: passkey.transports ? JSON.parse(passkey.transports) : undefined,
        },
      })

      if (verification.verified) {
        const forensics = getForensics(c)
        await db.update(passkeys).set({
          counter: verification.authenticationInfo.newCounter,
          lastUsedAt: new Date().toISOString(),
          lastUsedIpV4: forensics.ipV4,
          lastUsedIpV6: forensics.ipV6,
          lastUsedUa: forensics.userAgent,
          lastUsedCity: forensics.city,
          lastUsedCountry: forensics.country,
          lastUsedRegion: forensics.region,
          lastUsedLatitude: forensics.latitude,
          lastUsedLongitude: forensics.longitude,
        }).where(eq(passkeys.id, passkey.id))

        if (sessionId) {
          await db.update(sessions).set({ passkeyVerifiedAt: new Date().toISOString() }).where(eq(sessions.id, sessionId as string))
        }

        return c.json({ verified: true })
      }

      return c.json({ verified: false }, 400)
    } catch (err: any) {
      return c.json({ error: err.message }, 400)
    }
  })

  return router
}
