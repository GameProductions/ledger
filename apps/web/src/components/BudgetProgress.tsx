import React from 'react'
import { useApi } from '../hooks/useApi'

const BudgetProgress: React.FC = () => {
  const { data: budgets, loading } = useApi('/api/budgets')

  if (loading) return <div>Loading budgets...</div>

  return (
    <section className="card">
      <h3>Budget Progress</h3>
      <div style={{ display: 'grid', gap: '1.5rem', marginTop: '1rem' }}>
        {budgets?.map((budget: any) => {
          const totalAvailable = budget.monthly_budget_cents + budget.rollover_cents
          const progress = Math.min((budget.spend_cents / totalAvailable) * 100, 100)
          
          return (
            <div key={budget.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                <span>{budget.icon} {budget.name}</span>
                <span style={{ fontWeight: '600' }}>
                  ${(budget.spend_cents / 100).toFixed(0)} / ${(totalAvailable / 100).toFixed(0)}
                </span>
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
