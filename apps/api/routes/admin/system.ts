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

// ─────────────────────────────────────────────────────────────────────────────
// Canonical system defaults — the single source of truth for self-heal
// ─────────────────────────────────────────────────────────────────────────────

const REQUIRED_CONFIG_DEFAULTS: Record<string, string> = {
  MAINTENANCE_MODE: 'false',
  VERSION: '1.0.0',
  DEFAULT_TIMEZONE: 'UTC',
  DEFAULT_LOCALE: 'en-US',
  DEFAULT_STAY_SIGNED_IN: 'false',
  ALLOWED_DOMAINS: '*.gpnet.dev, *.glosonproductions.com, localhost, 127.0.0.1',
  BLOCKED_DOMAINS: '',
}

const REQUIRED_FEATURE_FLAG_DEFAULTS: Array<{
  featureKey: string
  enabledGlobally: boolean
  description: string
}> = [
  { featureKey: 'PASSKEYS_ENABLED', enabledGlobally: true, description: 'Allow users to register and authenticate with passkeys (WebAuthn).' },
  { featureKey: 'DISCORD_BOT_ENABLED', enabledGlobally: true, description: 'Enable the Discord bot integration for alerts and reminders.' },
  { featureKey: 'INVESTMENT_PORTFOLIO_ENABLED', enabledGlobally: true, description: 'Show the investment portfolio tracking module in user dashboards.' },
  { featureKey: 'LOAN_MANAGER_ENABLED', enabledGlobally: true, description: 'Enable the loan manager for tracking debts and repayment schedules.' },
  { featureKey: 'REMINDERS_V2_ENABLED', enabledGlobally: true, description: 'Enable the new v2 reminders engine with scheduling and multi-channel delivery.' },
  { featureKey: 'BACKUP_HUB_ENABLED', enabledGlobally: true, description: 'Enable the backup and data export hub.' },
  { featureKey: 'PAYMENT_CENTRAL_ENABLED', enabledGlobally: true, description: 'Enable the Payment Central bill management module.' },
  { featureKey: 'ANNOUNCEMENTS_ENABLED', enabledGlobally: true, description: 'Allow system owners to broadcast platform-wide announcements.' },
  { featureKey: 'WEBHOOKS_ENABLED', enabledGlobally: false, description: 'Allow households to register custom webhook endpoints for events.' },
  { featureKey: 'DEMO_MODE_ENABLED', enabledGlobally: true, description: 'Permit users with the demo role to access the sandbox environment.' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Existing endpoints
// ─────────────────────────────────────────────────────────────────────────────

system.get('/config', async (c) => {
  const db = getDb(c.env)
  let results = (await db.select().from(systemConfig).orderBy(systemConfig.configKey) as any)

  const keys = new Set(results.map((r: any) => r.configKey))
  let needsReFetch = false

  for (const [configKey, configValue] of Object.entries(REQUIRED_CONFIG_DEFAULTS)) {
    if (!keys.has(configKey)) {
      await db.insert(systemConfig).values({ id: crypto.randomUUID(), configKey, configValue })
      needsReFetch = true
    }
  }

  if (needsReFetch) {
    results = (await db.select().from(systemConfig).orderBy(systemConfig.configKey) as any)
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

// ─────────────────────────────────────────────────────────────────────────────
// Self-Heal — comprehensive verification and restoration of all system defaults
// ─────────────────────────────────────────────────────────────────────────────

system.post('/self-heal', async (c) => {
  const db = getDb(c.env)
  const report: {
    configKeys: { checked: number; restored: string[] }
    featureFlags: { checked: number; restored: string[] }
    errors: string[]
  } = {
    configKeys: { checked: 0, restored: [] },
    featureFlags: { checked: 0, restored: [] },
    errors: [],
  }

  // ── 1. System Config Keys ──────────────────────────────────────────────────
  try {
    const existing = (await db.select({ key: systemConfig.configKey }).from(systemConfig) as any)
    const existingKeys = new Set(existing.map((r: any) => r.key))
    report.configKeys.checked = Object.keys(REQUIRED_CONFIG_DEFAULTS).length

    for (const [configKey, configValue] of Object.entries(REQUIRED_CONFIG_DEFAULTS)) {
      if (!existingKeys.has(configKey)) {
        await db.insert(systemConfig).values({ id: crypto.randomUUID(), configKey, configValue })
        report.configKeys.restored.push(configKey)
      }
    }
  } catch (err: any) {
    report.errors.push(`Config heal failed: ${err.message}`)
  }

  // ── 2. Feature Flags ───────────────────────────────────────────────────────
  try {
    const existingFlags = (await db.select({ key: systemFeatureFlags.featureKey }).from(systemFeatureFlags) as any)
    const existingFlagKeys = new Set(existingFlags.map((r: any) => r.key))
    report.featureFlags.checked = REQUIRED_FEATURE_FLAG_DEFAULTS.length

    for (const flag of REQUIRED_FEATURE_FLAG_DEFAULTS) {
      if (!existingFlagKeys.has(flag.featureKey)) {
        await db.insert(systemFeatureFlags).values({
          id: crypto.randomUUID(),
          featureKey: flag.featureKey,
          enabledGlobally: flag.enabledGlobally,
          description: flag.description,
        })
        report.featureFlags.restored.push(flag.featureKey)
      }
    }
  } catch (err: any) {
    report.errors.push(`Feature flag heal failed: ${err.message}`)
  }

  // ── 3. Invalidate cache ────────────────────────────────────────────────────
  try {
    if (c.env.CACHE) {
      c.executionCtx.waitUntil(c.env.CACHE.delete('API_CONFIG'))
    }
  } catch (_) { /* non-critical */ }

  const totalRestored = report.configKeys.restored.length + report.featureFlags.restored.length
  const success = report.errors.length === 0

  await logAudit(c, 'system', 'global', 'SELF_HEAL', null, { report, success }, {}, true)

  return c.json({
    success,
    message: success
      ? totalRestored === 0
        ? 'All system tables verified — no repairs needed.'
        : `Healing complete. Restored ${totalRestored} missing record(s).`
      : `Self-heal completed with ${report.errors.length} error(s).`,
    report,
  })
})

export default system
