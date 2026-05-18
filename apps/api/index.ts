import { Hono, Context } from 'hono'
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
import { logAudit, apiError } from './utils'
import { ipRateLimit } from './utils/rate-limit'
import { AUTH_EXCLUSIONS } from '@shared/constants'

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
  
  // 1. Public Path Bypass (Skip complex logic for non-API and public routes)
  if (AUTH_EXCLUSIONS.some(ex => path === ex || (ex !== '/' && path.startsWith(ex)))) {
    return await next()
  }

  // 2. Maintenance Status Check
  const isHardLocked = c.env.MAINTENANCE_MODE === 'true'
  let isSoftLocked = false
  let isGlobalLocked = false
  
  // Try to get from cache first to avoid D1 cold starts on every request
  try {
    const cache = (c.env.CACHE || c.env.FLEET_SECURITY_CACHE) as any;
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
        const dbConfig = (await db.select({ configValue: systemConfig.configValue })
                  .from(systemConfig)
                  .where(eq(systemConfig.configKey, 'MAINTENANCE_MODE'))
                  .limit(1)
                  .then(res => res[0]) as any)
        
        if (dbConfig?.configValue === 'true') isSoftLocked = true
      } catch (dbErr: any) {
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
        const res = (await fetch(`${foundationUrl}/api/fleet/status`) as any);
        if (res.ok) {
          const data = await res.json() as { globalMaintenance: boolean };
          const statusStr = String(data.globalMaintenance);
          if (data.globalMaintenance === true) isGlobalLocked = true;
          
          const kv = c.env.FLEET_SECURITY_CACHE || c.env.CACHE;
          if (kv) {
            const kvPromise = kv.put('global:maintenance', statusStr, { expirationTtl: 60 })
              .catch((err: any) => {
                if (!err.message?.includes('429')) {
                  console.warn('[Maintenance Cache] KV Update Failed:', err.message);
                }
              });
            
            if (c.executionCtx?.waitUntil) {
              c.executionCtx.waitUntil(kvPromise);
            }
          }
        }
      } catch (fetchErr: any) {
        console.warn('[Maintenance Fetch] Foundation Unreachable:', fetchErr);
      }
    }

    // --- LEVEL 2.5: Project Status Check ---
    const remoteIndividualCache = (await (c.env.FLEET_SECURITY_CACHE || c.env.CACHE)?.get('project:maintenance:ledger') as any)
    if (remoteIndividualCache === 'true') {
      isGlobalLocked = true;
    }
  } catch (e: any) {
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
  
  // 1. IP Rate Limiting
  if (path.startsWith('/api/auth')) {
    const res = (await ipRateLimit('AUTH')(c, async () => {}) as any)
    if (res instanceof Response) return res
  } else {
    const res = (await ipRateLimit('API')(c, async () => {}) as any)
    if (res instanceof Response) return res
  }

  // 2. Public Access Check
  if (AUTH_EXCLUSIONS.some(ex => path === ex || (ex !== '/' && path.startsWith(ex)))) {
    return await next()
  }

  if (path.startsWith('/api/discord') || method === 'OPTIONS') {
    return await next()
  }

  // 3. Authenticated Access
  return authMiddleware(c, next)
})

// 2. Health & System Information
app.get('/ping', (c) => c.text('PONG - LEDGER IS LIVE'))

app.get('/api/health', async (c) => {
  let dbStatus = "connected";
  try {
     await getDb(c.env).select({ configKey: systemConfig.configKey }).from(systemConfig).limit(1);
  } catch (e: any) {
     dbStatus = "error";
  }

  const isHardLocked = c.env.MAINTENANCE_MODE === 'true';
  const kv = c.env.FLEET_SECURITY_CACHE || c.env.CACHE;
  
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
  } catch (e: any) {
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

// Specific Middleware Chains
app.use('/api/admin/*', adminMiddleware)
app.use('/api/admin/*', stepUpMiddleware)

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
  try {
    const cached = (await c.env.FLEET_SECURITY_CACHE?.get('API_CONFIG', 'json') as any)
    if (cached) return c.json({ success: true, data: cached })

    // --- System Configuration (Fleet Security v6.1 Filtered) ---
    const PUBLIC_CONFIG_KEYS = ['OG_TITLE', 'OG_DESCRIPTION', 'OG_IMAGE_URL', 'MAINTENANCE_MODE', 'VERSION'];
    const db = getDb(c.env)
    
    let publicConfig = {};
    try {
      const config = (await db.select().from(systemConfig) as any);
      publicConfig = config
        .filter((conf: any) => PUBLIC_CONFIG_KEYS.includes(conf.configKey as string))
        .reduce((acc: any, curr: any) => ({ 
          ...acc, 
          [curr.configKey as string]: safeJsonParse(curr.configValue as string) 
        }), {});
    } catch (dbErr: any) {
      console.error('[Config API] Database fetch failed:', dbErr);
    }

    const result = {
      ...publicConfig,
      environment: c.env.ENVIRONMENT || 'production',
      discordClientId: c.env.DISCORD_CLIENT_ID
    }

    // Cache the result for performance (5 minutes)
    if (c.env.FLEET_SECURITY_CACHE) {
      c.executionCtx.waitUntil(c.env.FLEET_SECURITY_CACHE.put('API_CONFIG', JSON.stringify(result), { expirationTtl: 300 }))
    }

    return c.json({ success: true, data: result })
  } catch (err: any) {
    console.error('[Config API] Critical failure:', err)
    return c.json({ 
      success: true, 
      data: { environment: c.env.ENVIRONMENT || 'production' } 
    })
  }
})

app.get('/api/theme/broadcast', async (c) => {
  try {
    const cached = (await c.env.CACHE?.get('THEME_BROADCAST', 'json') as any)
    if (cached) return c.json({ success: true, data: cached })

    const db = getDb(c.env)
    const config = (await db.select({ configValue: systemConfig.configValue }).from(systemConfig).where(eq(systemConfig.configKey, "broadcast_theme_id")).limit(1).then(res => res[0]) as any);
    if (!config || !config.configValue) return c.json({ success: true, data: { themeId: null } })
    
    const result = { themeId: JSON.parse(config.configValue as string) }
    if (c.env.CACHE) c.executionCtx.waitUntil(c.env.CACHE.put('THEME_BROADCAST', JSON.stringify(result), { expirationTtl: 60 }))
    return c.json({ success: true, data: result })
  } catch (e: any) {
    return c.json({ success: true, data: { themeId: null } })
  }
})

app.post('/api/theme/broadcast', authMiddleware, async (c) => {
  const { themeId } = (await c.req.json() as any)
  const db = getDb(c.env)
  
  const prevState = (await db.select({ configValue: systemConfig.configValue })
      .from(systemConfig)
      .where(eq(systemConfig.configKey, "broadcast_theme_id"))
      .limit(1)
      .then(res => res[0]) as any);

  await db.insert(systemConfig).values({
    id: crypto.randomUUID(),
    configKey: 'broadcast_theme_id',
    configValue: JSON.stringify(themeId)
  }).onConflictDoUpdate({
    target: [systemConfig.configKey],
    set: { configValue: JSON.stringify(themeId) }
  });
  
  if (c.env.CACHE) c.executionCtx.waitUntil(c.env.CACHE.delete('THEME_BROADCAST'))
  
  // Activity Logging (Handles its own waitUntil internally)
  logAudit(c, 'system_config', 'broadcast_theme_id', 'UPDATE_THEME_BROADCAST', prevState, { themeId });
  
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
app.onError((err: Error, c: Context) => {
  const status = (err as any).status || 500
  return apiError(c, err.message, 'INTERNAL_SERVER_ERROR', 'A system error occurred.', status, {
    path: c.req.path,
    stack: err.stack
  })
})
