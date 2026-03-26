import React, { useState } from 'react'
import { useApi } from '../hooks/useApi'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'

const Subscriptions: React.FC = () => {
  const { token, householdId } = useAuth()
  const { showToast } = useToast()
  const { data: subs, loading, mutate } = useApi('/api/subscriptions')
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
          const apiUrl = import.meta.env.VITE_API_URL.replace(/\/$/, '')
          fetch(`${apiUrl}/api/subscriptions`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'x-household-id': householdId || ''
            },
            body: JSON.stringify({
              name: formData.get('name'),
              amount_cents: Math.round(parseFloat(formData.get('amount') as string) * 100),
              billing_cycle: formData.get('cycle'),
              next_billing_date: formData.get('date'),
              trial_end_date: formData.get('trial_date') || null,
              is_trial: !!formData.get('trial_date')
            })
          }).then(() => {
            showToast('Subscription added!', 'success')
            setShowAdd(false)
            mutate()
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
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Next Billing</label>
              <input name="date" type="date" required style={{ width: '100%', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Trial Ends (Optional)</label>
              <input name="trial_date" type="date" style={{ width: '100%', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }} />
            </div>
          </div>
          <button type="submit" className="primary">Save Subscription</button>
        </form>
      )}

      <div style={{ display: 'grid', gap: '1rem' }}>
        {subs?.map((sub: any) => (
          <div key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.5rem' }}>
            <div>
              <div style={{ fontWeight: '600', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {sub.name}
                {sub.is_trial ? (
                  <span style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem', background: 'var(--secondary)', color: 'black', borderRadius: '0.25rem', fontWeight: '900' }}>TRIAL</span>
                ) : null}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {sub.is_trial ? `Trial Ends: ${sub.trial_end_date}` : `Due: ${sub.next_billing_date}`}
              </div>
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
