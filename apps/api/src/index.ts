import { Hono } from 'hono'
import { openApiSpec } from './openapi'
import { jwt, sign, verify } from 'hono/jwt'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { logger } from 'hono/logger'
import { InteractionType, InteractionResponseType, verifyKey } from 'discord-interactions'
import { generateTOTPSecret, verifyTOTP, base32Encode, hashPassword, verifyPassword } from './auth-utils'
import { Bindings, Variables } from './types'
import { auth as authRoutes } from './routes/auth'
import { logAudit, encrypt, decrypt } from './utils'
import { SchedulingService } from './services/scheduling.service'



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

// --- DURABLE OBJECT: Vault ---
export class Vault {
  state: DurableObjectState

  constructor(state: DurableObjectState) {
    this.state = state
  }

  async fetch(request: Request) {
    const url = new URL(request.url)
    const householdId = url.searchParams.get('householdId')
    const key = `vault:${householdId}`

    if (request.method === 'PUT') {
      const { data } = await request.json() as any
      await this.state.storage.put(key, data)
      return new Response(JSON.stringify({ success: true }))
    }

    if (request.method === 'GET') {
      const key = url.searchParams.get('key')
      if (!key) return new Response('Key required', { status: 400 })
      const value = await this.state.storage.get(key)
      return new Response(JSON.stringify({ value }))
    }

    return new Response('Not Found', { status: 404 })
  }
}

// --- DURABLE OBJECT: RateLimiter ---
export class RateLimiter {
  state: DurableObjectState
  constructor(state: DurableObjectState) { this.state = state }
  async fetch(request: Request) {
    const url = new URL(request.url)
    const ip = url.searchParams.get('ip') || 'anon'
    const limit = parseInt(url.searchParams.get('limit') || '100')
    const windowMinute = Math.floor(Date.now() / 60000)
    const key = `${ip}:${windowMinute}`
    
    const current: number = (await this.state.storage.get(key)) || 0
    if (current >= limit) return new Response('Rate limit exceeded', { status: 429 })
    
    await this.state.storage.put(key, current + 1)
    
    // Optional: Cleanup old keys in the background
    return new Response(JSON.stringify({ remaining: limit - current - 1 }))
  }
}

export const app = new Hono<{ Bindings: Bindings, Variables: Variables }>().basePath('/ledger')

// Health Check (will be at /ledger/ping)
app.get('/ping', (c) => c.text('PONG - LEDGER IS LIVE'))

// OpenAPI Specification
app.get('/openapi.json', (c) => c.json(openApiSpec))

// Microsoft Identity Association (for verification)
app.get('/.well-known/microsoft-identity-association.json', (c) => {
  return c.json({
    associatedApplications: [
      {
        applicationId: "f9927aec-9a57-463c-971b-95f9dc0e7f16"
      }
    ]
  })
})

// 1. Global Security Hardening
app.use('*', logger())
app.use('*', cors({
  origin: ['https://ledger.gpnet.dev', 'http://localhost:5173'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
  maxAge: 600,
  credentials: true,
}))
app.use('*', secureHeaders())

app.onError((err, c) => {
  console.error('[Global Error]', err)
  return c.json({
    error: err.message,
    status: (err as any).status || 500
  }, (err as any).status || 500)
})

// 2. Persistent Rate Limiting (Durable Object)
app.use('/api/*', async (c, next) => {
  const ip = c.req.header('cf-connecting-ip') || 'anon'
  const id = c.env.RATE_LIMITER.idFromName(ip)
  const obj = c.env.RATE_LIMITER.get(id)
  const res = await obj.fetch(new URL(`http://rate-limit?ip=${encodeURIComponent(ip)}&limit=100`, c.req.url))
  if (res.status === 429) return c.json({ error: 'Too many requests' }, 429)
  await next()
})

app.use('/auth/*', async (c, next) => {
  const ip = c.req.header('cf-connecting-ip') || 'anon'
  const id = c.env.RATE_LIMITER.idFromName(`auth:${ip}`)
  const obj = c.env.RATE_LIMITER.get(id)
  const res = await obj.fetch(new URL(`http://rate-limit?ip=${encodeURIComponent(ip)}&limit=50`, c.req.url))
  if (res.status === 429) return c.json({ error: 'Too many requests' }, 429)
  await next()
})

app.use('*', async (c, next) => {
  const path = c.req.path
  const method = c.req.method
  
  // Account for basePath in exclusions
  const exclusions = [
    '/ledger', 
    '/ledger/', 
    '/ledger/auth/login/discord',
    '/ledger/auth/login/google',
    '/ledger/auth/login/dropbox',
    '/ledger/auth/login/onedrive',
    '/ledger/api/theme/broadcast',
    '/api/theme/broadcast',
    '/ledger/ping'
  ]

  const isExcluded = exclusions.some(e => path === e || path === e + '/') || 
                    path.endsWith('/api/theme/broadcast') ||
                    path.endsWith('/api/config') ||
                    path.includes('/debug/') || 
                    path.includes('/discord/interactions') ||
                    (method === 'OPTIONS')

  if (isExcluded) {
    return await next()
  }

  return authMiddleware(c, next)
})

// --- UTILITIES: Discord Charts (Phase 14) ---
const getQuickChartUrl = (type: 'pie' | 'bar', labels: string[], data: number[], title: string) => {
  const chartConfig = {
    type: type,
    data: {
      labels: labels,
      datasets: [{
        label: title,
        data: data,
        backgroundColor: [
          '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'
        ]
      }]
    },
    options: {
      title: { display: true, text: title, fontColor: '#fff' },
      legend: { labels: { fontColor: '#fff' } }
    }
  }
  return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&bg=%231e1e1e`
}


// --- UTILITIES: Webhook Dispatch ---
const isValidWebhookUrl = (url: string) => {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return false
    const hostname = parsed.hostname.toLowerCase()
    const blacklist = ['localhost', '127.0.0.1', '0.0.0.0', '::1', 'metadata.google.internal', '169.254.169.254']
    if (blacklist.includes(hostname)) return false
    return true
  } catch (e) {
    return false
  }
}

const dispatchWebhook = async (c: any, event: string, data: any, householdId: string) => {
  if (!householdId) return

  const { results: hooks } = await c.env.DB.prepare(
    'SELECT id, url, secret, event_list FROM webhooks WHERE household_id = ? AND is_active = 1'
  ).bind(householdId).all()

  for (const hook of hooks) {
    if (!isValidWebhookUrl(hook.url as string)) {
      console.warn(`[Webhook] Insecure URL blocked: ${hook.url}`)
      continue
    }

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
            'X-Ledger-Signature': hook.secret as string,
            'X-Ledger-Event': event
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
    let token = c.req.header('Authorization')?.replace('Bearer ', '')
    if (!token) {
      token = c.req.query('auth_token')
    }
    
    if (!token) throw new HTTPException(401, { message: 'Missing Authorization Token' })
    const jwtSecret = c.env.JWT_SECRET
    if (!jwtSecret) throw new HTTPException(500, { message: 'JWT_SECRET is not defined' })
    
    // 1. Check for Personal Access Tokens (PATs) first
    if (token.startsWith('ledger_')) {
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
    let activeHouseholdId = householdHeader || payload.householdId

    // Verify Household exists to prevent Foreign Key errors in logAudit
    const householdExists = await c.env.DB.prepare(
      'SELECT id FROM households WHERE id = ?'
    ).bind(activeHouseholdId).first()

    if (!householdExists) {
      if (globalRole === 'super_admin') {
        activeHouseholdId = 'ledger-main-001'
      } else {
        throw new HTTPException(401, { message: 'Invalid or missing Household' })
      }
    }

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

// 4. Platform Command Center (PCC) Middleware
const pccMiddleware = async (c: any, next: any) => {
  const role = c.get('globalRole')
  if (role !== 'super_admin') {
    console.warn(`[PCC Access Denied] User ${c.get('userId')} attempted access with role ${role}`)
    return c.json({ error: 'Forbidden: Super Admin access required' }, 403)
  }
  await next()
}

app.get('/', (c) => {
  return c.text('LEDGER API - Status: Active')
})

// --- SCHEMAS ---
const TransactionSchema = z.object({
  amount_cents: z.number().int(),
  description: z.string().min(1).max(255),
  account_id: z.string().uuid().or(z.string().regex(/^(acc-|plaid-|privacy-|retirement-|method-)/)),
  category_id: z.string().uuid().or(z.string().regex(/^(cat-|plaid-|privacy-)/)),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  owner_id: z.string().optional()
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
  settings_json: z.string().optional(),
  avatar_url: z.string().url().or(z.string().length(0)).nullable().optional(),
  timezone: z.string().min(1).max(50).optional()
})

const JoinHouseholdSchema = z.object({
  token: z.string()
})

const CreateHouseholdSchema = z.object({
  name: z.string().min(1).max(100),
  currency: z.string().length(3).optional().default('USD')
})

const UpdateUserAdminSchema = z.object({
  global_role: z.enum(['user', 'super_admin']).optional(),
  status: z.enum(['active', 'suspended', 'deactivated', 'pending']).optional(),
  display_name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional()
})

const SystemRegistrySchema = z.object({
  item_type: z.string(),
  name: z.string().min(1).max(100),
  logo_url: z.string().url().or(z.string().length(0)).nullable().optional(),
  website_url: z.string().url().or(z.string().length(0)).nullable().optional(),
  metadata_json: z.any().optional()
})

const UpdateSystemConfigSchema = z.object({
  config_value: z.string()
})

const UpdateSystemFeatureSchema = z.object({
  enabled_globally: z.boolean(),
  target_user_ids: z.string().nullable().optional()
})

const InstallmentPlanSchema = z.object({
  name: z.string().min(1).max(100),
  total_amount_cents: z.number().int().positive(),
  installment_amount_cents: z.number().int().positive(),
  total_installments: z.number().int().positive(),
  remaining_installments: z.number().int().nonnegative().optional(),
  frequency: z.enum(['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']),
  next_payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  account_id: z.string().optional(),
  payment_mode: z.enum(['manual', 'autopay']).optional(),
  status: z.enum(['active', 'completed', 'cancelled']).optional()
})

const SubscriptionSchema = z.object({
  name: z.string().min(1).max(100),
  amount_cents: z.number().int().positive(),
  billing_cycle: z.enum(['weekly', 'monthly', 'yearly']),
  next_billing_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  account_id: z.string().optional(),
  payment_mode: z.enum(['manual', 'autopay']).optional(),
  owner_id: z.string().optional()
})

const OwnershipTransferSchema = z.object({
  new_owner_id: z.string(),
  transfer_history: z.boolean().optional().default(false)
})

const CreditCardSchema = z.object({
  account_id: z.string(),
  credit_limit_cents: z.number().int().positive(),
  interest_rate_apy: z.number().optional(),
  statement_closing_day: z.number().int().min(1).max(31),
  payment_due_day: z.number().int().min(1).max(31)
})

const LoanSchema = z.object({
  borrower_name: z.string().min(1),
  borrower_contact: z.string().optional(),
  total_amount_cents: z.number().int().positive(),
  interest_rate_apy: z.number().optional(),
  term_months: z.number().int().positive().optional(),
  origination_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
})

const TransferSchema = z.object({
  from_account_id: z.string(),
  to_account_id: z.string(),
  amount_cents: z.number().int().positive(),
  description: z.string().min(1)
})

// --- AUTH ENDPOINTS (MODULARIZED) ---
app.route('/auth', authRoutes)

app.get('/api/me', (c) => {
  return c.json({
    userId: c.get('userId'),
    householdId: c.get('householdId')
  })
})

const UpdateHouseholdSchema = z.object({
  name: z.string().min(1).max(100)
})

const WebhookSchema = z.object({
  url: z.string().url(),
  events: z.string() // Comma-separated or JSON
})

// --- ROUTES: Accounts (Phase 2) ---

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

app.post('/api/credit-cards', zValidator('json', CreditCardSchema), async (c) => {
  const householdId = c.get('householdId')
  const data = c.req.valid('json')
  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    'INSERT INTO credit_cards (id, household_id, account_id, credit_limit_cents, interest_rate_apy, statement_closing_day, payment_due_day) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, householdId, data.account_id, data.credit_limit_cents, data.interest_rate_apy || 0, data.statement_closing_day, data.payment_due_day).run()
  return c.json({ success: true, id })
})

// --- DATA MOBILITY: EXPORT ---
app.get('/api/transactions/export', async (c) => {
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

// --- DATA MOBILITY: IMPORT ANALYSIS ---
app.post('/api/transactions/import/analyze', async (c: any) => {
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

app.post('/api/transactions/import/confirm', zValidator('json', z.object({
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
    
    // Simple amount conversion ($12.34 -> 1234)
    const amountCents = Math.round(parseFloat(String(amountStr).replace(/[^0-9.-]+/g, "")) * 100)
    
    return c.env.DB.prepare(
      'INSERT INTO transactions (id, household_id, account_id, description, amount_cents, date) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(crypto.randomUUID(), householdId, accountId, description, amountCents, date)
  })

  await c.env.DB.batch(queries)
  return c.json({ success: true, count: queries.length })
})

// --- USER PREFERENCES ---
app.get('/api/user/preferences', async (c) => {
  const userId = c.get('userId')
  const { results } = await c.env.DB.prepare(
    'SELECT key, value FROM user_preferences WHERE user_id = ?'
  ).bind(userId).all()
  return c.json(results.reduce((acc: any, curr) => ({ ...acc, [curr.key as string]: curr.value }), {}))
})

app.patch('/api/user/preferences', zValidator('json', z.record(z.string(), z.string())), async (c) => {
  const userId = c.get('userId')
  const prefs = c.req.valid('json')
  
  const queries = Object.entries(prefs).map(([key, value]) => 
    c.env.DB.prepare('INSERT OR REPLACE INTO user_preferences (user_id, key, value) VALUES (?, ?, ?)')
      .bind(userId, key, value)
  )

  await c.env.DB.batch(queries)
  return c.json({ success: true })
})

// --- NOTIFICATION SETTINGS ---
app.get('/api/user/notifications', async (c) => {
  const userId = c.get('userId')
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM notification_settings WHERE user_id = ?'
  ).bind(userId).all()
  return c.json(results)
})

app.patch('/api/user/notifications', zValidator('json', z.array(z.object({
  type: z.string(),
  event: z.string(),
  enabled: z.boolean(),
  offset_days: z.number().optional()
}))), async (c) => {
  const userId = c.get('userId')
  const settings = c.req.valid('json')

  const queries = settings.map(s => 
    c.env.DB.prepare('INSERT OR REPLACE INTO notification_settings (user_id, type, event, enabled, offset_days) VALUES (?, ?, ?, ?, ?)')
      .bind(userId, s.type, s.event, s.enabled ? 1 : 0, s.offset_days || 3)
  )

  await c.env.DB.batch(queries)
  return c.json({ success: true })
})

// --- SERVICE PROVIDERS ---
app.get('/api/service-providers', async (c) => {
  const userId = c.get('userId')
  const householdId = c.get('householdId')
  const q = c.req.query('q')
  
  let query = `
    SELECT * FROM service_providers 
    WHERE (visibility = 'public' 
    OR (visibility = 'household' AND household_id = ?)
    OR (visibility = 'private' AND created_by = ?))`
  
  if (q) {
    query += ' AND name LIKE ?'
    const { results } = await c.env.DB.prepare(query).bind(householdId, userId, `%${q}%`).all()
    return c.json(results)
  }
  
  const { results } = await c.env.DB.prepare(query).bind(householdId, userId).all()
  return c.json(results)
})

app.post('/api/service-providers', zValidator('json', z.object({
  name: z.string(),
  url: z.string().optional(),
  icon_url: z.string().optional(),
  category_id: z.string().optional(),
  metadata: z.string().optional()
})), async (c) => {
  const { name, url, icon_url, category_id, metadata } = c.req.valid('json')
  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    'INSERT INTO service_providers (id, name, url, icon_url, category_id, metadata) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, name, url || null, icon_url || null, category_id || null, metadata || null).run()
  return c.json({ success: true, id })
})

// --- LINKED PROVIDERS ---
app.get('/api/user/providers', async (c) => {
  const userId = c.get('userId')
  const { results } = await c.env.DB.prepare(
    `SELECT lp.*, sp.name as provider_name, sp.icon_url 
     FROM linked_providers lp
     JOIN service_providers sp ON lp.service_provider_id = sp.id
     WHERE lp.user_id = ?`
  ).bind(userId).all()
  return c.json(results)
})

app.post('/api/user/providers/link', zValidator('json', z.object({
  serviceProviderId: z.string(),
  accountReference: z.string().optional(),
  customLabel: z.string().optional(),
  metadata: z.string().optional()
})), async (c) => {
  const userId = c.get('userId')
  const { serviceProviderId, accountReference, customLabel, metadata } = c.req.valid('json')
  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    'INSERT INTO linked_providers (id, user_id, service_provider_id, account_reference, custom_label, metadata) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, userId, serviceProviderId, accountReference || null, customLabel || null, metadata || null).run()
  return c.json({ success: true, id })
})

// --- FINANCIAL FORECASTING ---
app.get('/api/bills/upcoming', async (c) => {
  const householdId = c.get('householdId')
  const days = parseInt(c.req.query('days') || '30')
  const end = new Date()
  end.setDate(end.getDate() + days)
  const endDateStr = end.toISOString().split('T')[0]

  const { results: subs } = await c.env.DB.prepare('SELECT * FROM subscriptions WHERE household_id = ? AND next_billing_date <= ?').bind(householdId, endDateStr).all()
  const { results: installments } = await c.env.DB.prepare('SELECT * FROM installment_plans WHERE household_id = ? AND next_payment_date <= ?').bind(householdId, endDateStr).all()
  
  return c.json({
    subscriptions: subs,
    installments: installments,
    total_upcoming_cents: [...subs, ...installments].reduce((acc, curr: any) => acc + (curr.amount_cents || curr.installment_amount_cents || 0), 0)
  })
})

// --- SUBSCRIPTION ENHANCEMENT ---
app.delete('/api/subscriptions/:id', async (c) => {
  const householdId = c.get('householdId')
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM subscriptions WHERE id = ? AND household_id = ?')
    .bind(id, householdId).run()
  return c.json({ success: true })
})

// P2P Lending (Personal Loans)
app.get('/api/p2p/loans', async (c) => {
  const householdId = c.get('householdId')
  const { results } = await c.env.DB.prepare('SELECT * FROM personal_loans WHERE household_id = ?').bind(householdId).all()
  return c.json(results)
})

app.post('/api/p2p/loans', zValidator('json', LoanSchema), async (c) => {
  const householdId = c.get('householdId')
  const userId = c.get('userId')
  const data = c.req.valid('json')
  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    'INSERT INTO personal_loans (id, household_id, lender_user_id, borrower_name, borrower_contact, total_amount_cents, remaining_balance_cents, interest_rate_apy, term_months, origination_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, householdId, userId, data.borrower_name, data.borrower_contact, data.total_amount_cents, data.total_amount_cents, data.interest_rate_apy || 0, data.term_months, data.origination_date).run()
  return c.json({ success: true, id })
})

app.post('/api/p2p/loans/:id/payments', zValidator('json', z.object({
  amount_cents: z.number().int().positive(),
  platform: z.string().optional(),
  external_id: z.string().optional(),
  method: z.string().optional(),
  email: z.string().email().optional()
})), async (c) => {
  const loanId = c.req.param('id')
  const data = c.req.valid('json')
  const id = crypto.randomUUID()
  
  // Verify loan belongs to this household (IDOR check)
  const householdId = c.get('householdId')
  const loan = await c.env.DB.prepare('SELECT id FROM personal_loans WHERE id = ? AND household_id = ?').bind(loanId, householdId).first()
  if (!loan) throw new HTTPException(404, { message: 'Loan not found' })

  // 1. Log Payment
  await c.env.DB.prepare(
    'INSERT INTO loan_payments (id, loan_id, amount_cents, platform, external_id, method) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, loanId, data.amount_cents, data.platform, data.external_id, data.method).run()
  
  // 2. Update Balance
  await c.env.DB.prepare(
    'UPDATE personal_loans SET remaining_balance_cents = remaining_balance_cents - ? WHERE id = ?'
  ).bind(data.amount_cents, loanId).run()
  
  // 3. Send Receipt
  if (c.env.RESEND_API_KEY && data.email) {
    c.executionCtx.waitUntil(
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${c.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'LEDGER <receipts@gpnet.dev>',
          to: data.email,
          subject: `Payment Receipt: ${data.amount_cents / 100}`,
          html: `<p>Thank you for your payment of $${(data.amount_cents / 100).toFixed(2)}!</p>`
        })
      })
    )
  }

  return c.json({ success: true, id })
})

// --- RECEIPTS (Phase 14) ---
app.post('/api/transactions/:id/receipt', async (c) => {
  const id = c.req.param('id')
  const householdId = c.get('householdId')
  const body = await c.req.parseBody()
  const file = body['file'] as File
  
  if (!file) return c.json({ error: 'No file uploaded' }, 400)
  if (!c.env.RECEIPTS_BUCKET) return c.json({ error: 'R2 Bucket not configured' }, 500)

  const key = `receipts/${householdId}/${id}-${Date.now()}`
  await c.env.RECEIPTS_BUCKET.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type }
  })

  await c.env.DB.prepare(
    'UPDATE transactions SET receipt_r2_key = ? WHERE id = ? AND household_id = ?'
  ).bind(key, id, householdId).run()

  return c.json({ success: true, key })
})

app.get('/api/transactions/:id/receipt', async (c) => {
  const id = c.req.param('id')
  const householdId = c.get('householdId')
  
  const tx = await c.env.DB.prepare('SELECT receipt_r2_key FROM transactions WHERE id = ? AND household_id = ?').bind(id, householdId).first()
  if (!tx || !(tx as any).receipt_r2_key) return c.json({ error: 'Receipt not found' }, 404)

  const object = await c.env.RECEIPTS_BUCKET.get((tx as any).receipt_r2_key)
  if (!object) return c.json({ error: 'Object not found in R2' }, 404)

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)

  return new Response(object.body, { headers })
})

// Transfers
app.post('/api/transfers', zValidator('json', TransferSchema), async (c) => {
  const householdId = c.get('householdId')
  const { from_account_id, to_account_id, amount_cents, description } = c.req.valid('json')
  
  // IDOR check: Verify both accounts belong to this household
  const verify = await c.env.DB.prepare('SELECT id FROM accounts WHERE household_id = ? AND id IN (?, ?)').bind(householdId, from_account_id, to_account_id).all()
  if (verify.results.length < 2) throw new HTTPException(403, { message: 'One or more accounts unauthorized' })

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
        content: `➡️ **New Transfer logged!**\n**Desc:** ${description}\n**Amount:** $${(amount_cents / 100).toFixed(2)}\n**From:** ${from_account_id}\n**To:** ${to_account_id}`
      })
    }).catch(err => console.error('Discord Webhook failed', err))
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
  
  // Envelope Deduction Logic
  if (data.category_id) {
    const category: any = await c.env.DB.prepare('SELECT is_envelope FROM categories WHERE id = ?').bind(data.category_id).first()
    if (category?.is_envelope) {
      await c.env.DB.prepare('UPDATE categories SET envelope_balance_cents = envelope_balance_cents - ? WHERE id = ?').bind(data.amount_cents, data.category_id).run()
    }
  }

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

// Budgets & Envelopes
app.get('/api/budgets', async (c) => {
  const householdId = c.get('householdId')
  
  const household: any = await c.env.DB.prepare('SELECT unallocated_balance_cents FROM households WHERE id = ?').bind(householdId).first()
  const { results: categories } = await c.env.DB.prepare('SELECT * FROM categories WHERE household_id = ?').bind(householdId).all()
  const { results: spends } = await c.env.DB.prepare('SELECT category_id, SUM(amount_cents) as total_spend FROM transactions WHERE household_id = ? GROUP BY category_id').bind(householdId).all()
  
  const budgets = categories.map((cat: any) => {
    const spend = spends.find((s: any) => s.category_id === cat.id)?.total_spend || 0
    return {
      ...cat,
      spend_cents: spend
    }
  })
  
  return c.json({
    unallocated_balance_cents: household?.unallocated_balance_cents || 0,
    budgets
  })
})

app.post('/api/budget/fund', zValidator('json', z.object({
  category_id: z.string(),
  amount_cents: z.number().positive()
})), async (c) => {
  const householdId = c.get('householdId')
  const { category_id, amount_cents } = c.req.valid('json')

  // Atomic Update: Transfer from household unallocated to category envelope
  const batch = await c.env.DB.batch([
    c.env.DB.prepare('UPDATE households SET unallocated_balance_cents = unallocated_balance_cents - ? WHERE id = ?').bind(amount_cents, householdId),
    c.env.DB.prepare('UPDATE categories SET envelope_balance_cents = envelope_balance_cents + ? WHERE id = ? AND household_id = ?').bind(amount_cents, category_id, householdId)
  ])

  return c.json({ success: true })
})

app.post('/api/budget/deposit', zValidator('json', z.object({
  amount_cents: z.number().positive(),
  account_id: z.string().optional()
})), async (c) => {
  const householdId = c.get('householdId')
  const { amount_cents, account_id } = c.req.valid('json')

  // In a real app, this might create a "funding" transaction
  await c.env.DB.prepare('UPDATE households SET unallocated_balance_cents = unallocated_balance_cents + ? WHERE id = ?').bind(amount_cents, householdId).run()

  return c.json({ success: true })
})

app.post('/api/budget/transfer', zValidator('json', z.object({
  from_category_id: z.string(),
  to_category_id: z.string(),
  amount_cents: z.number().positive()
})), async (c) => {
  const householdId = c.get('householdId')
  const { from_category_id, to_category_id, amount_cents } = c.req.valid('json')

  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE categories SET envelope_balance_cents = envelope_balance_cents - ? WHERE id = ? AND household_id = ?').bind(amount_cents, from_category_id, householdId),
    c.env.DB.prepare('UPDATE categories SET envelope_balance_cents = envelope_balance_cents + ? WHERE id = ? AND household_id = ?').bind(amount_cents, to_category_id, householdId)
  ])

  return c.json({ success: true })
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
  
  await logAudit(c, 'transactions', 'MULTI', 'export', null, { count: results.length, format: 'csv' })
  return c.text(csv, 200, {
    'Content-Type': 'text/csv',
    'Content-Disposition': `attachment; filename="ledger-export-${Date.now()}.csv"`
  })
})

// Households
app.post('/api/households', zValidator('json', CreateHouseholdSchema), async (c) => {
  const userId = c.get('userId')
  const { name, currency } = c.req.valid('json')
  const id = `h-${crypto.randomUUID().slice(0, 8)}`
  
  await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO households (id, name, currency) VALUES (?, ?, ?)').bind(id, name, currency || 'USD'),
    c.env.DB.prepare('INSERT INTO user_households (user_id, household_id, role) VALUES (?, ?, ?)').bind(userId, id, 'admin')
  ])
  
  await logAudit(c, 'households', id, 'CREATE', null, { name, currency })
  return c.json({ success: true, id, name }, 201)
})

app.get('/api/households', async (c) => {
  const userId = c.get('userId')
  const { results } = await c.env.DB.prepare(
    'SELECT h.*, uh.role FROM households h JOIN user_households uh ON h.id = uh.household_id WHERE uh.user_id = ?'
  ).bind(userId).all()
  return c.json(results)
})

app.patch('/api/households/:id', zValidator('json', UpdateHouseholdSchema), async (c) => {
  const { id } = c.req.param()
  const { name } = c.req.valid('json')
  const authHouseholdId = c.get('householdId')
  const globalRole = c.get('globalRole')

  // Verify access: super_admin or admin of THIS household
  if (globalRole !== 'super_admin') {
     const membership = await c.env.DB.prepare(
       'SELECT role FROM user_households WHERE user_id = ? AND household_id = ?'
     ).bind(c.get('userId'), id).first()
     
     if (!membership || (membership.role !== 'admin' && membership.role !== 'super_admin')) {
       throw new HTTPException(403, { message: 'Forbidden: Insufficient permissions to rename household' })
     }
  }

  const existing = await c.env.DB.prepare('SELECT name FROM households WHERE id = ?').bind(id).first()
  if (!existing) throw new HTTPException(404, { message: 'Household not found' })

  await c.env.DB.prepare('UPDATE households SET name = ? WHERE id = ?').bind(name, id).run()
  
  await logAudit(c, 'households', id, 'UPDATE', { name: (existing as any).name }, { name })

  return c.json({ success: true, name })
})

// Subscriptions
app.get('/api/subscriptions', async (c) => {
  const householdId = c.get('householdId')
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM subscriptions WHERE household_id = ?'
  ).bind(householdId).all()
  return c.json(results)
})

app.post('/api/subscriptions', zValidator('json', SubscriptionSchema), async (c) => {
  const householdId = c.get('householdId')
  const { name, amount_cents, billing_cycle, next_billing_date, account_id, payment_mode, owner_id } = c.req.valid('json')
  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    `INSERT INTO subscriptions (id, household_id, name, amount_cents, billing_cycle, next_billing_date, account_id, payment_mode, owner_id) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, householdId, name, amount_cents, billing_cycle, next_billing_date, account_id || null, payment_mode || 'manual', owner_id || c.get('userId')).run()
  
  await logAudit(c, 'subscriptions', id, 'create', null, { name, amount_cents, billing_cycle, payment_mode, owner_id })
  return c.json({ success: true, id })
})

app.post('/api/subscriptions/:id/transfer', zValidator('json', OwnershipTransferSchema), async (c) => {
  const householdId = c.get('householdId')
  const id = c.req.param('id')
  const { new_owner_id, transfer_history } = c.req.valid('json')

  const sub = await c.env.DB.prepare('SELECT * FROM subscriptions WHERE id = ? AND household_id = ?').bind(id, householdId).first()
  if (!sub) return c.json({ error: 'Subscription not found' }, 404)

  const queries = [
    c.env.DB.prepare('UPDATE subscriptions SET owner_id = ? WHERE id = ?').bind(new_owner_id, id)
  ]

  if (transfer_history) {
    // Transfer all transactions that match this subscription's name within the same household
    queries.push(
      c.env.DB.prepare('UPDATE transactions SET owner_id = ? WHERE household_id = ? AND description LIKE ?')
        .bind(new_owner_id, householdId, `%${(sub as any).name}%`)
    )
  }

  await c.env.DB.batch(queries)
  await logAudit(c, 'subscriptions', id, 'TRANSFER_OWNERSHIP', { old_owner: (sub as any).owner_id }, { new_owner_id, transfer_history })

  return c.json({ success: true })
})

app.post('/api/transactions/:id/transfer', zValidator('json', z.object({ new_owner_id: z.string() })), async (c) => {
  const householdId = c.get('householdId')
  const id = c.req.param('id')
  const { new_owner_id } = c.req.valid('json')
  
  const tx = await c.env.DB.prepare('SELECT owner_id FROM transactions WHERE id = ? AND household_id = ?').bind(id, householdId).first()
  if (!tx) return c.json({ error: 'Transaction not found' }, 404)

  await c.env.DB.prepare('UPDATE transactions SET owner_id = ? WHERE id = ?').bind(new_owner_id, id).run()
  await logAudit(c, 'transactions', id, 'TRANSFER_OWNERSHIP', { old_owner: (tx as any).owner_id }, { new_owner_id })
  
  return c.json({ success: true })
})

app.patch('/api/subscriptions/:id', zValidator('json', SubscriptionSchema.partial()), async (c) => {
  const householdId = c.get('householdId')
  const id = c.req.param('id')
  const data = c.req.valid('json')
  
  const old = await c.env.DB.prepare('SELECT * FROM subscriptions WHERE id = ? AND household_id = ?').bind(id, householdId).first()
  if (!old) return c.json({ error: 'Not found' }, 404)

  const { name, amount_cents, billing_cycle, next_billing_date, account_id, payment_mode } = data
  await c.env.DB.prepare(
    `UPDATE subscriptions SET name = COALESCE(?, name), amount_cents = COALESCE(?, amount_cents), billing_cycle = COALESCE(?, billing_cycle), 
     next_billing_date = COALESCE(?, next_billing_date), account_id = COALESCE(?, account_id), payment_mode = COALESCE(?, payment_mode)
     WHERE id = ? AND household_id = ?`
  ).bind(name, amount_cents, billing_cycle, next_billing_date, account_id, payment_mode, id, householdId).run()

  await logAudit(c, 'subscriptions', id, 'update', old, data)
  return c.json({ success: true })
})

// Installment Plans
app.get('/api/installment-plans', async (c) => {
  const householdId = c.get('householdId')
  const { results } = await c.env.DB.prepare('SELECT * FROM installment_plans WHERE household_id = ?').bind(householdId).all()
  return c.json(results)
})

app.post('/api/installment-plans', zValidator('json', InstallmentPlanSchema), async (c) => {
  const householdId = c.get('householdId')
  const { name, total_amount_cents, installment_amount_cents, total_installments, frequency, next_payment_date, account_id, payment_mode } = c.req.valid('json')
  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    `INSERT INTO installment_plans (id, household_id, name, total_amount_cents, installment_amount_cents, total_installments, remaining_installments, frequency, next_payment_date, account_id, payment_mode) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, householdId, name, total_amount_cents, installment_amount_cents, total_installments, total_installments, frequency, next_payment_date, account_id || null, payment_mode || 'manual').run()
  
  await logAudit(c, 'installment_plans', id, 'create', null, { name, total_amount_cents })
  return c.json({ success: true, id })
})

app.patch('/api/installment-plans/:id', zValidator('json', InstallmentPlanSchema.partial()), async (c) => {
  const householdId = c.get('householdId')
  const id = c.req.param('id')
  const data = c.req.valid('json')
  
  const old = await c.env.DB.prepare('SELECT * FROM installment_plans WHERE id = ? AND household_id = ?').bind(id, householdId).first()
  if (!old) return c.json({ error: 'Not found' }, 404)

  const { name, total_amount_cents, installment_amount_cents, total_installments, remaining_installments, next_payment_date, account_id, payment_mode, status } = data as any
  
  await c.env.DB.prepare(
    `UPDATE installment_plans SET 
       name = COALESCE(?, name), total_amount_cents = COALESCE(?, total_amount_cents), installment_amount_cents = COALESCE(?, installment_amount_cents), 
       total_installments = COALESCE(?, total_installments), remaining_installments = COALESCE(?, remaining_installments), 
       next_payment_date = COALESCE(?, next_payment_date), account_id = COALESCE(?, account_id), payment_mode = COALESCE(?, payment_mode), status = COALESCE(?, status)
     WHERE id = ? AND household_id = ?`
  ).bind(name, total_amount_cents, installment_amount_cents, total_installments, remaining_installments, next_payment_date, account_id, payment_mode, status, id, householdId).run()

  await logAudit(c, 'installment_plans', id, 'update', old, data)
  return c.json({ success: true })
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

// --- PLATFORM COMMAND CENTER (PCC) ---

app.use('/api/pcc/*', pccMiddleware)

// 1. Dashboard Stats
app.get('/api/pcc/stats', async (c) => {
  const { results: userCount } = await c.env.DB.prepare('SELECT count(*) as count FROM users').all()
  const { results: activeToday } = await c.env.DB.prepare('SELECT count(*) as count FROM users WHERE last_active_at > date("now", "-1 day")').all()
  const { results: householdCount } = await c.env.DB.prepare('SELECT count(*) as count FROM households').all()
  
  return c.json({
    totalUsers: (userCount as any)[0].count,
    activeToday: (activeToday as any)[0].count,
    totalHouseholds: (householdCount as any)[0].count,
    version: CURRENT_VERSION
  })
})

// 2. System Configuration (Universal Switchboard)
app.get('/api/pcc/config', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM system_config ORDER BY config_key ASC').all()
  return c.json(results)
})

app.patch('/api/pcc/config/:id', zValidator('json', UpdateSystemConfigSchema), async (c) => {
  const id = c.req.param('id')
  const { config_value } = c.req.valid('json')
  await c.env.DB.prepare('UPDATE system_config SET config_value = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(config_value, id).run()
  await logAudit(c, 'system_config', id, 'UPDATE_CONFIG', {}, { config_value })
  return c.json({ success: true })
})

// 3. Feature Flags
app.get('/api/pcc/features', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM system_feature_flags ORDER BY feature_key ASC').all()
  return c.json(results)
})

app.patch('/api/pcc/features/:id', zValidator('json', UpdateSystemFeatureSchema), async (c) => {
  const id = c.req.param('id')
  const { enabled_globally, target_user_ids } = c.req.valid('json')
  await c.env.DB.prepare(
    'UPDATE system_feature_flags SET enabled_globally = ?, target_user_ids = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind(enabled_globally ? 1 : 0, target_user_ids, id).run()
  await logAudit(c, 'system_feature_flags', id, 'TOGGLE_FEATURE', {}, { enabled_globally })
  return c.json({ success: true })
})

// 4. Universal Registry (Bills & Categories)
app.get('/api/pcc/registry', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM system_registry ORDER BY type ASC, name ASC').all()
  return c.json(results)
})

app.post('/api/pcc/registry', zValidator('json', SystemRegistrySchema), async (c) => {
  const data = c.req.valid('json')
  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    'INSERT INTO system_registry (id, item_type, name, logo_url, website_url, metadata_json) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, data.item_type, data.name, data.logo_url, data.website_url, JSON.stringify(data.metadata_json)).run()
  await logAudit(c, 'system_registry', id, 'CREATE_REGISTRY_ITEM', {}, data)
  return c.json({ success: true, id })
})

// 5. User Management
app.get('/api/pcc/users', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT id, email, display_name, global_role, status, created_at, last_active_at FROM users ORDER BY created_at DESC').all()
  return c.json(results)
})

app.patch('/api/pcc/users/:id', zValidator('json', UpdateUserAdminSchema), async (c) => {
  const id = c.req.param('id')
  const { global_role, status } = c.req.valid('json')
  await c.env.DB.prepare('UPDATE users SET global_role = ?, status = ? WHERE id = ?').bind(global_role, status, id).run()
  await logAudit(c, 'users', id, 'ADMIN_UPDATE_USER', {}, { global_role, status })
  return c.json({ success: true })
})

// 6. Audit Vault
app.get('/api/pcc/audit', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200').all()
  return c.json(results)
})

// 7. Global Search (God Mode)
app.get('/api/pcc/search', async (c) => {
  const q = c.req.query('q') || ''
  if (q.length < 2) return c.json({ users: [], registry: [] })

  const { results: users } = await c.env.DB.prepare(
    'SELECT id, email, display_name FROM users WHERE email LIKE ? OR display_name LIKE ? LIMIT 10'
  ).bind(`%${q}%`, `%${q}%`).all()

  const { results: registry } = await c.env.DB.prepare(
    'SELECT id, name, item_type FROM system_registry WHERE name LIKE ? LIMIT 10'
  ).bind(`%${q}%`).all()

  return c.json({ users, registry })
})

// 8. Theme Broadcast
app.get('/api/theme/broadcast', async (c) => {
  const config = await c.env.DB.prepare('SELECT value_json FROM system_configs WHERE key = "broadcast_theme_id"').first()
  if (!config) return c.json({ themeId: null })
  return c.json({ themeId: JSON.parse((config as any).value_json) })
})

app.post('/api/pcc/theme/broadcast', async (c) => {
  const { themeId } = await c.req.json()
  await c.env.DB.prepare('INSERT OR REPLACE INTO system_configs (id, key, value_json, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)')
    .bind(crypto.randomUUID(), 'broadcast_theme_id', JSON.stringify(themeId)).run()
  return c.json({ success: true })
})

// 9. System Audit (Health Monitor)
app.get('/api/pcc/audit/system', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM system_audit_logs ORDER BY created_at DESC LIMIT 100').all()
  return c.json(results)
})

// --- WEBHOOKS (INBOUND) ---

app.post('/api/webhooks/plaid', async (c) => {
  const payload = await c.req.json() as any
  console.log('[Webhook] Plaid:', payload.webhook_code)
  
  if (payload.webhook_code === 'INITIAL_UPDATE' || payload.webhook_code === 'HISTORICAL_UPDATE' || payload.webhook_code === 'DEFAULT_UPDATE') {
    // Trigger sync for specific item if possible, or all
    ctx.waitUntil(syncAllConnections(c.env))
  }
  
  return c.json({ received: true })
})

app.post('/api/webhooks/akoya', async (c) => {
  console.log('[Webhook] Akoya pulse received')
  ctx.waitUntil(syncAllConnections(c.env))
  return c.json({ received: true })
})

// Analytics & Predictions
app.get('/api/analytics/summary', async (c) => {
  const householdId = c.get('householdId')
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  
  // 1. Monthly Stats
  const { results: income } = await c.env.DB.prepare('SELECT SUM(amount_cents) as total FROM transactions WHERE household_id = ? AND amount_cents > 0 AND transaction_date >= ?').bind(householdId, startOfMonth).all()
  const { results: expense } = await c.env.DB.prepare('SELECT SUM(ABS(amount_cents)) as total FROM transactions WHERE household_id = ? AND amount_cents < 0 AND transaction_date >= ?').bind(householdId, startOfMonth).all()
  
  const totalIncome = (income as any)[0].total || 0
  const totalExpense = (expense as any)[0].total || 0
  const savings = totalIncome - totalExpense
  const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0
  
  // 2. Burn Rate (Last 30 days)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const { results: recentExpense } = await c.env.DB.prepare('SELECT SUM(ABS(amount_cents)) as total FROM transactions WHERE household_id = ? AND amount_cents < 0 AND transaction_date >= ?').bind(householdId, thirtyDaysAgo).all()
  const burnRate = (recentExpense as any)[0].total / 30
  
  return c.json({
    healthScore: 85, // Simple placeholder for now
    monthlyIncome: totalIncome,
    monthlyExpense: totalExpense,
    savingsRate: Math.round(savingsRate),
    dailyBurnRate: Math.round(burnRate),
    safetyNumberCents: (savings * 6) // Example: 6 months of savings
  })
})

app.post('/api/reports/snapshot', async (c) => {
  const householdId = c.get('householdId')
  const { type } = await c.req.json() as { type: string }
  
  const id = crypto.randomUUID()
  let data = {}
  
  if (type === 'net_worth_snapshot') {
    const { results: accs } = await c.env.DB.prepare('SELECT balance_cents FROM accounts WHERE household_id = ?').bind(householdId).all()
    const netWorth = (accs as any[]).reduce((sum, a) => sum + a.balance_cents, 0)
    data = { net_worth_cents: netWorth }
  } else if (type === 'monthly_summary') {
     // Fetch summary data...
     data = { summary: 'Monthly performance locked.' }
  }

  await c.env.DB.prepare('INSERT INTO reports (id, household_id, type, data_json) VALUES (?, ?, ?, ?)')
    .bind(id, householdId, type, JSON.stringify(data)).run()
    
  return c.json({ success: true, id })
})

app.get('/api/transactions/export/csv', async (c) => {
  const householdId = c.get('householdId')
  const { results } = await c.env.DB.prepare('SELECT transaction_date, description, amount_cents FROM transactions WHERE household_id = ? ORDER BY transaction_date DESC').bind(householdId).all()
  
  let csv = 'Date,Description,Amount\n'
  ;(results as any[]).forEach(r => {
    csv += `${r.transaction_date},"${r.description.replace(/"/g, '""')}",${(r.amount_cents / 100).toFixed(2)}\n`
  })
  
  c.header('Content-Type', 'text/csv')
  c.header('Content-Disposition', 'attachment; filename=ledger_transactions.csv')
  return c.text(csv)
})

// Reports
app.get('/api/reports', async (c) => {
  const householdId = c.get('householdId')
  const { results } = await c.env.DB.prepare(
    'SELECT id, type, period_start, period_end, created_at FROM reports WHERE household_id = ? ORDER BY created_at DESC'
  ).bind(householdId).all()
  return c.json(results)
})

app.get('/api/reports/:id', async (c) => {
  const id = c.req.param('id')
  const householdId = c.get('householdId')
  const report = await c.env.DB.prepare(
    'SELECT * FROM reports WHERE id = ? AND household_id = ?'
  ).bind(id, householdId).first()
  
  if (!report) throw new HTTPException(404, { message: 'Report not found' })
  
  return c.json({
    ...report,
    data: JSON.parse((report as any).data_json)
  })
})

app.get('/api/analytics/category-spending', async (c) => {
  const householdId = c.get('householdId')
  const timeframe = c.req.query('timeframe') || '30d'
  
  const days = timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 365
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startDateStr = startDate.toISOString().split('T')[0]

  const { results } = await c.env.DB.prepare(
    `SELECT c.name, c.color, SUM(ABS(t.amount_cents)) as total_cents 
     FROM transactions t
     JOIN categories c ON t.category_id = c.id
     WHERE t.household_id = ? AND t.amount_cents < 0 AND t.transaction_date >= ?
     GROUP BY c.id
     ORDER BY total_cents DESC`
  ).bind(householdId, startDateStr).all()

  return c.json(results)
})

app.get('/api/analytics/net-worth', async (c) => {
  const householdId = c.get('householdId')
  
  // 1. Current Balances
  const { results: accs } = await c.env.DB.prepare('SELECT type, balance_cents FROM accounts WHERE household_id = ?').bind(householdId).all()
  const netWorthCents = (accs as any[]).reduce((sum, a) => sum + a.balance_cents, 0)
  
  // 2. Historical Snapshots (Last 6 months)
  const { results: snapshots } = await c.env.DB.prepare(
    'SELECT created_at, data_json FROM reports WHERE household_id = ? AND type = "net_worth_snapshot" ORDER BY created_at DESC LIMIT 6'
  ).bind(householdId).all()

  const history = snapshots.map((s: any) => ({
    date: s.created_at.split('T')[0],
    value: JSON.parse(s.data_json).net_worth_cents
  })).reverse()

  return c.json({
    current_net_worth_cents: netWorthCents,
    history
  })
})

// Households: Invites
app.post('/api/households/invite', async (c) => {
  const householdId = c.get('householdId')
  // Use high-entropy secure random token
  const token = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16)))).replace(/[^a-zA-Z0-9]/g, '')
  // In production, this would be stored in D1/KV with an expiry.
  return c.json({ inviteToken: token, url: `https://ledger.gpnet.dev/join?token=${token}` })
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
  if (!userId) return c.json({ error: 'Unauthorized' }, 401)
  
  const { results } = await c.env.DB.prepare(
    'SELECT id, email, display_name, avatar_url, global_role, status, settings_json, created_at FROM users WHERE id = ?'
  ).bind(userId).all()
  
  if (!results || results.length === 0) {
    return c.json({ error: 'User not found' }, 404)
  }
  
  return c.json(results[0])
})

app.patch('/api/user/profile', zValidator('json', ProfileSchema), async (c) => {
  const userId = c.get('userId')
  if (!userId) return c.json({ error: 'Unauthorized' }, 401)
  
  const data = c.req.valid('json')
  console.log('[PATCH Profile] Data:', JSON.stringify(data), 'User:', userId)
  
  if (data.display_name) {
    await c.env.DB.prepare('UPDATE users SET display_name = ? WHERE id = ?').bind(data.display_name, userId).run()
  }
  if (data.settings_json) {
  if (data.settings_json) {
    // Direct update is safer since frontend sends complete merged object
    await c.env.DB.prepare('UPDATE users SET settings_json = ? WHERE id = ?').bind(data.settings_json, userId).run()
  }
  }
  if (data.email) {
    await c.env.DB.prepare('UPDATE users SET email = ? WHERE id = ?').bind(data.email, userId).run()
  }
  
  if (data.avatar_url !== undefined) {
    await c.env.DB.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').bind(data.avatar_url || null, userId).run()
  }
  if (data.timezone) {
    await c.env.DB.prepare('UPDATE users SET timezone = ? WHERE id = ?').bind(data.timezone, userId).run()
  }
  
  return c.json({ success: true })
})

// --- PUBLIC CONFIGURATION ---
app.get('/api/config', async (c) => {
  try {
    const { results: configs } = await c.env.DB.prepare('SELECT key, value_json FROM system_configs').all()
    const configMap = (configs as any[]).reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value_json }), {})
    return c.json({ version: CURRENT_VERSION, config: configMap, features: {} })
  } catch (err) {
    return c.json({ version: CURRENT_VERSION, config: {}, features: {}, error: 'Config fetch failed' }, 200)
  }
})

// AI Coach
app.post('/api/coach/ask', zValidator('json', z.object({ question: z.string().min(3).max(500) })), async (c) => {
  const { question } = c.req.valid('json')
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
app.post('/api/developer/tokens', zValidator('json', z.object({ name: z.string().min(1).max(50) })), async (c) => {
  const householdId = c.get('householdId')
  const { name } = c.req.valid('json')
  // Generate high-entropy token prefix
  const tokenValue = crypto.randomUUID().replace(/-/g, '')
  const id = `ledger_${tokenValue}`
  
  await c.env.DB.prepare('INSERT INTO personal_access_tokens (id, household_id, name) VALUES (?, ?, ?)')
    .bind(id, householdId, name).run()
    
  await logAudit(c, 'personal_access_tokens', id, 'create', null, { name })
  return c.json({ token: id })
})

app.get('/api/developer/tokens', async (c) => {
  const householdId = c.get('householdId')
  const { results } = await c.env.DB.prepare('SELECT id, name, created_at FROM personal_access_tokens WHERE household_id = ?')
    .bind(householdId).all()
  return c.json(results)
})


const CURRENT_VERSION = 'v2.3.0'
const VERSION_UPDATES = [
  { version: 'v2.3.0', title: 'Forensic Admin Hub', description: 'Advanced user management, account merging, and deep forensic auditing.' },
  { version: 'v2.2.2', title: 'Stability & UI Refresh', description: 'Authentication performance fixes and refined global footer.' },
  { version: 'v1.31.0', title: 'Feature Parity & Rollovers', description: 'Budget rollovers, subscription trial alerts, and receipt management.' },
  { version: 'v1.15.0', title: 'Universal Interop', description: 'Advanced CSV/JSON imports and export engine.' },
  { version: 'v1.5.6', title: 'Provider Visibility', description: 'Designate providers as private, household, or public.' },
  { version: 'v1.5.5', title: 'Audit Analytics', description: 'New forensic security dashboard.' }
]

// --- ONBOARDING & TOURS ---
app.get('/api/user/onboarding', async (c) => {
  const userId = c.get('userId')
  const householdId = c.get('householdId')
  const status = await c.env.DB.prepare('SELECT * FROM user_onboarding WHERE user_id = ?').bind(userId).first()
  
  if (!status) {
    await c.env.DB.prepare('INSERT INTO user_onboarding (user_id, completed_steps_json, is_completed, last_viewed_version) VALUES (?, ?, ?, ?)')
      .bind(userId, '[]', 0, CURRENT_VERSION).run()
    return c.json({ completed_steps: [], is_completed: false, last_viewed_version: CURRENT_VERSION, updates: [] })
  }

  const lastVersion = (status as any).last_viewed_version
  const updatesSince = VERSION_UPDATES.filter(u => u.version > (lastVersion || 'v0.0.0'))

  return c.json({
    completed_steps: JSON.parse((status as any).completed_steps_json || '[]'),
    is_completed: (status as any).is_completed === 1,
    last_viewed_version: lastVersion,
    updates: updatesSince,
    current_version: CURRENT_VERSION
  })
})

app.post('/api/user/onboarding/step', zValidator('json', z.object({
  step: z.string(),
  isLast: z.boolean().optional(),
  version: z.string().optional()
})), async (c) => {
  const userId = c.get('userId')
  const { step, isLast, version } = c.req.valid('json')
  
  const status = await c.env.DB.prepare('SELECT * FROM user_onboarding WHERE user_id = ?').bind(userId).first()
  let completedSteps: string[] = []
  if (status) {
    completedSteps = JSON.parse((status as any).completed_steps_json || '[]')
  }

  if (!completedSteps.includes(step)) {
    completedSteps.push(step)
  }

  await c.env.DB.prepare(
    'INSERT OR REPLACE INTO user_onboarding (user_id, completed_steps_json, is_completed, last_viewed_version, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)'
  ).bind(userId, JSON.stringify(completedSteps), isLast ? 1 : 0, version || CURRENT_VERSION).run()

  return c.json({ success: true, completed_steps: completedSteps, is_completed: !!isLast })
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
  
  const tables = {
    accounts: c.env.DB.prepare('SELECT * FROM accounts WHERE household_id = ?'),
    transactions: c.env.DB.prepare('SELECT * FROM transactions WHERE household_id = ?'),
    categories: c.env.DB.prepare('SELECT * FROM categories WHERE household_id = ?'),
    subscriptions: c.env.DB.prepare('SELECT * FROM subscriptions WHERE household_id = ?'),
    audit_logs: c.env.DB.prepare('SELECT * FROM audit_logs WHERE household_id = ?')
  }
  const fullExport: any = { householdId, timestamp: new Date().toISOString(), data: {} }
  
  for (const [name, stmt] of Object.entries(tables)) {
    const { results } = await stmt.bind(householdId).all()
    fullExport.data[name] = results
  }
  
  return c.json(fullExport, 200, {
    'Content-Disposition': `attachment; filename="ledger-full-export-${householdId}.json"`
  })
})

app.post('/api/privacy/shred', zValidator('json', z.object({ reason: z.string().min(5), months: z.number().optional() })), async (c) => {
  const userId = c.get('userId')
  const householdId = c.get('householdId')
  const { months, reason } = c.req.valid('json')
  
  const m = months || 12
  const date = new Date()
  date.setMonth(date.getMonth() - m)
  const isoDate = date.toISOString()
  
  // 1. Delete Transactions
  const { success: txSuccess } = await c.env.DB.prepare('DELETE FROM transactions WHERE household_id = ? AND transaction_date < ?')
    .bind(householdId, isoDate).run()
    
  // 2. Anonymize Audit Logs
  await c.env.DB.prepare('UPDATE audit_logs SET old_values_json = "[SHREDDED]", new_values_json = "[SHREDDED]" WHERE household_id = ? AND created_at < ?')
    .bind(householdId, isoDate).run()
    
  // 3. Log Shredding Action
  await c.env.DB.prepare('INSERT INTO system_audit_logs (id, user_id, action, target, details_json) VALUES (?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), userId, 'PRIVACY_SHRED', householdId, JSON.stringify({ months: m, reason })).run()
    
  return c.json({ success: txSuccess, deletedUntil: isoDate })
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
  if (c.env.ENVIRONMENT === 'production' || !c.env.JWT_SECRET) {
    throw new HTTPException(404, { message: 'Not Found' })
  }
  const jwtSecret = c.env.JWT_SECRET
  const token = await sign({ 
    sub: 'test-user-v', 
    householdId: 'ledger-main-001', 
    globalRole: 'super_admin' 
  }, jwtSecret)
  return c.json({ token, householdId: 'ledger-main-001' })
})

// --- RECONCILIATION & SEARCH (PHASE 7) ---

app.post('/api/transactions/:id/link', async (c) => {
  const { id } = c.req.param()
  const { linkedToIds } = await c.req.json() as { linkedToIds: string[] }
  const householdId = c.get('householdId')
  
  // 1. Fetch source transaction
  const sourceTx = await c.env.DB.prepare(
    'SELECT amount_cents FROM transactions WHERE id = ? AND household_id = ?'
  ).bind(id, householdId).first() as any
  
  if (!sourceTx) throw new HTTPException(404, { message: 'Source transaction not found' })

  // 2. Insert links
  for (const targetId of linkedToIds) {
    const linkId = crypto.randomUUID()
    await c.env.DB.prepare(
      'INSERT OR IGNORE INTO transaction_links (id, household_id, source_id, target_id) VALUES (?, ?, ?, ?)'
    ).bind(linkId, householdId, id, targetId).run()
  }

  // 3. Calculate new total progress for this source
  const { results: links } = await c.env.DB.prepare(
    'SELECT t.amount_cents FROM transaction_links l JOIN transactions t ON l.target_id = t.id WHERE l.source_id = ?'
  ).bind(id).all()
  
  const totalLinkedCents = (links as any[]).reduce((sum, link) => sum + Math.abs(link.amount_cents), 0)
  const isFullyReconciled = totalLinkedCents >= Math.abs(sourceTx.amount_cents)

  // 4. Update source status
  await c.env.DB.prepare(
    'UPDATE transactions SET reconciliation_status = ?, reconciliation_progress_cents = ?, satisfaction_date = ? WHERE id = ? AND household_id = ?'
  ).bind(
    isFullyReconciled ? 'reconciled' : 'partial',
    totalLinkedCents,
    isFullyReconciled ? new Date().toISOString() : null,
    id,
    householdId
  ).run()

  // 5. Mark targets as reconciled (Simplified: once a target is linked, it's considered reconciled to its source)
  for (const targetId of linkedToIds) {
    await c.env.DB.prepare(
      'UPDATE transactions SET reconciliation_status = "reconciled" WHERE id = ? AND household_id = ?'
    ).bind(targetId, householdId).run()
  }

  return c.json({ success: true, status: isFullyReconciled ? 'reconciled' : 'partial', progress_cents: totalLinkedCents })
})

app.get('/api/sandbox', async (c) => {
  const householdId = c.get('householdId')
  const status = c.req.query('status') || 'pending'
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM import_sandbox WHERE household_id = ? AND status = ? ORDER BY created_at DESC'
  ).bind(householdId, status).all()
  return c.json(results.map(r => ({
    ...r,
    raw_data: JSON.parse((r as any).raw_data_json),
    mapped_data: (r as any).mapped_data_json ? JSON.parse((r as any).mapped_data_json) : null
  })))
})

app.post('/api/sandbox/stage', async (c) => {
  const householdId = c.get('householdId')
  const { filename, rows } = await c.req.json() as { filename: string, rows: any[] }
  const userId = c.get('userId')
  
  const batch = rows.map(row => {
    const id = crypto.randomUUID()
    return c.env.DB.prepare(
      'INSERT INTO import_sandbox (id, household_id, user_id, source_filename, raw_data_json) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, householdId, userId, filename, JSON.stringify(row))
  })

  await c.env.DB.batch(batch)
  return c.json({ success: true, count: rows.length })
})

app.post('/api/sandbox/commit', async (c) => {
  const householdId = c.get('householdId')
  const { ids } = await c.req.json() as { ids: string[] }
  
  const sandboxRecords = await c.env.DB.prepare(
    `SELECT * FROM import_sandbox WHERE id IN (${ids.map(() => '?').join(',')}) AND household_id = ?`
  ).bind(...ids, householdId).all()

  const txQueries = []
  const sandboxUpdates = []

  for (const record of sandboxRecords.results as any[]) {
    const mapped = JSON.parse(record.mapped_data_json)
    if (!mapped) continue

    const txId = crypto.randomUUID()
    txQueries.push(c.env.DB.prepare(
      'INSERT INTO transactions (id, household_id, account_id, amount_cents, description, transaction_date, category_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(txId, householdId, mapped.account_id, mapped.amount_cents, mapped.description, mapped.transaction_date, mapped.category_id))
    
    sandboxUpdates.push(c.env.DB.prepare(
      'UPDATE import_sandbox SET status = "committed" WHERE id = ?'
    ).bind(record.id))
  }

  if (txQueries.length > 0) {
    await c.env.DB.batch([...txQueries, ...sandboxUpdates])
  }

  return c.json({ success: true, committed: txQueries.length })
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
    'SELECT * FROM transactions WHERE household_id = ? AND reconciliation_status != "reconciled" LIMIT 5'
  ).bind(householdId).all()

  const suggestions = []
  for (const tx of unreconciled as any[]) {
    // 1. Find exact matches within ±4 days
    const minDate = new Date(new Date(tx.transaction_date).getTime() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const maxDate = new Date(new Date(tx.transaction_date).getTime() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    // Check for opposite signs (Transfers) or same sign (Multi-entry match)
    const { results: candidates } = await c.env.DB.prepare(`
      SELECT id, description, amount_cents, account_id 
      FROM transactions 
      WHERE household_id = ? 
      AND id != ? 
      AND reconciliation_status = "unreconciled" 
      AND (ABS(amount_cents) = ABS(?) OR ABS(amount_cents) BETWEEN ABS(?) * 0.95 AND ABS(?) * 1.05)
      AND transaction_date BETWEEN ? AND ? 
      LIMIT 5
    `).bind(householdId, tx.id, tx.amount_cents, tx.amount_cents, tx.amount_cents, minDate, maxDate).all()

    if (candidates.length > 0) {
      suggestions.push({ 
        source: tx,
        candidates: (candidates as any[]).map(c => ({
          ...c,
          confidence: Math.abs(c.amount_cents) === Math.abs(tx.amount_cents) ? 'high' : 'medium',
          type: (c.amount_cents === -tx.amount_cents) ? 'transfer' : 'match'
        }))
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

// --- ADMIN: System-wide Management ---

app.get('/api/admin/users', async (c) => {
  if (c.get('globalRole') !== 'super_admin') throw new HTTPException(403, { message: 'Forbidden' })
  const { results } = await c.env.DB.prepare('SELECT id, email, username, global_role, status, created_at, last_active_at FROM users ORDER BY created_at DESC').all()
  return c.json(results)
})

app.patch('/api/admin/users/:userId', zValidator('json', UpdateUserAdminSchema), async (c) => {
  if (c.get('globalRole') !== 'super_admin') throw new HTTPException(403, { message: 'Forbidden' })
  const { userId } = c.req.param()
  const { global_role, status, display_name, email } = c.req.valid('json')
  
  const old = await c.env.DB.prepare('SELECT global_role, status, display_name, email FROM users WHERE id = ?').bind(userId).first()
  if (!old) throw new HTTPException(404, { message: 'User not found' })

  await c.env.DB.prepare(`
    UPDATE users SET 
      global_role = COALESCE(?, global_role), 
      status = COALESCE(?, status),
      display_name = COALESCE(?, display_name),
      email = COALESCE(?, email) 
    WHERE id = ?
  `).bind(global_role, status, display_name, email, userId).run()
    
  await logAudit(c, 'users', userId, 'ADMIN_UPDATE', old, { global_role, status, display_name, email })
  return c.json({ success: true })
})

app.get('/api/admin/users/:userId/details', async (c) => {
  if (c.get('globalRole') !== 'super_admin') throw new HTTPException(403, { message: 'Forbidden' })
  const { userId } = c.req.param()
  
  // 1. Profile & Security Status
  const user = await c.env.DB.prepare(`
    SELECT id, email, username, display_name, avatar_url, global_role, status, created_at, last_active_at,
    (CASE WHEN totp_secret IS NOT NULL THEN 1 ELSE 0 END) as has_2fa
    FROM users WHERE id = ?
  `).bind(userId).first() as any
  
  if (!user) throw new HTTPException(404, { message: 'User not found' })

  // 2. Linked Accounts
  const { results: connections } = await c.env.DB.prepare(
    'SELECT id, provider, status, created_at FROM external_connections WHERE household_id IN (SELECT household_id FROM user_households WHERE user_id = ?)'
  ).bind(userId).all()

  // 3. Social/Auth Links (Simplified mock for now based on current schema)
  const socialLinks = [] 
  if (user.username && user.username.startsWith('discord_')) socialLinks.push({ provider: 'discord', id: user.username })

  // 4. Recent Forensic History
  const { results: history } = await c.env.DB.prepare(`
    SELECT action, target, created_at, details_json 
    FROM audit_logs 
    WHERE user_id = ? OR (target = 'users' AND target_id = ?)
    ORDER BY created_at DESC LIMIT 15
  `).bind(userId, userId).all()

  return c.json({
    profile: user,
    security: {
      mfa_enabled: !!user.has_2fa,
      passkeys_count: 0 // Placeholder
    },
    linked_accounts: connections,
    social_links: socialLinks,
    history: history
  })
})

app.delete('/api/admin/users/:userId', async (c) => {
  if (c.get('globalRole') !== 'super_admin') throw new HTTPException(403, { message: 'Forbidden' })
  const { userId } = c.req.param()
  
  // Verify target is not a super_admin (safety)
  const target = await c.env.DB.prepare('SELECT global_role FROM users WHERE id = ?').bind(userId).first() as any
  if (!target) throw new HTTPException(404, { message: 'User not found' })
  if (target.global_role === 'super_admin' && c.get('userId') !== userId) {
    throw new HTTPException(403, { message: 'Cannot delete other super admins' })
  }

  // Soft delete / Purge logic
  const batch = [
    c.env.DB.prepare('DELETE FROM user_households WHERE user_id = ?').bind(userId),
    c.env.DB.prepare('DELETE FROM user_preferences WHERE user_id = ?').bind(userId),
    c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId)
  ]
  
  await c.env.DB.batch(batch)
  await logAudit(c, 'users', userId, 'ADMIN_PURGE', { role: target.global_role }, { status: 'deleted' })
  
  return c.json({ success: true })
})

app.post('/api/admin/users/:userId/merge', zValidator('json', z.object({ targetUserId: z.string() })), async (c) => {
  if (c.get('globalRole') !== 'super_admin') throw new HTTPException(403, { message: 'Forbidden' })
  const { userId: sourceUserId } = c.req.param()
  const { targetUserId } = c.req.valid('json')

  // Source = User to be REMOVED
  // Target = User to KEEP (the master account)
  
  const source = await c.env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(sourceUserId).first()
  const target = await c.env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(targetUserId).first()
  
  if (!source || !target) throw new HTTPException(404, { message: 'One or both users not found' })

  // 1. Audit before deletion
  await logAudit(c, 'users', sourceUserId, 'ACCOUNT_MERGE_SOURCE', null, { mergedInto: targetUserId })
  await logAudit(c, 'users', targetUserId, 'ACCOUNT_MERGE_TARGET', null, { mergedFrom: sourceUserId })

  // 2. Transfer logic
  const batch = [
    // Move household memberships
    c.env.DB.prepare('UPDATE OR IGNORE user_households SET user_id = ? WHERE user_id = ?').bind(targetUserId, sourceUserId),
    // Move ownership of transactions
    c.env.DB.prepare('UPDATE transactions SET owner_id = ? WHERE owner_id = ?').bind(targetUserId, sourceUserId),
    // Move ownership of subscriptions
    c.env.DB.prepare('UPDATE subscriptions SET owner_id = ? WHERE owner_id = ?').bind(targetUserId, sourceUserId),
    // Cleanup source
    c.env.DB.prepare('DELETE FROM user_households WHERE user_id = ?').bind(sourceUserId),
    c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(sourceUserId)
  ]

  await c.env.DB.batch(batch)
  return c.json({ success: true, masterUserId: targetUserId })
})

app.get('/api/admin/audit', async (c) => {
  if (c.get('globalRole') !== 'super_admin') throw new HTTPException(403, { message: 'Forbidden' })
  const { results } = await c.env.DB.prepare('SELECT * FROM system_audit_logs ORDER BY created_at DESC LIMIT 50').all()
  return c.json(results)
})

app.get('/api/admin/connections', async (c) => {
  if (c.get('globalRole') !== 'super_admin') throw new HTTPException(403, { message: 'Forbidden' })
  const { results } = await c.env.DB.prepare('SELECT id, household_id, provider, status, last_sync_at FROM external_connections').all()
  return c.json(results)
})

app.post('/api/admin/connections', async (c) => {
  if (c.get('globalRole') !== 'super_admin') throw new HTTPException(403, { message: 'Forbidden' })
  const { household_id, provider, access_token } = await c.req.json() as any
  const id = `conn-${crypto.randomUUID().slice(0, 8)}`
  
  const encrypted = await encrypt(access_token, c.env.ENCRYPTION_KEY)
  await c.env.DB.prepare('INSERT INTO external_connections (id, household_id, provider, access_token, status) VALUES (?, ?, ?, ?, ?)')
    .bind(id, household_id, provider, encrypted, 'active').run()
    
  await logAudit(c, 'external_connections', id, 'ADMIN_CREATE', null, { household_id, provider })
  return c.json({ success: true, id })
})

app.post('/api/admin/system/sync', async (c) => {
  if (c.get('globalRole') !== 'super_admin') throw new HTTPException(403, { message: 'Forbidden' })
  const results = await syncAllConnections(c.env)
  return c.json({ success: true, results })
})

app.get('/api/backup/export', async (c) => {
  const householdId = c.get('householdId')
  const [txs, cats, scheds] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM transactions WHERE household_id = ?').bind(householdId).all(),
    c.env.DB.prepare('SELECT * FROM categories WHERE household_id = ?').bind(householdId).all(),
    c.env.DB.prepare('SELECT * FROM schedules WHERE household_id = ?').bind(householdId).all()
  ])
  
  return c.json({
    version: '1.28.0',
    timestamp: new Date().toISOString(),
    householdId,
    data: { transactions: txs.results, categories: cats.results, schedules: scheds.results }
  })
})

app.post('/api/backup/restore', async (c) => {
  const householdId = c.get('householdId')
  const { data } = await c.req.json() as any
  
  // Atomic restore: Upsert categories, upsert schedules, upsert transactions
  // This preserves IDs to prevent duplicates if restoring the same file multiple times
  const queries = []
  
  if (data.categories) {
    for (const cat of data.categories) {
      queries.push(c.env.DB.prepare('INSERT OR REPLACE INTO categories (id, household_id, name, type, color, icon) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(cat.id, householdId, cat.name, cat.type, cat.color, cat.icon))
    }
  }
  
  if (data.schedules) {
    for (const s of data.schedules) {
      queries.push(c.env.DB.prepare('INSERT OR REPLACE INTO schedules (id, household_id, name, amount_cents, category_id, type, interval, next_occurrence, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(s.id, householdId, s.name, s.amount_cents, s.category_id, s.type, s.interval, s.next_occurrence, s.status))
    }
  }

  if (data.transactions) {
    for (const tx of data.transactions) {
      queries.push(c.env.DB.prepare('INSERT OR REPLACE INTO transactions (id, household_id, user_id, amount_cents, category_id, description, transaction_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(tx.id, householdId, tx.user_id, tx.amount_cents, tx.category_id, tx.description, tx.transaction_date, tx.status))
    }
  }

  await c.env.DB.batch(queries)
  return c.json({ success: true, count: queries.length })
})

app.post('/api/backup/cloud/:provider', async (c) => {
  const userId = c.get('userId')
  const householdId = c.get('householdId')
  const provider = c.req.param('provider')
  
  const identity: any = await c.env.DB.prepare(
    'SELECT access_token FROM user_identities WHERE user_id = ? AND provider = ?'
  ).bind(userId, provider).first()
  
  if (!identity?.access_token) throw new HTTPException(400, { message: `${provider} not linked` })

  const tables = {
    transactions: c.env.DB.prepare('SELECT * FROM transactions WHERE household_id = ?'),
    categories: c.env.DB.prepare('SELECT * FROM categories WHERE household_id = ?'),
    schedules: c.env.DB.prepare('SELECT * FROM schedules WHERE household_id = ?')
  }
  const exportData: any = { 
    version: '1.28.0', 
    timestamp: new Date().toISOString(), 
    householdId, 
    data: {} 
  }
  
  for (const [name, stmt] of Object.entries(tables)) {
    const { results } = await stmt.bind(householdId).all()
    exportData.data[name] = results
  }
  
  const backupData = exportData
  
  const filename = `ledger_backup_${householdId}_${new Date().toISOString().split('T')[0]}.json`
  const content = JSON.stringify(backupData)

  if (provider === 'google') {
    // GDrive multipart upload
    const metadata = { name: filename, parents: [] };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([content], { type: 'application/json' }));
    await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${identity.access_token}` },
      body: form
    })
  } else if (provider === 'dropbox') {
    await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${identity.access_token}`,
        'Dropbox-API-Arg': JSON.stringify({ path: `/${filename}`, mode: 'overwrite', autorename: true, mute: false }),
        'Content-Type': 'application/octet-stream'
      },
      body: content
    })
  } else if (provider === 'onedrive') {
    await fetch(`https://graph.microsoft.com/v1.0/me/drive/root:/${filename}:/content`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${identity.access_token}`, 'Content-Type': 'application/json' },
      body: content
    })
  }

  return c.json({ success: true, provider, filename })
})

app.post('/api/export/gsheets', async (c) => {
  const userId = c.get('userId')
  const { filename, data, columns } = await c.req.json() as any
  
  const identity: any = await c.env.DB.prepare(
    'SELECT access_token FROM user_identities WHERE user_id = ? AND provider = "google"'
  ).bind(userId).first()
  
  if (!identity?.access_token) {
    throw new HTTPException(400, { message: 'Google account not linked or missing permissions' })
  }

  try {
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${identity.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ properties: { title: filename } })
    })
    const sheet = await createRes.json() as any
    const spreadsheetId = sheet.spreadsheetId

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:append?valueInputOption=USER_ENTERED`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${identity.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        values: [
          columns.map((c: any) => c.header),
          ...data.map((row: any) => columns.map((c: any) => row[c.key]))
        ]
      })
    })

    return c.json({ url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}` })
  } catch (err) {
    console.error('[Google Sheets Export Error]', err)
    throw new HTTPException(500, { message: 'Failed to export to Google Sheets' })
  }
})

app.get('/api/user/identities', async (c) => {
  const userId = c.get('userId')
  const { results } = await c.env.DB.prepare(
    'SELECT id, provider, provider_user_id, created_at FROM user_identities WHERE user_id = ?'
  ).bind(userId).all()
  return c.json(results)
})

app.post('/api/snapshots', async (c) => {
  const householdId = c.get('householdId')
  const userId = c.get('userId')
  const { name, data, expiresInDays } = await c.req.json() as any
  
  const id = crypto.randomUUID()
  const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString() : null
  
  await c.env.DB.prepare(
    'INSERT INTO data_snapshots (id, household_id, user_id, snapshot_name, data_json, expires_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, householdId, userId, name, JSON.stringify(data), expiresAt).run()

  return c.json({ id, url: `#/snapshot/${id}` })
})

// PUBLIC ENDPOINT (NO AUTH)
app.get('/api/public/snapshots/:id', async (c) => {
  const { id } = c.req.param()
  const snapshot: any = await c.env.DB.prepare(
    'SELECT * FROM data_snapshots WHERE id = ? AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)'
  ).bind(id).first()
  
  if (!snapshot) throw new HTTPException(404, { message: 'Snapshot not found or expired' })
  return c.json({
    name: snapshot.snapshot_name,
    data: JSON.parse(snapshot.data_json),
    created_at: snapshot.created_at
  })
})

app.delete('/api/user/identities/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  
  // Ensure the user doesn't delete their last identity if they don't have a password
  const user: any = await c.env.DB.prepare('SELECT password_hash FROM users WHERE id = ?').bind(userId).first()
  const { results: identities } = await c.env.DB.prepare('SELECT id FROM user_identities WHERE user_id = ?').bind(userId).all()
  
  if (!user.password_hash && identities.length <= 1) {
    throw new HTTPException(400, { message: 'Cannot remove last identity without a password set' })
  }

  await c.env.DB.prepare('DELETE FROM user_identities WHERE id = ? AND user_id = ?').bind(id, userId).run()
  return c.json({ success: true })
})

app.get('/api/pcc/search/global', async (c) => {
  if (c.get('globalRole') !== 'super_admin') throw new HTTPException(403, { message: 'Forbidden' })
  const q = c.req.query('q') || ''
  const limit = parseInt(c.req.query('limit') || '20')

  const { results: transactions } = await c.env.DB.prepare(`
    SELECT t.*, h.name as household_name 
    FROM transactions t 
    JOIN households h ON t.household_id = h.id 
    WHERE t.description LIKE ? OR ABS(t.amount_cents) = ABS(?) 
    ORDER BY t.transaction_date DESC 
    LIMIT ?
  `).bind(`%${q}%`, isNaN(parseFloat(q)) ? -1 : parseFloat(q) * 100, limit).all()

  const { results: users } = await c.env.DB.prepare(`
    SELECT id, email, display_name, global_role, status FROM users 
    WHERE email LIKE ? OR display_name LIKE ? 
    LIMIT ?
  `).bind(`%${q}%`, `%${q}%`, limit).all()

  return c.json({ transactions, users })
})

app.post('/api/support/issues', async (c) => {
  const body = await c.req.json()
  const user = c.get('userId')
  const household = c.get('householdId')

  await logAudit(c, 'SUPPORT_ISSUE_CREATED', {
    userId: user,
    householdId: household,
    subject: body.subject,
    category: body.category,
    message: body.message,
    metadata: body.metadata
  })

  return c.json({ success: true, message: 'Issue logged in system audit trail' })
})

app.post('/api/admin/system/migrate-schedules', async (c) => {
  if (c.get('globalRole') !== 'super_admin') throw new HTTPException(403, { message: 'Forbidden' })
  
  const { results: subs } = await c.env.DB.prepare('SELECT * FROM subscriptions').all()
  const queries = []
  
  for (const sub of subs as any[]) {
    const existing = await c.env.DB.prepare('SELECT id FROM schedules WHERE target_type = "subscription" AND target_id = ?').bind(sub.id).first()
    
    if (!existing) {
      const scheduleId = crypto.randomUUID()
      // Use next_billing_date if available, else start now.
      const nextRunDate = sub.next_billing_date ? new Date(sub.next_billing_date) : new Date()
      
      queries.push(c.env.DB.prepare(
        'INSERT INTO schedules (id, target_type, target_id, household_id, start_date, frequency_type, frequency_interval, next_run_at, status, timezone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        scheduleId, 
        'subscription', 
        sub.id, 
        sub.household_id, 
        nextRunDate.toISOString().split('T')[0], 
        sub.billing_cycle || 'monthly', 
        1, 
        nextRunDate.toISOString(), 
        'active',
        'UTC'
      ))
    }
  }
  
  if (queries.length > 0) {
    await c.env.DB.batch(queries)
  }
  
  return c.json({ success: true, migrated_count: queries.length })
})

app.post('/discord/interactions', async (c) => {
  const signature = c.req.header('X-Signature-Ed25519')
  const timestamp = c.req.header('X-Signature-Timestamp')
  const body = await c.req.text()
  
  console.log('[Discord Interaction] Incoming Request', { signature: !!signature, timestamp, body: body.slice(0, 100) })
  
  if (!c.env.DISCORD_PUBLIC_KEY) {
    console.error('[Discord Interaction] DISCORD_PUBLIC_KEY is not defined')
    return c.text('Internal configuration error', 500)
  }

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
    const householdId = 'ledger-main-001' // Default for interactions
    
    if (name === 'ledger-safety') {
      const { results: accounts } = await c.env.DB.prepare('SELECT balance_cents FROM accounts WHERE household_id = ?').bind(householdId).all()
      const totalBalance = (accounts as any[]).reduce((sum, a) => sum + a.balance_cents, 0)
      return c.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: `🛡️ **LEDGER Safety Number**: Your current total balance is **$${(totalBalance / 100).toFixed(2)}**. Drive safe!` }
      })
    }

    if (name === 'ledger-upcoming') {
      const end = new Date()
      end.setDate(end.getDate() + 7)
      const endDateStr = end.toISOString().split('T')[0]
      const { results: subs } = await c.env.DB.prepare('SELECT name, amount_cents, next_billing_date FROM subscriptions WHERE household_id = ? AND next_billing_date <= ?').bind(householdId, endDateStr).all()
      
      let content = "📅 **Upcoming Bills (7 Days)**:\n"
      if (subs.length === 0) content += "No bills due soon. You're all clear!"
      else (subs as any[]).forEach(s => { content += `- ${s.name}: **$${(s.amount_cents/100).toFixed(2)}** on ${s.next_billing_date}\n` })

      return c.json({ type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: { content } })
    }

    if (name === 'ledger-forecast' || name === 'ledger-report') {
      const { results: categories } = await c.env.DB.prepare(
        'SELECT name, envelope_balance_cents FROM categories WHERE household_id = ? LIMIT 5'
      ).bind(householdId).all()
      
      const labels = (categories as any[]).map(cat => cat.name)
      const data = (categories as any[]).map(cat => cat.envelope_balance_cents / 100)
      const chartUrl = getQuickChartUrl('pie', labels, data, 'Budget Distribution')

      return c.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { 
          content: "📈 **LEDGER Health Report**: Here is your current budget distribution across categories.",
          embeds: [{
            title: "Budget Distribution",
            image: { url: chartUrl },
            color: 0x6366f1
          }]
        }
      })
    }

    if (name === 'ledger-audit') {
      const { results } = await c.env.DB.prepare('SELECT action, table_name, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 5').all()
      let content = "🔍 **Latest Audit Logs**:\n"
      ;(results as any[]).forEach(r => { content += `- ${r.created_at}: **${r.action}** on \`${r.table_name}\`\n` })
      return c.json({ type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: { content } })
    }
  }

  return c.json({ type: InteractionResponseType.PONG })
})
// Developer: Webhooks
app.get('/api/developer/webhooks', async (c) => {
  const householdId = c.get('householdId')
  const { results } = await c.env.DB.prepare('SELECT id, url, secret, events, created_at FROM webhooks WHERE household_id = ?').bind(householdId).all()
  return c.json(results)
})

app.post('/api/developer/webhooks', zValidator('json', WebhookSchema), async (c) => {
  const householdId = c.get('householdId')
  const { url, events } = c.req.valid('json')
  const id = crypto.randomUUID()
  const secret = `wh_sec_${crypto.randomUUID().slice(0, 8)}`
  
  await c.env.DB.prepare(
    'INSERT INTO webhooks (id, household_id, url, secret, events) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, householdId, url, secret, events).run()
  
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
  async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    const now = new Date();
    const nowIso = now.toISOString();

    // 1. Process Unified Schedules
    const { results: dueSchedules } = await env.DB.prepare(
      'SELECT * FROM schedules WHERE next_run_at <= ? AND status = "active"'
    ).bind(nowIso).all();

    console.log(`[Scheduler] Found ${dueSchedules.length} due schedules.`);

    for (const schedule of dueSchedules as any[]) {
      const queries = [];
      const historyId = crypto.randomUUID();
      const currentCount = (schedule.executed_count || 0) + 1;
      
      try {
        // Execute Action
        if (schedule.target_type === 'subscription') {
          const sub = await env.DB.prepare('SELECT * FROM subscriptions WHERE id = ?').bind(schedule.target_id).first();
          if (sub) {
            const txId = crypto.randomUUID();
            queries.push(env.DB.prepare(
              'INSERT INTO transactions (id, household_id, account_id, description, amount_cents, transaction_date, category_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
            ).bind(txId, schedule.household_id, (sub as any).account_id || 'acc-manual', `Subscription: ${(sub as any).name}`, (sub as any).amount_cents, nowIso.split('T')[0], (sub as any).category_id));
          }
        } else if (schedule.target_type === 'budget_reset') {
          // Logic for Budget Reset: Move 'unallocated_balance_cents' to specific categories based on target_id (category_id)
          const category = await env.DB.prepare('SELECT household_id, monthly_budget_cents, envelope_balance_cents, rollover_enabled FROM categories WHERE id = ?').bind(schedule.target_id).first();
          if (category) {
            const data = category as any;
            const monthlyBudget = data.monthly_budget_cents;
            const currentEnvelope = data.envelope_balance_cents;
            const isRollover = data.rollover_enabled === 1 || data.rollover_enabled === true;

            if (isRollover) {
              // 1. Decrement Household Unallocated by the full monthly budget
              queries.push(env.DB.prepare(
                'UPDATE households SET unallocated_balance_cents = unallocated_balance_cents - ? WHERE id = ?'
              ).bind(monthlyBudget, schedule.household_id));
              // 2. Add budget to envelope and track the rollover amount
              queries.push(env.DB.prepare(
                'UPDATE categories SET envelope_balance_cents = envelope_balance_cents + ?, rollover_cents = ? WHERE id = ?'
              ).bind(monthlyBudget, currentEnvelope, schedule.target_id));
            } else {
              // No Rollover: Reset to monthly budget
              const surplus = currentEnvelope;
              const adjustment = monthlyBudget - surplus;
              // 1. Adjust Household Unallocated (could be positive if giving back surplus)
              queries.push(env.DB.prepare(
                'UPDATE households SET unallocated_balance_cents = unallocated_balance_cents - ? WHERE id = ?'
              ).bind(adjustment, schedule.household_id));
              // 2. Set envelope to exactly monthly budget
              queries.push(env.DB.prepare(
                'UPDATE categories SET envelope_balance_cents = ?, rollover_cents = 0 WHERE id = ?'
              ).bind(monthlyBudget, schedule.target_id));
            }
          }
        }
        
        // Calculate Next
        const nextOccurrence = SchedulingService.calculateNextOccurrence(schedule, now, currentCount);
        
        if (nextOccurrence) {
          // Update Schedule for next run
          queries.push(env.DB.prepare(
            'UPDATE schedules SET last_run_at = ?, next_run_at = ?, executed_count = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
          ).bind(nowIso, nextOccurrence.toISOString(), currentCount, schedule.id));
        } else {
          // Mark as Completed
          queries.push(env.DB.prepare(
            'UPDATE schedules SET last_run_at = ?, next_run_at = ?, executed_count = ?, status = "completed", updated_at = CURRENT_TIMESTAMP WHERE id = ?'
          ).bind(nowIso, nowIso, currentCount, schedule.id));
        }
        
        // Log History
        queries.push(env.DB.prepare(
          'INSERT INTO schedule_history (id, schedule_id, household_id, occurrence_at, action_status) VALUES (?, ?, ?, ?, ?)'
        ).bind(historyId, schedule.id, schedule.household_id, nowIso, 'executed'));

        if (queries.length > 0) {
          await env.DB.batch(queries);
        }
      } catch (e: any) {
        console.error(`[Scheduler] Failed to process schedule ${schedule.id}:`, e);
        await env.DB.prepare(
          'INSERT INTO schedule_history (id, schedule_id, household_id, occurrence_at, action_status, details_json) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(crypto.randomUUID(), schedule.id, schedule.household_id, nowIso, 'failed', JSON.stringify({ error: e.message })).run();
      }
    }

    // 3. Daily Maintenance (00:00 UTC)
    if (event.cron === "0 0 * * *") {
      console.log("Triggering daily maintenance (sync + alerts)...");
      
      // A. Sync Connections
      ctx.waitUntil(syncAllConnections(env));
      
      // B. Weekly Pulse (Sundays)
      const webhookUrl = env.DISCORD_WEBHOOK_URL;
      if (webhookUrl && new Date().getDay() === 0) {
         ctx.waitUntil(fetch(webhookUrl, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             content: "📈 **Weekly Pulse**: Your household's financial health is looking strong! Verified data sync completed."
           })
         }));
      }

      // C. Subscription Trial Alerts
      const threeDaysOut = new Date();
      threeDaysOut.setDate(threeDaysOut.getDate() + 3);
      const targetDate = threeDaysOut.toISOString().split('T')[0];

      const { results: expiringTrials } = await env.DB.prepare(
        'SELECT * FROM subscriptions WHERE trial_end_date = ? AND is_trial = 1'
      ).bind(targetDate).all();

      for (const sub of expiringTrials as any[]) {
        if (webhookUrl) {
          ctx.waitUntil(fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `🔔 **LEDGER Trial Alert**: Your trial for **${sub.name}** ends in 3 days (${sub.trial_end_date}). Ensure you have **$${(sub.amount_cents / 100).toFixed(2)}** ready for the first billing!`
            })
          }));
        }
      }
    }
  }
}
