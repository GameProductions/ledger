import React, { useState } from 'react'
import { useApi } from '../hooks/useApi'
import { getApiUrl } from '../utils/api'

const TransferForm: React.FC = () => {
  const { data: accounts } = useApi('/api/financials/accounts')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

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
        from_account_id: from,
        to_account_id: to,
        amount_cents: Math.round(parseFloat(amount) * 100),
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
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>From</label>
            <select value={from} onChange={(e) => setFrom(e.target.value)} required>
              <option value="">Select Account</option>
              {accounts?.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>To</label>
            <select value={to} onChange={(e) => setTo(e.target.value)} required>
              <option value="">Select Account</option>
              {accounts?.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
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
