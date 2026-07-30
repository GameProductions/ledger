import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { HTTPException } from 'hono/http-exception'
import { Bindings, Variables } from '../types'
import { logAudit, apiError } from '../utils'
import { getDb } from '#/index'
import {
  transactions,
  categories,
  accounts,
  reports,
  serviceProviders,
  personalAccessTokens,
  userHouseholds,
  bills,
  subscriptions,
  paySchedules
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
  } catch (e: any) {
    // Ignore invalid or malformed URL parsing errors safely
  }
  return false
}

// Analysis & Insights (Plain English replacements for Analytics)
data.get('/analysis/summary', async (c) => {
  const householdId = c.get('householdId')
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const db = getDb(c.env)
  
  const incomeResult = (await db.select({ total: sql<number>`SUM(${transactions.amountCents})` })
      .from(transactions)
      .where(and(eq(transactions.householdId, householdId), gt(transactions.amountCents, 0), gte(transactions.transactionDate, startOfMonth)))
      .limit(1) as any)
  
  const expenseResult = (await db.select({ total: sql<number>`SUM(ABS(${transactions.amountCents}))` })
      .from(transactions)
      .where(and(eq(transactions.householdId, householdId), lt(transactions.amountCents, 0), gte(transactions.transactionDate, startOfMonth)))
      .limit(1) as any)
  
  const totalIncome = incomeResult[0]?.total || 0
  const totalExpense = expenseResult[0]?.total || 0
  const savings = totalIncome - totalExpense
  const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0
  
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const recentExpenseResult = (await db.select({ total: sql<number>`SUM(ABS(${transactions.amountCents}))` })
      .from(transactions)
      .where(and(eq(transactions.householdId, householdId), lt(transactions.amountCents, 0), gte(transactions.transactionDate, thirtyDaysAgo)))
      .limit(1) as any)
    
  const burnRate = (recentExpenseResult[0]?.total || 0) / 30
  
    return c.json({
    success: true,
    data: {
      healthScore: 85,
      monthlyIncome: totalIncome,
      monthlyExpense: totalExpense,
      savingsRate: Math.round(savingsRate),
      dailyBurnRate: Math.round(burnRate),
      safetyNumberCents: (savings * 6)
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
  const results = (await db.select({
      name: categories.name,
      color: categories.color,
      totalCents: sql<number>`SUM(ABS(${transactions.amountCents}))`
    })
    .from(transactions)
    .innerJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(eq(transactions.householdId, householdId), lt(transactions.amountCents, 0), gte(transactions.transactionDate, startDateStr)))
    .groupBy(categories.id)
    .orderBy(desc(sql`SUM(ABS(${transactions.amountCents}))`)) as any)

  return c.json({ success: true, data: results || [] })
})

data.get('/analysis/net-worth', async (c) => {
  const householdId = c.get('householdId')
  const db = getDb(c.env)
  
  const accsResult = (await db.select({ balanceCents: accounts.balanceCents }).from(accounts).where(eq(accounts.householdId, householdId)) as any)
  const netWorthCents = accsResult.reduce((sum: any, a: any) => sum + (a.balanceCents || 0), 0)
  
  const snapshots = (await db.select({ createdAt: reports.createdAt, dataJson: reports.dataJson })
      .from(reports)
      .where(and(eq(reports.householdId, householdId), eq(reports.type, 'net_worth_snapshot')))
      .orderBy(desc(reports.createdAt))
      .limit(6) as any)

  const history = (snapshots || []).map((s: any) => ({
    date: s.createdAt.split('T')[0],
    value: JSON.parse(s.dataJson).netWorthCents || JSON.parse(s.dataJson).net_worth_cents
  })).reverse()

  return c.json({
    success: true,
    data: {
      currentNetWorthCents: netWorthCents,
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
  
  const incomeResult = (await db.select({ total: sql<number>`SUM(${transactions.amountCents})` })
      .from(transactions)
      .where(and(eq(transactions.householdId, householdId), gt(transactions.amountCents, 0), gte(transactions.transactionDate, thirtyDaysAgo)))
      .limit(1) as any)
    
  const expenseResult = (await db.select({ total: sql<number>`SUM(ABS(${transactions.amountCents}))` })
      .from(transactions)
      .where(and(eq(transactions.householdId, householdId), lt(transactions.amountCents, 0), gte(transactions.transactionDate, thirtyDaysAgo)))
      .limit(1) as any)
    
  const monthlySurplus = (incomeResult[0]?.total || 0) - (expenseResult[0]?.total || 0)

  const accsResult = (await db.select({ balanceCents: accounts.balanceCents }).from(accounts).where(eq(accounts.householdId, householdId)) as any)
  const startingBalance = accsResult.reduce((sum: any, a: any) => sum + (a.balanceCents || 0), 0)
  
  const forecast = dates.map((date, i) => {
    const projectedBalance = startingBalance + (monthlySurplus * (i + 1))
    return { date, balanceCents: Math.round(projectedBalance) }
  })

  return c.json({ success: true, data: forecast || [] })
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
    const response = (await fetch(url) as any)
    const html = (await response.text() as any)
    
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
        websiteUrl: url,
        logoUrl: absoluteLogo,
        isSpreadsheet: isSpreadsheet,
        type
      }
    })
  } catch (err: any) {
    throw new HTTPException(500, { message: 'Failure to analyze the provided link' })
  }
})

// Unified Import Confirmation
data.post('/import/confirm', zValidator('json', z.object({
  type: z.enum(['transactions', 'providers', 'paychecks', 'ledger_spreadsheet']),
  scope: z.enum(['household', 'private']),
  data: z.any().optional(),
  // ledger_spreadsheet fields
  year: z.number().int().optional(),
  personMap: z.record(z.string(), z.string()).optional(),
  paychecks: z.array(z.object({
    label: z.string(),
    monthDates: z.record(z.string(), z.string()).optional(),
    income: z.record(z.string(), z.number()),
    additionalIncome: z.record(z.string(), z.number()).nullable().optional(),
    freeSpending: z.record(z.string(), z.number()).nullable().optional(),
    accountAllocations: z.array(z.object({
      bankName: z.string(),
      accountType: z.string(),
      userId: z.string(),
      amountCents: z.number().int()
    })).optional().default([]),
    expenses: z.array(z.object({
      billName: z.string(),
      payee: z.string(),
      categoryId: z.string().nullable().optional(),
      dueDate: z.string().nullable().optional(),
      frequency: z.string().nullable().optional(),
      ownerId: z.string(),
      amountCents: z.number().int(),
      notes: z.string().nullable().optional(),
      isRecurring: z.boolean(),
      paycheckDate: z.string().nullable().optional()
    })).optional().default([])
  })).optional().default([])
})), async (c) => {
  const userId = c.get('userId') as string
  const globalRole = c.get('globalRole') as string
  const reqData = c.req.valid('json')
  const { type } = reqData
  const householdId = reqData.scope === 'private' ? `personal-${userId}` : c.get('householdId') as string
  const db = getDb(c.env)

  // Check if caller is platform Owner
  const isPlatformOwner = globalRole === 'owner'

  // Check if caller is Household Owner
  let isHouseholdOwner = false
  if (!isPlatformOwner && reqData.scope !== 'private') {
    const membership = await db.select({ role: userHouseholds.role })
      .from(userHouseholds)
      .where(and(eq(userHouseholds.userId, userId), eq(userHouseholds.householdId, householdId)))
      .limit(1)
      .then(res => res[0]) as any;
    isHouseholdOwner = membership?.role === 'owner'
  }

  if (type === 'transactions') {
    const items: any[] = (reqData as any).data || []
    const distinctOwners = [...new Set(items.map((i: any) => i.ownerId).filter(Boolean))] as string[]
    
    let authorizedOwners: string[] = []
    if (isPlatformOwner) {
      authorizedOwners = distinctOwners
    } else if (isHouseholdOwner) {
      if (distinctOwners.length > 0) {
        const validMembers = (await db.select({ userId: userHouseholds.userId })
                .from(userHouseholds)
                .where(and(eq(userHouseholds.householdId, householdId), inArray(userHouseholds.userId, distinctOwners))) as any)
        authorizedOwners = validMembers.map((m: any) => m.userId)
      }
    } else {
      authorizedOwners = [userId]
    }

    const firstAccount = await db.select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.householdId, householdId))
      .limit(1)
      .then(res => res[0]?.id || null)

    let accountIdToUse = firstAccount
    if (!accountIdToUse) {
      const newAccountId = crypto.randomUUID()
      await db.insert(accounts).values({
        id: newAccountId,
        householdId,
        name: 'Default Import Account',
        type: 'checking',
        balanceCents: 0,
        currency: 'USD',
        status: 'active'
      })
      accountIdToUse = newAccountId
    }

    const records = items.map((item: any) => ({
      id: crypto.randomUUID(),
      householdId,
      accountId: accountIdToUse,
      description: item.description,
      amountCents: Math.round(item.amount * 100),
      transactionDate: item.date,
      notes: item.notes || null,
      ownerId: (item.ownerId && authorizedOwners.includes(item.ownerId)) ? item.ownerId : userId
    }))
    
    for (let i = 0; i < records.length; i += 100) {
      await db.insert(transactions).values(records.slice(i, i + 100))
    }
    
    await logAudit(c, 'import_export_hub', 'bulk_import', 'IMPORT', null, { type, scope: reqData.scope, count: items.length })
    return c.json({ success: true, count: items.length, target: householdId })
  }

  if (type === 'ledger_spreadsheet') {
    const { personMap, paychecks: importPaychecks } = reqData
    const counts = { paySchedules: 0, bills: 0, subscriptions: 0, transactions: 0 }

    for (const pc of importPaychecks || []) {
      const personIds = Object.values(personMap || {})
      const uniquePersonIds = [...new Set(personIds)]

      for (const personId of uniquePersonIds) {
        let incomeCents = 0
        for (const [personName, pid] of Object.entries(personMap || {})) {
          if (pid === personId) {
            incomeCents += (pc.income[personName] || 0)
          }
        }
        if (incomeCents > 0) {
          const psId = crypto.randomUUID()
          let firstDate = ''
          for (const d of Object.values(pc.monthDates || {})) {
            if (d) { firstDate = d; break }
          }
          await db.insert(paySchedules).values({
            id: psId,
            householdId,
            userId: personId,
            name: pc.label,
            frequency: 'monthly',
            nextPayDate: firstDate || null,
            estimatedAmountCents: Math.round(incomeCents),
          })
          counts.paySchedules++
        }
      }

      for (const expense of pc.expenses || []) {
        const eId = crypto.randomUUID()
        if (expense.isRecurring) {
          const duePart = expense.dueDate ? expense.dueDate : ''
          const catId = expense.categoryId || null
          await db.insert(bills).values({
            id: eId,
            householdId,
            name: expense.payee || expense.billName,
            amountCents: expense.amountCents,
            dueDate: duePart || Object.values(pc.monthDates || {})[0] || `${reqData.year}-01-01`,
            status: 'unpaid',
            notes: expense.notes || null,
            categoryId: catId,
            isRecurring: true,
            frequency: expense.frequency || 'monthly',
            ownerId: expense.ownerId || userId,
            payScheduleId: null,
            paycheckDate: expense.paycheckDate || null,
          })
          counts.bills++
        } else {
          let catId = expense.categoryId || null
          const firstAccount = await db.select({ id: accounts.id })
            .from(accounts)
            .where(eq(accounts.householdId, householdId))
            .limit(1)
            .then(res => res[0]?.id || null)
          await db.insert(transactions).values({
            id: eId,
            householdId,
            accountId: firstAccount || null,
            description: expense.payee || expense.billName,
            amountCents: expense.amountCents,
            transactionDate: expense.dueDate || Object.values(pc.monthDates || {})[0] || `${reqData.year}-01-01`,
            categoryId: catId,
            notes: expense.notes || null,
            ownerId: expense.ownerId || userId,
          })
          counts.subscriptions++
        }
      }

      for (const alloc of pc.accountAllocations || []) {
        const targetAccount = await db.select({ id: accounts.id })
          .from(accounts)
          .where(and(eq(accounts.householdId, householdId), eq(accounts.name, alloc.bankName)))
          .limit(1)
          .then(res => res[0] || null)
        if (targetAccount && alloc.amountCents > 0) {
          const tId = crypto.randomUUID()
          await db.insert(transactions).values({
            id: tId,
            householdId,
            accountId: targetAccount.id,
            description: `${pc.label} allocation to ${alloc.bankName}`,
            amountCents: alloc.amountCents,
            transactionDate: Object.values(pc.monthDates || {})[0] || `${reqData.year}-01-01`,
            ownerId: alloc.userId || userId,
          })
          counts.transactions++
        }
      }

      if (pc.additionalIncome) {
        for (const [personName, amount] of Object.entries(pc.additionalIncome)) {
          if (amount > 0) {
            const ownerId = personMap?.[personName] || userId
            const firstAccount = await db.select({ id: accounts.id })
              .from(accounts)
              .where(eq(accounts.householdId, householdId))
              .limit(1)
              .then(res => res[0]?.id || null)
            const tId = crypto.randomUUID()
            await db.insert(transactions).values({
              id: tId,
              householdId,
              accountId: firstAccount || null,
              description: `Additional income - ${pc.label}`,
              amountCents: Math.round(amount),
              transactionDate: Object.values(pc.monthDates || {})[0] || `${reqData.year}-01-01`,
              ownerId,
            })
            counts.transactions++
          }
        }
      }

      if (pc.freeSpending) {
        for (const [personName, amount] of Object.entries(pc.freeSpending)) {
          if (amount > 0) {
            const ownerId = personMap?.[personName] || userId
            const firstAccount = await db.select({ id: accounts.id })
              .from(accounts)
              .where(eq(accounts.householdId, householdId))
              .limit(1)
              .then(res => res[0]?.id || null)
            const tId = crypto.randomUUID()
            await db.insert(transactions).values({
              id: tId,
              householdId,
              accountId: firstAccount || null,
              description: `Free spending - ${pc.label}`,
              amountCents: Math.round(amount),
              transactionDate: Object.values(pc.monthDates || {})[0] || `${reqData.year}-01-01`,
              ownerId,
            })
            counts.transactions++
          }
        }
      }
    }

    await logAudit(c, 'import_export_hub', 'bulk_import', 'IMPORT', null, { type, scope: reqData.scope, counts })
    return c.json({ success: true, counts, target: householdId })
  }
  
  await logAudit(c, 'import_export_hub', 'bulk_import', 'IMPORT', null, { type, scope: reqData.scope })
  return c.json({ success: true, target: householdId })
})

// Webhooks
data.post('/webhooks/external', async (c) => {
  const payload = await c.req.json() as any
  console.log('[Connection Update]:', payload)
  return c.json({ success: true, data: { received: true } })
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
  
  const results = (await db.select().from(serviceProviders).where(and(...filters)) as any)
  return c.json({ success: true, data: results || [] })
})

// History (f.k.a. Reports)
data.get('/history', async (c) => {
  const householdId = c.get('householdId')
  const db = getDb(c.env)
  const results = (await db.select({
      id: reports.id,
      type: reports.type,
      periodStart: reports.periodStart,
      periodEnd: reports.periodEnd,
      createdAt: reports.createdAt
    }).from(reports).where(eq(reports.householdId, householdId)).orderBy(desc(reports.createdAt)) as any)
  
  return c.json({ success: true, data: results || [] })
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
  const tokenHash = (await hashToken(tokenValue) as any)
  
  const db = getDb(c.env)
  await db.insert(personalAccessTokens).values({
    id: crypto.randomUUID(),
    tokenHash: tokenHash, 
    householdId,
    name
  })
    
  // Return the raw token ONLY once
  return c.json({ success: true, data: { token: tokenValue } })
})

data.get('/tools/tokens', async (c) => {
  const householdId = c.get('householdId')
  const db = getDb(c.env)
  const results = (await db.select({
      id: personalAccessTokens.id,
      name: personalAccessTokens.name,
      createdAt: personalAccessTokens.createdAt
    }).from(personalAccessTokens).where(eq(personalAccessTokens.householdId, householdId)) as any)
  
  return c.json({ success: true, data: results || [] })
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
