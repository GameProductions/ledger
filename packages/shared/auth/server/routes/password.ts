import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import { AuthConfig, AuthEnv } from '../../types'
import { AuthService } from '../services/auth.service'

export function createPasswordRoutes(config: AuthConfig) {
  const router = new Hono<AuthEnv>()

  router.post('/change', async (c) => {
    try {
      let userId = (c.get as any)('user_id') as string | undefined
      if (!userId) {
        const authHeader = c.req.header('Authorization') || ''
        const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : ''
        const sessionId = bearerToken || c.req.query('session_token') || getCookie(c, 'FOUNDATION_SESSION')
        if (sessionId) {
          const auth = new AuthService(c.env, config)
          const session = await auth.getSession(sessionId)
          if (session && session.user) {
            userId = session.user.id
          }
        }
      }
      if (!userId) return c.json({ success: false, error: 'Unauthorized.' }, 401)

      const { currentPassword, newPassword } = await c.req.json()
      if (!newPassword || newPassword.length < 8) {
        return c.json({ success: false, error: 'Password must be at least 8 characters.' }, 400)
      }

      const auth = new AuthService(c.env, config)
      const result = await auth.changePassword(userId, currentPassword || '', newPassword)
      if (!result.success) return c.json({ success: false, error: result.error }, 400)

      return c.json({ success: true })
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 500)
    }
  })

  router.post('/reset-request', async (c) => {
    try {
      const { email } = await c.req.json()
      if (!email) return c.json({ success: false, error: 'Email is required.' }, 400)

      const auth = new AuthService(c.env, config)
      const result = await auth.requestPasswordReset(email)

      return c.json({ success: true, message: 'If an account with that email exists, a reset link has been sent.' })
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 500)
    }
  })

  router.post('/reset', async (c) => {
    try {
      const { token, newPassword } = await c.req.json()
      if (!token || !newPassword || newPassword.length < 8) {
        return c.json({ success: false, error: 'Invalid token or weak password.' }, 400)
      }

      const auth = new AuthService(c.env, config)
      const result = await auth.resetPassword(token, newPassword)
      if (!result.success) return c.json({ success: false, error: result.error }, 400)

      return c.json({ success: true })
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 500)
    }
  })

  return router
}
