import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { Bindings, Variables } from '../../types'
import { getDb } from '#/index'
import { households, userHouseholds } from '#/schema'
import { eq, desc, count, sql } from 'drizzle-orm'
import { logAudit } from '../../utils'
import { HTTPException } from 'hono/http-exception'

const householdAdmin = new Hono<{ Bindings: Bindings, Variables: Variables }>()

householdAdmin.get('/', async (c) => {
  const db = getDb(c.env)
  // Get households with member counts
  const results = await db.select({
    id: households.id,
    name: households.name,
    currency: households.currency,
    createdAt: households.createdAt,
    memberCount: sql<number>`(SELECT COUNT(*) FROM userHouseholds WHERE householdId = ${households.id})`
  }).from(households).orderBy(desc(households.createdAt))
  
  return c.json({ success: true, data: results || [] })
})

householdAdmin.patch('/:id', zValidator('json', z.object({
  name: z.string().min(1).optional(),
  currency: z.string().length(3).optional()
})), async (c) => {
  const id = c.req.param('id')
  const data = c.req.valid('json')
  const db = getDb(c.env)
  
  const old = await db.select().from(households).where(eq(households.id, id)).limit(1).then(res => res[0])
  if (!old) throw new HTTPException(404, { message: 'Household not found' })

  await db.update(households).set({ ...data, updatedAt: sql`CURRENT_TIMESTAMP` }).where(eq(households.id, id))
  await logAudit(c, 'households', id, 'ADMIN_UPDATE', old, data, {}, true)
  
  return c.json({ success: true })
})

householdAdmin.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const db = getDb(c.env)
  
  const old = await db.select().from(households).where(eq(households.id, id)).limit(1).then(res => res[0])
  if (!old) throw new HTTPException(404, { message: 'Household not found' })

  // Cascade delete or restrict?
  // Let's perform a clean delete of memberships too
  await db.delete(userHouseholds).where(eq(userHouseholds.householdId, id))
  await db.delete(households).where(eq(households.id, id))
  
  await logAudit(c, 'households', id, 'ADMIN_DELETE', old, null, {}, true)
  
  return c.json({ success: true })
})

export default householdAdmin
