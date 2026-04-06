import { HTTPException } from 'hono/http-exception'
import { verify } from 'hono/jwt'
import { Context, Next } from 'hono'
import { Bindings, Variables } from '../types'
import { getDb } from '../db'
import { personalAccessTokens, users, households, userHouseholds } from '../db/schema'
import { eq, and } from 'drizzle-orm'

export const authMiddleware = async (c: Context<{ Bindings: Bindings, Variables: Variables }>, next: Next) => {
  try {
    const path = c.req.path
    let token = c.req.header('Authorization')?.replace('Bearer ', '')
    if (!token) {
      token = c.req.query('auth_token')
    }
    
    if (!token) throw new HTTPException(401, { message: 'Missing Authorization Token' })
    const jwtSecret = c.env.JWT_SECRET
    if (!jwtSecret) throw new HTTPException(500, { message: 'JWT_SECRET is not defined' })
    
    const db = getDb(c.env)

    // 1. Check for Personal Access Tokens (PATs) first
    if (token.startsWith('ledger_')) {
      const patResult = await db.select({ householdId: personalAccessTokens.householdId })
        .from(personalAccessTokens)
        .where(eq(personalAccessTokens.id, token))
        .limit(1)
      
      if (patResult.length > 0) {
        c.set('householdId', String(patResult[0].householdId))
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
    const userResult = await db.select({ id: users.id, globalRole: users.globalRole, status: users.status })
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1)
      
    const user = userResult[0]

    if (!user) {
      console.warn(`[Auth] User not found: ${payload.sub}`)
      throw new HTTPException(401, { message: 'User Not Found' })
    }
    
    if (user.status === 'suspended') {
      console.warn(`[Auth] Account suspended: ${user.id}`)
      throw new HTTPException(403, { message: 'Account Suspended' })
    }
    
    const userId = user.id
    const globalRole = user.globalRole
    let activeHouseholdId = householdHeader || payload.householdId

    // Heartbeat (Non-blocking)
    c.executionCtx.waitUntil(
      db.update(users).set({ lastActiveAt: new Date().toISOString() }).where(eq(users.id, userId)).execute()
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
      c.set('globalRole', globalRole as string)
      // Attempt to set householdId if present, but don't fail if not
      if (activeHouseholdId) c.set('householdId', String(activeHouseholdId))
      await next()
      return
    }

    // Verify Household exists to prevent Foreign Key errors in logAudit
    const hhResult = await db.select({ id: households.id }).from(households).where(eq(households.id, activeHouseholdId)).limit(1)

    if (!hhResult[0]) {
      if (globalRole === 'super_admin') {
        activeHouseholdId = 'ledger-main-001'
      } else {
        throw new HTTPException(401, { message: 'Invalid or missing Household' })
      }
    }

    // If NOT super_admin, verify User belongs to this household
    if (globalRole !== 'super_admin') {
      const uhResult = await db.select({ role: userHouseholds.role })
        .from(userHouseholds)
        .where(and(eq(userHouseholds.userId, userId), eq(userHouseholds.householdId, activeHouseholdId)))
        .limit(1)
      
      if (!uhResult[0]) {
        console.warn(`[Auth] Access Denied: User ${userId} is not a member of Household ${activeHouseholdId}`)
        throw new HTTPException(403, { message: 'Access Denied to this Household' })
      }
    }
    
    c.set('userId', userId)
    c.set('globalRole', globalRole as string)
    c.set('householdId', String(activeHouseholdId))
    if (payload.impersonatorId) c.set('impersonatorId', payload.impersonatorId)
    
    await next()
  } catch (e: any) {
    console.error('[Auth Error]', e.message)
    return c.json({ error: e.message || 'Unauthorized' }, e.status || 401)
  }
}
