import React, { useMemo } from 'react'
import { useApi } from '../../../hooks/useApi'
import { useReportFilters } from '../context/ReportFilterContext'

const PRESETS = [
  { id: 'thisMonth', label: 'This Month', days: 0 },
  { id: 'lastMonth', label: 'Last Month', days: -1 },
  { id: 'last30', label: 'Last 30d', days: 30 },
  { id: 'last90', label: 'Last 90d', days: 90 },
  { id: 'thisYear', label: 'This Year', days: 0 },
  { id: 'custom', label: 'Custom', days: 0 },
]

function computePresetRange(preset: string): { from: string; to: string } {
  const now = new Date()
  const to = now.toISOString().split('T')[0]
  if (preset === 'thisMonth') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    return { from, to }
  }
  if (preset === 'lastMonth') {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const last = new Date(now.getFullYear(), now.getMonth(), 0)
    return { from: first.toISOString().split('T')[0], to: last.toISOString().split('T')[0] }
  }
  if (preset === 'last30') {
    const from = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0]
    return { from, to }
  }
  if (preset === 'last90') {
    const from = new Date(now.getTime() - 90 * 86400000).toISOString().split('T')[0]
    return { from, to }
  }
  if (preset === 'thisYear') {
    const from = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
    return { from, to }
  }
  return { from: to, to }
}

export const ReportFilters: React.FC = () => {
  const { filters, setDateRange, setFilters } = useReportFilters()
  const { data: accountsData } = useApi('/api/financials/accounts') as any
  const { data: categoriesData } = useApi('/api/financials/categories') as any

  const accounts: any[] = Array.isArray(accountsData) ? accountsData : []
  const categories: any[] = Array.isArray(categoriesData) ? categoriesData : []

  const handlePreset = (id: string) => {
    if (id === 'custom') {
      setFilters(prev => ({ ...prev, preset: 'custom' }))
      return
    }
    const range = computePresetRange(id)
    setDateRange(id, range.from, range.to)
  }

  const handleAccountToggle = (id: string) => {
    setFilters(prev => ({
      ...prev,
      accountIds: prev.accountIds.includes(id)
        ? prev.accountIds.filter(a => a !== id)
        : [...prev.accountIds, id],
    }))
  }

  const handleCategoryToggle = (id: string) => {
    setFilters(prev => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(id)
        ? prev.categoryIds.filter(c => c !== id)
        : [...prev.categoryIds, id],
    }))
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Date Presets */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1">
        {PRESETS.map(p => (
          <button key={p.id} onClick={() => handlePreset(p.id)}
            className={`text-[10px] font-black tracking-widest px-2.5 py-1.5 rounded-lg transition-all ${filters.preset === p.id ? 'bg-primary text-black' : 'text-white/50 hover:text-white'}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom date inputs */}
      {filters.preset === 'custom' && (
        <div className="flex items-center gap-2">
          <input type="date" value={filters.from} onChange={e => setFilters(prev => ({ ...prev, from: e.target.value }))}
            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none" />
          <span className="text-[10px] text-white/30">→</span>
          <input type="date" value={filters.to} onChange={e => setFilters(prev => ({ ...prev, to: e.target.value }))}
            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none" />
        </div>
      )}

      {/* Type filter */}
      <select value={filters.type} onChange={e => setFilters(prev => ({ ...prev, type: e.target.value as any }))}
        className="bg-white/5 border border-white/10 text-[10px] font-black tracking-widest px-2.5 py-1.5 rounded-xl text-secondary outline-none"
      >
        <option value="all">All</option>
        <option value="income">Income</option>
        <option value="expense">Expenses</option>
      </select>

      {/* Account filter */}
      {accounts.length > 0 && (
        <div className="relative group">
          <button className="bg-white/5 border border-white/10 text-[10px] font-black tracking-widest px-2.5 py-1.5 rounded-xl text-secondary hover:text-white transition-all">
            Accounts {filters.accountIds.length > 0 ? `(${filters.accountIds.length})` : ''}
          </button>
          <div className="absolute top-full left-0 mt-1 w-48 bg-deep border border-white/10 rounded-xl p-2 shadow-2xl z-20 hidden group-hover:block">
            {accounts.map((a: any) => (
              <label key={a.id} className="flex items-center gap-2 py-1 px-2 hover:bg-white/5 rounded-lg cursor-pointer text-xs">
                <input type="checkbox" checked={filters.accountIds.includes(a.id)} onChange={() => handleAccountToggle(a.id)}
                  className="rounded border-white/20 bg-white/5" />
                {a.name}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Category filter */}
      {categories.length > 0 && (
        <div className="relative group">
          <button className="bg-white/5 border border-white/10 text-[10px] font-black tracking-widest px-2.5 py-1.5 rounded-xl text-secondary hover:text-white transition-all">
            Categories {filters.categoryIds.length > 0 ? `(${filters.categoryIds.length})` : ''}
          </button>
          <div className="absolute top-full left-0 mt-1 w-48 bg-deep border border-white/10 rounded-xl p-2 shadow-2xl z-20 hidden group-hover:block">
            {categories.map((c: any) => (
              <label key={c.id} className="flex items-center gap-2 py-1 px-2 hover:bg-white/5 rounded-lg cursor-pointer text-xs">
                <input type="checkbox" checked={filters.categoryIds.includes(c.id)} onChange={() => handleCategoryToggle(c.id)}
                  className="rounded border-white/20 bg-white/5" />
                <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                {c.name}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
