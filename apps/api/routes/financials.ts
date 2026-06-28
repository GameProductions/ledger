import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { HTTPException } from 'hono/http-exception'
import { Bindings, Variables } from '../types'
import { 
  TransactionSchema, 
  PaginationSchema, 
  TransferSchema, 
  CreditCardSchema,
  TimelineEntrySchema,
  CategoryOutputSchema,
  AccountOutputSchema,
  TransactionOutputSchema,
  CategorySchema,
  AccountSchema,
  TransactionPairingRuleSchema,
  BillerSchema
} from '@shared/schemas'
import { dispatchWebhook } from '../services/webhook-service'
import { logAudit, apiError } from '../utils'
import { getDb } from '#/index'
import { 
  categories,
  accounts,
  transactions,
  creditCards,
  transactionTimeline, 
  savingsBuckets,
  systemConfig,
  userHouseholds,
  subscriptions,
  investmentHoldings,
  sharedBalances,
  transactionPairingRules,
  trackedExpenses,
  activityLogs,
  users
} from '#/schema'
import { billers, reconciliationProposals } from '#/schema'
import { eq, and, desc, asc, like, inArray, sql, gte, lte, count, or, sum } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { inferTransactionDetails } from '../inference'
import { ReconciliationService } from '../services/reconciliation.service'

const financials = new Hono<{ Bindings: Bindings, Variables: Variables }>()

// Categories
financials.get('/categories', async (c) => {
  const householdId = c.get('householdId')
  const db = getDb(c.env)
  try {
    const results = (await db.select().from(categories).where(eq(categories.householdId, householdId)) as any)
    return c.json({ 
      success: true, 
      data: results.map((row: any) => {
        try {
          return CategoryOutputSchema.parse(row)
        } catch (e: any) {
          console.error(`[DIAGNOSTIC_FAILURE] Category validation failed for row ${row.id}:`, e.issues || e.message);
          throw e;
        }
      }) 
    })
  } catch (err: any) {
    console.error(`[CRITICAL_FAILURE] Failed to fetch categories for household ${householdId}:`, err.message);
    throw new HTTPException(500, { message: 'Internal Server Error fetching categories' })
  }
})

financials.post('/categories', zValidator('json', CategorySchema), async (c) => {
  const householdId = c.get('householdId')
  const data = (c.req.valid('json') as any)
  const id = crypto.randomUUID()
  const db = getDb(c.env)
  await db.insert(categories).values({
    id, householdId, name: data.name, icon: data.icon || null, color: data.color || null,
    monthlyBudgetCents: data.monthlyBudgetCents || 0, rolloverEnabled: data.rolloverEnabled || false,
    emergencyFund: data.emergencyFund || false
  })
  await logAudit(c, 'categories', id, 'CREATE', null, data)
  return c.json({ success: true, id })
})

financials.patch('/categories/:id', zValidator('json', CategorySchema.partial()), async (c) => {
  const householdId = c.get('householdId')
  const id = c.req.param('id')
  const data = (c.req.valid('json') as any)
  const db = getDb(c.env)
  const updates: any = {}
  if (data.name !== undefined) updates.name = data.name
  if (data.icon !== undefined) updates.icon = data.icon
  if (data.color !== undefined) updates.color = data.color
  if (data.monthlyBudgetCents !== undefined) updates.monthlyBudgetCents = data.monthlyBudgetCents
  if (data.rolloverEnabled !== undefined) updates.rolloverEnabled = data.rolloverEnabled
  if (data.emergencyFund !== undefined) updates.emergencyFund = data.emergencyFund
  if (Object.keys(updates).length > 0) {
    await db.update(categories).set(updates).where(and(eq(categories.id, id), eq(categories.householdId, householdId)))
    await logAudit(c, 'categories', id, 'UPDATE', null, data)
  }
  return c.json({ success: true })
})

financials.delete('/categories/:id', async (c) => {
  const householdId = c.get('householdId')
  const id = c.req.param('id')
  const db = getDb(c.env)
  // Null out category refs on transactions instead of cascade delete
  await db.update(transactions).set({ categoryId: null }).where(and(eq(transactions.categoryId, id), eq(transactions.householdId, householdId)))
  await db.delete(categories).where(and(eq(categories.id, id), eq(categories.householdId, householdId)))
  await logAudit(c, 'categories', id, 'DELETE')
  return c.json({ success: true })
})

// Accounts
financials.get('/accounts', async (c) => {
  const householdId = c.get('householdId')
  const db = getDb(c.env)
  try {
    const results = (await db.select({
          id: accounts.id,
          name: accounts.name,
          type: accounts.type,
          balanceCents: accounts.balanceCents,
          currency: accounts.currency
        }).from(accounts).where(eq(accounts.householdId, householdId)) as any)
    
    return c.json({ 
      success: true, 
      data: results.map((row: any) => {
        try {
          return AccountOutputSchema.parse(row)
        } catch (e: any) {
          console.error(`[DIAGNOSTIC_FAILURE] Account validation failed for row ${row.id}:`, e.issues || e.message);
          throw e;
        }
      }) 
    })
  } catch (err: any) {
    console.error(`[CRITICAL_FAILURE] Failed to fetch accounts for household ${householdId}:`, err.message);
    throw new HTTPException(500, { message: 'Internal Server Error fetching accounts' })
  }
})

financials.post('/accounts', zValidator('json', AccountSchema), async (c) => {
  const householdId = c.get('householdId')
  const data = (c.req.valid('json') as any)
  const id = `acc-${crypto.randomUUID()}`
  const db = getDb(c.env)
  await db.insert(accounts).values({
    id, householdId, name: data.name, type: data.type,
    balanceCents: data.balanceCents || 0, currency: data.currency || 'USD',
    status: data.status || 'active'
  })
  await logAudit(c, 'accounts', id, 'CREATE', null, data)
  return c.json({ success: true, id })
})

financials.patch('/accounts/:id', zValidator('json', AccountSchema.partial()), async (c) => {
  const householdId = c.get('householdId')
  const id = c.req.param('id')
  const data = (c.req.valid('json') as any)
  const db = getDb(c.env)
  const updates: any = {}
  if (data.name !== undefined) updates.name = data.name
  if (data.type !== undefined) updates.type = data.type
  if (data.balanceCents !== undefined) updates.balanceCents = data.balanceCents
  if (data.currency !== undefined) updates.currency = data.currency
  if (data.status !== undefined) updates.status = data.status
  if (Object.keys(updates).length > 0) {
    await db.update(accounts).set(updates).where(and(eq(accounts.id, id), eq(accounts.householdId, householdId)))
    await logAudit(c, 'accounts', id, 'UPDATE', null, data)
  }
  return c.json({ success: true })
})

financials.delete('/accounts/:id', async (c) => {
  const householdId = c.get('householdId')
  const id = c.req.param('id')
  const db = getDb(c.env)
  // Archive instead of hard delete to preserve transaction history
  await db.update(accounts).set({ status: 'closed' }).where(and(eq(accounts.id, id), eq(accounts.householdId, householdId)))
  await logAudit(c, 'accounts', id, 'ARCHIVE')
  return c.json({ success: true })
})

// Credit Cards
financials.get('/credit-cards', async (c) => {
  const householdId = c.get('householdId')
  const db = getDb(c.env)
  const results = (await db.select().from(creditCards).where(eq(creditCards.householdId, householdId)) as any)
  return c.json({ 
    success: true, 
    data: results
  })
})

financials.post('/credit-cards', zValidator('json', CreditCardSchema, (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Credit card creation validation failed:`, result.error.issues);
  }
}), async (c) => {
  const householdId = c.get('householdId')
  const data = (c.req.valid('json') as any)
  const id = crypto.randomUUID()
  const db = getDb(c.env)
  await db.insert(creditCards).values({
    id,
    householdId,
    accountId: data.accountId,
    creditLimitCents: data.creditLimitCents,
    interestRateApy: data.interestRateApy || 0,
    statementClosingDay: data.statementClosingDay,
    paymentDueDay: data.paymentDueDay,
  })
  await logAudit(c, 'credit_cards', id, 'CREATE', null, { 
    accountId: data.accountId, 
    creditLimit: data.creditLimitCents 
  })
  return c.json({ success: true, id })
})

financials.patch('/credit-cards/:id', zValidator('json', CreditCardSchema.partial()), async (c) => {
  const householdId = c.get('householdId')
  const id = c.req.param('id')
  const data = (c.req.valid('json') as any)
  const db = getDb(c.env)
  const updates: any = {}
  if (data.accountId !== undefined) updates.accountId = data.accountId
  if (data.creditLimitCents !== undefined) updates.creditLimitCents = data.creditLimitCents
  if (data.interestRateApy !== undefined) updates.interestRateApy = data.interestRateApy
  if (data.statementClosingDay !== undefined) updates.statementClosingDay = data.statementClosingDay
  if (data.paymentDueDay !== undefined) updates.paymentDueDay = data.paymentDueDay
  if (Object.keys(updates).length > 0) {
    await db.update(creditCards).set(updates).where(and(eq(creditCards.id, id), eq(creditCards.householdId, householdId)))
    await logAudit(c, 'credit_cards', id, 'UPDATE', null, data)
  }
  return c.json({ success: true })
})

financials.delete('/credit-cards/:id', async (c) => {
  const householdId = c.get('householdId')
  const id = c.req.param('id')
  const db = getDb(c.env)
  await db.delete(creditCards).where(and(eq(creditCards.id, id), eq(creditCards.householdId, householdId)))
  await logAudit(c, 'credit_cards', id, 'DELETE')
  return c.json({ success: true })
})

// Transaction Pairing Rules
financials.get('/pairing-rules', async (c) => {
  const householdId = c.get('householdId')
  const db = getDb(c.env)
  const results = (await db.select().from(transactionPairingRules).where(
      or(
        eq(transactionPairingRules.householdId, householdId),
        eq(transactionPairingRules.visibility, 'public')
      )
    ).orderBy(desc(transactionPairingRules.createdAt)) as any)
  return c.json({ success: true, data: results || [] })
})

financials.post('/pairing-rules', zValidator('json', TransactionPairingRuleSchema), async (c) => {
  const householdId = c.get('householdId')
  const userId = c.get('userId') as string
  const data = (c.req.valid('json') as any)
  const id = crypto.randomUUID()
  const db = getDb(c.env)
  await db.insert(transactionPairingRules).values({
    id, householdId, 
    pattern: data.pattern,
    targetProviderId: data.targetProviderId || null,
    targetCategoryId: data.targetCategoryId || null,
    autoConfirm: data.autoConfirm || false,
    ownerId: userId,
    visibility: data.visibility || 'private',
    ruleType: data.ruleType || 'manual',
    metadataJson: data.metadataJson || null
  })
  await logAudit(c, 'pairing_rules', id, 'CREATE', null, data)
  return c.json({ success: true, id })
})

financials.patch('/pairing-rules/:id', zValidator('json', TransactionPairingRuleSchema.partial()), async (c) => {
  const householdId = c.get('householdId')
  const id = c.req.param('id')
  const data = (c.req.valid('json') as any)
  const db = getDb(c.env)
  
  const updates: any = { ...data }
  // Ensure we don't accidentally update internal IDs
  delete updates.id
  delete updates.householdId
  
  if (Object.keys(updates).length > 0) {
    await db.update(transactionPairingRules).set(updates).where(and(eq(transactionPairingRules.id, id), eq(transactionPairingRules.householdId, householdId)))
    await logAudit(c, 'pairing_rules', id, 'UPDATE', null, data)
  }
  return c.json({ success: true })
})

financials.post('/pairing-rules/:id/share', zValidator('json', z.object({
  visibility: z.enum(['private', 'household', 'public'])
})), async (c) => {
  const id = c.req.param('id')
  const householdId = c.get('householdId')
  const { visibility } = c.req.valid('json')
  const db = getDb(c.env)
  
  await db.update(transactionPairingRules)
    .set({ visibility })
    .where(and(eq(transactionPairingRules.id, id), eq(transactionPairingRules.householdId, householdId)))
    
  await logAudit(c, 'pairing_rules', id, 'SHARE', null, { visibility })
  return c.json({ success: true })
})

financials.delete('/pairing-rules/:id', async (c) => {
  const householdId = c.get('householdId')
  const id = c.req.param('id')
  const db = getDb(c.env)
  await db.delete(transactionPairingRules).where(and(eq(transactionPairingRules.id, id), eq(transactionPairingRules.householdId, householdId)))
  await logAudit(c, 'pairing_rules', id, 'DELETE')
  return c.json({ success: true })
})

// Transactions
financials.get('/transactions', async (c) => {
  const householdId = c.get('householdId')
  const { limit, offset } = PaginationSchema.parse({
    limit: c.req.query('limit'),
    offset: c.req.query('offset')
  })
  
  const categoryId = c.req.query('categoryId')
  const accountId = c.req.query('accountId')
  const q = c.req.query('q')
  const sortBy = c.req.query('sortBy') || 'date' 
  const sortDir = c.req.query('sortDir') || 'desc'
  const startDate = c.req.query('startDate')
  const endDate = c.req.query('endDate')

  const db = getDb(c.env)

  const orderByCol = sortBy === 'amount' ? transactions.amountCents : transactions.transactionDate
  const orderFunc = sortDir === 'asc' ? asc : desc

  try {
    const results = (await db.select().from(transactions).where(
          and(
            eq(transactions.householdId, householdId),
            categoryId ? eq(transactions.categoryId, categoryId) : undefined,
            accountId ? eq(transactions.accountId, accountId) : undefined,
            startDate ? gte(transactions.transactionDate, startDate) : undefined,
            endDate ? lte(transactions.transactionDate, endDate) : undefined,
            q ? like(transactions.description, `%${q}%`) : undefined
          )
        ).orderBy(orderFunc(orderByCol)).limit(limit || 50).offset(offset || 0) as any)

    return c.json({ 
      success: true, 
      data: results.map((row: any) => {
        try {
          return TransactionOutputSchema.parse(row)
        } catch (e: any) {
          console.error(`[DIAGNOSTIC_FAILURE] Transaction validation failed for row ${row.id}:`, e.issues || e.message);
          throw e;
        }
      }),
      meta: { limit, offset }
    })
  } catch (err: any) {
    console.error(`[CRITICAL_FAILURE] Failed to fetch transactions for household ${householdId}:`, err.message);
    throw new HTTPException(500, { message: 'Internal Server Error fetching transactions' })
  }
})

financials.post('/transactions/infer', zValidator('json', z.object({
  rawDescription: z.string()
}), (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Transaction inference validation failed:`, result.error.issues);
  }
}), async (c) => {
  const householdId = c.get('householdId')
  const { rawDescription } = c.req.valid('json')
  const db = getDb(c.env)
  
  const suggestions = (await inferTransactionDetails(db, householdId, rawDescription) as any)
  return c.json({ success: true, data: suggestions })
})

financials.post('/transactions', zValidator('json', TransactionSchema, (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Transaction creation validation failed:`, result.error.issues);
    return c.json({ 
      success: false, 
      error: 'Invalid transaction data', 
      details: result.error.issues.map(e => ({ field: e.path.join('.'), message: e.message }))
    }, 400);
  }
}), async (c) => {
  const householdId = c.get('householdId')
  const data = (c.req.valid('json') as any)
  const db = getDb(c.env)

  try {
    // Owner Enforcement: Check if accounts/categories are required
    const config = (await db.select({ configValue: systemConfig.configValue })
          .from(systemConfig)
          .where(eq(systemConfig.configKey, 'REQUIRE_TRANSACTION_CONTEXT'))
          .limit(1)
          .then(res => res[0]) as any);

    const isRequired = config?.configValue === 'true';

    if (isRequired) {
      if (!data.accountId) {
        throw new HTTPException(400, { message: 'Please select an account for this transaction.' })
      }
      if (!data.categoryId) {
        throw new HTTPException(400, { message: 'Please select a category for this transaction.' })
      }
    }
    
    const id = crypto.randomUUID()
    const date = data.transactionDate || new Date().toISOString().split('T')[0]
    
    const insertTx = db.insert(transactions).values({
      id,
      householdId,
      accountId: data.accountId as string, 
      categoryId: (data.categoryId && data.categoryId.trim() !== '') ? data.categoryId : null,
      description: data.description,
      amountCents: data.amountCents,
      transactionDate: date,
      notes: (data.notes && data.notes.trim() !== '') ? data.notes : null,
      rawDescription: (data.rawDescription && data.rawDescription.trim() !== '') ? data.rawDescription : null,
      parentId: (data.parentId && data.parentId.trim() !== '') ? data.parentId : null,
      providerId: (data.providerId && data.providerId.trim() !== '') ? data.providerId : null,
      billId: (data.billId && data.billId.trim() !== '') ? data.billId : null,
      attentionRequired: data.attentionRequired,
      needsBalanceTransfer: data.needsBalanceTransfer,
      transferTiming: data.transferTiming || null,
      isBorrowed: data.isBorrowed,
      borrowSource: data.borrowSource || null,
      accountedFor: data.accountedFor,
      source: data.source || 'manual',
    })

    if (data.categoryId) {
      const updateCat = db.update(categories)
        .set({ envelopeBalanceCents: sql`envelopeBalanceCents - ${data.amountCents}` })
        .where(and(eq(categories.id, data.categoryId), eq(categories.householdId, householdId)))
      
      await db.batch([insertTx, updateCat])
    } else {
      await insertTx
    }
    
    // EXECUTE RULE ENGINE (Fleet Security Smart Billing)
    const reconService = new ReconciliationService(db, c.env)
    await reconService.applyRules(householdId, [id])
    
    await logAudit(c, 'transactions', id, 'CREATE', null, { 
      amount: data.amountCents, 
      accountId: data.accountId, 
      categoryId: data.categoryId 
    })
    
    return c.json({ success: true, id })
  } catch (error: any) {
    if (error instanceof HTTPException) throw error;
    console.error(`[CRITICAL_FAILURE] POST /api/financials/transactions:`, {
      message: error.message,
      stack: error.stack,
      data: data,
      householdId: householdId
    });
    return c.json({ success: false, error: 'Internal Server Error', details: error.message }, 500)
  }
})

// Transaction Export
financials.get('/transactions/export', async (c) => {
  const householdId = c.get('householdId')
  const format = c.req.query('format') || 'json'

  const db = getDb(c.env)
  const results = (await db.select({
      id: transactions.id,
      householdId: transactions.householdId,
      accountId: transactions.accountId,
      categoryId: transactions.categoryId,
      description: transactions.description,
      amountCents: transactions.amountCents,
      transactionDate: transactions.transactionDate,
      categoryName: categories.name,
      accountName: accounts.name
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(eq(transactions.householdId, householdId)) as any)

  if (format === 'csv') {
    if (results.length === 0) return c.text('')
    const headers = Object.keys(results[0])
    const csv = [
      headers.join(','),
      ...results.map((row: any) => headers.map(h => JSON.stringify(row[h as keyof typeof row] ?? '')).join(','))
    ].join('\n')
    
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="ledger_export.csv"'
      }
    })
  }

  return c.json({ success: true, data: results })
})

financials.get('/transactions/:id/timeline', async (c) => {
  const id = c.req.param('id')
  const householdId = c.get('householdId')
  const db = getDb(c.env)
  
  // Verify transaction belongs to household
  const tx = (await db.select({ id: transactions.id }).from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.householdId, householdId)))
      .limit(1).then(res => res[0]) as any)

  if (!tx) throw new HTTPException(404, { message: 'Transaction not found in this household' })

  const results = (await db.select().from(transactionTimeline)
      .where(eq(transactionTimeline.transactionId, id))
      .orderBy(desc(transactionTimeline.createdAt)) as any)
  return c.json({ success: true, data: results || [] })
})

financials.post('/transactions/:id/timeline', zValidator('json', TimelineEntrySchema, (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Timeline entry validation failed:`, result.error.issues);
  }
}), async (c) => {
  const id = c.req.param('id')
  const householdId = c.get('householdId')
  const { type, content } = c.req.valid('json')
  const entryId = crypto.randomUUID()
  
  const db = getDb(c.env)

  // Verify transaction belongs to household
  const tx = (await db.select({ id: transactions.id }).from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.householdId, householdId)))
      .limit(1).then(res => res[0]) as any)

  if (!tx) throw new HTTPException(404, { message: 'Transaction not found in this household' })

  await db.insert(transactionTimeline).values({
    id: entryId,
    transactionId: id,
    type,
    content
  })
  
  if (type === 'confirmation') {
    await db.update(transactions).set({ confirmationNumber: content }).where(eq(transactions.id, id))
  }
  
  await logAudit(c, 'transactions', id, 'ADD_TIMELINE_ENTRY', null, { type, content })
  
  return c.json({ success: true, id: entryId })
})

financials.get('/transactions/suggest-links', async (c) => {
  const householdId = c.get('householdId')
  const db = getDb(c.env)
  const t1 = alias(transactions, 't1')
  const t2 = alias(transactions, 't2')

  const results = (await db.select({
      originalId: t1.id,
      suggestedId: t2.id,
      description: t1.description,
      suggestedDescription: t2.description,
      amountCents: t1.amountCents
    })
    .from(t1)
    .innerJoin(t2, and(
      eq(t1.householdId, t2.householdId),
      eq(t1.amountCents, sql`-${t2.amountCents}`),
      sql`ABS(CAST(${t1.transactionDate} AS date) - CAST(${t2.transactionDate} AS date)) <= 7`
    ))
    .where(and(
      eq(t1.householdId, householdId),
      sql`${t1.id} < ${t2.id}`
    ))
    .limit(5) as any)

  return c.json({ success: true, data: results || [] })
})

financials.patch('/transactions/:id/reconcile', async (c) => {
  const id = c.req.param('id')
  const householdId = c.get('householdId')
  const { reconciled } = await c.req.json() as { reconciled: boolean }
  const db = getDb(c.env)
  await db.update(transactions)
    .set({ reconciliationStatus: reconciled ? 'reconciled' : 'unreconciled' })
    .where(and(eq(transactions.id, id), eq(transactions.householdId, householdId)))
  
  await logAudit(c, 'transactions', id, 'RECONCILE', null, { reconciled })
  
  return c.json({ success: true })
})

financials.patch('/transactions/bulk-reconcile', zValidator('json', z.object({
  transactionIds: z.array(z.string()),
  reconciled: z.boolean()
}), (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Bulk reconcile validation failed:`, result.error.issues);
  }
}), async (c) => {
  const householdId = c.get('householdId')
  const { transactionIds, reconciled } = c.req.valid('json')
  const db = getDb(c.env)
  
  if (transactionIds.length === 0) return c.json({ success: true })

  // D1 / SQLite IN clause limits, chunking just in case
  const chunkSize = 50;
  for (let i = 0; i < transactionIds.length; i += chunkSize) {
    const chunk = transactionIds.slice(i, i + chunkSize);
    await db.update(transactions)
      .set({ reconciliationStatus: reconciled ? 'reconciled' : 'unreconciled' })
      .where(and(eq(transactions.householdId, householdId), inArray(transactions.id, chunk)))
  }
  
  await logAudit(c, 'transactions', 'batch_reconcile', 'UPDATE', null, { 
    count: transactionIds.length, 
    reconciled 
  })
  
  return c.json({ success: true })
})

financials.post('/transactions/:id/split', zValidator('json', z.object({
  splits: z.array(z.object({
    amountCents: z.number().int(),
    categoryId: z.string().optional().nullable(),
    description: z.string()
  }))
}), (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Transaction split validation failed:`, result.error.issues);
  }
}), async (c) => {
  const id = c.req.param('id')
  const householdId = c.get('householdId')
  const { splits } = c.req.valid('json')
  const db = getDb(c.env)
  
  const original = (await db.select().from(transactions).where(and(eq(transactions.id, id), eq(transactions.householdId, householdId))).limit(1).then(res => res[0]) as any)
  if (!original) throw new HTTPException(404, { message: 'Transaction not found' })

  const totalSplitAmount = splits.reduce((sum, split) => sum + split.amountCents, 0)
  if (Math.abs(totalSplitAmount) !== Math.abs(original.amountCents)) {
    throw new HTTPException(400, { message: 'Split amounts must equal original transaction amount' })
  }

  const inserts = splits.map(split => {
    return db.insert(transactions).values({
      id: crypto.randomUUID(),
      householdId,
      accountId: original.accountId,
      categoryId: split.categoryId || null,
      description: split.description,
      amountCents: split.amountCents,
      transactionDate: original.transactionDate,
      parentId: id, // Link to original
      status: original.status,
      ownerId: original.ownerId
    })
  })

  // We could delete the original, or mark it as an invisible 'parent'
  // The ledger will traditionally filter out transactions that are parents of splits.
  const markParent = db.update(transactions).set({ reconciliationStatus: 'split' }).where(eq(transactions.id, id))

  await db.batch([...inserts, markParent] as any)

  await logAudit(c, 'transactions', id, 'SPLIT', null, { splitCount: splits.length })

  return c.json({ success: true })
})

financials.post('/transactions/:id/link', async (c) => {
  const id = c.req.param('id')
  const householdId = c.get('householdId')
  const { targetId } = await c.req.json() as { targetId: string }
  const db = getDb(c.env)
  
  const b1 = db.update(transactions)
    .set({ linkedTransactionId: targetId, reconciliationStatus: 'reconciled' })
    .where(and(eq(transactions.id, id), eq(transactions.householdId, householdId)))
    
  const b2 = db.update(transactions)
    .set({ linkedTransactionId: id, reconciliationStatus: 'reconciled' })
    .where(and(eq(transactions.id, targetId), eq(transactions.householdId, householdId)))
    
  await db.batch([b1, b2])
  
  await logAudit(c, 'transactions', id, 'LINK', null, { targetId })
  
  return c.json({ success: true })
})

financials.post('/transactions/:id/unlink', async (c) => {
  const id = c.req.param('id')
  const householdId = c.get('householdId')
  const db = getDb(c.env)
  
  const txResult = (await db.select({ linkedTransactionId: transactions.linkedTransactionId })
      .from(transactions).where(and(eq(transactions.id, id), eq(transactions.householdId, householdId))).limit(1) as any)
    
  const tx = txResult[0]
  if (tx && tx.linkedTransactionId) {
    const targetId = tx.linkedTransactionId
    const b1 = db.update(transactions).set({ linkedTransactionId: null, reconciliationStatus: 'unreconciled' }).where(eq(transactions.id, id))
    const b2 = db.update(transactions).set({ linkedTransactionId: null, reconciliationStatus: 'unreconciled' }).where(eq(transactions.id, targetId))
    await db.batch([b1, b2])
    await logAudit(c, 'transactions', id, 'UNLINK', null, { targetId })
  }
  return c.json({ success: true })
})

financials.patch('/transactions/:id', zValidator('json', TransactionSchema.partial(), (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Transaction update validation failed:`, result.error.issues);
  }
}), async (c) => {
  const id = c.req.param('id')
  const householdId = c.get('householdId')
  const data = (c.req.valid('json') as any)
  
  const updates: any = {}
  
  if (data.accountId !== undefined) updates.accountId = data.accountId
  if (data.categoryId !== undefined) updates.categoryId = data.categoryId
  if (data.ownerId !== undefined) updates.ownerId = data.ownerId
  if (data.status !== undefined) updates.status = data.status
  if (data.confirmationNumber !== undefined) updates.confirmationNumber = data.confirmationNumber
  if (data.description !== undefined) updates.description = data.description
  if (data.amountCents !== undefined) updates.amountCents = data.amountCents
  if (data.transactionDate !== undefined) updates.transactionDate = data.transactionDate
  if (data.attentionRequired !== undefined) updates.attentionRequired = data.attentionRequired
  if (data.needsBalanceTransfer !== undefined) updates.needsBalanceTransfer = data.needsBalanceTransfer
  if (data.transferTiming !== undefined) updates.transferTiming = data.transferTiming
  if (data.isBorrowed !== undefined) updates.isBorrowed = data.isBorrowed
  if (data.borrowSource !== undefined) updates.borrowSource = data.borrowSource
  if (data.accountedFor !== undefined) updates.accountedFor = data.accountedFor
  
  if (Object.keys(updates).length > 0) {
    const db = getDb(c.env)
    await db.update(transactions)
      .set(updates)
      .where(and(eq(transactions.id, id), eq(transactions.householdId, householdId)))
    
    if (data.status) {
       await db.insert(transactionTimeline).values({
         id: crypto.randomUUID(),
         transactionId: id,
         type: 'status_change',
         content: `Status changed to ${data.status}`
       })
    }
  }
  
  await logAudit(c, 'transactions', id, 'UPDATE', null, updates)
  
  return c.json({ success: true })
})

// Transaction Import Analysis
financials.post('/transactions/import/analyze', async (c: any) => {
  const body = (await c.req.parseBody() as any)
  const file = body['file'] as File
  if (!file) return c.json({ error: 'No file uploaded' }, 400)

  const text = (await file.text() as any)
  
  if (file.name.endsWith('.csv')) {
    const lines = text.split(/\r?\n/)
    if (lines.length === 0 || !lines[0]) return apiError(c, 'Empty CSV', 'INVALID_FILE', 'The uploaded CSV file appears to be empty.')
    const headers = lines[0].split(',').map((h: string) => h.trim())
    const preview = lines.slice(1, 6)
      .filter((l: any) => l.trim() !== '')
      .map((l: string) => l.split(',').map((v: string) => v.trim()))
    return c.json({ success: true, data: { type: 'csv', headers, preview } })
  }

  if (file.name.endsWith('.json')) {
    try {
      const data = (JSON.parse(text) as any)
      const headers = Array.isArray(data) ? Object.keys(data[0]) : Object.keys(data)
      return c.json({ success: true, data: { type: 'json', headers } })
    } catch (e: any) {
      return apiError(c, 'Invalid JSON', 'PARSE_ERROR', 'The uploaded JSON file is malformed and could not be parsed.')
    }
  }

  return apiError(c, 'Unsupported Format', 'INVALID_FORMAT', 'Only .csv and .json files are supported for transaction imports.', 415)
})

financials.post('/transactions/import/confirm', zValidator('json', z.object({
  mapping: z.record(z.string(), z.string()),
  data: z.array(z.record(z.string(), z.any())),
  accountId: z.string()
}), (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Import confirmation validation failed:`, result.error.issues);
  }
}), async (c) => {
  const householdId = c.get('householdId')
  const { mapping, data, accountId } = c.req.valid('json')
  const db = getDb(c.env)
  
  const inserts = (data as any[]).map(row => {
    const description = row[(mapping as any)['description']]
    const amountStr = row[(mapping as any)['amount']]
    const date = row[(mapping as any)['date']]
    
    const amountCents = Math.round(parseFloat(String(amountStr).replace(/[^0-9.-]+/g, "")) * 100)
    
    return db.insert(transactions).values({
      id: crypto.randomUUID(),
      householdId,
      accountId,
      description,
      amountCents,
      transactionDate: date
    })
  })
  const CHUNK_SIZE = 50
  for (let i = 0; i < inserts.length; i += CHUNK_SIZE) {
    const chunk = inserts.slice(i, i + CHUNK_SIZE)
    await db.batch(chunk as any)
  }
  
  // EXECUTE RULE ENGINE (Fleet Security Smart Billing)
  const txIds = inserts.map((ins: any) => ins.values.id)
  const reconService = new ReconciliationService(db, c.env)
  await reconService.applyRules(householdId, txIds)
  
  await logAudit(c, 'transactions', 'batch_import', 'IMPORT', null, { 
    count: inserts.length, 
    accountId: accountId 
  })
  
  return c.json({ success: true, count: inserts.length })
})

// Receipts
financials.post('/transactions/:id/receipt', async (c) => {
  const id = c.req.param('id')
  const householdId = c.get('householdId')
  const body = (await c.req.parseBody() as any)
  const file = body['file'] as File
  
  if (!file) return c.json({ error: 'No file uploaded' }, 400)
  if (!c.env.STORAGE) return c.json({ error: 'Assets Bucket not configured' }, 500)

  const key = `receipts/${householdId}/${id}-${Date.now()}`
  await c.env.STORAGE.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type }
  })

  const db = getDb(c.env)
  await db.update(transactions).set({ receiptR2Key: key }).where(and(eq(transactions.id, id), eq(transactions.householdId, householdId)))

  return c.json({ success: true, key })
})

financials.get('/transactions/:id/receipt', async (c) => {
  const id = c.req.param('id')
  const householdId = c.get('householdId')
  const db = getDb(c.env)
  
  const txResult = (await db.select({ receiptR2Key: transactions.receiptR2Key })
      .from(transactions).where(and(eq(transactions.id, id), eq(transactions.householdId, householdId))).limit(1) as any)
    
  if (!txResult[0] || !txResult[0].receiptR2Key) return c.json({ error: 'Receipt not found' }, 404)

  const object = (await c.env.STORAGE.get(txResult[0].receiptR2Key) as any)
  if (!object) return c.json({ error: 'Object not found in R2' }, 404)

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)

  return new Response(object.body as any, { headers })
})

// Transfers
financials.post('/transfers', zValidator('json', TransferSchema, (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Transfer creation validation failed:`, result.error.issues);
  }
}), async (c) => {
  const householdId = c.get('householdId')
  const { fromAccountId, toAccountId, amountCents, description } = c.req.valid('json')
  const db = getDb(c.env)
  
  const verify = (await db.select({ id: accounts.id })
      .from(accounts).where(and(eq(accounts.householdId, householdId), inArray(accounts.id, [fromAccountId, toAccountId]))) as any)
    
  if (verify.length < 2) throw new HTTPException(403, { message: 'One or more accounts unauthorized' })

  const id = crypto.randomUUID()
  
  const u1 = db.update(accounts).set({ balanceCents: sql`balanceCents - ${amountCents}` }).where(and(eq(accounts.id, fromAccountId), eq(accounts.householdId, householdId)))
  const u2 = db.update(accounts).set({ balanceCents: sql`balanceCents + ${amountCents}` }).where(and(eq(accounts.id, toAccountId), eq(accounts.householdId, householdId)))
  
  await db.batch([u1, u2])
  
  c.executionCtx.waitUntil(dispatchWebhook(c, 'transfer.created', { id, fromAccountId, toAccountId, amountCents }, householdId))

  if (c.env.DISCORD_WEBHOOK_URL) {
    await fetch(c.env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `➡️ **New Transfer logged!**\n**Desc:** ${description}\n**Amount:** $${(amountCents / 100).toFixed(2)}\n**From:** ${fromAccountId}\n**To:** ${toAccountId}`
      })
    }).catch(err => console.error('Discord Webhook failed', err))
  }
  
  await logAudit(c, 'transfers', id, 'CREATE', null, { 
    from: fromAccountId, 
    to: toAccountId, 
    amount: amountCents 
  })
  
  return c.json({ success: true, id })
})

// Buckets
financials.post('/buckets', zValidator('json', z.object({ name: z.string().min(1), targetCents: z.number().int().min(100) }), (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Bucket creation validation failed:`, result.error.issues);
  }
}), async (c) => {
  const householdId = c.get('householdId')
  const { name, targetCents } = c.req.valid('json')
  const db = getDb(c.env)
  const id = `buck-${crypto.randomUUID()}`
  await db.insert(savingsBuckets).values({
    id,
    householdId,
    name,
    targetCents: targetCents,
    currentCents: 0
  })
  return c.json({ success: true, id })
})

financials.get('/buckets', async (c) => {
  const householdId = c.get('householdId')
  const db = getDb(c.env)
  const results = (await db.select().from(savingsBuckets).where(eq(savingsBuckets.householdId, householdId)) as any)
  return c.json({ success: true, data: results || [] })
})


// Phase 4 Transfers
financials.patch('/subscriptions/:id/transfer', zValidator('json', z.object({ newOwnerId: z.string() }), (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Subscription transfer validation failed:`, result.error.issues);
  }
}), async (c) => {
  const userId = c.get('userId') as string
  const id = c.req.param('id')
  const { newOwnerId } = c.req.valid('json')
  const db = getDb(c.env)
  
  const sub = (await db.select().from(subscriptions).where(eq(subscriptions.id, id)).limit(1).then(res => res[0]) as any)
  if (!sub) return c.json({ error: 'Not found' }, 404)
    
  if (sub.ownerId !== userId) {
     const membership = (await db.select().from(userHouseholds).where(and(eq(userHouseholds.userId, userId), eq(userHouseholds.householdId, sub.householdId))).limit(1).then(res => res[0]) as any)
     if (!membership || (membership.role !== 'admin' && membership.role !== 'owner')) return c.json({ error: 'Forbidden' }, 403)
  }
  
  await db.update(subscriptions).set({ ownerId: newOwnerId }).where(eq(subscriptions.id, id))
  await logAudit(c, 'subscriptions', id, 'OWNERSHIP_TRANSFERRED', null, { from: sub.ownerId, to: newOwnerId })
  return c.json({ success: true })
})

financials.patch('/transactions/:id/transfer', zValidator('json', z.object({ newOwnerId: z.string() }), (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Transaction transfer validation failed:`, result.error.issues);
  }
}), async (c) => {
  const userId = c.get('userId') as string
  const id = c.req.param('id')
  const { newOwnerId } = c.req.valid('json')
  const db = getDb(c.env)
  
  const txn = (await db.select().from(transactions).where(eq(transactions.id, id)).limit(1).then(res => res[0]) as any)
  if (!txn) return c.json({ error: 'Not found' }, 404)
    
  if (txn.ownerId !== userId) {
     const membership = (await db.select().from(userHouseholds).where(and(eq(userHouseholds.userId, userId), eq(userHouseholds.householdId, txn.householdId))).limit(1).then(res => res[0]) as any)
     if (!membership || (membership.role !== 'admin' && membership.role !== 'owner')) return c.json({ error: 'Forbidden' }, 403)
  }
  
  await db.update(transactions).set({ ownerId: newOwnerId }).where(eq(transactions.id, id))
  await logAudit(c, 'transactions', id, 'OWNERSHIP_TRANSFERRED', null, { from: txn.ownerId, to: newOwnerId })
  return c.json({ success: true })
})

// Investment Holdings
financials.get('/investments', async (c) => {
  const householdId = c.get('householdId')
  const db = getDb(c.env)
  const results = (await db.select().from(investmentHoldings).where(eq(investmentHoldings.householdId, householdId)).orderBy(desc(investmentHoldings.createdAt)) as any)
  return c.json({ success: true, data: results || [] })
})

financials.post('/investments', zValidator('json', z.object({
  name: z.string().min(1),
  assetType: z.string(),
  quantity: z.number().default(1),
  costBasisCents: z.number(),
  currentValuationCents: z.number(),
  currency: z.string().default('USD'),
  institutionId: z.string().optional()
}), (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Investment creation validation failed:`, result.error.issues);
  }
}), async (c) => {
  const householdId = c.get('householdId')
  const data = (c.req.valid('json') as any)
  const id = crypto.randomUUID()
  const db = getDb(c.env)
  
  await db.insert(investmentHoldings).values({
    id,
    householdId,
    name: data.name,
    assetType: data.assetType,
    quantity: data.quantity,
    costBasisCents: data.costBasisCents,
    valueCents: data.currentValuationCents,
    currency: data.currency,
    institutionId: data.institutionId || null
  })
  
  await logAudit(c, 'investment_holdings', id, 'CREATE', null, data)
  return c.json({ success: true, id })
})

financials.delete('/investments/:id', async (c) => {
  const householdId = c.get('householdId')
  const id = c.req.param('id')
  const db = getDb(c.env)
  await db.delete(investmentHoldings).where(and(eq(investmentHoldings.id, id), eq(investmentHoldings.householdId, householdId)))
  await logAudit(c, 'investment_holdings', id, 'DELETE')
  return c.json({ success: true })
})

// Shared Balances (IOUs)
financials.get('/shared-balances', async (c) => {
  const householdId = c.get('householdId')
  const db = getDb(c.env)
  
  const u2 = alias(users, 'u2')

  const results = (await db.select({
      id: sharedBalances.id,
      householdId: sharedBalances.householdId,
      fromUserId: sharedBalances.fromUserId,
      toUserId: sharedBalances.toUserId,
      amountCents: sharedBalances.amountCents,
      transactionId: sharedBalances.transactionId,
      fromDisplayName: users.displayName,
      fromAvatarUrl: users.avatarUrl,
      toDisplayName: u2.displayName,
      toAvatarUrl: u2.avatarUrl,
      transactionDescription: transactions.description
    })
    .from(sharedBalances)
    .leftJoin(users, eq(sharedBalances.fromUserId, users.id))
    .leftJoin(u2, eq(sharedBalances.toUserId, u2.id))
    .leftJoin(transactions, eq(sharedBalances.transactionId, transactions.id))
    .where(eq(sharedBalances.householdId, householdId))
    .orderBy(desc(sharedBalances.id)) as any)
  
  return c.json({ success: true, data: results || [] })
})

financials.get('/shared-balances/summary', async (c) => {
  const householdId = c.get('householdId')
  const db = getDb(c.env)

  // Net balances between all pairs of users
  const u1 = alias(users, 'u1')
  const u2 = alias(users, 'u2')

  const results = (await db.select({
      fromUserId: sharedBalances.fromUserId,
      toUserId: sharedBalances.toUserId,
      netCents: sum(sharedBalances.amountCents),
      fromName: u1.displayName,
      fromAvatar: u1.avatarUrl,
      toName: u2.displayName,
      toAvatar: u2.avatarUrl
    })
    .from(sharedBalances)
    .leftJoin(u1, eq(sharedBalances.fromUserId, u1.id))
    .leftJoin(u2, eq(sharedBalances.toUserId, u2.id))
    .where(eq(sharedBalances.householdId, householdId))
    .groupBy(sharedBalances.fromUserId, sharedBalances.toUserId)
    .having(sql`SUM(${sharedBalances.amountCents}) != 0`) as any)
  
  return c.json({ success: true, data: results || [] })
})

financials.post('/shared-balances', zValidator('json', z.object({
  toUserId: z.string(),
  amountCents: z.number().int().min(1),
  transactionId: z.string().optional(),
  description: z.string().optional()
}), (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Shared balance creation validation failed:`, result.error.issues);
  }
}), async (c) => {
  const householdId = c.get('householdId')
  const userId = c.get('userId') as string
  const { toUserId, amountCents, transactionId } = c.req.valid('json')
  const db = getDb(c.env)
  const id = crypto.randomUUID()
  
  await db.insert(sharedBalances).values({
    id,
    householdId,
    fromUserId: userId,
    toUserId: toUserId,
    amountCents: amountCents,
    transactionId: transactionId || null
  })
  
  await logAudit(c, 'shared_balances', id, 'CREATE', null, { from: userId, to: toUserId, amount: amountCents })
  return c.json({ success: true, id })
})

financials.delete('/shared-balances/:id', async (c) => {
  const householdId = c.get('householdId')
  const id = c.req.param('id')
  
  const db = getDb(c.env)
  await db.delete(sharedBalances).where(and(eq(sharedBalances.id, id), eq(sharedBalances.householdId, householdId)))
  await logAudit(c, 'shared_balances', id, 'DELETE')
  return c.json({ success: true })
})

// Settle all debts between two users
financials.post('/shared-balances/settle', zValidator('json', z.object({
  withUserId: z.string()
})), async (c) => {
  const householdId = c.get('householdId')
  const userId = c.get('userId') as string
  const { withUserId } = c.req.valid('json')
  
  const db = getDb(c.env)
  await db.delete(sharedBalances)
    .where(and(
      eq(sharedBalances.householdId, householdId),
      or(
        and(eq(sharedBalances.fromUserId, userId), eq(sharedBalances.toUserId, withUserId)),
        and(eq(sharedBalances.fromUserId, withUserId), eq(sharedBalances.toUserId, userId))
      )
    ))
  
  await logAudit(c, 'shared_balances', 'settle', 'SETTLE', null, { user1: userId, user2: withUserId })
  return c.json({ success: true })
})

// 🏦 Billers CRUD
financials.get('/billers', async (c) => {
  const db = getDb(c.env)
  const results = (await db.select().from(billers).orderBy(asc(billers.name)) as any)
  return c.json({ success: true, data: results })
})

financials.post('/billers', zValidator('json', BillerSchema), async (c) => {
  const data = (c.req.valid('json') as any)
  const db = getDb(c.env)
  const id = crypto.randomUUID()
  await db.insert(billers).values({ id, ...data })
  await logAudit(c, 'billers', id, 'CREATE', null, data)
  return c.json({ success: true, id })
})

financials.delete('/billers/:id', async (c) => {
  const id = c.req.param('id')
  const db = getDb(c.env)
  await db.delete(billers).where(eq(billers.id, id))
  await logAudit(c, 'billers', id, 'DELETE')
  return c.json({ success: true })
})

// 🧩 Intelligent Reconciliation
financials.get('/reconciliation/proposals', async (c) => {
  const householdId = c.get('householdId')
  const db = getDb(c.env)
  
  const t1 = alias(transactions, 't1')
  const t2 = alias(transactions, 't2')

  const results = (await db.select({
      id: reconciliationProposals.id,
      householdId: reconciliationProposals.householdId,
      primaryTransactionId: reconciliationProposals.primaryTransactionId,
      suggestedTransactionId: reconciliationProposals.suggestedTransactionId,
      confidenceScore: reconciliationProposals.confidenceScore,
      status: reconciliationProposals.status,
      createdAt: reconciliationProposals.createdAt,
      primaryDescription: t1.description,
      primaryAmount: t1.amountCents,
      primaryDate: t1.transactionDate,
      suggestedDescription: t2.description,
      suggestedAmount: t2.amountCents,
      suggestedDate: t2.transactionDate
    })
    .from(reconciliationProposals)
    .innerJoin(t1, eq(reconciliationProposals.primaryTransactionId, t1.id))
    .innerJoin(t2, eq(reconciliationProposals.suggestedTransactionId, t2.id))
    .where(and(
      eq(reconciliationProposals.householdId, householdId),
      eq(reconciliationProposals.status, 'pending')
    ))
    .orderBy(desc(reconciliationProposals.confidenceScore)) as any)
  
  return c.json({ success: true, data: results || [] })
})

financials.post('/reconciliation/sync', async (c) => {
  const householdId = c.get('householdId')
  const db = getDb(c.env)
  const reconService = new ReconciliationService(db, c.env)
  const count = (await reconService.generateProposals(householdId) as any)
  return c.json({ success: true, proposalsGenerated: count })
})

financials.post('/reconciliation/proposals/bulk-action', zValidator('json', z.object({
  proposalIds: z.array(z.string()),
  action: z.enum(['approve', 'reject'])
})), async (c) => {
  const householdId = c.get('householdId')
  const { proposalIds, action } = c.req.valid('json')
  const db = getDb(c.env)
  const reconService = new ReconciliationService(db, c.env)
  await reconService.handleBulkProposals(householdId, proposalIds, action)
  return c.json({ success: true })
})

// financials.delete('/transactions/bulk', ...)
financials.delete('/transactions/bulk', zValidator('json', z.object({
  ids: z.array(z.string())
})), async (c) => {
  const householdId = c.get('householdId')
  const { ids } = c.req.valid('json')
  const db = getDb(c.env)
  if (ids.length === 0) return c.json({ success: true })
  await db.delete(transactions).where(and(eq(transactions.householdId, householdId), inArray(transactions.id, ids)))
  await logAudit(c, 'transactions', 'bulk', 'DELETE', null, { ids })
  return c.json({ success: true })
})

// financials.delete('/transactions/:id', ...)
financials.delete('/transactions/:id', async (c) => {
  const id = c.req.param('id')
  const householdId = c.get('householdId')
  const db = getDb(c.env)
  await db.delete(transactions).where(and(eq(transactions.id, id), eq(transactions.householdId, householdId)))
  await logAudit(c, 'transactions', id, 'DELETE', null, null)
  return c.json({ success: true })
})

export default financials


