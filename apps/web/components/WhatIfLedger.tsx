import React, { useState, useMemo } from 'react'
import { Price } from './Price'
import { useApi } from '../hooks/useApi'

import { Checkbox } from './ui/Checkbox'

const WhatIfLedger: React.FC = () => {
  const { data: subs } = (useApi('/api/planning/subscriptions') as any)
  const [disabledSubs, setDisabledSubs] = useState<string[]>([])
  
  const originalTotal = useMemo(() => {
    return subs?.reduce((acc: number, sub: any) => acc + sub.amountCents, 0) || 0
  }, [subs])

  const projectedTotal = useMemo(() => {
    return subs?.reduce((acc: number, sub: any) => {
      if (disabledSubs.includes(sub.id)) return acc
      return acc + sub.amountCents
    }, 0) || 0
  }, [subs, disabledSubs])

  const savings = originalTotal - projectedTotal

  return (
    <section className="card">
      <h3 className="mb-1">Savings Simulator</h3>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
        Uncheck subscriptions or bills to see how much money you would save each month if you cancelled them, along with your new estimated balance.
      </p>
      
      <div style={{ display: 'grid', gap: '0.8rem' }}>
                {Array.isArray(subs) && (subs as any[]).map((sub: any) => (
          <label key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '0.5rem', background: disabledSubs.includes(sub.id) ? 'rgba(239, 68, 68, 0.1)' : 'transparent', borderRadius: '0.4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Checkbox 
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
            <Price amountCents={sub.amountCents} className="font-bold" />
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
