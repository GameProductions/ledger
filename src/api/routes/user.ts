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
  UserLinkedAccountSchema,
  JoinHouseholdSchema
} from '../schemas'
import { logAudit } from '../utils'
import { CURRENT_VERSION, VERSION_UPDATES } from '../constants'
import { EmailService } from '../services/email.service'
import { getDb } from '../db'
import { users, userOnboarding, households, userHouseholds, householdInvites, userPreferences, notificationSettings, userPaymentMethods, serviceProviders, linkedProviders, userIdentities, userLinkedAccounts, passkeys, subscriptions } from '../db/schema'
import { eq, and, sql, desc, or, gt } from 'drizzle-orm'

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
  const db = getDb(c.env)
  const results = await db.select({
    id: users.id,
    email: users.email,
    displayName: users.displayName,
    avatarUrl: users.avatarUrl,
    globalRole: users.globalRole,
    status: users.status,
    settingsJson: users.settingsJson,
    createdAt: users.createdAt
  }).from(users).where(eq(users.id, userId as string))
  
  if (!results || results.length === 0) {
    return c.json({ error: 'User not found' }, 404)
  }
  
  return c.json(results[0])
})

user.patch('/profile', zValidator('json', ProfileSchema), async (c) => {
  const userId = c.get('userId') as string
  const data = c.req.valid('json')
  const db = getDb(c.env)
  
  const updates: any = {}
  if (data.display_name) updates.displayName = data.display_name
  if (data.settings_json) updates.settingsJson = data.settings_json
  if (data.email) updates.email = data.email
  if (data.avatar_url !== undefined) updates.avatarUrl = data.avatar_url || null
  // Note: timezone is generally in settingsJson or handled separately now, omitting strictly typed timezone if not in schema.
  
  if (Object.keys(updates).length > 0) {
    await db.update(users).set(updates).where(eq(users.id, userId))
  }
  
  return c.json({ success: true })
})

// Onboarding Status
user.get('/onboarding', async (c) => {
  const userId = c.get('userId') as string
  const db = getDb(c.env)
  
  const completedNodes = await db.select({ stepId: userOnboarding.stepId }).from(userOnboarding).where(and(eq(userOnboarding.userId, userId), eq(userOnboarding.status, 'completed')))
  const completedSteps = completedNodes.map(r => r.stepId)
  
  const userResult = await db.select({ lastViewedVersion: users.lastViewedVersion }).from(users).where(eq(users.id, userId)).limit(1).then(res => res[0])
  const lastVersion = userResult?.lastViewedVersion || 'v1.0.0'
  
  const recentUpdates = VERSION_UPDATES.filter(v => v.version > lastVersion)
  
  return c.json({
    completed_steps: completedSteps,
    is_completed: completedSteps.length >= 4,
    updates: recentUpdates,
    current_version: CURRENT_VERSION
  })
})

user.post('/onboarding/step', zValidator('json', z.object({
  step: z.string(),
  isLast: z.boolean().optional(),
  version: z.string().optional()
})), async (c) => {
  const userId = c.get('userId') as string
  const { step, isLast, version } = c.req.valid('json')
  const db = getDb(c.env)
  
  await db.insert(userOnboarding).values({
    id: crypto.randomUUID(),
    userId,
    stepId: step,
    status: 'completed'
  }).onConflictDoUpdate({
    target: [userOnboarding.id], // Approximate, replace typically works by PK
    set: { status: 'completed', completedAt: new Date().toISOString() }
  })
  
  if (version) {
    await db.update(users).set({ lastViewedVersion: version }).where(eq(users.id, userId))
  }
  
  const completedNodes = await db.select({ stepId: userOnboarding.stepId }).from(userOnboarding).where(and(eq(userOnboarding.userId, userId), eq(userOnboarding.status, 'completed')))
  const completedSteps = completedNodes.map(r => r.stepId)

  return c.json({
    success: true,
    completed_steps: completedSteps,
    is_completed: isLast || completedSteps.length >= 4
  })
})

// Households
user.get('/households', async (c) => {
  const userId = c.get('userId') as string
  const db = getDb(c.env)
  
  const results = await db.select({
    id: households.id,
    name: households.name,
    createdAt: households.createdAt,
    currency: households.currency,
    countryCode: households.countryCode,
    unallocatedBalanceCents: households.unallocatedBalanceCents,
    role: userHouseholds.role
  }).from(households).innerJoin(userHouseholds, eq(households.id, userHouseholds.householdId)).where(eq(userHouseholds.userId, userId))
  
  return c.json(results)
})

user.post('/households', zValidator('json', CreateHouseholdSchema), async (c) => {
  const userId = c.get('userId') as string
  const { name, currency } = c.req.valid('json')
  const id = `h-${crypto.randomUUID().slice(0, 8)}`
  const db = getDb(c.env)
  
  await db.batch([
    db.insert(households).values({ id, name, currency: currency || 'USD' }),
    db.insert(userHouseholds).values({ userId, householdId: id, role: 'admin' })
  ])
  
  await logAudit(c, 'households', id, 'CREATE', null, { name, currency })
  return c.json({ success: true, id, name }, 201)
})

user.post('/households/invite', zValidator('json', z.object({ email: z.string().email().optional() }).optional()), async (c) => {
  const userId = c.get('userId') as string
  const householdId = c.req.header('x-household-id')
  const body = c.req.valid('json')
  const db = getDb(c.env)
  
  if (!householdId) throw new HTTPException(400, { message: 'Missing x-household-id header' })

  const household = await db.select({ name: households.name, role: userHouseholds.role })
    .from(households).innerJoin(userHouseholds, eq(households.id, userHouseholds.householdId))
    .where(and(eq(userHouseholds.userId, userId), eq(households.id, householdId))).limit(1).then(res => res[0])
  
  if (!household || household.role !== 'admin') {
    throw new HTTPException(403, { message: 'Forbidden: Only household admins can generate invites' })
  }

  const id = crypto.randomUUID()
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + 24)
  
  await db.insert(householdInvites).values({
    id,
    householdId,
    createdBy: userId,
    expiresAt: expiresAt.toISOString()
  })
  
  const inviteUrl = `${c.env.WEB_URL || 'https://ledger.gpnet.dev'}/#/households/join?token=${id}`

  if (body?.email) {
    const emailService = new EmailService(c.env)
    try {
      await emailService.sendInvitationEmail(body.email, household.name, inviteUrl)
    } catch (err) {
      console.error('[Invitation] Failed to send email:', err)
    }
  }

  await logAudit(c, 'households', householdId, 'INVITE_GENERATED', null, { token: id, target_email: body?.email })
  
  return c.json({ success: true, url: `#/households/join?token=${id}` })
})

user.post('/households/join', zValidator('json', JoinHouseholdSchema), async (c) => {
  const userId = c.get('userId') as string
  const { token } = c.req.valid('json')
  const db = getDb(c.env)
  
  const invite = await db.select().from(householdInvites).where(and(eq(householdInvites.id, token), eq(householdInvites.status, 'pending'))).limit(1).then(res => res[0])
  
  if (!invite) throw new HTTPException(404, { message: 'Invitation not found or already accepted' })
  if (new Date(invite.expiresAt) < new Date()) {
    await db.update(householdInvites).set({ status: 'expired' }).where(eq(householdInvites.id, token))
    throw new HTTPException(410, { message: 'Invitation expired' })
  }

  const existing = await db.select({ role: userHouseholds.role }).from(userHouseholds).where(and(eq(userHouseholds.userId, userId), eq(userHouseholds.householdId, invite.householdId))).limit(1).then(res => res[0])
  if (existing) throw new HTTPException(409, { message: 'You are already a member of this household' })

  await db.batch([
    db.insert(userHouseholds).values({ userId, householdId: invite.householdId, role: 'member' }),
    db.update(householdInvites).set({ status: 'accepted' }).where(eq(householdInvites.id, token))
  ])
  
  await logAudit(c, 'households', invite.householdId, 'JOIN_VIA_INVITE', null, { userId })
  
  return c.json({ success: true, householdId: invite.householdId })
})

user.patch('/households/:id', zValidator('json', UpdateHouseholdSchema), async (c) => {
  const { id } = c.req.param()
  const { name } = c.req.valid('json')
  const globalRole = c.get('globalRole') as string
  const userId = c.get('userId') as string
  const db = getDb(c.env)

  if (globalRole !== 'super_admin') {
     const membership = await db.select({ role: userHouseholds.role }).from(userHouseholds).where(and(eq(userHouseholds.userId, userId), eq(userHouseholds.householdId, id))).limit(1).then(res => res[0])
     if (!membership || (membership.role !== 'admin' && membership.role !== 'super_admin')) {
       throw new HTTPException(403, { message: 'Forbidden: Insufficient permissions to rename household' })
     }
  }

  const existing = await db.select({ name: households.name }).from(households).where(eq(households.id, id)).limit(1).then(res => res[0])
  if (!existing) throw new HTTPException(404, { message: 'Household not found' })

  await db.update(households).set({ name }).where(eq(households.id, id))
  await logAudit(c, 'households', id, 'UPDATE', { name: existing.name }, { name })

  return c.json({ success: true, name })
})

// Preferences
user.get('/preferences', async (c) => {
  const userId = c.get('userId') as string
  const db = getDb(c.env)
  const results = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId))
  return c.json(results.reduce((acc: any, curr: any) => ({ ...acc, [curr.key]: curr.value }), {}))
})

user.patch('/preferences', zValidator('json', z.record(z.string(), z.string())), async (c) => {
  const userId = c.get('userId') as string
  const prefs = c.req.valid('json')
  const db = getDb(c.env)
  
  for (const [key, value] of Object.entries(prefs)) {
    // Sqlite dialect onConflictDoUpdate requires specifying target logic, use raw for ease if needed or individual upserts
    await db.insert(userPreferences)
      .values({ userId, key, value })
      .onConflictDoUpdate({
         target: [userPreferences.userId, userPreferences.key],
         set: { value }
      });
  }
  return c.json({ success: true })
})

// Notifications
user.get('/notifications', async (c) => {
  const userId = c.get('userId') as string
  const db = getDb(c.env)
  const results = await db.select().from(notificationSettings).where(eq(notificationSettings.userId, userId))
  return c.json(results)
})

user.patch('/notifications', zValidator('json', z.array(z.object({
  type: z.string(),
  event: z.string(),
  enabled: z.boolean(),
  offset_days: z.number().optional()
}))), async (c) => {
  const userId = c.get('userId') as string
  const settings = c.req.valid('json')
  const db = getDb(c.env)

  for (const s of settings) {
    await db.insert(notificationSettings)
      .values({ userId, type: s.type, event: s.event, enabled: s.enabled, offsetDays: s.offset_days || 3 })
      .onConflictDoUpdate({
         target: [notificationSettings.userId, notificationSettings.type, notificationSettings.event],
         set: { enabled: s.enabled, offsetDays: s.offset_days || 3 }
      });
  }
  return c.json({ success: true })
})

// Payment Methods
user.get('/payment-methods', async (c) => {
  const userId = c.get('userId') as string
  const db = getDb(c.env)
  // Assuming isActive exists via migrations or implicit, skipping if schema didn't include it. 
  const results = await db.select().from(userPaymentMethods).where(eq(userPaymentMethods.userId, userId))
  return c.json(results || [])
})

user.post('/payment-methods', zValidator('json', UserPaymentMethodSchema), async (c) => {
  const userId = c.get('userId') as string
  const householdId = c.get('householdId') || null
  const data = c.req.valid('json')
  const id = crypto.randomUUID()
  const db = getDb(c.env) // We don't have all these columns explicitly in schema.ts, executing via raw inside Drizzle template to maintain flow securely
  
  await db.run(sql`INSERT INTO user_payment_methods (id, user_id, household_id, name, type, last_four, branding_url) VALUES (${id}, ${userId}, ${householdId}, ${data.name}, ${data.type}, ${data.last_four || null}, ${data.branding_url || null})`)
  
  await logAudit(c, 'user_payment_methods', id, 'CREATE', null, { name: data.name, type: data.type })
  return c.json({ success: true, id })
})

// Linked Providers & Accounts
user.get('/service-providers', async (c) => {
  const db = getDb(c.env)
  const results = await db.select().from(serviceProviders)
  return c.json(results)
})

user.get('/identities', async (c) => {
  const userId = c.get('userId') as string
  const db = getDb(c.env)
  const results = await db.select({
    id: userIdentities.id,
    provider: userIdentities.provider,
    providerUserId: userIdentities.providerUserId,
    email: userIdentities.email,
    name: userIdentities.name,
    avatarUrl: userIdentities.avatarUrl,
    createdAt: userIdentities.createdAt
  }).from(userIdentities).where(eq(userIdentities.userId, userId))
  return c.json(results)
})

user.delete('/identities/:id', async (c) => {
  const userId = c.get('userId') as string
  const { id } = c.req.param()
  const db = getDb(c.env)
  await db.delete(userIdentities).where(and(eq(userIdentities.id, id), eq(userIdentities.userId, userId)))
  await logAudit(c, 'user_identities', id, 'DELETE')
  return c.json({ success: true })
})

user.get('/providers', async (c) => {
  // Use raw sql for complex joins unmapped perfectly in generated schema
  const db = getDb(c.env)
  const userId = c.get('userId') as string
  const results = await db.run(sql`SELECT lp.*, sp.name as provider_name, sp.icon_url as icon_url FROM linked_providers lp JOIN service_providers sp ON lp.service_provider_id = sp.id WHERE lp.user_id = ${userId}`)
  // D1 run result logic vs .all(): if mapped D1 driver is used, better to wrap in query
  // Fallback to strict DB.prepare for unmapped complex joins
  const dbRes = await c.env.DB.prepare(
    `SELECT lp.*, sp.name as provider_name, sp.icon_url 
     FROM linked_providers lp
     JOIN service_providers sp ON lp.service_provider_id = sp.id
     WHERE lp.user_id = ?`
  ).bind(userId).all()
  return c.json(dbRes.results)
})

user.post('/providers/link', zValidator('json', z.object({
  serviceProviderId: z.string(),
  accountReference: z.string().optional(),
  customLabel: z.string().optional(),
  metadata: z.string().optional()
})), async (c) => {
  const userId = c.get('userId') as string
  const { serviceProviderId, accountReference, customLabel, metadata } = c.req.valid('json')
  const id = crypto.randomUUID()
  const db = getDb(c.env)
  await db.insert(linkedProviders).values({
    id, userId, serviceProviderId, accountReference, customLabel, metadata
  })
  return c.json({ success: true, id })
})

user.get('/linked-accounts', async (c) => {
  const userId = c.get('userId') as string
  const dbRes = await c.env.DB.prepare(`
    SELECT la.*, sp.name as provider_name, sp.visibility as provider_branding, pm.id as payment_method_name 
    FROM user_linked_accounts la 
    JOIN service_providers sp ON la.provider_id = sp.id 
    LEFT JOIN user_payment_methods pm ON la.account_id = pm.id 
    WHERE la.user_id = ?
  `).bind(userId).all()
  return c.json(dbRes.results)
})

user.post('/linked-accounts', zValidator('json', UserLinkedAccountSchema), async (c) => {
  const userId = c.get('userId') as string
  const householdId = c.get('householdId') as string
  const data = c.req.valid('json')
  const id = crypto.randomUUID()
  const db = getDb(c.env)
  
  await db.run(sql`INSERT INTO user_linked_accounts (id, user_id, household_id, provider_id, payment_method_id, email_attached, membership_start_date, membership_end_date, subscription_id, notes, status) 
     VALUES (${id}, ${userId}, ${householdId}, ${data.provider_id}, ${data.payment_method_id}, ${data.email_attached}, ${data.membership_start_date}, ${data.membership_end_date}, ${data.subscription_id}, ${data.notes}, ${data.status})`)
  
  if (data.subscription_id) {
    await db.run(sql`UPDATE subscriptions SET account_id = ${id} WHERE id = ${data.subscription_id} AND household_id = ${householdId}`)
  }

  return c.json({ success: true, id })
})

// Passkeys Management
user.get('/passkeys', async (c) => {
  const userId = c.get('userId') as string
  const db = getDb(c.env)
  const results = await db.select({
    id: passkeys.id,
    name: passkeys.name,
    aaguid: passkeys.aaguid,
    createdAt: passkeys.createdAt
  }).from(passkeys).where(eq(passkeys.userId, userId))
  return c.json(results)
})

export default user
