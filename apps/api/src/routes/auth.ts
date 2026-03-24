import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { AuthService } from '../services/auth.service'
import { Bindings, Variables } from '../types'
import { logAudit } from '../utils'

const auth = new Hono<{ Bindings: Bindings, Variables: Variables }>()

// Pass loginAudit as a parameter to handlers if needed, or handle it here
// Since logAudit is in index.ts, we might need to pass it or move it to a utility

auth.post('/login', zValidator('json', z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  totpCode: z.string().optional()
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
  const { username, password, totpCode } = c.req.valid('json')
  const authService = new AuthService(c.env)
  
  try {
    const user = await authService.validateCredentials(username, password)
    const twoFactor = await authService.verify2FA(user, totpCode)
    
    if (twoFactor.requires2FA) {
      return c.json({ requires2FA: true }, 202)
    }

    const token = await authService.generateToken(user.id)
    
    await logAudit(c, 'users', user.id, 'login', null, { strategy: 'password' })
    return c.json({ token, user: { id: user.id, email: user.email, displayName: user.display_name } })
  } catch (e: any) {
    return c.json({ error: e.message || 'Unauthorized' }, e.status || 401)
  }
})

// --- TOTP SETUP ---
auth.post('/totp/setup', async (c) => {
  const userId = c.get('userId')
  const authService = new AuthService(c.env)
  const secret = await authService.setupTOTP(userId)
  const otpauth = `otpauth://totp/LEDGER:${userId}?secret=${secret}&issuer=LEDGER`
  return c.json({ secret, qrUrl: otpauth })
})

auth.post('/totp/verify', zValidator('json', z.object({ code: z.string() })), async (c) => {
  const userId = c.get('userId')
  const { code } = c.req.valid('json')
  const authService = new AuthService(c.env)
  const success = await authService.verifyAndEnableTOTP(userId, code)
  return c.json({ success }, success ? 200 : 400)
})

auth.get('/login/discord', (c) => {
  const clientId = c.env.DISCORD_CLIENT_ID || '123'
  const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent('https://api.gpnet.dev/ledger/auth/callback/discord')}&response_type=code&scope=identify%20email`
  return c.redirect(url)
})

auth.get('/callback/discord', async (c) => {
  const authService = new AuthService(c.env)
  // exchange logic...
  const discordProfile = { id: 'd-123', email: 'user@example.com', avatar: 'https://...' }
  const userId = await authService.findOrCreateDiscordUser(discordProfile)
  const token = await authService.generateToken(userId)
  
  await logAudit(c, 'users', userId, 'login', null, { strategy: 'discord' })
  return c.redirect(`${c.env.ENVIRONMENT === 'production' ? 'https://ledger.gpnet.dev' : 'http://localhost:3000'}/login?token=${token}`)
})

// --- WEBAUTHN / PASSKEYS ---
auth.post('/passkeys/register-options', async (c) => {
  const challenge = crypto.randomUUID()
  return c.json({ challenge, user: { id: c.get('userId') || 'new-user', name: 'User' } })
})

auth.post('/passkeys/register-verify', async (c) => {
  const { attestation, challenge, userId } = await c.req.json()
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO passkeys (id, user_id, public_key, credential_id) VALUES (?, ?, ?, ?)')
    .bind(id, userId, attestation.publicKey, attestation.id).run()
  return c.json({ success: true })
})

auth.post('/passkeys/login-options', async (c) => {
  const challenge = crypto.randomUUID()
  return c.json({ challenge })
})

auth.post('/passkeys/login-verify', async (c) => {
  const { assertion, challenge } = await c.req.json()
  const credId = assertion.id
  
  const passkey: any = await c.env.DB.prepare('SELECT * FROM passkeys WHERE credential_id = ?').bind(credId).first()
  if (!passkey) throw new HTTPException(401, { message: 'Passkey not found' })

  const authService = new AuthService(c.env)
  const token = await authService.generateToken(passkey.user_id)
  await logAudit(c, 'users', passkey.user_id, 'login', null, { strategy: 'passkey' })
  return c.json({ token })
})

// --- ADMIN INVITATIONS ---
auth.post('/admin/invite', async (c) => {
  // Requires authenticated super_admin or secret (for first time setup)
  // For simplicity here, we'll allow it if a super_admin is logged in
  if (c.get('globalRole') !== 'super_admin') throw new HTTPException(403, { message: 'Forbidden' })
  
  const authService = new AuthService(c.env)
  const token = await authService.createAdminInvite()
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
  const userId = await authService.consumeAdminInvite(token, username, password, email)
  
  await logAudit(c, 'users', userId, 'claim_invite', null, { username, email })
  return c.json({ success: true, userId })
})

export { auth }
