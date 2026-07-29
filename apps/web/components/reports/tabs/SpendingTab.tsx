import React, { useState } from 'react'
import { useReportData } from '../hooks/useReportData'
import { SpendingData, WEEKDAY_LABELS } from '../types'
import { TreemapChart } from '../charts/TreemapChart'
import { BarChart } from '../charts/BarChart'
import { AreaChart } from '../charts/AreaChart'
import { Card } from '../../ui/Card'
import { Price } from '../../Price'

interface SpendingTabProps {
  onDrillDown: (payload: { title: string; categoryIds?: string[]; description?: string; from?: string; to?: string; type?: string }) => void
}

export const SpendingTab: React.FC<SpendingTabProps> = ({ onDrillDown }) => {
  const { data: raw, loading } = useReportData<SpendingData>('/api/reports/spending')
  const [view, setView] = useState<'category' | 'merchant' | 'trend'>('category')

  if (loading) return <div className="text-center py-12 text-xs font-black tracking-[0.2em] text-white/30">Loading spending data...</div>
  if (!raw) return null
  const d = raw as any
  const data: SpendingData = d.success ? d.data : d

  const categories = (data.categories || []).filter(c => c.totalCents > 0)
  const totalSpend = data.totalSpend || 0

  const treemapData = categories.map(c => ({ name: c.name, value: c.totalCents, categoryId: c.categoryId }))
  const merchantData = (data.topMerchants || []).map(m => ({ name: m.name || 'Unknown', amount: m.totalCents, count: m.count }))
  const trendData = (data.trend || []).map((t: any) => ({ date: t.date?.slice(5) || t.date, amount: t.totalCents }))

  const weekdayData = WEEKDAY_LABELS.map((label, i) => {
    const wd = (data.weekday || []).find((w: any) => w.dayOfWeek === i)
    return { name: label.slice(0, 3), avg: wd?.avgCents || 0, count: wd?.count || 0 }
  })

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[8px] font-black tracking-widest text-white/30">Total Spend</div>
          <Price amountCents={totalSpend} className="text-2xl font-black text-white" />
        </div>
        <div className="flex gap-1 bg-white/5 rounded-xl p-1">
          {(['category', 'merchant', 'trend'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`text-[10px] font-black tracking-widest px-3 py-1.5 rounded-lg transition-all ${view === v ? 'bg-primary text-black' : 'text-white/50 hover:text-white'}`}
            >
              {v === 'category' ? 'Categories' : v === 'merchant' ? 'Merchants' : 'Trend'}
            </button>
          ))}
        </div>
      </div>

      {view === 'category' && (
        <Card className="p-5">
          <TreemapChart data={treemapData} title="Spending by Category" subtitle="Click to drill down"
            onClick={(entry: any) => onDrillDown({ title: `Transactions: ${entry.name}`, categoryIds: entry.categoryId ? [entry.categoryId] : undefined })}
          />
          <div className="flex flex-wrap gap-3 mt-4">
            {categories.slice(0, 8).map((c, i) => (
              <button key={i} onClick={() => onDrillDown({ title: `Transactions: ${c.name}`, categoryIds: c.categoryId ? [c.categoryId] : undefined })}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg hover:bg-white/10 transition-all text-xs"
              >
                <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                <span className="font-bold text-white/80">{c.name}</span>
                <span className="text-white/40">{c.percentage}%</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {view === 'merchant' && (
        <Card className="p-5">
          <BarChart data={merchantData} series={[{ dataKey: 'amount', name: 'Spent' }]} xKey="name"
            title="Top Merchants" subtitle="By total spend" height={Math.max(200, merchantData.length * 40)} layout="vertical"
            onClick={(entry: any) => onDrillDown({ title: `Transactions: ${entry.name}`, description: entry.name })}
          />
        </Card>
      )}

      {view === 'trend' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-5">
            <AreaChart data={trendData} dataKey="amount" title="Spending Trend" subtitle="Daily totals" height={220} />
          </Card>
          <Card className="p-5">
            <BarChart data={weekdayData} series={[{ dataKey: 'avg', name: 'Avg Spend' }]} xKey="name"
              title="By Day of Week" subtitle="Average daily spend" height={220} />
          </Card>
        </div>
      )}
    </div>
  )
}
