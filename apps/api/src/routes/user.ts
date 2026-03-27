import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { HTTPException } from 'hono/http-exception'
import { Bindings, Variables } from '../types'
import { 
  ProfileSchema, 
  CreateHouseholdSchema, 
  UpdateHouseholdSchema, 
  UserPaymentMethodSchema, 
  UserLinkedAccountSchema 
} from '../schemas'
import { logAudit } from '../utils'

const user = new Hono<{ Bindings: Bindings, Variables: Variables }>()

// Profile & Identity
user.get('/me', (c) => {
  return c.json({
    userId: c.get('userId'),
    householdId: c.get('householdId'),
    globalRole: c.get('globalRole')
  })
})

user.get('/profile', async (c) => {
  const userId = c.get('userId')
  const { results } = await c.env.DB.prepare(
    'SELECT id, email, display_name, avatar_url, global_role, status, settings_json, created_at FROM users WHERE id = ?'
  ).bind(userId).all()
  
  if (!results || results.length === 0) {
    return c.json({ error: 'User not found' }, 404)
  }
  
  return c.json(results[0])
})

user.patch('/profile', zValidator('json', ProfileSchema), async (c) => {
  const userId = c.get('userId')
  const data = c.req.valid('json')
  
  if (data.display_name) {
    await c.env.DB.prepare('UPDATE users SET display_name = ? WHERE id = ?').bind(data.display_name, userId).run()
  }
  if (data.settings_json) {
    await c.env.DB.prepare('UPDATE users SET settings_json = ? WHERE id = ?').bind(data.settings_json, userId).run()
  }
  if (data.email) {
    await c.env.DB.prepare('UPDATE users SET email = ? WHERE id = ?').bind(data.email, userId).run()
  }
  
  if (data.avatar_url !== undefined) {
    await c.env.DB.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').bind(data.avatar_url || null, userId).run()
  }
  if (data.timezone) {
    await c.env.DB.prepare('UPDATE users SET timezone = ? WHERE id = ?').bind(data.timezone, userId).run()
  }
  
  return c.json({ success: true })
})

user.get('/onboarding', async (c) => {
  const userId = c.get('userId')
  const { results: onboarding } = await c.env.DB.prepare(
    'SELECT * FROM user_onboarding WHERE user_id = ?'
  ).bind(userId).all()
  return c.json(onboarding)
})

// Households
user.get('/households', async (c) => {
  const userId = c.get('userId')
  const { results } = await c.env.DB.prepare(
    'SELECT h.*, uh.role FROM households h JOIN user_households uh ON h.id = uh.household_id WHERE uh.user_id = ?'
  ).bind(userId).all()
  return c.json(results)
})

user.post('/households', zValidator('json', CreateHouseholdSchema), async (c) => {
  const userId = c.get('userId')
  const { name, currency } = c.req.valid('json')
  const id = `h-${crypto.randomUUID().slice(0, 8)}`
  
  await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO households (id, name, currency) VALUES (?, ?, ?)').bind(id, name, currency || 'USD'),
    c.env.DB.prepare('INSERT INTO user_households (user_id, household_id, role) VALUES (?, ?, ?)').bind(userId, id, 'admin')
  ])
  
  await logAudit(c, 'households', id, 'CREATE', null, { name, currency })
  return c.json({ success: true, id, name }, 201)
})

user.patch('/households/:id', zValidator('json', UpdateHouseholdSchema), async (c) => {
  const { id } = c.req.param()
  const { name } = c.req.valid('json')
  const globalRole = c.get('globalRole')

  if (globalRole !== 'super_admin') {
     const membership = await c.env.DB.prepare(
       'SELECT role FROM user_households WHERE user_id = ? AND household_id = ?'
     ).bind(c.get('userId'), id).first()
     
     if (!membership || ((membership as any).role !== 'admin' && (membership as any).role !== 'super_admin')) {
       throw new HTTPException(403, { message: 'Forbidden: Insufficient permissions to rename household' })
     }
  }

  const existing = await c.env.DB.prepare('SELECT name FROM households WHERE id = ?').bind(id).first()
  if (!existing) throw new HTTPException(404, { message: 'Household not found' })

  await c.env.DB.prepare('UPDATE households SET name = ? WHERE id = ?').bind(name, id).run()
  await logAudit(c, 'households', id, 'UPDATE', { name: (existing as any).name }, { name })

  return c.json({ success: true, name })
})

// Preferences
user.get('/preferences', async (c) => {
  const userId = c.get('userId')
  const { results } = await c.env.DB.prepare(
    'SELECT key, value FROM user_preferences WHERE user_id = ?'
  ).bind(userId).all()
  return c.json(results.reduce((acc: any, curr) => ({ ...acc, [curr.key as string]: curr.value }), {}))
})

user.patch('/preferences', zValidator('json', z.record(z.string(), z.string())), async (c) => {
  const userId = c.get('userId')
  const prefs = c.req.valid('json')
  
  const queries = Object.entries(prefs).map(([key, value]) => 
    c.env.DB.prepare('INSERT OR REPLACE INTO user_preferences (user_id, key, value) VALUES (?, ?, ?)')
      .bind(userId, key, value)
  )

  await c.env.DB.batch(queries)
  return c.json({ success: true })
})

// Notifications
user.get('/notifications', async (c) => {
  const userId = c.get('userId')
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM notification_settings WHERE user_id = ?'
  ).bind(userId).all()
  return c.json(results)
})

user.patch('/notifications', zValidator('json', z.array(z.object({
  type: z.string(),
  event: z.string(),
  enabled: z.boolean(),
  offset_days: z.number().optional()
}))), async (c) => {
  const userId = c.get('userId')
  const settings = c.req.valid('json')

  const queries = settings.map(s => 
    c.env.DB.prepare('INSERT OR REPLACE INTO notification_settings (user_id, type, event, enabled, offset_days) VALUES (?, ?, ?, ?, ?)')
      .bind(userId, s.type, s.event, s.enabled ? 1 : 0, s.offset_days || 3)
  )

  await c.env.DB.batch(queries)
  return c.json({ success: true })
})

// Payment Methods
user.get('/payment-methods', async (c) => {
  const userId = c.get('userId')
  const { results } = await c.env.DB.prepare('SELECT * FROM user_payment_methods WHERE user_id = ? AND is_active = 1').bind(userId).all()
  return c.json(results)
})

user.post('/payment-methods', zValidator('json', UserPaymentMethodSchema), async (c) => {
  const userId = c.get('userId')
  const householdId = c.get('householdId')
  const data = c.req.valid('json')
  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    'INSERT INTO user_payment_methods (id, user_id, household_id, name, type, last_four, branding_url) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, userId, householdId, data.name, data.type, data.last_four, data.branding_url).run()
  return c.json({ success: true, id })
})

// Linked Providers & Accounts
user.get('/providers', async (c) => {
  const userId = c.get('userId')
  const { results } = await c.env.DB.prepare(
    `SELECT lp.*, sp.name as provider_name, sp.icon_url 
     FROM linked_providers lp
     JOIN service_providers sp ON lp.service_provider_id = sp.id
     WHERE lp.user_id = ?`
  ).bind(userId).all()
  return c.json(results)
})

user.post('/providers/link', zValidator('json', z.object({
  serviceProviderId: z.string(),
  accountReference: z.string().optional(),
  customLabel: z.string().optional(),
  metadata: z.string().optional()
})), async (c) => {
  const userId = c.get('userId')
  const { serviceProviderId, accountReference, customLabel, metadata } = c.req.valid('json')
  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    'INSERT INTO linked_providers (id, user_id, service_provider_id, account_reference, custom_label, metadata) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, userId, serviceProviderId, accountReference || null, customLabel || null, metadata || null).run()
  return c.json({ success: true, id })
})

user.get('/linked-accounts', async (c) => {
  const userId = c.get('userId')
  const { results } = await c.env.DB.prepare(`
    SELECT la.*, p.name as provider_name, p.branding_url as provider_branding, pm.name as payment_method_name 
    FROM user_linked_accounts la 
    JOIN providers p ON la.provider_id = p.id 
    LEFT JOIN user_payment_methods pm ON la.payment_method_id = pm.id 
    WHERE la.user_id = ?
  `).bind(userId).all()
  return c.json(results)
})

user.post('/linked-accounts', zValidator('json', UserLinkedAccountSchema), async (c) => {
  const userId = c.get('userId')
  const householdId = c.get('householdId')
  const data = c.req.valid('json')
  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    `INSERT INTO user_linked_accounts (id, user_id, household_id, provider_id, payment_method_id, email_attached, membership_start_date, membership_end_date, subscription_id, notes, status) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, userId, householdId, data.provider_id, data.payment_method_id, data.email_attached, data.membership_start_date, data.membership_end_date, data.subscription_id, data.notes, data.status).run()
  
  if (data.subscription_id) {
    await c.env.DB.prepare('UPDATE subscriptions SET provider_account_id = ? WHERE id = ? AND household_id = ?').bind(id, data.subscription_id, householdId).run()
  }

  return c.json({ success: true, id })
})

export default user
