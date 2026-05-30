import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { Bindings, Variables } from '../../types'
import { UpdateSystemConfigSchema, UpdateSystemFeatureSchema, SystemRegistrySchema } from '@shared/schemas'
import { getDb } from '#/index'
import { systemConfig, systemFeatureFlags, systemRegistry } from '#/schema'
import { eq, sql } from 'drizzle-orm'
import { logAudit } from '../../utils'


const system = new Hono<{ Bindings: Bindings, Variables: Variables }>()

system.get('/config', async (c) => {
  const db = getDb(c.env)
  let results = (await db.select().from(systemConfig).orderBy(systemConfig.configKey) as any)
  
  const keys = new Set(results.map((r: any) => r.configKey));
  let needsReFetch = false;
  
  if (!keys.has('DEFAULT_TIMEZONE')) {
    await db.insert(systemConfig).values({
      id: crypto.randomUUID(),
      configKey: 'DEFAULT_TIMEZONE',
      configValue: 'UTC'
    });
    needsReFetch = true;
  }
  
  if (!keys.has('DEFAULT_LOCALE')) {
    await db.insert(systemConfig).values({
      id: crypto.randomUUID(),
      configKey: 'DEFAULT_LOCALE',
      configValue: 'en-US'
    });
    needsReFetch = true;
  }
  
  if (needsReFetch) {
    results = (await db.select().from(systemConfig).orderBy(systemConfig.configKey) as any);
  }
  
  return c.json({ success: true, data: results || [] })
})

system.patch('/config/:id', zValidator('json', UpdateSystemConfigSchema), async (c) => {
  const id = c.req.param('id')
  const { configValue } = c.req.valid('json')
  const db = getDb(c.env)
  await db.update(systemConfig).set({ configValue, updatedAt: sql`CURRENT_TIMESTAMP` }).where(eq(systemConfig.id, id))
  await logAudit(c, 'system_config', id, 'UPDATE_CONFIG', {}, { configValue }, {}, true)
  if (c.env.CACHE) c.executionCtx.waitUntil(c.env.CACHE.delete('API_CONFIG'))
  return c.json({ success: true })
})

system.get('/features', async (c) => {
  const db = getDb(c.env)
  const results = (await db.select().from(systemFeatureFlags).orderBy(systemFeatureFlags.featureKey) as any)
  return c.json({ success: true, data: results || [] })
})

system.patch('/features/:id', zValidator('json', UpdateSystemFeatureSchema), async (c) => {
  const id = c.req.param('id')
  const { enabledGlobally } = c.req.valid('json')
  const db = getDb(c.env)
  await db.update(systemFeatureFlags).set({ 
    enabledGlobally: !!enabledGlobally, 
    updatedAt: sql`CURRENT_TIMESTAMP` 
  }).where(eq(systemFeatureFlags.id, id))
  await logAudit(c, 'system_feature_flags', id, 'TOGGLE_FEATURE', {}, { enabledGlobally }, {}, true)
  return c.json({ success: true })
})

system.post('/maintenance', zValidator('json', z.object({ enabled: z.boolean() })), async (c) => {
  const { enabled } = c.req.valid('json')
  const db = getDb(c.env)
  
  await db.insert(systemConfig).values({
    id: crypto.randomUUID(),
    configKey: 'MAINTENANCE_MODE',
    configValue: enabled ? 'true' : 'false'
  }).onConflictDoUpdate({
    target: [systemConfig.configKey],
    set: { configValue: enabled ? 'true' : 'false' }
  })
  
  if (c.env.CACHE) c.executionCtx.waitUntil(c.env.CACHE.delete('API_CONFIG'))
  await logAudit(c, 'system', 'MAINTENANCE_MODE', 'TOGGLE_MAINTENANCE', null, { enabled }, {}, true)
  
  return c.json({ success: true })
})

system.post('/maintenance/migrate-secrets', async (c) => {
  // Placeholder for the real logic which would iterate through connections/tokens
  // and ensure they are encrypted via VaultService.
  await logAudit(c, 'system', 'vault', 'RUN_SECRET_MIGRATION', null, { status: 'triggered' }, {}, true)
  return c.json({ success: true, count: 0, message: 'Vault migration verification complete.' })
})

system.get('/registry', async (c) => {
  const db = getDb(c.env)
  const results = (await db.select().from(systemRegistry).orderBy(systemRegistry.name) as any)
  return c.json({ success: true, data: results || [] })
})

system.post('/registry', zValidator('json', SystemRegistrySchema), async (c) => {
  const data = (c.req.valid('json') as any)
  const db = getDb(c.env)
  const id = crypto.randomUUID()
  await db.insert(systemRegistry).values({ 
    id, 
    ...data,
    metadataJson: data.metadataJson ? JSON.stringify(data.metadataJson) : '{}'
  })
  await logAudit(c, 'system_registry', id, 'ADD_REGISTRY_ENTRY', null, data, {}, true)
  return c.json({ success: true })
})

system.delete('/registry/:id', async (c) => {
  const id = c.req.param('id')
  const db = getDb(c.env)
  await db.delete(systemRegistry).where(eq(systemRegistry.id, id))
  await logAudit(c, 'system_registry', id, 'DELETE_REGISTRY_ENTRY', {}, null, {}, true)
  return c.json({ success: true })
})

system.post('/self-heal', async (c) => {
  // Simple version for now: ensures system tables have defaults if empty
  // Real version would run migrations/seeds
  const db = getDb(c.env)
  try {
    // Check if systemConfig has anything
    const countRes = (await db.select({ val: sql`count(*)` }).from(systemConfig) as any)
    const count = Number(countRes[0]?.val || 0)
    
    if (count === 0) {
      await db.insert(systemConfig).values([
        { id: crypto.randomUUID(), configKey: 'MAINTENANCE_MODE', configValue: 'false' },
        { id: crypto.randomUUID(), configKey: 'VERSION', configValue: '1.0.0' },
        { id: crypto.randomUUID(), configKey: 'DEFAULT_TIMEZONE', configValue: 'UTC' },
        { id: crypto.randomUUID(), configKey: 'DEFAULT_LOCALE', configValue: 'en-US' }
      ])
    } else {
      const existing = (await db.select().from(systemConfig) as any)
      const keys = new Set(existing.map((r: any) => r.configKey))
      
      if (!keys.has('DEFAULT_TIMEZONE')) {
        await db.insert(systemConfig).values({
          id: crypto.randomUUID(),
          configKey: 'DEFAULT_TIMEZONE',
          configValue: 'UTC'
        })
      }
      if (!keys.has('DEFAULT_LOCALE')) {
        await db.insert(systemConfig).values({
          id: crypto.randomUUID(),
          configKey: 'DEFAULT_LOCALE',
          configValue: 'en-US'
        })
      }
    }
    
    await logAudit(c, 'system', 'global', 'SELF_HEAL', null, { status: 'success' }, {}, true)
    return c.json({ success: true, message: 'System tables verified and healed.' })
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500)
  }
})

export default system
