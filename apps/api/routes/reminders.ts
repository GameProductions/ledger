import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { Bindings, Variables } from '../types'
import { getDb } from '#/index'
import { reminders } from '#/schema'
import { eq, and } from 'drizzle-orm'
import { logAudit } from '../utils'

const remindersApi = new Hono<{ Bindings: Bindings, Variables: Variables }>()

const toSnake = (obj: any) => {
  if (!obj || typeof obj !== 'object') return obj;
  const res: any = {};
  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    res[snakeKey] = obj[key];
  }
  return res;
}

remindersApi.get('/:targetType/:targetId', async (c) => {
  const householdId = c.get('householdId')
  const { targetType, targetId } = c.req.param()
  const db = getDb(c.env)
  
  const results = await db.select().from(reminders)
    .where(and(
      eq(reminders.householdId, householdId),
      eq(reminders.targetType, targetType),
      eq(reminders.targetId, targetId)
    ))

  return c.json(results.map(toSnake))
})

remindersApi.post('/', zValidator('json', z.object({
  target_id: z.string(),
  target_type: z.string(),
  delivery_type: z.string(),
  delivery_target: z.string().optional().nullable(),
  frequency_days: z.number().int().min(0),
  time_of_day: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
})), async (c) => {
  const householdId = c.get('householdId')
  const userId = c.get('userId')
  const data = c.req.valid('json')
  const id = crypto.randomUUID()
  const db = getDb(c.env)

  await db.insert(reminders).values({
    id,
    householdId,
    userId,
    targetId: data.target_id,
    targetType: data.target_type,
    deliveryType: data.delivery_type,
    deliveryTarget: data.delivery_target || null,
    frequencyDays: data.frequency_days,
    timeOfDay: data.time_of_day || '09:00',
    note: data.note || null,
  })

  await logAudit(c, 'reminders', id, 'create', null, data)
  return c.json({ success: true, id })
})

remindersApi.patch('/:id', zValidator('json', z.object({
  delivery_type: z.string().optional(),
  delivery_target: z.string().optional().nullable(),
  frequency_days: z.number().int().min(0).optional(),
  time_of_day: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
})), async (c) => {
  const householdId = c.get('householdId')
  const userId = c.get('userId')
  const id = c.req.param('id')
  const data = c.req.valid('json')
  const db = getDb(c.env)
  
  const role = c.get('globalRole')
  const filter = role === 'super_admin' 
    ? and(eq(reminders.id, id), eq(reminders.householdId, householdId))
    : and(eq(reminders.id, id), eq(reminders.householdId, householdId), eq(reminders.userId, userId))

  const oldResult = await db.select().from(reminders).where(filter).limit(1)
  const old = oldResult[0]
  if (!old) return c.json({ error: 'Not found' }, 404)

  const updates: any = {}
  if (data.delivery_type !== undefined) updates.deliveryType = data.delivery_type
  if (data.delivery_target !== undefined) updates.deliveryTarget = data.delivery_target
  if (data.frequency_days !== undefined) updates.frequencyDays = data.frequency_days
  if (data.time_of_day !== undefined) updates.timeOfDay = data.time_of_day
  if (data.note !== undefined) updates.note = data.note
  if (data.is_active !== undefined) updates.isActive = data.is_active

  if (Object.keys(updates).length > 0) {
    await db.update(reminders).set(updates).where(eq(reminders.id, id))
    await logAudit(c, 'reminders', id, 'update', toSnake(old), data)
  }

  return c.json({ success: true })
})

remindersApi.delete('/:id', async (c) => {
  const householdId = c.get('householdId')
  const userId = c.get('userId')
  const id = c.req.param('id')
  const db = getDb(c.env)
  
  const role = c.get('globalRole')
  const filter = role === 'super_admin' 
    ? and(eq(reminders.id, id), eq(reminders.householdId, householdId))
    : and(eq(reminders.id, id), eq(reminders.householdId, householdId), eq(reminders.userId, userId))

  const oldResult = await db.select().from(reminders).where(filter).limit(1)
  if (!oldResult[0]) return c.json({ error: 'Not found' }, 404)

  await db.delete(reminders).where(eq(reminders.id, id))
  await logAudit(c, 'reminders', id, 'delete', toSnake(oldResult[0]), null)
  return c.json({ success: true })
})

export default remindersApi
