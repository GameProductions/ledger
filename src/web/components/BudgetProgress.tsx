import React from 'react'
import { useApi } from '../hooks/useApi'
import { Price } from './Price'

const BudgetProgress: React.FC = () => {
  const { data, loading } = useApi<{ budgets: any[], unallocatedBalanceCents: number }>('/api/planning/budgets')

  if (loading) return <div>Loading budgets...</div>
  const budgets = data?.budgets || []

  return (
    <section className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0 }}>Budget Progress</h3>
        <span style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', background: 'var(--bg-dark)', borderRadius: '1rem', color: 'var(--primary)' }}>
          ${((data?.unallocatedBalanceCents || 0) / 100).toFixed(2)} Unallocated
        </span>
      </div>
      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {budgets?.map((budget: any) => {
          const totalAvailable = (budget.monthlyBudgetCents || 0) + (budget.envelopeBalanceCents || 0)
          const progress = Math.min((budget.spendCents / totalAvailable) * 100, 100)
          
          return (
            <div key={budget.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                <span>{budget.icon} {budget.name}</span>
                <div className="text-sm font-black tracking-tighter flex items-center gap-2">
                  <Price amountCents={budget.spendCents} hideCents /> / <Price amountCents={totalAvailable} hideCents />
                </div>
              </div>
              <div style={{ height: '8px', background: 'var(--bg-dark)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                <div style={{ 
                  height: '100%', 
                  width: `${progress}%`, 
                  background: progress > 90 ? 'var(--expense)' : (progress > 70 ? '#fbbf24' : budget.color || 'var(--primary)'),
                  transition: 'width 0.5s ease'
                }} />
              </div>
              {budget.rollover_cents > 0 && (
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  Includes ${(budget.rollover_cents / 100).toFixed(0)} rollover from last month
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
