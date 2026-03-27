import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { HTTPException } from 'hono/http-exception'
import { Bindings, Variables } from '../types'
import { logAudit } from '../utils'
import { WebhookSchema } from '../schemas'

const interop = new Hono<{ Bindings: Bindings, Variables: Variables }>()

// Analytics & Insights
interop.get('/analytics/summary', async (c) => {
  const householdId = c.get('householdId')
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  
  const { results: income } = await c.env.DB.prepare('SELECT SUM(amount_cents) as total FROM transactions WHERE household_id = ? AND amount_cents > 0 AND transaction_date >= ?').bind(householdId, startOfMonth).all()
  const { results: expense } = await c.env.DB.prepare('SELECT SUM(ABS(amount_cents)) as total FROM transactions WHERE household_id = ? AND amount_cents < 0 AND transaction_date >= ?').bind(householdId, startOfMonth).all()
  
  const totalIncome = (income as any)[0].total || 0
  const totalExpense = (expense as any)[0].total || 0
  const savings = totalIncome - totalExpense
  const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0
  
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const { results: recentExpense } = await c.env.DB.prepare('SELECT SUM(ABS(amount_cents)) as total FROM transactions WHERE household_id = ? AND amount_cents < 0 AND transaction_date >= ?').bind(householdId, thirtyDaysAgo).all()
  const burnRate = (recentExpense as any)[0].total / 30
  
  return c.json({
    healthScore: 85,
    monthlyIncome: totalIncome,
    monthlyExpense: totalExpense,
    savingsRate: Math.round(savingsRate),
    dailyBurnRate: Math.round(burnRate),
    safetyNumberCents: (savings * 6)
  })
})

interop.get('/analytics/category-spending', async (c) => {
  const householdId = c.get('householdId')
  const timeframe = c.req.query('timeframe') || '30d'
  
  const days = timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 365
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startDateStr = startDate.toISOString().split('T')[0]

  const { results } = await c.env.DB.prepare(
    `SELECT c.name, c.color, SUM(ABS(t.amount_cents)) as total_cents 
     FROM transactions t
     JOIN categories c ON t.category_id = c.id
     WHERE t.household_id = ? AND t.amount_cents < 0 AND t.transaction_date >= ?
     GROUP BY c.id
     ORDER BY total_cents DESC`
  ).bind(householdId, startDateStr).all()

  return c.json(results)
})

interop.get('/analytics/net-worth', async (c) => {
  const householdId = c.get('householdId')
  
  const { results: accs } = await c.env.DB.prepare('SELECT type, balance_cents FROM accounts WHERE household_id = ?').bind(householdId).all()
  const netWorthCents = (accs as any[]).reduce((sum, a) => sum + a.balance_cents, 0)
  
  const { results: snapshots } = await c.env.DB.prepare(
    'SELECT created_at, data_json FROM reports WHERE household_id = ? AND type = "net_worth_snapshot" ORDER BY created_at DESC LIMIT 6'
  ).bind(householdId).all()

  const history = snapshots.map((s: any) => ({
    date: s.created_at.split('T')[0],
    value: JSON.parse(s.data_json).net_worth_cents
  })).reverse()

  return c.json({
    current_net_worth_cents: netWorthCents,
    history
  })
})

interop.get('/analytics/insights', async (c) => {
  const insights = [
    "You've saved 15% more this week compared to last week. Keep it up!",
    "Subscriptions are taking up 22% of your monthly budget. Consider a 'Subscription Audit'.",
    "Your financial patterns indicate strong budget adherence.",
  ]
  return c.json({ insights })
})

// Webhooks (Inbound)
interop.post('/webhooks/plaid', async (c) => {
  const payload = await c.req.json() as any
  console.log('[Webhook] Plaid:', payload.webhook_code)
  return c.json({ received: true })
})

interop.post('/webhooks/akoya', async (c) => {
  console.log('[Webhook] Akoya pulse received')
  return c.json({ received: true })
})

// Service Providers
interop.get('/service-providers', async (c) => {
  const userId = c.get('userId')
  const householdId = c.get('householdId')
  const q = c.req.query('q')
  
  let query = `
    SELECT * FROM service_providers 
    WHERE (visibility = 'public' 
    OR (visibility = 'household' AND household_id = ?)
    OR (visibility = 'private' AND created_by = ?))`
  
  if (q) {
    query += ' AND name LIKE ?'
    const { results } = await c.env.DB.prepare(query).bind(householdId, userId, `%${q}%`).all()
    return c.json(results)
  }
  
  const { results } = await c.env.DB.prepare(query).bind(householdId, userId).all()
  return c.json(results)
})

interop.post('/service-providers', zValidator('json', z.object({
  name: z.string(),
  url: z.string().optional(),
  icon_url: z.string().optional(),
  category_id: z.string().optional(),
  metadata: z.string().optional()
})), async (c) => {
  const { name, url, icon_url, category_id, metadata } = c.req.valid('json')
  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    'INSERT INTO service_providers (id, name, url, icon_url, category_id, metadata) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, name, url || null, icon_url || null, category_id || null, metadata || null).run()
  return c.json({ success: true, id })
})

// Reports
interop.get('/reports', async (c) => {
  const householdId = c.get('householdId')
  const { results } = await c.env.DB.prepare(
    'SELECT id, type, period_start, period_end, created_at FROM reports WHERE household_id = ? ORDER BY created_at DESC'
  ).bind(householdId).all()
  return c.json(results)
})

interop.post('/reports/snapshot', async (c) => {
  const householdId = c.get('householdId')
  const { type } = await c.req.json() as { type: string }
  
  const id = crypto.randomUUID()
  let data = {}
  
  if (type === 'net_worth_snapshot') {
    const { results: accs } = await c.env.DB.prepare('SELECT balance_cents FROM accounts WHERE household_id = ?').bind(householdId).all()
    const netWorth = (accs as any[]).reduce((sum, a) => sum + a.balance_cents, 0)
    data = { net_worth_cents: netWorth }
  } else if (type === 'monthly_summary') {
     data = { summary: 'Monthly performance locked.' }
  }

  await c.env.DB.prepare('INSERT INTO reports (id, household_id, type, data_json) VALUES (?, ?, ?, ?)')
    .bind(id, householdId, type, JSON.stringify(data)).run()
    
  return c.json({ success: true, id })
})

interop.get('/reports/:id', async (c) => {
  const id = c.req.param('id')
  const householdId = c.get('householdId')
  const report = await c.env.DB.prepare(
    'SELECT * FROM reports WHERE id = ? AND household_id = ?'
  ).bind(id, householdId).first()
  
  if (!report) throw new HTTPException(404, { message: 'Report not found' })
  
  return c.json({
    ...report,
    data: JSON.parse((report as any).data_json)
  })
})

// Public Config
interop.get('/config', async (c) => {
  try {
    const { results: configs } = await c.env.DB.prepare('SELECT key, value_json FROM system_configs').all()
    return c.json(configs.reduce((acc: any, curr) => ({ ...acc, [curr.key as string]: JSON.parse(curr.value_json as string) }), {}))
  } catch (e) {
    return c.json({ error: 'Failed to load public config' }, 500)
  }
})

interop.get('/theme/broadcast', async (c) => {
  const config = await c.env.DB.prepare('SELECT value_json FROM system_configs WHERE key = "broadcast_theme_id"').first()
  if (!config) return c.json({ themeId: null })
  return c.json({ themeId: JSON.parse((config as any).value_json) })
})

// Developer: Personal Access Tokens (PATs)
interop.post('/developer/tokens', zValidator('json', z.object({ name: z.string().min(1).max(50) })), async (c) => {
  const householdId = c.get('householdId')
  const { name } = c.req.valid('json')
  const tokenValue = crypto.randomUUID().replace(/-/g, '')
  const id = `ledger_${tokenValue}`
  
  await c.env.DB.prepare('INSERT INTO personal_access_tokens (id, household_id, name) VALUES (?, ?, ?)')
    .bind(id, householdId, name).run()
    
  await logAudit(c, 'personal_access_tokens', id, 'create', null, { name })
  return c.json({ token: id })
})

interop.get('/developer/tokens', async (c) => {
  const householdId = c.get('householdId')
  const { results } = await c.env.DB.prepare('SELECT id, name, created_at FROM personal_access_tokens WHERE household_id = ?')
    .bind(householdId).all()
  return c.json(results)
})

// Developer: Webhooks
interop.get('/developer/webhooks', async (c) => {
  const householdId = c.get('householdId')
  const { results } = await c.env.DB.prepare('SELECT id, url, secret, events, created_at FROM webhooks WHERE household_id = ?').bind(householdId).all()
  return c.json(results)
})

interop.post('/developer/webhooks', zValidator('json', WebhookSchema), async (c) => {
  const householdId = c.get('householdId')
  const { url, events } = c.req.valid('json')
  const id = crypto.randomUUID()
  const secret = `wh_sec_${crypto.randomUUID().slice(0, 8)}`
  
  await c.env.DB.prepare(
    'INSERT INTO webhooks (id, household_id, url, secret, events) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, householdId, url, secret, events).run()
  
  return c.json({ success: true, id, secret })
})

interop.delete('/developer/webhooks/:id', async (c) => {
  const id = c.req.param('id')
  const householdId = c.get('householdId')
  await c.env.DB.prepare('DELETE FROM webhooks WHERE id = ? AND household_id = ?').bind(id, householdId).run()
  return c.json({ success: true })
})

export default interop

// AI Coach
interop.post('/coach/ask', zValidator('json', z.object({ question: z.string().min(3).max(500) })), async (c) => {
  const { question } = c.req.valid('json')
  const householdId = c.get('householdId')
  
  const { results: transactions } = await c.env.DB.prepare('SELECT amount_cents FROM transactions WHERE household_id = ?').bind(householdId).all()
  const totalSpend = (transactions as any[]).reduce((sum, tx) => sum + tx.amount_cents, 0)

  let answer = "I'm analyzing your data... "
  if (question.toLowerCase().includes('afford')) {
    answer = `Based on your safety number and recent spending of $${(totalSpend/100).toFixed(2)}, you are in a good position for moderate purchases.`
  } else if (question.toLowerCase().includes('spend')) {
    answer = `You've spent a total of $${(totalSpend/100).toFixed(2)} in this household so far.`
  } else {
    answer = "Your financial health looks stable. Remember to check your 'Safety Number' before any big commitments!"
  }

  return c.json({ answer })
})
