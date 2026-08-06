import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { Bindings, Variables } from '../../types'
import { getDb } from '#/index'
import {
  households, userHouseholds, users, transactions, bills, subscriptions,
  transactionPairingRules, paySchedules, payExceptions, userPaymentMethods,
  userLinkedAccounts, externalContacts, reminders, reminders_v2, personalLoans,
  liabilitySplits, sharedBalances, activityLogs,
} from '#/schema'
import { eq, and, desc, count, sql, inArray, or } from 'drizzle-orm'
import { logAudit } from '../../utils'
import { HTTPException } from 'hono/http-exception'

const auditMeta = (c: any) => ({
  ipAddress: c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || '0.0.0.0',
  userAgent: c.req.header('user-agent') || 'Unknown-UA',
  cfRay: c.req.header('cf-ray') || 'Unknown-Ray',
})

const householdAdmin = new Hono<{ Bindings: Bindings, Variables: Variables }>()

householdAdmin.get('/', async (c) => {
  const db = getDb(c.env)
  // Get households with member counts
  const results = (await db.select({
      id: households.id,
      name: households.name,
      currency: households.currency,
      createdAt: households.createdAt,
      memberCount: sql<number>`(SELECT COUNT(*) FROM userHouseholds WHERE householdId = ${households.id})`
    }).from(households).orderBy(desc(households.createdAt)) as any)
  
  return c.json({ success: true, data: results || [] })
})

householdAdmin.patch('/:id', zValidator('json', z.object({
  name: z.string().min(1).optional(),
  currency: z.string().length(3).optional()
})), async (c) => {
  const id = c.req.param('id')
  const data = (c.req.valid('json') as any)
  const db = getDb(c.env)
  
  const old = (await db.select().from(households).where(eq(households.id, id)).limit(1).then(res => res[0]) as any)
  if (!old) throw new HTTPException(404, { message: 'Household not found' })

  await db.update(households).set({ ...data, updatedAt: sql`CURRENT_TIMESTAMP` }).where(eq(households.id, id))
  await logAudit(c, 'households', id, 'ADMIN_UPDATE', old, data, {}, true)
  
  return c.json({ success: true })
})

householdAdmin.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const db = getDb(c.env)
  
  const old = (await db.select().from(households).where(eq(households.id, id)).limit(1).then(res => res[0]) as any)
  if (!old) throw new HTTPException(404, { message: 'Household not found' })

  // Cascade delete or restrict?
  // Let's perform a clean delete of memberships too
  await db.delete(userHouseholds).where(eq(userHouseholds.householdId, id))
  await db.delete(households).where(eq(households.id, id))
  
  await logAudit(c, 'households', id, 'ADMIN_DELETE', old, null, {}, true)
  
  return c.json({ success: true })
})

householdAdmin.get('/:id/members', async (c) => {
  const id = c.req.param('id')
  const db = getDb(c.env)

  const household = (await db.select({ id: households.id }).from(households).where(eq(households.id, id)).limit(1).then(res => res[0]) as any)
  if (!household) throw new HTTPException(404, { message: 'Household not found' })

  const members = (await db.select({
      userId: users.id,
      email: users.email,
      displayName: users.displayName,
      username: users.username,
      role: userHouseholds.role,
      status: users.status
    })
    .from(userHouseholds)
    .innerJoin(users, eq(users.id, userHouseholds.userId))
    .where(eq(userHouseholds.householdId, id))
    .orderBy(desc(users.createdAt)) as any)

  return c.json({ success: true, data: members || [] })
})

const MoveMemberSchema = z.object({
  memberId: z.string(),
  destinationHouseholdId: z.string(),
  options: z.object({
    membership: z.boolean().default(true),
    paymentMethods: z.boolean().default(true),
    transactions: z.boolean().default(true),
    bills: z.boolean().default(true),
    subscriptions: z.boolean().default(true),
    pairingRules: z.boolean().default(true),
    paySchedules: z.boolean().default(true),
    externalContacts: z.boolean().default(true),
    reminders: z.boolean().default(true),
    loans: z.boolean().default(true),
    liabilitySplits: z.boolean().default(true),
    sharedBalances: z.boolean().default(true),
  })
})

householdAdmin.post('/:id/move-member', zValidator('json', MoveMemberSchema), async (c) => {
  const sourceHouseholdId = c.req.param('id')
  const { memberId, destinationHouseholdId, options } = c.req.valid('json')
  const db = getDb(c.env)

  if (sourceHouseholdId === destinationHouseholdId) {
    throw new HTTPException(400, { message: 'Source and destination households must differ' })
  }

  // Validate destination household exists
  const dest = (await db.select({ id: households.id }).from(households).where(eq(households.id, destinationHouseholdId)).limit(1).then(res => res[0]) as any)
  if (!dest) throw new HTTPException(404, { message: 'Destination household not found' })

  // Validate member belongs to source household
  const membership = (await db.select({ role: userHouseholds.role }).from(userHouseholds)
    .where(and(eq(userHouseholds.userId, memberId), eq(userHouseholds.householdId, sourceHouseholdId)))
    .limit(1).then(res => res[0]) as any)
  if (!membership) throw new HTTPException(404, { message: 'Member is not part of this household' })

  const member = (await db.select({ id: users.id }).from(users).where(eq(users.id, memberId)).limit(1).then(res => res[0]) as any)
  if (!member) throw new HTTPException(404, { message: 'User not found' })

  // Ensure we don't orphan the source household (at least one owner must remain)
  if (options.membership && membership.role === 'owner') {
    const ownerCount = (await db.select({ count: count() }).from(userHouseholds)
      .where(and(eq(userHouseholds.householdId, sourceHouseholdId), eq(userHouseholds.role, 'owner')))
      .then(res => res[0].count) as any)
    if (Number(ownerCount) <= 1) {
      throw new HTTPException(400, { message: 'Cannot move the last owner of the source household' })
    }
  }

  const counts: Record<string, number> = {}

  await db.transaction(async (tx) => {
    if (options.membership) {
      await tx.delete(userHouseholds).where(and(eq(userHouseholds.userId, memberId), eq(userHouseholds.householdId, sourceHouseholdId)))
      await tx.insert(userHouseholds).values({ userId: memberId, householdId: destinationHouseholdId, role: membership.role === 'owner' ? 'member' : membership.role, joinMethod: 'system' })
      counts.membership = 1
    }

    if (options.paymentMethods) {
      const pm = await tx.update(userPaymentMethods).set({ householdId: destinationHouseholdId })
        .where(and(eq(userPaymentMethods.userId, memberId), eq(userPaymentMethods.householdId, sourceHouseholdId)))
      const la = await tx.update(userLinkedAccounts).set({ householdId: destinationHouseholdId })
        .where(and(eq(userLinkedAccounts.userId, memberId), eq(userLinkedAccounts.householdId, sourceHouseholdId)))
      counts.paymentMethods = Number(pm.rowCount || 0) + Number(la.rowCount || 0)
    }

    if (options.transactions) {
      const r = await tx.update(transactions).set({ householdId: destinationHouseholdId })
        .where(and(eq(transactions.ownerId, memberId), eq(transactions.householdId, sourceHouseholdId)))
      counts.transactions = Number(r.rowCount || 0)
    }

    if (options.bills) {
      const r = await tx.update(bills).set({ householdId: destinationHouseholdId })
        .where(and(eq(bills.ownerId, memberId), eq(bills.householdId, sourceHouseholdId)))
      counts.bills = Number(r.rowCount || 0)
    }

    if (options.subscriptions) {
      const r = await tx.update(subscriptions).set({ householdId: destinationHouseholdId })
        .where(and(eq(subscriptions.ownerId, memberId), eq(subscriptions.householdId, sourceHouseholdId)))
      counts.subscriptions = Number(r.rowCount || 0)
    }

    if (options.pairingRules) {
      const r = await tx.update(transactionPairingRules).set({ householdId: destinationHouseholdId })
        .where(and(eq(transactionPairingRules.ownerId, memberId), eq(transactionPairingRules.householdId, sourceHouseholdId)))
      counts.pairingRules = Number(r.rowCount || 0)
    }

    if (options.paySchedules) {
      const schedules = (await tx.select({ id: paySchedules.id }).from(paySchedules)
        .where(and(eq(paySchedules.userId, memberId), eq(paySchedules.householdId, sourceHouseholdId)))) as any
      const scheduleIds = schedules.map((s: any) => s.id)
      const r = await tx.update(paySchedules).set({ householdId: destinationHouseholdId })
        .where(and(eq(paySchedules.userId, memberId), eq(paySchedules.householdId, sourceHouseholdId)))
      let exceptions = 0
      if (scheduleIds.length > 0) {
        const ex = await tx.update(payExceptions).set({ householdId: destinationHouseholdId })
          .where(inArray(payExceptions.payScheduleId, scheduleIds))
        exceptions = Number(ex.rowCount || 0)
      }
      counts.paySchedules = Number(r.rowCount || 0) + exceptions
    }

    if (options.externalContacts) {
      const r = await tx.update(externalContacts).set({ householdId: destinationHouseholdId })
        .where(and(eq(externalContacts.createdBy, memberId), eq(externalContacts.householdId, sourceHouseholdId)))
      counts.externalContacts = Number(r.rowCount || 0)
    }

    if (options.reminders) {
      const legacy = await tx.update(reminders).set({ householdId: destinationHouseholdId })
        .where(and(eq(reminders.userId, memberId), eq(reminders.householdId, sourceHouseholdId)))
      const v2 = await tx.update(reminders_v2).set({ householdId: destinationHouseholdId })
        .where(and(eq(reminders_v2.ownerId, memberId), eq(reminders_v2.householdId, sourceHouseholdId)))
      counts.reminders = Number(legacy.rowCount || 0) + Number(v2.rowCount || 0)
    }

    if (options.loans) {
      const r = await tx.update(personalLoans).set({ householdId: destinationHouseholdId })
        .where(and(eq(personalLoans.lenderUserId, memberId), eq(personalLoans.householdId, sourceHouseholdId)))
      counts.loans = Number(r.rowCount || 0)
    }

    if (options.liabilitySplits) {
      const r = await tx.update(liabilitySplits).set({ householdId: destinationHouseholdId })
        .where(and(
          eq(liabilitySplits.householdId, sourceHouseholdId),
          or(eq(liabilitySplits.originatorUserId, memberId), eq(liabilitySplits.assignedUserId, memberId))
        ))
      counts.liabilitySplits = Number(r.rowCount || 0)
    }

    if (options.sharedBalances) {
      const r = await tx.update(sharedBalances).set({ householdId: destinationHouseholdId })
        .where(and(
          eq(sharedBalances.householdId, sourceHouseholdId),
          or(eq(sharedBalances.fromUserId, memberId), eq(sharedBalances.toUserId, memberId))
        ))
      counts.sharedBalances = Number(r.rowCount || 0)
    }
  })

  const meta = auditMeta(c)
  const adminActorId = c.get('userId') as string

  // Admin audit record (action performed by the owner)
  await logAudit(c, 'households', sourceHouseholdId, 'ADMIN_MOVE_MEMBER',
    { memberId, sourceHouseholdId }, { memberId, destinationHouseholdId, counts }, {}, true)

  // Member history entry: visible on the moved user's admin profile + activity feed
  await db.insert(activityLogs).values({
    householdId: destinationHouseholdId,
    actorId: memberId,
    actorType: 'USER',
    action: 'DATA_MIGRATED',
    severity: 'INFO',
    targetType: 'households',
    targetId: destinationHouseholdId,
    detailsJson: JSON.stringify({ sourceHouseholdId, destinationHouseholdId, moved: counts, performedBy: adminActorId }),
    oldValuesJson: JSON.stringify({ sourceHouseholdId }),
    newValuesJson: JSON.stringify({ destinationHouseholdId }),
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    cfRay: meta.cfRay,
  })

  // Source household feed entry: visible in the source household audit history
  await db.insert(activityLogs).values({
    householdId: sourceHouseholdId,
    actorId: memberId,
    actorType: 'USER',
    action: 'DATA_MIGRATED_OUT',
    severity: 'INFO',
    targetType: 'households',
    targetId: sourceHouseholdId,
    detailsJson: JSON.stringify({ destinationHouseholdId, moved: counts, performedBy: adminActorId }),
    oldValuesJson: JSON.stringify({ memberId }),
    newValuesJson: JSON.stringify({ destinationHouseholdId }),
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    cfRay: meta.cfRay,
  })

  // Destination household feed entry: visible in the destination household audit history
  await db.insert(activityLogs).values({
    householdId: destinationHouseholdId,
    actorId: memberId,
    actorType: 'USER',
    action: 'DATA_MIGRATED_IN',
    severity: 'INFO',
    targetType: 'households',
    targetId: destinationHouseholdId,
    detailsJson: JSON.stringify({ sourceHouseholdId, moved: counts, performedBy: adminActorId }),
    oldValuesJson: JSON.stringify({ sourceHouseholdId }),
    newValuesJson: JSON.stringify({ memberId }),
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    cfRay: meta.cfRay,
  })

  return c.json({ success: true, moved: counts })
})

export default householdAdmin