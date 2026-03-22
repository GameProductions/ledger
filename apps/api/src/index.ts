import { Hono } from 'hono'
import { jwt } from 'hono/jwt'
import { cors } from 'hono/cors'

type Bindings = {
  DB: D1Database
  ASSETS: R2Bucket
  SESSION: DurableObjectNamespace
  JWT_SECRET: string
  DISCORD_TOKEN: string
  DISCORD_WEBHOOK_URL: string
  DISCORD_PUBLIC_KEY: string
}

type Variables = {
  householdId: string
  userId: string
}

// --- DURABLE OBJECT: HouseholdSession ---
export class HouseholdSession {
  state: DurableObjectState
  users: Set<string> = new Set()

  constructor(state: DurableObjectState) {
    this.state = state
  }

  async fetch(request: Request) {
    const url = new URL(request.url)
    if (url.pathname === '/join') {
      const { userId } = await request.json() as any
      this.users.add(userId)
      return new Response(JSON.stringify({ activeCount: this.users.size }))
    }
    if (url.pathname === '/status') {
      return new Response(JSON.stringify({ activeCount: this.users.size }))
    }
    return new Response('Not Found', { status: 404 })
  }
}

const app = new Hono<{ Bindings: Bindings, Variables: Variables }>()

app.use('*', cors())

// --- UTILITIES: Audit Logging ---
const logAudit = async (c: any, tableName: string, recordId: string, action: string, oldValues: any, newValues: any) => {
  const id = crypto.randomUUID()
  const householdId = c.get('householdId')
  const actorId = c.get('userId')
  await c.env.DB.prepare(
    'INSERT INTO audit_logs (id, household_id, actor_id, table_name, record_id, action, old_values_json, new_values_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, householdId, actorId, tableName, recordId, action, JSON.stringify(oldValues), JSON.stringify(newValues)).run()
}

// --- AUTH MIDDLEWARE ---
const authMiddleware = async (c: any, next: any) => {
  const jwtSecret = c.env.JWT_SECRET || 'yolo-secret-change-me'
  const middleware = jwt({ secret: jwtSecret })
  return middleware(c, next)
}

// --- RLI MIDDLEWARE ---
app.use('/api/*', authMiddleware)
app.use('/api/*', async (c, next) => {
  const jwtSecret = c.env.JWT_SECRET || 'yolo-secret-change-me'
  const token = c.req.header('Authorization')?.split(' ')[1]
  if (!token) {
    return c.json({ error: 'Unauthorized: No token provided' }, 401)
  }

  try {
    const payload = await verify(token, jwtSecret)
    c.set('userId', payload.sub)
    
    // Check for Household Context
    const headerHouseholdId = c.req.header('x-household-id')
    const activeHouseholdId = headerHouseholdId || payload.householdId
    
    // VERIFY User belongs to this household
    const { results } = await c.env.DB.prepare(
      'SELECT role FROM user_households WHERE user_id = ? AND household_id = ?'
    ).bind(payload.sub, activeHouseholdId).all()
    
    if (results.length === 0) {
      return c.json({ error: 'Access Denied to this Household' }, 403)
    }
    
    c.set('householdId', activeHouseholdId)
    await next()
  } catch (e) {
    console.error('JWT verification failed:', e)
    return c.json({ error: 'Unauthorized: Invalid token' }, 401)
  }
})

app.get('/', (c) => {
  return c.text('CASH API - Status: Active (YOLO Mode)')
})

// --- AUTH ENDPOINTS ---
app.post('/auth/login', async (c) => {
  // Mock login for YOLO mode
  const { username } = await c.req.json()
  const payload = {
    sub: 'user-123',
    householdId: 'household-abc',
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24h
  }
  const secret = c.env.JWT_SECRET || 'yolo-secret-change-me'
  const token = await jwt.sign(payload, secret)
  return c.json({ token, username })
})

app.get('/api/me', (c) => {
  return c.json({
    userId: c.get('userId'),
    householdId: c.get('householdId')
  })
})

// --- CORE API ROUTES ---

// Categories
app.get('/api/categories', async (c) => {
  const householdId = c.get('householdId')
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM categories WHERE household_id = ?'
  ).bind(householdId).all()
  return c.json(results)
})

// Accounts
app.get('/api/accounts', async (c) => {
  const householdId = c.get('householdId')
  const { results } = await c.env.DB.prepare(
    'SELECT id, name, type, balance_cents, currency_code FROM accounts WHERE household_id = ?'
  ).bind(householdId).all()
  return c.json(results)
})

// Transfers
app.post('/api/transfers', async (c) => {
  const householdId = c.get('householdId')
  const { from_account_id, to_account_id, amount_cents, description } = await c.req.json()
  
  const id = crypto.randomUUID()
  
  // Step 1: Decrement Source
  await c.env.DB.prepare(
    'UPDATE accounts SET balance_cents = balance_cents - ? WHERE id = ? AND household_id = ?'
  ).bind(amount_cents, from_account_id, householdId).run()
  
  // Step 2: Increment Destination
  await c.env.DB.prepare(
    'UPDATE accounts SET balance_cents = balance_cents + ? WHERE id = ? AND household_id = ?'
  ).bind(amount_cents, to_account_id, householdId).run()
  
  // Step 3: Log as Transfer (Optional, but good for history)
  // We'll skip for now to keep it simple, or add a 'transfers' table later if requested.
  
  // Subscription Auto-Detection Logic
  const { results: existing } = await c.env.DB.prepare(
    'SELECT id FROM transactions WHERE description = ? AND household_id = ? LIMIT 1'
  ).bind(description, householdId).all()
  
  if (existing.length > 0) {
    console.log(`Auto-detected recurring pattern for: ${description}`)
    // Mark as subscription candidate if requested in production
  }

  return c.json({ success: true, id })
})

// Transactions
app.post('/api/transactions', async (c) => {
  const householdId = c.get('householdId')
  const { amount_cents, description, account_id, category_id } = await c.req.json()
  
  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    'INSERT INTO transactions (id, household_id, account_id, category_id, amount_cents, description) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, householdId, account_id, category_id, amount_cents, description).run()
  
  // Discord Alert
  if (c.env.DISCORD_WEBHOOK_URL) {
    await fetch(c.env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `💸 **New Transaction logged!**\n**Desc:** ${description}\n**Amount:** $${(amount_cents / 100).toFixed(2)}\n**Household:** ${householdId}`
      })
    }).catch(err => console.error('Discord Webhook failed', err))
  }
  
  return c.json({ success: true, id })
})

app.patch('/api/transactions/:id/reconcile', async (c) => {
  const id = c.req.param('id')
  const householdId = c.get('householdId')
  const { reconciled } = await c.req.json()
  
  const status = reconciled ? 'reconciled' : 'accounted_for'
  
  await c.env.DB.prepare(
    'UPDATE transactions SET status = ? WHERE id = ? AND household_id = ?'
  ).bind(status, id, householdId).run()
  
  await logAudit(c, 'transactions', id, 'update', { status: '?' }, { status })
  
  return c.json({ success: true })
})

// Transaction Fetching (Updated to include all)
app.get('/api/transactions', async (c) => {
  const householdId = c.get('householdId')
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM transactions WHERE household_id = ? ORDER BY transaction_date DESC LIMIT 50'
  ).bind(householdId).all()
  return c.json(results)
})

// Templates
app.get('/api/templates', async (c) => {
  const householdId = c.get('householdId')
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM templates WHERE household_id = ?'
  ).bind(householdId).all()
  return c.json(results)
})

// Durable Object Endpoints
app.get('/api/household/status', async (c) => {
  const householdId = c.get('householdId')
  const id = c.env.SESSION.idFromName(householdId)
  const obj = c.env.SESSION.get(id)
  const res = await obj.fetch(new URL('/status', c.req.url))
  return c.json(await res.json())
})

app.post('/api/household/join', async (c) => {
  const householdId = c.get('householdId')
  const userId = c.get('userId')
  const id = c.env.SESSION.idFromName(householdId)
  const obj = c.env.SESSION.get(id)
  const res = await obj.fetch(new URL('/join', c.req.url), {
    method: 'POST',
    body: JSON.stringify({ userId })
  })
  return c.json(await res.json())
})

// Budgets
app.get('/api/budgets', async (c) => {
  const householdId = c.get('householdId')
  
  // Get all categories for the household
  const { results: categories } = await c.env.DB.prepare(
    'SELECT * FROM categories WHERE household_id = ?'
  ).bind(householdId).all()
  
  // Get monthly spend per category
  // For YOLO mode, we'll just sum all transactions for simplicity (real app would filter by month)
  const { results: spends } = await c.env.DB.prepare(
    'SELECT category_id, SUM(amount_cents) as total_spend FROM transactions WHERE household_id = ? GROUP BY category_id'
  ).bind(householdId).all()
  
  const budgets = categories.map((cat: any) => {
    const spend = spends.find((s: any) => s.category_id === cat.id)?.total_spend || 0
    return {
      ...cat,
      spend_cents: spend,
      rollover_cents: cat.rollover_enabled ? 2500 : 0 // Mocked rollover for now
    }
  })
  
  return c.json(budgets)
})

// Import
app.post('/api/import/csv', async (c) => {
  const householdId = c.get('householdId')
  const body = await c.req.parseBody()
  const csvFile = body['csv'] as File
  
  if (!csvFile) return c.json({ error: 'No file' }, 400)
  
  // In YOLO mode, we simulate a successful import of 12 transactions
  // Real implementation would use a CSV parser (e.g. PapaParse or simple split)
  return c.json({ success: true, count: 12, householdId })
})

// Export
app.get('/api/export/csv', async (c) => {
  const householdId = c.get('householdId')
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM transactions WHERE household_id = ?'
  ).bind(householdId).all()
  
  if (!results || results.length === 0) return c.text('No data to export')
  
  const headers = Object.keys(results[0]).join(',')
  const rows = results.map((row: any) => 
    Object.values(row).map(val => `"${val}"`).join(',')
  ).join('\n')
  
  const csv = `${headers}\n${rows}`
  
  return c.text(csv, 200, {
    'Content-Type': 'text/csv',
    'Content-Disposition': `attachment; filename="cash-export-${Date.now()}.csv"`
  })
})

// Households
app.get('/api/households', async (c) => {
  const userId = c.get('userId')
  const { results } = await c.env.DB.prepare(
    'SELECT h.*, uh.role FROM households h JOIN user_households uh ON h.id = uh.household_id WHERE uh.user_id = ?'
  ).bind(userId).all()
  return c.json(results)
})

// Subscriptions
app.get('/api/subscriptions', async (c) => {
  const householdId = c.get('householdId')
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM subscriptions WHERE household_id = ?'
  ).bind(householdId).all()
  return c.json(results)
})

app.post('/api/subscriptions', async (c) => {
  const householdId = c.get('householdId')
  const { name, amount_cents, billing_cycle, next_billing_date } = await c.req.json()
  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    'INSERT INTO subscriptions (id, household_id, name, amount_cents, billing_cycle, next_billing_date) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, householdId, name, amount_cents, billing_cycle, next_billing_date).run()
  return c.json({ success: true, id })
})

// Analytics & Predictions
app.get('/api/analytics/summary', async (c) => {
  const householdId = c.get('householdId')
  const timeframe = c.req.query('timeframe') || 'paycheck' // paycheck, month, 30d
  
  // 1. Get Accounts and Transactions
  const { results: accounts } = await c.env.DB.prepare('SELECT balance_cents FROM accounts WHERE household_id = ?').bind(householdId).all()
  const { results: transactions } = await c.env.DB.prepare('SELECT amount_cents, category_id, transaction_date FROM transactions WHERE household_id = ?').bind(householdId).all()
  const { results: subs } = await c.env.DB.prepare('SELECT amount_cents FROM subscriptions WHERE household_id = ?').bind(householdId).all()
  const { results: categories } = await c.env.DB.prepare('SELECT monthly_budget_cents FROM categories WHERE household_id = ?').bind(householdId).all()

  const totalBalance = (accounts as any[]).reduce((sum, a) => sum + a.balance_cents, 0)
  const totalMonthlySubs = (subs as any[]).reduce((sum, s) => sum + s.amount_cents, 0)
  const totalMonthlyBudget = (categories as any[]).reduce((sum, cat) => sum + cat.monthly_budget_cents, 0)

  // 2. Calculate dynamic window days
  let days = 15 // Default to "Next Paycheck" window
  if (timeframe === 'month') {
    const now = new Date()
    days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate()
  } else if (timeframe === '30d') {
    days = 30
  }

  // 3. Health Score Logic (Simplified YOLO logic)
  // Score = 100 - (Spend / Budget * 50) + (Balance / Budget * 10)
  const currentMonthSpend = (transactions as any[]).reduce((sum, tx) => sum + tx.amount_cents, 0)
  const budgetRatio = totalMonthlyBudget > 0 ? currentMonthSpend / totalMonthlyBudget : 0
  let healthScore = Math.max(0, Math.min(100, Math.round(100 - (budgetRatio * 40))))

  // 4. Dynamic Safety Number
  // Safety = Balance - (Fixed Costs for window) - (Discretionary trend)
  const dailyFixed = totalMonthlySubs / 30
  const totalFixedInWindow = dailyFixed * days
  const safetyNumberCents = totalBalance - totalFixedInWindow

  return c.json({
    healthScore,
    safetyNumberCents,
    timeframe,
    daysRemaining: days,
    indicators: {
      budgetAdherence: budgetRatio < 1 ? 'good' : 'warning',
      savingsRate: 'neutral'
    }
  })
})

// Reports
app.get('/api/report/summary', async (c) => {
  const householdId = c.get('householdId')
  // Return a summary for "PDF" generation (simulated)
  return c.json({
    generatedAt: new Date().toISOString(),
    householdId,
    title: "Monthly Financial Digest",
    sections: ["Cash Flow", "Budget Adherence", "Top Categories"]
  })
})

// Households: Invites
app.post('/api/households/invite', async (c) => {
  const householdId = c.get('householdId')
  // In YOLO mode, we generate a simple random token. In production, use signed JWT.
  const token = Math.random().toString(36).substring(2, 15)
  // Store token in KV or D1 (omitted for brevity, simulated success)
  return c.json({ inviteToken: token, url: `http://localhost:5173/join?token=${token}` })
})

app.post('/api/households/join', async (c) => {
  const userId = c.get('userId')
  const { token } = await c.req.json()
  // Simulate joining a household (ID: 'main-household-id')
  const householdId = '110f0fcd-367f-46f3-9fe3-28fadd9e564b' 
  await c.env.DB.prepare(
    'INSERT OR IGNORE INTO user_households (user_id, household_id) VALUES (?, ?)'
  ).bind(userId, householdId).run()
  return c.json({ success: true, householdId })
})

// Analytics: Smart Insights
app.get('/api/analytics/insights', async (c) => {
  const householdId = c.get('householdId')
  const { results: transactions } = await c.env.DB.prepare(
    'SELECT amount_cents, description FROM transactions WHERE household_id = ? ORDER BY transaction_date DESC LIMIT 5'
  ).bind(householdId).all()

  const insights = [
    "You've saved 15% more this week compared to last week. Keep it up!",
    "Subscriptions are taking up 22% of your monthly budget. Consider a 'Subscription Audit'.",
    `Your last transaction (${(transactions[0] as any)?.description || 'N/A'}) was successfully logged.`,
  ]

  return c.json({ insights })
})

// User Profile
app.get('/api/user/profile', async (c) => {
  const userId = c.get('userId')
  const { results } = await c.env.DB.prepare(
    'SELECT id, email, display_name, created_at FROM users WHERE id = ?'
  ).bind(userId).all()
  return c.json(results[0])
})

app.patch('/api/user/profile', async (c) => {
  const userId = c.get('userId')
  const { display_name } = await c.req.json()
  await c.env.DB.prepare(
    'UPDATE users SET display_name = ? WHERE id = ?'
  ).bind(display_name, userId).run()
  return c.json({ success: true })
})

// AI Coach
app.post('/api/coach/ask', async (c) => {
  const { question } = await c.req.json()
  const householdId = c.get('householdId')
  
  // 1. Get current stats for context
  const { results: transactions } = await c.env.DB.prepare('SELECT amount_cents FROM transactions WHERE household_id = ?').bind(householdId).all()
  const totalSpend = (transactions as any[]).reduce((sum, tx) => sum + tx.amount_cents, 0)

  // 2. Simple Heuristics (YOLO AI)
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

// Discord Interactions
app.post('/discord/interactions', async (c) => {
  const body = await c.req.json() as any
  
  // Handle Slash Commands
  if (body.type === 2) {
    const { name } = body.data
    if (name === 'cash-safety') {
      // Simulate fetching safety number for the user's default household
      return c.json({
        type: 4,
        data: {
          content: "🛡️ **CASH Safety Number**: You have **$1,420.50** spendable cash until your next payday. Drive safe!"
        }
      })
    }
  }

  return c.json({ type: 1 }) // PING response
})

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    if (event.cron === "0 0 * * 0") { // Every Sunday
      console.log("Running weekly pulse report...")
      // In a real scenario, this would iterate through households and send Discord reports.
      const webhookUrl = env.DISCORD_WEBHOOK_URL
      if (webhookUrl) {
         await fetch(webhookUrl, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             content: "📈 **Weekly Pulse**: Your household's financial health is looking strong this week! Check the dashboard for details."
           })
         })
      }
    }
  }
}
