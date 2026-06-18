import { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { Bindings, Variables } from '../types'
import { getDb } from '#/index'
import { sessions, passkeys } from '#/schema'
import { eq } from 'drizzle-orm'

/**
 * Step-Up Authentication Middleware (Rule 4.2 Compliance)
 * Ensures the current session has been verified with a biometric passkey within a specific window.
 *
 * Bypass conditions:
 * - Admin WebAuthn management routes (to allow passkey registration itself)
 * - User has no passkeys enrolled (can't require verification of something that doesn't exist)
 */
export const stepUpMiddleware = async (c: Context<{ Bindings: Bindings, Variables: Variables }>, next: Next) => {
  const path = c.req.path
  if (path.startsWith('/api/admin/webauthn')) {
    return await next()
  }

  const sessionId = c.get('sessionId')
  const userId = c.get('userId')

  if (!sessionId || !userId) {
    throw new HTTPException(401, { message: 'Session required for step-up verification' })
  }

  const db = getDb(c.env)

  // Check if the user has any passkeys enrolled.
  // If they don't, we cannot demand biometric step-up — bypass gracefully.
  const userPasskeys = await db.select({ id: passkeys.id })
    .from(passkeys)
    .where(eq(passkeys.userId, userId))
    .limit(1)

  if (!userPasskeys || userPasskeys.length === 0) {
    // No passkeys registered — step-up cannot be enforced. Allow through.
    return await next()
  }

  const sessionResult = (await db.select({ 
      passkeyVerifiedAt: sessions.passkeyVerifiedAt 
    }).from(sessions).where(eq(sessions.id, sessionId)).limit(1) as any)

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
