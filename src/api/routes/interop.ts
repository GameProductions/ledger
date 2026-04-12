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
  const rawSecret = 'whk_' + crypto.randomUUID().replace(/-/g, '')
  
  const { encrypt } = require('../utils')
  const secret = await encrypt(rawSecret, c.env.ENCRYPTION_KEY || c.env.JWT_SECRET)
  
  await db.insert(webhooks).values({
    id,
    householdId,
    url,
    secret,
    eventList: JSON.stringify(events),
    isActive: true
  })
  
  return c.json({ success: true, id, secret: rawSecret })
})

interop.patch('/developer/webhooks/:id', zValidator('json', z.object({
  url: z.string().url().optional(),
  events: z.array(z.string()).optional(),
  is_active: z.boolean().optional()
})), async (c) => {
  const householdId = c.get('householdId')
  const id = c.req.param('id')
  const { url, events, is_active } = c.req.valid('json')
  const db = getDb(c.env)
  
  const updates: any = {}
  if (url) updates.url = url
  if (events) updates.eventList = JSON.stringify(events)
  if (is_active !== undefined) updates.isActive = is_active
  
  await db.update(webhooks).set(updates).where(and(eq(webhooks.id, id), eq(webhooks.householdId, householdId)))
  return c.json({ success: true })
})

interop.delete('/developer/webhooks/:id', async (c) => {
  const householdId = c.get('householdId')
  const id = c.req.param('id')
  const db = getDb(c.env)
  await db.delete(webhooks).where(and(eq(webhooks.id, id), eq(webhooks.householdId, householdId)))
  return c.json({ success: true })
})

export default interop
