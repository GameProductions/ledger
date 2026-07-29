export type TabId = 'overview' | 'spending' | 'budget' | 'cashflow' | 'compare'

export interface ReportFilters {
  from: string
  to: string
  preset: string
  accountIds: string[]
  categoryIds: string[]
  type: 'all' | 'income' | 'expense'
  compareFrom: string
  compareTo: string
}

export interface DrillDownPayload {
  from?: string
  to?: string
  categoryIds?: string[]
  accountIds?: string[]
  description?: string
  type?: 'income' | 'expense' | 'all'
  title: string
}

export interface DashboardData {
  currentNetWorth: number
  monthlyIncome: number
  monthlyExpense: number
  savingsRate: number
  dailyBurnRate: number
  history: { date: string; value: number }[]
}

export interface CategorySpend {
  categoryId: string | null
  name: string
  color: string
  totalCents: number
  percentage: number
}

export interface MerchantTotal {
  name: string
  totalCents: number
  count: number
}

export interface TrendPoint {
  date: string
  totalCents: number
}

export interface WeekdaySpend {
  dayOfWeek: number
  avgCents: number
  count: number
}

export interface SpendingData {
  categories: CategorySpend[]
  totalSpend: number
  topMerchants: MerchantTotal[]
  trend: TrendPoint[]
  weekday: WeekdaySpend[]
}

export interface BudgetCategory {
  id: string
  name: string
  icon: string | null
  color: string
  monthlyBudgetCents: number
  envelopeBalanceCents: number
  rolloverEnabled: boolean | null
  emergencyFund: boolean | null
  spendCents: number
  remainingCents: number
}

export interface BudgetData {
  budgets: BudgetCategory[]
  totalBudget: number
  totalSpend: number
  periodStart: string
  periodEnd: string
}

export interface MonthlyCashFlow {
  month: string
  incomeCents: number
  expenseCents: number
}

export interface CashFlowData {
  monthlyTotals: MonthlyCashFlow[]
  recurringCents: number
  oneTimeCents: number
  currentBalance: number
  dailySurplus: number
  forecast: { month: string; balanceCents: number }[]
}

export interface CategoryDelta {
  name: string
  primaryCents: number
  compareCents: number
  changeCents: number
  changePct: number
}

export interface CompareData {
  primaryPeriod: { from?: string; to?: string }
  comparePeriod: { from?: string; to?: string }
  primaryExpenseCents: number
  compareExpenseCents: number
  primaryIncomeCents: number
  compareIncomeCents: number
  expenseChangePct: number
  incomeChangePct: number
  categoryDeltas: CategoryDelta[]
}

export type ReportData = DashboardData | SpendingData | BudgetData | CashFlowData | CompareData

export const WEEKDAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
