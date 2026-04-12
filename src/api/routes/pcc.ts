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
import { logAudit, encrypt } from '../utils'
import { CURRENT_VERSION } from '../constants'
import { AuthService } from '../services/auth.service'
import { HTTPException } from 'hono/http-exception'
import { getDb } from '../db'
import { users, households, systemConfig, systemFeatureFlags, systemRegistry, pccAuditLogs as systemPccAuditLogs, systemAuditLogs, billingProcessors, serviceProviders, systemWalkthroughs, userHouseholds, passkeys, externalConnections, userIdentities, userLinkedAccounts, transactions, subscriptions, userPaymentMethods, sharedBalances, systemAnnouncements, auditLogs, paySchedules, householdInvites, accounts, linkedProviders, adminInvitations } from '../db/schema'
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
  // Hard delete cascading backwards slowly...
  await db.batch([
    db.delete(auditLogs).where(eq(auditLogs.householdId, id)),
    db.delete(transactions).where(eq(transactions.householdId, id)),
    db.delete(paySchedules).where(eq(paySchedules.householdId, id)),
    db.delete(subscriptions).where(eq(subscriptions.householdId, id)),
    db.delete(serviceProviders).where(eq(serviceProviders.householdId, id)),
    db.delete(householdInvites).where(eq(householdInvites.householdId, id)),
    db.delete(userHouseholds).where(eq(userHouseholds.householdId, id)),
    db.delete(accounts).where(eq(accounts.householdId, id)),
    db.delete(households).where(eq(households.id, id))
  ])
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
    
    // Audit History
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
  const results = await db.select().from(systemAnnouncements).orderBy(desc(systemAnnouncements.createdAt))
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

pcc.patch('/announcements/:id', zValidator('json', z.object({
  title: z.string().optional(),
  content_md: z.string().optional(),
  priority: z.string().optional(),
  is_active: z.boolean().optional()
})), async (c) => {
  const id = c.req.param('id')
  const { title, content_md, priority, is_active } = c.req.valid('json')
  const db = getDb(c.env)
  
  const updates: any = {}
  if (title) updates.title = title
  if (content_md) updates.contentMd = content_md
  if (priority) updates.priority = priority
  if (is_active !== undefined) updates.isActive = is_active ? 1 : 0
  
  await db.update(systemAnnouncements).set(updates).where(eq(systemAnnouncements.id, id))
  return c.json({ success: true })
})

pcc.delete('/announcements/:id', async (c) => {
  const id = c.req.param('id')
  const db = getDb(c.env)
  await db.delete(systemAnnouncements).where(eq(systemAnnouncements.id, id))
  return c.json({ success: true })
})

// Admin Invitations
pcc.get('/invitations', async (c) => {
  const db = getDb(c.env)
  const results = await db.select().from(adminInvitations).orderBy(desc(adminInvitations.createdAt))
  return c.json(results)
})

pcc.post('/invitations', zValidator('json', z.object({
  role: z.enum(['super_admin', 'operator']).default('super_admin'),
  expires_in_hours: z.number().default(24)
})), async (c) => {
  const { role, expires_in_hours } = c.req.valid('json')
  const token = 'admin_inv_' + crypto.randomUUID().replace(/-/g, '')
  const expiresAt = new Date(Date.now() + expires_in_hours * 3600000).toISOString()
  const db = getDb(c.env)
  
  await db.insert(adminInvitations).values({
    token,
    role,
    expiresAt,
    isClaimed: 0
  })
  
  return c.json({ success: true, token, expires_at: expiresAt })
})

pcc.delete('/invitations/:token', async (c) => {
  const token = c.req.param('token')
  const db = getDb(c.env)
  await db.delete(adminInvitations).where(eq(adminInvitations.token, token))
  return c.json({ success: true })
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

// Database Migration Operations
pcc.post('/admin/maintenance/migrate-secrets', async (c) => {
  const db = getDb(c.env)
  let migratedCount = 0
  const secretKey = c.env.ENCRYPTION_KEY || c.env.JWT_SECRET

  // 1. TOTPs
  const allTotps = await db.select({ id: totps.id, secret: totps.secret }).from(totps)
  const totpUpdates = []
  for (const t of allTotps) {
    if (t.secret && !t.secret.includes('.')) {
      const encrypted = await encrypt(t.secret, secretKey)
      totpUpdates.push(db.update(totps).set({ secret: encrypted }).where(eq(totps.id, t.id)))
      migratedCount++
    }
  }

  // 2. User Identities (OAuth tokens)
  const allIdentities = await db.select({ 
    id: userIdentities.id, 
    accessToken: userIdentities.accessToken, 
    refreshToken: userIdentities.refreshToken 
  }).from(userIdentities)
  
  const identityUpdates = []
  for (const idty of allIdentities) {
    let needsUpdate = false
    const updates: any = {}
    
    if (idty.accessToken && !idty.accessToken.includes('.')) {
      updates.accessToken = await encrypt(idty.accessToken, secretKey)
      needsUpdate = true
    }
    
    if (idty.refreshToken && !idty.refreshToken.includes('.')) {
      updates.refreshToken = await encrypt(idty.refreshToken, secretKey)
      needsUpdate = true
    }
    
    if (needsUpdate) {
      identityUpdates.push(db.update(userIdentities).set(updates).where(eq(userIdentities.id, idty.id)))
      migratedCount++
    }
  }

  // Batch execution
  const allQueries = [...totpUpdates, ...identityUpdates]
  const chunkSize = 50
  for (let i = 0; i < allQueries.length; i += chunkSize) {
    await db.batch(allQueries.slice(i, i + chunkSize) as any)
  }

  await logAudit(c, 'system_config', 'MIGRATION', 'ENCRYPT_SECRETS', null, { migrated_count: migratedCount })
  return c.json({ success: true, count: migratedCount })
})

// User Support Access (Impersonation)
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
        action: 'SUPPORT_ACCESS_STARTED'
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
    throw new HTTPException(500, { message: 'Support access system failure' })
  }
})

// Database Self-Healing (v3.26.0 - Shifted from Global Middleware)
pcc.post('/admin/maintenance/self-heal', async (c) => {
  try {
    const db = c.env.DB;
    await db.batch([
      db.prepare(`
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
      db.prepare(`
        CREATE TABLE IF NOT EXISTS system_feature_flags (
          id TEXT PRIMARY KEY,
          feature_key TEXT NOT NULL UNIQUE,
          enabled_globally INTEGER DEFAULT 0,
          target_user_ids TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `),
      db.prepare(`
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
      db.prepare(`
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
      db.prepare(`
        CREATE TABLE IF NOT EXISTS system_announcements (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          content_md TEXT NOT NULL,
          priority TEXT DEFAULT 'info',
          is_active INTEGER DEFAULT 1,
          expires_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `),
      db.prepare(`
        CREATE TABLE IF NOT EXISTS system_walkthroughs (
          id TEXT PRIMARY KEY,
          version TEXT NOT NULL,
          title TEXT NOT NULL,
          content_md TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `),
      db.prepare(`
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
      `),
      db.prepare(`
        INSERT INTO system_config (id, config_key, config_value, value_type)
        SELECT 'sys-rc-' || lower(hex(randomblob(4))), 'REQUIRE_TRANSACTION_CONTEXT', 'true', 'boolean'
        WHERE NOT EXISTS (SELECT 1 FROM system_config WHERE config_key = 'REQUIRE_TRANSACTION_CONTEXT');
      `),
      db.prepare(`
        CREATE TABLE IF NOT EXISTS bills (
          id TEXT PRIMARY KEY,
          household_id TEXT NOT NULL REFERENCES households(id),
          name TEXT NOT NULL,
          amount_cents INTEGER NOT NULL,
          due_date TEXT NOT NULL,
          status TEXT DEFAULT 'unpaid',
          notes TEXT,
          is_recurring INTEGER DEFAULT 0,
          frequency TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `),
      db.prepare(`
        INSERT OR IGNORE INTO bills (id, household_id, name, amount_cents, due_date, status, is_recurring, frequency)
        SELECT id, household_id, name, amount_cents, COALESCE(next_billing_date, DATE('now')), 'pending', 1, billing_cycle
        FROM subscriptions
        WHERE id NOT IN (SELECT id FROM bills);
      `),
      db.prepare(`
        CREATE TABLE IF NOT EXISTS liability_splits (
          id TEXT PRIMARY KEY,
          household_id TEXT NOT NULL REFERENCES households(id),
          target_id TEXT NOT NULL,
          target_type TEXT NOT NULL,
          originator_user_id TEXT NOT NULL REFERENCES users(id),
          assigned_user_id TEXT NOT NULL REFERENCES users(id),
          split_type TEXT NOT NULL,
          split_value INTEGER NOT NULL,
          calculated_amount_cents INTEGER NOT NULL,
          override_date TEXT,
          override_frequency TEXT,
          status TEXT DEFAULT 'pending',
          is_master_ledger_public INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `)
    ]);

    await logAudit(c, 'system', 'DB', 'MAINTENANCE_SELF_HEAL', {}, { status: 'COMPLETE' });
    return c.json({ success: true, message: 'System tables verified and healed.' });
  } catch (err: any) {
    console.error('[Self-Heal Error]', err);
    throw new HTTPException(500, { message: `Self-Heal failure: ${err.message}` });
  }
})

export default pcc
