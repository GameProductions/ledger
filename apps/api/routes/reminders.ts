import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { Bindings, Variables } from '../types'
import { getDb } from '#/index'
import { reminders } from '#/schema'
import { eq, and } from 'drizzle-orm'
import { logAudit } from '../utils'

const remindersApi = new Hono<{ Bindings: Bindings, Variables: Variables }>()

remindersApi.get('/:targetType/:targetId', async (c) => {
  const householdId = c.get('householdId')
  const { targetType, targetId } = c.req.param()
  const db = getDb(c.env)
  
  const results = (await db.select().from(reminders)
      .where(and(
        eq(reminders.householdId, householdId),
        eq(reminders.targetType, targetType),
        eq(reminders.targetId, targetId)
      )) as any)

  return c.json(results)
})

remindersApi.post('/', zValidator('json', z.object({
  targetId: z.string(),
  targetType: z.string(),
  deliveryType: z.string(),
  deliveryTarget: z.string().optional().nullable(),
  frequencyDays: z.number().int().min(0),
  timeOfDay: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
})), async (c) => {
  const householdId = c.get('householdId')
  const userId = c.get('userId')
  const data = (c.req.valid('json') as any)
  const id = crypto.randomUUID()
  const db = getDb(c.env)

  await db.insert(reminders).values({
    id,
    householdId,
    userId,
    targetId: data.targetId,
    targetType: data.targetType,
    deliveryType: data.deliveryType,
    deliveryTarget: data.deliveryTarget || null,
    frequencyDays: data.frequencyDays,
    timeOfDay: data.timeOfDay || '09:00',
    note: data.note || null,
  })

  await logAudit(c, 'reminders', id, 'create', null, data)
  return c.json({ success: true, id })
})

remindersApi.patch('/:id', zValidator('json', z.object({
  deliveryType: z.string().optional(),
  deliveryTarget: z.string().optional().nullable(),
  frequencyDays: z.number().int().min(0).optional(),
  timeOfDay: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
})), async (c) => {
  const householdId = c.get('householdId')
  const userId = c.get('userId')
  const id = c.req.param('id')
  const data = (c.req.valid('json') as any)
  const db = getDb(c.env)
  
  const role = c.get('globalRole')
  const filter = role === 'owner' 
    ? and(eq(reminders.id, id), eq(reminders.householdId, householdId))
    : and(eq(reminders.id, id), eq(reminders.householdId, householdId), eq(reminders.userId, userId))

  const oldResult = (await db.select().from(reminders).where(filter).limit(1) as any)
  const old = oldResult[0]
  if (!old) return c.json({ error: 'Not found' }, 404)

  const updates: any = {}
  if (data.deliveryType !== undefined) updates.deliveryType = data.deliveryType
  if (data.deliveryTarget !== undefined) updates.deliveryTarget = data.deliveryTarget
  if (data.frequencyDays !== undefined) updates.frequencyDays = data.frequencyDays
  if (data.timeOfDay !== undefined) updates.timeOfDay = data.timeOfDay
  if (data.note !== undefined) updates.note = data.note
  if (data.isActive !== undefined) updates.isActive = data.isActive

  if (Object.keys(updates).length > 0) {
    await db.update(reminders).set(updates).where(eq(reminders.id, id))
    await logAudit(c, 'reminders', id, 'update', old, data)
  }

  return c.json({ success: true })
})

remindersApi.delete('/:id', async (c) => {
  const householdId = c.get('householdId')
  const userId = c.get('userId')
  const id = c.req.param('id')
  const db = getDb(c.env)
  
  const role = c.get('globalRole')
  const filter = role === 'owner' 
    ? and(eq(reminders.id, id), eq(reminders.householdId, householdId))
    : and(eq(reminders.id, id), eq(reminders.householdId, householdId), eq(reminders.userId, userId))

  const oldResult = (await db.select().from(reminders).where(filter).limit(1) as any)
  if (!oldResult[0]) return c.json({ error: 'Not found' }, 404)

  await db.delete(reminders).where(eq(reminders.id, id))
  await logAudit(c, 'reminders', id, 'delete', oldResult[0], null)
  return c.json({ success: true })
})

export default remindersApi
