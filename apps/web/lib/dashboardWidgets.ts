export interface WidgetDef {
  id: string
  name: string
  desc: string
}

export interface DashboardTab {
  tabId: string
  tabLabel: string
  widgets: WidgetDef[]
}

export const DASHBOARD_TABS: DashboardTab[] = [
  {
    tabId: 'overview',
    tabLabel: 'Overview',
    widgets: [
      { id: 'calendar', name: 'Financial Calendar', desc: 'Monthly view of upcoming bills and income' },
      { id: 'transaction-ledger', name: 'Transaction Ledger', desc: 'Running list of all transactions' },
      { id: 'safe-to-spend', name: 'Safe to Spend', desc: 'Disposable income after obligations' },
    ],
  },
  {
    tabId: 'activity',
    tabLabel: 'Activity',
    widgets: [
      { id: 'recent-activity', name: 'Recent Activity', desc: 'Live feed of your latest transactions' },
      { id: 'spending-trend', name: 'Spending Trend', desc: 'Chart of spending over time' },
      { id: 'activity-heatmap', name: 'Activity Heatmap', desc: 'Visual calendar of daily spending' },
      { id: 'audit-chronicle', name: 'Audit Chronicle', desc: 'Change log and audit trail' },
      { id: 'add-transaction', name: 'Quick Add Transaction', desc: 'Fast entry for new transactions' },
    ],
  },
  {
    tabId: 'planning',
    tabLabel: 'Planning',
    widgets: [
      { id: 'future-balance', name: 'Future Balance', desc: 'Projected balances across dates' },
      { id: 'budget-categories', name: 'Budget Categories', desc: 'Category-based budget breakdown' },
      { id: 'pay-schedules-list', name: 'Pay Schedules', desc: 'Upcoming income schedule' },
      { id: 'pay-cycle-timeline', name: 'Pay Cycle Timeline', desc: 'Visual timeline of pay cycles' },
      { id: 'savings-buckets', name: 'Savings Buckets', desc: 'Progress towards savings goals' },
      { id: 'budget-progress', name: 'Budget Progress', desc: 'Budget vs actual tracking' },
      { id: 'transfer-form', name: 'Transfer Form', desc: 'Move money between accounts' },
      { id: 'bills-list', name: 'Bills List', desc: 'Upcoming and recurring bills' },
      { id: 'installments-list', name: 'Installments List', desc: 'Active installment plans' },
      { id: 'subscriptions', name: 'Subscriptions', desc: 'Active subscription manager' },
      { id: 'what-if-ledger', name: 'What-If Ledger', desc: 'Simulate financial scenarios' },
      { id: 'shared-balances', name: 'Shared Balances', desc: 'Multi-account balance overview' },
    ],
  },
  {
    tabId: 'insights',
    tabLabel: 'Insights',
    widgets: [
      { id: 'financial-health', name: 'Financial Health', desc: 'Health score and financial wellness' },
      { id: 'ai-coach', name: 'AI Coach', desc: 'AI-powered financial advice' },
      { id: 'smart-insights', name: 'AI Smart Insights', desc: 'Personalized recommendations' },
      { id: 'goal-seek', name: 'Goal Seek', desc: 'Goal-based savings planner' },
      { id: 'future-flow', name: 'Future Flow', desc: 'Cash flow forecasting' },
    ],
  },
]

export function getAllWidgets(): WidgetDef[] {
  return DASHBOARD_TABS.flatMap(t => t.widgets)
}

export type DashboardLayout = Record<string, { id: string; visible: boolean }[]>

export function toggleWidgetInLayout(layout: DashboardLayout | undefined, widgetId: string, defaultValue = true): DashboardLayout {
  const base: DashboardLayout = {}
  for (const tab of DASHBOARD_TABS) {
    const existing = layout?.[tab.tabId]
    if (existing) {
      base[tab.tabId] = existing.map(w => ({ ...w }))
    } else {
      base[tab.tabId] = tab.widgets.map(w => ({ id: w.id, visible: defaultValue }))
    }
  }
  for (const tab of DASHBOARD_TABS) {
    const found = base[tab.tabId].find(w => w.id === widgetId)
    if (found) {
      found.visible = !found.visible
      break
    }
  }
  return base
}
