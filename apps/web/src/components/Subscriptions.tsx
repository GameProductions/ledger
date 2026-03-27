import React, { useState } from 'react'
import { useApi } from '../hooks/useApi'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { Link } from 'lucide-react'

import { Price } from './Price'
import { SearchableSelect } from './ui/SearchableSelect'

const Subscriptions: React.FC = () => {
  const { token, householdId } = useAuth()
  const { showToast } = useToast()
  const { data: subs, loading, mutate } = useApi('/api/subscriptions')
  const { data: linkedAccounts } = useApi('/api/user/linked-accounts')
  const [showAdd, setShowAdd] = useState(false)

  if (loading) return <div>Loading subscriptions...</div>

  return (
    <section className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 className="text-lg font-black tracking-tighter uppercase italic underline decoration-primary/40 underline-offset-4">Subscription Manager</h3>
        <button onClick={() => setShowAdd(!showAdd)} className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-white/5 border border-white/5 rounded-full hover:bg-white/10 transition-all">
          {showAdd ? 'Cancel' : '+ New Strategy'}
        </button>
      </div>

      {showAdd && (
        <form style={{ marginBottom: '1.5rem', display: 'grid', gap: '0.8rem' }} className="p-4 rounded-xl bg-white/2 border border-white/5" onSubmit={(e) => {
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
              is_trial: !!formData.get('trial_date'),
              provider_account_id: formData.get('linked_account') || null
            })
          }).then(() => {
            showToast('Subscription added!', 'success')
            setShowAdd(false)
            mutate()
          })
        }}>
          <div className="grid grid-cols-2 gap-3">
             <input name="name" placeholder="Service Name (Netflix, etc)" required className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-sm" />
             <div className="relative">
               <SearchableSelect 
                  options={linkedAccounts?.map((acc: any) => ({
                    value: acc.id,
                    label: acc.provider_name,
                    metadata: { email: acc.email_attached }
                  })) || []}
                  value="" // Value managed by form usually, but for SearchableSelect we need a way to pass this.
                  onChange={(val) => {
                    const hiddenInput = document.getElementById('hidden-linked-account') as HTMLInputElement;
                    if (hiddenInput) hiddenInput.value = val;
                  }}
                  placeholder="Link Account..."
               />
               <input type="hidden" name="linked_account" id="hidden-linked-account" />
             </div>
          </div>
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
          <button type="submit" className="primary py-3 font-black uppercase text-[10px] tracking-widest mt-2">Activate Subscription Tracking</button>
        </form>
      )}

      <div style={{ display: 'grid', gap: '1rem' }}>
        {subs?.map((sub: any) => (
          <div key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div>
              <div style={{ fontWeight: '800', display: 'flex', gap: '0.5rem', alignItems: 'center' }} className="text-sm tracking-tight">
                {sub.name}
                {sub.is_trial ? (
                  <span style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem', background: 'var(--secondary)', color: 'black', borderRadius: '0.25rem', fontWeight: '900' }}>TRIAL</span>
                ) : null}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }} className="mt-0.5 font-medium opacity-60">
                {sub.is_trial ? `Trial Ends: ${sub.trial_end_date}` : `Due: ${sub.next_billing_date}`}
              </div>
              {sub.provider_account_id && (
                <div className="flex items-center gap-1.5 mt-2 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest text-amber-500 w-fit">
                   <Link size={10} /> Account Linked
                </div>
              )}
            </div>
            <div className="flex flex-col items-end">
              <Price amountCents={sub.amount_cents} className="font-black tracking-tighter text-lg" />
              <div className="text-[9px] text-secondary uppercase font-black tracking-widest opacity-40 italic">{sub.billing_cycle}</div>
            </div>
          </div>
        ))}
        {subs?.length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No subscriptions tracked yet.</p>}
      </div>
    </section>
  )
}

export default Subscriptions
