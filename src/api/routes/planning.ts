import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { HTTPException } from 'hono/http-exception'
import { Bindings, Variables } from '../types'
import { 
  SubscriptionSchema, 
  InstallmentPlanSchema, 
  LoanSchema, 
  OwnershipTransferSchema 
} from '../schemas'
import { logAudit } from '../utils'

const planning = new Hono<{ Bindings: Bindings, Variables: Variables }>()

// Subscriptions
planning.get('/subscriptions', async (c) => {
  const householdId = c.get('householdId')
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM subscriptions WHERE household_id = ?'
  ).bind(householdId).all()
  return c.json(results)
})

planning.post('/subscriptions', zValidator('json', SubscriptionSchema), async (c) => {
  const householdId = c.get('householdId')
  const { name, amount_cents, billing_cycle, next_billing_date, account_id, payment_mode, owner_id } = c.req.valid('json')
  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    `INSERT INTO subscriptions (id, household_id, name, amount_cents, billing_cycle, next_billing_date, account_id, payment_mode, owner_id) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, householdId, name, amount_cents, billing_cycle, next_billing_date, account_id || null, payment_mode || 'manual', owner_id || c.get('userId')).run()
  
  await logAudit(c, 'subscriptions', id, 'create', null, { name, amount_cents, billing_cycle, payment_mode, owner_id })
  return c.json({ success: true, id })
})

planning.patch('/subscriptions/:id', zValidator('json', SubscriptionSchema.partial()), async (c) => {
  const householdId = c.get('householdId')
  const id = c.req.param('id')
  const data = c.req.valid('json')
  
  const old = await c.env.DB.prepare('SELECT * FROM subscriptions WHERE id = ? AND household_id = ?').bind(id, householdId).first()
  if (!old) return c.json({ error: 'Not found' }, 404)

  const { name, amount_cents, billing_cycle, next_billing_date, account_id, payment_mode } = data
  await c.env.DB.prepare(
    `UPDATE subscriptions SET name = COALESCE(?, name), amount_cents = COALESCE(?, amount_cents), billing_cycle = COALESCE(?, billing_cycle), 
     next_billing_date = COALESCE(?, next_billing_date), account_id = COALESCE(?, account_id), payment_mode = COALESCE(?, payment_mode)
     WHERE id = ? AND household_id = ?`
  ).bind(name, amount_cents, billing_cycle, next_billing_date, account_id, payment_mode, id, householdId).run()

  await logAudit(c, 'subscriptions', id, 'update', old, data)
  return c.json({ success: true })
})

planning.delete('/subscriptions/:id', async (c) => {
  const householdId = c.get('householdId')
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM subscriptions WHERE id = ? AND household_id = ?')
    .bind(id, householdId).run()
  return c.json({ success: true })
})

planning.post('/subscriptions/:id/transfer', zValidator('json', OwnershipTransferSchema), async (c) => {
  const householdId = c.get('householdId')
  const id = c.req.param('id')
  const { new_owner_id, transfer_history } = c.req.valid('json')

  const sub = await c.env.DB.prepare('SELECT * FROM subscriptions WHERE id = ? AND household_id = ?').bind(id, householdId).first()
  if (!sub) return c.json({ error: 'Subscription not found' }, 404)

  const queries = [
    c.env.DB.prepare('UPDATE subscriptions SET owner_id = ? WHERE id = ?').bind(new_owner_id, id)
  ]

  if (transfer_history) {
    queries.push(
      c.env.DB.prepare('UPDATE transactions SET owner_id = ? WHERE household_id = ? AND description LIKE ?')
        .bind(new_owner_id, householdId, `%${(sub as any).name}%`)
    )
  }

  await c.env.DB.batch(queries)
  await logAudit(c, 'subscriptions', id, 'TRANSFER_OWNERSHIP', { old_owner: (sub as any).owner_id }, { new_owner_id, transfer_history })

  return c.json({ success: true })
})

// Installment Plans
planning.get('/installment-plans', async (c) => {
  const householdId = c.get('householdId')
  const { results } = await c.env.DB.prepare('SELECT * FROM installment_plans WHERE household_id = ?').bind(householdId).all()
  return c.json(results)
})

planning.post('/installment-plans', zValidator('json', InstallmentPlanSchema), async (c) => {
  const householdId = c.get('householdId')
  const { name, total_amount_cents, installment_amount_cents, total_installments, frequency, next_payment_date, account_id, payment_mode } = c.req.valid('json')
  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    `INSERT INTO installment_plans (id, household_id, name, total_amount_cents, installment_amount_cents, total_installments, remaining_installments, frequency, next_payment_date, account_id, payment_mode) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, householdId, name, total_amount_cents, installment_amount_cents, total_installments, total_installments, frequency, next_payment_date, account_id || null, payment_mode || 'manual').run()
  
  await logAudit(c, 'installment_plans', id, 'create', null, { name, total_amount_cents })
  return c.json({ success: true, id })
})

planning.patch('/installment-plans/:id', zValidator('json', InstallmentPlanSchema.partial()), async (c) => {
  const householdId = c.get('householdId')
  const id = c.req.param('id')
  const data = c.req.valid('json')
  
  const old = await c.env.DB.prepare('SELECT * FROM installment_plans WHERE id = ? AND household_id = ?').bind(id, householdId).first()
  if (!old) return c.json({ error: 'Not found' }, 404)

  const { name, total_amount_cents, installment_amount_cents, total_installments, remaining_installments, next_payment_date, account_id, payment_mode, status } = data as any
  
  await c.env.DB.prepare(
    `UPDATE installment_plans SET 
       name = COALESCE(?, name), total_amount_cents = COALESCE(?, total_amount_cents), installment_amount_cents = COALESCE(?, installment_amount_cents), 
       total_installments = COALESCE(?, total_installments), remaining_installments = COALESCE(?, remaining_installments), 
       next_payment_date = COALESCE(?, next_payment_date), account_id = COALESCE(?, account_id), payment_mode = COALESCE(?, payment_mode), status = COALESCE(?, status)
     WHERE id = ? AND household_id = ?`
  ).bind(name, total_amount_cents, installment_amount_cents, total_installments, remaining_installments, next_payment_date, account_id, payment_mode, status, id, householdId).run()

  await logAudit(c, 'installment_plans', id, 'update', old, data)
  return c.json({ success: true })
})

// P2P Lending (Personal Loans)
planning.get('/p2p/loans', async (c) => {
  const householdId = c.get('householdId')
  const { results } = await c.env.DB.prepare('SELECT * FROM personal_loans WHERE household_id = ?').bind(householdId).all()
  return c.json(results)
})

planning.post('/p2p/loans', zValidator('json', LoanSchema), async (c) => {
  const householdId = c.get('householdId')
  const userId = c.get('userId')
  const data = c.req.valid('json')
  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    'INSERT INTO personal_loans (id, household_id, lender_user_id, borrower_name, borrower_contact, total_amount_cents, remaining_balance_cents, interest_rate_apy, term_months, origination_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, householdId, userId, data.borrower_name, data.borrower_contact, data.total_amount_cents, data.total_amount_cents, data.interest_rate_apy || 0, data.term_months, data.origination_date).run()
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
  const loan = await c.env.DB.prepare('SELECT id FROM personal_loans WHERE id = ? AND household_id = ?').bind(loanId, householdId).first()
  if (!loan) throw new HTTPException(404, { message: 'Loan not found' })

  // 1. Log Payment
  await c.env.DB.prepare(
    'INSERT INTO loan_payments (id, loan_id, amount_cents, platform, external_id, method) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, loanId, data.amount_cents, data.platform, data.external_id, data.method).run()
  
  // 2. Update Balance
  await c.env.DB.prepare(
    'UPDATE personal_loans SET remaining_balance_cents = remaining_balance_cents - ? WHERE id = ?'
  ).bind(data.amount_cents, loanId).run()
  
  // 3. Send Receipt (Wait Until)
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
          subject: `Payment Receipt: ${data.amount_cents / 100}`,
          html: `<p>Thank you for your payment of $${(data.amount_cents / 100).toFixed(2)}!</p>`
        })
      })
    )
  }

  return c.json({ success: true, id })
})

// Financial Forecasting
planning.get('/bills/upcoming', async (c) => {
  const householdId = c.get('householdId')
  const days = parseInt(c.req.query('days') || '30')
  const end = new Date()
  end.setDate(end.getDate() + days)
  const endDateStr = end.toISOString().split('T')[0]

  const { results: subs } = await c.env.DB.prepare('SELECT * FROM subscriptions WHERE household_id = ? AND next_billing_date <= ?').bind(householdId, endDateStr).all()
  const { results: installments } = await c.env.DB.prepare('SELECT * FROM installment_plans WHERE household_id = ? AND next_payment_date <= ?').bind(householdId, endDateStr).all()
  
  return c.json({
    subscriptions: subs,
    installments: installments,
    total_upcoming_cents: [...subs, ...installments].reduce((acc, curr: any) => acc + (curr.amount_cents || curr.installment_amount_cents || 0), 0)
  })
})

// Budgets & Envelopes
planning.get('/budgets', async (c) => {
  const householdId = c.get('householdId')
  
  const household: any = await c.env.DB.prepare('SELECT unallocated_balance_cents FROM households WHERE id = ?').bind(householdId).first()
  const { results: categories } = await c.env.DB.prepare('SELECT * FROM categories WHERE household_id = ?').bind(householdId).all()
  const { results: spends } = await c.env.DB.prepare('SELECT category_id, SUM(amount_cents) as total_spend FROM transactions WHERE household_id = ? GROUP BY category_id').bind(householdId).all()
  
  const budgets = categories.map((cat: any) => {
    const spend = spends.find((s: any) => s.category_id === cat.id)?.total_spend || 0
    return {
      ...cat,
      spend_cents: spend
    }
  })
  
  return c.json({
    unallocated_balance_cents: household?.unallocated_balance_cents || 0,
    budgets
  })
})

planning.post('/budget/fund', zValidator('json', z.object({
  category_id: z.string(),
  amount_cents: z.number().positive()
})), async (c) => {
  const householdId = c.get('householdId')
  const { category_id, amount_cents } = c.req.valid('json')

  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE households SET unallocated_balance_cents = unallocated_balance_cents - ? WHERE id = ?').bind(amount_cents, householdId),
    c.env.DB.prepare('UPDATE categories SET envelope_balance_cents = envelope_balance_cents + ? WHERE id = ? AND household_id = ?').bind(amount_cents, category_id, householdId)
  ])

  return c.json({ success: true })
})

planning.post('/budget/deposit', zValidator('json', z.object({
  amount_cents: z.number().positive(),
  account_id: z.string().optional()
})), async (c) => {
  const householdId = c.get('householdId')
  const { amount_cents } = c.req.valid('json')

  await c.env.DB.prepare('UPDATE households SET unallocated_balance_cents = unallocated_balance_cents + ? WHERE id = ?').bind(amount_cents, householdId).run()

  return c.json({ success: true })
})

planning.post('/budget/transfer', zValidator('json', z.object({
  from_category_id: z.string(),
  to_category_id: z.string(),
  amount_cents: z.number().positive()
})), async (c) => {
  const householdId = c.get('householdId')
  const { from_category_id, to_category_id, amount_cents } = c.req.valid('json')

  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE categories SET envelope_balance_cents = envelope_balance_cents - ? WHERE id = ? AND household_id = ?').bind(amount_cents, from_category_id, householdId),
    c.env.DB.prepare('UPDATE categories SET envelope_balance_cents = envelope_balance_cents + ? WHERE id = ? AND household_id = ?').bind(amount_cents, to_category_id, householdId)
  ])

  return c.json({ success: true })
})

// Rollover Engine
planning.post('/budget/rollover', async (c) => {
  const householdId = c.get('householdId')
  
  // 1. Fetch all categories
  const { results: categories } = await c.env.DB.prepare(
    'SELECT id, rollover_enabled, monthly_budget_cents FROM categories WHERE household_id = ?'
  ).bind(householdId).all()

  if (!categories || categories.length === 0) return c.json({ success: true, count: 0 })

  const queries = categories.map((cat: any) => {
    if (cat.rollover_enabled) {
      // Add budget to existing balance
      return c.env.DB.prepare(
        'UPDATE categories SET envelope_balance_cents = envelope_balance_cents + ? WHERE id = ?'
      ).bind(cat.monthly_budget_cents, cat.id)
    } else {
      // Reset to budget amount (clear remainder)
      return c.env.DB.prepare(
        'UPDATE categories SET envelope_balance_cents = ? WHERE id = ?'
      ).bind(cat.monthly_budget_cents, cat.id)
    }
  })

  await c.env.DB.batch(queries)
  await logAudit(c, 'categories', 'bulk', 'ROLLOVER_MONTH', null, { category_count: categories.length })

  return c.json({ success: true, count: categories.length })
})

// Transaction Templates
planning.get('/templates', async (c) => {
  const householdId = c.get('householdId')
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM templates WHERE household_id = ?'
  ).bind(householdId).all()
  return c.json(results)
})

export default planning

