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
  JoinHouseholdSchema,
  UserOutputSchema,
  EnvelopeSchema
} from '../schemas'
import { logAudit } from '../utils'
import { CURRENT_VERSION, VERSION_UPDATES } from '../constants'
import { EmailService } from '../services/email.service'
import { getDb } from '../db'
import { users, userOnboarding, sessions, households, accounts, userHouseholds, householdInvites, userPreferences, notificationSettings, userPaymentMethods, serviceProviders, linkedProviders, userIdentities, userLinkedAccounts, passkeys, subscriptions, totps } from '../db/schema'
import { eq, and, sql, desc, or, gt, ne, isNull } from 'drizzle-orm'

const user = new Hono<{ Bindings: Bindings, Variables: Variables }>()

// Profile & Identity
user.get('/me', (c) => {
  return c.json({
    success: true,
    data: {
      userId: c.get('userId'),
      householdId: c.get('householdId'),
      globalRole: c.get('globalRole')
    }
  })
})

user.get('/profile', async (c) => {
  const userId = c.get('userId')
  const db = getDb(c.env)
  try {
    const results = await db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      displayName: users.displayName,
      globalRole: users.globalRole,
      status: users.status,
      avatarUrl: users.avatarUrl,
      settingsJson: users.settingsJson,
      totpEnabled: users.totpEnabled,
      forcePasswordChange: users.forcePasswordChange,
      createdAt: users.createdAt
    }).from(users).where(eq(users.id, userId as string))
    
    if (!results || results.length === 0) {
      return c.json({ success: false, error: 'User not found' }, 404)
    }

    const userData = results[0] as any;
    
    // Fetch primary household context
    const [userHh] = await db.select({ householdId: userHouseholds.householdId })
      .from(userHouseholds)
      .where(eq(userHouseholds.userId, userId as string))
      .limit(1)
    
    userData.householdId = userHh?.householdId || null;
    
    try {
      return c.json({
        success: true,
        data: UserOutputSchema.parse(userData)
      })
    } catch (e: any) {
      console.error(`[DIAGNOSTIC_FAILURE] User profile validation failed for ${userId}:`, e.errors || e.message);
      throw e;
    }
  } catch (err: any) {
    console.error(`[CRITICAL_FAILURE] Failed to fetch profile for user ${userId}:`, err.message);
    throw new HTTPException(500, { message: 'Internal Server Error fetching profile' })
  }
})

user.patch('/profile', zValidator('json', ProfileSchema, (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Profile update validation failed:`, result.error.errors);
  }
}), async (c) => {
  const userId = c.get('userId') as string
  const data = c.req.valid('json')
  const db = getDb(c.env)
  
  const updates: any = {}
  if (data.display_name) updates.displayName = data.display_name
  if (data.settings_json) updates.settingsJson = data.settings_json
  
  if (data.email !== undefined) {
    if (data.email) {
      const emailCollision = await db.select({ id: users.id }).from(users).where(eq(users.email, data.email)).limit(1).then(res => res[0]);
      if (emailCollision && emailCollision.id !== userId) {
         return c.json({ error: 'This email address is already bound to an existing account. Please choose a different one.' }, 409);
      }
    }
    updates.email = data.email || null;
  }
  
  if (data.username !== undefined) {
    if (data.username) {
      const usernameCollision = await db.select({ id: users.id }).from(users).where(eq(users.username, data.username)).limit(1).then(res => res[0]);
      if (usernameCollision && usernameCollision.id !== userId) {
         return c.json({ error: 'This username is already taken. Please choose another.' }, 409);
      }
    }
    updates.username = data.username || null;
  }
  
  if (data.avatar_url !== undefined) updates.avatarUrl = data.avatar_url || null
  
  if (Object.keys(updates).length > 0) {
    await db.update(users).set(updates).where(eq(users.id, userId))
    await logAudit(c, 'users', userId, 'UPDATE', null, updates)
  }
  
  return c.json({ success: true, message: 'Profile updated' })
})

user.post('/profile/sync', zValidator('json', z.object({ provider: z.string(), identityId: z.string() }), (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Profile sync validation failed:`, result.error.errors);
  }
}), async (c) => {
  const userId = c.get('userId') as string
  const { provider, identityId } = c.req.valid('json')
  const db = getDb(c.env)

  const identity = await db.select().from(userIdentities).where(and(eq(userIdentities.id, identityId), eq(userIdentities.userId, userId))).limit(1).then(res => res[0]);
  
  if (!identity) {
    return c.json({ error: 'Identity association not found' }, 404);
  }
  
  if (identity.avatarUrl) {
    await db.update(users).set({ avatarUrl: identity.avatarUrl }).where(eq(users.id, userId));
  }
  
  return c.json({ success: true, message: 'Profile sync successful' })
})

// Onboarding Status
user.get('/onboarding', async (c) => {
  const userId = c.get('userId') as string
  const db = getDb(c.env)
  
  const completedNodes = await db.select({ stepId: userOnboarding.stepId }).from(userOnboarding).where(and(eq(userOnboarding.userId, userId), eq(userOnboarding.status, 'completed')))
  const completedSteps = completedNodes.map(r => r.stepId)
  
  const userResult = await db.select({ lastViewedVersion: users.lastViewedVersion }).from(users).where(eq(users.id, userId)).limit(1).then(res => res[0])
  const lastVersion = userResult?.lastViewedVersion || 'Stable'
  
  const recentUpdates = VERSION_UPDATES.filter(v => v.version > lastVersion)
  
  return c.json({
    success: true,
    data: {
      completedSteps: completedSteps,
      isCompleted: completedSteps.length >= 4,
      updates: recentUpdates,
      currentVersion: CURRENT_VERSION
    }
  })
})

user.post('/onboarding/step', zValidator('json', z.object({
  step: z.string(),
  isLast: z.boolean().optional(),
  version: z.string().optional()
}), (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Onboarding step validation failed:`, result.error.errors);
  }
}), async (c) => {
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
  }).from(households).innerJoin(userHouseholds, eq(households.id, userHouseholds.householdId)).where(and(eq(userHouseholds.userId, userId), ne(households.status, 'archived')))
  
  return c.json({
    success: true,
    data: results
  })
})

user.post('/households', zValidator('json', CreateHouseholdSchema, (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Household creation validation failed:`, result.error.errors);
  }
}), async (c) => {
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

user.post('/households/invite', zValidator('json', z.object({ email: z.string().email().optional() }).optional(), (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Household invite validation failed:`, result.error.errors);
  }
}), async (c) => {
  const userId = c.get('userId') as string
  const householdId = c.req.header('x-household-id')
  const body = c.req.valid('json')
  const db = getDb(c.env)
  
  if (!householdId) throw new HTTPException(400, { message: 'Missing x-household-id header' })

  const household = await db.select({ name: households.name, role: userHouseholds.role })
    .from(households).innerJoin(userHouseholds, eq(households.id, userHouseholds.householdId))
    .where(and(and(eq(userHouseholds.userId, userId), ne(households.status, 'archived')), eq(households.id, householdId))).limit(1).then(res => res[0])
  
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

user.post('/households/join', zValidator('json', JoinHouseholdSchema, (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Household join validation failed:`, result.error.errors);
  }
}), async (c) => {
  const userId = c.get('userId') as string
  const { token } = c.req.valid('json')
  const db = getDb(c.env)
  
  const invite = await db.select().from(householdInvites).where(and(eq(householdInvites.id, token), eq(householdInvites.status, 'pending'))).limit(1).then(res => res[0])
  
  if (!invite) throw new HTTPException(404, { message: 'Invitation not found or already accepted' })
  if (new Date(invite.expiresAt) < new Date()) {
    await db.update(householdInvites).set({ status: 'expired' }).where(eq(householdInvites.id, token))
    throw new HTTPException(410, { message: 'Invitation expired' })
  }

  const existing = await db.select({ role: userHouseholds.role }).from(userHouseholds).where(and(and(eq(userHouseholds.userId, userId), ne(households.status, 'archived')), eq(userHouseholds.householdId, invite.householdId))).limit(1).then(res => res[0])
  if (existing) throw new HTTPException(409, { message: 'You are already a member of this household' })

  await db.batch([
    db.insert(userHouseholds).values({ userId, householdId: invite.householdId, role: 'member' }),
    db.update(householdInvites).set({ status: 'accepted' }).where(eq(householdInvites.id, token))
  ])
  
  await logAudit(c, 'households', invite.householdId, 'JOIN_VIA_INVITE', null, { userId })
  
  return c.json({ success: true, householdId: invite.householdId })
})

user.patch('/households/:id', zValidator('json', UpdateHouseholdSchema, (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Household update validation failed:`, result.error.errors);
  }
}), async (c) => {
  const { id } = c.req.param()
  const { name } = c.req.valid('json')
  const globalRole = c.get('globalRole') as string
  const userId = c.get('userId') as string
  const db = getDb(c.env)

  if (globalRole !== 'super_admin') {
     const membership = await db.select({ role: userHouseholds.role }).from(userHouseholds).where(and(and(eq(userHouseholds.userId, userId), ne(households.status, 'archived')), eq(userHouseholds.householdId, id))).limit(1).then(res => res[0])
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

user.patch('/preferences', zValidator('json', z.record(z.string(), z.string()), (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Preferences update validation failed:`, result.error.errors);
  }
}), async (c) => {
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
  return c.json({
    success: true,
    data: results
  })
})

user.patch('/notifications', zValidator('json', z.array(z.object({
  type: z.string(),
  event: z.string(),
  enabled: z.boolean(),
  offset_days: z.number().optional()
})), (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Notifications update validation failed:`, result.error.errors);
  }
}), async (c) => {
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
  return c.json({ success: true, data: results || [] })
})

user.post('/payment-methods', zValidator('json', UserPaymentMethodSchema, (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Payment method creation validation failed:`, result.error.errors);
  }
}), async (c) => {
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
  return c.json({ success: true, data: results || [] })
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
  return c.json({
    success: true,
    data: results
  })
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
  return c.json({
    success: true,
    data: dbRes.results
  })
})

user.post('/providers/link', zValidator('json', z.object({
  serviceProviderId: z.string(),
  accountReference: z.string().optional(),
  customLabel: z.string().optional(),
  metadata: z.string().optional()
}), (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Provider link validation failed:`, result.error.errors);
  }
}), async (c) => {
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
    SELECT la.*, sp.name as provider_name, sp.visibility as provider_branding, 'N/A' as payment_method_name 
    FROM linked_providers la 
    JOIN service_providers sp ON la.service_provider_id = sp.id 
    WHERE la.user_id = ?
  `).bind(userId).all()
  return c.json({
    success: true,
    data: dbRes.results
  })
})

user.post('/linked-accounts', zValidator('json', UserLinkedAccountSchema, (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Linked account creation validation failed:`, result.error.errors);
  }
}), async (c) => {
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
  return c.json({
    success: true,
    data: results
  })
})

user.get('/totps', async (c) => {
  const userId = c.get('userId') as string
  const db = getDb(c.env)
  const results = await db.select({
    id: totps.id,
    name: totps.name,
    createdAt: totps.createdAt
  }).from(totps).where(eq(totps.userId, userId))
  return c.json({
    success: true,
    data: results
  })
})

user.patch('/totps/:id', zValidator('json', z.object({ name: z.string() }), (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] TOTP update validation failed:`, result.error.errors);
  }
}), async (c) => {
  const userId = c.get('userId') as string
  const { id } = c.req.param()
  const { name } = c.req.valid('json')
  const db = getDb(c.env)
  
  await db.update(totps).set({ name }).where(and(eq(totps.id, id), eq(totps.userId, userId)))
  await logAudit(c, 'totps', id, 'UPDATE', null, { name })
  return c.json({ success: true })
})

user.delete('/totps/:id', async (c) => {
  const userId = c.get('userId') as string
  const { id } = c.req.param()
  const db = getDb(c.env)
  
  await db.delete(totps).where(and(eq(totps.id, id), eq(totps.userId, userId)))
  await logAudit(c, 'totps', id, 'DELETE')
  
  // Re-check count to turn off totpEnabled if 0 remaining
  const remaining = await db.select({ count: sql`count(*)` }).from(totps).where(eq(totps.userId, userId)).then(res => res[0].count as number)
  if (remaining === 0) {
    await db.update(users).set({ totpEnabled: 0 }).where(eq(users.id, userId))
  }
  
  return c.json({ success: true })
})

export default user


// Sessions
user.get('/sessions', async (c) => {
  const userId = c.get('userId') as string
  const db = getDb(c.env)
  const results = await db.select().from(sessions).where(eq(sessions.userId, userId)).orderBy(desc(sessions.lastActiveAt))
  return c.json({
    success: true,
    data: results
  })
})

user.delete('/sessions/:id', async (c) => {
  const userId = c.get('userId') as string
  const id = c.req.param('id')
  const db = getDb(c.env)
  await db.delete(sessions).where(and(eq(sessions.id, id), eq(sessions.userId, userId)))
  await logAudit(c, 'sessions', id, 'REVOKE', null, null)
  return c.json({ success: true })
})



// Phase 3: Household Management Expansions

user.get('/households/:id/members', async (c) => {
  const userId = c.get('userId') as string
  const id = c.req.param('id')
  const db = getDb(c.env)
  
  // Verify membership
  const membership = await db.select().from(userHouseholds).where(and(eq(userHouseholds.userId, userId), eq(userHouseholds.householdId, id))).limit(1).then(res => res[0])
  if (!membership) return c.json({ error: 'Forbidden' }, 403)
    
  const members = await db.select({
    id: users.id,
    email: users.email,
    displayName: users.displayName,
    avatarUrl: users.avatarUrl,
    role: userHouseholds.role
  }).from(users).innerJoin(userHouseholds, eq(users.id, userHouseholds.userId)).where(eq(userHouseholds.householdId, id))
  
  return c.json({
    success: true,
    data: members
  })
})

user.get('/households/:id/invites', async (c) => {
  const userId = c.get('userId') as string
  const id = c.req.param('id')
  const db = getDb(c.env)
  const results = await db.select().from(householdInvites).where(and(eq(householdInvites.householdId, id), eq(householdInvites.status, 'pending')))
  return c.json({
    success: true,
    data: results
  })
})

user.delete('/households/:id/invites/:inviteId', async (c) => {
  const userId = c.get('userId') as string
  const { id, inviteId } = c.req.param()
  const db = getDb(c.env)
  
  const membership = await db.select().from(userHouseholds).where(and(eq(userHouseholds.userId, userId), eq(userHouseholds.householdId, id))).limit(1).then(res => res[0])
  if (!membership || (membership.role !== 'admin' && membership.role !== 'owner')) return c.json({ error: 'Forbidden' }, 403)
    
  await db.delete(householdInvites).where(eq(householdInvites.id, inviteId))
  await logAudit(c, 'households', id, 'INVITE_REVOKED', null, { inviteId })
  return c.json({ success: true })
})

user.patch('/households/:id/members/:memberId', zValidator('json', z.object({ role: z.enum(['observer', 'member', 'admin', 'owner']) }), (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Member role update validation failed:`, result.error.errors);
  }
}), async (c) => {
  const userId = c.get('userId') as string
  const { id, memberId } = c.req.param()
  const { role } = c.req.valid('json')
  const db = getDb(c.env)
  
  const membership = await db.select().from(userHouseholds).where(and(eq(userHouseholds.userId, userId), eq(userHouseholds.householdId, id))).limit(1).then(res => res[0])
  if (!membership || (membership.role !== 'admin' && membership.role !== 'owner')) return c.json({ error: 'Forbidden' }, 403)
    
  await db.update(userHouseholds).set({ role }).where(and(eq(userHouseholds.userId, memberId), eq(userHouseholds.householdId, id)))
  await logAudit(c, 'households', id, 'MEMBER_ROLE_UPDATED', null, { memberId, role })
  return c.json({ success: true })
})

user.delete('/households/:id/members/:memberId', zValidator('json', z.object({ transferToUserId: z.string().optional() }).optional(), (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Member ejection validation failed:`, result.error.errors);
  }
}), async (c) => {
  const userId = c.get('userId') as string
  const { id, memberId } = c.req.param()
  const db = getDb(c.env)
  
  // You can kick yourself (leave) or admins/owners can kick others
  if (userId !== memberId) {
    const membership = await db.select().from(userHouseholds).where(and(eq(userHouseholds.userId, userId), eq(userHouseholds.householdId, id))).limit(1).then(res => res[0])
    if (!membership || (membership.role !== 'admin' && membership.role !== 'owner')) return c.json({ error: 'Forbidden' }, 403)
  }
  
  // Ghost-Bill check
  const orphanedBills = await db.select().from(subscriptions).where(and(eq(subscriptions.householdId, id), eq(subscriptions.ownerId, memberId))).limit(1).then(res => res[0])
  
  if (orphanedBills) {
    const body = await c.req.json().catch(() => ({}))
    if (!body.transferToUserId) {
       return c.json({ error: 'Ghost-Bill Lock: User owns active bills.', requiresTransfer: true }, 400)
    } else {
       await db.update(subscriptions).set({ ownerId: body.transferToUserId }).where(and(eq(subscriptions.householdId, id), eq(subscriptions.ownerId, memberId)))
       await logAudit(c, 'households', id, 'OWNERSHIP_TRANSFERRED', null, { from: memberId, to: body.transferToUserId, type: 'subscriptions_batch' })
    }
  }

  await db.delete(userHouseholds).where(and(eq(userHouseholds.userId, memberId), eq(userHouseholds.householdId, id)))
  await logAudit(c, 'households', id, 'MEMBER_EJECTED', null, { memberId })
  return c.json({ success: true })
})

user.delete('/households/:id', async (c) => {
  const userId = c.get('userId') as string
  const id = c.req.param('id')
  const db = getDb(c.env)
  
  const membership = await db.select().from(userHouseholds).where(and(eq(userHouseholds.userId, userId), eq(userHouseholds.householdId, id))).limit(1).then(res => res[0])
  if (!membership || membership.role !== 'owner') return c.json({ error: 'Only owners can archive households' }, 403)
    
  await db.update(households).set({ status: 'archived' }).where(eq(households.id, id))
  await logAudit(c, 'households', id, 'ARCHIVED', null, null)
  return c.json({ success: true })
})

user.post('/households/restore/:entityType/:entityId', async (c) => {
  const userId = c.get('userId') as string
  const { entityType, entityId } = c.req.param()
  const db = getDb(c.env)
  
  let targetTable;
  switch(entityType) {
    case 'households': targetTable = households; break;
    case 'accounts': targetTable = accounts; break;
    case 'providers': targetTable = serviceProviders; break;
    case 'payment_methods': targetTable = userPaymentMethods; break;
    default: return c.json({ error: 'Invalid entity' }, 400)
  }
  
  await db.update(targetTable).set({ status: 'active' }).where(eq(targetTable.id, entityId))
  await logAudit(c, entityType, entityId, 'RESTORED', null, null)
  return c.json({ success: true })
})


user.patch('/households/:id/transfer', zValidator('json', z.object({ newOwnerId: z.string() }), (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Household transfer validation failed:`, result.error.errors);
  }
}), async (c) => {
  const userId = c.get('userId') as string
  const id = c.req.param('id')
  const { newOwnerId } = c.req.valid('json')
  const db = getDb(c.env)
  
  const membership = await db.select().from(userHouseholds).where(and(eq(userHouseholds.userId, userId), eq(userHouseholds.householdId, id))).limit(1).then(res => res[0])
  if (!membership || membership.role !== 'owner') return c.json({ error: 'Only the current owner can transfer household ownership' }, 403)
    
  // Validate target is a member
  const targetMember = await db.select().from(userHouseholds).where(and(eq(userHouseholds.userId, newOwnerId), eq(userHouseholds.householdId, id))).limit(1).then(res => res[0])
  if (!targetMember) return c.json({ error: 'Target user is not a member of this household' }, 400)
    
  // Transaction equivalent
  await db.update(userHouseholds).set({ role: 'owner' }).where(and(eq(userHouseholds.userId, newOwnerId), eq(userHouseholds.householdId, id)))
  await db.update(userHouseholds).set({ role: 'admin' }).where(and(eq(userHouseholds.userId, userId), eq(userHouseholds.householdId, id)))
  
  await logAudit(c, 'households', id, 'OWNERSHIP_TRANSFERRED', null, { from: userId, to: newOwnerId, context: 'household_core' })
  return c.json({ success: true })
})

user.patch('/providers/:id/transfer', zValidator('json', z.object({ newOwnerId: z.string() }), (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Provider transfer validation failed:`, result.error.errors);
  }
}), async (c) => {
  const userId = c.get('userId') as string
  const id = c.req.param('id')
  const { newOwnerId } = c.req.valid('json')
  const db = getDb(c.env)
  
  const provider = await db.select().from(serviceProviders).where(eq(serviceProviders.id, id)).limit(1).then(res => res[0])
  if (!provider) return c.json({ error: 'Not found' }, 404)
    
  // Verify permissions (admin or current creator)
  if (provider.createdBy !== userId) {
     const membership = provider.householdId ? await db.select().from(userHouseholds).where(and(eq(userHouseholds.userId, userId), eq(userHouseholds.householdId, provider.householdId))).limit(1).then(res => res[0]) : null
     if (!membership || (membership.role !== 'admin' && membership.role !== 'owner')) return c.json({ error: 'Forbidden' }, 403)
  }
  
  await db.update(serviceProviders).set({ createdBy: newOwnerId }).where(eq(serviceProviders.id, id))
  await logAudit(c, 'service_providers', id, 'OWNERSHIP_TRANSFERRED', null, { from: provider.createdBy, to: newOwnerId })
  return c.json({ success: true })
})
