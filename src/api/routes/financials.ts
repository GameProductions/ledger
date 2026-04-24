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
  TransactionOutputSchema
} from '../schemas'
import { dispatchWebhook } from '../services/webhook-service'
import { logAudit, toSnake } from '../utils'
import { getDb } from '../db'
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
  investmentHoldings
} from '../db/schema'
import { eq, and, desc, asc, like, inArray, sql, gte, lte } from 'drizzle-orm'
import { inferTransactionDetails } from '../inference'

const financials = new Hono<{ Bindings: Bindings, Variables: Variables }>()

// Categories
financials.get('/categories', async (c) => {
  const householdId = c.get('householdId')
  const db = getDb(c.env)
  try {
    const results = await db.select().from(categories).where(eq(categories.householdId, householdId))
    return c.json({ 
      success: true, 
      data: results.map(row => {
        try {
          return CategoryOutputSchema.parse(toSnake(row))
        } catch (e: any) {
          console.error(`[DIAGNOSTIC_FAILURE] Category validation failed for row ${row.id}:`, e.errors || e.message);
          throw e;
        }
      }) 
    })
  } catch (err: any) {
    console.error(`[CRITICAL_FAILURE] Failed to fetch categories for household ${householdId}:`, err.message);
    throw new HTTPException(500, { message: 'Internal Server Error fetching categories' })
  }
})

// Accounts
financials.get('/accounts', async (c) => {
  const householdId = c.get('householdId')
  const db = getDb(c.env)
  try {
    const results = await db.select({
      id: accounts.id,
      name: accounts.name,
      type: accounts.type,
      balanceCents: accounts.balanceCents,
      currency: accounts.currency
    }).from(accounts).where(eq(accounts.householdId, householdId))
    
    return c.json({ 
      success: true, 
      data: results.map(row => {
        try {
          return AccountOutputSchema.parse(toSnake(row))
        } catch (e: any) {
          console.error(`[DIAGNOSTIC_FAILURE] Account validation failed for row ${row.id}:`, e.errors || e.message);
          throw e;
        }
      }) 
    })
  } catch (err: any) {
    console.error(`[CRITICAL_FAILURE] Failed to fetch accounts for household ${householdId}:`, err.message);
    throw new HTTPException(500, { message: 'Internal Server Error fetching accounts' })
  }
})

// Credit Cards
financials.get('/credit-cards', async (c) => {
  const householdId = c.get('householdId')
  const db = getDb(c.env)
  const results = await db.select().from(creditCards).where(eq(creditCards.householdId, householdId))
  return c.json({ 
    success: true, 
    data: toSnake(results)
  })
})

financials.post('/credit-cards', zValidator('json', CreditCardSchema, (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Credit card creation validation failed:`, result.error.errors);
  }
}), async (c) => {
  const householdId = c.get('householdId')
  const data = c.req.valid('json')
  const id = crypto.randomUUID()
  const db = getDb(c.env)
  await db.insert(creditCards).values({
    id,
    householdId,
    accountId: data.account_id,
    creditLimitCents: data.credit_limit_cents,
    interestRateApy: data.interest_rate_apy || 0,
    statementClosingDay: data.statement_closing_day,
    paymentDueDay: data.payment_due_day,
  })
  await logAudit(c, 'credit_cards', id, 'CREATE', null, { 
    account_id: data.account_id, 
    credit_limit: data.credit_limit_cents 
  })
  return c.json({ success: true, id })
})

// Transactions
financials.get('/transactions', async (c) => {
  const householdId = c.get('householdId')
  const { limit, offset } = PaginationSchema.parse({
    limit: c.req.query('limit'),
    offset: c.req.query('offset')
  })
  
  const categoryId = c.req.query('category_id')
  const accountId = c.req.query('account_id')
  const q = c.req.query('q')
  const sortBy = c.req.query('sort_by') || 'date' 
  const sortDir = c.req.query('sort_dir') || 'desc'
  const startDate = c.req.query('start_date')
  const endDate = c.req.query('end_date')

  const db = getDb(c.env)

  const orderByCol = sortBy === 'amount' ? transactions.amountCents : transactions.transactionDate
  const orderFunc = sortDir === 'asc' ? asc : desc

  try {
    const results = await db.select().from(transactions).where(
      and(
        eq(transactions.householdId, householdId),
        categoryId ? eq(transactions.categoryId, categoryId) : undefined,
        accountId ? eq(transactions.accountId, accountId) : undefined,
        startDate ? gte(transactions.transactionDate, startDate) : undefined,
        endDate ? lte(transactions.transactionDate, endDate) : undefined,
        q ? like(transactions.description, `%${q}%`) : undefined
      )
    ).orderBy(orderFunc(orderByCol)).limit(limit || 50).offset(offset || 0)

    return c.json({ 
      success: true, 
      data: results.map(row => {
        try {
          return TransactionOutputSchema.parse(toSnake(row))
        } catch (e: any) {
          console.error(`[DIAGNOSTIC_FAILURE] Transaction validation failed for row ${row.id}:`, e.errors || e.message);
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
  raw_description: z.string()
}), (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Transaction inference validation failed:`, result.error.errors);
  }
}), async (c) => {
  const householdId = c.get('householdId')
  const { raw_description } = c.req.valid('json')
  const db = getDb(c.env)
  
  const suggestions = await inferTransactionDetails(db, householdId, raw_description)
  return c.json({ suggestions })
})

financials.post('/transactions', zValidator('json', TransactionSchema, (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Transaction creation validation failed:`, result.error.errors);
    return c.json({ 
      success: false, 
      error: 'Invalid transaction data', 
      details: result.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
    }, 400);
  }
}), async (c) => {
  const householdId = c.get('householdId')
  const data = c.req.valid('json')
  const db = getDb(c.env)

  try {
    // God Mode Enforcement: Check if accounts/categories are required
    const config = await db.select({ configValue: systemConfig.configValue })
      .from(systemConfig)
      .where(eq(systemConfig.configKey, 'REQUIRE_TRANSACTION_CONTEXT'))
      .limit(1)
      .then(res => res[0]);

    const isRequired = config?.configValue === 'true';

    if (isRequired) {
      if (!data.account_id) {
        throw new HTTPException(400, { message: 'Please select an account for this transaction.' })
      }
      if (!data.category_id) {
        throw new HTTPException(400, { message: 'Please select a category for this transaction.' })
      }
    }
    
    const id = crypto.randomUUID()
    const date = data.transaction_date || new Date().toISOString().split('T')[0]
    
    const insertTx = db.insert(transactions).values({
      id,
      householdId,
      accountId: (data.account_id && data.account_id.trim() !== '') ? data.account_id : null, 
      categoryId: (data.category_id && data.category_id.trim() !== '') ? data.category_id : null,
      description: data.description,
      amountCents: data.amount_cents,
      transactionDate: date,
      notes: (data.notes && data.notes.trim() !== '') ? data.notes : null,
      rawDescription: (data.raw_description && data.raw_description.trim() !== '') ? data.raw_description : null,
      parentId: (data.parent_id && data.parent_id.trim() !== '') ? data.parent_id : null,
      providerId: (data.provider_id && data.provider_id.trim() !== '') ? data.provider_id : null,
      billId: (data.bill_id && data.bill_id.trim() !== '') ? data.bill_id : null,
      attentionRequired: data.attention_required,
      needsBalanceTransfer: data.needs_balance_transfer,
      transferTiming: data.transfer_timing || null,
      isBorrowed: data.is_borrowed,
      borrowSource: data.borrow_source || null,
      accountedFor: data.accounted_for,
    })

    if (data.category_id) {
      const updateCat = db.update(categories)
        .set({ envelopeBalanceCents: sql`envelope_balance_cents - ${data.amount_cents}` })
        .where(and(eq(categories.id, data.category_id), eq(categories.householdId, householdId)))
      
      await db.batch([insertTx, updateCat])
    } else {
      await insertTx
    }
    
    await logAudit(c, 'transactions', id, 'CREATE', null, { 
      amount: data.amount_cents, 
      account_id: data.account_id, 
      category_id: data.category_id 
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
  const results = await db.select({
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
  .where(eq(transactions.householdId, householdId))

  const snakeResults = results.map(row => toSnake(row))

  if (format === 'csv') {
    if (snakeResults.length === 0) return c.text('')
    const headers = Object.keys(snakeResults[0])
    const csv = [
      headers.join(','),
      ...snakeResults.map(row => headers.map(h => JSON.stringify(row[h as keyof typeof row] ?? '')).join(','))
    ].join('\n')
    
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="ledger_export.csv"'
      }
    })
  }

  return c.json({ success: true, data: snakeResults })
})

financials.get('/transactions/:id/timeline', async (c) => {
  const id = c.req.param('id')
  const householdId = c.get('householdId')
  const db = getDb(c.env)
  
  // Verify transaction belongs to household
  const tx = await db.select({ id: transactions.id }).from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.householdId, householdId)))
    .limit(1).then(res => res[0])

  if (!tx) throw new HTTPException(404, { message: 'Transaction not found in this household' })

  const results = await db.select().from(transactionTimeline)
    .where(eq(transactionTimeline.transactionId, id))
    .orderBy(desc(transactionTimeline.createdAt))
  return c.json({ success: true, data: toSnake(results) || [] })
})

financials.post('/transactions/:id/timeline', zValidator('json', TimelineEntrySchema, (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Timeline entry validation failed:`, result.error.errors);
  }
}), async (c) => {
  const id = c.req.param('id')
  const householdId = c.get('householdId')
  const { type, content } = c.req.valid('json')
  const entryId = crypto.randomUUID()
  
  const db = getDb(c.env)

  // Verify transaction belongs to household
  const tx = await db.select({ id: transactions.id }).from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.householdId, householdId)))
    .limit(1).then(res => res[0])

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
  // We can write manual SQL for this complex query using Drizzle raw or just raw SQL since it uses core sqlite functions like ABS and julianday
  const db = getDb(c.env)
  // I will just use run/raw since the heuristic is quite SQL-specific (julianday)
  // Wait, I can use c.env.DB.prepare here as an exception for complex raw queries, or `db.run(sql`...`)` which drizzle provides.
  // Using explicit sql template for Drizzle:
  // Note: db.run wrapper doesn't extract select arrays like .all(), it is better to `.all()` from D1.
  // Actually db.all(sql`...`) works in Drizzle! Wait, Drizzle instance doesn't have `.all()` exposed that easily unless it's a D1 `session.all()`.
  // I will just use `c.env.DB.prepare(...).all()` here because Drizzle ORM doesn't easily map this specific self-join with julianday without messy raw sql wrappers.
  const { results } = await c.env.DB.prepare(`
    SELECT t1.id as original_id, t2.id as suggested_id, t1.description, t2.description as suggested_description, t1.amount_cents as amount_cents
    FROM transactions t1
    JOIN transactions t2 ON t1.household_id = t2.household_id 
      AND t1.amount_cents = -t2.amount_cents
      AND ABS(julianday(t1.transaction_date) - julianday(t2.transaction_date)) <= 7
    WHERE t1.household_id = ? AND t1.id < t2.id
    LIMIT 5
  `).bind(householdId).all()
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
  transaction_ids: z.array(z.string()),
  reconciled: z.boolean()
}), (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Bulk reconcile validation failed:`, result.error.errors);
  }
}), async (c) => {
  const householdId = c.get('householdId')
  const { transaction_ids, reconciled } = c.req.valid('json')
  const db = getDb(c.env)
  
  if (transaction_ids.length === 0) return c.json({ success: true })

  // D1 / SQLite IN clause limits, chunking just in case
  const chunkSize = 50;
  for (let i = 0; i < transaction_ids.length; i += chunkSize) {
    const chunk = transaction_ids.slice(i, i + chunkSize);
    await db.update(transactions)
      .set({ reconciliationStatus: reconciled ? 'reconciled' : 'unreconciled' })
      .where(and(eq(transactions.householdId, householdId), inArray(transactions.id, chunk)))
  }
  
  await logAudit(c, 'transactions', 'batch_reconcile', 'UPDATE', null, { 
    count: transaction_ids.length, 
    reconciled 
  })
  
  return c.json({ success: true })
})

financials.post('/transactions/:id/split', zValidator('json', z.object({
  splits: z.array(z.object({
    amount_cents: z.number().int(),
    category_id: z.string().optional().nullable(),
    description: z.string()
  }))
}), (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Transaction split validation failed:`, result.error.errors);
  }
}), async (c) => {
  const id = c.req.param('id')
  const householdId = c.get('householdId')
  const { splits } = c.req.valid('json')
  const db = getDb(c.env)
  
  const original = await db.select().from(transactions).where(and(eq(transactions.id, id), eq(transactions.householdId, householdId))).limit(1).then(res => res[0])
  if (!original) throw new HTTPException(404, { message: 'Transaction not found' })

  const totalSplitAmount = splits.reduce((sum, split) => sum + split.amount_cents, 0)
  if (Math.abs(totalSplitAmount) !== Math.abs(original.amountCents)) {
    throw new HTTPException(400, { message: 'Split amounts must equal original transaction amount' })
  }

  const inserts = splits.map(split => {
    return db.insert(transactions).values({
      id: crypto.randomUUID(),
      householdId,
      accountId: original.accountId,
      categoryId: split.category_id || null,
      description: split.description,
      amountCents: split.amount_cents,
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

  await logAudit(c, 'transactions', id, 'SPLIT', null, { split_count: splits.length })

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
  
  await logAudit(c, 'transactions', id, 'LINK', null, { target_id: targetId })
  
  return c.json({ success: true })
})

financials.post('/transactions/:id/unlink', async (c) => {
  const id = c.req.param('id')
  const householdId = c.get('householdId')
  const db = getDb(c.env)
  
  const txResult = await db.select({ linkedTransactionId: transactions.linkedTransactionId })
    .from(transactions).where(and(eq(transactions.id, id), eq(transactions.householdId, householdId))).limit(1)
    
  const tx = txResult[0]
  if (tx && tx.linkedTransactionId) {
    const targetId = tx.linkedTransactionId
    const b1 = db.update(transactions).set({ linkedTransactionId: null, reconciliationStatus: 'unreconciled' }).where(eq(transactions.id, id))
    const b2 = db.update(transactions).set({ linkedTransactionId: null, reconciliationStatus: 'unreconciled' }).where(eq(transactions.id, targetId))
    await db.batch([b1, b2])
    await logAudit(c, 'transactions', id, 'UNLINK', null, { target_id: targetId })
  }
  return c.json({ success: true })
})

financials.patch('/transactions/:id', zValidator('json', TransactionSchema.partial(), (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Transaction update validation failed:`, result.error.errors);
  }
}), async (c) => {
  const id = c.req.param('id')
  const householdId = c.get('householdId')
  const data = c.req.valid('json')
  
  const updates: any = {}
  
  if (data.account_id !== undefined) updates.accountId = data.account_id
  if (data.category_id !== undefined) updates.categoryId = data.category_id
  if (data.owner_id !== undefined) updates.ownerId = data.owner_id
  if (data.status !== undefined) updates.status = data.status
  if (data.confirmation_number !== undefined) updates.confirmationNumber = data.confirmation_number
  if (data.description !== undefined) updates.description = data.description
  if (data.amount_cents !== undefined) updates.amountCents = data.amount_cents
  if (data.transaction_date !== undefined) updates.transactionDate = data.transaction_date
  if (data.attention_required !== undefined) updates.attentionRequired = data.attention_required
  if (data.needs_balance_transfer !== undefined) updates.needsBalanceTransfer = data.needs_balance_transfer
  if (data.transfer_timing !== undefined) updates.transferTiming = data.transfer_timing
  if (data.is_borrowed !== undefined) updates.isBorrowed = data.is_borrowed
  if (data.borrow_source !== undefined) updates.borrowSource = data.borrow_source
  if (data.accounted_for !== undefined) updates.accountedFor = data.accounted_for
  
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
  const body = await c.req.parseBody()
  const file = body['file'] as File
  if (!file) return c.json({ error: 'No file uploaded' }, 400)

  const text = await file.text()
  
  if (file.name.endsWith('.csv')) {
    const lines = text.split('\\n')
    const headers = lines[0].split(',').map((h: string) => h.trim())
    const preview = lines.slice(1, 6).map((l: string) => l.split(',').map((v: string) => v.trim()))
    return c.json({ type: 'csv', headers, preview })
  }

  if (file.name.endsWith('.json')) {
    try {
      const data = JSON.parse(text)
      const headers = Array.isArray(data) ? Object.keys(data[0]) : Object.keys(data)
      return c.json({ type: 'json', headers })
    } catch (e) {
      return c.json({ error: 'Invalid JSON' }, 400)
    }
  }

  return c.json({ error: 'Unsupported format for analysis' }, 400)
})

financials.post('/transactions/import/confirm', zValidator('json', z.object({
  mapping: z.record(z.string(), z.string()),
  data: z.array(z.record(z.string(), z.any())),
  accountId: z.string()
}), (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Import confirmation validation failed:`, result.error.errors);
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

  // D1 batch limit is 100 max per call? Drizzle's db.batch can take array. Wait, if there are thousands of rows, batch will fail. Let's chunk it.
  const chunkSize = 50;
  for (let i = 0; i < inserts.length; i += chunkSize) {
    const chunk = inserts.slice(i, i + chunkSize);
    await db.batch(chunk as any)
  }
  
  await logAudit(c, 'transactions', 'batch_import', 'IMPORT', null, { 
    count: inserts.length, 
    account_id: accountId 
  })
  
  return c.json({ success: true, count: inserts.length })
})

// Receipts
financials.post('/transactions/:id/receipt', async (c) => {
  const id = c.req.param('id')
  const householdId = c.get('householdId')
  const body = await c.req.parseBody()
  const file = body['file'] as File
  
  if (!file) return c.json({ error: 'No file uploaded' }, 400)
  if (!c.env.ASSETS) return c.json({ error: 'Assets Bucket not configured' }, 500)

  const key = `receipts/${householdId}/${id}-${Date.now()}`
  await c.env.ASSETS.put(key, await file.arrayBuffer(), {
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
  
  const txResult = await db.select({ receiptR2Key: transactions.receiptR2Key })
    .from(transactions).where(and(eq(transactions.id, id), eq(transactions.householdId, householdId))).limit(1)
    
  if (!txResult[0] || !txResult[0].receiptR2Key) return c.json({ error: 'Receipt not found' }, 404)

  const object = await c.env.ASSETS.get(txResult[0].receiptR2Key)
  if (!object) return c.json({ error: 'Object not found in R2' }, 404)

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)

  return new Response(object.body as any, { headers })
})

// Transfers
financials.post('/transfers', zValidator('json', TransferSchema, (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Transfer creation validation failed:`, result.error.errors);
  }
}), async (c) => {
  const householdId = c.get('householdId')
  const { from_account_id, to_account_id, amount_cents, description } = c.req.valid('json')
  const db = getDb(c.env)
  
  const verify = await db.select({ id: accounts.id })
    .from(accounts).where(and(eq(accounts.householdId, householdId), inArray(accounts.id, [from_account_id, to_account_id])))
    
  if (verify.length < 2) throw new HTTPException(403, { message: 'One or more accounts unauthorized' })

  const id = crypto.randomUUID()
  
  const u1 = db.update(accounts).set({ balanceCents: sql`balance_cents - \${amount_cents}` }).where(and(eq(accounts.id, from_account_id), eq(accounts.householdId, householdId)))
  const u2 = db.update(accounts).set({ balanceCents: sql`balance_cents + \${amount_cents}` }).where(and(eq(accounts.id, to_account_id), eq(accounts.householdId, householdId)))
  
  await db.batch([u1, u2])
  
  c.executionCtx.waitUntil(dispatchWebhook(c, 'transfer.created', { id, from_account_id, to_account_id, amount_cents }, householdId))

  if (c.env.DISCORD_WEBHOOK_URL) {
    await fetch(c.env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `➡️ **New Transfer logged!**\\n**Desc:** \${description}\\n**Amount:** $\${(amount_cents / 100).toFixed(2)}\\n**From:** \${from_account_id}\\n**To:** \${to_account_id}`
      })
    }).catch(err => console.error('Discord Webhook failed', err))
  }
  
  await logAudit(c, 'transfers', id, 'CREATE', null, { 
    from: from_account_id, 
    to: to_account_id, 
    amount: amount_cents 
  })
  
  return c.json({ success: true, id })
})

// Buckets
financials.post('/buckets', zValidator('json', z.object({ name: z.string().min(1), target_cents: z.number().int().min(100) }), (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Bucket creation validation failed:`, result.error.errors);
  }
}), async (c) => {
  const householdId = c.get('householdId')
  const { name, target_cents } = c.req.valid('json')
  const db = getDb(c.env)
  const id = `buck-${crypto.randomUUID()}`
  await db.insert(savingsBuckets).values({
    id,
    householdId,
    name,
    targetCents: target_cents,
    currentCents: 0
  })
  return c.json({ success: true, id })
})

financials.get('/buckets', async (c) => {
  const householdId = c.get('householdId')
  const db = getDb(c.env)
  const results = await db.select().from(savingsBuckets).where(eq(savingsBuckets.householdId, householdId))
  return c.json({ success: true, data: toSnake(results) || [] })
})


// Phase 4 Transfers
financials.patch('/subscriptions/:id/transfer', zValidator('json', z.object({ newOwnerId: z.string() }), (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Subscription transfer validation failed:`, result.error.errors);
  }
}), async (c) => {
  const userId = c.get('userId') as string
  const id = c.req.param('id')
  const { newOwnerId } = c.req.valid('json')
  const db = getDb(c.env)
  
  const sub = await db.select().from(subscriptions).where(eq(subscriptions.id, id)).limit(1).then(res => res[0])
  if (!sub) return c.json({ error: 'Not found' }, 404)
    
  if (sub.ownerId !== userId) {
     const membership = await db.select().from(userHouseholds).where(and(eq(userHouseholds.userId, userId), eq(userHouseholds.householdId, sub.householdId))).limit(1).then(res => res[0])
     if (!membership || (membership.role !== 'admin' && membership.role !== 'owner')) return c.json({ error: 'Forbidden' }, 403)
  }
  
  await db.update(subscriptions).set({ ownerId: newOwnerId }).where(eq(subscriptions.id, id))
  await logAudit(c, 'subscriptions', id, 'OWNERSHIP_TRANSFERRED', null, { from: sub.ownerId, to: newOwnerId })
  return c.json({ success: true })
})

financials.patch('/transactions/:id/transfer', zValidator('json', z.object({ newOwnerId: z.string() }), (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Transaction transfer validation failed:`, result.error.errors);
  }
}), async (c) => {
  const userId = c.get('userId') as string
  const id = c.req.param('id')
  const { newOwnerId } = c.req.valid('json')
  const db = getDb(c.env)
  
  const txn = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1).then(res => res[0])
  if (!txn) return c.json({ error: 'Not found' }, 404)
    
  if (txn.ownerId !== userId) {
     const membership = await db.select().from(userHouseholds).where(and(eq(userHouseholds.userId, userId), eq(userHouseholds.householdId, txn.householdId))).limit(1).then(res => res[0])
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
  const results = await db.select().from(investmentHoldings).where(eq(investmentHoldings.householdId, householdId)).orderBy(desc(investmentHoldings.createdAt))
  return c.json({ success: true, data: results || [] })
})

financials.post('/investments', zValidator('json', z.object({
  name: z.string().min(1),
  asset_type: z.string(),
  quantity: z.number().default(1),
  cost_basis_cents: z.number(),
  current_valuation_cents: z.number(),
  currency: z.string().default('USD'),
  institution_id: z.string().optional()
}), (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Investment creation validation failed:`, result.error.errors);
  }
}), async (c) => {
  const householdId = c.get('householdId')
  const data = c.req.valid('json')
  const id = crypto.randomUUID()
  const db = getDb(c.env)
  
  await db.insert(investmentHoldings).values({
    id,
    householdId,
    name: data.name,
    assetType: data.asset_type,
    quantity: data.quantity,
    costBasisCents: data.cost_basis_cents,
    valueCents: data.current_valuation_cents,
    currency: data.currency,
    institutionId: data.institution_id || null
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

export default financials
