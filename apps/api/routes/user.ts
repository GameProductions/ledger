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
  JoinHouseholdByCodeSchema,
  CreateHouseholdInviteSchema,
  UpdateHouseholdInviteSchema,
  UserOutputSchema,
  EnvelopeSchema
} from '@shared/schemas'
import { logAudit } from '../utils'
import { ipRateLimit } from '../utils/rate-limit'
import { CURRENT_VERSION, VERSION_UPDATES } from '@shared/constants'
import { EmailService } from '../services/email.service'
import { VaultService } from '../utils/vault.service'
import { getDb } from '#/index'
import { 
  users, userOnboarding, sessions, households, accounts, userHouseholds, 
  householdInvites, userPreferences, notificationSettings, userPaymentMethods, 
  serviceProviders, linkedProviders, userIdentities, userLinkedAccounts, 
  passkeys, subscriptions, systemAnnouncements, 
  activityLogs as auditLogs 
} from '#/schema'
import { eq, and, sql, desc, asc, or, gt, ne, isNull } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
const user = new Hono<{ Bindings: Bindings, Variables: Variables }>()

type AddressVisibility = {
  admin: 'read-write' | 'read-only' | 'hidden'
  member: 'read-write' | 'read-only' | 'hidden'
}
const DEFAULT_VISIBILITY: AddressVisibility = { admin: 'read-write', member: 'read-only' }

const HouseholdAddressSchema = z.object({
  street: z.string().optional().nullable(),
  unit: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  formatted: z.string().optional().nullable(),
}).nullable()

const AddressVisibilitySchema = z.object({
  admin: z.enum(['read-write', 'read-only', 'hidden']),
  member: z.enum(['read-write', 'read-only', 'hidden']),
})

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
    const results = (await db.select({
          id: users.id,
          username: users.username,
          email: users.email,
          displayName: users.displayName,
          globalRole: users.globalRole,
          status: users.status,
          avatarUrl: users.avatarUrl,
          forcePasswordChange: users.forcePasswordChange,
          locale: users.locale,
          theme: users.theme,
          timezone: users.timezone,
          settingsJson: users.settingsJson,
          createdAt: users.createdAt
        }).from(users).where(eq(users.id, userId as string)) as any)
    
    if (!results || results.length === 0) {
      return c.json({ success: false, error: 'User not found' }, 404)
    }

    const userData = results[0] as any;
    
    // Fetch primary household context
    const [userHh] = (await db.select({ householdId: userHouseholds.householdId })
          .from(userHouseholds)
          .where(eq(userHouseholds.userId, userId as string))
          .limit(1) as any)
    
    userData.householdId = userHh?.householdId || null;

    const memberships = (await db.select({
      householdId: userHouseholds.householdId,
      role: userHouseholds.role,
      joinedAt: userHouseholds.joinedAt,
      joinMethod: userHouseholds.joinMethod,
      householdName: households.name,
      householdCurrency: households.currency,
      householdStatus: households.status
    })
      .from(userHouseholds)
      .innerJoin(households, eq(households.id, userHouseholds.householdId))
      .where(eq(userHouseholds.userId, userId as string))
      .orderBy(asc(userHouseholds.joinedAt)) as any)

    userData.households = (memberships || []).map((m: any) => ({
      householdId: m.householdId,
      role: m.role,
      joinedAt: m.joinedAt,
      joinMethod: m.joinMethod,
      name: m.householdName,
      currency: m.householdCurrency,
      status: m.householdStatus
    }));
    
    try {
      return c.json({
        success: true,
        data: UserOutputSchema.parse(userData)
      })
    } catch (e: any) {
      console.error(`[DIAGNOSTIC_FAILURE] User profile validation failed for ${userId}:`, e.issues || e.message);
      throw e;
    }
  } catch (err: any) {
    console.error(`[CRITICAL_FAILURE] Failed to fetch profile for user ${userId}:`, err.message);
    throw new HTTPException(500, { message: 'Internal Server Error fetching profile' })
  }
})

user.patch('/profile', zValidator('json', ProfileSchema, (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Profile update validation failed:`, result.error.issues);
  }
}), async (c) => {
  const userId = c.get('userId') as string
  const data = (c.req.valid('json') as any)
  const db = getDb(c.env)
  
  const updates: any = {}
  if (data.displayName !== undefined) updates.displayName = data.displayName || null
  if (data.theme) updates.theme = data.theme
  if (data.timezone) updates.timezone = data.timezone
  
  if (data.email !== undefined) {
    if (data.email) {
      const emailCollision = (await db.select({ id: users.id }).from(users).where(eq(users.email, data.email)).limit(1).then(res => res[0]) as any);
      if (emailCollision && emailCollision.id !== userId) {
         return c.json({ error: 'This email address is already bound to an existing account. Please choose a different one.' }, 409);
      }
    }
    updates.email = data.email || null;
  }
  
  if (data.username !== undefined) {
    if (data.username) {
      const usernameCollision = (await db.select({ id: users.id }).from(users).where(eq(users.username, data.username)).limit(1).then(res => res[0]) as any);
      if (usernameCollision && usernameCollision.id !== userId) {
         return c.json({ error: 'This username is already taken. Please choose another.' }, 409);
      }
    }
    updates.username = data.username || null;
  }
  
  if (data.avatarUrl !== undefined) updates.avatarUrl = data.avatarUrl || null
  if (data.locale !== undefined) updates.locale = data.locale || 'en'
  if (data.theme !== undefined) updates.theme = data.theme || 'system'
  if (data.settingsJson !== undefined) updates.settingsJson = data.settingsJson

  if (Object.keys(updates).length > 0) {
    await db.update(users).set(updates).where(eq(users.id, userId))
    await logAudit(c, 'users', userId, 'UPDATE', null, updates)
  }

  // Return the fresh profile so the client can update its local state immediately
  const [updated] = await db.select({
    id: users.id,
    username: users.username,
    email: users.email,
    displayName: users.displayName,
    globalRole: users.globalRole,
    status: users.status,
    avatarUrl: users.avatarUrl,
    locale: users.locale,
    theme: users.theme,
    timezone: users.timezone,
    settingsJson: users.settingsJson,
    createdAt: users.createdAt
  }).from(users).where(eq(users.id, userId))

  return c.json({ success: true, message: 'Profile updated', data: updated || null })
})

user.post('/profile/sync', zValidator('json', z.object({ provider: z.string(), identityId: z.string() }), (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Profile sync validation failed:`, result.error.issues);
  }
}), async (c) => {
  const userId = c.get('userId') as string
  const { provider, identityId } = c.req.valid('json')
  const db = getDb(c.env)

  const identity = (await db.select().from(userIdentities).where(and(eq(userIdentities.id, identityId), eq(userIdentities.userId, userId))).limit(1).then(res => res[0]) as any);
  
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
  
  const completedNodes = (await db.select({ stepId: userOnboarding.stepId }).from(userOnboarding).where(and(eq(userOnboarding.userId, userId), eq(userOnboarding.status, 'completed'))) as any)
  const completedSteps = completedNodes.map((r: any) => r.stepId)
  
  const userResult = (await db.select({ lastSeenVersion: users.lastSeenVersion }).from(users).where(eq(users.id, userId)).limit(1).then(res => res[0]) as any)
  const lastVersion = userResult?.lastSeenVersion || 'Stable'
  
  const recentUpdates = VERSION_UPDATES.filter(v => v.version > lastVersion)

  return c.json({
    success: true,
    data: {
      completedSteps: completedSteps,
      isCompleted: completedSteps.includes('skip') || completedSteps.includes('privacy') || completedSteps.length >= 4,
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
    console.error(`[DIAGNOSTIC_FAILURE] Onboarding step validation failed:`, result.error.issues);
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
    await db.update(users).set({ lastSeenVersion: version }).where(eq(users.id, userId))
  }
  
  const completedNodes = (await db.select({ stepId: userOnboarding.stepId }).from(userOnboarding).where(and(eq(userOnboarding.userId, userId), eq(userOnboarding.status, 'completed'))) as any)
  const completedSteps = completedNodes.map((r: any) => r.stepId)

  return c.json({
    success: true,
    completedSteps: completedSteps,
    isCompleted: isLast || completedSteps.includes('skip') || completedSteps.includes('privacy') || completedSteps.length >= 4
  })
})

// Households
user.get('/households', async (c) => {
  const userId = c.get('userId') as string
  const db = getDb(c.env)
  
  const results = (await db.select({
      id: households.id,
      name: households.name,
      createdAt: households.createdAt,
      currency: households.currency,
      countryCode: households.countryCode,
      unallocatedBalanceCents: households.unallocatedBalanceCents,
      role: userHouseholds.role
    }).from(households).innerJoin(userHouseholds, eq(households.id, userHouseholds.householdId)).where(and(eq(userHouseholds.userId, userId), ne(households.status, 'archived'))) as any)
  
  return c.json({
    success: true,
    data: results
  })
})

user.get('/households/current', async (c) => {
  const userId = c.get('userId')
  const householdId = c.req.header('x-household-id')
  const db = getDb(c.env)
  
  if (!householdId) {
    return c.json({ success: false, error: 'No household context' }, 400)
  }

  const household = (await db.select({
      id: households.id,
      name: households.name,
      currency: households.currency,
      countryCode: households.countryCode,
      unallocatedBalanceCents: households.unallocatedBalanceCents
    }).from(households).where(eq(households.id, householdId)).then(res => res[0]) as any)

  if (!household) {
    return c.json({ success: false, error: 'Household not found' }, 404)
  }

  const members = (await db.select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      role: userHouseholds.role
    }).from(users)
      .innerJoin(userHouseholds, eq(users.id, userHouseholds.userId))
      .where(eq(userHouseholds.householdId, householdId)) as any)

  // Transform to match frontend expectations: { user: { id, displayName, ... }, role }
  const formattedMembers = members.map((m: any) => ({
    user: {
      id: m.id,
      email: m.email,
      displayName: m.displayName,
      avatarUrl: m.avatarUrl
    },
    role: m.role
  }))

  return c.json({
    success: true,
    data: {
      ...household,
      members: formattedMembers
    }
  })
})

user.post('/households', zValidator('json', CreateHouseholdSchema, (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Household creation validation failed:`, result.error.issues);
  }
}), async (c) => {
  const userId = c.get('userId') as string
  const { name, currency } = c.req.valid('json')
  const id = `h-${crypto.randomUUID().slice(0, 8)}`
  const db = getDb(c.env)
  
  await db.batch([
    db.insert(households).values({ id, name, currency: currency || 'USD' }),
    db.insert(userHouseholds).values({ userId, householdId: id, role: 'admin', joinMethod: 'create' })
  ])
  
  await logAudit(c, 'households', id, 'CREATE', null, { name, currency })
  return c.json({ success: true, id, name }, 201)
})

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function generateJoinCode(length: number): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  let code = ''
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length]
  }
  return code
}

async function ensureUniqueJoinCode(db: any, length: number, attempts = 0): Promise<string> {
  const code = generateJoinCode(length)
  const collision = (await db.select({ id: householdInvites.id }).from(householdInvites).where(eq(householdInvites.joinCode, code)).limit(1).then((res: any[]) => res[0]))
  if (collision && attempts < 5) return ensureUniqueJoinCode(db, length, attempts + 1)
  return code
}

user.post('/households/invite', zValidator('json', z.optional(CreateHouseholdInviteSchema), (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Household invite validation failed:`, result.error.issues);
  }
}), async (c) => {
  const userId = c.get('userId') as string
  const householdId = c.req.header('x-household-id')
  const body = (c.req.valid('json') || {}) as { email?: string; method?: 'link' | 'code' | 'both'; codeLength?: 6 | 8; codeLifetimeHours?: 24 | 168; reusable?: boolean }
  const db = getDb(c.env)
  
  if (!householdId) throw new HTTPException(400, { message: 'Missing x-household-id header' })

  const household = (await db.select({ name: households.name, role: userHouseholds.role, invitesEnabled: households.invitesEnabled })
      .from(households).innerJoin(userHouseholds, eq(households.id, userHouseholds.householdId))
      .where(and(and(eq(userHouseholds.userId, userId), ne(households.status, 'archived')), eq(households.id, householdId))).limit(1).then(res => res[0]) as any)
  
  if (!household || household.role !== 'admin') {
    throw new HTTPException(403, { message: 'Forbidden: Only household admins can generate invites' })
  }
  if (!household.invitesEnabled) {
    throw new HTTPException(403, { message: 'Invites are disabled for this household' })
  }

  const method = body.method || 'link'
  const codeLength = body.codeLength || 6
  const codeLifetimeHours = body.codeLifetimeHours || 24
  const reusable = body.reusable ?? true

  const id = crypto.randomUUID()
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + codeLifetimeHours)
  
  const joinCode = method !== 'link' ? await ensureUniqueJoinCode(db, codeLength) : null

  await db.insert(householdInvites).values({
    id,
    householdId,
    createdBy: userId,
    expiresAt: expiresAt.toISOString(),
    joinCode,
    codeLength: joinCode ? codeLength : null,
    reusable,
    joinCount: 0
  })
  
  const inviteUrl = `${c.env.WEB_URL || 'https://ledger.gpnet.dev'}/#/households/join?token=${id}`

  if (body?.email) {
    const emailService = new EmailService(c.env)
    try {
      await emailService.sendInvitationEmail(body.email, household.name, inviteUrl, method !== 'link' ? joinCode || undefined : undefined)
    } catch (err: any) {
      console.error('[Invitation] Failed to send email:', err)
    }
  }

  await logAudit(c, 'households', householdId, 'INVITE_GENERATED', null, {
    inviteId: id,
    method,
    codeLength: joinCode ? codeLength : null,
    lifetimeHours: codeLifetimeHours,
    reusable,
    targetEmail: body?.email
  })
  
  const response: any = { success: true, inviteId: id, method, expiresAt: expiresAt.toISOString(), reusable }
  if (method !== 'code') response.url = `#/households/join?token=${id}`
  if (method !== 'link') response.code = joinCode
  return c.json(response)
})

user.post('/households/join', zValidator('json', JoinHouseholdSchema, (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Household join validation failed:`, result.error.issues);
  }
}), async (c) => {
  const userId = c.get('userId') as string
  const { token } = c.req.valid('json')
  const db = getDb(c.env)
  
  const invite = (await db.select().from(householdInvites).where(and(eq(householdInvites.id, token), eq(householdInvites.status, 'pending'))).limit(1).then(res => res[0]) as any)
  
  if (!invite) throw new HTTPException(404, { message: 'Invitation not found or already accepted' })
  if (invite.disabledAt) throw new HTTPException(410, { message: 'Invitation has been revoked' })
  if (new Date(invite.expiresAt) < new Date()) {
    await db.update(householdInvites).set({ status: 'expired' }).where(eq(householdInvites.id, token))
    throw new HTTPException(410, { message: 'Invitation expired' })
  }

  const existing = (await db.select({ role: userHouseholds.role }).from(userHouseholds).where(and(and(eq(userHouseholds.userId, userId), ne(households.status, 'archived')), eq(userHouseholds.householdId, invite.householdId))).limit(1).then(res => res[0]) as any)
  if (existing) throw new HTTPException(409, { message: 'You are already a member of this household' })

  const invitesEnabled = (await db.select({ invitesEnabled: households.invitesEnabled }).from(households).where(eq(households.id, invite.householdId)).limit(1).then(res => res[0]) as any)
  if (invitesEnabled && invitesEnabled.invitesEnabled === false) {
    throw new HTTPException(410, { message: 'This household is no longer accepting invites' })
  }

  await db.batch([
    db.insert(userHouseholds).values({ userId, householdId: invite.householdId, role: 'member', joinMethod: 'invite' }),
    ...(invite.reusable
      ? [db.update(householdInvites).set({ joinCount: sql`${householdInvites.joinCount} + 1` }).where(eq(householdInvites.id, token))]
      : [db.update(householdInvites).set({ status: 'accepted' }).where(eq(householdInvites.id, token))])
  ])
  
  await logAudit(c, 'households', invite.householdId, 'JOIN_VIA_INVITE', null, { userId, joinMethod: 'invite' })
  
  return c.json({ success: true, householdId: invite.householdId })
})

user.post('/households/join-by-code', ipRateLimit('STRICT'), zValidator('json', JoinHouseholdByCodeSchema, (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Household join-by-code validation failed:`, result.error.issues);
  }
}), async (c) => {
  const userId = c.get('userId') as string
  const { code } = c.req.valid('json')
  const db = getDb(c.env)

  const invite = (await db.select().from(householdInvites).where(and(eq(householdInvites.joinCode, code), eq(householdInvites.status, 'pending'))).limit(1).then(res => res[0]) as any)

  if (!invite) throw new HTTPException(404, { message: 'That invite code was not found' })
  if (invite.disabledAt) throw new HTTPException(410, { message: 'That invite code has been revoked' })
  if (new Date(invite.expiresAt) < new Date()) {
    await db.update(householdInvites).set({ status: 'expired' }).where(eq(householdInvites.id, invite.id))
    throw new HTTPException(410, { message: 'That invite code has expired' })
  }

  const invitesEnabled = (await db.select({ invitesEnabled: households.invitesEnabled }).from(households).where(eq(households.id, invite.householdId)).limit(1).then(res => res[0]) as any)
  if (invitesEnabled && invitesEnabled.invitesEnabled === false) {
    throw new HTTPException(410, { message: 'This household is no longer accepting invites' })
  }

  const existing = (await db.select({ role: userHouseholds.role }).from(userHouseholds).where(and(and(eq(userHouseholds.userId, userId), ne(households.status, 'archived')), eq(userHouseholds.householdId, invite.householdId))).limit(1).then(res => res[0]) as any)
  if (existing) throw new HTTPException(409, { message: 'You are already a member of this household' })

  await db.batch([
    db.insert(userHouseholds).values({ userId, householdId: invite.householdId, role: 'member', joinMethod: 'code' }),
    ...(invite.reusable
      ? [db.update(householdInvites).set({ joinCount: sql`${householdInvites.joinCount} + 1` }).where(eq(householdInvites.id, invite.id))]
      : [db.update(householdInvites).set({ status: 'accepted' }).where(eq(householdInvites.id, invite.id))])
  ])

  await logAudit(c, 'households', invite.householdId, 'JOIN_VIA_CODE', null, { userId, joinMethod: 'code' })

  return c.json({ success: true, householdId: invite.householdId })
})

user.patch('/households/invites/:inviteId', zValidator('json', UpdateHouseholdInviteSchema, (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Household invite update validation failed:`, result.error.issues);
  }
}), async (c) => {
  const { inviteId } = c.req.param()
  const { disabled } = c.req.valid('json')
  const userId = c.get('userId') as string
  const globalRole = c.get('globalRole') as string
  const db = getDb(c.env)

  const invite = (await db.select().from(householdInvites).where(eq(householdInvites.id, inviteId)).limit(1).then(res => res[0]) as any)
  if (!invite) throw new HTTPException(404, { message: 'Invitation not found' })

  if (globalRole !== 'owner') {
    const membership = (await db.select({ role: userHouseholds.role }).from(userHouseholds).where(and(eq(userHouseholds.userId, userId), eq(userHouseholds.householdId, invite.householdId))).limit(1).then(res => res[0]) as any)
    if (!membership || membership.role !== 'admin') {
      throw new HTTPException(403, { message: 'Forbidden: Only household admins can manage invites' })
    }
  }

  if (disabled === true && !invite.disabledAt) {
    await db.update(householdInvites).set({ status: 'disabled', disabledAt: new Date().toISOString() }).where(eq(householdInvites.id, inviteId))
    await logAudit(c, 'households', invite.householdId, 'INVITE_DISABLED', null, { inviteId })
  } else if (disabled === false && invite.disabledAt) {
    const expired = new Date(invite.expiresAt) < new Date()
    await db.update(householdInvites).set({ disabledAt: null, status: expired ? 'expired' : 'pending' }).where(eq(householdInvites.id, inviteId))
    await logAudit(c, 'households', invite.householdId, 'INVITE_ENABLED', null, { inviteId })
  }

  return c.json({ success: true, inviteId })
})

user.patch('/households/:id', zValidator('json', UpdateHouseholdSchema, (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Household update validation failed:`, result.error.issues);
  }
}), async (c) => {
  const { id } = c.req.param()
  const { name, invitesEnabled } = c.req.valid('json')
  const globalRole = c.get('globalRole') as string
  const userId = c.get('userId') as string
  const db = getDb(c.env)

  if (globalRole !== 'owner') {
     const membership = (await db.select({ role: userHouseholds.role }).from(userHouseholds).where(and(and(eq(userHouseholds.userId, userId), ne(households.status, 'archived')), eq(userHouseholds.householdId, id))).limit(1).then(res => res[0]) as any)
     if (!membership || (membership.role !== 'admin' && membership.role !== 'owner')) {
       throw new HTTPException(403, { message: 'Forbidden: Insufficient permissions to update household' })
     }
  }

  const existing = (await db.select({ name: households.name, invitesEnabled: households.invitesEnabled }).from(households).where(eq(households.id, id)).limit(1).then(res => res[0]) as any)
  if (!existing) throw new HTTPException(404, { message: 'Household not found' })

  const updates: any = {}
  if (name !== undefined) updates.name = name
  if (invitesEnabled !== undefined) updates.invitesEnabled = invitesEnabled

  await db.update(households).set(updates).where(eq(households.id, id))
  await logAudit(c, 'households', id, 'UPDATE', { name: existing.name, invitesEnabled: existing.invitesEnabled }, updates)
  if (invitesEnabled !== undefined && invitesEnabled !== existing.invitesEnabled) {
    await logAudit(c, 'households', id, invitesEnabled ? 'INVITE_ENABLED' : 'INVITE_DISABLED', null, { householdId: id })
  }

  return c.json({ success: true, name: updates.name ?? existing.name, invitesEnabled: updates.invitesEnabled ?? existing.invitesEnabled })
})

// Household Address
user.get('/households/:id/address', async (c) => {
  const { id } = c.req.param()
  const userId = c.get('userId') as string
  const db = getDb(c.env)

  const membership = (await db.select({ role: userHouseholds.role }).from(userHouseholds)
    .where(and(eq(userHouseholds.userId, userId), eq(userHouseholds.householdId, id)))
    .limit(1).then(res => res[0]) as any)
  
  if (!membership) throw new HTTPException(403, { message: 'Forbidden: Not a member of this household' })

  const vault = new VaultService(db, c.env.ENCRYPTION_KEY || c.env.JWT_SECRET)
  
  const visRaw = await vault.getSecret(id, 'HOUSEHOLD_ADDRESS_VISIBILITY', 'household')
  const visibility: AddressVisibility = visRaw ? JSON.parse(visRaw) : DEFAULT_VISIBILITY

  const role = membership.role
  let access = role === 'owner' ? 'read-write' : visibility[role as keyof AddressVisibility] || 'hidden'

  if (access === 'hidden' && role !== 'owner') {
    return c.json({ success: true, data: null, hidden: true, visibility: role === 'owner' ? visibility : undefined })
  }

  const raw = await vault.getSecret(id, 'HOUSEHOLD_ADDRESS', 'household')
  const address = raw ? JSON.parse(raw) : null
  
  return c.json({ success: true, data: address, access, hidden: false, visibility: role === 'owner' ? visibility : undefined })
})

user.put('/households/:id/address', zValidator('json', HouseholdAddressSchema), async (c) => {
  const { id } = c.req.param()
  const userId = c.get('userId') as string
  const body = c.req.valid('json')
  const db = getDb(c.env)

  const membership = (await db.select({ role: userHouseholds.role }).from(userHouseholds)
    .where(and(eq(userHouseholds.userId, userId), eq(userHouseholds.householdId, id)))
    .limit(1).then(res => res[0]) as any)
  
  if (!membership) throw new HTTPException(403, { message: 'Forbidden: Not a member of this household' })

  const vault = new VaultService(db, c.env.ENCRYPTION_KEY || c.env.JWT_SECRET)
  const visRaw = await vault.getSecret(id, 'HOUSEHOLD_ADDRESS_VISIBILITY', 'household')
  const visibility: AddressVisibility = visRaw ? JSON.parse(visRaw) : DEFAULT_VISIBILITY
  
  const role = membership.role
  const access = role === 'owner' ? 'read-write' : visibility[role as keyof AddressVisibility] || 'hidden'

  if (access !== 'read-write') {
    throw new HTTPException(403, { message: 'Forbidden: You do not have permission to edit the address' })
  }

  if (!body || Object.values(body).every(v => v === null || v === '')) {
    await vault.deleteSecret(id, 'HOUSEHOLD_ADDRESS', 'household')
    await logAudit(c, 'households', id, 'REMOVE_ADDRESS', {}, null)
    return c.json({ success: true, data: null })
  }

  const addressData = { ...body, updatedAt: new Date().toISOString() }
  await vault.setSecret(id, 'HOUSEHOLD_ADDRESS', 'household', JSON.stringify(addressData))
  await logAudit(c, 'households', id, 'SET_ADDRESS', {}, addressData)
  
  return c.json({ success: true, data: addressData })
})

user.get('/households/:id/address-visibility', async (c) => {
  const { id } = c.req.param()
  const userId = c.get('userId') as string
  const db = getDb(c.env)

  const membership = (await db.select({ role: userHouseholds.role }).from(userHouseholds)
    .where(and(eq(userHouseholds.userId, userId), eq(userHouseholds.householdId, id)))
    .limit(1).then(res => res[0]) as any)
  
  if (!membership || membership.role !== 'owner') {
    throw new HTTPException(403, { message: 'Forbidden: Only owner can view visibility settings directly' })
  }

  const vault = new VaultService(db, c.env.ENCRYPTION_KEY || c.env.JWT_SECRET)
  const visRaw = await vault.getSecret(id, 'HOUSEHOLD_ADDRESS_VISIBILITY', 'household')
  const visibility: AddressVisibility = visRaw ? JSON.parse(visRaw) : DEFAULT_VISIBILITY

  return c.json({ success: true, data: visibility })
})

user.put('/households/:id/address-visibility', zValidator('json', AddressVisibilitySchema), async (c) => {
  const { id } = c.req.param()
  const userId = c.get('userId') as string
  const body = c.req.valid('json')
  const db = getDb(c.env)

  const membership = (await db.select({ role: userHouseholds.role }).from(userHouseholds)
    .where(and(eq(userHouseholds.userId, userId), eq(userHouseholds.householdId, id)))
    .limit(1).then(res => res[0]) as any)
  
  if (!membership || membership.role !== 'owner') {
    throw new HTTPException(403, { message: 'Forbidden: Only owner can manage visibility' })
  }

  const vault = new VaultService(db, c.env.ENCRYPTION_KEY || c.env.JWT_SECRET)
  await vault.setSecret(id, 'HOUSEHOLD_ADDRESS_VISIBILITY', 'household', JSON.stringify(body))
  await logAudit(c, 'households', id, 'UPDATE_ADDRESS_VISIBILITY', null, body)
  
  return c.json({ success: true, data: body })
})

// Preferences
user.get('/preferences', async (c) => {
  const userId = c.get('userId') as string
  const db = getDb(c.env)
  const results = (await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)) as any)
  return c.json(results.reduce((acc: any, curr: any) => ({ ...acc, [curr.key]: curr.value }), {}))
})

user.patch('/preferences', zValidator('json', z.record(z.string(), z.string()), (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Preferences update validation failed:`, result.error.issues);
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
  const results = (await db.select().from(notificationSettings).where(eq(notificationSettings.userId, userId)) as any)
  return c.json({
    success: true,
    data: results
  })
})

user.patch('/notifications', zValidator('json', z.array(z.object({
  type: z.string(),
  event: z.string(),
  enabled: z.boolean(),
  offsetDays: z.number().optional()
})), (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Notifications update validation failed:`, result.error.issues);
  }
}), async (c) => {
  const userId = c.get('userId') as string
  const settings = c.req.valid('json')
  const db = getDb(c.env)

  for (const s of settings) {
    await db.insert(notificationSettings)
      .values({ userId, type: s.type, event: s.event, enabled: s.enabled, offsetDays: s.offsetDays || 3 })
      .onConflictDoUpdate({
         target: [notificationSettings.userId, notificationSettings.type, notificationSettings.event],
         set: { enabled: s.enabled, offsetDays: s.offsetDays || 3 }
      });
  }
  return c.json({ success: true })
})

// Payment Methods
user.get('/payment-methods', async (c) => {
  const userId = c.get('userId') as string
  const db = getDb(c.env)
  // Assuming isActive exists via migrations or implicit, skipping if schema didn't include it. 
  const results = (await db.select().from(userPaymentMethods).where(eq(userPaymentMethods.userId, userId)).orderBy(asc(userPaymentMethods.name)) as any)
  return c.json({ success: true, data: results || [] })
})

user.post('/payment-methods', zValidator('json', UserPaymentMethodSchema, (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Payment method creation validation failed:`, result.error.issues);
  }
}), async (c) => {
  const userId = c.get('userId') as string
  const householdId = c.get('householdId') || null
  const data = (c.req.valid('json') as any)
  const id = crypto.randomUUID()
  const db = getDb(c.env)
  
  await db.insert(userPaymentMethods).values({
    id,
    userId,
    householdId,
    name: data.name,
    type: data.type,
    lastFour: data.lastFour || null,
    brandingUrl: data.brandingUrl || null,
    status: 'active'
  })
  
  await logAudit(c, 'user_payment_methods', id, 'CREATE', null, { name: data.name, type: data.type })
  return c.json({ success: true, id })
})

user.patch('/payment-methods/:id', zValidator('json', UserPaymentMethodSchema.partial(), (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Payment method update validation failed:`, result.error.issues);
  }
}), async (c) => {
  const userId = c.get('userId') as string
  const id = c.req.param('id')
  const data = (c.req.valid('json') as any)
  const db = getDb(c.env)
  
  const updates: any = {}
  if (data.name !== undefined) updates.name = data.name
  if (data.type !== undefined) updates.type = data.type
  if (data.lastFour !== undefined) updates.lastFour = data.lastFour
  if (data.brandingUrl !== undefined) updates.brandingUrl = data.brandingUrl
  
  if (Object.keys(updates).length > 0) {
    await db.update(userPaymentMethods).set(updates).where(and(eq(userPaymentMethods.id, id), eq(userPaymentMethods.userId, userId)))
    await logAudit(c, 'user_payment_methods', id, 'UPDATE', null, data)
  }
  return c.json({ success: true })
})

user.delete('/payment-methods/:id', async (c) => {
  const userId = c.get('userId') as string
  const id = c.req.param('id')
  const db = getDb(c.env)
  await db.delete(userPaymentMethods).where(and(eq(userPaymentMethods.id, id), eq(userPaymentMethods.userId, userId)))
  await logAudit(c, 'user_payment_methods', id, 'DELETE')
  return c.json({ success: true })
})

// Linked Providers & Accounts
user.get('/service-providers', async (c) => {
  const db = getDb(c.env)
  const results = (await db.select().from(serviceProviders) as any)
  return c.json({ success: true, data: results || [] })
})

user.post('/service-providers', zValidator('json', z.object({
  name: z.string().min(1),
  visibility: z.enum(['private', 'household', 'public']).optional(),
  defaultCategoryId: z.string().nullable().optional(),
  defaultDueDate: z.string().nullable().optional(),
  iconUrl: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  status: z.enum(['active', 'inactive']).optional(),
})), async (c) => {
  const userId = c.get('userId') as string
  const householdId = c.get('householdId') || null
  const { name, visibility, defaultCategoryId, defaultDueDate, iconUrl } = c.req.valid('json')
  const id = crypto.randomUUID()
  const db = getDb(c.env)
  
  let targetVisibility = visibility || 'household'
  if (targetVisibility === 'household' && householdId) {
    const membership = await db.select({ role: userHouseholds.role })
      .from(userHouseholds)
      .where(and(eq(userHouseholds.userId, userId), eq(userHouseholds.householdId, householdId)))
      .limit(1)
      .then(res => res[0]) as any;
    if (!membership || membership.role === 'viewer') {
      targetVisibility = 'private'
    }
  } else if (targetVisibility === 'household' && !householdId) {
    targetVisibility = 'private'
  }

  await db.insert(serviceProviders).values({
    id,
    name,
    visibility: targetVisibility,
    householdId: targetVisibility === 'household' ? householdId : null,
    createdBy: userId,
    defaultCategoryId: defaultCategoryId || null,
    defaultDueDate: defaultDueDate || null,
    iconUrl: iconUrl || null,
    status: 'active'
  })
  
  await logAudit(c, 'service_providers', id, 'CREATE', null, { name, visibility: targetVisibility })
  return c.json({ success: true, id })
})

user.patch('/service-providers/:id', zValidator('json', z.object({
  name: z.string().optional(),
  visibility: z.enum(['private', 'household', 'public']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  billingProcessorId: z.string().nullable().optional(),
  billerId: z.string().nullable().optional(),
  defaultCategoryId: z.string().nullable().optional(),
  defaultDueDate: z.string().nullable().optional(),
  iconUrl: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
})), async (c) => {
  const userId = c.get('userId') as string
  const householdId = c.get('householdId') || null
  const id = c.req.param('id')
  const updates = c.req.valid('json')
  const db = getDb(c.env)

  const provider = await db.select().from(serviceProviders).where(eq(serviceProviders.id, id)).limit(1).then(res => res[0]) as any
  if (!provider) {
    throw new HTTPException(404, { message: 'Provider not found' })
  }

  if (provider.visibility === 'public') {
    throw new HTTPException(403, { message: 'Cannot modify platform public registry' })
  }

  if (provider.visibility === 'private' && provider.createdBy !== userId) {
    throw new HTTPException(403, { message: 'Access denied' })
  }

  if (provider.visibility === 'household') {
    const membership = await db.select({ role: userHouseholds.role })
      .from(userHouseholds)
      .where(and(eq(userHouseholds.userId, userId), eq(userHouseholds.householdId, provider.householdId)))
      .limit(1)
      .then(res => res[0]) as any;
    if (!membership || membership.role === 'viewer') {
      throw new HTTPException(403, { message: 'Access denied: Household view-only' })
    }
  }

  const valuesToSet: any = {}
  if (updates.name !== undefined) valuesToSet.name = updates.name
  if (updates.visibility !== undefined) {
    let targetVisibility = updates.visibility
    if (targetVisibility === 'household' && householdId) {
      const membership = await db.select({ role: userHouseholds.role })
        .from(userHouseholds)
        .where(and(eq(userHouseholds.userId, userId), eq(userHouseholds.householdId, householdId)))
        .limit(1)
        .then(res => res[0]) as any;
      if (!membership || membership.role === 'viewer') {
        targetVisibility = 'private'
      }
    } else if (targetVisibility === 'household' && !householdId) {
      targetVisibility = 'private'
    }
    valuesToSet.visibility = targetVisibility
    valuesToSet.householdId = targetVisibility === 'household' ? householdId : null
  }
  if (updates.defaultCategoryId !== undefined) valuesToSet.defaultCategoryId = updates.defaultCategoryId
  if (updates.defaultDueDate !== undefined) valuesToSet.defaultDueDate = updates.defaultDueDate
  if (updates.iconUrl !== undefined) valuesToSet.iconUrl = updates.iconUrl
  if (updates.website !== undefined) valuesToSet.website = updates.website
  if (updates.status !== undefined) valuesToSet.status = updates.status
  if (updates.billingProcessorId !== undefined) valuesToSet.billingProcessorId = updates.billingProcessorId
  if (updates.billerId !== undefined) valuesToSet.billerId = updates.billerId

  await db.update(serviceProviders).set(valuesToSet).where(eq(serviceProviders.id, id))
  await logAudit(c, 'service_providers', id, 'UPDATE', null, valuesToSet)
  return c.json({ success: true })
})

user.delete('/service-providers/:id', async (c) => {
  const userId = c.get('userId') as string
  const householdId = c.get('householdId') || null
  const id = c.req.param('id')
  const db = getDb(c.env)

  const provider = await db.select().from(serviceProviders).where(eq(serviceProviders.id, id)).limit(1).then(res => res[0]) as any
  if (!provider) {
    throw new HTTPException(404, { message: 'Provider not found' })
  }

  if (provider.visibility === 'public') {
    throw new HTTPException(403, { message: 'Cannot modify platform public registry' })
  }

  if (provider.visibility === 'private' && provider.createdBy !== userId) {
    throw new HTTPException(403, { message: 'Access denied' })
  }

  if (provider.visibility === 'household') {
    const membership = await db.select({ role: userHouseholds.role })
      .from(userHouseholds)
      .where(and(eq(userHouseholds.userId, userId), eq(userHouseholds.householdId, provider.householdId)))
      .limit(1)
      .then(res => res[0]) as any;
    if (!membership || membership.role === 'viewer') {
      throw new HTTPException(403, { message: 'Access denied: Household view-only' })
    }
  }

  await db.delete(serviceProviders).where(eq(serviceProviders.id, id))
  await logAudit(c, 'service_providers', id, 'DELETE', provider, null)
  return c.json({ success: true })
})

user.get('/identities', async (c) => {
  const userId = c.get('userId') as string
  const db = getDb(c.env)
  const results = (await db.select({
      id: userIdentities.id,
      provider: userIdentities.provider,
      providerUserId: userIdentities.providerUserId,
      email: userIdentities.email,
      name: userIdentities.name,
      avatarUrl: userIdentities.avatarUrl,
      createdAt: userIdentities.createdAt
    }).from(userIdentities).where(eq(userIdentities.userId, userId)) as any)
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
  await logAudit(c, 'userIdentities', id, 'DELETE')
  return c.json({ success: true })
})

user.get('/providers', async (c) => {
  const db = getDb(c.env)
  const userId = c.get('userId') as string
  
  const results = (await db.select({
      id: linkedProviders.id,
      userId: linkedProviders.userId,
      serviceProviderId: linkedProviders.serviceProviderId,
      accountReference: linkedProviders.accountReference,
      customLabel: linkedProviders.customLabel,
      metadata: linkedProviders.metadata,
      createdAt: linkedProviders.createdAt,
      provider_name: serviceProviders.name,
      icon_url: serviceProviders.iconUrl
    })
    .from(linkedProviders)
    .innerJoin(serviceProviders, eq(linkedProviders.serviceProviderId, serviceProviders.id))
    .where(eq(linkedProviders.userId, userId)) as any)

  return c.json({
    success: true,
    data: results
  })
})

user.post('/providers/link', zValidator('json', z.object({
  serviceProviderId: z.string(),
  accountReference: z.string().optional(),
  customLabel: z.string().optional(),
  metadata: z.string().optional()
}), (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Provider link validation failed:`, result.error.issues);
  }
}), async (c) => {
  const userId = c.get('userId') as string
  const { serviceProviderId, accountReference, customLabel, metadata } = c.req.valid('json')
  const id = crypto.randomUUID()
  const db = getDb(c.env)
  await db.insert(linkedProviders).values({
    id, userId, serviceProviderId: serviceProviderId, accountReference: accountReference, customLabel: customLabel, metadata
  })
  return c.json({ success: true, id })
})

user.get('/linked-accounts', async (c) => {
  const userId = c.get('userId') as string
  const db = getDb(c.env)

  const results = (await db.select({
      id: userLinkedAccounts.id,
      userId: userLinkedAccounts.userId,
      householdId: userLinkedAccounts.householdId,
      providerId: userLinkedAccounts.providerId,
      paymentMethodId: userLinkedAccounts.paymentMethodId,
      emailAttached: userLinkedAccounts.emailAttached,
      membershipStartDate: userLinkedAccounts.membershipStartDate,
      membershipEndDate: userLinkedAccounts.membershipEndDate,
      subscriptionId: userLinkedAccounts.subscriptionId,
      notes: userLinkedAccounts.notes,
      status: userLinkedAccounts.status,
      providerName: serviceProviders.name,
      providerBranding: serviceProviders.visibility,
      paymentMethodName: sql<string>`'N/A'`
    })
    .from(userLinkedAccounts)
    .innerJoin(serviceProviders, eq(userLinkedAccounts.providerId, serviceProviders.id))
    .where(eq(userLinkedAccounts.userId, userId))
    .orderBy(asc(serviceProviders.name)) as any)

  return c.json({
    success: true,
    data: results
  })
})

user.post('/linked-accounts', zValidator('json', UserLinkedAccountSchema, (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Linked account creation validation failed:`, result.error.issues);
  }
}), async (c) => {
  const userId = c.get('userId') as string
  const householdId = c.get('householdId') as string
  const data = (c.req.valid('json') as any)
  const id = crypto.randomUUID()
  const db = getDb(c.env)
  
  await db.insert(userLinkedAccounts).values({
    id,
    userId,
    householdId,
    providerId: data.providerId,
    paymentMethodId: data.paymentMethodId || null,
    emailAttached: data.emailAttached || null,
    membershipStartDate: data.membershipStartDate || null,
    membershipEndDate: data.membershipEndDate || null,
    subscriptionId: data.subscriptionId || null,
    notes: data.notes || null,
    status: data.status || 'active'
  })
  
  if (data.subscriptionId) {
    await db.update(subscriptions).set({ accountId: id }).where(and(eq(subscriptions.id, data.subscriptionId), eq(subscriptions.householdId, householdId)))
  }

  return c.json({ success: true, id })
})

user.patch('/linked-accounts/:id', zValidator('json', UserLinkedAccountSchema.partial(), (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Linked account update validation failed:`, result.error.issues);
  }
}), async (c) => {
  const userId = c.get('userId') as string
  const id = c.req.param('id')
  const data = (c.req.valid('json') as any)
  const db = getDb(c.env)
  
  const updates: any = {}
  if (data.emailAttached !== undefined) updates.emailAttached = data.emailAttached
  if (data.notes !== undefined) updates.notes = data.notes
  if (data.status !== undefined) updates.status = data.status
  if (data.membershipStartDate !== undefined) updates.membershipStartDate = data.membershipStartDate
  if (data.membershipEndDate !== undefined) updates.membershipEndDate = data.membershipEndDate
  if (data.paymentMethodId !== undefined) updates.paymentMethodId = data.paymentMethodId
  
  if (Object.keys(updates).length > 0) {
    await db.update(userLinkedAccounts).set(updates).where(and(eq(userLinkedAccounts.id, id), eq(userLinkedAccounts.userId, userId)))
    await logAudit(c, 'linked_accounts', id, 'UPDATE', null, data)
  }
  return c.json({ success: true })
})

user.delete('/linked-accounts/:id', async (c) => {
  const userId = c.get('userId') as string
  const id = c.req.param('id')
  const db = getDb(c.env)
  await db.delete(linkedProviders).where(and(eq(linkedProviders.id, id), eq(linkedProviders.userId, userId)))
  await logAudit(c, 'linked_accounts', id, 'DELETE')
  return c.json({ success: true })
})

// Passkeys Management
user.get('/passkeys', async (c) => {
  const userId = c.get('userId') as string
  const db = getDb(c.env)
  const results = (await db.select({
      id: passkeys.id,
      name: passkeys.name,
      aaguid: passkeys.aaguid,
      createdAt: passkeys.createdAt
    }).from(passkeys).where(eq(passkeys.userId, userId)) as any)
  return c.json({
    success: true,
    data: results
  })
})

export default user

// Announcements & Social Broadcasts
user.get('/announcements', async (c) => {
  const db = getDb(c.env)
  const results = (await db.select().from(systemAnnouncements).orderBy(desc(systemAnnouncements.createdAt)) as any)
  return c.json({ success: true, data: results || [] })
})

// Household-Level Audit Activity
user.get('/audit', async (c) => {
  const householdId = c.get('householdId')
  if (!householdId) return c.json({ success: true, data: [] })

  const db = getDb(c.env)
  
  const uActor = alias(users, 'u_actor')
  const uTarget = alias(users, 'u_target')

  const results = (await db.select({
      id: auditLogs.id,
      action: auditLogs.action,
      target_type: auditLogs.targetType,
      target_id: auditLogs.targetId,
      details_json: auditLogs.detailsJson,
      created_at: auditLogs.createdAt,
      actor_name: uActor.displayName,
      target_name: uTarget.displayName
    })
    .from(auditLogs)
    .leftJoin(uActor, eq(auditLogs.actorId, uActor.id))
    .leftJoin(uTarget, and(
      eq(auditLogs.targetId, uTarget.id),
      eq(auditLogs.targetType, 'users')
    ))
    .where(eq(auditLogs.householdId, householdId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(100) as any)
  
  return c.json({ success: true, data: results || [] })
})

// Sessions
user.get('/sessions', async (c) => {
  const userId = c.get('userId') as string
  const db = getDb(c.env)
  const results = (await db.select().from(sessions).where(eq(sessions.userId, userId)).orderBy(desc(sessions.lastActiveAt)) as any)
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

// Bulk revoke all other sessions except the current one
user.delete('/sessions', async (c) => {
  const userId = c.get('userId') as string
  const sessionId = c.get('sessionId') as string
  const db = getDb(c.env)
  
  const result = (await db.delete(sessions).where(
      and(
        eq(sessions.userId, userId),
        sessionId ? ne(sessions.id, sessionId) : undefined
      )
    ) as any)
  
  await logAudit(c, 'sessions', 'bulk', 'REVOKE_ALL_OTHERS', null, { keptSession: sessionId })
  return c.json({ success: true })
})



// Phase 3: Household Management Expansions

user.get('/households/:id/members', async (c) => {
  const userId = c.get('userId') as string
  const id = c.req.param('id')
  const db = getDb(c.env)
  
  // Verify membership
  const membership = (await db.select().from(userHouseholds).where(and(eq(userHouseholds.userId, userId), eq(userHouseholds.householdId, id))).limit(1).then(res => res[0]) as any)
  if (!membership) return c.json({ error: 'Forbidden' }, 403)
    
  const members = (await db.select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      role: userHouseholds.role,
      joinedAt: userHouseholds.joinedAt,
      joinMethod: userHouseholds.joinMethod
    }).from(users).innerJoin(userHouseholds, eq(users.id, userHouseholds.userId)).where(eq(userHouseholds.householdId, id)) as any)
  
  return c.json({
    success: true,
    data: members
  })
})

user.get('/households/:id/invites', async (c) => {
  const userId = c.get('userId') as string
  const id = c.req.param('id')
  const globalRole = c.get('globalRole') as string
  const db = getDb(c.env)

  if (globalRole !== 'owner') {
    const membership = (await db.select().from(userHouseholds).where(and(eq(userHouseholds.userId, userId), eq(userHouseholds.householdId, id))).limit(1).then(res => res[0]) as any)
    if (!membership || (membership.role !== 'admin' && membership.role !== 'owner')) return c.json({ error: 'Forbidden' }, 403)
  }

  const results = (await db.select().from(householdInvites).where(eq(householdInvites.householdId, id)).orderBy(desc(householdInvites.createdAt)) as any)
  return c.json({
    success: true,
    data: results
  })
})

user.delete('/households/:id/invites/:inviteId', async (c) => {
  const userId = c.get('userId') as string
  const { id, inviteId } = c.req.param()
  const db = getDb(c.env)
  
  const membership = (await db.select().from(userHouseholds).where(and(eq(userHouseholds.userId, userId), eq(userHouseholds.householdId, id))).limit(1).then(res => res[0]) as any)
  if (!membership || (membership.role !== 'admin' && membership.role !== 'owner')) return c.json({ error: 'Forbidden' }, 403)
    
  await db.delete(householdInvites).where(eq(householdInvites.id, inviteId))
  await logAudit(c, 'households', id, 'INVITE_REVOKED', null, { inviteId })
  return c.json({ success: true })
})

user.patch('/households/:id/members/:memberId', zValidator('json', z.object({ role: z.enum(['observer', 'member', 'admin', 'owner']) }), (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Member role update validation failed:`, result.error.issues);
  }
}), async (c) => {
  const userId = c.get('userId') as string
  const { id, memberId } = c.req.param()
  const { role } = c.req.valid('json')
  const db = getDb(c.env)
  
  const membership = (await db.select().from(userHouseholds).where(and(eq(userHouseholds.userId, userId), eq(userHouseholds.householdId, id))).limit(1).then(res => res[0]) as any)
  if (!membership || (membership.role !== 'admin' && membership.role !== 'owner')) return c.json({ error: 'Forbidden' }, 403)
    
  await db.update(userHouseholds).set({ role }).where(and(eq(userHouseholds.userId, memberId), eq(userHouseholds.householdId, id)))
  await logAudit(c, 'households', id, 'MEMBER_ROLE_UPDATED', null, { memberId, role })
  return c.json({ success: true })
})

user.delete('/households/:id/members/:memberId', zValidator('json', z.object({ transferToUserId: z.string().optional() }).optional(), (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Member ejection validation failed:`, result.error.issues);
  }
}), async (c) => {
  const userId = c.get('userId') as string
  const { id, memberId } = c.req.param()
  const db = getDb(c.env)
  
  // You can kick yourself (leave) or admins/owners can kick others
  if (userId !== memberId) {
    const membership = (await db.select().from(userHouseholds).where(and(eq(userHouseholds.userId, userId), eq(userHouseholds.householdId, id))).limit(1).then(res => res[0]) as any)
    if (!membership || (membership.role !== 'admin' && membership.role !== 'owner')) return c.json({ error: 'Forbidden' }, 403)
  }
  
  // Ghost-Bill check
  const orphanedBills = (await db.select().from(subscriptions).where(and(eq(subscriptions.householdId, id), eq(subscriptions.ownerId, memberId))).limit(1).then(res => res[0]) as any)
  
  if (orphanedBills) {
    const data = (c.req.valid('json') as any)
    if (!data?.transferToUserId) {
       return c.json({ error: 'Ghost-Bill Lock: User owns active bills.', requiresTransfer: true }, 400)
    } else {
       await db.update(subscriptions).set({ ownerId: data.transferToUserId }).where(and(eq(subscriptions.householdId, id), eq(subscriptions.ownerId, memberId)))
       await logAudit(c, 'households', id, 'OWNERSHIP_TRANSFERRED', null, { from: memberId, to: data.transferToUserId, type: 'subscriptions_batch' })
    }
  }

  await db.delete(userHouseholds).where(and(eq(userHouseholds.userId, memberId), eq(userHouseholds.householdId, id)))
  await logAudit(c, 'households', id, 'MEMBER_EJECTED', null, { memberId })
  return c.json({ success: true })
})

user.delete('/households/:id', async (c) => {
  const userId = c.get('userId') as string
  const id = c.req.param('id') as string
  const db = getDb(c.env)
  
  const membership = (await db.select().from(userHouseholds).where(and(eq(userHouseholds.userId, userId), eq(userHouseholds.householdId, id))).limit(1).then(res => res[0]) as any)
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
    console.error(`[DIAGNOSTIC_FAILURE] Household transfer validation failed:`, result.error.issues);
  }
}), async (c) => {
  const userId = c.get('userId') as string
  const id = c.req.param('id')
  const { newOwnerId } = c.req.valid('json')
  const db = getDb(c.env)
  
  const membership = (await db.select().from(userHouseholds).where(and(eq(userHouseholds.userId, userId), eq(userHouseholds.householdId, id))).limit(1).then(res => res[0]) as any)
  if (!membership || membership.role !== 'owner') return c.json({ error: 'Only the current owner can transfer household ownership' }, 403)
    
  // Validate target is a member
  const targetMember = (await db.select().from(userHouseholds).where(and(eq(userHouseholds.userId, newOwnerId), eq(userHouseholds.householdId, id))).limit(1).then(res => res[0]) as any)
  if (!targetMember) return c.json({ error: 'Target user is not a member of this household' }, 400)
    
  // Transaction equivalent
  await db.update(userHouseholds).set({ role: 'owner' }).where(and(eq(userHouseholds.userId, newOwnerId), eq(userHouseholds.householdId, id)))
  await db.update(userHouseholds).set({ role: 'admin' }).where(and(eq(userHouseholds.userId, userId), eq(userHouseholds.householdId, id)))
  
  await logAudit(c, 'households', id, 'OWNERSHIP_TRANSFERRED', null, { from: userId, to: newOwnerId, context: 'household_core' })
  return c.json({ success: true })
})

user.patch('/providers/:id/transfer', zValidator('json', z.object({ newOwnerId: z.string() }), (result, c) => {
  if (!result.success) {
    console.error(`[DIAGNOSTIC_FAILURE] Provider transfer validation failed:`, result.error.issues);
  }
}), async (c) => {
  const userId = c.get('userId') as string
  const id = c.req.param('id')
  const { newOwnerId } = c.req.valid('json')
  const db = getDb(c.env)
  
  const provider = (await db.select().from(serviceProviders).where(eq(serviceProviders.id, id)).limit(1).then(res => res[0]) as any)
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
