import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { HTTPException } from 'hono/http-exception'
import { Bindings, Variables } from '../types'
import { logAudit, toSnake } from '../utils'
import { getDb } from '#/index'
import {
  transactions,
  categories,
  accounts,
  reports,
  serviceProviders,
  personalAccessTokens,
  userHouseholds
} from '#/schema'
import { eq, and, desc, asc, like, gt, lt, gte, or, sql, inArray } from 'drizzle-orm'
import { hashToken } from '../utils'

const data = new Hono<{ Bindings: Bindings, Variables: Variables }>()

const isPrivateIp = (url: string) => {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true
    
    // Check for common private IP ranges
    const parts = hostname.split('.').map(Number)
    if (parts.length === 4) {
      if (parts[0] === 10) return true
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true
      if (parts[0] === 192 && parts[1] === 168) return true
      if (parts[0] === 169 && parts[1] === 254) return true // Link-local / metadata
    }
  } catch (e) {}
  return false
}

// Analysis & Insights (Plain English replacements for Analytics)
data.get('/analysis/summary', async (c) => {
  const householdId = c.get('householdId')
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const db = getDb(c.env)
  
  const incomeResult = await db.select({ total: sql<number>`SUM(amount_cents)` })
    .from(transactions)
    .where(and(eq(transactions.householdId, householdId), gt(transactions.amountCents, 0), gte(transactions.transactionDate, startOfMonth)))
    .limit(1)
  
  const expenseResult = await db.select({ total: sql<number>`SUM(ABS(amount_cents))` })
    .from(transactions)
    .where(and(eq(transactions.householdId, householdId), lt(transactions.amountCents, 0), gte(transactions.transactionDate, startOfMonth)))
    .limit(1)
  
  const totalIncome = incomeResult[0]?.total || 0
  const totalExpense = expenseResult[0]?.total || 0
  const savings = totalIncome - totalExpense
  const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0
  
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const recentExpenseResult = await db.select({ total: sql<number>`SUM(ABS(amount_cents))` })
    .from(transactions)
    .where(and(eq(transactions.householdId, householdId), lt(transactions.amountCents, 0), gte(transactions.transactionDate, thirtyDaysAgo)))
    .limit(1)
    
  const burnRate = (recentExpenseResult[0]?.total || 0) / 30
  
    return c.json({
    success: true,
    data: {
      health_score: 85,
      monthly_income: totalIncome,
      monthly_expense: totalExpense,
      savings_rate: Math.round(savingsRate),
      daily_burn_rate: Math.round(burnRate),
      safety_number_cents: (savings * 6)
    }
  })
})

data.get('/analysis/category-spending', async (c) => {
  const householdId = c.get('householdId')
  const timeframe = c.req.query('timeframe') || '30d'
  
  const days = timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 365
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startDateStr = startDate.toISOString().split('T')[0]

  const db = getDb(c.env)
  const results = await db.select({
    name: categories.name,
    color: categories.color,
    total_cents: sql<number>`SUM(ABS(${transactions.amountCents}))`
  })
  .from(transactions)
  .innerJoin(categories, eq(transactions.categoryId, categories.id))
  .where(and(eq(transactions.householdId, householdId), lt(transactions.amountCents, 0), gte(transactions.transactionDate, startDateStr)))
  .groupBy(categories.id)
  .orderBy(desc(sql`SUM(ABS(${transactions.amountCents}))`))

  return c.json({ success: true, data: toSnake(results) || [] })
})

data.get('/analysis/net-worth', async (c) => {
  const householdId = c.get('householdId')
  const db = getDb(c.env)
  
  const accsResult = await db.select({ balanceCents: accounts.balanceCents }).from(accounts).where(eq(accounts.householdId, householdId))
  const netWorthCents = accsResult.reduce((sum, a) => sum + (a.balanceCents || 0), 0)
  
  const snapshots = await db.select({ createdAt: reports.createdAt, dataJson: reports.dataJson })
    .from(reports)
    .where(and(eq(reports.householdId, householdId), eq(reports.type, 'net_worth_snapshot')))
    .orderBy(desc(reports.createdAt))
    .limit(6)

  const history = (snapshots || []).map((s: any) => ({
    date: s.createdAt.split('T')[0],
    value: JSON.parse(s.dataJson).net_worth_cents
  })).reverse()

  return c.json({
    success: true,
    data: {
      current_net_worth_cents: netWorthCents,
      history
    }
  })
})

data.get('/analysis/insights', async (c) => {
  const insights = [
    "You've saved 15% more this week compared to last week. Keep it up!",
    "Subscriptions are taking up 22% of your monthly budget. Consider a review of your ongoing costs.",
    "Your financial patterns indicate strong budget adherence.",
  ]
  return c.json({ success: true, data: { insights } })
})

data.get('/analysis/forecast', async (c) => {
  const householdId = c.get('householdId')
  const now = new Date()
  const dates = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now)
    d.setMonth(now.getMonth() + i)
    return d.toISOString().split('T')[0]
  })
  
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const db = getDb(c.env)
  
  const incomeResult = await db.select({ total: sql<number>`SUM(amount_cents)` })
    .from(transactions)
    .where(and(eq(transactions.householdId, householdId), gt(transactions.amountCents, 0), gte(transactions.transactionDate, thirtyDaysAgo)))
    .limit(1)
    
  const expenseResult = await db.select({ total: sql<number>`SUM(ABS(amount_cents))` })
    .from(transactions)
    .where(and(eq(transactions.householdId, householdId), lt(transactions.amountCents, 0), gte(transactions.transactionDate, thirtyDaysAgo)))
    .limit(1)
    
  const monthlySurplus = (incomeResult[0]?.total || 0) - (expenseResult[0]?.total || 0)

  const accsResult = await db.select({ balanceCents: accounts.balanceCents }).from(accounts).where(eq(accounts.householdId, householdId))
  const startingBalance = accsResult.reduce((sum, a) => sum + (a.balanceCents || 0), 0)
  
  const forecast = dates.map((date, i) => {
    const projectedBalance = startingBalance + (monthlySurplus * (i + 1))
    return { date, balanceCents: Math.round(projectedBalance) }
  })

  return c.json({ success: true, data: toSnake(forecast) || [] })
})

// Universal Scraper
data.post('/scrape', zValidator('json', z.object({ 
  url: z.string().url(),
  type: z.enum(['provider', 'bank', 'billing']).default('provider')
})), async (c) => {
  const { url, type } = c.req.valid('json')
  
  // Audit Phase 4: SSRF Shielding
  if (isPrivateIp(url)) {
    throw new HTTPException(403, { message: 'Security Block: Internal network targets are prohibited.' })
  }

  try {
    const response = await fetch(url)
    const html = await response.text()
    
    // Basic metadata extraction
    const title = html.match(/<title>(.*?)<\/title>/i)?.[1] || url
    const description = html.match(/<meta name="description" content="(.*?)"/i)?.[1] || ""
    const logo = html.match(/<link rel="(?:icon|shortcut icon|apple-touch-icon)" href="(.*?)"/i)?.[1]
    
    let absoluteLogo = logo
    if (logo && !logo.startsWith('http')) {
      const baseUrl = new URL(url)
      absoluteLogo = `${baseUrl.origin}${logo.startsWith('/') ? '' : '/'}${logo}`
    }

    const isSpreadsheet = url.endsWith('.csv') || url.includes('docs.google.com/spreadsheets') || url.includes('export=csv')

    return c.json({
      success: true,
      data: {
        name: title.split('|')[0].trim(),
        description,
        website_url: url,
        logo_url: absoluteLogo,
        is_spreadsheet: isSpreadsheet,
        type
      }
    })
  } catch (err) {
    throw new HTTPException(500, { message: 'Failure to analyze the provided link' })
  }
})

// Unified Import Confirmation
data.post('/import/confirm', zValidator('json', z.object({
  type: z.enum(['transactions', 'providers', 'paychecks']),
  scope: z.enum(['household', 'private']),
  data: z.array(z.object({
    description: z.string(),
    amount: z.number(),
    date: z.string(),
    category: z.string().optional(),
    notes: z.string().optional(),
    owner_id: z.string().optional()
  }))
})), async (c) => {
  const userId = c.get('userId')
  const reqData = c.req.valid('json')
  const householdId = reqData.scope === 'private' ? `personal-${userId}` : c.get('householdId')
  const { type, data: items } = reqData
  const db = getDb(c.env)

  if (type === 'transactions') {
    const db = getDb(c.env)
    // Audit Phase 4: Identity Guarding
    // Verify that all owner_ids in the import belong to the current household
    const distinctOwners = [...new Set(items.map(i => i.owner_id).filter(Boolean))] as string[]
    
    let authorizedOwners: string[] = []
    if (distinctOwners.length > 0) {
      const validMembers = await db.select({ userId: userHouseholds.userId })
        .from(userHouseholds)
        .where(and(eq(userHouseholds.householdId, householdId), inArray(userHouseholds.userId, distinctOwners)))
      authorizedOwners = validMembers.map(m => m.userId)
    }

    const records = items.map(item => ({
      id: crypto.randomUUID(),
      householdId,
      accountId: 'default-import-account',
      description: item.description,
      amountCents: Math.round(item.amount * 100),
      transactionDate: item.date,
      notes: item.notes || null,
      ownerId: (item.owner_id && authorizedOwners.includes(item.owner_id)) ? item.owner_id : userId
    }))
    
    // Chunk inserts due to D1 limits (100 rows per batch recommended)
    for (let i = 0; i < records.length; i += 100) {
      await db.insert(transactions).values(records.slice(i, i + 100))
    }
  }
  
  await logAudit(c, 'data_center', 'bulk_import', 'IMPORT', null, { type, scope: reqData.scope, count: items.length })
  
  return c.json({ success: true, count: items.length, target: householdId })
})

// Webhooks
data.post('/webhooks/external', async (c) => {
  const payload = await c.req.json() as any
  console.log('[Connection Update]:', payload)
  return c.json({ received: true })
})

// Service Providers
data.get('/providers', async (c) => {
  const userId = c.get('userId')
  const householdId = c.get('householdId')
  const q = c.req.query('q')
  const db = getDb(c.env)
  
  const filters: any[] = [
    or(
      eq(serviceProviders.visibility, 'public'),
      and(eq(serviceProviders.visibility, 'household'), eq(serviceProviders.householdId, householdId)),
      and(eq(serviceProviders.visibility, 'private'), eq(serviceProviders.createdBy, userId))
    )
  ];

  if (q) {
    filters.push(like(serviceProviders.name, `%${q}%`))
  }
  
  const results = await db.select().from(serviceProviders).where(and(...filters))
  return c.json({ success: true, data: (results || []).map(toSnake) })
})

// History (f.k.a. Reports)
data.get('/history', async (c) => {
  const householdId = c.get('householdId')
  const db = getDb(c.env)
  const results = await db.select({
    id: reports.id,
    type: reports.type,
    period_start: reports.periodStart,
    period_end: reports.periodEnd,
    created_at: reports.createdAt
  }).from(reports).where(eq(reports.householdId, householdId)).orderBy(desc(reports.createdAt))
  
  return c.json({ success: true, data: toSnake(results) || [] })
})

data.post('/history/lock', async (c) => {
  const householdId = c.get('householdId')
  const { type } = await c.req.json() as { type: string }
  const id = crypto.randomUUID()
  const db = getDb(c.env)
  
  await db.insert(reports).values({
    id,
    householdId,
    type
  })
    
  return c.json({ success: true, id })
})

// Developer tools
data.post('/tools/tokens', zValidator('json', z.object({ name: z.string().min(1).max(50) })), async (c) => {
  const householdId = c.get('householdId')
  const { name } = c.req.valid('json')
  
  // Audit Phase 4: Cryptographic Hashing for PATs
  const rawToken = crypto.randomUUID().replace(/-/g, '')
  const tokenValue = `ledger_${rawToken}`
  const tokenHash = await hashToken(tokenValue)
  
  const db = getDb(c.env)
  await db.insert(personalAccessTokens).values({
    id: tokenHash, // Use hash as ID for lookup
    householdId,
    name
  })
    
  // Return the raw token ONLY once
  return c.json({ token: tokenValue })
})

data.get('/tools/tokens', async (c) => {
  const householdId = c.get('householdId')
  const db = getDb(c.env)
  const results = await db.select({
    id: personalAccessTokens.id,
    name: personalAccessTokens.name,
    created_at: personalAccessTokens.createdAt
  }).from(personalAccessTokens).where(eq(personalAccessTokens.householdId, householdId))
  
  return c.json({ success: true, data: toSnake(results) || [] })
})

data.patch('/tools/tokens/:id', zValidator('json', z.object({ name: z.string().min(1).max(100) })), async (c) => {
  const householdId = c.get('householdId')
  const id = c.req.param('id')
  const { name } = c.req.valid('json')
  const db = getDb(c.env)
  
  await db.update(personalAccessTokens)
    .set({ name })
    .where(and(eq(personalAccessTokens.id, id), eq(personalAccessTokens.householdId, householdId)))
    
  return c.json({ success: true })
})

data.delete('/tools/tokens/:id', async (c) => {
  const householdId = c.get('householdId')
  const id = c.req.param('id')
  const db = getDb(c.env)
  
  await db.delete(personalAccessTokens)
    .where(and(eq(personalAccessTokens.id, id), eq(personalAccessTokens.householdId, householdId)))
    
  return c.json({ success: true })
})

export default data
