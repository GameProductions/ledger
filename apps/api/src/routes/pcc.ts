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
import { logAudit } from '../utils'
import { CURRENT_VERSION } from '../constants'
import { hashPassword } from '../auth-utils'
import { EmailService } from '../services/email.service'
import { HTTPException } from 'hono/http-exception'

const pcc = new Hono<{ Bindings: Bindings, Variables: Variables }>()

// Dashboard Stats
pcc.get('/stats', async (c) => {
  const { results: userCount } = await c.env.DB.prepare('SELECT count(*) as count FROM users').all()
  const { results: activeToday } = await c.env.DB.prepare('SELECT count(*) as count FROM users WHERE last_active_at > date("now", "-1 day")').all()
  const { results: householdCount } = await c.env.DB.prepare('SELECT count(*) as count FROM households').all()
  
  return c.json({
    totalUsers: (userCount?.[0] as any)?.count || 0,
    activeToday: (activeToday?.[0] as any)?.count || 0,
    totalHouseholds: (householdCount?.[0] as any)?.count || 0,
    version: CURRENT_VERSION
  })
})

// System Configuration
pcc.get('/config', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM system_config ORDER BY config_key ASC').all()
  return c.json(results || [])
})

pcc.patch('/config/:id', zValidator('json', UpdateSystemConfigSchema), async (c) => {
  const id = c.req.param('id')
  const { config_value } = c.req.valid('json')
  await c.env.DB.prepare('UPDATE system_config SET config_value = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(config_value, id).run()
  await logAudit(c, 'system_config', id, 'UPDATE_CONFIG', {}, { config_value })
  return c.json({ success: true })
})

// Feature Flags
pcc.get('/features', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM system_feature_flags ORDER BY feature_key ASC').all()
  return c.json(results)
})

pcc.patch('/features/:id', zValidator('json', UpdateSystemFeatureSchema), async (c) => {
  const id = c.req.param('id')
  const { enabled_globally, target_user_ids } = c.req.valid('json')
  await c.env.DB.prepare(
    'UPDATE system_feature_flags SET enabled_globally = ?, target_user_ids = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind(enabled_globally ? 1 : 0, target_user_ids, id).run()
  await logAudit(c, 'system_feature_flags', id, 'TOGGLE_FEATURE', {}, { enabled_globally })
  return c.json({ success: true })
})

// Universal Registry
pcc.get('/registry', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM system_registry ORDER BY item_type ASC, name ASC').all()
  return c.json(results)
})

pcc.post('/registry', zValidator('json', SystemRegistrySchema), async (c) => {
  const data = c.req.valid('json')
  const id = crypto.randomUUID()
  const metadata = data.metadata_json || {}
  await c.env.DB.prepare(
    'INSERT INTO system_registry (id, item_type, name, logo_url, website_url, metadata_json) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, data.item_type, data.name, data.logo_url || null, data.website_url || null, JSON.stringify(metadata)).run()
  await logAudit(c, 'system_registry', id, 'CREATE_REGISTRY_ITEM', {}, data)
  return c.json({ success: true, id })
})

pcc.delete('/registry/:id', async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM system_registry WHERE id = ?').bind(id).run()
  await logAudit(c, 'system_registry', id, 'DELETE_REGISTRY_ITEM')
  return c.json({ success: true })
})

// User Management
pcc.get('/users', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT id, email, display_name, global_role, status, created_at, last_active_at FROM users ORDER BY created_at DESC').all()
  return c.json(results)
})

pcc.post('/admin/users', zValidator('json', CreateUserAdminSchema, (result, c) => {
  if (!result.success) {
    console.error('[Provisioning Validation Failed]', result.error)
    return c.json({ success: false, error: result.error.format() }, 400)
  }
}), async (c) => {
  const data = c.req.valid('json')
  const { username, email, password, display_name, global_role, force_password_change } = data
  
  // Check for existing user
  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE username = ? OR email = ?')
    .bind(username, email).first()
  if (existing) throw new HTTPException(400, { message: 'Username or email already exists' })

  const userId = crypto.randomUUID()
  const passwordHash = await hashPassword(password)
  
  await c.env.DB.prepare(
    'INSERT INTO users (id, username, email, password_hash, display_name, global_role, status, force_password_change) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(userId, username, email, passwordHash, display_name, global_role, 'active', force_password_change ? 1 : 0).run()
  
  await logAudit(c, 'users', userId, 'ADMIN_MANUAL_CREATE', null, { username, email, global_role })
  
  // Trigger Provisioning Protocol
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
  const { results } = await c.env.DB.prepare('SELECT * FROM pcc_audit_logs ORDER BY created_at DESC LIMIT 200').all()
  return c.json(results)
})

pcc.get('/audit/system', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM system_audit_logs ORDER BY created_at DESC LIMIT 100').all()
  return c.json(results)
})

// Global Search
pcc.get('/search', async (c) => {
  const q = c.req.query('q') || ''
  if (q.length < 2) return c.json({ users: [], registry: [] })

  const { results: users } = await c.env.DB.prepare(
    'SELECT id, email, display_name FROM users WHERE email LIKE ? OR display_name LIKE ? LIMIT 10'
  ).bind(`%${q}%`, `%${q}%`).all()

  const { results: registry } = await c.env.DB.prepare(
    'SELECT id, name, item_type FROM system_registry WHERE name LIKE ? LIMIT 10'
  ).bind(`%${q}%`).all()

  return c.json({ users, registry })
})

// Billing Processors
pcc.get('/processors', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM billing_processors ORDER BY name ASC').all()
  return c.json(results)
})

pcc.post('/processors', zValidator('json', BillingProcessorSchema), async (c) => {
  const data = c.req.valid('json')
  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    'INSERT INTO billing_processors (id, name, website_url, branding_url, support_url, subscription_id_notes) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, data.name, data.website_url, data.branding_url, data.support_url, data.subscription_id_notes).run()
  await logAudit(c, 'billing_processors', id, 'admin_create', null, data)
  return c.json({ success: true, id })
})

pcc.patch('/processors/:id', zValidator('json', BillingProcessorSchema.partial()), async (c) => {
  const id = c.req.param('id')
  const data = c.req.valid('json')
  const { name, website_url, branding_url, support_url, subscription_id_notes } = data
  await c.env.DB.prepare(
    `UPDATE billing_processors SET 
     name = COALESCE(?, name), website_url = COALESCE(?, website_url), branding_url = COALESCE(?, branding_url), 
     support_url = COALESCE(?, support_url), subscription_id_notes = COALESCE(?, subscription_id_notes), updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).bind(name, website_url, branding_url, support_url, subscription_id_notes, id).run()
  await logAudit(c, 'billing_processors', id, 'admin_update', null, data)
  return c.json({ success: true })
})

pcc.delete('/processors/:id', async (c) => {
  const id = c.req.param('id')
  // Check for linked providers
  const linked = await c.env.DB.prepare('SELECT count(*) as count FROM service_providers WHERE billing_processor_id = ?').bind(id).first()
  if ((linked as any).count > 0) {
    throw new HTTPException(400, { message: 'Cannot delete processor with active service provider links' })
  }
  await c.env.DB.prepare('DELETE FROM billing_processors WHERE id = ?').bind(id).run()
  await logAudit(c, 'billing_processors', id, 'admin_delete')
  return c.json({ success: true })
})

// Providers
pcc.get('/providers', async (c) => {
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
  await c.env.DB.prepare(
    'INSERT INTO service_providers (id, name, url, icon_url, billing_processor_id, is_3rd_party_capable) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, data.name, data.website_url || null, data.branding_url || null, data.billing_processor_id, data.is_3rd_party_capable ? 1 : 0).run()
  await logAudit(c, 'service_providers', id, 'admin_create', null, data)
  return c.json({ success: true, id })
})

pcc.patch('/providers/:id', zValidator('json', ProviderSchema.partial()), async (c) => {
  const id = c.req.param('id')
  const data = c.req.valid('json')
  const { name, website_url, branding_url, billing_processor_id, is_3rd_party_capable } = data
  try {
    await c.env.DB.prepare(
      `UPDATE service_providers SET 
       name = COALESCE(?, name), url = COALESCE(?, url), icon_url = COALESCE(?, icon_url), 
       billing_processor_id = COALESCE(?, billing_processor_id), is_3rd_party_capable = COALESCE(?, is_3rd_party_capable), updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).bind(name, website_url, branding_url, billing_processor_id, is_3rd_party_capable !== undefined ? (is_3rd_party_capable ? 1 : 0) : null, id).run()
    await logAudit(c, 'service_providers', id, 'admin_update', null, data)
    return c.json({ success: true })
  } catch (e) {
    throw new HTTPException(500, { message: 'Update failed' })
  }
})

pcc.delete('/providers/:id', async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM service_providers WHERE id = ?').bind(id).run()
  await logAudit(c, 'service_providers', id, 'admin_delete')
  return c.json({ success: true })
})

// Theme Broadcast (Moved to index.ts for /api/theme/broadcast access)


// Walkthroughs
pcc.get('/walkthroughs', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM system_walkthroughs ORDER BY created_at DESC').all()
  return c.json(results)
})

pcc.post('/walkthroughs', zValidator('json', z.object({
  version: z.string(),
  title: z.string(),
  content_md: z.string()
})), async (c) => {
  const { version, title, content_md } = c.req.valid('json')
  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    'INSERT INTO system_walkthroughs (id, version, title, content_md, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)'
  ).bind(id, version, title, content_md).run()
  await logAudit(c, 'system_walkthroughs', id, 'SYNC_WALKTHROUGH', {}, { version, title })
  return c.json({ success: true, id })
})

// System-wide User Management (Admin)
pcc.get('/admin/users', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT id, email, username, global_role, status, created_at, last_active_at FROM users ORDER BY created_at DESC').all()
  return c.json(results)
})

pcc.patch('/admin/users/:userId', zValidator('json', UpdateUserAdminSchema), async (c) => {
  const { userId } = c.req.param()
  const { global_role, status, display_name, email } = c.req.valid('json')
  
  const old = await c.env.DB.prepare('SELECT global_role, status, display_name, email FROM users WHERE id = ?').bind(userId).first()
  if (!old) throw new HTTPException(404, { message: 'User not found' })

  await c.env.DB.prepare(`
    UPDATE users SET 
      global_role = COALESCE(?, global_role), 
      status = COALESCE(?, status),
      display_name = COALESCE(?, display_name),
      email = COALESCE(?, email) 
    WHERE id = ?
  `).bind(global_role, status, display_name, email, userId).run()
    
  await logAudit(c, 'users', userId, 'ADMIN_UPDATE', old, { global_role, status, display_name, email })
  return c.json({ success: true })
})

pcc.get('/admin/users/:userId/details', async (c) => {
  const { userId } = c.req.param()
  
  const user = await c.env.DB.prepare(`
    SELECT id, email, username, display_name, avatar_url, global_role, status, created_at, last_active_at,
    (CASE WHEN totp_secret IS NOT NULL THEN 1 ELSE 0 END) as has_2fa
    FROM users WHERE id = ?
  `).bind(userId).first() as any
  
  if (!user) throw new HTTPException(404, { message: 'User not found' })

  const { results: connections } = await c.env.DB.prepare(
    'SELECT id, provider, status, created_at FROM external_connections WHERE household_id IN (SELECT household_id FROM user_households WHERE user_id = ?)'
  ).bind(userId).all()

  const { results: socialLinks } = await c.env.DB.prepare(
    'SELECT id, provider, provider_user_id as provider_id, created_at FROM user_identities WHERE user_id = ?'
  ).bind(userId).all()

  const { results: passkeys } = await c.env.DB.prepare(
    'SELECT id, name, aaguid, created_at FROM passkeys WHERE user_id = ?'
  ).bind(userId).all()

  const { results: history } = await c.env.DB.prepare(`
    SELECT action, target, created_at, details_json 
    FROM pcc_audit_logs 
    WHERE user_id = ? OR (target = 'users' AND target_id = ?)
    ORDER BY created_at DESC LIMIT 15
  `).bind(userId, userId).all()

  return c.json({
    profile: user,
    security: {
      mfa_enabled: !!user.has_2fa,
      passkeys: passkeys,
      force_password_change: !!user.force_password_change
    },
    linked_accounts: connections,
    social_links: socialLinks,
    history: history
  })
})

// Administrative Overrides (v3.14.2)
pcc.post('/admin/users/:userId/password/reset', zValidator('json', z.object({
  newPassword: z.string().min(8),
  isTemporary: z.boolean().optional().default(true)
})), async (c) => {
  const { userId } = c.req.param()
  const { newPassword, isTemporary } = c.req.valid('json')
  
  const passwordHash = await hashPassword(newPassword)
  await c.env.DB.prepare('UPDATE users SET password_hash = ?, force_password_change = ? WHERE id = ?')
    .bind(passwordHash, isTemporary ? 1 : 0, userId).run()
    
  await logAudit(c, 'users', userId, 'ADMIN_PASSWORD_RESET', {}, { is_temporary: isTemporary })
  return c.json({ success: true })
})

pcc.patch('/admin/users/:userId/passkeys/:id', zValidator('json', z.object({
  name: z.string().min(1).max(100)
})), async (c) => {
  const { userId, id } = c.req.param()
  const { name } = c.req.valid('json')
  
  await c.env.DB.prepare('UPDATE passkeys SET name = ? WHERE id = ? AND user_id = ?')
    .bind(name, id, userId).run()
    
  await logAudit(c, 'passkeys', id, 'ADMIN_RENAME_PASSKEY', { userId }, { new_name: name })
  return c.json({ success: true })
})

pcc.delete('/admin/users/:userId/passkeys/:id', async (c) => {
  const { userId, id } = c.req.param()
  
  await c.env.DB.prepare('DELETE FROM passkeys WHERE id = ? AND user_id = ?').bind(id, userId).run()
    
  await logAudit(c, 'passkeys', id, 'ADMIN_REMOVE_PASSKEY', { userId })
  return c.json({ success: true })
})

// External Connections Management
pcc.get('/connections', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM external_connections ORDER BY created_at DESC').all()
  return c.json(results)
})

  await c.env.DB.prepare(
    'INSERT INTO external_connections (id, household_id, provider, access_token, status) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, data.household_id, data.provider, data.access_token, data.status).run()
  return c.json({ success: true, id })
})

// Household Management (God Mode)
pcc.get('/households', async (c) => {
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
  await c.env.DB.prepare('UPDATE households SET name = ? WHERE id = ?').bind(name, id).run()
  await logAudit(c, 'households', id, 'ADMIN_RENAME', {}, { name })
  return c.json({ success: true })
})

pcc.delete('/households/:id', async (c) => {
  const { id } = c.req.param()
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM households WHERE id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM user_households WHERE household_id = ?').bind(id)
  ])
  await logAudit(c, 'households', id, 'ADMIN_PURGE')
  return c.json({ success: true })
})

export default pcc
