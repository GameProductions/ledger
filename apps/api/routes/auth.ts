import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { 
  generateRegistrationOptions, 
  verifyRegistrationResponse, 
  generateAuthenticationOptions, 
  verifyAuthenticationResponse 
} from '@simplewebauthn/server'
import { AuthService } from '../services/auth.service'
import { Bindings, Variables } from '../types'
import { logAudit, getRequestMetadata } from '../utils'
import { uint8ArrayToBase64, base64ToUint8Array, uint8ArrayToBase64url, decodeBase64, getRpID, hashIdentifier } from '../auth-utils'
import { getAAGUIDMetadata } from '../utils/webauthn-metadata'
import { VaultService } from '../utils/vault.service'
import { setSignedCookie, getSignedCookie } from 'hono/cookie'
import { verify as jwtVerify } from 'hono/jwt'
import { HTTPException } from 'hono/http-exception'
import { EmailService } from '../services/email.service'
import { getDb } from '#/index'
import { users, passkeys, sessions } from '#/schema'
import { eq, or, and } from 'drizzle-orm'

const auth = new Hono<{ Bindings: Bindings, Variables: Variables }>()

// Zero-Trust Identity Verification (Phase 3 Audit)
auth.get('/verify', (c) => {
  return c.json({
    success: true,
    data: {
      userId: c.get('userId'),
      householdId: c.get('householdId'),
      globalRole: c.get('globalRole') || 'user',
      isImpersonating: !!c.get('isImpersonating')
    }
  })
})


async function createSessionTracker(c: any, userId: string, passkeyVerified: boolean = false, isPersistent: boolean = false) {
  const db = getDb(c.env)
  const sessionId = `sess-${crypto.randomUUID()}`
  const meta = getRequestMetadata(c)
  
  const userAgent = meta.userAgent
  const browserM = userAgent.match(/(firefox|msie|chrome|safari|trident|edge)/i)
  const osM = userAgent.match(/(mac os x|windows nt|linux|android|iphone|ipad)/i)
  
  const browser = browserM ? browserM[0] : 'Unknown'
  const os = osM ? osM[0] : 'Unknown'
  
  const expirationHours = isPersistent ? 30 * 24 : 24

  // FORENSIC AUDIT: Extract geolocation from headers if available (Cloudflare specific)
  const city = c.req.header('cf-ipcity')
  const country = c.req.header('cf-ipcountry')
  const region = c.req.header('cf-region')
  const continent = c.req.header('cf-continent')
  const latitude = c.req.header('cf-iplatitude')
  const longitude = c.req.header('cf-iplongitude')
  const cfRay = c.req.header('cf-ray')

  await db.insert(sessions).values({
    id: sessionId,
    userId,
    deviceName: `${os} Device`,
    os,
    browser,
    ipAddress: meta.ip,
    ipV4: meta.ipV4,
    ipV6: meta.ipV6,
    isPersistent: !!isPersistent,
    passkeyVerifiedAt: passkeyVerified ? new Date().toISOString() : null,
    lastActiveAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + expirationHours * 60 * 60 * 1000).toISOString(),
    city,
    country,
    region,
    continent,
    latitude,
    longitude,
    cfRay,
    cfIp: meta.ip
  })
  
  return sessionId
}


// Pass loginAudit as a parameter to handlers if needed, or handle it here
// Since logAudit is in index.ts, we might need to pass it or move it to a utility

auth.post('/login', zValidator('json', z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  recoveryCode: z.string().optional(), // Rename totpCode to recoveryCode for backup code support
  persistent: z.boolean().optional()
}), (result, c) => {
  if (!result.success) {
    console.error('[Login Validation Failed]', {
      error: result.error,
      contentType: c.req.header('Content-Type'),
      path: c.req.path
    })
    return c.json({ success: false, error: result.error }, 400)
  }
}), async (c) => {
  const { username, password, recoveryCode, persistent } = c.req.valid('json')
  const authService = new AuthService(c.env)
  
  try {
    const metadata = getRequestMetadata(c)
    const user = (await authService.validateCredentials(username, password) as any)
    
    // Step-Up is handled via the separate WebAuthn flow now

    const sessionId = (await createSessionTracker(c, user.id, false, !!persistent) as any)
    const token = (await authService.generateToken(user.id, sessionId) as any)
    
    await logAudit(c, 'users', user.id, 'login', null, { strategy: 'password' })
    return c.json({ 
      success: true,
      data: {
        token, 
        user: { 
          id: user.id, 
          email: user.email, 
          displayName: user.displayName,
          forcePasswordChange: !!user.forcePasswordChange
        }
      }
    })
  } catch (e: any) {
    if (e instanceof HTTPException) throw e
    
    // Check if it's a known auth failure from AuthService
    if (e.message === 'Invalid credentials' || e.message?.includes('locked')) {
      throw new HTTPException(e.status || 401, { message: e.message })
    }

    console.error('[CRITICAL_LOGIN_ERROR]', e)
    throw new HTTPException(500, { message: 'A system error occurred during authentication. Please try again later.' })
  }
})


auth.get('/login/discord', async (c) => {
  const clientId = c.env.DISCORD_CLIENT_ID
  if (!clientId || clientId.includes('REPLACE_WITH')) {
    const errorMsg = `[OAUTH_ERROR] Discord Client ID is not configured. Please ensure DISCORD_CLIENT_ID is set in your Cloudflare Worker secrets (use 'wrangler secret put DISCORD_CLIENT_ID').`
    console.error(errorMsg)
    throw new HTTPException(500, { message: errorMsg })
  }

  // 1. Capture session context if present
  let userId: string | null = null
  const authHeader = c.req.header('Authorization')
  const authQuery = c.req.query('auth_token')
  const token = authQuery || (authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null)

  if (token) {
    try {
      const payload = await jwtVerify(token, c.env.JWT_SECRET, 'HS256') as any
      userId = payload.sub
    } catch (e: any) {
      console.warn('[OAuth] Failed to verify existing token for linking:', e)
    }
  }

  const persistent = c.req.query('persistent') === 'true'
  const challenge = crypto.randomUUID()
  const targetOrigin = `${new URL(c.req.url).origin}/api/auth/callback/discord`
  const state = uint8ArrayToBase64(new TextEncoder().encode(JSON.stringify({ challenge, userId, targetOrigin, persistent })))
  
  await setSignedCookie(c, 'oauth_state', state, c.env.JWT_SECRET, {
    path: '/',
    secure: true,
    httpOnly: true,
    sameSite: 'None',
    maxAge: 300,
  })
  
  const proxyRedirectUri = `https://sso.gpnet.dev/api/proxy/callback/discord`
  const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(proxyRedirectUri)}&robot=false&response_type=code&scope=identify%20email&state=${state}`
  return c.redirect(url)
})

auth.get('/callback/discord', async (c) => {
  const code = c.req.query('code')
  const state = c.req.query('state')
  const savedState = (await getSignedCookie(c, c.env.JWT_SECRET, 'oauth_state') as any)

  if (!code || !state || state !== savedState) {
    throw new HTTPException(401, { message: 'Invalid OAuth state or missing code' })
  }

  // Parse state for session context
  let sessionUserId: string | null = null
  let isLinkedRoleMetadataUpdate = false
  let isPersistent = false
  try {
    const decoded = JSON.parse(decodeBase64(state))
    sessionUserId = decoded.userId
    isPersistent = !!decoded.persistent
    if (decoded.linkedRoles) isLinkedRoleMetadataUpdate = true
  } catch (e: any) {
    console.warn('[OAuth] State decode failure:', e)
  }

  const authService = new AuthService(c.env)
  
  // 1. Exchange code for token
  const tokenRes = (await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: c.env.DISCORD_CLIENT_ID || '',
        client_secret: c.env.DISCORD_CLIENT_SECRET || '',
        grant_type: 'authorization_code',
        code,
        redirect_uri: `https://sso.gpnet.dev/api/proxy/callback/discord`
      })
    }) as any)
  const tokenData = await tokenRes.json() as any
  
  // 2. Fetch profile
  const userRes = (await fetch('https://discord.com/api/users/@me', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    }) as any)
  const profile = await userRes.json() as any
  
  const socialProfile = {
    id: profile.id,
    email: profile.email,
    name: profile.username,
    avatar: `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
  }

  const socialTokens = {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_in: tokenData.expires_in
  }

  let finalUserId = sessionUserId

  if (sessionUserId) {
    // LINK MODE
    await authService.linkSocialAccount(sessionUserId, 'discord', socialProfile, socialTokens)
    await logAudit(c, 'userIdentities', profile.id, 'LINK', null, { provider: 'discord', userId: sessionUserId })
  } else {
    // LOGIN MODE
    finalUserId = await authService.findOrCreateSocialUser('discord', socialProfile, socialTokens)
  }

  // PUSH LINKED ROLES METADATA IF SOLICITED
  if (isLinkedRoleMetadataUpdate || tokenData.scope?.includes('role_connections.write')) {
    const db = getDb(c.env)
    const dbUser = (await db.select({ role: users.globalRole }).from(users).where(eq(users.id, finalUserId!)).limit(1) as any)

    // Standard Unified Tier Schema for Ledger
    const metadata: Record<string, any> = {}
    if (dbUser[0]?.role === 'owner') {
      metadata.ledger_tier = 3
    } else if (dbUser[0]?.role === 'admin') {
      metadata.ledger_tier = 2
    } else {
      metadata.ledger_tier = 1 // Default Verified User
    }

    try {
      await fetch(`https://discord.com/api/v10/users/@me/applications/${c.env.DISCORD_CLIENT_ID}/role-connection`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform_name: 'Ledger Platform',
          platform_username: profile.username,
          metadata
        }),
      });
      console.log(`[LINKED ROLES] Successfully pushed metadata to Discord for ${profile.username}`);
    } catch(e: any) {
      console.error('[LINKED ROLES] Failed to push metadata to Discord', e);
    }

    // Since Linked Roles verifies natively in the Discord Electron shell, return a nice UI to close it automatically.
    if (isLinkedRoleMetadataUpdate) {
      return c.html(`<html><body style="font-family:sans-serif;text-align:center;padding:50px;background:#0f172a;color:white;"><h3>Account Linked Successfully!</h3><p>Your roles have been updated in Discord. You may safely close this window.</p><script>setTimeout(()=>window.close(),3000)</script></body></html>`)
    }
  }

  if (sessionUserId) {
    return c.redirect(`${c.env.ENVIRONMENT === 'production' ? 'https://ledger.gpnet.dev' : 'http://localhost:5173'}/#/settings`)
  } else {
    const sessionId = (await createSessionTracker(c, finalUserId!, false, isPersistent) as any)
    const token = (await authService.generateToken(finalUserId!, sessionId) as any)
    return c.redirect(`${c.env.ENVIRONMENT === 'production' ? 'https://ledger.gpnet.dev' : 'http://localhost:5173'}/#/login?token=${token}`)
  }
})

// --- DISCORD LINKED ROLES NATIVE ENDPOINT ---
auth.get('/discord/linked-roles/verify', async (c) => {
  const clientId = c.env.DISCORD_CLIENT_ID
  if (!clientId || clientId.includes('REPLACE_WITH')) {
    throw new HTTPException(500, { message: 'Discord Client ID not configured.' })
  }

  const challenge = crypto.randomUUID()
  const targetOrigin = `${new URL(c.req.url).origin}/api/auth/callback/discord`
  const state = uint8ArrayToBase64(new TextEncoder().encode(JSON.stringify({ challenge, userId: null, targetOrigin, linkedRoles: true })))
  
  await setSignedCookie(c, 'oauth_state', state, c.env.JWT_SECRET, {
    path: '/',
    secure: true,
    httpOnly: true,
    sameSite: 'None',
    maxAge: 300,
  })

  // Bounce through the Unified SSO Foundation router
  const proxyRedirectUri = `https://sso.gpnet.dev/api/proxy/callback/discord`
  const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(proxyRedirectUri)}&robot=false&response_type=code&scope=identify%20role_connections.write&state=${state}&prompt=consent`
  
  return c.redirect(url)
})

auth.get('/login/google', async (c) => {
  const clientId = c.env.GOOGLE_CLIENT_ID
  if (!clientId || clientId.includes('REPLACE_WITH')) {
    const errorMsg = `[OAUTH_ERROR] Google Client ID is not configured. Please ensure GOOGLE_CLIENT_ID is set in your Cloudflare Worker secrets (use 'wrangler secret put GOOGLE_CLIENT_ID').`
    console.error(errorMsg)
    throw new HTTPException(500, { message: errorMsg })
  }

  // 1. Capture session context if present
  let userId: string | null = null
  const authHeader = c.req.header('Authorization')
  const authQuery = c.req.query('auth_token')
  const token = authQuery || (authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null)

  if (token) {
    try {
      const payload = await jwtVerify(token, c.env.JWT_SECRET, 'HS256') as any
      userId = payload.sub
    } catch (e: any) {
      console.warn('[OAuth] Failed to verify existing token for linking:', e)
    }
  }

  const persistent = c.req.query('persistent') === 'true'
  const challenge = crypto.randomUUID()
  const targetOrigin = `${new URL(c.req.url).origin}/api/auth/callback/google`
  const state = uint8ArrayToBase64(new TextEncoder().encode(JSON.stringify({ challenge, userId, targetOrigin, persistent })))
  
  await setSignedCookie(c, 'oauth_state', state, c.env.JWT_SECRET, {
    path: '/',
    secure: true,
    httpOnly: true,
    sameSite: 'None',
    maxAge: 300,
  })

  const proxyRedirectUri = `https://sso.gpnet.dev/api/proxy/callback/google`
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(proxyRedirectUri)}&response_type=code&scope=email%20profile%20https://www.googleapis.com/auth/spreadsheets&access_type=offline&prompt=consent&state=${state}`
  return c.redirect(url)
})

auth.get('/callback/google', async (c) => {
  const code = c.req.query('code')
  const state = c.req.query('state')
  const savedState = (await getSignedCookie(c, c.env.JWT_SECRET, 'oauth_state') as any)

  if (!code || !state || state !== savedState) {
    throw new HTTPException(401, { message: 'Invalid OAuth state or missing code' })
  }

  // Parse state for session context
  let sessionUserId: string | null = null
  let isPersistent = false
  try {
    const decoded = JSON.parse(decodeBase64(state))
    sessionUserId = decoded.userId
    isPersistent = !!decoded.persistent
  } catch (e: any) {
    console.warn('[OAuth] State decode failure:', e)
  }

  const authService = new AuthService(c.env)
  
  const tokenRes = (await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: c.env.GOOGLE_CLIENT_ID || '',
        client_secret: c.env.GOOGLE_CLIENT_SECRET || '',
        code: code || '',
        grant_type: 'authorization_code',
        redirect_uri: `https://sso.gpnet.dev/api/proxy/callback/google`
      })
    }) as any)
  const tokenData = await tokenRes.json() as any
  
  const userRes = (await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    }) as any)
  const profile = await userRes.json() as any
  
  const socialProfile = {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    avatar: profile.picture
  }

  const socialTokens = {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_in: tokenData.expires_in
  }

  if (sessionUserId) {
    // LINK MODE
    await authService.linkSocialAccount(sessionUserId, 'google', socialProfile, socialTokens)
    await logAudit(c, 'userIdentities', profile.id, 'LINK', null, { provider: 'google', userId: sessionUserId })
    return c.redirect(`${c.env.ENVIRONMENT === 'production' ? 'https://ledger.gpnet.dev' : 'http://localhost:5173'}/#/settings`)
  } else {
    // LOGIN MODE
    const userId = (await authService.findOrCreateSocialUser('google', socialProfile, socialTokens) as any)
    const sessionId = (await createSessionTracker(c, userId, false, isPersistent) as any)
    const token = (await authService.generateToken(userId, sessionId) as any)
    return c.redirect(`${c.env.ENVIRONMENT === 'production' ? 'https://ledger.gpnet.dev' : 'http://localhost:5173'}/#/login?token=${token}`)
  }
})

// --- DROPBOX ---
auth.get('/login/dropbox', async (c) => {
  const clientId = c.env.DROPBOX_CLIENT_ID
  if (!clientId || clientId.includes('REPLACE_WITH')) {
    throw new HTTPException(500, { message: 'Dropbox Storage Integration Not Configured (Missing Client ID)' })
  }

  // 1. Capture session context if present
  let userId: string | null = null
  const authHeader = c.req.header('Authorization')
  const authQuery = c.req.query('auth_token')
  const token = authQuery || (authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null)

  if (token) {
    try {
      const payload = await jwtVerify(token, c.env.JWT_SECRET, 'HS256') as any
      userId = payload.sub
    } catch (e: any) {
      console.warn('[OAuth] Failed to verify existing token for linking:', e)
    }
  }

  const challenge = crypto.randomUUID()
  const targetOrigin = `${new URL(c.req.url).origin}/api/auth/callback/dropbox`
  const state = uint8ArrayToBase64(new TextEncoder().encode(JSON.stringify({ challenge, userId, targetOrigin })))
  
  await setSignedCookie(c, 'oauth_state', state, c.env.JWT_SECRET, {
    path: '/',
    secure: true,
    httpOnly: true,
    sameSite: 'None',
    maxAge: 300,
  })

  const proxyRedirectUri = `https://sso.gpnet.dev/api/proxy/callback/dropbox`
  const url = `https://www.dropbox.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(proxyRedirectUri)}&response_type=code&state=${state}`
  return c.redirect(url)
})

auth.get('/callback/dropbox', async (c) => {
  const code = c.req.query('code')
  const state = c.req.query('state')
  const savedState = (await getSignedCookie(c, c.env.JWT_SECRET, 'oauth_state') as any)

  if (!code || !state || state !== savedState) {
    throw new HTTPException(401, { message: 'Invalid OAuth state or missing code' })
  }

  // Parse state for session context
  let sessionUserId: string | null = null
  try {
    const decoded = JSON.parse(decodeBase64(state))
    sessionUserId = decoded.userId
  } catch (e: any) {
    console.warn('[OAuth] State decode failure:', e)
  }

  const authService = new AuthService(c.env)
  const tokenRes = (await fetch('https://api.dropbox.com/oauth2/token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: c.env.DROPBOX_CLIENT_ID || '',
        client_secret: c.env.DROPBOX_CLIENT_SECRET || '',
        code: code || '',
        grant_type: 'authorization_code',
        redirect_uri: `https://sso.gpnet.dev/api/proxy/callback/dropbox`
      })
    }) as any)
  const tokenData = await tokenRes.json() as any
  
  const userRes = (await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenData.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(null)
    }) as any)
  const profile = await userRes.json() as any
  
  const socialProfile = {
    id: profile.accountId,
    email: profile.email,
    name: profile.name.displayName,
    avatar: profile.profile_photo_url
  }

  const socialTokens = {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_in: tokenData.expires_in
  }

  if (sessionUserId) {
    // LINK MODE
    await authService.linkSocialAccount(sessionUserId, 'dropbox', socialProfile, socialTokens)
    await logAudit(c, 'userIdentities', profile.accountId, 'LINK', null, { provider: 'dropbox', userId: sessionUserId })
    return c.redirect(`${c.env.WEB_URL || (c.env.ENVIRONMENT === 'production' ? 'https://ledger.gpnet.dev' : 'http://localhost:5173')}/#/settings`)
  } else {
    // LOGIN MODE
    const userId = (await authService.findOrCreateSocialUser('dropbox', socialProfile, socialTokens) as any)
    const sessionId = (await createSessionTracker(c, userId) as any)
    const token = (await authService.generateToken(userId, sessionId) as any)
    return c.redirect(`${c.env.WEB_URL || (c.env.ENVIRONMENT === 'production' ? 'https://ledger.gpnet.dev' : 'http://localhost:5173')}/#/login?token=${token}`)
  }
})

// --- ONEDRIVE ---
auth.get('/login/onedrive', async (c) => {
  const clientId = c.env.ONEDRIVE_CLIENT_ID
  if (!clientId || clientId.includes('REPLACE_WITH')) {
    throw new HTTPException(500, { message: 'OneDrive Cloud Storage Not Configured (Missing Client ID)' })
  }

  // 1. Capture session context if present
  let userId: string | null = null
  const authHeader = c.req.header('Authorization')
  const authQuery = c.req.query('auth_token')
  const token = authQuery || (authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null)

  if (token) {
    try {
      const payload = await jwtVerify(token, c.env.JWT_SECRET, 'HS256') as any
      userId = payload.sub
    } catch (e: any) {
      console.warn('[OAuth] Failed to verify existing token for linking:', e)
    }
  }

  const challenge = crypto.randomUUID()
  const targetOrigin = `${new URL(c.req.url).origin}/api/auth/callback/onedrive`
  const state = uint8ArrayToBase64(new TextEncoder().encode(JSON.stringify({ challenge, userId, targetOrigin })))
  
  await setSignedCookie(c, 'oauth_state', state, c.env.JWT_SECRET, {
    path: '/',
    secure: true,
    httpOnly: true,
    sameSite: 'None',
    maxAge: 300,
  })

  const proxyRedirectUri = `https://sso.gpnet.dev/api/proxy/callback/onedrive`
  const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(proxyRedirectUri)}&response_type=code&scope=files.readwrite%20offline_access%20User.Read&state=${state}`
  return c.redirect(url)
})

auth.get('/callback/onedrive', async (c) => {
  const code = c.req.query('code')
  const state = c.req.query('state')
  const savedState = (await getSignedCookie(c, c.env.JWT_SECRET, 'oauth_state') as any)

  if (!code || !state || state !== savedState) {
    throw new HTTPException(401, { message: 'Invalid OAuth state or missing code' })
  }

  // Parse state for session context
  let sessionUserId: string | null = null
  try {
    const decoded = JSON.parse(decodeBase64(state))
    sessionUserId = decoded.userId
  } catch (e: any) {
    console.warn('[OAuth] State decode failure:', e)
  }

  const authService = new AuthService(c.env)
  const tokenRes = (await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: c.env.ONEDRIVE_CLIENT_ID || '',
        client_secret: c.env.ONEDRIVE_CLIENT_SECRET || '',
        code: code || '',
        grant_type: 'authorization_code',
        redirect_uri: `https://sso.gpnet.dev/api/proxy/callback/onedrive`
      })
    }) as any)
  const tokenData = await tokenRes.json() as any
  
  const userRes = (await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    }) as any)
  const profile = await userRes.json() as any
  
  const socialProfile = {
    id: profile.id,
    email: profile.mail || profile.userPrincipalName,
    name: profile.displayName
  }

  const socialTokens = {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_in: tokenData.expires_in
  }

  if (sessionUserId) {
    // LINK MODE
    await authService.linkSocialAccount(sessionUserId, 'onedrive', socialProfile, socialTokens)
    await logAudit(c, 'userIdentities', profile.id, 'LINK', null, { provider: 'onedrive', userId: sessionUserId })
    return c.redirect(`${c.env.ENVIRONMENT === 'production' ? 'https://ledger.gpnet.dev' : 'http://localhost:5173'}/#/settings`)
  } else {
    // LOGIN MODE
    const userId = (await authService.findOrCreateSocialUser('onedrive', socialProfile, socialTokens) as any)
    const sessionId = (await createSessionTracker(c, userId) as any)
    const token = (await authService.generateToken(userId, sessionId) as any)
    return c.redirect(`${c.env.ENVIRONMENT === 'production' ? 'https://ledger.gpnet.dev' : 'http://localhost:5173'}/#/login?token=${token}`)
  }
})

// --- WEBAUTHN / PASSKEYS ---

// Compatibility Aliases for Frontend Submodule
auth.get('/webauthn/passkeys', async (c) => {
  const userId = c.get('userId')
  const db = getDb(c.env)
  const results = (await db.select({
      id: passkeys.id,
      name: passkeys.name,
      aaguid: passkeys.aaguid,
      createdAt: passkeys.createdAt,
      counter: passkeys.counter,
      lastUsedAt: passkeys.lastUsedAt
    }).from(passkeys).where(eq(passkeys.userId, userId)) as any)
  
  return c.json({
    success: true,
    passkeys: results // Frontend expects { passkeys: [...] }
  })
})

auth.put('/webauthn/passkeys/:id', zValidator('json', z.object({ name: z.string() })), async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const { name } = c.req.valid('json')
  const db = getDb(c.env)
  
  await db.update(passkeys).set({ name }).where(and(eq(passkeys.id, id), eq(passkeys.userId, userId)))
  return c.json({ success: true })
})

auth.delete('/webauthn/passkeys/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const db = getDb(c.env)
  
  await db.delete(passkeys).where(and(eq(passkeys.id, id), eq(passkeys.userId, userId)))
  return c.json({ success: true })
})

// Registration Aliases
auth.post('/webauthn/generate-registration', async (c) => {
  return await handleRegisterOptions(c)
})

auth.post('/webauthn/verify-registration', async (c) => {
  return await handleRegisterVerify(c)
})

// --- SHARED HANDLERS ---

// getRpID is now imported from auth-utils

async function handleRegisterOptions(c: any) {
  const userId = c.get('userId')
  const db = getDb(c.env)
  const userResult = (await db.select({ email: users.email, username: users.username }).from(users).where(eq(users.id, userId)).limit(1) as any)
  const user = userResult[0]
  
  if (!user) throw new HTTPException(404, { message: 'User not found' })

  const userPasskeys = (await db.select({ id: passkeys.id, transports: passkeys.transports }).from(passkeys).where(eq(passkeys.userId, userId)) as any)
  const vault = new VaultService(db, c.env.JWT_SECRET)
  const excludeCredentials = (await Promise.all((userPasskeys || []).map(async (pk: any) => {
    const rawId = await vault.getSecret(pk.id, 'CREDENTIAL_ID', 'webauthn')
    return rawId ? {
      id: rawId,
      type: 'public-key' as const,
      transports: pk.transports ? JSON.parse(pk.transports) : [],
    } : null
  })).then(res => res.filter((item): item is any => item !== null)) as any)
  
  const options = (await generateRegistrationOptions({
      rpName: 'LEDGER',
      rpID: getRpID(c),
      userID: new TextEncoder().encode(userId) as any,
      userName: user.username || user.email || 'unknown',
      attestationType: 'none',
      excludeCredentials,
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'required',
      },
    }) as any)

  await setSignedCookie(c, 'webauthn_challenge', options.challenge, c.env.JWT_SECRET, {
    path: '/',
    secure: true,
    httpOnly: true,
    sameSite: 'None',
    maxAge: 300
  })

  return c.json(options)
}

async function handleRegisterVerify(c: any) {
  const userId = c.get('userId')
  const body = (await c.req.json() as any)
  const expectedChallenge = (await getSignedCookie(c, c.env.JWT_SECRET, 'webauthn_challenge') as any)

  if (!expectedChallenge) {
    throw new HTTPException(401, { message: 'Invalid or expired WebAuthn challenge' })
  }

  const verification = (await verifyRegistrationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: c.env.WEB_URL || (c.req.header('origin') || (c.env.ENVIRONMENT === 'production' ? 'https://ledger.gpnet.dev' : 'http://localhost:5173')),
      expectedRPID: getRpID(c),
    }) as any)

  if (verification.verified && verification.registrationInfo) {
    const { 
      credential, 
      aaguid, 
      credentialDeviceType, 
      credentialBackedUp 
    } = verification.registrationInfo;
    const { publicKey, id: credentialID, counter } = credential;

    const db = getDb(c.env)
    const id = crypto.randomUUID()
    const metadata = getRequestMetadata(c)
    
    // 🏷️ Enrich with branding metadata
    const branding = getAAGUIDMetadata(aaguid);
    
    // 🔒 Extreme Security: Store raw secrets in Vault, Hash in DB
    const vault = new VaultService(db, c.env.JWT_SECRET);
    
    // Standardize ID as URL-safe base64 using Buffer
    const credIdB64 = uint8ArrayToBase64url(credentialID);
    const pubKeyB64 = uint8ArrayToBase64url(publicKey);
    
    // Index by hash for Zero-Knowledge lookups
    const credentialIdHash = (await hashIdentifier(credIdB64) as any);
    
    await vault.setSecret(id, 'CREDENTIAL_ID', 'webauthn', credIdB64);
    await vault.setSecret(id, 'PUBLIC_KEY', 'webauthn', pubKeyB64);

    await db.insert(passkeys).values({
      id,
      userId,
      name: body.name || `Passkey ${new Date().toLocaleDateString()}`,
      credentialIdHash,
      counter,
      deviceType: credentialDeviceType,
      backedUp: !!credentialBackedUp,
      attestationFormat: verification.registrationInfo.fmt || 'none',
      userVerified: true, // WebAuthn registration typically implies user verification
      aaguid: aaguid || null,
      providerName: branding.name,
      icon: branding.icon,
      transports: JSON.stringify(body.response.transports || []),
      
      // 🕒 Timestamps
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),

      // 🕵️ Registration Forensics (Immutable)
      registrationIp: metadata.ip,
      registrationIpV4: metadata.ipV4,
      registrationIpV6: metadata.ipV6,
      registrationLocation: metadata.location,
      registrationUa: metadata.userAgent,

      // 🕵️ Initial Usage Forensics
      lastUsedIp: metadata.ip,
      lastUsedIpV4: metadata.ipV4,
      lastUsedIpV6: metadata.ipV6,
      lastUsedLocation: metadata.location,
      lastUsedUa: metadata.userAgent
    })

    await logAudit(c, 'passkeys', id, 'REGISTER', null, { 
      name: body.name || branding.name,
      aaguid,
      provider: branding.name 
    })

    // Trigger Security Alert
    const userResult = (await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1) as any)
    const user = userResult[0]
    if (user?.email) {
      try {
        await new EmailService(c.env).sendSecurityAlertEmail(user.email, 'New Biometric Passkey Enrolled')
      } catch (e: any) {
        console.error('[Sentinel] Failed to send security alert:', e)
      }
    }

    return c.json({ verified: true, id })
  }

  return c.json({ verified: false }, 400)
}

auth.get('/passkeys', async (c) => {
  const userId = c.get('userId')
  const db = getDb(c.env)
  const results = (await db.select().from(passkeys).where(eq(passkeys.userId, userId)) as any)
  return c.json(results)
})

auth.post('/passkeys/register/options', async (c) => {
  return await handleRegisterOptions(c)
})

auth.post('/passkeys/register/verify', async (c) => {
  return await handleRegisterVerify(c)
})

auth.patch('/passkeys/:id', zValidator('json', z.object({ name: z.string().min(1) })), async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const { name } = c.req.valid('json')
  const db = getDb(c.env)
  
  await db.update(passkeys).set({ name }).where(and(eq(passkeys.id, id), eq(passkeys.userId, userId)))
  await logAudit(c, 'passkeys', id, 'RENAME', null, { name })
  return c.json({ success: true })
})

auth.delete('/passkeys/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const db = getDb(c.env)
  
  await db.delete(passkeys).where(and(eq(passkeys.id, id), eq(passkeys.userId, userId)))
  await logAudit(c, 'passkeys', id, 'DELETE')
  return c.json({ success: true })
})

// Redundant route removed


auth.post('/passkeys/login/options', async (c) => {
  const options = (await generateAuthenticationOptions({
      rpID: getRpID(c),
      allowCredentials: [], // Allow any credential for this RP
      userVerification: 'required',
    }) as any)

  await setSignedCookie(c, 'webauthn_challenge', options.challenge, c.env.JWT_SECRET, {
    path: '/',
    secure: true,
    httpOnly: true,
    sameSite: 'None',
    maxAge: 300,
  })

  return c.json({ success: true, data: options })
})

auth.post('/passkeys/login/verify', zValidator('json', z.object({
  assertion: z.any(),
  persistent: z.boolean().optional()
})), async (c) => {
  const { assertion, persistent } = c.req.valid('json')
  const expectedChallenge = (await getSignedCookie(c, c.env.JWT_SECRET, 'webauthn_challenge') as any)

  if (!expectedChallenge) {
    throw new HTTPException(401, { message: 'Invalid or expired WebAuthn challenge' })
  }

  const db = getDb(c.env)
  const vault = new VaultService(db, c.env.JWT_SECRET)
  
  // 🔒 Zero-Knowledge Lookup by hash
  const credentialIdHash = (await hashIdentifier(assertion.id) as any)
  const passkeyResult = (await db.select()
      .from(passkeys)
      .where(eq(passkeys.credentialIdHash, credentialIdHash))
      .limit(1) as any)
  
  const passkey = passkeyResult[0]
  if (!passkey) throw new HTTPException(401, { message: 'Passkey not recognized' })

  // 🔑 Retrieve secrets from Vault
  const publicKeyB64 = (await vault.getSecret(passkey.id, 'PUBLIC_KEY', 'webauthn') as any)
  const rawCredentialId = (await vault.getSecret(passkey.id, 'CREDENTIAL_ID', 'webauthn') as any)
  
  if (!publicKeyB64 || !rawCredentialId) {
    throw new HTTPException(500, { message: 'Security Integrity Error: Cryptographic materials missing from Vault' })
  }

  const verification = (await verifyAuthenticationResponse({
      response: assertion,
      expectedChallenge,
      expectedOrigin: c.req.header('origin') || (c.env.ENVIRONMENT === 'production' ? 'https://ledger.gpnet.dev' : 'http://localhost:5173'),
      expectedRPID: getRpID(c),
      requireUserVerification: true,
      credential: {
        id: rawCredentialId,
        publicKey: base64ToUint8Array(publicKeyB64) as any,
        counter: passkey.counter || 0,
        transports: passkey.transports ? JSON.parse(passkey.transports) : undefined
      }
    }) as any)

  if (!verification.verified) {
    throw new HTTPException(401, { message: 'Authentication failed' })
  }

  // 📈 Update counter and forensic metadata
  const metadata = getRequestMetadata(c)
  await db.update(passkeys).set({ 
    counter: verification.authenticationInfo.newCounter,
    lastUsedAt: new Date().toISOString(),
    lastUsedIp: metadata.ip,
    lastUsedIpV4: metadata.ipV4,
    lastUsedIpV6: metadata.ipV6,
    lastUsedLocation: metadata.location,
    lastUsedUa: metadata.userAgent
  }).where(eq(passkeys.id, passkey.id))

  const authService = new AuthService(c.env)
  const sessionId = (await createSessionTracker(c, passkey.userId, true, !!persistent) as any)
  const token = (await authService.generateToken(passkey.userId, sessionId) as any)
  
  await logAudit(c, 'users', passkey.userId, 'login', null, { 
    strategy: 'passkey',
    passkeyId: passkey.id,
    provider: passkey.providerName 
  })
  
  return c.json({ success: true, data: { token } })
})

auth.post('/passkeys/step-up-verify', zValidator('json', z.object({
  assertion: z.any()
})), async (c) => {
  const userId = c.get('userId')
  const sessionId = c.get('sessionId')
  const { assertion } = c.req.valid('json')
  const expectedChallenge = (await getSignedCookie(c, c.env.JWT_SECRET, 'webauthn_challenge') as any)

  if (!expectedChallenge) {
    throw new HTTPException(401, { message: 'Invalid or expired WebAuthn challenge' })
  }

  const db = getDb(c.env)
  const vault = new VaultService(db, c.env.JWT_SECRET)
  
  // 🔒 Zero-Knowledge Lookup by hash
  const credentialIdHash = (await hashIdentifier(assertion.id) as any)
  const passkeyResult = (await db.select()
      .from(passkeys)
      .where(and(
        eq(passkeys.userId, userId),
        eq(passkeys.credentialIdHash, credentialIdHash)
      ))
      .limit(1) as any)
  
  const passkey = passkeyResult[0]
  if (!passkey) throw new HTTPException(401, { message: 'Passkey not recognized for this user' })

  // 🔑 Retrieve secrets from Vault
  const publicKeyB64 = (await vault.getSecret(passkey.id, 'PUBLIC_KEY', 'webauthn') as any)
  const rawCredentialId = (await vault.getSecret(passkey.id, 'CREDENTIAL_ID', 'webauthn') as any)
  
  if (!publicKeyB64 || !rawCredentialId) {
    throw new HTTPException(500, { message: 'Security Integrity Error: Cryptographic materials missing from Vault' })
  }

  const verification = (await verifyAuthenticationResponse({
      response: assertion,
      expectedChallenge,
      expectedOrigin: c.req.header('origin') || (c.env.ENVIRONMENT === 'production' ? 'https://ledger.gpnet.dev' : 'http://localhost:5173'),
      expectedRPID: getRpID(c),
      requireUserVerification: true,
      credential: {
        id: rawCredentialId,
        publicKey: base64ToUint8Array(publicKeyB64) as any,
        counter: passkey.counter || 0,
        transports: passkey.transports ? JSON.parse(passkey.transports) : undefined
      }
    }) as any)

  if (!verification.verified) {
    throw new HTTPException(401, { message: 'Step-up authentication failed' })
  }

  // 📈 Update counters, timestamps and forensics
  const now = new Date().toISOString()
  const metadata = getRequestMetadata(c)
  
  const updates: any[] = [
    db.update(passkeys).set({ 
      counter: verification.authenticationInfo.newCounter,
      lastUsedAt: now,
      lastUsedIp: metadata.ip,
      lastUsedIpV4: metadata.ipV4,
      lastUsedIpV6: metadata.ipV6,
      lastUsedLocation: metadata.location,
      lastUsedUa: metadata.userAgent
    }).where(eq(passkeys.id, passkey.id))
  ]

  if (sessionId) {
    updates.push(
      db.update(sessions).set({ 
        passkeyVerifiedAt: now 
      }).where(eq(sessions.id, sessionId))
    )
  }

  await db.batch(updates as any)

  await logAudit(c, 'users', userId, 'step-up', null, { 
    strategy: 'passkey',
    passkeyId: passkey.id,
    sessionId 
  })
  
  return c.json({ success: true })
})

// --- PASSWORD LIFECYCLE (Stable) ---

auth.post('/password/reset-request', zValidator('json', z.object({ identifier: z.string() })), async (c) => {
  const { identifier } = c.req.valid('json')
  const authService = new AuthService(c.env)
  const token = (await authService.requestPasswordReset(identifier) as any)
  
  // In a real app, this would send an email. For now, we'll return it in dev or log it.
  console.log(`[AUTH] Password reset requested for ${identifier}. Token: ${token}`)
  return c.json({ success: true, message: 'Check console for reset token (Development Mode)' })
})

auth.post('/password/reset', zValidator('json', z.object({ token: z.string(), newPassword: z.string().min(8) })), async (c) => {
  const { token, newPassword } = c.req.valid('json')
  const authService = new AuthService(c.env)
  await authService.resetPassword(token, newPassword)
  return c.json({ success: true })
})

auth.post('/password/change', zValidator('json', z.object({ newPassword: z.string().min(8) })), async (c) => {
  const userId = c.get('userId')
  const { newPassword } = c.req.valid('json')
  const authService = new AuthService(c.env)
  await authService.changePassword(userId, newPassword)
  await logAudit(c, 'users', userId, 'PASSWORD_CHANGE', null, null)
  
  // Trigger Security Alert
  const db = getDb(c.env)
  const userResult = (await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1) as any)
  const user = userResult[0]
  if (user?.email) {
    try {
      await new EmailService(c.env).sendSecurityAlertEmail(user.email, 'Account Password Modified')
    } catch (e: any) {
      console.error('[Sentinel] Failed to send security alert:', e)
    }
  }

  return c.json({ success: true })
})

// --- ADMIN INVITATIONS ---
auth.post('/admin/invite', async (c) => {
  // Requires authenticated owner or secret (for first time setup)
  // For simplicity here, we'll allow it if a owner is logged in
  if (c.get('globalRole') !== 'owner') throw new HTTPException(403, { message: 'Forbidden' })
  
  const authService = new AuthService(c.env)
  const token = (await authService.createAdminInvite() as any)
  return c.json({ token, url: `${c.env.ENVIRONMENT === 'production' ? 'https://ledger.gpnet.dev' : 'http://localhost:3000'}/claim?token=${token}` })
})

auth.post('/admin/claim', zValidator('json', z.object({
  token: z.string(),
  username: z.string().min(3),
  password: z.string().min(8),
  email: z.string().email()
})), async (c) => {
  const { token, username, password, email } = c.req.valid('json')
  const authService = new AuthService(c.env)
  const userId = (await authService.consumeAdminInvite(token, username, password, email) as any)
  
  await logAudit(c, 'users', userId, 'claim_invite', null, { username, email })
  return c.json({ success: true, userId })
})

export default auth
