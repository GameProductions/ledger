import { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { Bindings, Variables } from '../types'
import { getDb } from '#/index'
import { sessions } from '#/schema'
import { eq } from 'drizzle-orm'

/**
 * Step-Up Authentication Middleware (Rule 4.2 Compliance)
 * Ensures the current session has been verified with a biometric passkey within a specific window.
 */
export const stepUpMiddleware = async (c: Context<{ Bindings: Bindings, Variables: Variables }>, next: Next) => {
  const sessionId = c.get('sessionId')
  
  if (!sessionId) {
    throw new HTTPException(401, { message: 'Session required for step-up verification' })
  }

  const db = getDb(c.env)
  const sessionResult = await db.select({ 
    passkeyVerifiedAt: sessions.passkeyVerifiedAt 
  }).from(sessions).where(eq(sessions.id, sessionId)).limit(1)

  const session = sessionResult[0]
  const MAX_STEP_UP_AGE_MS = 15 * 60 * 1000 // 15 Minutes window for high-risk actions

  if (!session || !session.passkeyVerifiedAt) {
    c.header('X-Step-Up', 'Required')
    throw new HTTPException(401, { message: 'Biometric Step-Up Verification Required' })
  }

  const verifiedAt = new Date(session.passkeyVerifiedAt).getTime()
  const now = Date.now()

  if (now - verifiedAt > MAX_STEP_UP_AGE_MS) {
    c.header('X-Step-Up', 'Required')
    throw new HTTPException(401, { message: 'Step-Up Verification Expired' })
  }

  await next()
}
