import { Hono } from 'hono'
import { AuthConfig } from '../../types'
import { getDb } from '#/index'
import { sessions, users } from '#/schema'
import { eq, and, ne, gt } from 'drizzle-orm'
import { getCookie } from 'hono/cookie'

export function createSessionRoutes(config: AuthConfig) {
  const router = new Hono<any>()

  router.get('/', async (c) => {
    try {
      let userId = (c.get as any)('user_id') as string | undefined
      const db = getDb(c.env)

      if (!userId) {
        const authHeader = c.req.header('Authorization') || ''
        const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : ''
        const sessionId = bearerToken || getCookie(c, 'FOUNDATION_SESSION')

        if (sessionId) {
          const sess = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1).then(r => r[0])
          if (sess && new Date(sess.expiresAt) > new Date()) {
            userId = sess.userId
          }
        }
      }

      c.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
      c.header('Pragma', 'no-cache')
      c.header('Expires', '0')

      if (!userId) return c.json({ authenticated: false }, 200)

      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1).then((r: any[]) => r[0])
      if (!user) return c.json({ authenticated: false }, 200)

      // If user is a child sub-account, fetch parent account info
      let parentUser = null
      if (user.parentUserId) {
        const p = await db.select().from(users).where(eq(users.id, user.parentUserId)).limit(1).then((r: any[]) => r[0])
        if (p) {
          parentUser = {
            id: p.id,
            email: p.email,
            username: p.username,
            displayName: p.displayName,
            avatarUrl: p.avatarUrl || p.avatar,
            globalRole: p.globalRole,
          }
        }
      }

      // Fetch child sub-accounts linked under this user
      const rawChildren = (users as any).parentUserId 
        ? await db.select().from(users).where(eq((users as any).parentUserId, user.id))
        : []
      const linkedChildren = (rawChildren || []).map((ch: any) => ({
        id: ch.id,
        email: ch.email,
        username: ch.username,
        displayName: ch.displayName,
        avatarUrl: ch.avatarUrl || ch.avatar,
        globalRole: ch.globalRole,
        status: ch.status,
        linkedAt: ch.linkedAt,
        linkType: ch.linkType || 'child'
      }))

      return c.json({
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl || user.avatar,
          globalRole: user.globalRole,
          status: user.status,
          hasPassword: Boolean(user.passwordHash),
          parentUserId: user.parentUserId,
          linkedAt: user.linkedAt,
          linkType: user.linkType,
          parentUser,
          linkedAccounts: linkedChildren,
          linkedAccountsCount: linkedChildren.length,
          createdAt: user.createdAt,
        },
      })
    } catch (err: any) {
      c.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
      return c.json({ authenticated: false, error: err.message }, 200)
    }
  })

  // GET /api/auth/session/linked-accounts
  router.get('/linked-accounts', async (c) => {
    try {
      const userId = (c.get as any)('user_id') as string | undefined
      if (!userId) return c.json({ success: false, error: 'Unauthorized' }, 401)
      const db = getDb(c.env)

      const currentUser = await db.select().from(users).where(eq(users.id, userId)).limit(1).then((r: any[]) => r[0])
      if (!currentUser) return c.json({ success: false, error: 'User not found' }, 404)

      let parentAccount = null
      if (currentUser.parentUserId) {
        const p = await db.select().from(users).where(eq(users.id, currentUser.parentUserId)).limit(1).then((r: any[]) => r[0])
        if (p) {
          parentAccount = {
            id: p.id,
            email: p.email,
            username: p.username,
            displayName: p.displayName,
            avatarUrl: p.avatarUrl || p.avatar,
            globalRole: p.globalRole,
          }
        }
      }

      const rawChildren = (users as any).parentUserId 
        ? await db.select().from(users).where(eq((users as any).parentUserId, currentUser.id))
        : []
      const subAccounts = (rawChildren || []).map((ch: any) => ({
        id: ch.id,
        email: ch.email,
        username: ch.username,
        displayName: ch.displayName,
        avatarUrl: ch.avatarUrl || ch.avatar,
        globalRole: ch.globalRole,
        status: ch.status,
        linkedAt: ch.linkedAt,
        linkType: ch.linkType || 'child'
      }))

      return c.json({
        success: true,
        parentAccount,
        subAccounts,
        totalLinked: subAccounts.length,
        isChildAccount: Boolean(currentUser.parentUserId),
      })
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 500)
    }
  })

  router.get('/list', async (c) => {
    try {
      const userId = (c.get as any)('user_id') as string
      const currentSessionId = (c.get as any)('session_id') as string | undefined
      const db = getDb(c.env)

      const list = await db.select().from(sessions)
        .where(and(eq(sessions.userId, userId), gt(sessions.expiresAt, new Date().toISOString())))
        .orderBy(sessions.createdAt)

      return c.json({
        success: true,
        sessions: list.map((s: any) => ({
          ...s,
          isCurrent: s.id === currentSessionId,
        })),
      })
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 500)
    }
  })

  router.delete('/:id', async (c) => {
    try {
      const userId = (c.get as any)('user_id') as string
      const sessionId = c.req.param('id')
      const db = getDb(c.env)
      await db.delete(sessions).where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)))
      return c.json({ success: true })
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 500)
    }
  })

  router.delete('/', async (c) => {
    try {
      const userId = (c.get as any)('user_id') as string
      const currentSessionId = (c.get as any)('session_id') as string
      const db = getDb(c.env)
      await db.delete(sessions).where(and(eq(sessions.userId, userId), ne(sessions.id, currentSessionId)))
      return c.json({ success: true })
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 500)
    }
  })

  return router
}
