import React, { useState } from 'react'
import { useApi, globalMutate } from '../hooks/useApi'
import { getApiUrl } from '../utils/api'
import { SearchableSelect } from './ui/SearchableSelect'
import { CurrencyInput } from './ui/CurrencyInput'
import { ArrowRightLeft } from 'lucide-react'

const TransferForm: React.FC = () => {
  const { data: accounts } = (useApi('/api/financials/accounts') as any)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [amountCents, setAmountCents] = useState(0)
  const [loading, setLoading] = useState(false)

  const handleCreateAccount = async (name: string): Promise<string> => {
    const res = (await fetch(`${getApiUrl()}/api/financials/accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('ledger_token')}`,
        'x-household-id': localStorage.getItem('ledger_householdId') || ''
      },
      body: JSON.stringify({ name, type: 'checking', balanceCents: 0 })
    }) as any);
    const data = (await res.json() as any);
    globalMutate();
    return data.id;
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    await fetch(`${getApiUrl()}/api/financials/transfers`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${localStorage.getItem('ledger_token')}`,
        'x-household-id': localStorage.getItem('ledger_householdId') || ''
      },
      body: JSON.stringify({
        fromAccountId: from,
        toAccountId: to,
        amountCents,
        description: 'Internal Transfer'
      })
    })

    setLoading(false)
    window.location.reload()
  }

  const accountOptions = (accounts || []).map((a: any) => ({ value: a.id, label: a.name }))

  return (
    <section className="card">
      <h3 className="text-lg font-black tracking-tighter italic flex items-center gap-2 mb-1">
        <ArrowRightLeft size={18} className="text-primary" /> Internal Transfer
      </h3>
      <p className="text-xs text-secondary font-medium mb-6">Move funds between your accounts.</p>
      <form onSubmit={handleTransfer} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-black tracking-widest text-secondary">From</label>
            <SearchableSelect
              options={accountOptions}
              value={from}
              onChange={setFrom}
              placeholder="Select Account"
              onCreate={handleCreateAccount}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black tracking-widest text-secondary">To</label>
            <SearchableSelect
              options={accountOptions}
              value={to}
              onChange={setTo}
              placeholder="Select Account"
              onCreate={handleCreateAccount}
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black tracking-widest text-secondary">Amount</label>
          <CurrencyInput
            valueCents={amountCents}
            onChangeCents={setAmountCents}
            placeholder="0.00"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !from || !to || from === to}
          className="w-full py-3 bg-primary text-white rounded-xl text-xs font-black tracking-widest hover:brightness-110 transition-all disabled:opacity-40 shadow-lg shadow-primary/20"
        >
          {loading ? 'Processing...' : 'Transfer Funds'}
        </button>
      </form>
    </section>
  )
}

export default TransferForm
