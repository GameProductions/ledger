import { Hono } from 'hono'
import { Bindings, Variables } from '../types'
import { getDashboard, getSpending, getBudget, getCashFlow, getCompare, ReportQueryParams } from '../services/report.service'
import { apiError } from '../utils'

const reportsApi = new Hono<{ Bindings: Bindings, Variables: Variables }>()

function parseParams(c: any): ReportQueryParams & { compareFrom?: string; compareTo?: string } {
  const q = c.req.query()
  return {
    householdId: c.get('householdId'),
    from: q.from,
    to: q.to,
    accountIds: q.account_ids ? q.account_ids.split(',') : undefined,
    categoryIds: q.category_ids ? q.category_ids.split(',') : undefined,
    type: q.type || undefined,
    compareFrom: q.compare_from,
    compareTo: q.compare_to,
  }
}

reportsApi.get('/dashboard', async (c) => {
  try {
    const params = parseParams(c)
    const data = await getDashboard(c.env, params)
    return c.json({ success: true, data })
  } catch (e: any) {
    console.error('[Reports] Dashboard error:', e)
    return apiError(c, e.message, 'REPORT_ERROR', 'Failed to load dashboard report', 500)
  }
})

reportsApi.get('/spending', async (c) => {
  try {
    const params = parseParams(c)
    const data = await getSpending(c.env, params)
    return c.json({ success: true, data })
  } catch (e: any) {
    console.error('[Reports] Spending error:', e)
    return apiError(c, e.message, 'REPORT_ERROR', 'Failed to load spending report', 500)
  }
})

reportsApi.get('/budget', async (c) => {
  try {
    const params = parseParams(c)
    const data = await getBudget(c.env, params)
    return c.json({ success: true, data })
  } catch (e: any) {
    console.error('[Reports] Budget error:', e)
    return apiError(c, e.message, 'REPORT_ERROR', 'Failed to load budget report', 500)
  }
})

reportsApi.get('/cashflow', async (c) => {
  try {
    const params = parseParams(c)
    const data = await getCashFlow(c.env, params)
    return c.json({ success: true, data })
  } catch (e: any) {
    console.error('[Reports] Cashflow error:', e)
    return apiError(c, e.message, 'REPORT_ERROR', 'Failed to load cash flow report', 500)
  }
})

reportsApi.get('/compare', async (c) => {
  try {
    const params = parseParams(c)
    const data = await getCompare(c.env, params)
    return c.json({ success: true, data })
  } catch (e: any) {
    console.error('[Reports] Compare error:', e)
    return apiError(c, e.message, 'REPORT_ERROR', 'Failed to load comparison report', 500)
  }
})

export default reportsApi
