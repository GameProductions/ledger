import React from 'react'
import { useReportData } from '../hooks/useReportData'
import { DashboardData } from '../types'
import { AreaChart } from '../charts/AreaChart'
import { BarChart } from '../charts/BarChart'
import { Price } from '../../Price'
import { Card } from '../../ui/Card'

export const OverviewTab: React.FC = () => {
  const { data: raw, loading } = useReportData<DashboardData>('/api/reports/dashboard')

  if (loading) return <div className="text-center py-12 text-xs font-black tracking-[0.2em] text-white/30">Loading overview...</div>
  if (!raw) return null
  const d = raw as any
  const data = d.success ? d.data : d

  const history = data.history || []
  const savingsRate = data.savingsRate ?? 0

  const netWorthData = history.map((h: any) => ({ date: h.date.slice(5), value: h.value }))

  const monthData = [
    { name: 'Income', amount: data.monthlyIncome || 0 },
    { name: 'Expenses', amount: -(data.monthlyExpense || 0) },
    { name: 'Net', amount: (data.monthlyIncome || 0) - (data.monthlyExpense || 0) },
  ]

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4 space-y-1">
          <div className="text-xs font-bold tracking-wider uppercase text-white/60">Net Worth</div>
          <Price amountCents={data.currentNetWorth || 0} className="text-lg font-black text-white" />
        </Card>
        <Card className="p-4 space-y-1">
          <div className="text-xs font-bold tracking-wider uppercase text-emerald-400/80">Monthly Income</div>
          <Price amountCents={data.monthlyIncome || 0} className="text-lg font-black text-emerald-400" />
        </Card>
        <Card className="p-4 space-y-1">
          <div className="text-xs font-bold tracking-wider uppercase text-red-400/80">Monthly Expenses</div>
          <Price amountCents={data.monthlyExpense || 0} className="text-lg font-black text-red-400" />
        </Card>
        <Card className="p-4 space-y-1">
          <div className="text-xs font-bold tracking-wider uppercase text-white/60">Savings Rate</div>
          <div className={`text-lg font-black ${savingsRate >= 20 ? 'text-emerald-400' : savingsRate >= 10 ? 'text-amber-400' : 'text-red-400'}`}>
            {savingsRate}%
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <AreaChart data={netWorthData} dataKey="value" title="Net Worth Over Time" subtitle="Historical trend" height={220} />
        </Card>
        <Card className="p-5">
          <BarChart data={monthData} series={[
            { dataKey: 'amount', name: 'Amount', color: '#10b981' },
          ]} xKey="name" title="Monthly Summary" subtitle="Income vs Expenses" height={220} />
        </Card>
      </div>

      <Card className="p-5">
        <div className="text-xs font-black tracking-widest text-white/50 mb-1">Daily Burn Rate</div>
        <div className="flex items-center gap-4">
          <Price amountCents={data.dailyBurnRate || 0} className="text-2xl font-black text-amber-400" />
          <span className="text-xs text-white/40 font-medium">per day average (last 30 days)</span>
        </div>
      </Card>
    </div>
  )
}
