import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { csrf } from 'hono/csrf'
import { secureHeaders } from 'hono/secure-headers'
import { cors } from 'hono/cors'
import { openApiSpec } from './openapi'
import { Bindings, Variables } from './types'
import { authMiddleware } from './middlewares/auth-middleware'
import { adminMiddleware } from './middlewares/admin-middleware'
import { stepUpMiddleware } from './middlewares/step-up-middleware'
import { getDb } from '#/index'
import { systemConfig } from '#/schema'
import { eq } from 'drizzle-orm'
import { logAudit } from './utils'
import { ipRateLimit } from './utils/rate-limit'

// Route Imports
import authRoutes from './routes/auth'
import financialsRoutes from './routes/financials'
import planningRoutes from './routes/planning'
import userRoutes from './routes/user'
import adminRoutes from './routes/admin'
import dataRoutes from './routes/data-service'
import interopRoutes from './routes/interop'
import backupRoutes from './routes/backup'
import discordRoutes from './discord'
import supportRoutes from './routes/support'
import trackedExpensesRoutes from './routes/tracked-expenses'


// Durable Objects Exports (Required for Cloudflare)
export { HouseholdSession, Vault } from './durable-objects'

// Root App (Consolidated)
export const app = new Hono<{ Bindings: Bindings, Variables: Variables }>()

// 1. Global Middleware & Security
app.use('*', logger())

// [SECURITY] Security headers are handled by the worker-level entry point (worker.ts)
// to ensure consistency between static assets and API routes.

// Global CSRF Protection (Exempting non-mutating manifests)
app.use('*', (c, next) => {
  const path = c.req.path
  if (path.includes('.well-known') || path === '/ping' || path === '/openapi.json' || path === '/api/health') {
    return next()
  }
  return csrf()(c, next)
})


// Traffic Management
app.use('*', async (c, next) => {
  const path = c.req.path
  
  // 1. Maintenance Status Check
  const isHardLocked = c.env.MAINTENANCE_MODE === 'true'
  let isSoftLocked = false
  let isGlobalLocked = false
  
  // Try to get from cache first to avoid D1 cold starts on every request
  try {
    const cache = (c.env.LEDGER_CACHE || c.env.TITAN_GUARD_CACHE) as any;
    let configCache: Record<string, string> | null = null;
    
    if (cache && typeof cache.get === 'function') {
      configCache = await cache.get('API_CONFIG', 'json');
    }

    if (configCache && configCache.MAINTENANCE_MODE === 'true') {
      isSoftLocked = true;
    } else if (!configCache) {
      // If cache is empty or unavailable, we must check DB to ensure we don't bypass on cache flush
      try {
        const db = getDb(c.env)
        const dbConfig = await db.select({ configValue: systemConfig.configValue })
          .from(systemConfig)
          .where(eq(systemConfig.configKey, 'MAINTENANCE_MODE'))
          .limit(1)
          .then(res => res[0])
        
        if (dbConfig?.configValue === 'true') isSoftLocked = true
      } catch (dbErr) {
        console.error('[Maintenance Check] Database query failed:', dbErr)
      }
    }

    // --- LEVEL 3: Global Status Check ---
    // Cache the global status for 60 seconds to avoid DDOSing Foundation
    let globalStatusCache = null;
    if (cache && typeof cache.get === 'function') {
       globalStatusCache = await cache.get('global:maintenance');
    }
    if (globalStatusCache === 'true') {
      isGlobalLocked = true
    } else if (globalStatusCache === null) {
      // Fallback: Perform background fetch to Foundation
      const foundationUrl = c.env.FOUNDATION_URL || (c.env.ENVIRONMENT === 'production' ? 'https://foundation.gpnet.dev' : 'http://localhost:8787');
      try {
        const res = await fetch(`${foundationUrl}/api/fleet/status`);
        const data = await res.json() as { globalMaintenance: boolean };
        if (data.globalMaintenance === true) {
          isGlobalLocked = true;
          await (c.env.TITAN_GUARD_CACHE || c.env.LEDGER_CACHE)?.put('global:maintenance', 'true', { expirationTtl: 60 });
        } else {
          await (c.env.TITAN_GUARD_CACHE || c.env.LEDGER_CACHE)?.put('global:maintenance', 'false', { expirationTtl: 60 });
        }
      } catch (fetchErr) {
        console.error('[Global Lock Fetch Failed]', fetchErr);
      }
    }

    // --- LEVEL 2.5: Project Status Check ---
    const remoteIndividualCache = await (c.env.TITAN_GUARD_CACHE || c.env.LEDGER_CACHE)?.get('project:maintenance:ledger')
    if (remoteIndividualCache === 'true') {
      isGlobalLocked = true;
    }
  } catch (e) {
    console.error('[Maintenance Check Error]', e)
    // Fallback: If DB/Cache is unreachable, we default to whatever the Hard Lock says
  }

  const isMaintenanceActive = isHardLocked || isSoftLocked || isGlobalLocked
  const isAdminPath = path.startsWith('/api/admin')
  const isPublicPath = path === '/ping' || path === '/api/health' || path.includes('.well-known')
  
  if (isMaintenanceActive && !isAdminPath && !isPublicPath) {
    return c.json({ 
      error: 'System Under Maintenance', 
      code: 'MAINTENANCE_ACTIVE',
      message: 'Ledger is currently down for maintenance. We\'ll be back soon!'
    }, 503)
  }

  await next()
})

// Rate Limiting (Exempting Public Bootstrap Endpoints)
app.use('/api/*', async (c, next) => {
  const path = c.req.path
  const method = c.req.method
  const publicPaths = ['/api/theme/broadcast', '/api/health', '/api/config']
  
  if (publicPaths.includes(path) || path.startsWith('/api/discord') || method === 'OPTIONS') {
    return await next()
  }

  if (path.startsWith('/api/auth')) {
    return ipRateLimit('AUTH')(c, next)
  }
  
  return ipRateLimit('API')(c, next)
})

// 2. Health & System Information
app.get('/ping', (c) => c.text('PONG - LEDGER IS LIVE'))

app.get('/api/health', async (c) => {
  let dbStatus = "connected";
  try {
     await getDb(c.env).select({ configKey: systemConfig.configKey }).from(systemConfig).limit(1);
  } catch (e) {
     dbStatus = "error";
  }

  const isHardLocked = c.env.MAINTENANCE_MODE === 'true';
  const kv = c.env.TITAN_GUARD_CACHE || c.env.LEDGER_CACHE;
  
  let localMaintenance = false;
  let globalCache = null;
  let projectCache = null;

  try {
    if (kv) {
      const configCache = await kv.get('API_CONFIG', 'json') as Record<string, string>;
      localMaintenance = configCache?.MAINTENANCE_MODE === 'true';
      globalCache = await kv.get('global:maintenance');
      projectCache = await kv.get('project:maintenance:ledger');
    }
  } catch (e) {
    console.warn(`[System] Health check failed to reach KV:`, e);
  }
  
  const isMaintenance = isHardLocked || localMaintenance || globalCache === 'true' || projectCache === 'true';

  return c.json({
    status: isMaintenance ? "maintenance" : (dbStatus === "connected" ? "online" : "degraded"),
    maintenance: isMaintenance,
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

  const publicPaths = ['/api/theme/broadcast', '/api/health', '/api/config']
  const isPublicApi = publicPaths.includes(path) || path.startsWith('/api/discord') || (method === 'OPTIONS')
  
  if (isPublicApi) return await next()
  return authMiddleware(c, next)
})

// Specific Middleware Chains
app.use('/api/admin/*', adminMiddleware)
app.use('/api/admin/*', stepUpMiddleware)
app.post('/api/theme/broadcast', authMiddleware)

// 4. System Routes
app.route('/api/auth', authRoutes)
app.route('/api/financials', financialsRoutes)
app.route('/api/planning', planningRoutes)
app.route('/api/user', userRoutes)
app.route('/api/data', dataRoutes)
app.route('/api/interop', interopRoutes)
app.route('/api/admin', adminRoutes)
app.route('/api/backup', backupRoutes)
app.route('/api/support', supportRoutes)
app.route('/api/discord', discordRoutes)
app.route('/api/tracked-expenses', trackedExpensesRoutes)

// Helper to safely parse configuration values
const safeJsonParse = (val: string | null) => {
  if (!val) return null;
  try {
    return JSON.parse(val);
  } catch {
    return val; // Return raw string if not valid JSON
  }
};

// 5. System Configuration & Theme Handling
app.get('/api/config', async (c) => {
  const cached = await c.env.TITAN_GUARD_CACHE?.get('API_CONFIG', 'json')
  if (cached) return c.json({ success: true, data: cached })

  // --- System Configuration (Titan Guard v6.1 Filtered) ---
  const PUBLIC_CONFIG_KEYS = ['OG_TITLE', 'OG_DESCRIPTION', 'OG_IMAGE_URL', 'MAINTENANCE_MODE', 'VERSION'];
  const db = getDb(c.env)
  
  let publicConfig = {};
  try {
    const config = await db.select().from(systemConfig);
    publicConfig = config
      .filter(conf => PUBLIC_CONFIG_KEYS.includes(conf.configKey as string))
      .reduce((acc, curr) => ({ 
        ...acc, 
        [curr.configKey as string]: safeJsonParse(curr.configValue as string) 
      }), {});
  } catch (dbErr) {
    console.error('[Config API] Database fetch failed:', dbErr);
    // Return empty config or defaults to avoid crashing the frontend
  }

  const result = {
    ...publicConfig,
    environment: c.env.ENVIRONMENT || 'production',
    discordClientId: c.env.DISCORD_CLIENT_ID
  }

  const cache = c.env.LEDGER_CACHE || c.env.TITAN_GUARD_CACHE;
  if (cache) c.executionCtx.waitUntil(cache.put('API_CONFIG', JSON.stringify(result), { expirationTtl: 300 }))
  return c.json({ success: true, data: result })
})

app.get('/api/theme/broadcast', async (c) => {
  try {
    const cached = await c.env.LEDGER_CACHE?.get('THEME_BROADCAST', 'json')
    if (cached) return c.json({ success: true, data: cached })

    const db = getDb(c.env)
    const config = await db.select({ configValue: systemConfig.configValue }).from(systemConfig).where(eq(systemConfig.configKey, "broadcast_theme_id")).limit(1).then(res => res[0]);
    if (!config || !config.configValue) return c.json({ success: true, data: { themeId: null } })
    
    const result = { themeId: JSON.parse(config.configValue as string) }
    if (c.env.LEDGER_CACHE) c.executionCtx.waitUntil(c.env.LEDGER_CACHE.put('THEME_BROADCAST', JSON.stringify(result), { expirationTtl: 60 }))
    return c.json({ success: true, data: result })
  } catch (e) {
    return c.json({ success: true, data: { themeId: null } })
  }
})

app.post('/api/theme/broadcast', async (c) => {
  const { themeId } = await c.req.json()
  const db = getDb(c.env)
  
  const prevState = await db.select({ configValue: systemConfig.configValue })
    .from(systemConfig)
    .where(eq(systemConfig.configKey, "broadcast_theme_id"))
    .limit(1)
    .then(res => res[0]);

  await db.insert(systemConfig).values({
    id: crypto.randomUUID(),
    configKey: 'broadcast_theme_id',
    configValue: JSON.stringify(themeId)
  }).onConflictDoUpdate({
    target: [systemConfig.configKey],
    set: { configValue: JSON.stringify(themeId) }
  });
  
  if (c.env.LEDGER_CACHE) c.executionCtx.waitUntil(c.env.LEDGER_CACHE.delete('THEME_BROADCAST'))
  
  // Activity Logging
  c.executionCtx.waitUntil(logAudit(c, 'system_config', 'broadcast_theme_id', 'UPDATE_THEME_BROADCAST', prevState, { themeId }));
  
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
    success: false,
    error: isProduction ? 'Internal Server Error' : err.message,
    status,
    path: isProduction ? undefined : c.req.path,
    stack: isProduction ? undefined : err.stack
  }, status as any)
})
