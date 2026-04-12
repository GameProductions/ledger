import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { csrf } from 'hono/csrf'
import { secureHeaders } from 'hono/secure-headers'
import { openApiSpec } from './openapi'
import { Bindings, Variables } from './types'
import { authMiddleware } from './middlewares/auth-middleware'
import { pccMiddleware } from './middlewares/pcc-middleware'
import { getDb } from './db'
import { systemConfig } from './db/schema'
import { eq } from 'drizzle-orm'

// Route Imports
import authRoutes from './routes/auth'
import webauthnRoutes from './routes/webauthn'
import financialsRoutes from './routes/financials'
import planningRoutes from './routes/planning'
import userRoutes from './routes/user'
import pccRoutes from './routes/pcc'
import dataRoutes from './routes/data-service'
import interopRoutes from './routes/interop'
import backupRoutes from './routes/backup'
import discordRoutes from './discord'
import supportRoutes from './routes/support'

// Durable Objects Exports (Required for Cloudflare)
export { HouseholdSession, Vault, RateLimiter } from './durable-objects'

// Root App (Consolidated v3.29.1)
export const app = new Hono<{ Bindings: Bindings, Variables: Variables }>()

// 1. Global Middleware & Security
app.use('*', logger())

// [SECURITY] Strict Content Security Policy & Headers
app.use('*', secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "https://static.cloudflareinsights.com"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    imgSrc: ["'self'", "data:", "https://ledger.gpnet.dev", "https://www.gstatic.com", "https://raw.githubusercontent.com", "https://cdn.simpleicons.org", "https://flaticons.net", "https://cdn-icons-png.flaticon.com", "https://api.dicebear.com", "https://cdn.discordapp.com", "https://media.giphy.com", "https://i.giphy.com", "https://media0.giphy.com", "https://media1.giphy.com", "https://media2.giphy.com", "https://media3.giphy.com", "https://media4.giphy.com", "https://tenor.com", "https://media.tenor.com", "https://images.unsplash.com"],
    connectSrc: ["'self'", "https://api.gpnet.dev", "https://ledger.gpnet.dev", "http://localhost:8787"],
    upgradeInsecureRequests: [],
  },
  referrerPolicy: 'strict-origin-when-cross-origin',
  xPermittedCrossDomainPolicies: 'none',
}))

// Global CSRF Protection (Exempting non-mutating manifests)
app.use('*', (c, next) => {
  const path = c.req.path
  if (path.includes('.well-known') || path === '/ping' || path === '/openapi.json' || path === '/api/health') {
    return next()
  }
  return csrf()(c, next)
})

// Rate Limiting (Persistent via Durable Objects)
app.use('*', async (c, next) => {
  const path = c.req.path
  if (path.startsWith('/api/') || path.startsWith('/auth/')) {
    const ip = c.req.header('cf-connecting-ip') || 'anon'
    const id = c.env.RATE_LIMITER.idFromName(ip)
    const obj = c.env.RATE_LIMITER.get(id)
    const res = await obj.fetch(new URL(`http://rate-limit?ip=${encodeURIComponent(ip)}&limit=100`, c.req.url))
    
    c.header('X-RateLimit-Limit', res.headers.get('X-RateLimit-Limit') || '100')
    c.header('X-RateLimit-Remaining', res.headers.get('X-RateLimit-Remaining') || '99')
    
    if (res.status === 429) {
      c.header('Retry-After', res.headers.get('Retry-After') || '60')
      return c.json({ error: 'Too many requests' }, 429)
    }
  }
  await next()
})

// 2. Health & System Information
app.get('/ping', (c) => c.text('PONG - LEDGER v3.29.1 IS LIVE'))

app.get('/api/health', async (c) => {
  let dbStatus = "connected";
  try {
     await getDb(c.env).select({ configKey: systemConfig.configKey }).from(systemConfig).limit(1);
  } catch (e) {
     dbStatus = "error";
  }

  return c.json({
    status: dbStatus === "connected" ? "online" : "degraded",
    database: dbStatus,
    service: "ledger",
    environment: c.env.ENVIRONMENT || "development",
    timestamp: Date.now() 
  });
})

app.get('/openapi.json', (c) => c.json(openApiSpec))

// 3. Global Auth Middleware Allocation
app.use('/api/*', async (c, next) => {
  const path = c.req.path
  const method = c.req.method

  const publicPaths = ['/api/config', '/api/theme/broadcast', '/api/health']
  const isPublicApi = publicPaths.includes(path) || path.startsWith('/api/discord') || (method === 'OPTIONS')
  
  if (isPublicApi) return await next()
  return authMiddleware(c, next)
})

// Specific Middleware Chains
app.use('/auth/profile/*', authMiddleware)
app.use('/auth/totp/*', authMiddleware)
app.use('/auth/vault/*', authMiddleware)
app.use('/auth/password/*', authMiddleware)
app.use('/api/pcc/*', pccMiddleware)

// 4. Route Mounting (Targeted Protocols)
app.route('/auth', authRoutes)
app.route('/api/auth', authRoutes) // Cross-namespace verification support
app.route('/api/auth', webauthnRoutes)
app.route('/api/financials', financialsRoutes)
app.route('/api/planning', planningRoutes)
app.route('/api/user', userRoutes)
app.route('/api/data', dataRoutes)
app.route('/api/interop', interopRoutes)
app.route('/api/pcc', pccRoutes)
app.route('/api/backup', backupRoutes)
app.route('/api/support', supportRoutes)
app.route('/api/discord', discordRoutes)

// 5. System Configuration & Theme Handling
app.get('/api/config', async (c) => {
  const cached = await c.env.LEDGER_CACHE?.get('API_CONFIG', 'json')
  if (cached) return c.json(cached)

  const db = getDb(c.env)
  const configs = await db.select({ configKey: systemConfig.configKey, configValue: systemConfig.configValue }).from(systemConfig);
  const result = configs.reduce((acc: any, curr: any) => ({ ...acc, [curr.configKey as string]: curr.configValue ? JSON.parse(curr.configValue as string) : null }), {})
  
  if (c.env.LEDGER_CACHE) c.executionCtx.waitUntil(c.env.LEDGER_CACHE.put('API_CONFIG', JSON.stringify(result), { expirationTtl: 300 }))
  return c.json(result)
})

app.get('/api/theme/broadcast', async (c) => {
  try {
    const cached = await c.env.LEDGER_CACHE?.get('THEME_BROADCAST', 'json')
    if (cached) return c.json(cached)

    const db = getDb(c.env)
    const config = await db.select({ configValue: systemConfig.configValue }).from(systemConfig).where(eq(systemConfig.configKey, "broadcast_theme_id")).limit(1).then(res => res[0]);
    if (!config || !config.configValue) return c.json({ themeId: null })
    
    const result = { themeId: JSON.parse(config.configValue as string) }
    if (c.env.LEDGER_CACHE) c.executionCtx.waitUntil(c.env.LEDGER_CACHE.put('THEME_BROADCAST', JSON.stringify(result), { expirationTtl: 60 }))
    return c.json(result)
  } catch (e) {
    return c.json({ themeId: null })
  }
})

app.post('/api/theme/broadcast', async (c) => {
  const { themeId } = await c.req.json()
  const db = getDb(c.env)
  await db.insert(systemConfig).values({
    id: crypto.randomUUID(),
    configKey: 'broadcast_theme_id',
    configValue: JSON.stringify(themeId)
  }).onConflictDoUpdate({
    target: [systemConfig.configKey],
    set: { configValue: JSON.stringify(themeId) }
  });
  if (c.env.LEDGER_CACHE) c.executionCtx.waitUntil(c.env.LEDGER_CACHE.delete('THEME_BROADCAST'))
  return c.json({ success: true })
})

// 6. Identity Verification (Bridges)
const msVerification = (c: any) => {
  c.header('Content-Type', 'application/json; charset=utf-8')
  c.header('Access-Control-Allow-Origin', '*')
  return c.json({
    associatedApplications: [
      { applicationId: "f9927aec-9a57-463c-971b-95f9dc0e7f16" }
    ]
  })
}
app.get('/.well-known/microsoft-identity-association.json', msVerification)

// 7. Global Error Handler
app.onError((err, c) => {
  const isProduction = c.env.ENVIRONMENT === 'production'
  const status = (err as any).status || 500
  
  console.error(`[Global Error] ${c.req.method} ${c.req.path} - Status: ${status}`, err)
  
  return c.json({
    error: isProduction ? 'Internal Server Error' : err.message,
    status,
    path: isProduction ? undefined : c.req.path,
    stack: isProduction ? undefined : err.stack
  }, status)
})
