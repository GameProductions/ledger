import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { Bindings, Variables } from '../types'
import { TrackedExpenseSchema, TransactionSchema } from '@shared/schemas'
import { getDb } from '#/index'
import { trackedExpenses, transactions, categories, systemAuditLogs } from '#/schema'
import { eq, and, inArray, sql } from 'drizzle-orm'

const trackedExpensesRouter = new Hono<{ Bindings: Bindings, Variables: Variables }>()

// Get all pending tracked expenses
trackedExpensesRouter.get('/', async (c) => {
  const householdId = c.get('householdId')
  const db = getDb(c.env)
  try {
    const results = await db.select()
      .from(trackedExpenses)
      .where(and(
        eq(trackedExpenses.householdId, householdId),
        eq(trackedExpenses.status, 'pending')
      ))
    return c.json({ success: true, data: results })
  } catch (error: any) {
    console.error(`[TRACKED_EXPENSES_FETCH_FAILURE]`, error)
    return c.json({ error: 'Failed to fetch tracked expenses' }, 500)
  }
})

// Create a tracked expense
trackedExpensesRouter.post('/', zValidator('json', TrackedExpenseSchema), async (c) => {
  const householdId = c.get('householdId')
  const data = c.req.valid('json')
  const db = getDb(c.env)
  
  try {
    const id = crypto.randomUUID()
    await db.insert(trackedExpenses).values({
      id,
      householdId,
      amountCents: data.amountCents,
      description: data.description,
      notes: data.notes || null,
      attentionRequired: data.attentionRequired,
      needsBalanceTransfer: data.needsBalanceTransfer,
      transferTiming: data.transferTiming || null,
      isBorrowed: data.isBorrowed,
      borrowSource: data.borrowSource || null,
      status: 'pending'
    })
    
    return c.json({ success: true, data: { id } })
  } catch (error: any) {
    console.error(`[TRACKED_EXPENSE_CREATE_FAILURE]`, error)
    return c.json({ error: 'Failed to create tracked expense' }, 500)
  }
})

// Bulk Update tracked expenses
trackedExpensesRouter.patch('/bulk', zValidator('json', z.object({
  ids: z.array(z.string()),
  updates: TrackedExpenseSchema.partial()
})), async (c) => {
  const householdId = c.get('householdId')
  const { ids, updates } = c.req.valid('json')
  const db = getDb(c.env)
  
  try {
    const mappedUpdates: any = {}
    if (updates.amountCents !== undefined) mappedUpdates.amountCents = updates.amountCents
    if (updates.description !== undefined) mappedUpdates.description = updates.description
    if (updates.notes !== undefined) mappedUpdates.notes = updates.notes
    if (updates.attentionRequired !== undefined) mappedUpdates.attentionRequired = updates.attentionRequired
    if (updates.needsBalanceTransfer !== undefined) mappedUpdates.needsBalanceTransfer = updates.needsBalanceTransfer
    if (updates.transferTiming !== undefined) mappedUpdates.transferTiming = updates.transferTiming
    if (updates.isBorrowed !== undefined) mappedUpdates.isBorrowed = updates.isBorrowed
    if (updates.borrowSource !== undefined) mappedUpdates.borrowSource = updates.borrowSource

    if (Object.keys(mappedUpdates).length === 0) return c.json({ success: true, data: null })

    await db.update(trackedExpenses)
      .set(mappedUpdates)
      .where(and(
        eq(trackedExpenses.householdId, householdId),
        inArray(trackedExpenses.id, ids)
      ))
      
    return c.json({ success: true, data: null })
  } catch (error: any) {
    console.error(`[TRACKED_EXPENSE_BULK_UPDATE_FAILURE]`, error)
    return c.json({ error: 'Failed to update tracked expenses' }, 500)
  }
})

// Promote to transaction
trackedExpensesRouter.post('/promote', zValidator('json', z.object({
  ids: z.array(z.string()),
  transactionDetails: TransactionSchema.partial()
})), async (c) => {
  const householdId = c.get('householdId')
  const { ids, transactionDetails } = c.req.valid('json')
  const db = getDb(c.env)
  
  try {
    const items = await db.select()
      .from(trackedExpenses)
      .where(and(
        eq(trackedExpenses.householdId, householdId),
        inArray(trackedExpenses.id, ids)
      ))
      
    if (items.length === 0) return c.json({ error: 'No items found' }, 404)
    
    const promoTxs = items.map(item => {
      const txId = crypto.randomUUID()
      return db.insert(transactions).values({
        id: txId,
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
        status: transactionDetails.status || 'pending'
      })
    })
    
    const updateTracked = db.update(trackedExpenses)
      .set({ status: 'committed' })
      .where(and(
        eq(trackedExpenses.householdId, householdId),
        inArray(trackedExpenses.id, ids)
      ))
      
    const categoryUpdates = []
    if (transactionDetails.categoryId) {
      const totalAmount = items.reduce((sum, item) => sum + item.amountCents, 0)
      categoryUpdates.push(
        db.update(categories)
          .set({ envelopeBalanceCents: sql`envelopeBalanceCents - ${totalAmount}` })
          .where(and(eq(categories.id, transactionDetails.categoryId), eq(categories.householdId, householdId)))
      )
    }
      
    const auditLog = db.insert(systemAuditLogs).values({
      id: crypto.randomUUID(),
      userId: 'system',
      action: 'EXPENSE_PROMOTE',
      target: 'transactions',
      detailsJson: JSON.stringify({
        itemCount: items.length,
        itemIds: ids,
        accountId: transactionDetails.accountId,
        categoryId: transactionDetails.categoryId,
        totalAmountCents: items.reduce((sum, item) => sum + item.amountCents, 0)
      })
    })

    await db.batch([...promoTxs, updateTracked, ...categoryUpdates, auditLog] as any)
    
    return c.json({ success: true, data: null })
  } catch (error: any) {
    console.error(`[TRACKED_EXPENSE_PROMOTE_FAILURE]`, error)
    return c.json({ error: 'Failed to promote expenses to transactions', details: error.message }, 500)
  }
})

// Delete tracked expenses
trackedExpensesRouter.delete('/bulk', zValidator('json', z.object({
  ids: z.array(z.string())
})), async (c) => {
  const householdId = c.get('householdId')
  const { ids } = c.req.valid('json')
  const db = getDb(c.env)
  
  try {
    await db.delete(trackedExpenses)
      .where(and(
        eq(trackedExpenses.householdId, householdId),
        inArray(trackedExpenses.id, ids)
      ))
      
    return c.json({ success: true, data: null })
  } catch (error: any) {
    console.error(`[TRACKED_EXPENSE_DELETE_FAILURE]`, error)
    return c.json({ error: 'Failed to delete tracked expenses' }, 500)
  }
})

export default trackedExpensesRouter
