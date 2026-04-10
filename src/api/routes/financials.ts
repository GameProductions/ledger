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
  TimelineEntrySchema 
} from '../schemas'
import { dispatchWebhook } from '../services/webhook-service'
import { getDb } from '../db'
import { 
  accounts, 
  categories, 
  creditCards, 
  transactions, 
  transactionTimeline, 
  savingsBuckets 
} from '../db/schema'
import { eq, and, desc, like, inArray, sql } from 'drizzle-orm'

const financials = new Hono<{ Bindings: Bindings, Variables: Variables }>()

const toSnake = (obj: any) => {
  if (!obj || typeof obj !== 'object') return obj;
  const res: any = {};
  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    res[snakeKey] = obj[key];
  }
  return res;
}

// Categories
financials.get('/categories', async (c) => {
  const householdId = c.get('householdId')
  const db = getDb(c.env)
  const results = await db.select().from(categories).where(eq(categories.householdId, householdId))
  return c.json(results.map(toSnake))
})

// Accounts
financials.get('/accounts', async (c) => {
  const householdId = c.get('householdId')
  const db = getDb(c.env)
  const results = await db.select({
    id: accounts.id,
    name: accounts.name,
    type: accounts.type,
    balance_cents: accounts.balanceCents,
    currency: accounts.currency
  }).from(accounts).where(eq(accounts.householdId, householdId))
  return c.json(results)
})

// Credit Cards
financials.get('/credit-cards', async (c) => {
  const householdId = c.get('householdId')
  const db = getDb(c.env)
  const results = await db.select().from(creditCards).where(eq(creditCards.householdId, householdId))
  return c.json(results.map(toSnake))
})

financials.post('/credit-cards', zValidator('json', CreditCardSchema), async (c) => {
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

  const db = getDb(c.env)
  const query = db.select().from(transactions).where(
    and(
      eq(transactions.householdId, householdId),
      categoryId ? eq(transactions.categoryId, categoryId) : undefined,
      accountId ? eq(transactions.accountId, accountId) : undefined,
      q ? like(transactions.description, `%${q}%`) : undefined
    )
  ).orderBy(desc(transactions.transactionDate)).limit(limit || 50).offset(offset || 0)

  const results = await query
  return c.json(results.map(toSnake))
})

financials.post('/transactions', zValidator('json', TransactionSchema), async (c) => {
  const householdId = c.get('householdId')
  const data = c.req.valid('json')
  
  const id = crypto.randomUUID()
  const date = data.transaction_date || new Date().toISOString().split('T')[0]
  
  const db = getDb(c.env)
  
  // To replace DB.batch for transactions AND category deduction, we logically perform both. 
  // Native Cloudflare D1 via Drizzle can use batch()
  const insertTx = db.insert(transactions).values({
    id,
    householdId,
    accountId: data.account_id,
    categoryId: data.category_id,
    description: data.description,
    amountCents: data.amount_cents,
    transactionDate: date
  })

  if (data.category_id) {
    const updateCat = db.update(categories)
      .set({ envelopeBalanceCents: sql`envelope_balance_cents - ${data.amount_cents}` })
      .where(and(eq(categories.id, data.category_id), eq(categories.householdId, householdId)))
    
    await db.batch([insertTx, updateCat])
  } else {
    await insertTx
  }
  
  return c.json({ success: true, id })
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

  return c.json(snakeResults)
})

financials.get('/transactions/:id/timeline', async (c) => {
  const id = c.req.param('id')
  const db = getDb(c.env)
  const results = await db.select().from(transactionTimeline)
    .where(eq(transactionTimeline.transactionId, id))
    .orderBy(desc(transactionTimeline.createdAt))
  return c.json(results.map(toSnake))
})

financials.post('/transactions/:id/timeline', zValidator('json', TimelineEntrySchema), async (c) => {
  const id = c.req.param('id')
  const { type, content } = c.req.valid('json')
  const entryId = crypto.randomUUID()
  
  const db = getDb(c.env)
  await db.insert(transactionTimeline).values({
    id: entryId,
    transactionId: id,
    type,
    content
  })
  
  if (type === 'confirmation') {
    await db.update(transactions).set({ confirmationNumber: content }).where(eq(transactions.id, id))
  }
  
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
    SELECT t1.id as original_id, t2.id as suggested_id, t1.description, t2.description as suggested_description, t1.amount_cents
    FROM transactions t1
    JOIN transactions t2 ON t1.household_id = t2.household_id 
      AND t1.amount_cents = -t2.amount_cents
      AND ABS(julianday(t1.transaction_date) - julianday(t2.transaction_date)) <= 7
    WHERE t1.household_id = ? AND t1.id < t2.id
    LIMIT 5
  `).bind(householdId).all()
  return c.json(results)
})

financials.patch('/transactions/:id/reconcile', async (c) => {
  const id = c.req.param('id')
  const householdId = c.get('householdId')
  const { reconciled } = await c.req.json() as { reconciled: boolean }
  const db = getDb(c.env)
  await db.update(transactions)
    .set({ reconciliationStatus: reconciled ? 'reconciled' : 'unreconciled' })
    .where(and(eq(transactions.id, id), eq(transactions.householdId, householdId)))
  
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
  }
  return c.json({ success: true })
})

financials.patch('/transactions/:id', zValidator('json', TransactionSchema.partial()), async (c) => {
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
         content: `Status changed to \${data.status}`
       })
    }
  }
  
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
})), async (c) => {
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

  const key = `receipts/\${householdId}/\${id}-\${Date.now()}`
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
financials.post('/transfers', zValidator('json', TransferSchema), async (c) => {
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
  
  return c.json({ success: true, id })
})

// Buckets
financials.post('/buckets', zValidator('json', z.object({ name: z.string().min(1), targetCents: z.number().int().min(100) })), async (c) => {
  const householdId = c.get('householdId')
  const { name, targetCents } = c.req.valid('json')
  const db = getDb(c.env)
  const id = `buck-${crypto.randomUUID()}`
  await db.insert(savingsBuckets).values({
    id,
    householdId,
    name,
    targetCents,
    currentCents: 0
  })
  return c.json({ success: true, id })
})

financials.get('/buckets', async (c) => {
  const householdId = c.get('householdId')
  const db = getDb(c.env)
  const results = await db.select().from(savingsBuckets).where(eq(savingsBuckets.householdId, householdId))
  return c.json(results.map(toSnake))
})

export default financials


// Phase 4 Transfers
financials.patch('/subscriptions/:id/transfer', zValidator('json', z.object({ newOwnerId: z.string() })), async (c) => {
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

financials.patch('/transactions/:id/transfer', zValidator('json', z.object({ newOwnerId: z.string() })), async (c) => {
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
