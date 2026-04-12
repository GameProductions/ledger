import { HTTPException } from 'hono/http-exception'
import { verify } from 'hono/jwt'
import { Context, Next } from 'hono'
import { Bindings, Variables } from '../types'
import { getDb } from '../db'
import { personalAccessTokens, users, households, userHouseholds } from '../db/schema'
import { eq, and, sql } from 'drizzle-orm'

let patAuthQuery: any;
let verifyUserQuery: any;
let verifyHouseholdQuery: any;
let verifyMembershipQuery: any;

export const authMiddleware = async (c: Context<{ Bindings: Bindings, Variables: Variables }>, next: Next) => {
  try {
    const path = c.req.path
    let token = c.req.header('Authorization')?.replace('Bearer ', '')
    if (!token) {
      token = c.req.query('auth_token')
      
      // Security: Only allow query tokens for safe, explicit document/export formats
      if (token) {
        const format = c.req.query('format')
        const allowedFormats = ['pdf', 'csv', 'json', 'xlsx']
        if (!format || !allowedFormats.includes(format)) {
          console.warn(`[Auth Violation] Blocked attempts to use query-token on non-export path: ${path}`)
          throw new HTTPException(403, { message: 'Tokens in query disallowed for this resource type' })
        }
      }
    }
    
    if (!token) throw new HTTPException(401, { message: 'Missing Authorization Token' })
    const jwtSecret = c.env.JWT_SECRET
    if (!jwtSecret) throw new HTTPException(500, { message: 'JWT_SECRET is not defined' })
    
    const db = getDb(c.env)

    // 1. Check for Personal Access Tokens (PATs) first
    if (token.startsWith('ledger_')) {
      if (!patAuthQuery) {
        patAuthQuery = db.select({ householdId: personalAccessTokens.householdId })
          .from(personalAccessTokens)
          .where(eq(personalAccessTokens.id, sql.placeholder('tokenHash')))
          .limit(1)
          .prepare()
      }
      
      const { hashToken } = require('../utils')
      const tokenHash = await hashToken(token)
      const patResult = await patAuthQuery.execute({ tokenHash })
      
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
    if (!verifyUserQuery) {
      verifyUserQuery = db.select({ id: users.id, globalRole: users.globalRole, status: users.status })
        .from(users)
        .where(eq(users.id, sql.placeholder('userId')))
        .limit(1)
        .prepare()
    }
    const userResult = await verifyUserQuery.execute({ userId: String(payload.sub) })
      
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
    if (!verifyHouseholdQuery) {
      verifyHouseholdQuery = db.select({ id: households.id })
        .from(households)
        .where(eq(households.id, sql.placeholder('householdId')))
        .limit(1)
        .prepare()
    }
    const hhResult = await verifyHouseholdQuery.execute({ householdId: String(activeHouseholdId) })

    if (!hhResult[0]) {
      if (globalRole === 'super_admin') {
        activeHouseholdId = 'ledger-main-001'
        console.info(`[Forensic Audit] Super Admin ${userId} bypassing membership for virtual root access.`)
      } else {
        throw new HTTPException(401, { message: 'Invalid or missing Household' })
      }
    }

    // If NOT super_admin, verify User belongs to this household
    if (globalRole !== 'super_admin') {
      if (!verifyMembershipQuery) {
        verifyMembershipQuery = db.select({ role: userHouseholds.role })
          .from(userHouseholds)
          .where(and(eq(userHouseholds.userId, sql.placeholder('userId')), eq(userHouseholds.householdId, sql.placeholder('householdId'))))
          .limit(1)
          .prepare()
      }
      const uhResult = await verifyMembershipQuery.execute({ userId: String(userId), householdId: String(activeHouseholdId) })
      
      if (!uhResult[0]) {
        console.warn(`[Auth] Access Denied: User ${userId} is not a member of Household ${activeHouseholdId}`)
        throw new HTTPException(403, { message: 'Access Denied to this Household' })
      }
    } else if (globalRole === 'super_admin' && activeHouseholdId !== payload.householdId) {
       // Forensic Bypass Logging
       console.warn(`[Forensic Bypass] Super Admin ${userId} accessing Household ${activeHouseholdId} (Source: ${payload.householdId})`)
    }
    
    c.set('userId', userId)
    c.set('globalRole', globalRole as string)
    c.set('householdId', String(activeHouseholdId))
    if (payload.impersonatorId) c.set('impersonatorId', payload.impersonatorId)
    
    await next()
  } catch (e: any) {
    console.error('[Auth Error]', e.message)
    throw new HTTPException(e.status || 401, { message: e.message || 'Unauthorized' })
  }
}
