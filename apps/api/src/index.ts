import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { csrf } from 'hono/csrf'
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
import supportRoutes from './routes/support'
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
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'x-household-id'],
  exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
  maxAge: 600,
  credentials: true,
}))
app.use('*', secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "https://static.cloudflareinsights.com"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    imgSrc: ["'self'", "data:", "https://ledger.gpnet.dev"],
    connectSrc: ["'self'", "https://api.gpnet.dev", "https://ledger.gpnet.dev", "http://localhost:8787"],
    upgradeInsecureRequests: [],
  },
  referrerPolicy: 'strict-origin-when-cross-origin',
  xPermittedCrossDomainPolicies: 'none',
}))
app.use('*', csrf())

// 4. Self-Healing Middleware (v3.15.1)
app.use('*', async (c, next) => {
  if (c.req.path.startsWith('/api/')) {
    try {
      await c.env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS system_config (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
          config_key TEXT NOT NULL UNIQUE,
          config_value TEXT,
          value_type TEXT DEFAULT 'string',
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `).run();
    } catch (e) {
      console.error('[Self-Heal] Failed to verify system_config table:', e);
    }
  }
  await next();
});

// 5. Rate Limiting (Persistent via Durable Objects)
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
ledger.get('/ping', (c) => c.text(`PONG - LEDGER ${c.env.ENVIRONMENT === 'production' ? 'v3.16.1' : 'DEV'} IS LIVE`))
ledger.get('/openapi.json', (c) => c.json(openApiSpec))

// System Config & Theme (Universal Context)
ledger.get('/api/config', async (c) => {
  const { results: configs } = await c.env.DB.prepare('SELECT config_key, config_value FROM system_config').all()
  return c.json(configs.reduce((acc: any, curr) => ({ ...acc, [curr.config_key as string]: JSON.parse(curr.config_value as string) }), {}))
})

ledger.get('/api/theme/broadcast', async (c) => {
  try {
    const config = await c.env.DB.prepare('SELECT config_value FROM system_config WHERE config_key = "broadcast_theme_id"').first()
    if (!config) return c.json({ themeId: null })
    return c.json({ themeId: JSON.parse((config as any).config_value) })
  } catch (e) {
    return c.json({ themeId: null })
  }
})

ledger.post('/api/theme/broadcast', async (c) => {
  const { themeId } = await c.req.json()
  await c.env.DB.prepare('INSERT OR REPLACE INTO system_config (id, config_key, config_value, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)')
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

// 6. Global Route Mounting
ledger.route('/auth', authRoutes)
ledger.route('/api/financials', financialsRoutes)
ledger.route('/api/planning', planningRoutes)
ledger.route('/api/user', userRoutes)
ledger.route('/api/interop', interopRoutes)
ledger.route('/api/pcc', pccRoutes)
ledger.route('/api/support', supportRoutes)

ledger.route('/discord', discordRoutes)


// 6. Global Error Handler
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
