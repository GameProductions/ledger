import React, { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { useApi } from './hooks/useApi'
import Subscriptions from './components/Subscriptions'
import Calendar from './components/Calendar'
import BudgetProgress from './components/BudgetProgress'
import WhatIfLedger from './components/WhatIfLedger'
import HouseholdSwitcher from './components/HouseholdSwitcher'
import ImportWizard from './components/ImportWizard'
import UserProfile from './components/UserProfile'
import HealthScore from './components/HealthScore'
import SpendingChart from './components/SpendingChart'
import SmartInsights from './components/SmartInsights'
import InviteManager from './components/InviteManager'
import TransferForm from './components/TransferForm'
import SpendingHeatmap from './components/SpendingHeatmap'
import AICoach from './components/AICoach'
import ThemeSwitcher from './components/ThemeSwitcher'
import DeveloperSettings from './components/DeveloperSettings'
import AuditChronicle from './components/AuditChronicle'
import PrivacySettings from './components/PrivacySettings'
import FutureFlow from './components/FutureFlow'
import GoalSeek from './components/GoalSeek'
import SavingsBuckets from './components/SavingsBuckets'

const Dashboard: React.FC = () => {
  const { logout } = useAuth()
  const { data: accounts } = useApi('/api/accounts')
  const { data: transactions } = useApi('/api/transactions')
  const { data: templates } = useApi('/api/templates')
  const { data: status } = useApi('/api/household/status')
  const [timeframe, setTimeframe] = useState('paycheck')
  const { data: analytics } = useApi(`/api/analytics/summary?timeframe=${timeframe}`)
  const { data: insightsData } = useApi('/api/analytics/insights')
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [toast, setToast] = useState<string | null>(null)
  
  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }


  const handleExport = async () => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/export/csv`, {
      headers: { 
        'Authorization': `Bearer ${localStorage.getItem('cash_token')}`,
        'x-household-id': localStorage.getItem('cash_household_id') || 'household-abc'
      }
    })
    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cash-export-${Date.now()}.csv`
    a.click()
    showToast('Export Started')
  }

  const toggleReconcile = async (txId: string, current: boolean) => {
    await fetch(`${import.meta.env.VITE_API_URL}/api/transactions/${txId}/reconcile`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('cash_token')}`,
        'x-household-id': localStorage.getItem('cash_household_id') || 'household-abc'
      },
      body: JSON.stringify({ reconciled: !current })
    })
    window.location.reload()
  }

  return (
    <div className="dashboard">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <h1 style={{ margin: 0, fontSize: '2rem', background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            CASH
          </h1>
          <HouseholdSwitcher />
          {status && (
            <div style={{ fontSize: '0.8rem', color: 'var(--primary)', background: 'rgba(16, 185, 129, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span className="pulse" style={{ width: '8px', height: '8px', background: 'var(--primary)', borderRadius: '50%' }}></span>
              {status.activeCount} Active Now
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="view-toggle card" style={{ padding: '0.4rem', borderRadius: '0.8rem' }}>
            <button className={view === 'list' ? 'primary' : ''} onClick={() => setView('list')} style={{ marginRight: '0.5rem' }}>List</button>
            <button className={view === 'calendar' ? 'primary' : ''} onClick={() => setView('calendar')}>Calendar</button>
          </div>
          <button onClick={handleExport} style={{ background: 'var(--secondary)', color: 'white' }}>Export CSV</button>
          <ThemeSwitcher />
          <UserProfile />
          <button onClick={logout}>Logout</button>
        </div>
      </header>

      <main style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        {view === 'list' ? (
          <>
            <section className="card" style={{ gridColumn: 'span 1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Safety Number</h3>
                <select 
                  value={timeframe} 
                  onChange={(e) => setTimeframe(e.target.value)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  <option value="paycheck">Until Payday</option>
                  <option value="month">Until End of Month</option>
                  <option value="30d">Rolling 30 Days</option>
                </select>
              </div>
              <div className="safety-number-container">
                ${((analytics?.safetyNumberCents || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <p style={{ color: 'var(--text-secondary)' }}>Spendable cash remaining for selected window</p>
            </section>

            <section className="card" style={{ gridColumn: 'span 1' }}>
              <h3>Financial Intelligence</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginTop: '1rem' }}>
                <HealthScore score={analytics?.healthScore || 0} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Spending Trend</div>
                  <SpendingChart data={transactions || []} />
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>Activity Heatmap</div>
                  <SpendingHeatmap transactions={transactions || []} />
                </div>
              </div>
              <button 
                onClick={() => window.open(`${import.meta.env.VITE_API_URL}/api/report/summary`, '_blank')}
                style={{ marginTop: '1.5rem', width: '100%', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.2)' }}
              >
                📥 Generate Monthly Digest (PDF)
              </button>
            </section>

            <section className="card">
              <h3>Recent Transactions</h3>
              <div style={{ marginTop: '1rem', display: 'grid', gap: '0.8rem' }}>
                {transactions?.map((tx: any) => (
                  <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderBottom: '1px solid var(--glass-border)' }}>
                    <div>
                      <div style={{ fontWeight: '600' }}>{tx.description}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{tx.transaction_date}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ fontWeight: '700' }}>${(tx.amount_cents / 100).toFixed(2)}</span>
                      <button 
                        onClick={() => toggleReconcile(tx.id, tx.status === 'reconciled')}
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', background: tx.status === 'reconciled' ? 'var(--primary)' : 'transparent', border: '1px solid var(--primary)' }}
                      >
                        {tx.status === 'reconciled' ? '✓' : 'Reconcile'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <AICoach />
            <TransferForm />
            <InviteManager />
            <SmartInsights insights={insightsData?.insights || []} />
          </>
        ) : (
          <section className="card" style={{ gridColumn: 'span 3' }}>
            <h3>Financial Calendar</h3>
            <Calendar transactions={transactions || []} />
          </section>
        )}

        <section className="card">
          <h3>Your Accounts</h3>
          <ul style={{ listStyle: 'none', marginTop: '1rem' }}>
            {accounts?.map((acc: any) => (
              <li key={acc.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                <span>{acc.name}</span>
                <span>${(acc.balance_cents / 100).toFixed(2)}</span>
              </li>
            )) || <p style={{ color: 'var(--text-secondary)' }}>No accounts found.</p>}
          </ul>
        </section>

        <FutureFlow />
        <GoalSeek />
        <SavingsBuckets />
        <PrivacySettings />
        <AuditChronicle />
        <Subscriptions />
        <BudgetProgress />
        <WhatIfLedger />
        <DeveloperSettings />
        <ImportWizard />

        <section className="card" style={{ gridColumn: 'span 3' }}>
          <h3>Quick Entry</h3>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            {templates?.map((tpl: any) => (
              <button 
                key={tpl.id} 
                onClick={() => {
                  const descInput = document.getElementById('qe-desc') as HTMLInputElement
                  const amountInput = document.getElementById('qe-amount') as HTMLInputElement
                  if (descInput) descInput.value = tpl.name
                  if (amountInput) amountInput.value = (tpl.amount_cents / 100).toFixed(2)
                }}
                style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem', background: 'var(--bg-dark)' }}
              >
                {tpl.name}
              </button>
            ))}
          </div>
          <form style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }} onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            fetch(`${import.meta.env.VITE_API_URL}/api/transactions`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('cash_token')}`,
                'x-household-id': localStorage.getItem('cash_household_id') || 'household-abc'
              },
              body: JSON.stringify({
                amount_cents: Math.round(parseFloat(formData.get('amount') as string) * 100),
                description: formData.get('description'),
                account_id: 'acc-1',
                category_id: 'cat-1'
              })
            }).then(() => showToast('Transaction Added Successfully'))
          }}>
            <input id="qe-desc" name="description" placeholder="Description (e.g. Coffee)" style={{ flex: 2, padding: '0.6rem', borderRadius: '0.4rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }} required />
            <input id="qe-amount" name="amount" type="number" step="0.01" placeholder="Amount" style={{ flex: 1, padding: '0.6rem', borderRadius: '0.4rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }} required />
            <button type="submit" className="primary">Add</button>
          </form>
        </section>

        <footer style={{ gridColumn: 'span 3', marginTop: '4rem', padding: '2rem', borderTop: '1px solid var(--glass-border)', textAlign: 'center', opacity: 0.5, fontSize: '0.8rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '1rem' }}>
            <span>🔒 Secure (HSTS)</span>
            <span>⚡ Edge 200ms</span>
            <span>💎 v1.5.0 Gold</span>
          </div>
          <p>© 2026 GameProductions - Unified Financial Command</p>
        </footer>
      </main>

      {toast && <div className="status-toast flex-center"><span>●</span> {toast}</div>}
    </div>
  )
}

const Login: React.FC = () => {
  const { login } = useAuth()
  const [username, setUsername] = useState('')

  const handleLogin = async () => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    })
    const data = await res.json()
    if (data.token) {
      login(data.token, { userId: username })
    }
  }

  return (
    <div className="flex-center" style={{ minHeight: '80vh' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
        <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Welcome to CASH</h2>
        <input 
          type="text" 
          placeholder="Enter Username" 
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ width: '100%', padding: '0.8rem', marginBottom: '1rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }}
        />
        <button className="primary" style={{ width: '100%' }} onClick={handleLogin}>Log In</button>
      </div>
    </div>
  )
}

const AppContent: React.FC = () => {
  const { token } = useAuth()
  return token ? <Dashboard /> : <Login />
}

const App: React.FC = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
)

export default App 
