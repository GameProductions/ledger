import React, { useState } from 'react'
import { useApi, globalMutate } from '../hooks/useApi'
import { getApiUrl } from '../utils/api'
import { SearchableSelect } from './ui/SearchableSelect'

const TransferForm: React.FC = () => {
  const { data: accounts } = (useApi('/api/financials/accounts') as any)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [amount, setAmount] = useState('')
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
        amountCents: Math.round(parseFloat(amount) * 100),
        description: 'Internal Transfer'
      })
    })

    setLoading(false)
    window.location.reload()
  }

  return (
    <section className="card">
      <h3>Internal Transfer</h3>
      <form onSubmit={handleTransfer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>From</label>
            <SearchableSelect 
              options={(accounts || []).map((a: any) => ({ value: a.id, label: a.name }))}
              value={from}
              onChange={setFrom}
              placeholder="Select Account"
              onCreate={handleCreateAccount}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>To</label>
            <SearchableSelect 
              options={(accounts || []).map((a: any) => ({ value: a.id, label: a.name }))}
              value={to}
              onChange={setTo}
              placeholder="Select Account"
              onCreate={handleCreateAccount}
            />
          </div>
        </div>
        <div>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Amount</label>
          <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required />
        </div>
        <button type="submit" className="primary" disabled={loading || !from || !to || from === to}>
          {loading ? 'Processing...' : 'Transfer Funds'}
        </button>
      </form>
    </section>
  )
}

export default TransferForm
