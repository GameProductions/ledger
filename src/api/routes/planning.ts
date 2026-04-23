import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { HTTPException } from 'hono/http-exception'
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
} from '../schemas'
import { logAudit } from '../utils'
import { getDb } from '../db'
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
  schedules
} from '../db/schema'
import { eq, and, desc, like, lte, sql } from 'drizzle-orm'

const planning = new Hono<{ Bindings: Bindings, Variables: Variables }>()

const toSnake = (obj: any) => {
  if (!obj || typeof obj !== 'object') return obj;
  const res: any = {};
  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    res[snakeKey] = obj[key];
  }
  return res;
}

// Subscriptions
planning.get('/subscriptions', async (c) => {
  const householdId = c.get('householdId')
  const user = c.get('user') as any
  const db = getDb(c.env)
  
  const allSubs = await db.select().from(subscriptions).where(eq(subscriptions.householdId, householdId))
  const splits = await db.select().from(liabilitySplits).where(and(eq(liabilitySplits.householdId, householdId), eq(liabilitySplits.targetType, 'subscription')))
  
  const results = allSubs.map(sub => {
    const userSplit = splits.find(s => s.targetId === sub.id && s.assignedUserId === user?.id)
    if (userSplit) {
       const publicSplits = userSplit.isMasterLedgerPublic ? splits.filter(s => s.targetId === sub.id) : undefined;
       return {
         ...toSnake(sub),
         amount_cents: userSplit.calculatedAmountCents,
         next_billing_date: userSplit.overrideDate || sub.nextBillingDate,
         billing_cycle: userSplit.overrideFrequency || sub.billingCycle,
         is_split_portion: true,
         split_id: userSplit.id,
         splits: publicSplits ? publicSplits.map(toSnake) : undefined
       }
    }
    
    const originatedSplits = splits.filter(s => s.targetId === sub.id && s.originatorUserId === user?.id)
    if (originatedSplits.length > 0) {
      const remainingCents = sub.amountCents - originatedSplits.reduce((acc, curr) => acc + curr.calculatedAmountCents, 0)
      return {
        ...toSnake(sub),
        amount_cents: remainingCents,
        is_split_originator: true,
        splits: originatedSplits.map(toSnake)
      }
    }

    return toSnake(sub)
  })

  return c.json({ success: true, data: results || [] })
})

planning.post('/subscriptions', zValidator('json', SubscriptionSchema), async (c) => {
  const householdId = c.get('householdId')
  const { name, amount_cents, billing_cycle, next_billing_date, account_id, payment_mode, owner_id } = c.req.valid('json')
  const id = crypto.randomUUID()
  const db = getDb(c.env)
  
  await db.insert(subscriptions).values({
    id,
    householdId,
    name,
    amountCents: amount_cents,
    billingCycle: billing_cycle,
    nextBillingDate: next_billing_date,
    accountId: account_id || null,
    paymentMode: payment_mode || 'manual',
    ownerId: owner_id || c.get('userId'),
    upcomingAmountCents: (c.req.valid('json') as any).upcoming_amount_cents || null,
    upcomingEffectiveDate: (c.req.valid('json') as any).upcoming_effective_date || null
  })
  
  await logAudit(c, 'subscriptions', id, 'create', null, { name, amount_cents, billing_cycle, payment_mode, owner_id })
  return c.json({ success: true, id })
})

planning.patch('/subscriptions/:id', zValidator('json', SubscriptionSchema.partial()), async (c) => {
  const householdId = c.get('householdId')
  const id = c.req.param('id')
  const data = c.req.valid('json')
  const db = getDb(c.env)
  
  const oldResult = await db.select().from(subscriptions).where(and(eq(subscriptions.id, id), eq(subscriptions.householdId, householdId))).limit(1)
  const old = oldResult[0]
  if (!old) return c.json({ error: 'Not found' }, 404)

  const updates: any = {}
  if (data.name !== undefined) updates.name = data.name
  if (data.amount_cents !== undefined) updates.amountCents = data.amount_cents
  if (data.billing_cycle !== undefined) updates.billingCycle = data.billing_cycle
  if (data.next_billing_date !== undefined) updates.nextBillingDate = data.next_billing_date
  if (data.account_id !== undefined) updates.accountId = data.account_id
  if (data.payment_mode !== undefined) updates.paymentMode = data.payment_mode
  if (data.upcoming_amount_cents !== undefined) updates.upcomingAmountCents = data.upcoming_amount_cents
  if (data.upcoming_effective_date !== undefined) updates.upcomingEffectiveDate = data.upcoming_effective_date
  
  if (Object.keys(updates).length > 0) {
    await db.update(subscriptions).set(updates).where(and(eq(subscriptions.id, id), eq(subscriptions.householdId, householdId)))
    await logAudit(c, 'subscriptions', id, 'update', toSnake(old), data)
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

  const allBills = await db.select().from(bills).where(eq(bills.householdId, householdId))
  const splits = await db.select().from(liabilitySplits).where(and(eq(liabilitySplits.householdId, householdId), eq(liabilitySplits.targetType, 'bill')))
  
  const results = allBills.map(bill => {
    // Check if this bill has any splits assigned specifically to the user rendering the request
    const userSplit = splits.find(s => s.targetId === bill.id && s.assignedUserId === user?.id)
    if (userSplit) {
       const publicSplits = userSplit.isMasterLedgerPublic ? splits.filter(s => s.targetId === bill.id) : undefined;
       return {
         ...toSnake(bill),
         amount_cents: userSplit.calculatedAmountCents,
         due_date: userSplit.overrideDate || bill.dueDate,
         frequency: userSplit.overrideFrequency || bill.frequency,
         is_split_portion: true,
         split_id: userSplit.id,
         splits: publicSplits ? publicSplits.map(toSnake) : undefined
       }
    }
    // If there is a split but not assigned to the user, the user might be the originator
    // Typically, if you assigned it away, you shouldn't see that portion on *your* projection.
    // However, the dashboard logic handles showing only what the user owes.
    // For now, if the user originated a split, they still see their remaining part.
    const originatedSplits = splits.filter(s => s.targetId === bill.id && s.originatorUserId === user?.id)
    if (originatedSplits.length > 0) {
      const remainingCents = bill.amountCents - originatedSplits.reduce((acc, curr) => acc + curr.calculatedAmountCents, 0)
      return {
        ...toSnake(bill),
        amount_cents: remainingCents,
        is_split_originator: true,
        splits: originatedSplits.map(toSnake)
      }
    }

    return toSnake(bill)
  })

  return c.json({ success: true, data: results || [] })
})

planning.post('/bills', zValidator('json', BillSchema), async (c) => {
  const householdId = c.get('householdId')
  const data = c.req.valid('json')
  const id = crypto.randomUUID()
  const db = getDb(c.env)
  
  await db.insert(bills).values({
    id,
    householdId,
    name: data.name,
    amountCents: data.amount_cents,
    dueDate: data.due_date,
    status: data.status || 'unpaid',
    notes: data.notes || null,
    categoryId: data.category_id || null,
    accountId: data.account_id || null,
    isRecurring: data.is_recurring || false,
    frequency: data.frequency || null,
    ownerId: data.owner_id || c.get('userId'),
    upcomingAmountCents: data.upcoming_amount_cents || null,
    upcomingEffectiveDate: data.upcoming_effective_date || null
  })
  
  await logAudit(c, 'bills', id, 'create', null, data)
  return c.json({ success: true, id })
})

planning.patch('/bills/:id', zValidator('json', BillSchema.partial()), async (c) => {
  const householdId = c.get('householdId')
  const id = c.req.param('id')
  const data = c.req.valid('json')
  const db = getDb(c.env)
  
  const oldResult = await db.select().from(bills).where(and(eq(bills.id, id), eq(bills.householdId, householdId))).limit(1)
  const old = oldResult[0]
  if (!old) return c.json({ error: 'Not found' }, 404)

  const updates: any = {}
  if (data.name !== undefined) updates.name = data.name
  if (data.amount_cents !== undefined) updates.amountCents = data.amount_cents
  if (data.due_date !== undefined) updates.dueDate = data.due_date
  if (data.status !== undefined) updates.status = data.status
  if (data.notes !== undefined) updates.notes = data.notes
  if (data.category_id !== undefined) updates.categoryId = data.category_id
  if (data.account_id !== undefined) updates.accountId = data.account_id
  if (data.is_recurring !== undefined) updates.isRecurring = data.is_recurring
  if (data.frequency !== undefined) updates.frequency = data.frequency
  if (data.owner_id !== undefined) updates.ownerId = data.owner_id
  if (data.upcoming_amount_cents !== undefined) updates.upcomingAmountCents = data.upcoming_amount_cents
  if (data.upcoming_effective_date !== undefined) updates.upcomingEffectiveDate = data.upcoming_effective_date
  
  if (Object.keys(updates).length > 0) {
    await db.update(bills).set(updates).where(and(eq(bills.id, id), eq(bills.householdId, householdId)))
    await logAudit(c, 'bills', id, 'update', toSnake(old), data)
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
  const { new_owner_id, transfer_history } = c.req.valid('json')
  const db = getDb(c.env)

  const subResult = await db.select().from(subscriptions).where(and(eq(subscriptions.id, id), eq(subscriptions.householdId, householdId))).limit(1)
  const sub = subResult[0]
  if (!sub) return c.json({ error: 'Subscription not found' }, 404)

  const patches: any[] = [
    db.update(subscriptions).set({ ownerId: new_owner_id }).where(eq(subscriptions.id, id))
  ]

  if (transfer_history) {
    patches.push(
      db.update(transactions).set({ ownerId: new_owner_id })
        .where(and(eq(transactions.householdId, householdId), like(transactions.description, `%${sub.name}%`)))
    )
  }

  await db.batch(patches as any)
  await logAudit(c, 'subscriptions', id, 'TRANSFER_OWNERSHIP', { old_owner: sub.ownerId }, { new_owner_id, transfer_history })

  return c.json({ success: true })
})

// Installment Plans
planning.get('/installment-plans', async (c) => {
  const householdId = c.get('householdId')
  const user = c.get('user') as any
  const db = getDb(c.env)
  
  const allInstallments = await db.select().from(installmentPlans).where(eq(installmentPlans.householdId, householdId))
  const splits = await db.select().from(liabilitySplits).where(and(eq(liabilitySplits.householdId, householdId), eq(liabilitySplits.targetType, 'installment')))
  
  const results = allInstallments.map(inst => {
    const userSplit = splits.find(s => s.targetId === inst.id && s.assignedUserId === user?.id)
    if (userSplit) {
       const publicSplits = userSplit.isMasterLedgerPublic ? splits.filter(s => s.targetId === inst.id) : undefined;
       return {
         ...toSnake(inst),
         installment_amount_cents: userSplit.calculatedAmountCents,
         next_payment_date: userSplit.overrideDate || inst.nextPaymentDate,
         frequency: userSplit.overrideFrequency || inst.frequency,
         is_split_portion: true,
         split_id: userSplit.id,
         splits: publicSplits ? publicSplits.map(toSnake) : undefined
       }
    }
    
    const originatedSplits = splits.filter(s => s.targetId === inst.id && s.originatorUserId === user?.id)
    if (originatedSplits.length > 0) {
      const remainingCents = inst.installmentAmountCents - originatedSplits.reduce((acc, curr) => acc + curr.calculatedAmountCents, 0)
      return {
        ...toSnake(inst),
        installment_amount_cents: remainingCents,
        is_split_originator: true,
        splits: originatedSplits.map(toSnake)
      }
    }

    return toSnake(inst)
  })

  return c.json({ success: true, data: results || [] })
})

planning.post('/installment-plans', zValidator('json', InstallmentPlanSchema), async (c) => {
  const householdId = c.get('householdId')
  const { name, total_amount_cents, installment_amount_cents, total_installments, frequency, next_payment_date, account_id, payment_mode } = c.req.valid('json')
  const id = crypto.randomUUID()
  const db = getDb(c.env)
  
  await db.insert(installmentPlans).values({
    id,
    householdId,
    name,
    totalAmountCents: total_amount_cents,
    installmentAmountCents: installment_amount_cents,
    totalInstallments: total_installments,
    remainingInstallments: total_installments,
    frequency,
    nextPaymentDate: next_payment_date,
    accountId: account_id || null,
    paymentMode: payment_mode || 'manual',
    upcomingAmountCents: (c.req.valid('json') as any).upcoming_amount_cents || null,
    upcomingEffectiveDate: (c.req.valid('json') as any).upcoming_effective_date || null
  })
  
  await logAudit(c, 'installment_plans', id, 'create', null, { name, total_amount_cents })
  return c.json({ success: true, id })
})

planning.patch('/installment-plans/:id', zValidator('json', InstallmentPlanSchema.partial()), async (c) => {
  const householdId = c.get('householdId')
  const id = c.req.param('id')
  const data = c.req.valid('json')
  const db = getDb(c.env)
  
  const oldResult = await db.select().from(installmentPlans).where(and(eq(installmentPlans.id, id), eq(installmentPlans.householdId, householdId))).limit(1)
  const old = oldResult[0]
  if (!old) return c.json({ error: 'Not found' }, 404)

  const updates: any = {}
  if (data.name !== undefined) updates.name = data.name
  if (data.total_amount_cents !== undefined) updates.totalAmountCents = data.total_amount_cents
  if (data.installment_amount_cents !== undefined) updates.installmentAmountCents = data.installment_amount_cents
  if (data.total_installments !== undefined) updates.totalInstallments = data.total_installments
  if (data.remaining_installments !== undefined) updates.remainingInstallments = data.remaining_installments
  if (data.next_payment_date !== undefined) updates.nextPaymentDate = data.next_payment_date
  if (data.account_id !== undefined) updates.accountId = data.account_id
  if (data.payment_mode !== undefined) updates.paymentMode = data.payment_mode
  if (data.status !== undefined) updates.status = data.status
  if (data.upcoming_amount_cents !== undefined) updates.upcomingAmountCents = data.upcoming_amount_cents
  if (data.upcoming_effective_date !== undefined) updates.upcomingEffectiveDate = data.upcoming_effective_date
  
  if (Object.keys(updates).length > 0) {
    await db.update(installmentPlans).set(updates).where(and(eq(installmentPlans.id, id), eq(installmentPlans.householdId, householdId)))
    await logAudit(c, 'installment_plans', id, 'update', toSnake(old), data)
  }

  return c.json({ success: true })
})

// P2P Lending (Personal Loans)
planning.get('/p2p/loans', async (c) => {
  const householdId = c.get('householdId')
  const db = getDb(c.env)
  const results = await db.select().from(personalLoans).where(eq(personalLoans.householdId, householdId))
  return c.json({ success: true, data: (results || []).map(toSnake) })
})

planning.post('/p2p/loans', zValidator('json', LoanSchema), async (c) => {
  const householdId = c.get('householdId')
  const userId = c.get('userId')
  const data = c.req.valid('json')
  const id = crypto.randomUUID()
  const db = getDb(c.env)
  
  await db.insert(personalLoans).values({
    id,
    householdId,
    lenderUserId: userId,
    borrowerName: data.borrower_name,
    borrowerContact: data.borrower_contact,
    totalAmountCents: data.total_amount_cents,
    remainingBalanceCents: data.total_amount_cents,
    interestRateApy: data.interest_rate_apy || 0,
    termMonths: data.term_months,
    originationDate: data.origination_date
  })
  
  return c.json({ success: true, id })
})

planning.post('/p2p/loans/:id/payments', zValidator('json', z.object({
  amount_cents: z.number().int().positive(),
  platform: z.string().optional(),
  external_id: z.string().optional(),
  method: z.string().optional(),
  email: z.string().email().optional()
})), async (c) => {
  const loanId = c.req.param('id')
  const data = c.req.valid('json')
  const id = crypto.randomUUID()
  
  const householdId = c.get('householdId')
  const db = getDb(c.env)
  
  const loanResult = await db.select({ id: personalLoans.id }).from(personalLoans).where(and(eq(personalLoans.id, loanId), eq(personalLoans.householdId, householdId))).limit(1)
  if (!loanResult[0]) throw new HTTPException(404, { message: 'Loan not found' })

  // 1. Log Payment
  const addPayment = db.insert(loanPayments).values({
    id,
    loanId,
    amountCents: data.amount_cents,
    platform: data.platform,
    externalId: data.external_id,
    method: data.method
  })
  
  // 2. Update Balance (Harden with household_id constraint)
  const updateBalance = db.update(personalLoans)
    .set({ remainingBalanceCents: sql`remaining_balance_cents - ${data.amount_cents}` })
    .where(and(eq(personalLoans.id, loanId), eq(personalLoans.householdId, householdId)))
    
  await db.batch([addPayment, updateBalance])
  
  // 3. Log Audit
  await logAudit(c, 'personal_loans', loanId, 'ADD_PAYMENT', null, { payment_id: id, amount_cents: data.amount_cents })

  // 4. Send Receipt (Wait Until)
  if (c.env.RESEND_API_KEY && data.email) {
    c.executionCtx.waitUntil(
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer \${c.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'LEDGER <receipts@gpnet.dev>',
          to: data.email,
          subject: `Payment Receipt: \${data.amount_cents / 100}`,
          html: `<p>Thank you for your payment of $\${(data.amount_cents / 100).toFixed(2)}!</p>`
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
  const results = await db.select().from(paySchedules).where(eq(paySchedules.householdId, householdId))
  return c.json({ success: true, data: (results || []).map(toSnake) })
})

planning.post('/pay-schedules', zValidator('json', PayScheduleSchema), async (c) => {
  const householdId = c.get('householdId')
  const { name, frequency, next_pay_date, estimated_amount_cents, notes, semi_monthly_day_1, semi_monthly_day_2, user_id } = c.req.valid('json')
  const id = crypto.randomUUID()
  const db = getDb(c.env)
  
  await db.insert(paySchedules).values({
    id,
    householdId,
    userId: user_id || c.get('userId'),
    name,
    frequency,
    nextPayDate: next_pay_date || null,
    estimatedAmountCents: estimated_amount_cents || null,
    notes: notes || null,
    semiMonthlyDay1: semi_monthly_day_1 || null,
    semiMonthlyDay2: semi_monthly_day_2 || null,
    upcomingAmountCents: (c.req.valid('json') as any).upcoming_amount_cents || null,
    upcomingEffectiveDate: (c.req.valid('json') as any).upcoming_effective_date || null,
  })
  
  await logAudit(c, 'pay_schedules', id, 'create', null, { name, frequency, estimated_amount_cents })
  return c.json({ success: true, id })
})

planning.patch('/pay-schedules/:id', zValidator('json', PayScheduleSchema.partial()), async (c) => {
  const householdId = c.get('householdId')
  const id = c.req.param('id')
  const data = c.req.valid('json')
  const db = getDb(c.env)
  
  const oldResult = await db.select().from(paySchedules).where(and(eq(paySchedules.id, id), eq(paySchedules.householdId, householdId))).limit(1)
  const old = oldResult[0]
  if (!old) return c.json({ error: 'Not found' }, 404)

  const updates: any = {}
  if (data.name !== undefined) updates.name = data.name
  if (data.frequency !== undefined) updates.frequency = data.frequency
  if (data.next_pay_date !== undefined) updates.nextPayDate = data.next_pay_date
  if (data.estimated_amount_cents !== undefined) updates.estimatedAmountCents = data.estimated_amount_cents
  if (data.notes !== undefined) updates.notes = data.notes
  if (data.semi_monthly_day_1 !== undefined) updates.semiMonthlyDay1 = data.semi_monthly_day_1
  if (data.semi_monthly_day_2 !== undefined) updates.semiMonthlyDay2 = data.semi_monthly_day_2
  if (data.user_id !== undefined) updates.userId = data.user_id
  if (data.upcoming_amount_cents !== undefined) updates.upcomingAmountCents = data.upcoming_amount_cents
  if (data.upcoming_effective_date !== undefined) updates.upcomingEffectiveDate = data.upcoming_effective_date
  
  if (Object.keys(updates).length > 0) {
    await db.update(paySchedules).set(updates).where(and(eq(paySchedules.id, id), eq(paySchedules.householdId, householdId)))
    await logAudit(c, 'pay_schedules', id, 'update', toSnake(old), data)
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
  
  const results = await db.select().from(payExceptions).where(and(
    eq(payExceptions.householdId, householdId),
    eq(payExceptions.userId, user?.id || 'unknown')
  ))
  
  return c.json({ success: true, data: (results || []).map(toSnake) })
})

planning.post('/pay-exceptions', zValidator('json', PayExceptionSchema), async (c) => {
  const householdId = c.get('householdId')
  const userId = c.get('userId')
  const data = c.req.valid('json')
  const db = getDb(c.env)
  
  // Upsert logic: check if exception exists for this schedule + original_date + user
  const existing = await db.select().from(payExceptions).where(and(
    eq(payExceptions.householdId, householdId),
    eq(payExceptions.userId, userId),
    eq(payExceptions.payScheduleId, data.pay_schedule_id),
    eq(payExceptions.originalDate, data.original_date)
  )).limit(1)

  if (existing[0]) {
    await db.update(payExceptions).set({
      overrideDate: data.override_date || null,
      overrideAmountCents: data.override_amount_cents || null,
      note: data.note || null
    }).where(eq(payExceptions.id, existing[0].id))
    return c.json({ success: true, id: existing[0].id })
  } else {
    const id = crypto.randomUUID()
    await db.insert(payExceptions).values({
      id,
      householdId,
      userId,
      payScheduleId: data.pay_schedule_id,
      originalDate: data.original_date,
      overrideDate: data.override_date || null,
      overrideAmountCents: data.override_amount_cents || null,
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
  const subs = await db.select().from(subscriptions).where(and(eq(subscriptions.householdId, householdId), lte(subscriptions.nextBillingDate, endDateStr)))
  const installments = await db.select().from(installmentPlans).where(and(eq(installmentPlans.householdId, householdId), lte(installmentPlans.nextPaymentDate, endDateStr)))
  const schedules = await db.select().from(paySchedules).where(eq(paySchedules.householdId, householdId))
  
  return c.json({
    subscriptions: subs.map(toSnake),
    installments: installments.map(toSnake),
    pay_schedules: schedules.map(toSnake),
    total_upcoming_cents: [...subs, ...installments].reduce((acc, curr: any) => acc + (curr.amountCents || curr.installmentAmountCents || 0), 0)
  })
})

// Budgets & Envelopes
planning.get('/budgets', async (c) => {
  const householdId = c.get('householdId')
  const db = getDb(c.env)
  
  const hResult = await db.select({ unallocatedBalanceCents: households.unallocatedBalanceCents }).from(households).where(eq(households.id, householdId)).limit(1)
  const household = hResult[0]
  
  const cats = await db.select().from(categories).where(eq(categories.householdId, householdId))
  
  const spends = await db.select({
    categoryId: transactions.categoryId,
    totalSpend: sql<number>`SUM(amount_cents)`.as('total_spend')
  }).from(transactions).where(eq(transactions.householdId, householdId)).groupBy(transactions.categoryId)
  
  const budgets = cats.map(cat => {
    const spend = spends.find(s => s.categoryId === cat.id)?.totalSpend || 0
    return {
      ...toSnake(cat),
      spend_cents: spend
    }
  })
  
  return c.json({
    unallocated_balance_cents: household?.unallocatedBalanceCents || 0,
    budgets
  })
})

planning.post('/budget/fund', zValidator('json', z.object({
  category_id: z.string(),
  amount_cents: z.number().positive()
})), async (c) => {
  const householdId = c.get('householdId')
  const { category_id, amount_cents } = c.req.valid('json')
  const db = getDb(c.env)

  await db.batch([
    db.update(households).set({ unallocatedBalanceCents: sql`unallocated_balance_cents - ${amount_cents}` }).where(eq(households.id, householdId)),
    db.update(categories).set({ envelopeBalanceCents: sql`envelope_balance_cents + ${amount_cents}` }).where(and(eq(categories.id, category_id), eq(categories.householdId, householdId)))
  ])

  await logAudit(c, 'categories', category_id, 'FUND_ENVELOPE', null, { amount_cents })

  return c.json({ success: true })
})

planning.post('/budget/deposit', zValidator('json', z.object({
  amount_cents: z.number().positive(),
  account_id: z.string().optional()
})), async (c) => {
  const householdId = c.get('householdId')
  const { amount_cents } = c.req.valid('json')
  const db = getDb(c.env)

  await db.update(households).set({ unallocatedBalanceCents: sql`unallocated_balance_cents + ${amount_cents}` }).where(eq(households.id, householdId))

  await logAudit(c, 'households', householdId, 'DEPOSIT_FUNDS', null, { amount_cents })

  return c.json({ success: true })
})

planning.post('/budget/transfer', zValidator('json', z.object({
  from_category_id: z.string(),
  to_category_id: z.string(),
  amount_cents: z.number().positive()
})), async (c) => {
  const householdId = c.get('householdId')
  const { from_category_id, to_category_id, amount_cents } = c.req.valid('json')
  const db = getDb(c.env)

  await db.batch([
    db.update(categories).set({ envelopeBalanceCents: sql`envelope_balance_cents - ${amount_cents}` }).where(and(eq(categories.id, from_category_id), eq(categories.householdId, householdId))),
    db.update(categories).set({ envelopeBalanceCents: sql`envelope_balance_cents + ${amount_cents}` }).where(and(eq(categories.id, to_category_id), eq(categories.householdId, householdId)))
  ])

  await logAudit(c, 'categories', 'TRANSFER', 'TRANSFER_ENVELOPE', null, { 
    from: from_category_id, 
    to: to_category_id, 
    amount_cents 
  })

  return c.json({ success: true })
})

// Rollover Engine
planning.post('/budget/rollover', async (c) => {
  const householdId = c.get('householdId')
  const db = getDb(c.env)
  
  const cats = await db.select({
    id: categories.id,
    rolloverEnabled: categories.rolloverEnabled,
    monthlyBudgetCents: categories.monthlyBudgetCents
  }).from(categories).where(eq(categories.householdId, householdId))

  if (!cats || cats.length === 0) return c.json({ success: true, count: 0 })

  const patches = cats.map(cat => {
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
  
  await logAudit(c, 'categories', 'bulk', 'ROLLOVER_MONTH', null, { category_count: cats.length })

  return c.json({ success: true, count: cats.length })
})

import remindersApi from './reminders'

// Transaction Templates
planning.get('/templates', async (c) => {
  const householdId = c.get('householdId')
  const db = getDb(c.env)
  const results = await db.select().from(templates).where(eq(templates.householdId, householdId))
  return c.json({ success: true, data: (results || []).map(toSnake) })
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
    if (splitData.target_type === 'bill') {
      const res = await db.select({ id: bills.id }).from(bills).where(and(eq(bills.id, splitData.target_id), eq(bills.householdId, householdId))).limit(1);
      if (res[0]) targetExists = true;
    } else if (splitData.target_type === 'subscription') {
      const res = await db.select({ id: subscriptions.id }).from(subscriptions).where(and(eq(subscriptions.id, splitData.target_id), eq(subscriptions.householdId, householdId))).limit(1);
      if (res[0]) targetExists = true;
    } else if (splitData.target_type === 'installment') {
      const res = await db.select({ id: installmentPlans.id }).from(installmentPlans).where(and(eq(installmentPlans.id, splitData.target_id), eq(installmentPlans.householdId, householdId))).limit(1);
      if (res[0]) targetExists = true;
    }

    if (!targetExists) {
      console.warn(`[Phantom Split Blocked] User ${user?.id || 'unknown'} attempted to split invalid/foreign target ${splitData.target_id} (${splitData.target_type})`);
      continue; // Skip this one to prevent corruption, or throw 403
    }

    const id = crypto.randomUUID()
    await db.insert(liabilitySplits).values({
      id,
      householdId,
      targetType: splitData.target_type,
      targetId: splitData.target_id,
      originatorUserId: user?.id || 'unknown',
      assignedUserId: splitData.assigned_user_id,
      splitType: splitData.split_type,
      splitValue: splitData.split_value,
      calculatedAmountCents: splitData.calculated_amount_cents,
      overrideDate: splitData.override_date || null,
      overrideFrequency: splitData.override_frequency || null,
      status: splitData.status || 'pending',
      isMasterLedgerPublic: splitData.is_master_ledger_public || false
    })
    
    // Create System Announcement Notification
    if (user?.id !== splitData.assigned_user_id) {
       await db.insert(systemAnnouncements).values({
         id: crypto.randomUUID(),
         title: `You've been assigned a split liability`,
         contentMd: `A user has assigned a ${(splitData.calculated_amount_cents / 100).toFixed(2)} portion of a ${splitData.target_type} to you. It will now appear on your Lifecycle projection.`,
         priority: 'info',
         actorId: splitData.assigned_user_id,
         isActive: true
       })
    }
  }

  return c.json({ success: true })
})

planning.patch('/splits/:targetType/:targetId/public', zValidator('json', z.object({
  is_public: z.boolean()
})), async (c) => {
  const householdId = c.get('householdId')
  const user = c.get('user') as any
  const targetType = c.req.param('targetType')
  const targetId = c.req.param('targetId')
  const { is_public } = c.req.valid('json')
  const db = getDb(c.env)
  
  await db.update(liabilitySplits)
    .set({ isMasterLedgerPublic: is_public })
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
  const results = await db.select().from(schedules).where(eq(schedules.householdId, householdId))
  return c.json({ success: true, data: (results || []).map(toSnake) })
})

planning.post('/schedules', zValidator('json', z.object({
  target_id: z.string(),
  target_type: z.string(),
  frequency: z.string(),
  next_run_at: z.string()
})), async (c) => {
  const householdId = c.get('householdId')
  const { target_id, target_type, frequency, next_run_at } = c.req.valid('json')
  const db = getDb(c.env)
  
  const id = crypto.randomUUID()
  await db.insert(schedules).values({
    id,
    householdId,
    targetId: target_id,
    targetType: target_type,
    frequency,
    nextRunAt: next_run_at,
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

export default planning
