import { Bindings } from '../types'
import { getDb } from '#/index'
import { transactions, categories, accounts, reports } from '#/schema'
import { eq, and, gte, lte, lt, gt, sql, inArray } from 'drizzle-orm'

export interface ReportQueryParams {
  householdId: string
  from?: string
  to?: string
  accountIds?: string[]
  categoryIds?: string[]
  type?: 'income' | 'expense' | 'all'
}

function dateClauses(params: ReportQueryParams) {
  const clauses = [eq(transactions.householdId, params.householdId)]
  if (params.from) clauses.push(gte(transactions.transactionDate, params.from))
  if (params.to) clauses.push(lte(transactions.transactionDate, params.to))
  if (params.accountIds?.length) clauses.push(inArray(transactions.accountId, params.accountIds))
  if (params.categoryIds?.length) clauses.push(inArray(transactions.categoryId, params.categoryIds))
  if (params.type === 'income') clauses.push(gt(transactions.amountCents, 0))
  else if (params.type === 'expense') clauses.push(lt(transactions.amountCents, 0))
  return and(...clauses)
}

export async function getDashboard(env: Bindings, params: ReportQueryParams) {
  const db = getDb(env)

  const accountBalances = await db.select({ total: sql<number>`SUM(${accounts.balanceCents})` })
    .from(accounts).where(eq(accounts.householdId, params.householdId)).limit(1)

  const currentNetWorth = accountBalances[0]?.total || 0

  const monthStart = new Date()
  monthStart.setDate(1)
  const msStr = monthStart.toISOString().split('T')[0]

  const income = await db.select({ total: sql<number>`COALESCE(SUM(${transactions.amountCents}), 0)` })
    .from(transactions).where(and(eq(transactions.householdId, params.householdId), gt(transactions.amountCents, 0), gte(transactions.transactionDate, msStr))).limit(1)

  const expense = await db.select({ total: sql<number>`COALESCE(SUM(ABS(${transactions.amountCents})), 0)` })
    .from(transactions).where(and(eq(transactions.householdId, params.householdId), lt(transactions.amountCents, 0), gte(transactions.transactionDate, msStr))).limit(1)

  const monthlyIncome = income[0]?.total || 0
  const monthlyExpense = expense[0]?.total || 0

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  const burnRaw = await db.select({ total: sql<number>`COALESCE(SUM(ABS(${transactions.amountCents})), 0)` })
    .from(transactions).where(and(eq(transactions.householdId, params.householdId), lt(transactions.amountCents, 0), gte(transactions.transactionDate, thirtyDaysAgo))).limit(1)

  const dailyBurnRate = Math.round((burnRaw[0]?.total || 0) / 30)

  const historyRows = await db.select({ date: reports.periodEnd, value: reports.dataJson })
    .from(reports).where(and(eq(reports.householdId, params.householdId), eq(reports.type, 'net_worth_snapshot')))
    .orderBy(sql`${reports.periodEnd} ASC`).limit(12)

  const history = historyRows.map(r => ({
    date: r.date,
    value: typeof r.value === 'string' ? JSON.parse(r.value).netWorthCents || 0 : (r.value as any)?.netWorthCents || 0,
  }))

  if (history.length === 0 || history[history.length - 1].date !== new Date().toISOString().split('T')[0]) {
    history.push({ date: new Date().toISOString().split('T')[0], value: currentNetWorth })
  }

  const savingsRate = monthlyIncome > 0 ? Math.round(((monthlyIncome - monthlyExpense) / monthlyIncome) * 100) : 0

  return { currentNetWorth, monthlyIncome, monthlyExpense, savingsRate, dailyBurnRate, history }
}

export async function getSpending(env: Bindings, params: ReportQueryParams) {
  const db = getDb(env)
  const where = dateClauses(params)

  const catSpending = await db.select({
    categoryId: transactions.categoryId,
    name: sql<string>`COALESCE(${categories.name}, 'Uncategorized')`,
    color: sql<string>`COALESCE(${categories.color}, '#6b7280')`,
    totalCents: sql<number>`COALESCE(SUM(ABS(${transactions.amountCents})), 0)`,
  })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(where, lt(transactions.amountCents, 0)))
    .groupBy(transactions.categoryId, categories.name, categories.color)
    .orderBy(sql`totalCents DESC`)

  const totalSpend = catSpending.reduce((s, c) => s + c.totalCents, 0)
  const categoriesWithPct = catSpending.map(c => ({ ...c, percentage: totalSpend > 0 ? Math.round((c.totalCents / totalSpend) * 100) : 0 }))

  const topMerchants = await db.select({
    name: transactions.description,
    totalCents: sql<number>`COALESCE(SUM(ABS(${transactions.amountCents})), 0)`,
    count: sql<number>`COUNT(*)`,
  })
    .from(transactions)
    .where(and(where, lt(transactions.amountCents, 0), sql`${transactions.description} IS NOT NULL`, sql`${transactions.description} != ''`))
    .groupBy(transactions.description)
    .orderBy(sql`totalCents DESC`)
    .limit(10)

  const trend = await db.select({
    date: transactions.transactionDate,
    totalCents: sql<number>`COALESCE(SUM(ABS(${transactions.amountCents})), 0)`,
  })
    .from(transactions)
    .where(and(where, lt(transactions.amountCents, 0)))
    .groupBy(transactions.transactionDate)
    .orderBy(sql`${transactions.transactionDate} ASC`)

  const weekday = await db.select({
    dayOfWeek: sql<number>`CAST(EXTRACT(DOW FROM ${transactions.transactionDate}::date) AS INTEGER)`,
    avgCents: sql<number>`COALESCE(CAST(AVG(ABS(${transactions.amountCents})) AS INTEGER), 0)`,
    count: sql<number>`COUNT(*)`,
  })
    .from(transactions)
    .where(and(where, lt(transactions.amountCents, 0)))
    .groupBy(sql`EXTRACT(DOW FROM ${transactions.transactionDate}::date)`)
    .orderBy(sql`dayOfWeek ASC`)

  return { categories: categoriesWithPct, totalSpend, topMerchants, trend, weekday }
}

export async function getBudget(env: Bindings, params: ReportQueryParams) {
  const db = getDb(env)
  const monthStart = new Date()
  monthStart.setDate(1)
  const msStr = monthStart.toISOString().split('T')[0]
  const monthEnd = new Date()
  monthEnd.setMonth(monthEnd.getMonth() + 1, 0)
  const meStr = monthEnd.toISOString().split('T')[0]
  const from = params.from || msStr
  const to = params.to || meStr

  const catWhere = eq(categories.householdId, params.householdId)

  const budgetData = await db.select({
    id: categories.id,
    name: categories.name,
    icon: categories.icon,
    color: categories.color,
    monthlyBudgetCents: sql<number>`COALESCE(${categories.monthlyBudgetCents}, 0)`,
    envelopeBalanceCents: sql<number>`COALESCE(${categories.envelopeBalanceCents}, 0)`,
    rolloverEnabled: categories.rolloverEnabled,
    emergencyFund: categories.emergencyFund,
  })
    .from(categories)
    .where(and(catWhere, sql`${categories.monthlyBudgetCents} > 0`))

  const spendRows = await db.select({
    categoryId: transactions.categoryId,
    spendCents: sql<number>`COALESCE(SUM(ABS(${transactions.amountCents})), 0)`,
  })
    .from(transactions)
    .where(and(eq(transactions.householdId, params.householdId), lt(transactions.amountCents, 0), gte(transactions.transactionDate, from), lte(transactions.transactionDate, to)))
    .groupBy(transactions.categoryId)

  const spendMap = new Map(spendRows.map(r => [r.categoryId, r.spendCents]))

  const budgets = budgetData.map(c => ({
    ...c,
    spendCents: spendMap.get(c.id) || 0,
    remainingCents: c.monthlyBudgetCents - (spendMap.get(c.id) || 0),
  }))

  const totalBudget = budgets.reduce((s, b) => s + b.monthlyBudgetCents, 0)
  const totalSpend = budgets.reduce((s, b) => s + b.spendCents, 0)

  return { budgets, totalBudget, totalSpend, periodStart: from, periodEnd: to }
}

export async function getCashFlow(env: Bindings, params: ReportQueryParams) {
  const db = getDb(env)
  const where = dateClauses(params)

  const monthlyTotals = await db.select({
    month: sql<string>`TO_CHAR(${transactions.transactionDate}::date, 'YYYY-MM')`,
    incomeCents: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.amountCents} > 0 THEN ${transactions.amountCents} ELSE 0 END), 0)`,
    expenseCents: sql<number>`COALESCE(SUM(ABS(CASE WHEN ${transactions.amountCents} < 0 THEN ${transactions.amountCents} ELSE 0 END)), 0)`,
  })
    .from(transactions)
    .where(where)
    .groupBy(sql`TO_CHAR(${transactions.transactionDate}::date, 'YYYY-MM')`)
    .orderBy(sql`month ASC`)

  const recurring = await db.select({
    isRecurring: transactions.isRecurring,
    totalCents: sql<number>`COALESCE(SUM(ABS(${transactions.amountCents})), 0)`,
  })
    .from(transactions)
    .where(and(where, lt(transactions.amountCents, 0)))
    .groupBy(transactions.isRecurring)

  const recurringCents = recurring.find(r => r.isRecurring)?.totalCents || 0
  const oneTimeCents = recurring.find(r => !r.isRecurring)?.totalCents || 0

  const balanceRows = await db.select({ total: sql<number>`SUM(${accounts.balanceCents})` })
    .from(accounts).where(eq(accounts.householdId, params.householdId)).limit(1)
  const currentBalance = balanceRows[0]?.total || 0

  const thirtyDayAvg = await db.select({ avg: sql<number>`CAST(AVG(daily) AS INTEGER)` })
    .from(db.select({
      daily: sql<number>`SUM(${transactions.amountCents})`,
    }).from(transactions)
      .where(and(eq(transactions.householdId, params.householdId), gte(transactions.transactionDate, new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0])))
      .groupBy(transactions.transactionDate).as('daily_totals'))

  const dailySurplus = thirtyDayAvg[0]?.avg || 0

  const forecast = Array.from({ length: 6 }, (_, i) => {
    const date = new Date()
    date.setMonth(date.getMonth() + i + 1)
    const projected = currentBalance + dailySurplus * 30 * (i + 1)
    return { month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`, balanceCents: projected }
  })

  return { monthlyTotals, recurringCents, oneTimeCents, currentBalance, dailySurplus, forecast }
}

export async function getCompare(env: Bindings, params: ReportQueryParams & { compareFrom?: string; compareTo?: string }) {
  const db = getDb(env)
  const primaryParams = { ...params }
  const compareParams = { ...params, from: params.compareFrom, to: params.compareTo }

  const primaryWhere = dateClauses(primaryParams)
  const compareWhere = dateClauses(compareParams)

  const primaryTotal = await db.select({ total: sql<number>`COALESCE(SUM(ABS(${transactions.amountCents})), 0)` })
    .from(transactions).where(and(primaryWhere, lt(transactions.amountCents, 0))).limit(1)
  const compareTotal = await db.select({ total: sql<number>`COALESCE(SUM(ABS(${transactions.amountCents})), 0)` })
    .from(transactions).where(and(compareWhere, lt(transactions.amountCents, 0))).limit(1)

  const primaryIncome = await db.select({ total: sql<number>`COALESCE(SUM(${transactions.amountCents}), 0)` })
    .from(transactions).where(and(primaryWhere, gt(transactions.amountCents, 0))).limit(1)
  const compareIncome = await db.select({ total: sql<number>`COALESCE(SUM(${transactions.amountCents}), 0)` })
    .from(transactions).where(and(compareWhere, gt(transactions.amountCents, 0))).limit(1)

  const catPrimary = await db.select({
    name: sql<string>`COALESCE(${categories.name}, 'Uncategorized')`,
    totalCents: sql<number>`COALESCE(SUM(ABS(${transactions.amountCents})), 0)`,
  })
    .from(transactions).leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(primaryWhere, lt(transactions.amountCents, 0)))
    .groupBy(categories.name).orderBy(sql`totalCents DESC`)

  const catCompare = await db.select({
    name: sql<string>`COALESCE(${categories.name}, 'Uncategorized')`,
    totalCents: sql<number>`COALESCE(SUM(ABS(${transactions.amountCents})), 0)`,
  })
    .from(transactions).leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(compareWhere, lt(transactions.amountCents, 0)))
    .groupBy(categories.name).orderBy(sql`totalCents DESC`)

  const catMap = new Map(catCompare.map(c => [c.name, c.totalCents]))
  const categoryDeltas = catPrimary.map(c => ({
    name: c.name,
    primaryCents: c.totalCents,
    compareCents: catMap.get(c.name) || 0,
    changeCents: c.totalCents - (catMap.get(c.name) || 0),
    changePct: catMap.get(c.name) && catMap.get(c.name)! > 0
      ? Math.round(((c.totalCents - catMap.get(c.name)!) / catMap.get(c.name)!) * 100)
      : 0,
  }))

  const expenseChange = compareTotal[0]?.total
    ? Math.round((((primaryTotal[0]?.total || 0) - compareTotal[0].total) / compareTotal[0].total) * 100)
    : 0
  const incomeChange = compareIncome[0]?.total
    ? Math.round((((primaryIncome[0]?.total || 0) - compareIncome[0].total) / compareIncome[0].total) * 100)
    : 0

  return {
    primaryPeriod: { from: params.from, to: params.to },
    comparePeriod: { from: params.compareFrom, to: params.compareTo },
    primaryExpenseCents: primaryTotal[0]?.total || 0,
    compareExpenseCents: compareTotal[0]?.total || 0,
    primaryIncomeCents: primaryIncome[0]?.total || 0,
    compareIncomeCents: compareIncome[0]?.total || 0,
    expenseChangePct: expenseChange,
    incomeChangePct: incomeChange,
    categoryDeltas: categoryDeltas.sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct)),
  }
}
