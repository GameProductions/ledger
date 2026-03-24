import React, { useState } from 'react'
import { useApi } from '../hooks/useApi'

const Subscriptions: React.FC = () => {
  const { data: subs, loading } = useApi('/api/subscriptions')
  const [showAdd, setShowAdd] = useState(false)

  if (loading) return <div>Loading subscriptions...</div>

  return (
    <section className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3>Subscription Manager</h3>
        <button onClick={() => setShowAdd(!showAdd)} style={{ fontSize: '0.8rem' }}>
          {showAdd ? 'Cancel' : '+ New'}
        </button>
      </div>

      {showAdd && (
        <form style={{ marginBottom: '1.5rem', display: 'grid', gap: '0.5rem' }} onSubmit={(e) => {
          e.preventDefault()
          const formData = new FormData(e.currentTarget)
          fetch('http://localhost:8787/api/subscriptions', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('ledger_token')}`
            },
            body: JSON.stringify({
              name: formData.get('name'),
              amount_cents: Math.round(parseFloat(formData.get('amount') as string) * 100),
              billing_cycle: formData.get('cycle'),
              next_billing_date: formData.get('date')
            })
          }).then(() => {
            alert('Subscription added!')
            setShowAdd(false)
          })
        }}>
          <input name="name" placeholder="Service Name (Netflix, etc)" required style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }} />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input name="amount" type="number" step="0.01" placeholder="Amount" required style={{ flex: 1, padding: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }} />
            <select name="cycle" required style={{ flex: 1, padding: '0.5rem', background: 'var(--bg-dark)', border: '1px solid var(--glass-border)', color: 'white' }}>
              <option value="monthly">Monthly</option>
              <option value="annual">Annual</option>
            </select>
          </div>
          <input name="date" type="date" required style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }} />
          <button type="submit" className="primary">Save Subscription</button>
        </form>
      )}

      <div style={{ display: 'grid', gap: '1rem' }}>
        {subs?.map((sub: any) => (
          <div key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.5rem' }}>
            <div>
              <div style={{ fontWeight: '600' }}>{sub.name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Due: {sub.next_billing_date}</div>
            </div>
            <div style={{ fontWeight: '700', color: 'var(--expense)' }}>
              ${(sub.amount_cents / 100).toFixed(2)}
            </div>
          </div>
        ))}
        {subs?.length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No subscriptions tracked yet.</p>}
      </div>
    </section>
  )
}

export default Subscriptions
