import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { Bindings, Variables } from '../types'
import { 
  BillingProcessorSchema, 
  ProviderSchema, 
  UpdateSystemConfigSchema, 
  UpdateSystemFeatureSchema, 
  SystemRegistrySchema, 
  UpdateUserAdminSchema,
  CreateUserAdminSchema
} from '../schemas'
import { EmailService } from '../services/email.service'
import { hashPassword } from '../auth-utils'
import { logAudit } from '../utils'
import { CURRENT_VERSION } from '../constants'
import { AuthService } from '../services/auth.service'
import { HTTPException } from 'hono/http-exception'
import { getDb } from '../db'
import { users, households, systemConfig, systemFeatureFlags, systemRegistry, auditLogs as pccAuditLogs, pccAuditLogs as systemPccAuditLogs, systemAuditLogs, billingProcessors, serviceProviders, systemWalkthroughs, userHouseholds, passkeys, externalConnections, userIdentities, userLinkedAccounts, transactions, subscriptions, userPaymentMethods, sharedBalances, systemAnnouncements } from '../db/schema'
import { eq, or, and, sql, desc, count, like } from 'drizzle-orm'

const pcc = new Hono<{ Bindings: Bindings, Variables: Variables }>()

// Dashboard Stats
pcc.get('/stats', async (c) => {
  const db = getDb(c.env)
  const userCount = await db.select({ count: count() }).from(users).then(res => res[0].count)
  const activeToday = await db.select({ count: count() }).from(users).where(sql`last_active_at > date("now", "-1 day")`).then(res => res[0].count)
  const householdCount = await db.select({ count: count() }).from(households).then(res => res[0].count)
  
  return c.json({
    totalUsers: userCount || 0,
    activeToday: activeToday || 0,
    totalHouseholds: householdCount || 0,
    version: CURRENT_VERSION
  })
})

// System Configuration
pcc.get('/config', async (c) => {
  const db = getDb(c.env)
  const results = await db.select().from(systemConfig).orderBy(systemConfig.configKey)
  return c.json(results || [])
})

pcc.patch('/config/:id', zValidator('json', UpdateSystemConfigSchema), async (c) => {
  const id = c.req.param('id')
  const { config_value } = c.req.valid('json')
  const db = getDb(c.env)
  
  await db.update(systemConfig).set({ configValue: config_value, updatedAt: sql`CURRENT_TIMESTAMP` }).where(eq(systemConfig.id, id))
  await logAudit(c, 'system_config', id, 'UPDATE_CONFIG', {}, { config_value })
  if (c.env.LEDGER_CACHE) c.executionCtx.waitUntil(c.env.LEDGER_CACHE.delete('API_CONFIG'))
  return c.json({ success: true })
})

// Feature Flags
pcc.get('/features', async (c) => {
  const db = getDb(c.env)
  const results = await db.select().from(systemFeatureFlags).orderBy(systemFeatureFlags.featureKey)
  return c.json(results)
})

pcc.patch('/features/:id', zValidator('json', UpdateSystemFeatureSchema), async (c) => {
  const id = c.req.param('id')
  const { enabled_globally, target_user_ids } = c.req.valid('json')
  const db = getDb(c.env)
  
  await db.update(systemFeatureFlags).set({ 
    enabledGlobally: enabled_globally ? 1 : 0, 
    updatedAt: sql`CURRENT_TIMESTAMP` 
  }).where(eq(systemFeatureFlags.id, id))
  
  // Note: we're omitting target_user_ids since it's missing in some schema versions, raw SQL could patch it:
  await db.run(sql`UPDATE system_feature_flags SET target_user_ids = ${target_user_ids} WHERE id = ${id}`);
  
  await logAudit(c, 'system_feature_flags', id, 'TOGGLE_FEATURE', {}, { enabled_globally })
  return c.json({ success: true })
})

// Master Record List (Registry)
pcc.get('/records', async (c) => {
  const db = getDb(c.env)
  const results = await db.select().from(systemRegistry).orderBy(systemRegistry.itemType, systemRegistry.name)
  return c.json(results)
})

pcc.post('/records', zValidator('json', SystemRegistrySchema), async (c) => {
  const data = c.req.valid('json')
  const id = crypto.randomUUID()
  const metadata = data.metadata_json || {}
  const db = getDb(c.env)
  
  await db.insert(systemRegistry).values({
    id,
    itemType: data.item_type,
    name: data.name,
    logoUrl: data.logo_url || null,
    websiteUrl: data.website_url || null,
    metadataJson: JSON.stringify(metadata)
  })
  
  await logAudit(c, 'system_registry', id, 'CREATE_RECORD', {}, data)
  return c.json({ success: true, id })
})

pcc.delete('/records/:id', async (c) => {
  const id = c.req.param('id')
  const db = getDb(c.env)
  await db.delete(systemRegistry).where(eq(systemRegistry.id, id))
  await logAudit(c, 'system_registry', id, 'DELETE_RECORD')
  return c.json({ success: true })
})

// User Management
pcc.get('/users', async (c) => {
  const db = getDb(c.env)
  const results = await db.select({
    id: users.id,
    email: users.email,
    displayName: users.displayName,
    globalRole: users.globalRole,
    status: users.status,
    createdAt: users.createdAt,
    lastActiveAt: users.lastActiveAt
  }).from(users).orderBy(desc(users.createdAt))
  return c.json(results)
})

pcc.post('/admin/users', zValidator('json', CreateUserAdminSchema, (result, c) => {
  if (!result.success) {
    console.error('[Provisioning Validation Failed]', result.error)
    return c.json({ success: false, error: result.error }, 400)
  }
}), async (c) => {
  const data = c.req.valid('json')
  const { username, email, password, display_name, global_role, force_password_change } = data
  const db = getDb(c.env)
  
  const existing = await db.select({ id: users.id }).from(users).where(or(eq(users.username, username), eq(users.email, email))).limit(1).then(res => res[0])
  if (existing) throw new HTTPException(400, { message: 'Username or email already exists' })

  const userId = crypto.randomUUID()
  const passwordHash = await hashPassword(password)
  
  await db.insert(users).values({
    id: userId,
    username,
    email,
    passwordHash,
    displayName: display_name,
    globalRole: global_role,
    status: 'active',
    forcePasswordChange: force_password_change ? 1 : 0
  })
  
  await logAudit(c, 'users', userId, 'ADMIN_MANUAL_CREATE', null, { username, email, global_role })
  
  const emailService = new EmailService(c.env)
  try {
    await emailService.sendProvisioningEmail(email, username, password)
  } catch (err) {
    console.error('[Provisioning] Failed to send onboarding email:', err)
  }

  return c.json({ success: true, id: userId })
})

// Audit Vault
pcc.get('/audit', async (c) => {
  const db = getDb(c.env)
  // Simple raw query fallback for complex multi-table self-joins for audit logs
  const { results } = await c.env.DB.prepare(`
    SELECT 
      a.id, 
      a.action, 
      a.table_name as target_type, 
      a.record_id as target_id, 
      a.new_values_json as details_json, 
      a.created_at,
      u_actor.display_name as actor_name,
      u_target.display_name as target_name
    FROM audit_logs a
    LEFT JOIN users u_actor ON a.actor_id = u_actor.id
    LEFT JOIN users u_target ON a.record_id = u_target.id AND a.table_name = 'users'
    ORDER BY a.created_at DESC 
    LIMIT 200
  `).all()
  return c.json(results)
})

pcc.get('/audit/system', async (c) => {
  const db = getDb(c.env)
  const results = await db.select().from(systemAuditLogs).orderBy(desc(systemAuditLogs.createdAt)).limit(100)
  return c.json(results)
})

// Global Search
pcc.get('/search', async (c) => {
  const q = c.req.query('q') || ''
  if (q.length < 2) return c.json({ users: [], registry: [] })
  const db = getDb(c.env)

  const usersRes = await db.select({
    id: users.id,
    email: users.email,
    displayName: users.displayName
  }).from(users).where(or(like(users.email, `%${q}%`), like(users.displayName, `%${q}%`))).limit(10)

  const registryRes = await db.select({
    id: systemRegistry.id,
    name: systemRegistry.name,
    itemType: systemRegistry.itemType
  }).from(systemRegistry).where(like(systemRegistry.name, `%${q}%`)).limit(10)

  return c.json({ users: usersRes, registry: registryRes })
})

// Payment Networks (Processors)
pcc.get('/networks', async (c) => {
  const db = getDb(c.env)
  const results = await db.select().from(billingProcessors).orderBy(billingProcessors.name)
  return c.json(results)
})

pcc.post('/networks', zValidator('json', BillingProcessorSchema), async (c) => {
  const data = c.req.valid('json')
  const id = crypto.randomUUID()
  const db = getDb(c.env)
  
  await db.insert(billingProcessors).values({
    id,
    name: data.name,
    websiteUrl: data.website_url,
    brandingUrl: data.branding_url,
    supportUrl: data.support_url,
    subscriptionIdNotes: data.subscription_id_notes
  })
  await logAudit(c, 'billing_processors', id, 'admin_create', null, data)
  return c.json({ success: true, id })
})

pcc.patch('/networks/:id', zValidator('json', BillingProcessorSchema.partial()), async (c) => {
  const id = c.req.param('id')
  const data = c.req.valid('json')
  const db = getDb(c.env)
  
  const updates: any = { updatedAt: sql`CURRENT_TIMESTAMP` }
  if (data.name) updates.name = data.name
  if (data.website_url) updates.websiteUrl = data.website_url
  if (data.branding_url) updates.brandingUrl = data.branding_url
  if (data.support_url) updates.supportUrl = data.support_url
  if (data.subscription_id_notes) updates.subscriptionIdNotes = data.subscription_id_notes

  if (Object.keys(updates).length > 1) {
    await db.update(billingProcessors).set(updates).where(eq(billingProcessors.id, id))
  }
  await logAudit(c, 'billing_processors', id, 'admin_update', null, data)
  return c.json({ success: true })
})

pcc.delete('/networks/:id', async (c) => {
  const id = c.req.param('id')
  const db = getDb(c.env)
  // Check for linked providers
  const linked = await db.select({ count: count() }).from(serviceProviders).where(sql`billing_processor_id = ${id}`)
  if (linked[0].count > 0) {
    throw new HTTPException(400, { message: 'Cannot delete network with active service provider links' })
  }
  await db.delete(billingProcessors).where(eq(billingProcessors.id, id))
  await logAudit(c, 'billing_processors', id, 'admin_delete')
  return c.json({ success: true })
})

// Providers
pcc.get('/providers', async (c) => {
  // Using direct prepared statement logic here for complex join not modeled perfectly yet
  const { results } = await c.env.DB.prepare(`
    SELECT sp.*, bp.name as billing_processor_name 
    FROM service_providers sp 
    LEFT JOIN billing_processors bp ON sp.billing_processor_id = bp.id 
    ORDER BY sp.name ASC
  `).all()
  return c.json(results)
})

pcc.post('/providers', zValidator('json', ProviderSchema), async (c) => {
  const data = c.req.valid('json')
  const id = crypto.randomUUID()
  const db = getDb(c.env)
  // We use db.run to satisfy fields missed in static export or simply generic structure
  await db.run(sql`INSERT INTO service_providers (id, name, url, icon_url, billing_processor_id, is_3rd_party_capable) VALUES (${id}, ${data.name}, ${data.website_url || null}, ${data.branding_url || null}, ${data.billing_processor_id}, ${data.is_3rd_party_capable ? 1 : 0})`)
  await logAudit(c, 'service_providers', id, 'admin_create', null, data)
  return c.json({ success: true, id })
})

pcc.patch('/providers/:id', zValidator('json', ProviderSchema.partial()), async (c) => {
  const id = c.req.param('id')
  const data = c.req.valid('json')
  const db = getDb(c.env)
  const { name, website_url, branding_url, billing_processor_id, is_3rd_party_capable } = data
  try {
    await db.run(sql`
       UPDATE service_providers SET 
       name = COALESCE(${name}, name), url = COALESCE(${website_url}, url), icon_url = COALESCE(${branding_url}, icon_url), 
       billing_processor_id = COALESCE(${billing_processor_id}, billing_processor_id), is_3rd_party_capable = COALESCE(${is_3rd_party_capable !== undefined ? (is_3rd_party_capable ? 1 : 0) : null}, is_3rd_party_capable), updated_at = CURRENT_TIMESTAMP
       WHERE id = ${id}
    `)
    await logAudit(c, 'service_providers', id, 'admin_update', null, data)
    return c.json({ success: true })
  } catch (e) {
    throw new HTTPException(500, { message: 'Update failed' })
  }
})

pcc.delete('/providers/:id', async (c) => {
  const id = c.req.param('id')
  const db = getDb(c.env)
  await db.delete(serviceProviders).where(eq(serviceProviders.id, id))
  await logAudit(c, 'service_providers', id, 'admin_delete')
  return c.json({ success: true })
})

// Walkthroughs
pcc.get('/walkthroughs', async (c) => {
  const db = getDb(c.env)
  const results = await db.select().from(systemWalkthroughs).orderBy(desc(systemWalkthroughs.createdAt))
  return c.json(results)
})

pcc.post('/walkthroughs', zValidator('json', z.object({
  version: z.string(),
  title: z.string(),
  content_md: z.string()
})), async (c) => {
  const { version, title, content_md } = c.req.valid('json')
  const id = crypto.randomUUID()
  const db = getDb(c.env)
  await db.insert(systemWalkthroughs).values({
    id, version, title, contentMd: content_md
  })
  await logAudit(c, 'system_walkthroughs', id, 'SYNC_WALKTHROUGH', {}, { version, title })
  return c.json({ success: true, id })
})

// System-wide User Management (Admin)
pcc.get('/admin/users', async (c) => {
  const db = getDb(c.env)
  const results = await db.select({
    id: users.id, email: users.email, username: users.username, globalRole: users.globalRole, status: users.status, createdAt: users.createdAt, lastActiveAt: users.lastActiveAt
  }).from(users).orderBy(desc(users.createdAt))
  return c.json(results)
})

pcc.patch('/admin/users/:userId', zValidator('json', UpdateUserAdminSchema), async (c) => {
  const { userId } = c.req.param()
  const { global_role, status, display_name, email } = c.req.valid('json')
  const db = getDb(c.env)
  
  const old = await db.select({ globalRole: users.globalRole, status: users.status, displayName: users.displayName, email: users.email }).from(users).where(eq(users.id, userId)).limit(1).then(res => res[0])
  if (!old) throw new HTTPException(404, { message: 'User not found' })

  const updates: any = {}
  if (global_role) updates.globalRole = global_role
  if (status) updates.status = status
  if (display_name) updates.displayName = display_name
  if (email) updates.email = email

  if (Object.keys(updates).length > 0) {
    await db.update(users).set(updates).where(eq(users.id, userId))
  }
    
  await logAudit(c, 'users', userId, 'ADMIN_UPDATE', old, { global_role, status, display_name, email })
  return c.json({ success: true })
})

pcc.get('/admin/users/:userId/details', async (c) => {
  const { userId } = c.req.param()
  const db = getDb(c.env)
  
  const userFields = await db.select({
    id: users.id, email: users.email, username: users.username, displayName: users.displayName, avatarUrl: users.avatarUrl,
    globalRole: users.globalRole, status: users.status, createdAt: users.createdAt, lastActiveAt: users.lastActiveAt,
    totpSecret: users.totpSecret, forcePasswordChange: users.forcePasswordChange
  }).from(users).where(eq(users.id, userId)).limit(1).then(res => res[0])
  
  if (!userFields) throw new HTTPException(404, { message: 'User not found' })

  const connections = await db.run(sql`SELECT id, provider, status, created_at FROM external_connections WHERE household_id IN (SELECT household_id FROM user_households WHERE user_id = ${userId})`).then(res => res.results)
  const socialLinks = await db.select({ id: userIdentities.id, provider: userIdentities.provider, providerId: userIdentities.providerUserId, createdAt: userIdentities.createdAt }).from(userIdentities).where(eq(userIdentities.userId, userId))
  const userPasskeys = await db.select({ id: passkeys.id, name: passkeys.name, aaguid: passkeys.aaguid, createdAt: passkeys.createdAt }).from(passkeys).where(eq(passkeys.userId, userId))
  
  const history = await db.run(sql`
    SELECT action, target, created_at, details_json 
    FROM pcc_audit_logs 
    WHERE user_id = ${userId} OR (target = 'users' AND target_id = ${userId})
    ORDER BY created_at DESC LIMIT 15
  `).then(res => res.results)

  return c.json({
    profile: {
      ...userFields,
      has_2fa: userFields.totpSecret ? 1 : 0
    },
    security: {
      mfa_enabled: !!userFields.totpSecret,
      passkeys: userPasskeys,
      force_password_change: !!userFields.forcePasswordChange
    },
    linked_accounts: connections,
    social_links: socialLinks,
    history: history
  })
})

// Administrative Overrides (v3.16.1)
pcc.post('/admin/users/:userId/password/reset', zValidator('json', z.object({
  newPassword: z.string().min(8),
  isTemporary: z.boolean().optional().default(true)
})), async (c) => {
  const { userId } = c.req.param()
  const { newPassword, isTemporary } = c.req.valid('json')
  const db = getDb(c.env)
  const passwordHash = await hashPassword(newPassword)
  await db.update(users).set({ passwordHash, forcePasswordChange: isTemporary ? 1 : 0 }).where(eq(users.id, userId))
    
  await logAudit(c, 'users', userId, 'ADMIN_PASSWORD_RESET', {}, { is_temporary: isTemporary })
  return c.json({ success: true })
})

pcc.patch('/admin/users/:userId/passkeys/:id', zValidator('json', z.object({
  name: z.string().min(1).max(100)
})), async (c) => {
  const { userId, id } = c.req.param()
  const { name } = c.req.valid('json')
  const db = getDb(c.env)
  await db.update(passkeys).set({ name }).where(and(eq(passkeys.id, id), eq(passkeys.userId, userId)))
  await logAudit(c, 'passkeys', id, 'ADMIN_RENAME_PASSKEY', { userId }, { new_name: name })
  return c.json({ success: true })
})

pcc.delete('/admin/users/:userId/passkeys/:id', async (c) => {
  const { userId, id } = c.req.param()
  const db = getDb(c.env)
  await db.delete(passkeys).where(and(eq(passkeys.id, id), eq(passkeys.userId, userId)))
  await logAudit(c, 'passkeys', id, 'ADMIN_REMOVE_PASSKEY', { userId })
  return c.json({ success: true })
})

// External Connections Management
pcc.get('/connections', async (c) => {
  const db = getDb(c.env)
  const results = await db.select().from(externalConnections).orderBy(desc(externalConnections.createdAt))
  return c.json(results)
})

// Household Management (God Mode)
pcc.get('/households', async (c) => {
  // Complex aggregation better ran natively
  const { results } = await c.env.DB.prepare(`
    SELECT h.*, count(uh.user_id) as member_count 
    FROM households h 
    LEFT JOIN user_households uh ON h.id = uh.household_id 
    GROUP BY h.id 
    ORDER BY h.name ASC
  `).all()
  return c.json(results)
})

pcc.patch('/households/:id', zValidator('json', z.object({ name: z.string().min(1) })), async (c) => {
  const { id } = c.req.param()
  const { name } = c.req.valid('json')
  const db = getDb(c.env)
  await db.update(households).set({ name }).where(eq(households.id, id))
  await logAudit(c, 'households', id, 'ADMIN_RENAME', {}, { name })
  return c.json({ success: true })
})

pcc.delete('/households/:id', async (c) => {
  const { id } = c.req.param()
  const db = getDb(c.env)
  await db.batch([
    db.delete(households).where(eq(households.id, id)),
    db.delete(userHouseholds).where(eq(userHouseholds.householdId, id))
  ])
  await logAudit(c, 'households', id, 'ADMIN_PURGE')
  return c.json({ success: true })
})

// Administrative Protocol: Account Unification (v3.20)
pcc.post('/admin/users/merge', zValidator('json', z.object({
  sourceId: z.string().uuid(),
  targetId: z.string().uuid()
})), async (c) => {
  const { sourceId, targetId } = c.req.valid('json')
  if (sourceId === targetId) throw new HTTPException(400, { message: 'Self-merge rejected. Source and Target must differ.' })

  const db = getDb(c.env)
  // Identity Verification
  const source = await db.select({ id: users.id, displayName: users.displayName, email: users.email }).from(users).where(eq(users.id, sourceId)).limit(1).then(res => res[0])
  const target = await db.select({ id: users.id, displayName: users.displayName, email: users.email }).from(users).where(eq(users.id, targetId)).limit(1).then(res => res[0])
  
  if (!source || !target) throw new HTTPException(404, { message: 'Identity Resolution Failed: Source or Target record missing.' })

  // Atomic Migration Sequence
  await db.batch([
    db.run(sql`INSERT OR IGNORE INTO user_households (user_id, household_id) SELECT ${targetId} as user_id, household_id FROM user_households WHERE user_id = ${sourceId}`),
    db.delete(userHouseholds).where(eq(userHouseholds.userId, sourceId)),
    
    // Transfer IP
    db.update(transactions).set({ ownerId: targetId }).where(eq(transactions.ownerId, sourceId)),
    db.update(subscriptions).set({ ownerId: targetId }).where(eq(subscriptions.ownerId, sourceId)),
    
    // Migrate Channels
    db.update(userPaymentMethods).set({ userId: targetId }).where(eq(userPaymentMethods.userId, sourceId)),
    db.update(userLinkedAccounts).set({ userId: targetId }).where(eq(userLinkedAccounts.userId, sourceId)),
    db.update(passkeys).set({ userId: targetId }).where(eq(passkeys.userId, sourceId)),
    db.update(userIdentities).set({ userId: targetId }).where(eq(userIdentities.userId, sourceId)),
    
    // Social Liability
    db.update(sharedBalances).set({ fromUserId: targetId }).where(eq(sharedBalances.fromUserId, sourceId)),
    db.update(sharedBalances).set({ toUserId: targetId }).where(eq(sharedBalances.toUserId, sourceId)),
    
    // Forensic Dossier
    db.run(sql`UPDATE pcc_audit_logs SET user_id = ${targetId} WHERE user_id = ${sourceId}`),

    // Purge
    db.delete(users).where(eq(users.id, sourceId))
  ])

  await logAudit(c, 'users', targetId, 'ADMIN_USER_MERGE', 
    { merged_source_id: sourceId, source_email: source.email }, 
    { source_name: source.displayName, action: 'UNIFICATION_COMPLETE' }
  )
  
  return c.json({ success: true })
})

// System Announcements (v3.21)
pcc.get('/announcements', async (c) => {
  const db = getDb(c.env)
  const results = await db.run(sql`SELECT * FROM system_announcements WHERE is_active = 1 AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP) ORDER BY created_at DESC`).then(res => res.results)
  return c.json(results)
})

pcc.post('/announcements', zValidator('json', z.object({
  title: z.string().min(1),
  content_md: z.string().min(1),
  priority: z.enum(['info', 'warning', 'critical']).default('info'),
  expires_in_hours: z.number().optional()
})), async (c) => {
  const { title, content_md, priority, expires_in_hours } = c.req.valid('json')
  const id = crypto.randomUUID()
  const actorId = c.get('userId') as string
  const db = getDb(c.env)
  
  let expiresAt = null
  if (expires_in_hours) {
    expiresAt = new Date(Date.now() + expires_in_hours * 3600000).toISOString()
  }

  await db.insert(systemAnnouncements).values({
    id, title, contentMd: content_md, priority, actorId, expiresAt
  })

  await logAudit(c, 'system_announcements', id, 'BROADCAST_CREATED', {}, { title, priority })
  return c.json({ success: true, id })
})

// Maintenance Operations
pcc.post('/admin/maintenance', zValidator('json', z.object({ enabled: z.boolean() })), async (c) => {
  const { enabled } = c.req.valid('json')
  const db = getDb(c.env)
  await db.update(systemConfig).set({ configValue: enabled ? 'true' : 'false' }).where(eq(systemConfig.configKey, 'MAINTENANCE_MODE'))
  await logAudit(c, 'system_config', 'MAINTENANCE_MODE', 'TOGGLE_MAINTENANCE', {}, { enabled })
  if (c.env.LEDGER_CACHE) c.executionCtx.waitUntil(c.env.LEDGER_CACHE.delete('API_CONFIG'))
  return c.json({ success: true })
})

// Identity Mirroring (Impersonation)
pcc.post('/admin/users/:userId/impersonate', async (c) => {
  try {
    const { userId } = c.req.param()
    const db = getDb(c.env)
    
    const target = await db.select({ id: users.id, displayName: users.displayName, globalRole: users.globalRole }).from(users).where(eq(users.id, userId)).limit(1).then(res => res[0])
    if (!target) throw new HTTPException(404, { message: 'Target user not found' })

    const householdsRes = await db.select({ householdId: userHouseholds.householdId }).from(userHouseholds).where(eq(userHouseholds.userId, userId)).limit(1).then(res => res[0])
    const targetHouseholdId = householdsRes?.householdId || 'ledger-main-001'
    const adminId = c.get('userId') as string

    const authService = new AuthService(c.env)
    const token = await authService.generateToken(userId, targetHouseholdId, adminId)
    
    await logAudit(c, 'users', userId, 'ADMIN_IMPERSONATE_START', 
      { actor_id: adminId }, 
      { 
        target_name: target.displayName,
        target_household_id: targetHouseholdId,
        action: 'IDENTITY_MIRROR_COMMENCED'
      }
    )
    
    return c.json({ 
      success: true, 
      token,
      impersonationContext: {
        householdId: targetHouseholdId,
        profile: target,
        globalRole: target.globalRole
      }
    })
  } catch (err: any) {
    console.error('[PCC Impersonate Error]', err)
    throw new HTTPException(500, { message: 'Forensic system failure' })
  }
})

export default pcc
