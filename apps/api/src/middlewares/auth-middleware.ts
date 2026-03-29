import { HTTPException } from 'hono/http-exception'
import { verify } from 'hono/jwt'
import { Context, Next } from 'hono'
import { Bindings, Variables } from '../types'

export const authMiddleware = async (c: Context<{ Bindings: Bindings, Variables: Variables }>, next: Next) => {
  try {
    let token = c.req.header('Authorization')?.replace('Bearer ', '')
    if (!token) {
      token = c.req.query('auth_token')
    }
    
    if (!token) throw new HTTPException(401, { message: 'Missing Authorization Token' })
    const jwtSecret = c.env.JWT_SECRET
    if (!jwtSecret) throw new HTTPException(500, { message: 'JWT_SECRET is not defined' })
    
    // 1. Check for Personal Access Tokens (PATs) first
    if (token.startsWith('ledger_')) {
      const { results } = await c.env.DB.prepare(
        'SELECT household_id FROM personal_access_tokens WHERE id = ?'
      ).bind(token).all()
      
      if (results.length > 0) {
        c.set('householdId', String(results[0].household_id))
        c.set('userId', 'pat-user') 
        c.set('globalRole', 'user')
        await next()
        return
      }
    }

    // 2. Standard JWT Auth
    const payload = await verify(token, jwtSecret, 'HS256') as any
    const householdHeader = c.req.header('x-household-id')

    // Verify user exists and is active
    const user = await c.env.DB.prepare(
      'SELECT id, global_role, status FROM users WHERE id = ?'
    ).bind(payload.sub).first() as any

    if (!user) {
      console.warn(`[Auth] User not found: ${payload.sub}`)
      throw new HTTPException(401, { message: 'User Not Found' })
    }
    
    if (user.status === 'suspended') {
      console.warn(`[Auth] Account suspended: ${userId}`)
      throw new HTTPException(403, { message: 'Account Suspended' })
    }
    
    const userId = user.id
    const globalRole = user.global_role
    let activeHouseholdId = householdHeader || payload.householdId

    // Heartbeat (Non-blocking)
    c.executionCtx.waitUntil(
      c.env.DB.prepare('UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE id = ?')
        .bind(userId).run()
    )

    // 3. Household Context Logic
    // Skip strict household check for User-level routes (e.g., profile, passkeys, internal auth)
    const isUserLevelRoute = path.startsWith('/api/user/') || 
                            path.startsWith('/auth/passkeys/') || 
                            path.startsWith('/auth/password/') ||
                            path === '/api/user' ||
                            path === '/auth/totp/setup' ||
                            path === '/auth/totp/verify'

    if (isUserLevelRoute) {
      c.set('userId', userId)
      c.set('globalRole', globalRole)
      // Attempt to set householdId if present, but don't fail if not
      if (activeHouseholdId) c.set('householdId', String(activeHouseholdId))
      await next()
      return
    }

    // Verify Household exists to prevent Foreign Key errors in logAudit
    const householdExists = await c.env.DB.prepare(
      'SELECT id FROM households WHERE id = ?'
    ).bind(activeHouseholdId).first()

    if (!householdExists) {
      if (globalRole === 'super_admin') {
        activeHouseholdId = 'ledger-main-001'
      } else {
        throw new HTTPException(401, { message: 'Invalid or missing Household' })
      }
    }

    // If NOT super_admin, verify User belongs to this household
    if (globalRole !== 'super_admin') {
      const dbRes = await c.env.DB.prepare(
        'SELECT role FROM user_households WHERE user_id = ? AND household_id = ?'
      ).bind(userId, activeHouseholdId).first()
      
      if (!dbRes) {
        console.warn(`[Auth] Access Denied: User ${userId} is not a member of Household ${activeHouseholdId}`)
        throw new HTTPException(403, { message: 'Access Denied to this Household' })
      }
    }
    
    c.set('userId', userId)
    c.set('globalRole', globalRole)
    c.set('householdId', String(activeHouseholdId))
    
    await next()
  } catch (e: any) {
    console.error('[Auth Error]', e.message)
    return c.json({ error: e.message || 'Unauthorized' }, e.status || 401)
  }
}
