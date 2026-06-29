import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { HTTPException } from 'hono/http-exception'
import { parseISO, format, addDays, addMonths, isBefore, isAfter, setDate, getDaysInMonth } from 'date-fns'
import { Bindings, Variables } from '../types'
import { 
  SubscriptionSchema, 
  InstallmentPlanSchema, 
  LoanSchema, 
  OwnershipTransferSchema,
  PayScheduleSchema,
  BillSchema,
  LiabilitySplitSchema,
  PayExceptionSchema
} from '@shared/schemas'
import { logAudit } from '../utils'
import { getDb } from '#/index'
import {
  subscriptions,
  transactions,
  installmentPlans,
  personalLoans,
  loanPayments,
  categories,
  households,
  templates,
  paySchedules,
  payExceptions,
  bills,
  liabilitySplits,
  systemAnnouncements,
  schedules,
  activityLogs as auditLogs
} from '#/schema'
import remindersApi from './reminders'
import { eq, and, desc, asc, like, lte, sql } from 'drizzle-orm'

const planning = new Hono<{ Bindings: Bindings, Variables: Variables }>()

// Subscriptions
planning.get('/subscriptions', async (c) => {
  const householdId = c.get('householdId')
  const user = c.get('user') as any
  const db = getDb(c.env)
  
  const allSubs = (await db.select().from(subscriptions).where(eq(subscriptions.householdId, householdId)).orderBy(asc(subscriptions.name)) as any)
  const splits = (await db.select().from(liabilitySplits).where(and(eq(liabilitySplits.householdId, householdId), eq(liabilitySplits.targetType, 'subscription'))) as any)
  
  const results = allSubs.map((sub: any) => {
    const userSplit = splits.find((s: any) => s.targetId === sub.id && s.assignedUserId === user?.id)
    if (userSplit) {
       const publicSplits = userSplit.isMasterLedgerPublic ? splits.filter((s: any) => s.targetId === sub.id) : undefined;
       return {
         ...sub,
         amountCents: userSplit.calculatedAmountCents,
         nextBillingDate: userSplit.overrideDate || sub.nextBillingDate,
         billingCycle: userSplit.overrideFrequency || sub.billingCycle,
         isSplitPortion: true,
         splitId: userSplit.id,
         splits: publicSplits
       }
    }
    
    const originatedSplits = splits.filter((s: any) => s.targetId === sub.id && s.originatorUserId === user?.id)
    if (originatedSplits.length > 0) {
      const remainingCents = sub.amountCents - originatedSplits.reduce((acc: any, curr: any) => acc + curr.calculatedAmountCents, 0)
      return {
        ...sub,
        amountCents: remainingCents,
        isSplitOriginator: true,
        splits: originatedSplits
      }
    }

    return sub
  })

  return c.json({ success: true, data: results || [] })
})

planning.post('/subscriptions', zValidator('json', SubscriptionSchema), async (c) => {
  const householdId = c.get('householdId')
  const data = (c.req.valid('json') as any)
  const id = crypto.randomUUID()
  const db = getDb(c.env)
  
  await db.insert(subscriptions).values({
    id,
    householdId,
    name: data.name,
    amountCents: data.amountCents,
    billingCycle: data.billingCycle,
    nextBillingDate: data.nextBillingDate,
    endDate: data.endDate || null,
    maxOccurrences: data.maxOccurrences || null,
    accountId: data.accountId || null,
    paymentMode: data.paymentMode || 'manual',
    ownerId: data.ownerId || c.get('userId'),
    upcomingAmountCents: data.upcomingAmountCents || null,
    upcomingEffectiveDate: data.upcomingEffectiveDate || null,
    payScheduleId: data.payScheduleId || null,
    paycheckDate: data.paycheckDate || null
  })
  
  await logAudit(c, 'subscriptions', id, 'create', null, data)
  return c.json({ success: true, id })
})

planning.patch('/subscriptions/:id', zValidator('json', SubscriptionSchema.partial()), async (c) => {
  const householdId = c.get('householdId')
  const id = c.req.param('id')
  const data = (c.req.valid('json') as any)
  const db = getDb(c.env)
  
  const oldResult = (await db.select().from(subscriptions).where(and(eq(subscriptions.id, id), eq(subscriptions.householdId, householdId))).limit(1) as any)
  const old = oldResult[0]
  if (!old) return c.json({ error: 'Not found' }, 404)

  const updates: any = {}
  if (data.name !== undefined) updates.name = data.name
  if (data.amountCents !== undefined) updates.amountCents = data.amountCents
  if (data.billingCycle !== undefined) updates.billingCycle = data.billingCycle
  if (data.nextBillingDate !== undefined) updates.nextBillingDate = data.nextBillingDate
  if (data.endDate !== undefined) updates.endDate = data.endDate
  if (data.maxOccurrences !== undefined) updates.maxOccurrences = data.maxOccurrences
  if (data.accountId !== undefined) updates.accountId = data.accountId
  if (data.paymentMode !== undefined) updates.paymentMode = data.paymentMode
  if (data.upcomingAmountCents !== undefined) updates.upcomingAmountCents = data.upcomingAmountCents
  if (data.upcomingEffectiveDate !== undefined) updates.upcomingEffectiveDate = data.upcomingEffectiveDate
  if (data.payScheduleId !== undefined) updates.payScheduleId = data.payScheduleId
  if (data.paycheckDate !== undefined) updates.paycheckDate = data.paycheckDate
  
  if (Object.keys(updates).length > 0) {
    await db.update(subscriptions).set(updates).where(and(eq(subscriptions.id, id), eq(subscriptions.householdId, householdId)))
    await logAudit(c, 'subscriptions', id, 'update', old, data)
  }

  return c.json({ success: true })
})

planning.delete('/subscriptions/:id', async (c) => {
  const householdId = c.get('householdId')
  const id = c.req.param('id')
  const db = getDb(c.env)
  await db.delete(subscriptions).where(and(eq(subscriptions.id, id), eq(subscriptions.householdId, householdId)))
  return c.json({ success: true })
})

// Bills
planning.get('/bills', async (c) => {
  const householdId = c.get('householdId')
  const user = c.get('user') as any
  const db = getDb(c.env)

  const allBills = (await db.select().from(bills).where(eq(bills.householdId, householdId)).orderBy(asc(bills.name)) as any)
  const splits = (await db.select().from(liabilitySplits).where(and(eq(liabilitySplits.householdId, householdId), eq(liabilitySplits.targetType, 'bill'))) as any)
  
  const results = allBills.map((bill: any) => {
    const userSplit = splits.find((s: any) => s.targetId === bill.id && s.assignedUserId === user?.id)
    if (userSplit) {
       const publicSplits = userSplit.isMasterLedgerPublic ? splits.filter((s: any) => s.targetId === bill.id) : undefined;
       return {
         ...bill,
         amountCents: userSplit.calculatedAmountCents,
         dueDate: userSplit.overrideDate || bill.dueDate,
         frequency: userSplit.overrideFrequency || bill.frequency,
         isSplitPortion: true,
         splitId: userSplit.id,
         splits: publicSplits
       }
    }
    const originatedSplits = splits.filter((s: any) => s.targetId === bill.id && s.originatorUserId === user?.id)
    if (originatedSplits.length > 0) {
      const remainingCents = bill.amountCents - originatedSplits.reduce((acc: any, curr: any) => acc + curr.calculatedAmountCents, 0)
      return {
        ...bill,
        amountCents: remainingCents,
        isSplitOriginator: true,
        splits: originatedSplits
      }
    }

    return bill
  })

  return c.json({ success: true, data: results || [] })
})

planning.post('/bills', zValidator('json', BillSchema), async (c) => {
  const householdId = c.get('householdId')
  const data = (c.req.valid('json') as any)
  const id = crypto.randomUUID()
  const db = getDb(c.env)
  
  await db.insert(bills).values({
    id,
    householdId,
    name: data.name,
    amountCents: data.amountCents,
    dueDate: data.dueDate,
    status: data.status || 'unpaid',
    notes: data.notes || null,
    categoryId: data.categoryId || null,
    accountId: data.accountId || null,
    isRecurring: data.isRecurring || false,
    frequency: data.frequency || null,
    endDate: data.endDate || null,
    maxOccurrences: data.maxOccurrences || null,
    ownerId: data.ownerId || c.get('userId'),
    upcomingAmountCents: data.upcomingAmountCents || null,
    upcomingEffectiveDate: data.upcomingEffectiveDate || null,
    payScheduleId: data.payScheduleId || null,
    paycheckDate: data.paycheckDate || null
  })
  
  await logAudit(c, 'bills', id, 'create', null, data)
  return c.json({ success: true, id })
})

planning.patch('/bills/:id', zValidator('json', BillSchema.partial()), async (c) => {
  const householdId = c.get('householdId')
  const id = c.req.param('id')
  const data = (c.req.valid('json') as any)
  const db = getDb(c.env)
  
  const oldResult = (await db.select().from(bills).where(and(eq(bills.id, id), eq(bills.householdId, householdId))).limit(1) as any)
  const old = oldResult[0]
  if (!old) return c.json({ error: 'Not found' }, 404)

  const updates: any = {}
  if (data.name !== undefined) updates.name = data.name
  if (data.amountCents !== undefined) updates.amountCents = data.amountCents
  if (data.dueDate !== undefined) updates.dueDate = data.dueDate
  if (data.status !== undefined) updates.status = data.status
  if (data.notes !== undefined) updates.notes = data.notes
  if (data.categoryId !== undefined) updates.categoryId = data.categoryId
  if (data.accountId !== undefined) updates.accountId = data.accountId
  if (data.isRecurring !== undefined) updates.isRecurring = data.isRecurring
  if (data.frequency !== undefined) updates.frequency = data.frequency
  if (data.endDate !== undefined) updates.endDate = data.endDate
  if (data.maxOccurrences !== undefined) updates.maxOccurrences = data.maxOccurrences
  if (data.ownerId !== undefined) updates.ownerId = data.ownerId
  if (data.upcomingAmountCents !== undefined) updates.upcomingAmountCents = data.upcomingAmountCents
  if (data.upcomingEffectiveDate !== undefined) updates.upcomingEffectiveDate = data.upcomingEffectiveDate
  if (data.payScheduleId !== undefined) updates.payScheduleId = data.payScheduleId
  if (data.paycheckDate !== undefined) updates.paycheckDate = data.paycheckDate
  
  if (Object.keys(updates).length > 0) {
    await db.update(bills).set(updates).where(and(eq(bills.id, id), eq(bills.householdId, householdId)))
    await logAudit(c, 'bills', id, 'update', old, data)
  }

  return c.json({ success: true })
})

planning.delete('/bills/:id', async (c) => {
  const householdId = c.get('householdId')
  const id = c.req.param('id')
  const db = getDb(c.env)
  await db.delete(bills).where(and(eq(bills.id, id), eq(bills.householdId, householdId)))
  return c.json({ success: true })
})

planning.post('/subscriptions/:id/transfer', zValidator('json', OwnershipTransferSchema), async (c) => {
  const householdId = c.get('householdId')
  const id = c.req.param('id')
  const { newOwnerId, transferHistory } = c.req.valid('json')
  const db = getDb(c.env)

  const subResult = (await db.select().from(subscriptions).where(and(eq(subscriptions.id, id), eq(subscriptions.householdId, householdId))).limit(1) as any)
  const sub = subResult[0]
  if (!sub) return c.json({ error: 'Subscription not found' }, 404)

  const patches: any[] = [
    db.update(subscriptions).set({ ownerId: newOwnerId }).where(eq(subscriptions.id, id))
  ]

  if (transferHistory) {
    patches.push(
      db.update(transactions).set({ ownerId: newOwnerId })
        .where(and(eq(transactions.householdId, householdId), like(transactions.description, `%${sub.name}%`)))
    )
  }

  await db.batch(patches as any)
  await logAudit(c, 'subscriptions', id, 'TRANSFER_OWNERSHIP', { oldOwner: sub.ownerId }, { newOwnerId: newOwnerId, transferHistory: transferHistory })

  return c.json({ success: true })
})

// Installment Plans
planning.get('/installment-plans', async (c) => {
  const householdId = c.get('householdId')
  const user = c.get('user') as any
  const db = getDb(c.env)
  
  const allInstallments = (await db.select().from(installmentPlans).where(eq(installmentPlans.householdId, householdId)).orderBy(asc(installmentPlans.name)) as any)
  const splits = (await db.select().from(liabilitySplits).where(and(eq(liabilitySplits.householdId, householdId), eq(liabilitySplits.targetType, 'installment'))) as any)
  
  const results = allInstallments.map((inst: any) => {
    const userSplit = splits.find((s: any) => s.targetId === inst.id && s.assignedUserId === user?.id)
    if (userSplit) {
       const publicSplits = userSplit.isMasterLedgerPublic ? splits.filter((s: any) => s.targetId === inst.id) : undefined;
       return {
         ...inst,
         installmentAmountCents: userSplit.calculatedAmountCents,
         nextPaymentDate: userSplit.overrideDate || inst.nextPaymentDate,
         frequency: userSplit.overrideFrequency || inst.frequency,
         isSplitPortion: true,
         splitId: userSplit.id,
         splits: publicSplits
       }
    }
    
    const originatedSplits = splits.filter((s: any) => s.targetId === inst.id && s.originatorUserId === user?.id)
    if (originatedSplits.length > 0) {
      const remainingCents = inst.installmentAmountCents - originatedSplits.reduce((acc: any, curr: any) => acc + curr.calculatedAmountCents, 0)
      return {
        ...inst,
        installmentAmountCents: remainingCents,
        isSplitOriginator: true,
        splits: originatedSplits
      }
    }

    return inst
  })

  return c.json({ success: true, data: results || [] })
})

planning.post('/installment-plans', zValidator('json', InstallmentPlanSchema), async (c) => {
  const householdId = c.get('householdId')
  const data = (c.req.valid('json') as any)
  const id = crypto.randomUUID()
  const db = getDb(c.env)
  
  await db.insert(installmentPlans).values({
    id,
    householdId,
    name: data.name,
    totalAmountCents: data.totalAmountCents,
    installmentAmountCents: data.installmentAmountCents,
    totalInstallments: data.totalInstallments,
    remainingInstallments: data.totalInstallments,
    frequency: data.frequency,
    nextPaymentDate: data.nextPaymentDate,
    accountId: data.accountId || null,
    paymentMode: data.paymentMode || 'manual',
    upcomingAmountCents: data.upcomingAmountCents || null,
    upcomingEffectiveDate: data.upcomingEffectiveDate || null
  })
  
  await logAudit(c, 'installment_plans', id, 'create', null, data)
  return c.json({ success: true, id })
})

planning.patch('/installment-plans/:id', zValidator('json', InstallmentPlanSchema.partial()), async (c) => {
  const householdId = c.get('householdId')
  const id = c.req.param('id')
  const data = (c.req.valid('json') as any)
  const db = getDb(c.env)
  
  const oldResult = (await db.select().from(installmentPlans).where(and(eq(installmentPlans.id, id), eq(installmentPlans.householdId, householdId))).limit(1) as any)
  const old = oldResult[0]
  if (!old) return c.json({ error: 'Not found' }, 404)

  const updates: any = {}
  if (data.name !== undefined) updates.name = data.name
  if (data.totalAmountCents !== undefined) updates.totalAmountCents = data.totalAmountCents
  if (data.installmentAmountCents !== undefined) updates.installmentAmountCents = data.installmentAmountCents
  if (data.totalInstallments !== undefined) updates.totalInstallments = data.totalInstallments
  if (data.remainingInstallments !== undefined) updates.remainingInstallments = data.remainingInstallments
  if (data.nextPaymentDate !== undefined) updates.nextPaymentDate = data.nextPaymentDate
  if (data.accountId !== undefined) updates.accountId = data.accountId
  if (data.paymentMode !== undefined) updates.paymentMode = data.paymentMode
  if (data.status !== undefined) updates.status = data.status
  if (data.upcomingAmountCents !== undefined) updates.upcomingAmountCents = data.upcomingAmountCents
  if (data.upcomingEffectiveDate !== undefined) updates.upcomingEffectiveDate = data.upcomingEffectiveDate
  
  if (Object.keys(updates).length > 0) {
    await db.update(installmentPlans).set(updates).where(and(eq(installmentPlans.id, id), eq(installmentPlans.householdId, householdId)))
    await logAudit(c, 'installment_plans', id, 'update', old, data)
  }

  return c.json({ success: true })
})

planning.delete('/installment-plans/:id', async (c) => {
  const householdId = c.get('householdId')
  const id = c.req.param('id')
  const db = getDb(c.env)
  await db.delete(installmentPlans).where(and(eq(installmentPlans.id, id), eq(installmentPlans.householdId, householdId)))
  await logAudit(c, 'installment_plans', id, 'delete')
  return c.json({ success: true })
})

// P2P Lending (Personal Loans)
planning.get('/p2p/loans', async (c) => {
  const householdId = c.get('householdId')
  const db = getDb(c.env)
  const results = (await db.select().from(personalLoans).where(eq(personalLoans.householdId, householdId)) as any)
  return c.json({ success: true, data: results || [] })
})

planning.post('/p2p/loans', zValidator('json', LoanSchema), async (c) => {
  const householdId = c.get('householdId')
  const userId = c.get('userId')
  const data = (c.req.valid('json') as any)
  const id = crypto.randomUUID()
  const db = getDb(c.env)
  
  await db.insert(personalLoans).values({
    id,
    householdId,
    lenderUserId: userId,
    borrowerName: data.borrowerName,
    borrowerContact: data.borrowerContact,
    totalAmountCents: data.totalAmountCents,
    remainingBalanceCents: data.totalAmountCents,
    interestRateApy: data.interestRateApy || 0,
    termMonths: data.termMonths,
    originationDate: data.originationDate
  })
  
  return c.json({ success: true, id })
})

planning.post('/p2p/loans/:id/payments', zValidator('json', z.object({
  amountCents: z.number().int().positive(),
  platform: z.string().optional(),
  externalId: z.string().optional(),
  method: z.string().optional(),
  email: z.string().email().optional()
})), async (c) => {
  const loanId = c.req.param('id')
  const data = (c.req.valid('json') as any)
  const id = crypto.randomUUID()
  
  const householdId = c.get('householdId')
  const db = getDb(c.env)
  
  const loanResult = (await db.select({ id: personalLoans.id }).from(personalLoans).where(and(eq(personalLoans.id, loanId), eq(personalLoans.householdId, householdId))).limit(1) as any)
  if (!loanResult[0]) throw new HTTPException(404, { message: 'Loan not found' })

  // 1. Log Payment
  const addPayment = db.insert(loanPayments).values({
    id,
    loanId,
    amountCents: data.amountCents,
    platform: data.platform,
    externalId: data.externalId,
    method: data.method
  })
  
  // 2. Update Balance (Harden with householdId constraint)
  const updateBalance = db.update(personalLoans)
    .set({ remainingBalanceCents: sql`remaining_balance_cents - ${data.amountCents}` })
    .where(and(eq(personalLoans.id, loanId), eq(personalLoans.householdId, householdId)))
    
  await db.batch([addPayment, updateBalance])
  
  // 3. Log Audit
  await logAudit(c, 'personal_loans', loanId, 'ADD_PAYMENT', null, { paymentId: id, amountCents: data.amountCents })

  // 4. Send Receipt (Wait Until)
  if (c.env.RESEND_API_KEY && data.email) {
    c.executionCtx.waitUntil(
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${c.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'LEDGER <receipts@gpnet.dev>',
          to: data.email,
          subject: `Payment Receipt: ${data.amountCents / 100}`,
          html: `<p>Thank you for your payment of $${(data.amountCents / 100).toFixed(2)}!</p>`
        })
      })
    )
  }

  return c.json({ success: true, id })
})

// Pay Schedules
planning.get('/pay-schedules', async (c) => {
  const householdId = c.get('householdId')
  const db = getDb(c.env)
  const results = (await db.select().from(paySchedules).where(eq(paySchedules.householdId, householdId)).orderBy(asc(paySchedules.name)) as any)
  return c.json({ success: true, data: results || [] })
})

planning.post('/pay-schedules', zValidator('json', PayScheduleSchema), async (c) => {
  const householdId = c.get('householdId')
  const data = (c.req.valid('json') as any)
  const id = crypto.randomUUID()
  const db = getDb(c.env)
  
  await db.insert(paySchedules).values({
    id,
    householdId,
    userId: data.userId || c.get('userId'),
    name: data.name,
    frequency: data.frequency,
    nextPayDate: data.nextPayDate || null,
    estimatedAmountCents: data.estimatedAmountCents || null,
    notes: data.notes || null,
    semiMonthlyDay1: data.semiMonthlyDay1 || null,
    semiMonthlyDay2: data.semiMonthlyDay2 || null,
    upcomingAmountCents: data.upcomingAmountCents || null,
    upcomingEffectiveDate: data.upcomingEffectiveDate || null,
  })
  
  await logAudit(c, 'pay_schedules', id, 'create', null, data)
  return c.json({ success: true, id })
})

planning.patch('/pay-schedules/:id', zValidator('json', PayScheduleSchema.partial()), async (c) => {
  const householdId = c.get('householdId')
  const id = c.req.param('id')
  const data = (c.req.valid('json') as any)
  const db = getDb(c.env)
  
  const oldResult = (await db.select().from(paySchedules).where(and(eq(paySchedules.id, id), eq(paySchedules.householdId, householdId))).limit(1) as any)
  const old = oldResult[0]
  if (!old) return c.json({ error: 'Not found' }, 404)

  const updates: any = {}
  if (data.name !== undefined) updates.name = data.name
  if (data.frequency !== undefined) updates.frequency = data.frequency
  if (data.nextPayDate !== undefined) updates.nextPayDate = data.nextPayDate
  if (data.estimatedAmountCents !== undefined) updates.estimatedAmountCents = data.estimatedAmountCents
  if (data.notes !== undefined) updates.notes = data.notes
  if (data.semiMonthlyDay1 !== undefined) updates.semiMonthlyDay1 = data.semiMonthlyDay1
  if (data.semiMonthlyDay2 !== undefined) updates.semiMonthlyDay2 = data.semiMonthlyDay2
  if (data.userId !== undefined) updates.userId = data.userId
  if (data.upcomingAmountCents !== undefined) updates.upcomingAmountCents = data.upcomingAmountCents
  if (data.upcomingEffectiveDate !== undefined) updates.upcomingEffectiveDate = data.upcomingEffectiveDate
  
  if (Object.keys(updates).length > 0) {
    await db.update(paySchedules).set(updates).where(and(eq(paySchedules.id, id), eq(paySchedules.householdId, householdId)))
    await logAudit(c, 'pay_schedules', id, 'update', old, data)
  }

  return c.json({ success: true })
})

planning.delete('/pay-schedules/:id', async (c) => {
  const householdId = c.get('householdId')
  const id = c.req.param('id')
  const db = getDb(c.env)
  await db.delete(paySchedules).where(and(eq(paySchedules.id, id), eq(paySchedules.householdId, householdId)))
  await logAudit(c, 'pay_schedules', id, 'delete')
  return c.json({ success: true })
})

// Pay Exceptions (Private Notes & Overrides)
planning.get('/pay-exceptions', async (c) => {
  const householdId = c.get('householdId')
  const user = c.get('user') as any
  const db = getDb(c.env)
  
  const results = (await db.select().from(payExceptions).where(and(
      eq(payExceptions.householdId, householdId),
      eq(payExceptions.userId, user?.id || 'unknown')
    )) as any)
  
  return c.json({ success: true, data: results || [] })
})

planning.post('/pay-exceptions', zValidator('json', PayExceptionSchema), async (c) => {
  const householdId = c.get('householdId')
  const userId = c.get('userId')
  const data = (c.req.valid('json') as any)
  const db = getDb(c.env)
  
  // Upsert logic: check if exception exists for this schedule + originalDate + user
  const existing = (await db.select().from(payExceptions).where(and(
      eq(payExceptions.householdId, householdId),
      eq(payExceptions.userId, userId),
      eq(payExceptions.payScheduleId, data.payScheduleId),
      eq(payExceptions.originalDate, data.originalDate)
    )).limit(1) as any)

  if (existing[0]) {
    await db.update(payExceptions).set({
      overrideDate: data.overrideDate || null,
      overrideAmountCents: data.overrideAmountCents || null,
      note: data.note || null
    }).where(eq(payExceptions.id, existing[0].id))
    return c.json({ success: true, id: existing[0].id })
  } else {
    const id = crypto.randomUUID()
    await db.insert(payExceptions).values({
      id,
      householdId,
      userId,
      payScheduleId: data.payScheduleId,
      originalDate: data.originalDate,
      overrideDate: data.overrideDate || null,
      overrideAmountCents: data.overrideAmountCents || null,
      note: data.note || null
    })
    return c.json({ success: true, id })
  }
})

planning.delete('/pay-exceptions/:id', async (c) => {
  const householdId = c.get('householdId')
  const userId = c.get('userId')
  const id = c.req.param('id')
  const db = getDb(c.env)
  
  await db.delete(payExceptions).where(and(
    eq(payExceptions.id, id),
    eq(payExceptions.householdId, householdId),
    eq(payExceptions.userId, userId)
  ))
  
  return c.json({ success: true })
})

// Financial Forecasting
planning.get('/bills/upcoming', async (c) => {
  const householdId = c.get('householdId')
  const days = parseInt(c.req.query('days') || '30')
  const end = new Date()
  end.setDate(end.getDate() + days)
  const endDateStr = end.toISOString().split('T')[0]

  const db = getDb(c.env)
  const subs = (await db.select().from(subscriptions).where(and(eq(subscriptions.householdId, householdId), lte(subscriptions.nextBillingDate, endDateStr))) as any)
  const installments = (await db.select().from(installmentPlans).where(and(eq(installmentPlans.householdId, householdId), lte(installmentPlans.nextPaymentDate, endDateStr))) as any)
  const schedules = (await db.select().from(paySchedules).where(eq(paySchedules.householdId, householdId)) as any)
  
  return c.json({
    success: true,
    data: {
      subscriptions: subs,
      installments: installments,
      paySchedules: schedules,
      totalUpcomingCents: [...subs, ...installments].reduce((acc, curr: any) => acc + (curr.amountCents || curr.installmentAmountCents || 0), 0)
    }
  })
})

// Budgets & Envelopes
planning.get('/budgets', async (c) => {
  const householdId = c.get('householdId')
  const db = getDb(c.env)
  
  const hResult = (await db.select({ unallocatedBalanceCents: households.unallocatedBalanceCents }).from(households).where(eq(households.id, householdId)).limit(1) as any)
  const household = hResult[0]
  
  const cats = (await db.select().from(categories).where(eq(categories.householdId, householdId)) as any)
  
  const spends = (await db.select({
      categoryId: transactions.categoryId,
      totalSpend: sql<number>`SUM(amount_cents)`.as('totalSpend')
    }).from(transactions).where(eq(transactions.householdId, householdId)).groupBy(transactions.categoryId) as any)
  
  const budgets = cats.map((cat: any) => {
    const spend = spends.find((s: any) => s.categoryId === cat.id)?.totalSpend || 0
    return {
      ...cat,
      spendCents: spend
    }
  })
  
  return c.json({
    success: true,
    data: {
      unallocatedBalanceCents: household?.unallocatedBalanceCents || 0,
      budgets
    }
  })
})

planning.post('/budget/fund', zValidator('json', z.object({
  categoryId: z.string(),
  amountCents: z.number().positive()
})), async (c) => {
  const householdId = c.get('householdId')
  const { categoryId, amountCents } = c.req.valid('json')
  const db = getDb(c.env)

  await db.batch([
    db.update(households).set({ unallocatedBalanceCents: sql`unallocated_balance_cents - ${amountCents}` }).where(eq(households.id, householdId)),
    db.update(categories).set({ envelopeBalanceCents: sql`envelope_balance_cents + ${amountCents}` }).where(and(eq(categories.id, categoryId), eq(categories.householdId, householdId)))
  ])

  await logAudit(c, 'categories', categoryId, 'FUND_ENVELOPE', null, { amountCents })

  return c.json({ success: true })
})

planning.post('/budget/deposit', zValidator('json', z.object({
  amountCents: z.number().positive(),
  accountId: z.string().optional()
})), async (c) => {
  const householdId = c.get('householdId')
  const { amountCents } = c.req.valid('json')
  const db = getDb(c.env)

  await db.update(households).set({ unallocatedBalanceCents: sql`unallocated_balance_cents + ${amountCents}` }).where(eq(households.id, householdId))

  await logAudit(c, 'households', householdId, 'DEPOSIT_FUNDS', null, { amountCents })

  return c.json({ success: true })
})

planning.post('/budget/transfer', zValidator('json', z.object({
  fromCategoryId: z.string(),
  toCategoryId: z.string(),
  amountCents: z.number().positive()
})), async (c) => {
  const householdId = c.get('householdId')
  const { fromCategoryId, toCategoryId, amountCents } = c.req.valid('json')
  const db = getDb(c.env)

  await db.batch([
    db.update(categories).set({ envelopeBalanceCents: sql`envelope_balance_cents - ${amountCents}` }).where(and(eq(categories.id, fromCategoryId), eq(categories.householdId, householdId))),
    db.update(categories).set({ envelopeBalanceCents: sql`envelope_balance_cents + ${amountCents}` }).where(and(eq(categories.id, toCategoryId), eq(categories.householdId, householdId)))
  ])

  await logAudit(c, 'categories', 'TRANSFER', 'TRANSFER_ENVELOPE', null, { 
    from: fromCategoryId, 
    to: toCategoryId, 
    amountCents 
  })

  return c.json({ success: true })
})

// Rollover Engine
planning.post('/budget/rollover', async (c) => {
  const householdId = c.get('householdId')
  const db = getDb(c.env)
  
  const cats = (await db.select({
      id: categories.id,
      rolloverEnabled: categories.rolloverEnabled,
      monthlyBudgetCents: categories.monthlyBudgetCents
    }).from(categories).where(eq(categories.householdId, householdId)) as any)

  if (!cats || cats.length === 0) return c.json({ success: true, count: 0 })

  const patches = cats.map((cat: any) => {
    if (cat.rolloverEnabled) {
      return db.update(categories).set({ envelopeBalanceCents: sql`envelope_balance_cents + ${cat.monthlyBudgetCents || 0}` }).where(eq(categories.id, cat.id))
    } else {
      return db.update(categories).set({ envelopeBalanceCents: cat.monthlyBudgetCents || 0 }).where(eq(categories.id, cat.id))
    }
  })

  // Group chunks to prevent limits
  for (let i = 0; i < patches.length; i += 50) {
    await db.batch(patches.slice(i, i + 50) as any)
  }
  
  await logAudit(c, 'categories', 'bulk', 'ROLLOVER_MONTH', null, { categoryCount: cats.length })

  return c.json({ success: true, count: cats.length })
})

// Transaction Templates
planning.get('/templates', async (c) => {
  try {
    const householdId = c.get('householdId')
    const db = getDb(c.env)
    const results = (await db.select().from(templates).where(eq(templates.householdId, householdId)) as any)
    return c.json({ success: true, data: results || [] })
  } catch (error: any) {
    console.error(`[DIAGNOSTIC_FAILURE] GET /api/planning/templates:`, error)
    return c.json({ error: 'Internal Server Error', details: error.message }, 500)
  }
})

// Reminders
planning.route('/reminders', remindersApi)


// Liability Splits
planning.post('/splits', zValidator('json', z.object({
  splits: z.array(LiabilitySplitSchema)
})), async (c) => {
  const householdId = c.get('householdId')
  const user = c.get('user') as any
  const { splits } = c.req.valid('json')
  const db = getDb(c.env)
  
  for (const splitData of splits) {
    // SECURITY: Verify target existence and ownership
    let targetExists = false;
    if (splitData.targetType === 'bill') {
      const res = (await db.select({ id: bills.id }).from(bills).where(and(eq(bills.id, splitData.targetId), eq(bills.householdId, householdId))).limit(1) as any);
      if (res[0]) targetExists = true;
    } else if (splitData.targetType === 'subscription') {
      const res = (await db.select({ id: subscriptions.id }).from(subscriptions).where(and(eq(subscriptions.id, splitData.targetId), eq(subscriptions.householdId, householdId))).limit(1) as any);
      if (res[0]) targetExists = true;
    } else if (splitData.targetType === 'installment') {
      const res = (await db.select({ id: installmentPlans.id }).from(installmentPlans).where(and(eq(installmentPlans.id, splitData.targetId), eq(installmentPlans.householdId, householdId))).limit(1) as any);
      if (res[0]) targetExists = true;
    }

    if (!targetExists) {
      console.warn(`[Phantom Split Blocked] User ${user?.id || 'unknown'} attempted to split invalid/foreign target ${splitData.targetId} (${splitData.targetType})`);
      continue; // Skip this one to prevent corruption, or throw 403
    }

    const id = crypto.randomUUID()
    await db.insert(liabilitySplits).values({
      id,
      householdId,
      targetType: splitData.targetType,
      targetId: splitData.targetId,
      originatorUserId: user?.id || 'unknown',
      assignedUserId: splitData.assignedUserId,
      splitType: splitData.splitType,
      splitValue: splitData.splitValue,
      calculatedAmountCents: splitData.calculatedAmountCents,
      overrideDate: splitData.overrideDate || null,
      overrideFrequency: splitData.overrideFrequency || null,
      status: splitData.status || 'pending',
      isMasterLedgerPublic: splitData.isMasterLedgerPublic || false
    })
    
    // Create System Announcement Notification
    if (user?.id !== splitData.assignedUserId) {
       await db.insert(systemAnnouncements).values({
         id: crypto.randomUUID(),
         title: `You've been assigned a split liability`,
         contentMd: `A user has assigned a ${(splitData.calculatedAmountCents / 100).toFixed(2)} portion of a ${splitData.targetType} to you. It will now appear on your Lifecycle projection.`,
         priority: 'info',
         actorId: splitData.assignedUserId,
         isActive: true
       })
    }
  }

  return c.json({ success: true })
})

planning.patch('/splits/:targetType/:targetId/public', zValidator('json', z.object({
  isPublic: z.boolean()
})), async (c) => {
  const householdId = c.get('householdId')
  const user = c.get('user') as any
  const targetType = c.req.param('targetType')
  const targetId = c.req.param('targetId')
  const { isPublic } = c.req.valid('json')
  const db = getDb(c.env)
  
  await db.update(liabilitySplits)
    .set({ isMasterLedgerPublic: isPublic })
    .where(and(
      eq(liabilitySplits.householdId, householdId),
      eq(liabilitySplits.targetType, targetType),
      eq(liabilitySplits.targetId, targetId),
      eq(liabilitySplits.originatorUserId, user?.id || 'unknown')
    ))

  return c.json({ success: true })
})

// Automated Schedules (Backups, etc)
planning.get('/schedules', async (c) => {
  const householdId = c.get('householdId')
  const db = getDb(c.env)
  const results = (await db.select().from(schedules).where(eq(schedules.householdId, householdId)) as any)
  return c.json({ success: true, data: results || [] })
})

planning.post('/schedules', zValidator('json', z.object({
  targetId: z.string(),
  targetType: z.string(),
  frequency: z.string(),
  nextRunAt: z.string()
})), async (c) => {
  const householdId = c.get('householdId')
  const { targetId, targetType, frequency, nextRunAt } = c.req.valid('json')
  const db = getDb(c.env)
  
  const id = crypto.randomUUID()
  await db.insert(schedules).values({
    id,
    householdId,
    targetId,
    targetType,
    frequency,
    nextRunAt,
    status: 'active'
  })
  
  return c.json({ success: true, id })
})

planning.delete('/schedules/:id', async (c) => {
  const householdId = c.get('householdId')
  const id = c.req.param('id')
  const db = getDb(c.env)
  await db.delete(schedules).where(and(eq(schedules.id, id), eq(schedules.householdId, householdId)))
  return c.json({ success: true })
})

function projectPaydaysBackend(schedules: any[], start: Date, end: Date): { payScheduleId: string; date: string }[] {
  const dates: { payScheduleId: string; date: string }[] = [];
  
  schedules.forEach(schedule => {
    if (!schedule.nextPayDate) return;
    let current = parseISO(schedule.nextPayDate);
    const frequency = schedule.frequency;

    while (isAfter(current, start)) {
      if (frequency === 'weekly') current = addDays(current, -7);
      else if (frequency === 'biweekly') current = addDays(current, -14);
      else if (frequency === 'monthly') {
        const day = current.getDate();
        current = addMonths(current, -1);
        current = setDate(current, Math.min(day, getDaysInMonth(current)));
      } else break;
    }

    let iteration = 0;
    while (isBefore(current, end) && iteration < 100) {
      if (!isBefore(current, start)) {
        dates.push({ payScheduleId: schedule.id, date: format(current, 'yyyy-MM-dd') });
      }
      
      if (frequency === 'weekly') current = addDays(current, 7);
      else if (frequency === 'biweekly') current = addDays(current, 14);
      else if (frequency === 'monthly') {
        const day = current.getDate();
        current = addMonths(current, 1);
        current = setDate(current, Math.min(day, getDaysInMonth(current)));
      } else if (frequency === 'semi-monthly') {
        const d1 = schedule.semiMonthlyDay1 || 1;
        const d2 = schedule.semiMonthlyDay2 || 15;
        const year = current.getFullYear();
        const month = current.getMonth();
        const date1 = new Date(year, month, d1);
        const date2 = new Date(year, month, d2);
        if (!isBefore(date1, start) && isBefore(date1, end)) dates.push({ payScheduleId: schedule.id, date: format(date1, 'yyyy-MM-dd') });
        if (!isBefore(date2, start) && isBefore(date2, end)) dates.push({ payScheduleId: schedule.id, date: format(date2, 'yyyy-MM-dd') });
        current = addMonths(current, 1);
      } else break;
      iteration++;
    }
  });

  return dates.sort((a, b) => a.date.localeCompare(b.date));
}

planning.post('/re-evaluate', zValidator('json', z.object({
  scope: z.enum(['all', 'biller', 'single']),
  billId: z.string().optional().nullable(),
  billerName: z.string().optional().nullable(),
  rangeStart: z.string().optional().nullable(),
  rangeEnd: z.string().optional().nullable()
})), async (c) => {
  const householdId = c.get('householdId')
  const { scope, billId, billerName, rangeStart, rangeEnd } = c.req.valid('json')
  const db = getDb(c.env)

  const schedulesList = await db.select().from(paySchedules).where(eq(paySchedules.householdId, householdId))
  if (schedulesList.length === 0) {
    return c.json({ error: 'No pay schedules found. Please set up a pay schedule first.' }, 400)
  }

  const start = new Date()
  const end = addDays(start, 365)
  const paychecks = projectPaydaysBackend(schedulesList, start, end)
  if (paychecks.length === 0) {
    return c.json({ error: 'No paychecks projected.' }, 400)
  }

  let activeBills = await db.select().from(bills).where(eq(bills.householdId, householdId))
  let activeSubs = await db.select().from(subscriptions).where(eq(subscriptions.householdId, householdId))

  if (scope === 'single' && billId) {
    activeBills = activeBills.filter(b => b.id === billId)
    activeSubs = activeSubs.filter(s => s.id === billId)
  } else if (scope === 'biller' && billerName) {
    const term = billerName.toLowerCase()
    activeBills = activeBills.filter(b => b.name.toLowerCase().includes(term))
    activeSubs = activeSubs.filter(s => s.name.toLowerCase().includes(term))
  }

  if (rangeStart) {
    activeBills = activeBills.filter(b => b.dueDate >= rangeStart)
    activeSubs = activeSubs.filter(s => s.nextBillingDate !== null && s.nextBillingDate >= rangeStart)
  }
  if (rangeEnd) {
    activeBills = activeBills.filter(b => b.dueDate <= rangeEnd)
    activeSubs = activeSubs.filter(s => s.nextBillingDate !== null && s.nextBillingDate <= rangeEnd)
  }

  let updatedCount = 0

  for (const bill of activeBills) {
    const paycheck = paychecks.filter(p => p.date <= bill.dueDate).pop() || paychecks[0]
    if (paycheck && paycheck.date !== bill.dueDate) {
      await db.update(bills).set({
        dueDate: paycheck.date,
        payScheduleId: paycheck.payScheduleId,
        paycheckDate: paycheck.date
      }).where(eq(bills.id, bill.id))
      updatedCount++
    }
  }

  for (const sub of activeSubs) {
    const paycheck = paychecks.filter(p => p.date <= (sub.nextBillingDate || '')).pop() || paychecks[0]
    if (paycheck && paycheck.date !== sub.nextBillingDate) {
      await db.update(subscriptions).set({
        nextBillingDate: paycheck.date,
        payScheduleId: paycheck.payScheduleId,
        paycheckDate: paycheck.date
      }).where(eq(subscriptions.id, sub.id))
      updatedCount++
    }
  }

  return c.json({ success: true, updatedCount })
})

export default planning
