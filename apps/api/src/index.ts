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

// Legacy compatibility and shorter paths
ledger.route('/api', interopRoutes) 
ledger.route('/discord', discordRoutes)

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
