import { TabId, DashboardData, SpendingData, BudgetData, CashFlowData, CompareData } from '../types'

interface CsvOutput { headers: string[]; rows: any[][] }

function formatCents(c: number): string { return (c / 100).toFixed(2) }

const FORMATTERS: Record<TabId, (data: any) => CsvOutput> = {
  overview: (data: DashboardData) => {
    const headers = ['Date', 'Net Worth']
    const rows = (data.history || []).map((h: any) => [h.date, formatCents(h.value)])
    return { headers, rows }
  },
  spending: (data: SpendingData) => {
    const headers = ['Category', 'Spend', 'Percentage']
    const rows = (data.categories || []).map((c: any) => [c.name, formatCents(c.totalCents), `${c.percentage}%`])
    return { headers, rows }
  },
  budget: (data: BudgetData) => {
    const headers = ['Category', 'Budget', 'Spent', 'Remaining', 'Utilization']
    const rows = (data.budgets || []).map((b: any) => {
      const pct = b.monthlyBudgetCents > 0 ? Math.round((b.spendCents / b.monthlyBudgetCents) * 100) : 0
      return [b.name, formatCents(b.monthlyBudgetCents), formatCents(b.spendCents), formatCents(b.remainingCents), `${pct}%`]
    })
    return { headers, rows }
  },
  cashflow: (data: CashFlowData) => {
    const headers = ['Month', 'Income', 'Expenses', 'Net']
    const rows = (data.monthlyTotals || []).map((m: any) => [m.month, formatCents(m.incomeCents), formatCents(m.expenseCents), formatCents(m.incomeCents - m.expenseCents)])
    return { headers, rows }
  },
  compare: (data: CompareData) => {
    const headers = ['Category', 'Previous', 'Current', 'Change', 'Change %']
    const rows = (data.categoryDeltas || []).map((c: any) => [c.name, formatCents(c.compareCents), formatCents(c.primaryCents), formatCents(c.changeCents), `${c.changePct}%`])
    return { headers, rows }
  },
}

export function formatCsv(tabId: TabId, data: any): CsvOutput {
  return FORMATTERS[tabId]?.(data) || { headers: [], rows: [] }
}
