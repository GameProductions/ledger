import { Hono } from 'hono'
import { AuthConfig, AuthEnv } from '../../types'
import { getDb } from '#/index'
import { users, sessions, userIdentities } from '#/schema'
import { eq, and, sql } from 'drizzle-orm'
import { setCookie } from 'hono/cookie'
import { AuthService, generateUUIDv7, generatePrefixedId } from '../services/auth.service'
import crypto from 'crypto'

async function generateUniqueUsername(db: any, base: string): Promise<string> {
  const clean = (base || '').toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, 32) || 'user'
  let candidate = clean
  let i = 1
  for (;;) {
    const existing = await db.select().from(users).where(sql`lower(${users.username}) = lower(${candidate})`).limit(1).then((r: any[]) => r[0])
    if (!existing) return candidate
    candidate = `${clean}-${i++}`
  }
}

async function signOAuthState(payload: object, secret: string): Promise<string> {
  const data = btoa(JSON.stringify(payload))
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret || 'foundation-default-state-secret'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  const sigBase64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/[+/=]/g, (c) => ({ '+': '-', '/': '_', '=': '' })[c] || '')
  return `${data}.${sigBase64}`
}

async function verifyOAuthState(stateStr: string, secret: string): Promise<any | null> {
  try {
    const [data, sig] = stateStr.split('.')
    if (!data) return null

    const safeData = data.replace(/-/g, '+').replace(/_/g, '/')
    const paddedData = safeData.padEnd(Math.ceil(safeData.length / 4) * 4, '=')

    if (!sig) {
      // Backwards compatibility for legacy raw base64 states
      return JSON.parse(atob(paddedData))
    }

    const enc = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret || 'foundation-default-state-secret'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )
    const safeSig = sig.replace(/-/g, '+').replace(/_/g, '/')
    const paddedSig = safeSig.padEnd(Math.ceil(safeSig.length / 4) * 4, '=')
    const rawSig = atob(paddedSig)
    const sigBytes = new Uint8Array(rawSig.length)
    for (let i = 0; i < rawSig.length; i++) sigBytes[i] = rawSig.charCodeAt(i)

    const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(data))
    if (!isValid) return null

    return JSON.parse(atob(paddedData))
  } catch {
    return null
  }
}

export function createOauthRoutes(config: AuthConfig) {
  const router = new Hono<AuthEnv>()

  router.get('/:provider', async (c) => {
    const provider = c.req.param('provider')
    const hostStr = c.req.header('host') || ''
    const isLocal = c.env.ENVIRONMENT !== 'production' && (hostStr.includes('localhost') || c.req.header('origin')?.includes('localhost'))
    const secret = c.env.JWT_SECRET || 'foundation-default-state-secret'
    
    // Determine the actual client origin making the request (e.g. http://localhost:8787 or http://localhost:5172)
    const protocol = isLocal ? 'http' : 'https'
    const appOrigin = `${protocol}://${hostStr || (isLocal ? 'localhost:8787' : 'foundation.gpnet.dev')}`

    if (provider === 'discord') {
      const redirectUri = 'https://sso.gpnet.dev/api/proxy/callback/discord'

      const persistent = c.req.query('persistent') === 'true'
      const targetOrigin = `${appOrigin}/api/auth/callback/discord`
      const state = await signOAuthState({ persistent, targetOrigin, nonce: crypto.randomUUID(), provider: 'discord', ts: Date.now() }, secret)

      const url = new URL('https://discord.com/oauth2/authorize')
      url.searchParams.set('client_id', c.env.DISCORD_CLIENT_ID)
      url.searchParams.set('redirect_uri', redirectUri)
      url.searchParams.set('response_type', 'code')
      url.searchParams.set('scope', 'identify email')
      url.searchParams.set('state', state)
      url.searchParams.set('prompt', 'consent')
      return c.redirect(url.toString())
    }



    if (provider === 'google') {
      if (!c.env.GOOGLE_CLIENT_ID) {
        return c.json({ success: false, error: 'Google OAuth is not configured.' }, 500)
      }

      const redirectUri = isLocal
        ? 'http://localhost:5172/api/auth/callback/google'
        : 'https://sso.gpnet.dev/api/proxy/callback/google'

      const persistent = c.req.query('persistent') === 'true'
      const targetOrigin = `${appOrigin}/api/auth/callback/google`
      const state = await signOAuthState({ persistent, targetOrigin, nonce: crypto.randomUUID(), provider: 'google', ts: Date.now() }, secret)

      const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
      url.searchParams.set('client_id', c.env.GOOGLE_CLIENT_ID)
      url.searchParams.set('redirect_uri', redirectUri)
      url.searchParams.set('response_type', 'code')
      url.searchParams.set('scope', 'openid profile email')
      url.searchParams.set('state', state)
      return c.redirect(url.toString())
    }

    if (provider === 'github') {
      if (!c.env.GITHUB_CLIENT_ID) {
        return c.json({ success: false, error: 'GitHub OAuth is not configured.' }, 500)
      }

      const redirectUri = isLocal
        ? 'http://localhost:5172/api/auth/callback/github'
        : 'https://sso.gpnet.dev/api/proxy/callback/github'

      const persistent = c.req.query('persistent') === 'true'
      const targetOrigin = `${appOrigin}/api/auth/callback/github`
      const state = await signOAuthState({ persistent, targetOrigin, nonce: crypto.randomUUID(), provider: 'github', ts: Date.now() }, secret)

      const url = new URL('https://github.com/login/oauth/authorize')
      url.searchParams.set('client_id', c.env.GITHUB_CLIENT_ID)
      url.searchParams.set('redirect_uri', redirectUri)
      url.searchParams.set('scope', 'read:user user:email')
      url.searchParams.set('state', state)
      return c.redirect(url.toString())
    }

    return c.json({ success: false, error: `Unknown provider: ${provider}` }, 400)
  })

  return router
}

export function createOauthCallbackRoutes(config: AuthConfig) {
  const router = new Hono()
  router.get('/callback/discord', async (c) => handleOAuthCallback(c, config, 'discord'))
  router.get('/callback/google', async (c) => handleOAuthCallback(c, config, 'google'))
  router.get('/callback/github', async (c) => handleOAuthCallback(c, config, 'github'))
  return router
}

async function handleOAuthCallback(c: any, config: AuthConfig, provider: string) {
  const code = c.req.query('code')
  if (!code) return c.text('Unauthorized: Missing OAuth code.', 400)

  // Verify HMAC-signed OAuth state parameter to prevent Login CSRF
  const rawState = c.req.query('state')
  const secret = c.env.JWT_SECRET || 'foundation-default-state-secret'
  let statePayload: any = null
  if (rawState) {
    statePayload = await verifyOAuthState(rawState, secret)
  }

  const hostStr = c.req.header('host') || ''
  const isLocal = c.env.ENVIRONMENT !== 'production' && (hostStr.includes('localhost') || c.req.header('origin')?.includes('localhost'))

  try {
    let providerUserId: string
    let username: string
    let avatarUrl: string | null = null
    let email: string | null = null
    let isEmailVerified = false

    if (provider === 'discord') {
      // Discord only allows https redirect URIs; we always use the SSO proxy.
      // The proxy exchanges the code server-side and bounces a session_token to the local app.
      const redirectUri = 'https://sso.gpnet.dev/api/proxy/callback/discord'

      const tokenRes = await fetch('https://discord.com/api/oauth2/token', {

        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: c.env.DISCORD_CLIENT_ID,
          client_secret: c.env.DISCORD_CLIENT_SECRET,
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }).toString(),
      })

      if (!tokenRes.ok) return c.text('Discord token exchange failed.', 401)
      const { access_token } = await tokenRes.json() as any
      const userRes = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${access_token}` },
      })
      if (!userRes.ok) return c.text('Failed to fetch Discord profile.', 500)
      const profile = await userRes.json() as any
      providerUserId = profile.id
      username = profile.global_name || profile.username
      email = profile.email || null
      isEmailVerified = profile.verified === true
      avatarUrl = profile.avatar
        ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
        : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(profile.id) >> 22n) % 6}.png`
    } else if (provider === 'google') {
      const redirectUri = isLocal
        ? 'http://localhost:5172/api/auth/callback/google'
        : 'https://sso.gpnet.dev/api/proxy/callback/google'

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: c.env.GOOGLE_CLIENT_ID,
          client_secret: c.env.GOOGLE_CLIENT_SECRET,
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }).toString(),
      })

      if (!tokenRes.ok) return c.text('Google token exchange failed.', 401)
      const { access_token } = await tokenRes.json() as any
      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` },
      })
      if (!userRes.ok) return c.text('Failed to fetch Google profile.', 500)
      const profile = await userRes.json() as any
      providerUserId = profile.id
      username = profile.name || profile.given_name || 'Google User'
      email = profile.email || null
      isEmailVerified = profile.verified_email === true
      avatarUrl = profile.picture || null
    } else if (provider === 'github') {
      const redirectUri = isLocal
        ? 'http://localhost:5172/api/auth/callback/github'
        : 'https://sso.gpnet.dev/api/proxy/callback/github'

      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          client_id: c.env.GITHUB_CLIENT_ID,
          client_secret: c.env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: redirectUri,
        }),
      })

      if (!tokenRes.ok) return c.text('GitHub token exchange failed.', 401)
      const tokenData = await tokenRes.json() as any
      const access_token = tokenData.access_token
      if (!access_token) return c.text(`GitHub token error: ${tokenData.error_description || 'Unknown'}`, 401)

      const userRes = await fetch('https://api.github.com/user', {
        headers: { 
          Authorization: `Bearer ${access_token}`,
          'User-Agent': 'Foundation-Auth-Gateway'
        },
      })
      if (!userRes.ok) return c.text('Failed to fetch GitHub profile.', 500)
      const profile = await userRes.json() as any
      providerUserId = String(profile.id)
      username = profile.name || profile.login || 'GitHub User'
      avatarUrl = profile.avatar_url || null

      // Attempt to retrieve primary verified email if not public in profile
      email = profile.email || null
      isEmailVerified = false
      try {
        const emailRes = await fetch('https://api.github.com/user/emails', {
          headers: { 
            Authorization: `Bearer ${access_token}`,
            'User-Agent': 'Foundation-Auth-Gateway'
          },
        })
        if (emailRes.ok) {
          const emails = await emailRes.json() as any[]
          const primary = emails.find((e: any) => e.primary && e.verified) || emails.find((e: any) => e.verified) || emails[0]
          if (primary) {
            email = primary.email
            isEmailVerified = primary.verified === true
          }
        }
      } catch (e: any) {
        console.warn('[GitHub OAuth] email fetch fallback:', e.message)
      }
    } else {
      return c.text('Unknown provider.', 400)
    }

    const db = getDb(c.env)
    
    let identity: any = null
    try {
      identity = await db.select({ userId: userIdentities.userId })
        .from(userIdentities)
        .where(and(eq(userIdentities.provider, provider), eq(userIdentities.providerUserId, providerUserId)))
        .limit(1)
        .then(r => r[0])
    } catch (e: any) {
      console.warn('[Auth] userIdentities query error:', e.message)
    }

    let targetUserId: string

    if (!identity) {
      // Check if this is the first user in the entire system
      let isFirstUser = false
      try {
        const existingUsers = await db.select({ id: users.id }).from(users).limit(1)
        isFirstUser = existingUsers.length === 0
      } catch (e: any) {
        console.warn('[Auth] users count check fallback:', e.message)
      }

      if (isFirstUser) {
        const newUserId = generateUUIDv7()
        await db.insert(users).values({
          id: newUserId,
          email,
          username: await generateUniqueUsername(db, email?.split('@')[0] || username),
          displayName: username,
          avatarUrl,
          globalRole: 'owner',
          status: 'active',
        })
        try {
          await db.insert(userIdentities).values({
            id: generatePrefixedId('ident'),
            userId: newUserId,
            provider,
            providerUserId,
            name: username,
            email,
            avatarUrl,
          })
        } catch {}
        targetUserId = newUserId
      } else {
        // Check if there is an existing root user or verified email match
        let existingUser: any = null
        if (email && isEmailVerified) {
          try {
            existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1).then(r => r[0])
          } catch {}
        }

        if (existingUser) {
          targetUserId = existingUser.id
          try {
            await db.insert(userIdentities).values({
              id: generatePrefixedId('ident'),
              userId: targetUserId,
              provider,
              providerUserId,
              name: username,
              email,
              avatarUrl,
            })
          } catch {}
        } else {
          // Create new local user
          const newUserId = generateUUIDv7()
          await db.insert(users).values({
            id: newUserId,
            email,
            username: await generateUniqueUsername(db, email?.split('@')[0] || username),
            displayName: username,
            avatarUrl,
            globalRole: 'user',
            status: 'active',
          })
          try {
            await db.insert(userIdentities).values({
              id: generatePrefixedId('ident'),
              userId: newUserId,
              provider,
              providerUserId,
              name: username,
              email,
              avatarUrl,
            })
          } catch {}
          targetUserId = newUserId
        }
      }
    } else {
      try {
        await Promise.all([
          db.update(users).set({ avatarUrl, displayName: username }).where(eq(users.id, identity.userId)),
          db.update(userIdentities).set({
            name: username,
            email: email || undefined,
            avatarUrl: avatarUrl || undefined,
          }).where(and(eq(userIdentities.provider, provider), eq(userIdentities.providerUserId, providerUserId)))
        ])
      } catch {}
      targetUserId = identity.userId
    }

    const auth = new AuthService(c.env, config)
    const forensics = getForensics(c)
    let isPersistent = false
    let targetOrigin: string | null = null

    if (statePayload) {
      isPersistent = !!statePayload.persistent
      targetOrigin = statePayload.targetOrigin || null
    }

    const { sessionId, expirationHours } = await auth.createSession(targetUserId, forensics, isPersistent)
    auth.setSessionCookie(c, sessionId, expirationHours, isLocal)

    if (targetOrigin) {
      try {
        const targetUrl = new URL(targetOrigin)

        // Always redirect to /auth-landing with session_token regardless of host.
        // The OAuth code was already consumed by THIS handler's token exchange above,
        // so forwarding the raw code to a different host would always fail (codes are
        // single-use). The session_token is the correct cross-host handoff mechanism.
        if (targetUrl.pathname.includes('/callback')) {
          targetUrl.pathname = '/auth-landing'
        }
        targetUrl.searchParams.set('session_token', sessionId)
        return c.redirect(targetUrl.toString())
      } catch {}
    }

    const fallbackOrigin = isLocal ? `http://${hostStr || 'localhost:8787'}` : ''
    return c.redirect(`${fallbackOrigin}/auth-landing?session_token=${encodeURIComponent(sessionId)}`)


  } catch (err: any) {
    console.error(`[Auth] ${provider} callback failed:`, err.message)
    return c.text(`Authentication failed: ${err.message}`, 500)
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
    location: null,
  }
}
