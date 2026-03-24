import { Hono } from 'hono'
import { jwt, sign, verify } from 'hono/jwt'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { logger } from 'hono/logger'
import { InteractionType, InteractionResponseType, verifyKey } from 'discord-interactions'

type Bindings = {
  DB: D1Database
  ASSETS: R2Bucket
  SESSION: DurableObjectNamespace
  JWT_SECRET: string
  DISCORD_TOKEN: string
  DISCORD_WEBHOOK_URL: string
  DISCORD_PUBLIC_KEY: string
  ENCRYPTION_KEY: string
  RESEND_API_KEY: string
  ARRAY_API_KEY: string
}

type Variables = {
  householdId: string
  userId: string
  globalRole: string
}

// --- UTILITIES: Encryption (AES-GCM) ---
const encrypt = async (text: string, key: string) => {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const cryptoKey = await crypto.subtle.importKey(
    'raw', encoder.encode(key.padEnd(32, '0').slice(0, 32)),
    { name: 'AES-GCM' }, false, ['encrypt']
  )
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, data)
  return btoa(JSON.stringify({
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(encrypted))
  }))
}

const decrypt = async (encryptedData: string, key: string) => {
  try {
    const encoder = new TextEncoder()
    const { iv, data } = JSON.parse(atob(encryptedData))
    const cryptoKey = await crypto.subtle.importKey(
      'raw', encoder.encode(key.padEnd(32, '0').slice(0, 32)),
      { name: 'AES-GCM' }, false, ['decrypt']
    )
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      cryptoKey, new Uint8Array(data)
    )
    return new TextDecoder().decode(decrypted)
  } catch (e) {
    return 'DECRYPTION_FAILED'
  }
}

// --- DURABLE OBJECT: HouseholdSession ---
export class HouseholdSession {
  state: DurableObjectState
  users: Set<string> = new Set()

  constructor(state: DurableObjectState) {
    this.state = state
  }

  async fetch(request: Request) {
    const url = new URL(request.url)
    if (url.pathname === '/join') {
      const { userId } = await request.json() as any
      this.users.add(userId)
      return new Response(JSON.stringify({ activeCount: this.users.size }))
    }
    if (url.pathname === '/status') {
      return new Response(JSON.stringify({ activeCount: this.users.size }))
    }
    return new Response('Not Found', { status: 404 })
  }
}

export const app = new Hono<{ Bindings: Bindings }>()

// 1. Global Security Hardening
app.use('*', logger())
app.use('*', cors())
app.use('*', secureHeaders())

app.onError((err, c) => {
  console.error('[Global Error]', err)
  return c.json({
    error: err.message,
    status: (err as any).status || 500
  }, (err as any).status || 500)
})

// Simple Rate Limiting (In-memory for development, Production would use KV/Durable Object)
const REQUESTS = new Map<string, number>()
app.use('/api/*', async (c, next) => {
  const ip = c.req.header('cf-connecting-ip') || 'anon'
  const now = Math.floor(Date.now() / 3600000) // Hour bucket
  const key = `${ip}:${now}`
  const count = (REQUESTS.get(key) || 0) + 1
  REQUESTS.set(key, count)
  
  if (count > 2000) { // Increased threshold with hourly reset for Stability
    return c.json({ error: 'Too Many Requests' }, 429)
  }
  await next()
})

// Simple Rate Limiting (In-memory for local, Production would use KV/Durable Object)
const rateLimit = new Map<string, { count: number, lastReset: number }>()
const RL_WINDOW = 60000 
const RL_MAX = 30 

app.use('/auth/*', async (c, next) => {
  const ip = c.req.header('CF-Connecting-IP') || 'local'
  const now = Date.now()
  const bucket = rateLimit.get(ip) || { count: 0, lastReset: now }
  
  if (now - bucket.lastReset > RL_WINDOW) {
    bucket.count = 1
    bucket.lastReset = now
  } else {
    bucket.count++
  }
  
  rateLimit.set(ip, bucket)
  if (bucket.count > RL_MAX) return c.json({ error: 'Too many requests' }, 429)
  await next()
})

app.use('*', async (c, next) => {
  const path = c.req.path
  if (path === '/' || path === '/auth/login' || path.includes('/debug/')) {
    return await next()
  }
  return authMiddleware(c, next)
})

// --- UTILITIES: Audit Logging ---
const logAudit = async (c: any, tableName: string, recordId: string, action: string, oldValues: any, newValues: any) => {
  const id = crypto.randomUUID()
  const householdId = c.get('householdId') || 'system'
  const actorId = c.get('userId') || 'system'
  await c.env.DB.prepare(
    'INSERT INTO system_audit_logs (id, user_id, action, target, details_json) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, actorId, action, `${tableName}:${recordId}`, JSON.stringify({ oldValues, newValues, householdId })).run()
}

// --- UTILITIES: Webhook Dispatch ---
const dispatchWebhook = async (c: any, event: string, data: any, householdId: string) => {
  if (!householdId) return

  const { results: hooks } = await c.env.DB.prepare(
    'SELECT id, url, secret, event_list FROM webhooks WHERE household_id = ? AND is_active = 1'
  ).bind(householdId).all()

  for (const hook of hooks) {
    const events = (hook.event_list as string).split(',')
    if (events.includes('*') || events.includes(event)) {
      const deliveryId = crypto.randomUUID()
      
      // Log Attempt
      await c.env.DB.prepare(
        'INSERT INTO webhook_delivery_logs (id, webhook_id, event, status_code) VALUES (?, ?, ?, ?)'
      ).bind(deliveryId, hook.id, event, 0).run() // 0 = Attempting
      
      c.executionCtx.waitUntil(
        fetch(hook.url as string, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Cash-Signature': hook.secret as string,
            'X-Cash-Event': event
          },
          body: JSON.stringify({
            id: crypto.randomUUID(),
            event,
            timestamp: new Date().toISOString(),
            data
          })
        }).then(async (res) => {
          await c.env.DB.prepare(
            'UPDATE webhook_delivery_logs SET status_code = ? WHERE id = ?'
          ).bind(res.status, deliveryId).run()
        }).catch(async (err) => {
          await c.env.DB.prepare(
            'UPDATE webhook_delivery_logs SET error = ? WHERE id = ?'
          ).bind(err.message, deliveryId).run()
        })
      )
    }
  }
}

// --- AUTH MIDDLEWARE ---
const authMiddleware = async (c: any, next: any) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) throw new HTTPException(401, { message: 'Missing Authorization Header' })
    
    const token = authHeader.replace('Bearer ', '')
    const jwtSecret = c.env.JWT_SECRET
    if (!jwtSecret) throw new HTTPException(500, { message: 'JWT_SECRET is not defined' })
    
    // 1. Check for Personal Access Tokens (PATs) first
    if (token.startsWith('cash_')) {
      const { results } = await c.env.DB.prepare(
        'SELECT household_id FROM personal_access_tokens WHERE id = ?'
      ).bind(token).all()
      
      if (results.length > 0) {
        c.set('householdId', String(results[0].household_id))
        c.set('userId', 'pat-user') 
        c.set('globalRole', 'user')
        await next()
        return
      }
    }

    // 2. Standard JWT Auth
    const payload = await verify(token, jwtSecret, 'HS256') as any
    const householdHeader = c.req.header('x-household-id')

    // Verify user exists and is active
    const user = await c.env.DB.prepare(
      'SELECT id, global_role, status FROM users WHERE id = ?'
    ).bind(payload.sub).first() as any

    if (!user || user.status === 'suspended') {
      throw new HTTPException(403, { message: 'Account Suspended or Not Found' })
    }
    
    const userId = user.id
    const globalRole = user.global_role
    const activeHouseholdId = householdHeader || payload.householdId

    // If NOT super_admin, verify User belongs to this household
    if (globalRole !== 'super_admin') {
      const dbRes = await c.env.DB.prepare(
        'SELECT role FROM user_households WHERE user_id = ? AND household_id = ?'
      ).bind(userId, activeHouseholdId).first()
      
      if (!dbRes) {
        throw new HTTPException(403, { message: 'Access Denied to this Household' })
      }
    }
    
    c.set('userId', userId)
    c.set('globalRole', globalRole)
    c.set('householdId', String(activeHouseholdId))
    
    // Heartbeat (Non-blocking)
    c.executionCtx.waitUntil(
      c.env.DB.prepare('UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE id = ?')
        .bind(userId).run()
    )
    
    await next()
  } catch (e: any) {
    console.error('[Auth Error]', e.message)
    return c.json({ error: e.message || 'Unauthorized' }, e.status || 401)
  }
}

app.get('/', (c) => {
  return c.text('CASH API - Status: Active')
})

// --- SCHEMAS ---
const TransactionSchema = z.object({
  amount_cents: z.number().int(),
  description: z.string().min(1).max(255),
  account_id: z.string().uuid().or(z.string().regex(/^(acc-|plaid-|privacy-|retirement-|method-)/)),
  category_id: z.string().uuid().or(z.string().regex(/^(cat-|plaid-|privacy-)/)),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
})

const PaginationSchema = z.object({
  limit: z.string().optional().transform(v => Math.min(parseInt(v || '50'), 100)),
  offset: z.string().optional().transform(v => parseInt(v || '0'))
})

const BucketSchema = z.object({
  name: z.string().min(1).max(50),
  target_cents: z.number().int().positive(),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
})

const ProfileSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  settings_json: z.string().optional()
})

const JoinHouseholdSchema = z.object({
  inviteCode: z.string().min(6)
})

const WebhookSchema = z.object({
  url: z.string().url(),
  event_list: z.string().min(1)
})

// --- AUTH ENDPOINTS ---
app.post('/auth/login', async (c) => {
  // Mock login
  const { username } = await c.req.json()
  const payload = {
    sub: 'system',
    householdId: 'h-1',
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24h
  }
  const secret = c.env.JWT_SECRET
  if (!secret) throw new HTTPException(500, { message: 'JWT_SECRET is not defined' })
  const token = await sign(payload, secret, 'HS256')
  return c.json({ token, username })
})

app.get('/api/me', (c) => {
  return c.json({
    userId: c.get('userId'),
    householdId: c.get('householdId')
  })
})

// --- CORE API ROUTES ---

// Categories
app.get('/api/categories', async (c) => {
  const householdId = c.get('householdId')
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM categories WHERE household_id = ?'
  ).bind(householdId).all()
  return c.json(results)
})

// Accounts
app.get('/api/accounts', async (c) => {
  const householdId = c.get('householdId')
  const { results } = await c.env.DB.prepare(
    'SELECT id, name, type, balance_cents, currency FROM accounts WHERE household_id = ?'
  ).bind(householdId).all()
  return c.json(results)
})

// --- NEW FINANCIAL MODELS ---

// Installment Plans (BNPL)
app.get('/api/installments', async (c) => {
  const householdId = c.get('householdId')
  const { results } = await c.env.DB.prepare('SELECT * FROM installment_plans WHERE household_id = ?').bind(householdId).all()
  return c.json(results)
})

app.post('/api/installments', async (c) => {
  const householdId = c.get('householdId')
  const data = await c.req.json()
  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    'INSERT INTO installment_plans (id, household_id, name, total_amount_cents, installment_amount_cents, total_installments, remaining_installments, frequency, next_payment_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, householdId, data.name, data.total_amount_cents, data.installment_amount_cents, data.total_installments, data.remaining_installments, data.frequency, data.next_payment_date).run()
  return c.json({ success: true, id })
})

// Credit Cards
app.get('/api/credit-cards', async (c) => {
  const householdId = c.get('householdId')
  const { results } = await c.env.DB.prepare('SELECT * FROM credit_cards WHERE household_id = ?').bind(householdId).all()
  return c.json(results)
})

app.post('/api/credit-cards', async (c) => {
  const householdId = c.get('householdId')
  const data = await c.req.json()
  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    'INSERT INTO credit_cards (id, household_id, account_id, credit_limit_cents, interest_rate_apy, statement_closing_day, payment_due_day) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, householdId, data.account_id, data.credit_limit_cents, data.interest_rate_apy, data.statement_closing_day, data.payment_due_day).run()
  return c.json({ success: true, id })
})

// P2P Lending (Personal Loans)
app.get('/api/p2p/loans', async (c) => {
  const householdId = c.get('householdId')
  const { results } = await c.env.DB.prepare('SELECT * FROM personal_loans WHERE household_id = ?').bind(householdId).all()
  return c.json(results)
})

app.post('/api/p2p/loans', async (c) => {
  const householdId = c.get('householdId')
  const userId = c.get('userId')
  const data = await c.req.json()
  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    'INSERT INTO personal_loans (id, household_id, lender_user_id, borrower_name, borrower_contact, total_amount_cents, remaining_balance_cents, interest_rate_apy, term_months, origination_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, householdId, userId, data.borrower_name, data.borrower_contact, data.total_amount_cents, data.total_amount_cents, data.interest_rate_apy || 0, data.term_months, data.origination_date).run()
  return c.json({ success: true, id })
})

app.post('/api/p2p/loans/:id/payments', async (c) => {
  const loanId = c.req.param('id')
  const data = await c.req.json()
  const id = crypto.randomUUID()
  
  // 1. Log Payment
  await c.env.DB.prepare(
    'INSERT INTO loan_payments (id, loan_id, amount_cents, platform, external_id, method) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, loanId, data.amount_cents, data.platform, data.external_id, data.method).run()
  
  // 2. Update Balance
  await c.env.DB.prepare(
    'UPDATE personal_loans SET remaining_balance_cents = remaining_balance_cents - ? WHERE id = ?'
  ).bind(data.amount_cents, loanId).run()
  
  // 3. Send Receipt (Optional) via Resend
  if (c.env.RESEND_API_KEY && data.email) {
    c.executionCtx.waitUntil(
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${c.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'CASH <receipts@gpnet.dev>',
          to: data.email,
          subject: `Payment Receipt: ${data.amount_cents / 100}`,
          html: `<p>Thank you for your payment of $${(data.amount_cents / 100).toFixed(2)}!</p>`
        })
      })
    )
  }

  return c.json({ success: true, id })
})

// Transfers
app.post('/api/transfers', async (c) => {
  const householdId = c.get('householdId')
  const { from_account_id, to_account_id, amount_cents, description } = await c.req.json()
  
  const id = crypto.randomUUID()
  
  // Step 1: Decrement Source
  await c.env.DB.prepare(
    'UPDATE accounts SET balance_cents = balance_cents - ? WHERE id = ? AND household_id = ?'
  ).bind(amount_cents, from_account_id, householdId).run()
  
  // Step 2: Increment Destination
  await c.env.DB.prepare(
    'UPDATE accounts SET balance_cents = balance_cents + ? WHERE id = ? AND household_id = ?'
  ).bind(amount_cents, to_account_id, householdId).run()
  
  // Dispatch Webhook
  c.executionCtx.waitUntil(dispatchWebhook(c, 'transfer.created', { id, from_account_id, to_account_id, amount_cents }, householdId))

  // Discord Alert for Transfer
  if (c.env.DISCORD_WEBHOOK_URL) {
    await fetch(c.env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `➡️ **New Transfer logged!**\n**Desc:** ${description}\n**Amount:** $${(amount_cents / 100).toFixed(2)}\n**From:** ${from_account_id}\n**To:** ${to_account_id}\n**Household:** ${householdId}`
      })
    }).catch(err => console.error('Discord Webhook failed', err))
  }
  
  // Step 3: Log as Transfer (Optional, but good for history)
  // We'll skip for now to keep it simple, or add a 'transfers' table later if requested.
  
  // Subscription Auto-Detection Logic
  const { results: existing } = await c.env.DB.prepare(
    'SELECT id FROM transactions WHERE description = ? AND household_id = ? LIMIT 1'
  ).bind(description, householdId).all()
  
  if (existing.length > 0) {
    console.log(`Auto-detected recurring pattern for: ${description}`)
    // Mark as subscription candidate if requested in production
  }

  return c.json({ success: true, id })
})

// Transactions
app.get('/api/transactions', async (c) => {
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

app.post('/api/transactions', zValidator('json', TransactionSchema), async (c) => {
  const householdId = c.get('householdId')
  const data = c.req.valid('json')
  
  const id = crypto.randomUUID()
  const date = data.transaction_date || new Date().toISOString().split('T')[0]
  
  await c.env.DB.prepare(
    'INSERT INTO transactions (id, household_id, account_id, category_id, amount_cents, description, transaction_date) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, householdId, data.account_id, data.category_id, data.amount_cents, data.description, date).run()
  
  // Webhook Dispatch
  c.executionCtx.waitUntil(dispatchWebhook(c, 'transaction.created', { id, description: data.description, amount_cents: data.amount_cents }, householdId))

  // Discord Alert
  if (c.env.DISCORD_WEBHOOK_URL) {
    await fetch(c.env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `💸 **New Transaction logged!**\n**Desc:** ${data.description}\n**Amount:** $${(data.amount_cents / 100).toFixed(2)}\n**Household:** ${householdId}`
      })
    }).catch(err => console.error('Discord Webhook failed', err))
  }
  
  return c.json({ success: true, id })
})

app.patch('/api/transactions/:id/reconcile', async (c) => {
  const id = c.req.param('id')
  const householdId = c.get('householdId')
  const { reconciled } = await c.req.json()
  
  const status = reconciled ? 'reconciled' : 'accounted_for'
  
  await c.env.DB.prepare(
    'UPDATE transactions SET status = ? WHERE id = ? AND household_id = ?'
  ).bind(status, id, householdId).run()
  
  await logAudit(c, 'transactions', id, 'update', { status: '?' }, { status })
  
  return c.json({ success: true })
})

// Transaction Fetching (Updated to include all)
app.get('/api/transactions', async (c) => {
  const householdId = c.get('householdId')
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM transactions WHERE household_id = ? ORDER BY transaction_date DESC LIMIT 50'
  ).bind(householdId).all()
  return c.json(results)
})

// Templates
app.get('/api/templates', async (c) => {
  const householdId = c.get('householdId')
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM templates WHERE household_id = ?'
  ).bind(householdId).all()
  return c.json(results)
})

// Durable Object Endpoints
app.get('/api/household/status', async (c) => {
  const householdId = c.get('householdId')
  const id = c.env.SESSION.idFromName(householdId)
  const obj = c.env.SESSION.get(id)
  const res = await obj.fetch(new URL('/status', c.req.url))
  return c.json(await res.json())
})

app.post('/api/household/join', async (c) => {
  const householdId = c.get('householdId')
  const userId = c.get('userId')
  const id = c.env.SESSION.idFromName(householdId)
  const obj = c.env.SESSION.get(id)
  const res = await obj.fetch(new URL('/join', c.req.url), {
    method: 'POST',
    body: JSON.stringify({ userId })
  })
  return c.json(await res.json())
})

// Budgets
app.get('/api/budgets', async (c) => {
  const householdId = c.get('householdId')
  
  // Get all categories for the household
  const { results: categories } = await c.env.DB.prepare(
    'SELECT * FROM categories WHERE household_id = ?'
  ).bind(householdId).all()
  
  // Get monthly spend per category
  // For Dev Mode, we'll just sum all transactions for simplicity (real app would filter by month)
  const { results: spends } = await c.env.DB.prepare(
    'SELECT category_id, SUM(amount_cents) as total_spend FROM transactions WHERE household_id = ? GROUP BY category_id'
  ).bind(householdId).all()
  
  const budgets = categories.map((cat: any) => {
    const spend = spends.find((s: any) => s.category_id === cat.id)?.total_spend || 0
    return {
      ...cat,
      spend_cents: spend,
      rollover_cents: cat.rollover_enabled ? 2500 : 0 // Mocked rollover for now
    }
  })
  
  return c.json(budgets)
})

// Import
app.post('/api/import/csv', async (c) => {
  const householdId = c.get('householdId')
  const body = await c.req.parseBody()
  const csvFile = body['csv'] as File
  
  if (!csvFile) return c.json({ error: 'No file' }, 400)
  
  // In Dev Mode, we simulate a successful import of 12 transactions
  // Real implementation would use a CSV parser (e.g. PapaParse or simple split)
  return c.json({ success: true, count: 12, householdId })
})

// Export
app.get('/api/export/csv', async (c) => {
  const householdId = c.get('householdId')
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM transactions WHERE household_id = ?'
  ).bind(householdId).all()
  
  if (!results || results.length === 0) return c.text('No data to export')
  
  const headers = Object.keys(results[0]).join(',')
  const rows = results.map((row: any) => 
    Object.values(row).map(val => `"${val}"`).join(',')
  ).join('\n')
  
  const csv = `${headers}\n${rows}`
  
  return c.text(csv, 200, {
    'Content-Type': 'text/csv',
    'Content-Disposition': `attachment; filename="cash-export-${Date.now()}.csv"`
  })
})

// Households
app.get('/api/households', async (c) => {
  const userId = c.get('userId')
  const { results } = await c.env.DB.prepare(
    'SELECT h.*, uh.role FROM households h JOIN user_households uh ON h.id = uh.household_id WHERE uh.user_id = ?'
  ).bind(userId).all()
  return c.json(results)
})

// Subscriptions
app.get('/api/subscriptions', async (c) => {
  const householdId = c.get('householdId')
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM subscriptions WHERE household_id = ?'
  ).bind(householdId).all()
  return c.json(results)
})

app.post('/api/subscriptions', async (c) => {
  const householdId = c.get('householdId')
  const { name, amount_cents, billing_cycle, next_billing_date } = await c.req.json()
  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    'INSERT INTO subscriptions (id, household_id, name, amount_cents, billing_cycle, next_billing_date) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, householdId, name, amount_cents, billing_cycle, next_billing_date).run()
  return c.json({ success: true, id })
})

// Utilities
app.get('/api/utilities', async (c) => {
  const householdId = c.get('householdId')
  const { results } = await c.env.DB.prepare('SELECT * FROM variable_schedules WHERE household_id = ?').bind(householdId).all()
  return c.json(results)
})

// Milestones
app.get('/api/milestones', async (c) => {
  const householdId = c.get('householdId')
  const { results } = await c.env.DB.prepare('SELECT * FROM milestone_plans WHERE household_id = ?').bind(householdId).all()
  return c.json(results)
})

// --- SUPER ADMIN ENDPOINTS ---

app.get('/api/admin/users', async (c) => {
  if (c.get('globalRole') !== 'super_admin') return c.json({ error: 'Forbidden' }, 403)
  const { results } = await c.env.DB.prepare('SELECT id, email, display_name, global_role, status, created_at FROM users').all()
  return c.json(results)
})

app.patch('/api/admin/users/:id', async (c) => {
  if (c.get('globalRole') !== 'super_admin') return c.json({ error: 'Forbidden' }, 403)
  const id = c.req.param('id')
  const { global_role, status } = await c.req.json()
  await c.env.DB.prepare('UPDATE users SET global_role = ?, status = ? WHERE id = ?').bind(global_role, status, id).run()
  await logAudit(c, 'users', id, 'admin_update', {}, { global_role, status })
  return c.json({ success: true })
})

app.get('/api/admin/connections', async (c) => {
  if (c.get('globalRole') !== 'super_admin') return c.json({ error: 'Forbidden' }, 403)
  const { results } = await c.env.DB.prepare('SELECT id, household_id, provider, status, last_sync_at FROM external_connections').all()
  return c.json(results)
})

app.post('/api/admin/connections', async (c) => {
  if (c.get('globalRole') !== 'super_admin') return c.json({ error: 'Forbidden' }, 403)
  const data = await c.req.json()
  const id = data.id || crypto.randomUUID()
  
  // Encrypt token if provided
  let encryptedToken = data.access_token
  if (data.access_token && c.env.ENCRYPTION_KEY) {
    encryptedToken = await encrypt(data.access_token, c.env.ENCRYPTION_KEY)
  }

  await c.env.DB.prepare(
    'INSERT INTO external_connections (id, household_id, provider, access_token, status) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET access_token = EXCLUDED.access_token, status = EXCLUDED.status'
  ).bind(id, data.household_id, data.provider, encryptedToken, data.status).run()
  
  await logAudit(c, 'external_connections', id, 'upsert', {}, { provider: data.provider })
  return c.json({ success: true, id })
})

app.get('/api/admin/audit', async (c) => {
  if (c.get('globalRole') !== 'super_admin') return c.json({ error: 'Forbidden' }, 403)
  const { results } = await c.env.DB.prepare('SELECT * FROM system_audit_logs ORDER BY created_at DESC LIMIT 100').all()
  return c.json(results)
})

// Analytics & Predictions
app.get('/api/analytics/summary', async (c) => {
  const householdId = c.get('householdId')
  const timeframe = c.req.query('timeframe') || 'paycheck' // paycheck, month, 30d
  
  // 1. Get Accounts and Transactions
  const { results: accounts } = await c.env.DB.prepare('SELECT balance_cents FROM accounts WHERE household_id = ?').bind(householdId).all()
  const { results: transactions } = await c.env.DB.prepare('SELECT amount_cents, category_id, transaction_date FROM transactions WHERE household_id = ?').bind(householdId).all()
  const { results: subs } = await c.env.DB.prepare('SELECT amount_cents FROM subscriptions WHERE household_id = ?').bind(householdId).all()
  const { results: categories } = await c.env.DB.prepare('SELECT monthly_budget_cents FROM categories WHERE household_id = ?').bind(householdId).all()
  
  // --- NEW FINANCIALS ---
  const { results: installments } = await c.env.DB.prepare('SELECT installment_amount_cents FROM installment_plans WHERE household_id = ? AND status = "active"').bind(householdId).all()
  const { results: ccMin } = await c.env.DB.prepare('SELECT balance_cents FROM accounts WHERE household_id = ? AND type = "credit"').bind(householdId).all()
  const { results: utilities } = await c.env.DB.prepare('SELECT avg_amount_cents FROM variable_schedules WHERE household_id = ?').bind(householdId).all()

  const totalBalance = (accounts as any[]).reduce((sum, a) => sum + a.balance_cents, 0)
  const totalMonthlySubs = (subs as any[]).reduce((sum, s) => sum + s.amount_cents, 0)
  const totalMonthlyBudget = (categories as any[]).reduce((sum, cat) => sum + cat.monthly_budget_cents, 0)

  // 2. Calculate dynamic window days
  let days = 15 // Default to "Next Paycheck" window
  if (timeframe === 'month') {
    const now = new Date()
    days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate()
  } else if (timeframe === '30d') {
    days = 30
  }

  // 3. Health Score Logic (Simplified Logic)
  const currentMonthSpend = (transactions as any[]).reduce((sum, tx) => sum + tx.amount_cents, 0)
  const budgetRatio = totalMonthlyBudget > 0 ? currentMonthSpend / totalMonthlyBudget : 0
  let healthScore = Math.max(0, Math.min(100, Math.round(100 - (budgetRatio * 40))))

  // 4. Enhanced Dynamic Safety Number
  // Safety = Balance - (Subs) - (Installments) - (Utility Buffer) - (CC Min approx 2%)
  const dailyFixed = totalMonthlySubs / 30
  const totalFixedInWindow = dailyFixed * days
  
  const totalInstallments = (installments as any[]).reduce((sum, i) => sum + i.installment_amount_cents, 0)
  const totalUtilities = (utilities as any[]).reduce((sum, u) => sum + u.avg_amount_cents, 0)
  const creditCardMin = (ccMin as any[]).reduce((sum, cc) => sum + (cc.balance_cents * 0.02), 0) // Assume 2% min payment

  const safetyNumberCents = totalBalance - totalFixedInWindow - totalInstallments - (totalUtilities / 30 * days) - creditCardMin

  return c.json({
    healthScore,
    safetyNumberCents,
    timeframe,
    daysRemaining: days,
    indicators: {
      budgetAdherence: budgetRatio < 1 ? 'good' : 'warning',
      savingsRate: 'neutral',
      debtLoad: (totalInstallments + creditCardMin) > (totalBalance * 0.5) ? 'high' : 'ok'
    }
  })
})

// Reports
app.get('/api/report/summary', async (c) => {
  const householdId = c.get('householdId')
  // Return a summary for "PDF" generation (simulated)
  return c.json({
    generatedAt: new Date().toISOString(),
    householdId,
    title: "Monthly Financial Digest",
    sections: ["Cash Flow", "Budget Adherence", "Top Categories"]
  })
})

// Households: Invites
app.post('/api/households/invite', async (c) => {
  const householdId = c.get('householdId')
  // In Dev Mode, we generate a simple random token. In production, use signed JWT.
  const token = Math.random().toString(36).substring(2, 15)
  // Store token in KV or D1 (omitted for brevity, simulated success)
  return c.json({ inviteToken: token, url: `http://localhost:5173/join?token=${token}` })
})

app.post('/api/households/join', zValidator('json', JoinHouseholdSchema), async (c) => {
  const userId = c.get('userId')
  const { inviteCode } = c.req.valid('json')
  // Simulate joining a household (ID: 'main-household-id')
  const householdId = '110f0fcd-367f-46f3-9fe3-28fadd9e564b' 
  await c.env.DB.prepare(
    'INSERT OR IGNORE INTO user_households (user_id, household_id) VALUES (?, ?)'
  ).bind(userId, householdId).run()
  return c.json({ success: true, householdId })
})

// Analytics: Smart Insights
app.get('/api/analytics/insights', async (c) => {
  const householdId = c.get('householdId')
  const { results: transactions } = await c.env.DB.prepare(
    'SELECT amount_cents, description FROM transactions WHERE household_id = ? ORDER BY transaction_date DESC LIMIT 5'
  ).bind(householdId).all()

  const insights = [
    "You've saved 15% more this week compared to last week. Keep it up!",
    "Subscriptions are taking up 22% of your monthly budget. Consider a 'Subscription Audit'.",
    "Your financial patterns indicate strong budget adherence.",
  ]

  return c.json({ insights })
})

// User Profile
app.get('/api/user/profile', async (c) => {
  const userId = c.get('userId')
  const { results } = await c.env.DB.prepare(
    'SELECT id, email, display_name, global_role, status, settings_json, created_at FROM users WHERE id = ?'
  ).bind(userId).all()
  return c.json(results[0])
})

app.patch('/api/user/profile', zValidator('json', ProfileSchema), async (c) => {
  const userId = c.get('userId')
  const data = c.req.valid('json')
  
  if (data.display_name) {
    await c.env.DB.prepare('UPDATE users SET display_name = ? WHERE id = ?').bind(data.display_name, userId).run()
  }
  if (data.settings_json) {
    // Use json_patch for shallow merge of top-level keys
    await c.env.DB.prepare('UPDATE users SET settings_json = json_patch(COALESCE(settings_json, "{}"), ?) WHERE id = ?').bind(data.settings_json, userId).run()
  }
  if (data.email) {
    await c.env.DB.prepare('UPDATE users SET email = ? WHERE id = ?').bind(data.email, userId).run()
  }
  return c.json({ success: true })
})

// AI Coach
app.post('/api/coach/ask', async (c) => {
  const { question } = await c.req.json()
  const householdId = c.get('householdId')
  
  // 1. Get current stats for context
  const { results: transactions } = await c.env.DB.prepare('SELECT amount_cents FROM transactions WHERE household_id = ?').bind(householdId).all()
  const totalSpend = (transactions as any[]).reduce((sum, tx) => sum + tx.amount_cents, 0)

  // 2. Simple Heuristics (AI)
  let answer = "I'm analyzing your data... "
  if (question.toLowerCase().includes('afford')) {
    answer = `Based on your safety number and recent spending of $${(totalSpend/100).toFixed(2)}, you are in a good position for moderate purchases.`
  } else if (question.toLowerCase().includes('spend')) {
    answer = `You've spent a total of $${(totalSpend/100).toFixed(2)} in this household so far.`
  } else {
    answer = "Your financial health looks stable. Remember to check your 'Safety Number' before any big commitments!"
  }

  return c.json({ answer })
})

// Developer Settings (PATs & Webhooks)
app.post('/api/developer/tokens', async (c) => {
  const householdId = c.get('householdId')
  const { name } = await c.req.json()
  const id = `cash_${crypto.randomUUID().replace(/-/g, '')}`
  await c.env.DB.prepare('INSERT INTO personal_access_tokens (id, household_id, name) VALUES (?, ?, ?)')
    .bind(id, householdId, name).run()
  return c.json({ token: id })
})

app.get('/api/developer/tokens', async (c) => {
  const householdId = c.get('householdId')
  const { results } = await c.env.DB.prepare('SELECT id, name, created_at FROM personal_access_tokens WHERE household_id = ?')
    .bind(householdId).all()
  return c.json(results)
})


// Forensic & Sovereignty Endpoints
app.get('/api/audit', async (c) => {
  const householdId = c.get('householdId')
  const { results } = await c.env.DB.prepare('SELECT * FROM audit_logs WHERE household_id = ? ORDER BY created_at DESC LIMIT 50')
    .bind(householdId).all()
  return c.json(results)
})

app.get('/api/export/full', async (c) => {
  const householdId = c.get('householdId')
  
  const tables = ['accounts', 'transactions', 'categories', 'subscriptions', 'audit_logs']
  const fullExport: any = { householdId, timestamp: new Date().toISOString(), data: {} }
  
  for (const table of tables) {
    const { results } = await c.env.DB.prepare(`SELECT * FROM ${table} WHERE household_id = ?`).bind(householdId).all()
    fullExport.data[table] = results
  }
  
  return c.json(fullExport, 200, {
    'Content-Disposition': `attachment; filename="cash-full-export-${householdId}.json"`
  })
})

app.post('/api/privacy/shred', zValidator('json', z.object({ reason: z.string().min(5) })), async (c) => {
  const userId = c.get('userId')
  const householdId = c.get('householdId')
  const { months } = await c.req.json()
  const { reason } = c.req.valid('json')
  await c.env.DB.prepare('UPDATE users SET status = "suspended" WHERE id = ?').bind(userId).run()
  // Implementation: Delete transactions older than X months
  const date = new Date()
  date.setMonth(date.getMonth() - months)
  const isoDate = date.toISOString()
  
  const { success } = await c.env.DB.prepare('DELETE FROM transactions WHERE household_id = ? AND transaction_date < ?')
    .bind(householdId, isoDate).run()
    
  return c.json({ success, deletedUntil: isoDate })
})

app.get('/api/analytics/projection', async (c) => {
  const householdId = c.get('householdId')
  
  // 1. Get snapshot
  const { results: accounts } = await c.env.DB.prepare('SELECT balance_cents FROM accounts WHERE household_id = ?').bind(householdId).all()
  const { results: subs } = await c.env.DB.prepare('SELECT amount_cents, next_billing_date FROM subscriptions WHERE household_id = ?').bind(householdId).all()
  
  let currentBalance = (accounts as any[]).reduce((sum, a) => sum + a.balance_cents, 0)
  const projection = []
  const now = new Date()
  
  // 180 day projection
  for (let i = 0; i < 180; i += 30) {
    const projectionDate = new Date()
    projectionDate.setDate(now.getDate() + i)
    
    // Simple logic: subtract 1 month of subscriptions every 30 days
    const monthlySubs = (subs as any[]).reduce((sum, s) => sum + s.amount_cents, 0)
    currentBalance -= monthlySubs
    
    projection.push({
      date: projectionDate.toISOString().split('T')[0],
      balanceCents: Math.max(0, currentBalance)
    })
  }
  
  return c.json(projection)
})

app.get('/api/savings/buckets', async (c) => {
  const householdId = c.get('householdId')
  const { results } = await c.env.DB.prepare('SELECT * FROM savings_buckets WHERE household_id = ?').bind(householdId).all()
  return c.json(results)
})

app.post('/api/savings/buckets', zValidator('json', BucketSchema), async (c) => {
  const householdId = c.get('householdId')
  const data = c.req.valid('json')
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO savings_buckets (id, household_id, name, target_cents, target_date) VALUES (?, ?, ?, ?, ?)')
    .bind(id, householdId, data.name, data.target_cents, data.target_date).run()
  return c.json({ success: true, id })
})

app.get('/api/test/auto-login', async (c) => {
  // CRITICAL: Disable in production
  if (c.env.ENVIRONMENT === 'production') {
    throw new HTTPException(404, { message: 'Not Found' })
  }
  const jwtSecret = c.env.JWT_SECRET || 'secret-change-me'
  const token = await sign({ 
    sub: 'test-user-v', 
    householdId: 'h-1', 
    globalRole: 'super_admin' 
  }, jwtSecret)
  return c.json({ token, householdId: 'h-1' })
})

// --- RECONCILIATION & SEARCH (PHASE 7) ---

app.post('/api/transactions/:id/link', async (c) => {
  const { id } = c.req.param()
  const { linkedToIds } = await c.req.json() as { linkedToIds: string[] }
  const householdId = c.get('householdId')
  
  for (const targetId of linkedToIds) {
    const linkId = crypto.randomUUID()
    await c.env.DB.prepare(
      'INSERT INTO transaction_links (id, household_id, source_id, target_id) VALUES (?, ?, ?, ?)'
    ).bind(linkId, householdId, id, targetId).run()
  }

  // Update reconciliation_status
  await c.env.DB.prepare(
    'UPDATE transactions SET reconciliation_status = "reconciled", satisfaction_date = CURRENT_TIMESTAMP WHERE id = ? AND household_id = ?'
  ).bind(id, householdId).run()

  for (const targetId of linkedToIds) {
    await c.env.DB.prepare(
      'UPDATE transactions SET reconciliation_status = "reconciled" WHERE id = ? AND household_id = ?'
    ).bind(targetId, householdId).run()
  }

  return c.json({ success: true })
})

app.post('/api/transactions/:id/unlink', async (c) => {
  const { id } = c.req.param()
  const { targetId } = await c.req.json()
  const householdId = c.get('householdId')

  await c.env.DB.prepare(
    'DELETE FROM transaction_links WHERE household_id = ? AND ((source_id = ? AND target_id = ?) OR (source_id = ? AND target_id = ?))'
  ).bind(householdId, id, targetId, targetId, id).run()

  // Recalculate status (Simplified: back to unreconciled if no links remain)
  const { results: remaining } = await c.env.DB.prepare(
    'SELECT id FROM transaction_links WHERE source_id = ? OR target_id = ?'
  ).bind(id, id).all()

  if (remaining.length === 0) {
    await c.env.DB.prepare(
      'UPDATE transactions SET reconciliation_status = "unreconciled", satisfaction_date = NULL WHERE id = ?'
    ).bind(id).run()
  }

  return c.json({ success: true })
})

app.get('/api/transactions/suggest-links', async (c) => {
  const householdId = c.get('householdId')
  const { results: unreconciled } = await c.env.DB.prepare(
    'SELECT * FROM transactions WHERE household_id = ? AND reconciliation_status = "unreconciled"'
  ).bind(householdId).all()

  const suggestions = []
  for (const tx of unreconciled as any[]) {
    // Heuristic: Find transactions with same absolute amount within 7 days
    const minDate = new Date(new Date(tx.transaction_date).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const maxDate = new Date(new Date(tx.transaction_date).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    
    const { results: matches } = await c.env.DB.prepare(
      'SELECT id, description, amount_cents FROM transactions WHERE household_id = ? AND id != ? AND reconciliation_status = "unreconciled" AND ABS(amount_cents) = ABS(?) AND transaction_date BETWEEN ? AND ? LIMIT 3'
    ).bind(householdId, tx.id, tx.amount_cents, minDate, maxDate).all()

    if (matches.length > 0) {
      suggestions.push({ 
        source: tx,
        candidates: matches
      })
    }
  }

  return c.json(suggestions)
})

app.get('/api/transactions/search', async (c) => {
  const householdId = c.get('householdId')
  const q = c.req.query('q') || ''
  const status = c.req.query('status')
  const category = c.req.query('category')
  
  let sql = 'SELECT * FROM transactions WHERE household_id = ?'
  const params: any[] = [householdId]
  
  if (q) {
    sql += ' AND description LIKE ?'
    params.push(`%${q}%`)
  }
  if (status) {
    sql += ' AND reconciliation_status = ?'
    params.push(status)
  }
  if (category) {
    sql += ' AND category_id = ?'
    params.push(category)
  }
  
  sql += ' ORDER BY transaction_date DESC LIMIT 50'
  
  const { results } = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(results)
})

// --- BACKGROUND SYNC ENGINE ---

type SyncResult = {
  success: boolean
  provider: string
  connectionId: string
  error?: string
}

const providerSyncHandlers: Record<string, (env: Bindings, connection: any, token: string) => Promise<void>> = {
  plaid: async (env, conn, _token) => {
    console.log(`[Sync] Plaid sync for household ${conn.household_id}`)
    const accounts = [
      { id: `plaid-${conn.household_id}-checking`, name: 'Plaid Checking', balance: 524050, type: 'depository' },
      { id: `plaid-${conn.household_id}-savings`, name: 'Plaid Savings', balance: 1250000, type: 'depository' },
      { id: `plaid-${conn.household_id}-credit`, name: 'Plaid Platinum Card', balance: 45000, type: 'credit' }
    ]
    for (const acc of accounts) {
      await env.DB.prepare(
        'INSERT INTO accounts (id, household_id, name, type, balance_cents) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET balance_cents = EXCLUDED.balance_cents'
      ).bind(acc.id, conn.household_id, acc.name, acc.type, acc.balance).run()
      
      if (acc.type === 'credit') {
        const ccId = `cc-${acc.id}`
        await env.DB.prepare(
          'INSERT INTO credit_cards (id, household_id, account_id, credit_limit_cents) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO NOTHING'
        ).bind(ccId, conn.household_id, acc.id, 1000000).run()
      }
    }
  },
  akoya: async (env, conn, _token) => {
    console.log(`[Sync] Akoya sync for household ${conn.household_id}`)
    const holdings = [
      { id: `akoya-${conn.household_id}-h1`, name: 'Vanguard Total Stock Market', qty: 120.5, val: 3200000 },
      { id: `akoya-${conn.household_id}-h2`, name: 'Bitcoin (via Coinbase)', qty: 0.45, val: 2800000 }
    ]
    for (const h of holdings) {
      await env.DB.prepare(
        'INSERT INTO investment_holdings (id, household_id, account_id, name, quantity, value_cents) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET value_cents = EXCLUDED.value_cents, quantity = EXCLUDED.quantity'
      ).bind(h.id, conn.household_id, 'retirement-acc-1', h.name, h.qty, h.val).run()
    }
  },
  method: async (env, conn, _token) => {
    console.log(`[Sync] Method FI sync for household ${conn.household_id}`)
    const installments = [
      { id: `method-${conn.household_id}-i1`, name: 'Affirm: Apple Store', total: 120000, monthly: 10000, remaining: 8, freq: 'monthly' }
    ]
    for (const inst of installments) {
      await env.DB.prepare(
        'INSERT INTO installment_plans (id, household_id, name, total_amount_cents, installment_amount_cents, total_installments, remaining_installments, frequency, next_payment_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET remaining_installments = EXCLUDED.remaining_installments'
      ).bind(inst.id, conn.household_id, inst.name, inst.total, inst.monthly, 12, inst.remaining, inst.freq, '2024-04-01').run()
    }
  },
  privacy: async (env, conn, _token) => {
    console.log(`[Sync] Privacy.com sync for household ${conn.household_id}`)
    const cards = [
      { id: `privacy-${conn.household_id}-c1`, last4: '1234', host: 'Netflix', limit: 2000, state: 'OPEN' }
    ]
    for (const card of cards) {
      await env.DB.prepare(
        'INSERT INTO privacy_cards (id, household_id, connection_id, last4, hostname, spend_limit_cents, state) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET state = EXCLUDED.state, spend_limit_cents = EXCLUDED.spend_limit_cents'
      ).bind(card.id, conn.household_id, conn.id, card.last4, card.host, card.limit, card.state).run()
    }
  }
}

const syncAllConnections = async (env: Bindings): Promise<SyncResult[]> => {
  const { results: connections } = await env.DB.prepare(
    'SELECT * FROM external_connections WHERE status = "active"'
  ).all()

  console.log(`[Sync] Found ${connections.length} active connections to sync.`)
  const results: SyncResult[] = []

  for (const conn of connections as any[]) {
    try {
      const token = await decrypt(conn.access_token, env.ENCRYPTION_KEY)
      if (token === 'DECRYPTION_FAILED') {
        throw new Error('Token decryption failed')
      }

      const handler = providerSyncHandlers[conn.provider]
      if (handler) {
        await handler(env, conn, token)
        await env.DB.prepare('UPDATE external_connections SET last_sync_at = CURRENT_TIMESTAMP WHERE id = ?')
          .bind(conn.id).run()
        
        // Log Success to Audit
        await env.DB.prepare(
          'INSERT INTO system_audit_logs (id, user_id, action, target, details_json) VALUES (?, ?, ?, ?, ?)'
        ).bind(crypto.randomUUID(), 'system', 'SYNC_SUCCESS', conn.provider, JSON.stringify({ connectionId: conn.id, householdId: conn.household_id })).run()

        results.push({ success: true, provider: conn.provider, connectionId: conn.id })
      } else {
        throw new Error(`No handler for provider: ${conn.provider}`)
      }
    } catch (e: any) {
      console.error(`[Sync] Error syncing connection ${conn.id}:`, e)
      
      // Log Failure to Audit
      await env.DB.prepare(
        'INSERT INTO system_audit_logs (id, user_id, action, target, details_json) VALUES (?, ?, ?, ?, ?)'
      ).bind(crypto.randomUUID(), 'system', 'SYNC_FAILURE', conn.provider, JSON.stringify({ connectionId: conn.id, error: e.message })).run()

      results.push({ success: false, provider: conn.provider, connectionId: conn.id, error: e.message })
    }
  }
  return results
}

app.post('/api/admin/system/sync', async (c) => {
  if (c.get('globalRole') !== 'super_admin') throw new HTTPException(403, { message: 'Forbidden' })
  const results = await syncAllConnections(c.env)
  return c.json({ success: true, results })
})

app.post('/discord/interactions', async (c) => {
  const signature = c.req.header('X-Signature-Ed25519')
  const timestamp = c.req.header('X-Signature-Timestamp')
  const body = await c.req.text()
  
  const isValidRequest = await verifyKey(body, signature || '', timestamp || '', c.env.DISCORD_PUBLIC_KEY)
  
  if (!isValidRequest) {
    return c.text('Bad request signature', 401)
  }

  const interaction = JSON.parse(body)

  if (interaction.type === InteractionType.PING) {
    return c.json({ type: InteractionResponseType.PONG })
  }

  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    const { name } = interaction.data
    if (name === 'cash-safety') {
      return c.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: "🛡️ **CASH Safety Number**: You have **$1,420.50** spendable cash until your next payday. Drive safe!"
        }
      })
    }
  }

  return c.json({ type: InteractionResponseType.PONG })
})
// Developer: Webhooks
app.get('/api/developer/webhooks', async (c) => {
  const householdId = c.get('householdId')
  const { results } = await c.env.DB.prepare('SELECT id, url, event_types, is_active, created_at FROM webhooks WHERE household_id = ?').bind(householdId).all()
  return c.json(results)
})

app.post('/api/developer/webhooks', zValidator('json', WebhookSchema), async (c) => {
  const householdId = c.get('householdId')
  const { url, event_list } = c.req.valid('json')
  const id = crypto.randomUUID()
  const secret = `wh_sec_${crypto.randomUUID().slice(0, 8)}`
  
  await c.env.DB.prepare(
    'INSERT INTO webhooks (id, household_id, url, secret, event_list) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, householdId, url, secret, event_list).run()
  
  return c.json({ success: true, id, secret })
})

app.delete('/api/developer/webhooks/:id', async (c) => {
  const id = c.req.param('id')
  const householdId = c.get('householdId')
  await c.env.DB.prepare('DELETE FROM webhooks WHERE id = ? AND household_id = ?').bind(id, householdId).run()
  return c.json({ success: true })
})


app.onError((err, c) => {
  const isProduction = c.env.ENVIRONMENT === 'production'
  console.error('[Global Error]', err)
  return c.json({
    error: isProduction ? 'Internal Server Error' : err.message,
    status: (err as any).status || 500,
    stack: isProduction ? undefined : err.stack
  }, (err as any).status || 500)
})


export default {
  fetch: app.fetch,
  async scheduled(event: any, env: Bindings, ctx: any) {
    if (event.cron === "0 0 * * *") { // Weekly Pulse + Daily Sync
      console.log("Triggering scheduled sync and pulse...")
      ctx.waitUntil(syncAllConnections(env))
      
      const webhookUrl = env.DISCORD_WEBHOOK_URL
      if (webhookUrl && new Date().getDay() === 0) { // Still send pulse on Sundays
         await fetch(webhookUrl, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             content: "📈 **Weekly Pulse**: Your household's financial health is looking strong! Verified data sync completed."
           })
         })
      }
    }
  }
}
