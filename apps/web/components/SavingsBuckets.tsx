import React from 'react'
import { Price } from './Price'
import { useApi, globalMutate } from '../hooks/useApi'
import { getApiUrl } from '../utils/api'
import { CurrencyInput } from './ui/CurrencyInput'
import { PiggyBank } from 'lucide-react'

const API_URL = getApiUrl()

const SavingsBuckets: React.FC = () => {
  const { data: buckets = [], mutate } = (useApi('/api/financials/buckets') as any)
  const [isAdding, setIsAdding] = React.useState(false)
  const [name, setName] = React.useState('')
  const [amount, setAmount] = React.useState('')

  const handleCreate = async () => {
    if (!name || !amount) return
    const targetCents = parseInt(amount) || 0
    await fetch(`${API_URL}/api/financials/buckets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('ledger_token')}` },
      body: JSON.stringify({ name, target_cents: targetCents })
    })
    setIsAdding(false)
    setName('')
    setAmount('')
    mutate();
    globalMutate();
  }

  return (
    <section className="card">
      <h3 className="text-lg font-black tracking-tighter italic flex items-center gap-2 mb-1">
        <PiggyBank size={18} className="text-primary" /> Savings Buckets
      </h3>
      <p className="text-xs text-secondary font-medium mb-6">Allocate parts of your balance to specific goals like a vacation or emergency fund.</p>
      <div className="space-y-4">
        {Array.isArray(buckets) && buckets.map((b: any) => {
          const percent = b.target_cents > 0 ? Math.round((b.current_cents / b.target_cents) * 100) : 0;
          return (
            <div key={b.id}>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="font-bold text-white">{b.name}</span>
                <span className="font-black text-primary">{percent}%</span>
              </div>
              <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, percent)}%` }}
                />
              </div>
              <div className="text-[10px] text-white/40 font-medium mt-1">
                Goal: <Price amountCents={b.target_cents} options={{ minimumFractionDigits: 0 }} />
              </div>
            </div>
          );
        }) || <p className="text-sm text-white/40 font-medium">No buckets yet.</p>}
        {isAdding ? (
          <div className="space-y-3 p-4 bg-white/5 rounded-xl border border-white/10">
            <input type="text" placeholder="Bucket Name" value={name} onChange={e => setName(e.target.value)} className="w-full bg-black/40 text-white text-sm px-3 py-2 rounded-lg border border-white/10 outline-none focus:border-primary" />
            <CurrencyInput
              valueCents={parseInt(amount) || 0}
              onChangeCents={cents => setAmount(cents.toString())}
              placeholder="Target Goal"
              showSymbol={true}
              className="bg-black/40"
            />
            <div className="flex gap-2">
              <button onClick={handleCreate} className="flex-1 py-2 border border-emerald-500/30 text-emerald-500 font-black rounded-lg text-xs tracking-widest hover:bg-emerald-500/10 transition-all">Save</button>
              <button onClick={() => setIsAdding(false)} className="flex-1 py-2 bg-white/5 text-slate-400 font-black rounded-lg text-xs tracking-widest hover:bg-white/10 transition-all">Cancel</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full py-3 mt-2 bg-white/5 border border-dashed border-white/10 rounded-xl text-xs font-black tracking-widest text-white/40 hover:bg-white/10 hover:text-white transition-all"
          >
            + Create New Bucket
          </button>
        )}
      </div>
    </section>
  )
}

export default SavingsBuckets
