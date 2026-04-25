import React, { useState } from 'react'

const GoalSeek: React.FC = () => {
  const [target, setTarget] = useState(5000)
  const [months, setMonths] = useState(6)

  const monthlyRequired = Math.round(target / months)

  return (
    <section className="card">
      <h3 style={{ marginBottom: '1.5rem' }}>🎯 Goal-Seek Engine</h3>
      <div style={{ display: 'grid', gap: '1rem' }}>
        <div>
          <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.4rem' }}>Savings Goal ($)</label>
          <input type="number" value={target} onChange={(e) => setTarget(Number(e.target.value))} />
        </div>
        <div>
          <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.4rem' }}>Timeframe (Months)</label>
          <input type="number" value={months} onChange={(e) => setMonths(Number(e.target.value))} />
        </div>
        <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-dark)', borderRadius: '0.5rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Monthly Savings Required:</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>${monthlyRequired.toLocaleString()}</div>
        </div>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>To achieve this, we recommend reducing 'Discretionary' spending by 15% across all categories.</p>
      </div>
    </section>
  )
}

export default GoalSeek
