import React from 'react'
import { useApi } from '../hooks/useApi'
import { Price } from './Price'

const BudgetProgress: React.FC = () => {
  const { data, loading } = (useApi<{ budgets: any[], unallocatedBalanceCents: number }>('/api/planning/budgets') as any)

  if (loading) return <div className="text-center py-8 text-xs font-black tracking-[0.2em] text-white/30">Loading budgets...</div>
  const budgets = data?.budgets || []

  return (
    <section className="card">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h3 className="text-lg font-black tracking-tighter italic">Budget Progress</h3>
        <span className="text-[10px] font-black tracking-widest px-3 py-1.5 bg-primary/10 text-primary rounded-full whitespace-nowrap">
          <Price amountCents={data?.unallocatedBalanceCents || 0} hideCents /> Unallocated
        </span>
      </div>
      <p className="text-xs text-secondary font-medium mb-6 w-full">Spending against monthly allowances.</p>
      <div className="space-y-4">
        {budgets?.map((budget: any) => {
          const totalAvailable = (budget.monthlyBudgetCents || 0) + (budget.envelopeBalanceCents || 0)
          const progress = Math.min((budget.spend_cents / totalAvailable) * 100, 100)
          
          return (
            <div key={budget.id}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-bold text-white">{budget.icon} {budget.name}</span>
                <div className="text-sm font-black tracking-tighter flex items-center gap-1">
                  <Price amountCents={budget.spend_cents} hideCents /> <span className="text-white/30">/</span> <Price amountCents={totalAvailable} hideCents />
                </div>
              </div>
              <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                <div
                  className="h-full transition-all duration-500 rounded-full"
                  style={{
                    width: `${progress}%`,
                    background: progress > 90 ? '#ef4444' : progress > 70 ? '#fbbf24' : budget.color || 'var(--primary)',
                  }}
                />
              </div>
              {budget.rollover_cents > 0 && (
                <div className="text-[10px] text-white/30 font-medium mt-1">
                  Includes <Price amountCents={budget.rollover_cents} hideCents /> rollover from last month
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default BudgetProgress
