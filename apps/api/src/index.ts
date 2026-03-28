import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { openApiSpec } from './openapi'
import { Bindings, Variables } from './types'
import { authMiddleware } from './middlewares/auth-middleware'
import { pccMiddleware } from './middlewares/pcc-middleware'
import { AUTH_EXCLUSIONS } from './constants'

// Route Imports
import authRoutes from './routes/auth'
import financialsRoutes from './routes/financials'
import planningRoutes from './routes/planning'
import userRoutes from './routes/user'
import pccRoutes from './routes/pcc'
import interopRoutes from './routes/interop'
import discordRoutes from './discord'
import { handleScheduled } from './cron'

// Durable Objects Exports (Required for Cloudflare)
export { HouseholdSession, Vault, RateLimiter } from './durable-objects'

// Root App (Supporting both root domain and /ledger/ prefix)
export const app = new Hono<{ Bindings: Bindings, Variables: Variables }>()

// 🛑 PROTOCOL ZERO: Root-Level verification placeholder

// 1. Root-Level verification placeholder (moved below middleware for better header support)

// 2. Global Middleware
app.use('*', logger())
app.use('*', cors({
  origin: ['https://ledger.gpnet.dev', 'http://localhost:5173'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'x-household-id'],
  exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
  maxAge: 600,
  credentials: true,
}))
app.use('*', secureHeaders())

// 3. Rate Limiting (Persistent via Durable Objects)
app.use('/api/*', async (c, next) => {
  const ip = c.req.header('cf-connecting-ip') || 'anon'
  const id = c.env.RATE_LIMITER.idFromName(ip)
  const obj = c.env.RATE_LIMITER.get(id)
  const res = await obj.fetch(new URL(`http://rate-limit?ip=${encodeURIComponent(ip)}&limit=100`, c.req.url))
  if (res.status === 429) return c.json({ error: 'Too many requests' }, 429)
  await next()
})

// 4. Authentication Logic
app.use('*', async (c, next) => {
  const path = c.req.path
  const method = c.req.method
  
  // Standard Exclusions + Auth Exclusions from constants
  const isExcluded = AUTH_EXCLUSIONS.some(e => path === e || path === e + '/') || 
                    path.endsWith('/api/theme/broadcast') ||
                    path.endsWith('/api/config') ||
                    path.includes('/debug/') || 
                    path.includes('/discord/interactions') ||
                    path.includes('/.well-known/') ||
                    (method === 'OPTIONS')

  if (isExcluded) return await next()
  return authMiddleware(c, next)
})

// 5. Route Mounting
const ledger = new Hono<{ Bindings: Bindings, Variables: Variables }>()

// Health & Docs
ledger.get('/ping', (c) => c.text('PONG - LEDGER v3.0.0 IS LIVE'))
ledger.get('/openapi.json', (c) => c.json(openApiSpec))

// System Config & Theme (Universal Context)
ledger.get('/api/config', async (c) => {
  const { results: configs } = await c.env.DB.prepare('SELECT key, value_json FROM system_configs').all()
  return c.json(configs.reduce((acc: any, curr) => ({ ...acc, [curr.key as string]: JSON.parse(curr.value_json as string) }), {}))
})

ledger.get('/api/theme/broadcast', async (c) => {
  try {
    const config = await c.env.DB.prepare('SELECT value_json FROM system_configs WHERE key = "broadcast_theme_id"').first()
    if (!config) return c.json({ themeId: null })
    return c.json({ themeId: JSON.parse((config as any).value_json) })
  } catch (e) {
    return c.json({ themeId: null })
  }
})

ledger.post('/api/theme/broadcast', async (c) => {
  const { themeId } = await c.req.json()
  await c.env.DB.prepare('INSERT OR REPLACE INTO system_configs (id, key, value_json, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)')
    .bind(crypto.randomUUID(), 'broadcast_theme_id', JSON.stringify(themeId)).run()
  return c.json({ success: true })
})

// 1. Root-Level verification (Microsoft Identity) - Redundant on both routers
const msVerification = (c: any) => {
  c.header('Content-Type', 'application/json; charset=utf-8')
  c.header('Access-Control-Allow-Origin', '*')
  return c.json({
    associatedApplications: [
      { applicationId: "f9927aec-9a57-463c-971b-95f9dc0e7f16" }
    ]
  })
}

ledger.get('/.well-known/microsoft-identity-association.json', msVerification)
app.get('/.well-known/microsoft-identity-association.json', msVerification)

// Feature Routes
ledger.route('/auth', authRoutes)
ledger.route('/api/financials', financialsRoutes)
ledger.route('/api/planning', planningRoutes)
ledger.route('/api/user', userRoutes)
ledger.route('/api/interop', interopRoutes)
ledger.route('/api/pcc', pccRoutes)

ledger.route('/discord', discordRoutes)

// 🌉 Bridge Routes: Maintain backward compatibility for legacy frontend paths
ledger.get('/api/households', async (c) => {
  const userId = c.get('userId')
  const { results } = await c.env.DB.prepare('SELECT h.*, uh.role FROM households h JOIN user_households uh ON h.id = uh.household_id WHERE uh.user_id = ?').bind(userId).all()
  return c.json(results)
})
ledger.get('/api/budgets', async (c) => {
  const householdId = c.get('householdId')
  const household: any = await c.env.DB.prepare('SELECT unallocated_balance_cents FROM households WHERE id = ?').bind(householdId).first()
  const { results: categories } = await c.env.DB.prepare('SELECT * FROM categories WHERE household_id = ?').bind(householdId).all()
  const { results: spends } = await c.env.DB.prepare('SELECT category_id, SUM(amount_cents) as total_spend FROM transactions WHERE household_id = ? GROUP BY category_id').bind(householdId).all()
  const budgets = categories.map((cat: any) => ({ ...cat, spend_cents: spends.find((s: any) => s.category_id === cat.id)?.total_spend || 0 }))
  return c.json({ unallocated_balance_cents: household?.unallocated_balance_cents || 0, budgets })
})
ledger.route('/api/savings', financialsRoutes) // /api/savings/buckets -> /api/savings/buckets (Matches sub-route)
ledger.route('/api/analytics', interopRoutes) // /api/analytics/summary -> /api/analytics/summary (Matches interop sub-route)
ledger.route('/api/financials/analytics', interopRoutes) // Bridge for current prefix mismatch
ledger.route('/api/pcc/audit', pccRoutes) 
ledger.route('/api/onboarding', userRoutes) 

// Mount ledger app on root as well as /ledger for compatibility
app.route('/ledger', ledger)
app.route('/', ledger) // Evolutionary Leap: Supports root domain directly

// 6. Global Error Handler
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
    await handleScheduled(event, env, ctx)
  }
}
