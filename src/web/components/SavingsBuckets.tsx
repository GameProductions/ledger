import React from 'react'
import { Price } from './Price'
import { useApi } from '../hooks/useApi'
import { getApiUrl } from '../utils/api'

const API_URL = getApiUrl()

const SavingsBuckets: React.FC = () => {
  const { data: buckets = [], mutate } = useApi('/api/financials/buckets')
  const [isAdding, setIsAdding] = React.useState(false)
  const [name, setName] = React.useState('')
  const [amount, setAmount] = React.useState('')

  const handleCreate = async () => {
    if (!name || !amount) return
    const targetCents = Math.round(parseFloat(amount) * 100)
    await fetch(`${API_URL}/api/financials/buckets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('ledger_token')}` },
      body: JSON.stringify({ name, targetCents })
    })
    setIsAdding(false)
    setName('')
    setAmount('')
    mutate()
  }

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
        {isAdding ? (
          <div className="flex flex-col gap-2 p-3 bg-white/5 rounded-xl mt-2 border border-white/10">
            <input type="text" placeholder="Bucket Name" value={name} onChange={e => setName(e.target.value)} className="bg-black/50 text-white text-sm px-3 py-2 rounded-lg border-none" />
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400">$</span>
              <input type="number" placeholder="Target Goal" value={amount} onChange={e => setAmount(e.target.value)} className="bg-black/50 text-white text-sm pl-7 pr-3 py-2 rounded-lg border-none w-full" />
            </div>
            <div className="flex gap-2 mt-1">
              <button onClick={handleCreate} className="flex-1 bg-emerald-500/20 text-emerald-500 font-bold py-1.5 rounded-lg text-xs hover:bg-emerald-500/30">Save</button>
              <button onClick={() => setIsAdding(false)} className="flex-1 bg-white/5 text-slate-400 font-bold py-1.5 rounded-lg text-xs hover:bg-white/10">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setIsAdding(true)} style={{ background: 'var(--bg-dark)', marginTop: '0.5rem' }}>+ Create New Bucket</button>
        )}
      </div>
    </section>
  )
}

export default SavingsBuckets
