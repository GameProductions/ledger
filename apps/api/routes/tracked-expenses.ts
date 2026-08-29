import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { HTTPException } from 'hono/http-exception'
import { Bindings, Variables } from '../types'
import { TransactionSchema, ConfirmationNumberItemSchema } from '@shared/schemas'
import { getDb } from '#/index'
import { trackedExpenses, transactions, sharedBalances, trackedExpenseConfirmationNumbers, trackedExpenseLifecycleLogs, confirmationNumberCategories } from '#/schema'
import { eq, and, inArray, sql } from 'drizzle-orm'
import { logAudit } from '../utils'

const trackedExpensesRoutes = new Hono<{ Bindings: Bindings, Variables: Variables }>()

// Helper: Build legacy category ID map
async function getLegacyCategoryId(db: any) {
  const legacy = await db.select({ id: confirmationNumberCategories.id })
    .from(confirmationNumberCategories)
    .where(eq(confirmationNumberCategories.key, 'legacy'))
    .limit(1)
  return legacy[0]?.id
}

// Helper: Log lifecycle event for tracked expense
async function logTrackedExpenseLifecycle(
  c: any,
  trackedExpenseId: string,
  actorId: string,
  action: string,
  fieldChanged: string | null,
  oldValue: any,
  newValue: any,
  diffJson: any = null,
  metadata: any = {}
) {
  const db = getDb(c.env)
  await db.insert(trackedExpenseLifecycleLogs).values({
    trackedExpenseId,
    actorId,
    action,
    fieldChanged,
    oldValue: oldValue !== null && oldValue !== undefined ? JSON.stringify(oldValue) : null,
    newValue: newValue !== null && newValue !== undefined ? JSON.stringify(newValue) : null,
    diffJson,
    metadataJson: metadata,
  })
}

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
  confirmationNumber: z.string().optional().nullable(),
  confirmationNumbers: z.array(ConfirmationNumberItemSchema).optional().default([]),
  attentionRequired: z.boolean().optional(),
  needsBalanceTransfer: z.boolean().optional(),
  transferReconciled: z.boolean().optional(),
  transferTiming: z.string().optional().nullable(),
  isBorrowed: z.boolean().optional(),
  borrowSource: z.string().optional().nullable(),
  chargeDescriptorId: z.string().optional().nullable(),
  createdAt: z.string().optional(),
  recordHouseholdIou: z.boolean().optional(),
  iouToUserId: z.string().optional().nullable(),
  iouAmountCents: z.number().int().optional().nullable(),
  iouNotes: z.string().optional().nullable()
})), async (c) => {
  const householdId = c.get('householdId')
  const userId = c.get('userId') as string
  const body = c.req.valid('json')
  const { recordHouseholdIou, iouToUserId, iouAmountCents, iouNotes, ...data } = body
  const db = getDb(c.env)
  const legacyCategoryId = await getLegacyCategoryId(db)
  const id = crypto.randomUUID()
  
  // Determine which confirmation numbers to use
  // Legacy: if confirmationNumber is provided but confirmationNumbers is not, use [confirmationNumber]
  // New: if confirmationNumbers is provided, use that (merged with legacy)
  let confirmationNumbers: any[] = []
  if (data.confirmationNumbers && data.confirmationNumbers.length > 0) {
    confirmationNumbers = data.confirmationNumbers
  } else if (data.confirmationNumber) {
    // Legacy migration: convert single confirmationNumber to array with category='confirmation'
    confirmationNumbers = [{
      category: 'confirmation',
      customCategoryLabel: null,
      value: data.confirmationNumber,
      isPrimary: true,
      sortOrder: 0
    }]
  }
  
  await (db.insert(trackedExpenses) as any).values({
    id,
    householdId,
    ...data,
    status: 'pending'
  })
  
  // Store confirmation numbers in normalized table
  if (confirmationNumbers.length > 0) {
    for (const cn of confirmationNumbers) {
      await (db.insert(trackedExpenseConfirmationNumbers) as any).values({
        id: crypto.randomUUID(),
        trackedExpenseId: id,
        category: cn.category,
        customCategoryLabel: cn.customCategoryLabel,
        value: cn.value,
        isPrimary: cn.isPrimary ?? false,
        sortOrder: cn.sortOrder ?? 0
      })
    }
  }
  
  // Lifecycle log for creation
  await logTrackedExpenseLifecycle(c, id, userId, 'CREATE', null, null, {
    confirmationNumbers: confirmationNumbers.length > 0 ? confirmationNumbers.map(cn => cn.value) : [],
    hasLegacyMigration: !!data.confirmationNumber && !data.confirmationNumbers
  })
  
  if (recordHouseholdIou && iouToUserId && userId) {
    const iouId = crypto.randomUUID()
    await db.insert(sharedBalances).values({
      id: iouId,
      householdId,
      fromUserId: userId,
      toUserId: iouToUserId,
      amountCents: iouAmountCents || data.amountCents,
      transactionId: null
    })
    await logAudit(c, 'shared_balances', iouId, 'CREATE', null, { 
      source: 'tracked_expense_borrow',
      trackedExpenseId: id,
      toUserId: iouToUserId,
      amountCents: iouAmountCents || data.amountCents,
      notes: iouNotes
    })
  }
  
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
    confirmationNumber: z.string().optional().nullable(),
    confirmationNumbers: z.array(ConfirmationNumberItemSchema).optional().default([]),
    attentionRequired: z.boolean().optional(),
    needsBalanceTransfer: z.boolean().optional(),
    transferReconciled: z.boolean().optional(),
    transferTiming: z.string().optional().nullable(),
    isBorrowed: z.boolean().optional(),
    borrowSource: z.string().optional().nullable(),
    chargeDescriptorId: z.string().optional().nullable(),
    billId: z.string().optional().nullable(),
    createdAt: z.string().optional(),
    status: z.string().optional()
  })
})), async (c) => {
  const householdId = c.get('householdId')
  const { ids, updates } = c.req.valid('json')
  const db = getDb(c.env)
  
  if (ids.length === 0) return c.json({ success: true })
  
  // Handle confirmationNumbers in bulk update
  const { confirmationNumber, confirmationNumbers, ...updatesOnly } = updates
  
  await db.update(trackedExpenses)
    .set(updatesOnly)
    .where(and(eq(trackedExpenses.householdId, householdId), inArray(trackedExpenses.id, ids)))
    
  // If confirmationNumbers or confirmationNumber is being updated, handle the normalized table
  if (confirmationNumbers !== undefined || confirmationNumber !== undefined) {
    // Delete existing confirmation numbers for these expenses
    await db.delete(trackedExpenseConfirmationNumbers)
      .where(inArray(trackedExpenseConfirmationNumbers.trackedExpenseId, ids))
    
    // Re-insert based on new values
    const newConfirmationNumbers: any[] = []
    if (confirmationNumbers && confirmationNumbers.length > 0) {
      newConfirmationNumbers.push(...confirmationNumbers)
    } else if (confirmationNumber) {
      newConfirmationNumbers.push({
        category: 'confirmation',
        customCategoryLabel: null,
        value: confirmationNumber,
        isPrimary: true,
        sortOrder: 0
      })
    }
    
    for (const cn of newConfirmationNumbers) {
      for (const id of ids) {
        await (db.insert(trackedExpenseConfirmationNumbers) as any).values({
          id: crypto.randomUUID(),
          trackedExpenseId: id,
          category: cn.category,
          customCategoryLabel: cn.customCategoryLabel,
          value: cn.value,
          isPrimary: cn.isPrimary ?? false,
          sortOrder: cn.sortOrder ?? 0
        })
      }
    }
  }
  
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
  
  // Determine the legacy confirmationNumber to use (first one or from old field)
  let legacyConfirmationNumber = null
  for (const item of items) {
    if (item.confirmationNumber) {
      legacyConfirmationNumber = item.confirmationNumber
      break
    }
  }
  
  const promoTxs = items.map((item: any) => {
    // Get confirmation numbers from the item (new format) or legacy field
    let confirmationNumbers: any[] = []
    if (item.confirmationNumbers && item.confirmationNumbers.length > 0) {
      confirmationNumbers = item.confirmationNumbers
    } else if (legacyConfirmationNumber) {
      confirmationNumbers = [{
        category: 'confirmation',
        customCategoryLabel: null,
        value: legacyConfirmationNumber,
        isPrimary: true,
        sortOrder: 0
      }]
    }
    
    return db.insert(transactions).values({
      id: crypto.randomUUID(),
      householdId,
      accountId: transactionDetails.accountId || 'default-account',
      categoryId: transactionDetails.categoryId || null,
      amountCents: item.amountCents,
      description: item.description,
      transactionDate: transactionDetails.transactionDate || (item.createdAt ? new Date(item.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
      notes: item.notes,
      confirmationNumber: legacyConfirmationNumber || (item.confirmationNumbers?.[0]?.value ?? null),
      attentionRequired: item.attentionRequired,
      needsBalanceTransfer: item.needsBalanceTransfer,
      transferReconciled: item.transferReconciled,
      transferTiming: item.transferTiming,
      isBorrowed: item.isBorrowed,
      borrowSource: item.borrowSource,
      chargeDescriptorId: transactionDetails.chargeDescriptorId || item.chargeDescriptorId || null,
      billId: transactionDetails.billId || item.billId || null,
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
