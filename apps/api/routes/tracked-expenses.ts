import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { HTTPException } from 'hono/http-exception'
import { Bindings, Variables } from '../types'
import { TransactionSchema } from '@shared/schemas'
import { getDb } from '#/index'
import { trackedExpenses, transactions } from '#/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { logAudit } from '../utils'

const trackedExpensesRoutes = new Hono<{ Bindings: Bindings, Variables: Variables }>()

// 1. Fetch all pending tracked expenses
trackedExpensesRoutes.get('/', async (c) => {
  const householdId = c.get('householdId')
  const db = getDb(c.env)
  
  const results = (await db.select().from(trackedExpenses).where(
      and(
        eq(trackedExpenses.householdId, householdId),
        eq(trackedExpenses.status, 'pending')
      )
    ) as any)
  
  return c.json({ success: true, data: results })
})

// 2. Create new tracked expense
trackedExpensesRoutes.post('/', zValidator('json', z.object({
  amountCents: z.number().int(),
  description: z.string(),
  notes: z.string().optional().nullable(),
  attentionRequired: z.boolean().optional(),
  needsBalanceTransfer: z.boolean().optional(),
  transferTiming: z.string().optional().nullable(),
  isBorrowed: z.boolean().optional(),
  borrowSource: z.string().optional().nullable()
})), async (c) => {
  const householdId = c.get('householdId')
  const data = (c.req.valid('json') as any)
  const db = getDb(c.env)
  const id = crypto.randomUUID()
  
  await db.insert(trackedExpenses).values({
    id,
    householdId,
    ...data,
    status: 'pending'
  })
  
  await logAudit(c, 'tracked_expenses', id, 'CREATE', null, data)
  return c.json({ success: true, id })
})

// 3. Bulk Update Tracked Expenses
trackedExpensesRoutes.patch('/bulk', zValidator('json', z.object({
  ids: z.array(z.string()),
  updates: z.object({
    amountCents: z.number().int().optional(),
    description: z.string().optional(),
    notes: z.string().optional().nullable(),
    attentionRequired: z.boolean().optional(),
    needsBalanceTransfer: z.boolean().optional(),
    status: z.string().optional()
  })
})), async (c) => {
  const householdId = c.get('householdId')
  const { ids, updates } = c.req.valid('json')
  const db = getDb(c.env)
  
  if (ids.length === 0) return c.json({ success: true })
  
  await db.update(trackedExpenses)
    .set(updates)
    .where(and(eq(trackedExpenses.householdId, householdId), inArray(trackedExpenses.id, ids)))
    
  await logAudit(c, 'tracked_expenses', 'bulk', 'UPDATE', null, { ids, updates })
  return c.json({ success: true })
})

// 4. Bulk Delete Tracked Expenses
trackedExpensesRoutes.delete('/bulk', zValidator('json', z.object({
  ids: z.array(z.string())
})), async (c) => {
  const householdId = c.get('householdId')
  const { ids } = c.req.valid('json')
  const db = getDb(c.env)
  
  if (ids.length === 0) return c.json({ success: true })
  
  await db.delete(trackedExpenses)
    .where(and(eq(trackedExpenses.householdId, householdId), inArray(trackedExpenses.id, ids)))
    
  await logAudit(c, 'tracked_expenses', 'bulk', 'DELETE', null, { ids })
  return c.json({ success: true })
})

// 5. Promote Tracked Expenses to Ledger
trackedExpensesRoutes.post('/promote', zValidator('json', z.object({
  ids: z.array(z.string()),
  transactionDetails: TransactionSchema.partial()
})), async (c) => {
  const householdId = c.get('householdId')
  const { ids, transactionDetails } = c.req.valid('json')
  const db = getDb(c.env)
  
  const items = (await db.select().from(trackedExpenses).where(
      and(eq(trackedExpenses.householdId, householdId), inArray(trackedExpenses.id, ids))
    ) as any)
  
  if (items.length === 0) return c.json({ success: false, error: 'No items found' }, 404)
  
  const promoTxs = items.map(item => {
    return db.insert(transactions).values({
      id: crypto.randomUUID(),
      householdId,
      accountId: transactionDetails.accountId || 'default-account',
      categoryId: transactionDetails.categoryId || null,
      amountCents: item.amountCents,
      description: item.description,
      transactionDate: transactionDetails.transactionDate || new Date().toISOString().split('T')[0],
      notes: item.notes,
      attentionRequired: item.attentionRequired,
      needsBalanceTransfer: item.needsBalanceTransfer,
      transferTiming: item.transferTiming,
      isBorrowed: item.isBorrowed,
      borrowSource: item.borrowSource,
      status: transactionDetails.status || 'pending',
      source: 'tracked_expense_promotion'
    })
  })
  
  const updateTracked = db.update(trackedExpenses)
    .set({ status: 'committed' })
    .where(and(eq(trackedExpenses.householdId, householdId), inArray(trackedExpenses.id, ids)))
    
  await db.batch([...promoTxs, updateTracked] as any)
  
  await logAudit(c, 'tracked_expenses', 'bulk', 'PROMOTE', null, { ids, transactionDetails })
  return c.json({ success: true })
})

export default trackedExpensesRoutes
