import React from 'react'
import { Price } from './Price'
import { useApi } from '../hooks/useApi'

const SavingsBuckets: React.FC = () => {
  const { data: buckets } = useApi('/api/financials/buckets')

  return (
    <section className="card">
      <h3 style={{ marginBottom: '1.5rem' }}>📥 Virtual Savings Buckets</h3>
      <div style={{ display: 'grid', gap: '1rem' }}>
        {Array.isArray(buckets) && buckets.map((b: any) => (
          <div key={b.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
              <span>{b.name}</span>
              <span>{Math.round((b.current_cents / b.target_cents) * 100)}%</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'var(--bg-dark)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${(b.current_cents / b.target_cents) * 100}%`, height: '100%', background: 'var(--primary)' }}></div>
            </div>
            <div className="text-xs text-secondary font-medium">
              Goal: <Price amountCents={b.target_cents} options={{ minimumFractionDigits: 0 }} />
            </div>
          </div>
        )) || <p style={{ color: 'var(--text-secondary)' }}>No buckets yet.</p>}
        <button style={{ background: 'var(--bg-dark)', marginTop: '0.5rem' }}>+ Create New Bucket</button>
      </div>
    </section>
  )
}

export default SavingsBuckets
