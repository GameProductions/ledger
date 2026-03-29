import React, { useState, useMemo } from 'react'
import { Price } from './Price'
import { useApi } from '../hooks/useApi'

const WhatIfLedger: React.FC = () => {
  const { data: subs } = useApi('/api/planning/subscriptions')
  const [disabledSubs, setDisabledSubs] = useState<string[]>([])
  
  const originalTotal = useMemo(() => {
    return subs?.reduce((acc: number, sub: any) => acc + sub.amount_cents, 0) || 0
  }, [subs])

  const projectedTotal = useMemo(() => {
    return subs?.reduce((acc: number, sub: any) => {
      if (disabledSubs.includes(sub.id)) return acc
      return acc + sub.amount_cents
    }, 0) || 0
  }, [subs, disabledSubs])

  const savings = originalTotal - projectedTotal

  return (
    <section className="card">
      <h3>Savings Simulator</h3>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
        Simulate changes to your recurring expenses to see potential savings.
      </p>
      
      <div style={{ display: 'grid', gap: '0.8rem' }}>
        {subs?.map((sub: any) => (
          <label key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '0.5rem', background: disabledSubs.includes(sub.id) ? 'rgba(239, 68, 68, 0.1)' : 'transparent', borderRadius: '0.4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input 
                type="checkbox" 
                checked={!disabledSubs.includes(sub.id)} 
                onChange={() => {
                  if (disabledSubs.includes(sub.id)) {
                    setDisabledSubs(disabledSubs.filter(id => id !== sub.id))
                  } else {
                    setDisabledSubs([...disabledSubs, sub.id])
                  }
                }}
              />
              <span style={{ textDecoration: disabledSubs.includes(sub.id) ? 'line-through' : 'none' }}>{sub.name}</span>
            </div>
            <Price amountCents={sub.amount_cents} className="font-bold" />
          </label>
        ))}
      </div>

      <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span>Monthly Savings:</span>
          <span style={{ color: 'var(--primary)', fontWeight: '700' }}>+${(savings / 100).toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: '800' }}>
          <span>Estimated Balance:</span>
          <span style={{ background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            +${((124550 + savings) / 100).toFixed(2)}
          </span>
        </div>
      </div>
    </section>
  )
}

export default WhatIfLedger
