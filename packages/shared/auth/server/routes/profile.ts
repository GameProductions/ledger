import { Hono } from 'hono'
import { AuthConfig, AuthEnv } from '../../types'
import { getDb } from '#/index'
import { users, userIdentities } from '#/schema'
import { eq, and, sql, ne } from 'drizzle-orm'

export function createProfileRoutes(config: AuthConfig) {
  const router = new Hono<AuthEnv>()

  /**
   * GET /api/auth/profile
   * Returns the authenticated user's profile.
   */
  router.get('/', async (c) => {
    try {
      const userId = c.get('user_id')
      const db = getDb(c.env)
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1).then(r => r[0])
      if (!user) return c.json({ success: false, error: 'User not found.' }, 404)

      return c.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          globalRole: user.globalRole,
          status: user.status,
          hasPassword: Boolean(user.passwordHash),
          createdAt: user.createdAt,
        },
      })
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 500)
    }
  })

  /**
   * PUT /api/auth/profile
   * Updates the authenticated user's profile fields.
   */
  router.put('/', async (c) => {
    try {
      const userId = c.get('user_id')
      const { displayName, email, username, avatarUrl } = await c.req.json()
      const db = getDb(c.env)

      let cleanUsername: string | undefined = undefined
      if (username !== undefined) {
        cleanUsername = (username || '').trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, 32)
        if (!cleanUsername) {
          return c.json({ success: false, error: 'Username must contain at least one valid alphanumeric character.' }, 400)
        }
        const existingUser = await db.select().from(users)
          .where(and(sql`lower(${users.username}) = lower(${cleanUsername})`, ne(users.id, userId)))
          .limit(1).then(r => r[0])
        if (existingUser) {
          return c.json({ success: false, error: 'This username is already taken by another account.' }, 409)
        }
      }

      await (db.update(users) as any).set({
        displayName: displayName || undefined,
        email: email || undefined,
        username: cleanUsername || undefined,
        avatarUrl: avatarUrl || undefined,
        updatedAt: new Date().toISOString(),
      }).where(eq(users.id, userId))

      return c.json({ success: true, username: cleanUsername })
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 500)
    }
  })

  /**
   * PATCH /api/auth/profile
   * Granularly patches user profile fields with 409 conflict detection.
   */
  router.patch('/', async (c) => {
    try {
      const userId = c.get('user_id')
      const { displayName, email, username, avatarUrl } = await c.req.json()
      const db = getDb(c.env)

      let cleanUsername: string | undefined = undefined
      if (username !== undefined) {
        cleanUsername = (username || '').trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, 32)
        if (!cleanUsername) {
          return c.json({ success: false, error: 'Username must contain at least one valid alphanumeric character.' }, 400)
        }
        const existingUser = await db.select().from(users)
          .where(and(sql`lower(${users.username}) = lower(${cleanUsername})`, ne(users.id, userId)))
          .limit(1).then(r => r[0])
        if (existingUser) {
          return c.json({ success: false, error: 'This username is already taken by another account.' }, 409)
        }
      }

      await (db.update(users) as any).set({
        displayName: displayName !== undefined ? displayName : undefined,
        email: email !== undefined ? email : undefined,
        username: cleanUsername !== undefined ? cleanUsername : undefined,
        avatarUrl: avatarUrl !== undefined ? avatarUrl : undefined,
        updatedAt: new Date().toISOString(),
      }).where(eq(users.id, userId))

      return c.json({ success: true, username: cleanUsername })
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 500)
    }
  })

  /**
   * GET /api/auth/profile/identities
   * Returns all OAuth provider identities linked to the authenticated user,
   * including provider avatar, display name, username, email, and link timestamp.
   */
  router.get('/identities', async (c) => {
    try {
      const userId = c.get('user_id')
      const db = getDb(c.env)
      const identities = await db.select().from(userIdentities).where(eq(userIdentities.userId, userId))
      return c.json({ success: true, identities })
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 500)
    }
  })

  /**
   * DELETE /api/auth/profile/identities/:provider
   * Unlinks an OAuth provider identity from the authenticated user.
   * Guards against locking the user out — requires at least one remaining
   * sign-in method (another identity or a password hash) before allowing unlink.
   */
  router.delete('/identities/:provider', async (c) => {
    try {
      const userId = c.get('user_id')
      const provider = c.req.param('provider')
      const db = getDb(c.env)

      const [allIdentities, user] = await Promise.all([
        db.select().from(userIdentities).where(eq(userIdentities.userId, userId)),
        db.select().from(users).where(eq(users.id, userId)).limit(1).then(r => r[0]),
      ])

      const remainingAfterUnlink = allIdentities.filter(i => i.provider !== provider)
      if (remainingAfterUnlink.length === 0 && !user?.passwordHash) {
        return c.json({
          success: false,
          error: 'Cannot unlink your only sign-in method. Set a password first or link another provider.',
        }, 400)
      }

      await db.delete(userIdentities).where(
        and(eq(userIdentities.userId, userId), eq(userIdentities.provider, provider))
      )

      return c.json({ success: true })
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 500)
    }
  })

  return router
}
