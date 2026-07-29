import React from 'react'
import { useReportData } from '../hooks/useReportData'
import { BudgetData } from '../types'
import { BarChart } from '../charts/BarChart'
import { Card } from '../../ui/Card'
import { Price } from '../../Price'
import { colorForIndex } from '../charts/chartTheme'

export const BudgetTab: React.FC = () => {
  const { data: raw, loading } = useReportData<BudgetData>('/api/reports/budget')

  if (loading) return <div className="text-center py-12 text-xs font-black tracking-[0.2em] text-white/30">Loading budget data...</div>
  if (!raw) return null
  const d = raw as any
  const data: BudgetData = d.success ? d.data : d

  const budgets = data.budgets || []
  const chartData = budgets.map((b, i) => ({
    name: b.name,
    Budget: b.monthlyBudgetCents,
    Spent: b.spendCents,
    budgetColor: colorForIndex(i),
    spentColor: colorForIndex(i + 5),
  }))

  const totalBudget = data.totalBudget || 0
  const totalSpend = data.totalSpend || 0
  const remaining = totalBudget - totalSpend
  const overspent = remaining < 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="text-[8px] font-black tracking-widest text-white/30">Total Budget</div>
          <Price amountCents={totalBudget} className="text-lg font-black text-white" />
        </Card>
        <Card className="p-4">
          <div className="text-[8px] font-black tracking-widest text-white/30">Total Spent</div>
          <Price amountCents={totalSpend} className="text-lg font-black text-amber-400" />
        </Card>
        <Card className="p-4">
          <div className="text-[8px] font-black tracking-widest text-white/30">{overspent ? 'Overspent' : 'Remaining'}</div>
          <Price amountCents={Math.abs(remaining)} className={`text-lg font-black ${overspent ? 'text-red-400' : 'text-emerald-400'}`} />
        </Card>
      </div>

      {chartData.length > 0 && (
        <Card className="p-5">
          <BarChart data={chartData} series={[
            { dataKey: 'Budget', name: 'Budget' },
            { dataKey: 'Spent', name: 'Spent' },
          ]} xKey="name" title="Budget vs Actual" subtitle="Per category" height={250} />
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {budgets.map((b, i) => {
          const pct = b.monthlyBudgetCents > 0 ? Math.round((b.spendCents / b.monthlyBudgetCents) * 100) : 0
          const isOver = pct > 100
          return (
            <Card key={b.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: colorForIndex(i) }} />
                  <span className="text-sm font-bold text-white/80">{b.name}</span>
                </div>
                <span className={`text-[10px] font-black tracking-widest px-1.5 py-0.5 rounded ${isOver ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                  {pct}%
                </span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(pct, 100)}%`, background: isOver ? '#ef4444' : colorForIndex(i) }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-white/40 font-medium">
                <Price amountCents={b.spendCents} />
                <Price amountCents={b.monthlyBudgetCents} />
              </div>
              {b.rolloverEnabled && (
                <div className="text-[9px] text-primary/60 font-black tracking-widest">Rollover</div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
