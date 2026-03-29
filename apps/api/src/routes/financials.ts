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

const financials = new Hono<{ Bindings: Bindings, Variables: Variables }>()

// Categories
financials.get('/categories', async (c) => {
  const householdId = c.get('householdId')
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM categories WHERE household_id = ?'
  ).bind(householdId).all()
  return c.json(results)
})

// Accounts
financials.get('/accounts', async (c) => {
  const householdId = c.get('householdId')
  const { results } = await c.env.DB.prepare(
    'SELECT id, name, type, balance_cents, currency FROM accounts WHERE household_id = ?'
  ).bind(householdId).all()
  return c.json(results)
})

// Credit Cards
financials.get('/credit-cards', async (c) => {
  const householdId = c.get('householdId')
  const { results } = await c.env.DB.prepare('SELECT * FROM credit_cards WHERE household_id = ?').bind(householdId).all()
  return c.json(results)
})

financials.post('/credit-cards', zValidator('json', CreditCardSchema), async (c) => {
  const householdId = c.get('householdId')
  const data = c.req.valid('json')
  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    'INSERT INTO credit_cards (id, household_id, account_id, credit_limit_cents, interest_rate_apy, statement_closing_day, payment_due_day) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, householdId, data.account_id, data.credit_limit_cents, data.interest_rate_apy || 0, data.statement_closing_day, data.payment_due_day).run()
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

  let sql = 'SELECT * FROM transactions WHERE household_id = ?'
  const params: any[] = [householdId]

  if (categoryId) {
    sql += ' AND category_id = ?'
    params.push(categoryId)
  }
  if (accountId) {
    sql += ' AND account_id = ?'
    params.push(accountId)
  }
  if (q) {
    sql += ' AND description LIKE ?'
    params.push(`%${q}%`)
  }

  sql += ' ORDER BY transaction_date DESC LIMIT ? OFFSET ?'
  params.push(limit, offset)

  const { results } = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(results)
})

financials.post('/transactions', zValidator('json', TransactionSchema), async (c) => {
  const householdId = c.get('householdId')
  const data = c.req.valid('json')
  
  const id = crypto.randomUUID()
  const date = data.transaction_date || new Date().toISOString().split('T')[0]
  
  const query = c.env.DB.prepare(
    'INSERT INTO transactions (id, household_id, account_id, category_id, description, amount_cents, transaction_date) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, householdId, data.account_id, data.category_id, data.description, data.amount_cents, date)

  if (data.category_id) {
    // Atomic deduction from envelope
    await c.env.DB.batch([
      query,
      c.env.DB.prepare('UPDATE categories SET envelope_balance_cents = envelope_balance_cents - ? WHERE id = ? AND household_id = ?')
        .bind(data.amount_cents, data.category_id, householdId)
    ])
  } else {
    await query.run()
  }
  
  return c.json({ success: true, id })
})

// Transaction Export
financials.get('/transactions/export', async (c) => {
  const householdId = c.get('householdId')
  const format = c.req.query('format') || 'json'

  const { results } = await c.env.DB.prepare(
    `SELECT t.*, c.name as category_name, a.name as account_name 
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id
     LEFT JOIN accounts a ON t.account_id = a.id
     WHERE t.household_id = ?`
  ).bind(householdId).all()

  if (format === 'csv') {
    if (results.length === 0) return c.text('')
    const headers = Object.keys(results[0])
    const csv = [
      headers.join(','),
      ...results.map(row => headers.map(h => JSON.stringify(row[h as keyof typeof row])).join(','))
    ].join('\n')
    
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="ledger_export.csv"'
      }
    })
  }

  return c.json(results)
})

financials.get('/transactions/:id/timeline', async (c) => {
  const id = c.req.param('id')
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM transaction_timeline WHERE transaction_id = ? ORDER BY created_at DESC'
  ).bind(id).all()
  return c.json(results)
})

financials.post('/transactions/:id/timeline', zValidator('json', TimelineEntrySchema), async (c) => {
  const id = c.req.param('id')
  const { type, content } = c.req.valid('json')
  const entryId = crypto.randomUUID()
  
  await c.env.DB.prepare(
    'INSERT INTO transaction_timeline (id, transaction_id, type, content) VALUES (?, ?, ?, ?)'
  ).bind(entryId, id, type, content).run()
  
  if (type === 'confirmation') {
    await c.env.DB.prepare('UPDATE transactions SET confirmation_number = ? WHERE id = ?').bind(content, id).run()
  }
  
  return c.json({ success: true, id: entryId })
})

financials.get('/transactions/suggest-links', async (c) => {
  const householdId = c.get('householdId')
  // Simple heuristic: transactions with same amount but opposite signs within 7 days
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
  await c.env.DB.prepare('UPDATE transactions SET reconciliation_status = ? WHERE id = ? AND household_id = ?')
    .bind(reconciled ? 'reconciled' : 'unreconciled', id, householdId).run()
  return c.json({ success: true })
})

financials.post('/transactions/:id/link', async (c) => {
  const id = c.req.param('id')
  const householdId = c.get('householdId')
  const { targetId } = await c.req.json() as { targetId: string }
  // Logic to link two transactions (e.g. transfer source/sink)
  await c.env.DB.prepare('UPDATE transactions SET linked_transaction_id = ?, reconciliation_status = "reconciled" WHERE id = ? AND household_id = ?')
    .bind(targetId, id, householdId).run()
  await c.env.DB.prepare('UPDATE transactions SET linked_transaction_id = ?, reconciliation_status = "reconciled" WHERE id = ? AND household_id = ?')
    .bind(id, targetId, householdId).run()
  return c.json({ success: true })
})

financials.post('/transactions/:id/unlink', async (c) => {
  const id = c.req.param('id')
  const householdId = c.get('householdId')
  const tx = await c.env.DB.prepare('SELECT linked_transaction_id FROM transactions WHERE id = ? AND household_id = ?').bind(id, householdId).first()
  if (tx && (tx as any).linked_transaction_id) {
    const targetId = (tx as any).linked_transaction_id
    await c.env.DB.prepare('UPDATE transactions SET linked_transaction_id = NULL, reconciliation_status = "unreconciled" WHERE id = ?').bind(id).run()
    await c.env.DB.prepare('UPDATE transactions SET linked_transaction_id = NULL, reconciliation_status = "unreconciled" WHERE id = ?').bind(targetId).run()
  }
  return c.json({ success: true })
})

financials.patch('/transactions/:id', zValidator('json', TransactionSchema.partial()), async (c) => {
  const id = c.req.param('id')
  const householdId = c.get('householdId')
  const data = c.req.valid('json')
  
  const updates: string[] = []
  const params: any[] = []
  
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      if (key === 'account_id' || key === 'category_id' || key === 'owner_id' || key === 'status' || key === 'confirmation_number' || key === 'description' || key === 'amount_cents' || key === 'transaction_date') {
        updates.push(`${key} = ?`)
        params.push(value)
      }
    }
  })
  
  if (updates.length > 0) {
    params.push(id, householdId)
    await c.env.DB.prepare(
      `UPDATE transactions SET ${updates.join(', ')} WHERE id = ? AND household_id = ?`
    ).bind(...params).run()
    
    if (data.status) {
       await c.env.DB.prepare(
         'INSERT INTO transaction_timeline (id, transaction_id, type, content) VALUES (?, ?, ?, ?)'
       ).bind(crypto.randomUUID(), id, 'status_change', `Status changed to ${data.status}`).run()
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
    const lines = text.split('\n')
    const headers = lines[0].split(',').map(h => h.trim())
    const preview = lines.slice(1, 6).map(l => l.split(',').map(v => v.trim()))
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
  
    const queries = (data as any[]).map(row => {
      const description = row[(mapping as any)['description']]
      const amountStr = row[(mapping as any)['amount']]
      const date = row[(mapping as any)['date']]
    
    const amountCents = Math.round(parseFloat(String(amountStr).replace(/[^0-9.-]+/g, "")) * 100)
    
    return c.env.DB.prepare(
      'INSERT INTO transactions (id, household_id, account_id, description, amount_cents, transaction_date) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(crypto.randomUUID(), householdId, accountId, description, amountCents, date)
  })

  await c.env.DB.batch(queries)
  return c.json({ success: true, count: queries.length })
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

  await c.env.DB.prepare(
    'UPDATE transactions SET receipt_r2_key = ? WHERE id = ? AND household_id = ?'
  ).bind(key, id, householdId).run()

  return c.json({ success: true, key })
})

financials.get('/transactions/:id/receipt', async (c) => {
  const id = c.req.param('id')
  const householdId = c.get('householdId')
  
  const tx = await c.env.DB.prepare('SELECT receipt_r2_key FROM transactions WHERE id = ? AND household_id = ?').bind(id, householdId).first()
  if (!tx || !(tx as any).receipt_r2_key) return c.json({ error: 'Receipt not found' }, 404)

  const object = await c.env.ASSETS.get((tx as any).receipt_r2_key)
  if (!object) return c.json({ error: 'Object not found in R2' }, 404)

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)

  return new Response(object.body, { headers })
})

// Transfers
financials.post('/transfers', zValidator('json', TransferSchema), async (c) => {
  const householdId = c.get('householdId')
  const { from_account_id, to_account_id, amount_cents, description } = c.req.valid('json')
  
  const verify = await c.env.DB.prepare('SELECT id FROM accounts WHERE household_id = ? AND id IN (?, ?)').bind(householdId, from_account_id, to_account_id).all()
  if (verify.results.length < 2) throw new HTTPException(403, { message: 'One or more accounts unauthorized' })

  const id = crypto.randomUUID()
  
  await c.env.DB.prepare(
    'UPDATE accounts SET balance_cents = balance_cents - ? WHERE id = ? AND household_id = ?'
  ).bind(amount_cents, from_account_id, householdId).run()
  
  await c.env.DB.prepare(
    'UPDATE accounts SET balance_cents = balance_cents + ? WHERE id = ? AND household_id = ?'
  ).bind(amount_cents, to_account_id, householdId).run()
  
  c.executionCtx.waitUntil(dispatchWebhook(c, 'transfer.created', { id, from_account_id, to_account_id, amount_cents }, householdId))

  if (c.env.DISCORD_WEBHOOK_URL) {
    await fetch(c.env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `➡️ **New Transfer logged!**\n**Desc:** ${description}\n**Amount:** $${(amount_cents / 100).toFixed(2)}\n**From:** ${from_account_id}\n**To:** ${to_account_id}`
      })
    }).catch(err => console.error('Discord Webhook failed', err))
  }
  
  return c.json({ success: true, id })
})

// Buckets
financials.get('/buckets', async (c) => {
  const householdId = c.get('householdId')
  const { results } = await c.env.DB.prepare('SELECT * FROM savings_buckets WHERE household_id = ?').bind(householdId).all()
  return c.json(results)
})

export default financials
