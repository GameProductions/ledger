import React, { useState } from 'react'
import { useReportData } from '../hooks/useReportData'
import { CashFlowData } from '../types'
import { AreaChart } from '../charts/AreaChart'
import { BarChart } from '../charts/BarChart'
import { Card } from '../../ui/Card'
import { Price } from '../../Price'

export const CashFlowTab: React.FC = () => {
  const { data: raw, loading } = useReportData<CashFlowData>('/api/reports/cashflow')
  const [view, setView] = useState<'history' | 'forecast'>('history')

  if (loading) return <div className="text-center py-12 text-xs font-black tracking-[0.2em] text-white/30">Loading cash flow data...</div>
  if (!raw) return null
  const d = raw as any
  const data: CashFlowData = d.success ? d.data : d

  const monthly = (data.monthlyTotals || []).map((m: any) => ({ month: m.month, income: m.incomeCents || 0, expenses: -(m.expenseCents || 0), net: (m.incomeCents || 0) - (m.expenseCents || 0) }))
  const forecast = (data.forecast || []).map((f: any) => ({ date: f.month, balance: f.balanceCents || 0 }))

  const recurringData = [
    { name: 'Recurring', amount: data.recurringCents || 0 },
    { name: 'One-Time', amount: data.oneTimeCents || 0 },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-xs font-bold tracking-wider uppercase text-white/60">Current Balance</div>
          <Price amountCents={data.currentBalance || 0} className="text-lg font-black text-white" />
        </Card>
        <Card className="p-4">
          <div className="text-xs font-bold tracking-wider uppercase text-emerald-400/80">Daily Surplus</div>
          <Price amountCents={data.dailySurplus || 0} className="text-lg font-black text-emerald-400" />
        </Card>
        <Card className="p-4">
          <div className="text-xs font-bold tracking-wider uppercase text-amber-400/80">Recurring</div>
          <Price amountCents={data.recurringCents || 0} className="text-lg font-black text-amber-400" />
        </Card>
        <Card className="p-4">
          <div className="text-xs font-bold tracking-wider uppercase text-blue-400/80">One-Time</div>
          <Price amountCents={data.oneTimeCents || 0} className="text-lg font-black text-blue-400" />
        </Card>
      </div>

      <div className="flex gap-1 bg-white/5 rounded-xl p-1 w-fit">
        {(['history', 'forecast'] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`text-[10px] font-black tracking-widest px-3 py-1.5 rounded-lg transition-all ${view === v ? 'bg-primary text-black' : 'text-white/50 hover:text-white'}`}
          >
            {v === 'history' ? 'Monthly History' : 'Forecast'}
          </button>
        ))}
      </div>

      {view === 'history' ? (
        <Card className="p-5">
          <BarChart data={monthly} series={[
            { dataKey: 'income', name: 'Income', color: '#10b981' },
            { dataKey: 'expenses', name: 'Expenses', color: '#ef4444' },
          ]} xKey="month" title="Monthly Income vs Expenses" height={250} />
        </Card>
      ) : (
        <Card className="p-5">
          <AreaChart data={forecast} dataKey="balance" title="Projected Balance" subtitle="6-month forecast" height={250} color="#8b5cf6" />
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <BarChart data={recurringData} series={[{ dataKey: 'amount', name: 'Total' }]} xKey="name"
            title="Recurring vs One-Time" subtitle="Expense breakdown" height={200} />
        </Card>
        <Card className="p-5">
          <div className="text-xs font-black tracking-widest text-white/50 mb-3">Cash Flow Summary</div>
          <div className="space-y-3">
            {monthly.slice(-6).map((m: any) => (
              <div key={m.month} className="flex items-center justify-between py-1.5 border-b border-white/5">
                <span className="text-xs font-bold text-white/70">{m.month}</span>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] text-emerald-400">+${(m.income / 100).toLocaleString()}</span>
                  <span className="text-[10px] text-red-400">-${(Math.abs(m.expenses) / 100).toLocaleString()}</span>
                  <span className={`text-xs font-black ${m.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    ${(m.net / 100).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
