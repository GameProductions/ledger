import React from 'react'
import { useReportData } from '../hooks/useReportData'
import { CompareData } from '../types'
import { BarChart } from '../charts/BarChart'
import { Card } from '../../ui/Card'
import { Price } from '../../Price'
import { useReportFilters } from '../context/ReportFilterContext'

export const CompareTab: React.FC = () => {
  const { data: raw, loading } = useReportData<CompareData>('/api/reports/compare')
  const { filters } = useReportFilters()

  if (loading) return <div className="text-center py-12 text-xs font-black tracking-[0.2em] text-white/30">Loading comparison data...</div>
  if (!raw) return null
  const d = raw as any
  const data: CompareData = d.success ? d.data : d

  const primaryLabel = filters.preset === 'thisMonth' ? 'This Month' : filters.preset === 'lastMonth' ? 'Last Month' : `${data.primaryPeriod?.from || ''} to ${data.primaryPeriod?.to || ''}`
  const compareLabel = 'Previous Period'

  const compareChartData = [
    { name: 'Expenses', [primaryLabel]: data.primaryExpenseCents || 0, [compareLabel]: data.compareExpenseCents || 0 },
    { name: 'Income', [primaryLabel]: data.primaryIncomeCents || 0, [compareLabel]: data.compareIncomeCents || 0 },
  ]

  const deltas = (data.categoryDeltas || []).filter(d => d.primaryCents > 0 || d.compareCents > 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="text-[8px] font-black tracking-widest text-white/30">Expense Change</div>
          <div className={`text-lg font-black flex items-center gap-2 ${(data.expenseChangePct || 0) > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {data.expenseChangePct != null ? `${data.expenseChangePct > 0 ? '+' : ''}${data.expenseChangePct}%` : 'N/A'}
            {(data.expenseChangePct || 0) > 0 ? ' ↑' : (data.expenseChangePct || 0) < 0 ? ' ↓' : ''}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-[8px] font-black tracking-widest text-white/30">Income Change</div>
          <div className={`text-lg font-black flex items-center gap-2 ${(data.incomeChangePct || 0) > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {data.incomeChangePct != null ? `${data.incomeChangePct > 0 ? '+' : ''}${data.incomeChangePct}%` : 'N/A'}
            {(data.incomeChangePct || 0) > 0 ? ' ↑' : (data.incomeChangePct || 0) < 0 ? ' ↓' : ''}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <BarChart data={compareChartData} series={[
          { dataKey: primaryLabel, name: primaryLabel },
          { dataKey: compareLabel, name: compareLabel },
        ]} xKey="name" title="Period Comparison" subtitle={`${primaryLabel} vs ${compareLabel}`} height={250} />
      </Card>

      <Card className="p-5">
        <div className="text-xs font-black tracking-widest text-white/50 mb-3">Category Changes</div>
        <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
          {deltas.length === 0 ? (
            <div className="text-xs text-white/30 italic font-medium py-4 text-center">No comparison data available</div>
          ) : (
            deltas.map((c, i) => (
              <div key={i} className="flex items-center justify-between py-2 px-3 bg-white/[0.02] rounded-lg border border-white/5">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-xs font-bold text-white/80 truncate">{c.name}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <div className="text-[10px] text-white/40">Prev</div>
                    <Price amountCents={c.compareCents} className="text-xs font-bold text-white/60" />
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-white/40">Current</div>
                    <Price amountCents={c.primaryCents} className="text-xs font-bold text-white" />
                  </div>
                  <div className={`text-right min-w-[60px] ${c.changePct > 0 ? 'text-red-400' : c.changePct < 0 ? 'text-emerald-400' : 'text-white/40'}`}>
                    <div className="text-[10px]">Change</div>
                    <div className="text-xs font-black">{c.changePct > 0 ? '+' : ''}{c.changePct}%</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}
