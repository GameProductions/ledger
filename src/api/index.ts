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
import webauthnRoutes from './routes/webauthn'
import financialsRoutes from './routes/financials'
import planningRoutes from './routes/planning'
import userRoutes from './routes/user'
import pccRoutes from './routes/pcc'
import dataRoutes from './routes/data-service'
import backupRoutes from './routes/backup'
import discordRoutes from './discord'
import supportRoutes from './routes/support'
import { handleScheduled } from './cron'

// Durable Objects Exports (Required for Cloudflare)
export { HouseholdSession, Vault, RateLimiter } from './durable-objects'

// Root App (Supporting both root domain and /ledger/ prefix)
export const app = new Hono<{ Bindings: Bindings, Variables: Variables }>()

// 🛑 PROTOCOL ZERO: Root-Level verification placeholder

// 1. Root-Level verification placeholder (moved below middleware for better header support)

// 2. Global Middleware (CORS managed by server entry point)
app.use('*', logger())
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
app.use('*', (c, next) => {
  const path = c.req.path
  if (path.startsWith('/api/') || path.startsWith('/auth/') || path.includes('.well-known')) {
    return next()
  }
  return csrf()(c, next)
})

// 4. Self-Healing Middleware (v3.15.1 - Expanded v3.21)
app.use('*', async (c, next) => {
  if (c.req.path.startsWith('/api/')) {
    try {
      await c.env.DB.batch([
        c.env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS system_config (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
            config_key TEXT NOT NULL UNIQUE,
            config_value TEXT,
            value_type TEXT DEFAULT 'string',
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `),
        c.env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS system_feature_flags (
            id TEXT PRIMARY KEY,
            feature_key TEXT NOT NULL UNIQUE,
            enabled_globally INTEGER DEFAULT 0,
            target_user_ids TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `),
        c.env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS system_registry (
            id TEXT PRIMARY KEY,
            item_type TEXT NOT NULL,
            name TEXT NOT NULL,
            logo_url TEXT,
            website_url TEXT,
            metadata_json TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `),
        c.env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS billing_processors (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            website_url TEXT,
            branding_url TEXT,
            support_url TEXT,
            subscription_id_notes TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `),
        c.env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS system_announcements (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            content_md TEXT NOT NULL,
            priority TEXT DEFAULT 'info',
            actor_id TEXT REFERENCES users(id),
            is_active INTEGER DEFAULT 1,
            expires_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `),
        c.env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS system_walkthroughs (
            id TEXT PRIMARY KEY,
            version TEXT NOT NULL,
            title TEXT NOT NULL,
            content_md TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `),
        c.env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS pcc_audit_logs (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            action TEXT NOT NULL,
            target TEXT NOT NULL,
            target_id TEXT,
            details_json TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
          );
        `)
      ]);
    } catch (e) {
      console.error('[Self-Heal] Failed to verify system tables:', e);
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
  
  c.header('X-RateLimit-Limit', res.headers.get('X-RateLimit-Limit') || '100')
  c.header('X-RateLimit-Remaining', res.headers.get('X-RateLimit-Remaining') || '99')
  
  if (res.status === 429) {
    c.header('Retry-After', res.headers.get('Retry-After') || '60')
    return c.json({ error: 'Too many requests' }, 429)
  }
  await next()
})

// 4. Authentication Protocol (v3.17.3 - Migrated to Targeted Handlers)

// 6. Maintenance Mode Protocol (v3.21) - Forensic Override for Admins
app.use('/api/*', async (c, next) => {
  const path = c.req.path
  if (path.includes('/api/pcc/') || path.includes('/api/config') || path.includes('/api/auth/')) {
    return await next()
  }

  try {
    const config = await getDb(c.env).select({ configValue: systemConfig.configValue }).from(systemConfig).where(eq(systemConfig.configKey, 'MAINTENANCE_MODE')).limit(1).then(res => res[0]);
    if (config?.configValue === 'true') {
      const user = c.get('userId') as any
      if (user?.global_role !== 'super_admin') {
        return c.json({ 
          error: 'System Maintenance in Progress', 
          message: 'Ledger is currently under scheduled maintenance. God Mode users retain full access.' 
        }, 503)
      }
    }
  } catch (e) {}
  await next()
})

import { getDb } from './db'
import { systemConfig } from './db/schema'
import { eq } from 'drizzle-orm'

// 5. Route Mounting
const ledger = new Hono<{ Bindings: Bindings, Variables: Variables }>()

// Health & Docs
ledger.get('/ping', (c) => c.text(`PONG - LEDGER ${c.env.ENVIRONMENT === 'production' ? 'v3.20.1' : 'DEV'} IS LIVE`))
import pkg from '../../package.json';

ledger.get('/api/health', async (c) => {
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
    versions: {
      production: pkg.version, 
      development: `${pkg.version}-dev`
    },
    timestamp: Date.now() 
  });
})
ledger.get('/openapi.json', (c) => c.json(openApiSpec))

// System Config & Theme (Universal Context)
ledger.get('/api/config', async (c) => {
  const cached = await c.env.LEDGER_CACHE?.get('API_CONFIG', 'json')
  if (cached) return c.json(cached)

  const db = getDb(c.env)
  const configs = await db.select({ configKey: systemConfig.configKey, configValue: systemConfig.configValue }).from(systemConfig);
  const result = configs.reduce((acc: any, curr: any) => ({ ...acc, [curr.configKey as string]: curr.configValue ? JSON.parse(curr.configValue as string) : null }), {})
  
  if (c.env.LEDGER_CACHE) c.executionCtx.waitUntil(c.env.LEDGER_CACHE.put('API_CONFIG', JSON.stringify(result), { expirationTtl: 300 }))
  return c.json(result)
})

ledger.get('/api/theme/broadcast', async (c) => {
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

ledger.post('/api/theme/broadcast', async (c) => {
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
// 6. Global Route Mounting
// Targeted Authentication Protocol (v3.17.3)
ledger.use('/api/*', async (c, next) => {
  const path = c.req.path
  const method = c.req.method

  const isPublicApi = path === '/api/config' || path === '/api/theme/broadcast' || path.startsWith('/api/discord') || (method === 'OPTIONS')
  if (isPublicApi) return await next()
  
  return authMiddleware(c, next)
})

ledger.use('/auth/profile/*', authMiddleware)
ledger.use('/auth/totp/*', authMiddleware)
ledger.use('/auth/vault/*', authMiddleware)
ledger.use('/auth/password/*', authMiddleware)
ledger.use('/api/pcc/*', pccMiddleware)

ledger.route('/auth', authRoutes)
ledger.route('/api/auth', webauthnRoutes)
ledger.route('/api/financials', financialsRoutes)
ledger.route('/api/planning', planningRoutes)
ledger.route('/api/user', userRoutes)
ledger.route('/api/data', dataRoutes)
ledger.route('/api/pcc', pccRoutes)
ledger.route('/api/backup', backupRoutes)
ledger.route('/api/support', supportRoutes)

ledger.route('/api/discord', discordRoutes)


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
