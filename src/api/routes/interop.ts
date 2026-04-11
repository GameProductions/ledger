import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { Bindings, Variables } from '../types'
import { getDb } from '../db'
import { webhooks, transactions } from '../db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { getCoachingAnswer } from '../services/coach-service'

const interop = new Hono<{ Bindings: Bindings, Variables: Variables }>()

// AI Coach Interop
interop.post('/coach/ask/ask', zValidator('json', z.object({
  question: z.string().min(1)
})), async (c) => {
  const householdId = c.get('householdId')
  const { question } = c.req.valid('json')
  const db = getDb(c.env)

  // Fetch some context for the coach
  const totalSpend = await db.select({ total: sql`sum(amount_cents)` })
    .from(transactions)
    .where(eq(transactions.householdId, householdId))
    .then(res => res[0]?.total || 0)

  const answer = getCoachingAnswer(question, Number(totalSpend))

  return c.json({ answer })
})

// Webhook Management
interop.get('/developer/webhooks', async (c) => {
  const householdId = c.get('householdId')
  const db = getDb(c.env)
  
  const results = await db.select()
    .from(webhooks)
    .where(eq(webhooks.householdId, householdId))
    
  return c.json(results)
})

interop.post('/developer/webhooks', zValidator('json', z.object({
  url: z.string().url(),
  events: z.array(z.string()).default(['*'])
})), async (c) => {
  const householdId = c.get('householdId')
  const { url, events } = c.req.valid('json')
  const db = getDb(c.env)
  
  const id = crypto.randomUUID()
  const secret = 'whk_' + crypto.randomUUID().replace(/-/g, '')
  
  await db.insert(webhooks).values({
    id,
    householdId,
    url,
    secret,
    eventList: JSON.stringify(events),
    isActive: true
  })
  
  return c.json({ success: true, id, secret })
})

export default interop
