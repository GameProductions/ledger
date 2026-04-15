import { HTTPException } from 'hono/http-exception'
import { verify } from 'hono/jwt'
import { Context, Next } from 'hono'
import { Bindings, Variables } from '../types'
import { getDb } from '../db'
import { personalAccessTokens, users, households, userHouseholds } from '../db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { hashToken, logAudit } from '../utils'

let patAuthQuery: any;
let verifyUserQuery: any;
let verifyHouseholdQuery: any;
let verifyMembershipQuery: any;

export const authMiddleware = async (c: Context<{ Bindings: Bindings, Variables: Variables }>, next: Next) => {
  try {
    const path = c.req.path
    if (path === '/api/config') return await next()
    let token = c.req.header('Authorization')?.replace('Bearer ', '')
    if (!token) throw new HTTPException(401, { message: 'Missing Authorization Token' })
    const jwtSecret = c.env.JWT_SECRET
    if (!jwtSecret) {
      console.error('[Auth Critical] JWT_SECRET is not defined in environment.')
      throw new HTTPException(500, { message: 'JWT_SECRET is not defined' })
    }
    
    const db = getDb(c.env)

    // 1. Check for Personal Access Tokens (PATs) first
    if (token.startsWith('ledger_')) {
      if (!patAuthQuery) {
        patAuthQuery = db.select({ householdId: personalAccessTokens.householdId, scopes: personalAccessTokens.scopes })
          .from(personalAccessTokens)
          .where(eq(personalAccessTokens.id, sql.placeholder('tokenHash')))
          .limit(1)
          .prepare()
      }
      
      const tokenHash = await hashToken(token)
      const patResult = await patAuthQuery.execute({ tokenHash })
      
      if (patResult.length > 0) {
        c.set('householdId', String(patResult[0].householdId))
        c.set('userId', 'pat-user') 
        c.set('user', { id: 'pat-user', globalRole: 'user', status: 'active' })
        c.set('globalRole', 'user')
        c.set('tokenScopes', (patResult[0].scopes as string) || 'READ,WRITE')
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
    const isUserLevelRoute = path.startsWith('/api/user') || 
                            path.startsWith('/auth/passkeys/') || 
                            path.startsWith('/auth/password/') ||
                            path === '/api/auth/verify' ||
                            path === '/auth/verify' ||
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
        const auditReason = c.req.header('x-audit-reason')
        if (!auditReason) {
          throw new HTTPException(403, { message: 'Super Admin access requires x-audit-reason header' })
        }
        activeHouseholdId = 'ledger-main-001'
        console.info(`[Forensic Audit] Super Admin ${userId} bypassing membership for virtual root access. Reason: ${auditReason}`)
        c.executionCtx.waitUntil(logAudit(c, 'households', activeHouseholdId, 'FORENSIC_BYPASS_ROOT', null, { reason: auditReason }))
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
       const auditReason = c.req.header('x-audit-reason')
       if (!auditReason) {
         throw new HTTPException(403, { message: 'Super Admin access requires x-audit-reason header' })
       }
       console.warn(`[Forensic Bypass] Super Admin ${userId} accessing Household ${activeHouseholdId} (Source: ${payload.householdId}). Reason: ${auditReason}`)
       c.executionCtx.waitUntil(logAudit(c, 'households', String(activeHouseholdId), 'FORENSIC_BYPASS_ACCESS', null, { reason: auditReason, sourceHouseholdId: payload.householdId }))
    }
    
    c.set('userId', userId)
    c.set('user', user)
    c.set('globalRole', globalRole as string)
    c.set('householdId', String(activeHouseholdId))
    if (payload.impersonatorId) c.set('impersonatorId', payload.impersonatorId)
    
    await next()
  } catch (e: any) {
    console.error('[Auth Error]', e.message)
    throw new HTTPException(e.status || 401, { message: e.message || 'Unauthorized' })
  }
}
