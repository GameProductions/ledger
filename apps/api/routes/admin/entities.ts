import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { Bindings, Variables } from '../../types'
import { getDb } from '#/index'
import * as schema from '#/schema'
import { eq, desc, sql, and } from 'drizzle-orm'
import { logAudit } from '../../utils'
import { HTTPException } from 'hono/http-exception'

const entities = new Hono<{ Bindings: Bindings, Variables: Variables }>()

// Generic Entity CRUD for God Mode
const getTable = (type: string) => {
  const mapping: Record<string, any> = {
    'categories': schema.categories,
    'accounts': schema.accounts,
    'credit-cards': schema.creditCards,
    'payment-methods': schema.userPaymentMethods,
    'linked-accounts': schema.userLinkedAccounts,
    'subscriptions': schema.subscriptions,
    'bills': schema.bills,
    'installment-plans': schema.installmentPlans,
    'pay-schedules': schema.paySchedules,
    'pairing-rules': schema.transactionPairingRules
  }
  return mapping[type]
}

entities.get('/:type', async (c) => {
  const type = c.req.param('type')
  const householdId = c.req.query('householdId')
  const userId = c.req.query('userId')
  
  const table = getTable(type)
  if (!table) throw new HTTPException(400, { message: 'Invalid entity type' })
  
  const db = getDb(c.env)
  let query = db.select().from(table)
  
  const conditions = []
  if (householdId && 'householdId' in table) conditions.push(eq(table.householdId, householdId))
  if (userId && 'userId' in table) conditions.push(eq(table.userId, userId))
  
  if (conditions.length > 0) {
    // @ts-ignore
    query = query.where(and(...conditions))
  }
  
  const results = await query.limit(1000)
  return c.json(results || [])
})

entities.patch('/:type/:id', async (c) => {
  const { type, id } = c.req.param()
  const data = await c.req.json()
  const table = getTable(type)
  if (!table) throw new HTTPException(400, { message: 'Invalid entity type' })
  
  const db = getDb(c.env)
  const old = await db.select().from(table).where(eq(table.id, id)).limit(1).then(res => res[0])
  if (!old) throw new HTTPException(404, { message: 'Record not found' })

  // Clean data to only include valid columns
  const cleanData: any = {}
  Object.keys(data).forEach(k => {
    if (k !== 'id' && k in table) {
      cleanData[k] = data[k]
    }
  })

  await db.update(table).set({ ...cleanData, updatedAt: sql`CURRENT_TIMESTAMP` }).where(eq(table.id, id))
  await logAudit(c, type, id, 'GOD_MODE_UPDATE', old, cleanData, {}, true)
  
  return c.json({ success: true })
})

entities.delete('/:type/:id', async (c) => {
  const { type, id } = c.req.param()
  const table = getTable(type)
  if (!table) throw new HTTPException(400, { message: 'Invalid entity type' })
  
  const db = getDb(c.env)
  const old = await db.select().from(table).where(eq(table.id, id)).limit(1).then(res => res[0])
  if (!old) throw new HTTPException(404, { message: 'Record not found' })

  await db.delete(table).where(eq(table.id, id))
  await logAudit(c, type, id, 'GOD_MODE_DELETE', old, null, {}, true)
  
  return c.json({ success: true })
})

entities.get('/audit/report', async (c) => {
  const db = getDb(c.env)
  const results = await db.select()
    .from(schema.activityLogs)
    .where(sql`action LIKE 'GOD_MODE_%'`)
    .orderBy(desc(schema.activityLogs.createdAt))
    .limit(100)
  return c.json(results || [])
})

export default entities
