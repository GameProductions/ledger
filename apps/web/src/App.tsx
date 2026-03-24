import React, { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { useApi } from './hooks/useApi'
import Subscriptions from './components/Subscriptions'
import Calendar from './components/Calendar'
import BudgetProgress from './components/BudgetProgress'
import WhatIfLedger from './components/WhatIfLedger'
import HouseholdSwitcher from './components/HouseholdSwitcher'
import UserMenu from './components/UserMenu'
import SeasonalAssets from './components/SeasonalAssets'
import SpendingChart from './components/SpendingChart'
import SmartInsights from './components/SmartInsights'
import InviteManager from './components/InviteManager'
import TransferForm from './components/TransferForm'
import SpendingHeatmap from './components/SpendingHeatmap'
import ImportWizard from './components/ImportWizard'
import HealthScore from './components/HealthScore'
import AICoach from './components/AICoach'
import DeveloperSettings from './components/DeveloperSettings'
import AuditChronicle from './components/AuditChronicle'
import PrivacySettings from './components/PrivacySettings'
import FutureFlow from './components/FutureFlow'
import GoalSeek from './components/GoalSeek'
import SavingsBuckets from './components/SavingsBuckets'
import PrivacyPolicy from './components/PrivacyPolicy'
import AdminDashboard from './components/AdminDashboard'
import TermsOfService from './components/TermsOfService'
import Customizer from './components/Customizer'
import { OnboardingProvider } from './context/OnboardingContext'
import { GuidedTour } from './components/GuidedTour'
import { OnboardingChecklist } from './components/OnboardingChecklist'
import { ToastProvider, useToast } from './context/ToastContext'

const Footer: React.FC<{ style?: React.CSSProperties; className?: string }> = ({ style, className }) => (
  <footer className={className} style={{ marginTop: '4rem', padding: '2rem', borderTop: '1px solid var(--glass-border)', opacity: 0.6, fontSize: '0.8rem', ...style }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
        <span style={{ fontWeight: '600', color: 'var(--primary)' }}>LEDGER</span>
        <span style={{ opacity: 0.7 }}>v{import.meta.env.VITE_APP_VERSION}</span>
      </div>
      <div style={{ display: 'flex', gap: '2rem' }}>
        <a href="#/privacy" style={{ color: 'white', textDecoration: 'none' }}>Privacy Policy</a>
        <a href="#/terms" style={{ color: 'white', textDecoration: 'none' }}>Terms of Service</a>
      </div>
    </div>
    <div style={{ textAlign: 'center', opacity: 0.5, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
      © {new Date().getFullYear()} GameProductions - Unified Financial Command
    </div>
  </footer>
)

const Login: React.FC = () => {
  const { login } = useAuth()
  const { showToast } = useToast()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL.replace(/\/$/, '')
      const res = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      
      if (!res.ok) {
        const error = await res.json()
        console.error('Login Failed:', error)
        showToast(`Login Failed: ${error.error || 'Unknown error'}`, 'error')
        return
      }

      const authData = await res.json()
      if (authData.token) {
        const apiUrl = import.meta.env.VITE_API_URL.replace(/\/$/, '')
        const profileRes = await fetch(`${apiUrl}/api/user/profile`, {
          headers: { 'Authorization': `Bearer ${authData.token}` }
        })
        const profile = await profileRes.json()
        login(authData.token, { ...profile, userId: username, globalRole: profile.global_role })
      }
    } catch (e) {
      console.error('Login Network Error:', e)
      showToast('Network error during login. Please check your connection.', 'error')
    }
  }

  return (
    <div className="flex-center" style={{ minHeight: '100vh', flexDirection: 'column', padding: '2rem 0' }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
        <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <img src="/assets/icon.png" alt="LEDGER Logo" style={{ height: '4rem', marginBottom: '1rem' }} />
            <h2 style={{ margin: 0 }}>Welcome to LEDGER</h2>
            <p style={{ opacity: 0.5, fontSize: '0.8rem', marginTop: '0.5rem' }}>v{import.meta.env.VITE_APP_VERSION}</p>
          </div>
          <form 
            onSubmit={(e) => { 
              e.preventDefault(); 
              handleLogin(); 
            }}
          >
            <input 
              type="text" 
              placeholder="Username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ width: '100%', padding: '0.8rem', marginBottom: '1rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }}
            />
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '0.8rem', marginBottom: '1rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }}
            />
            <button type="submit" className="primary" style={{ width: '100%' }}>Log In</button>
          </form>
        </div>
      </div>
      <Footer style={{ width: '100%', marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.05)' }} />
    </div>
  )
}

const ClaimInvite: React.FC = () => {
  const { showToast } = useToast()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  
  const query = new URLSearchParams(window.location.search || window.location.hash.split('?')[1])
  const token = query.get('token')

  const handleClaim = async () => {
    if (!token) {
      showToast('Missing invitation token', 'error')
      return
    }
    setLoading(true)
    try {
      const apiUrl = import.meta.env.VITE_API_URL.replace(/\/$/, '')
      const res = await fetch(`${apiUrl}/auth/admin/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, username, password, email })
      })
      
      if (!res.ok) {
        const error = await res.json()
        showToast(`Claim Failed: ${error.error || 'Unknown error'}`, 'error')
        return
      }

      showToast('Invite claimed! You can now log in.', 'success')
      window.location.hash = '#/login'
    } catch (e) {
      showToast('Network error during claim.', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!token) return <div className="flex-center" style={{ minHeight: '80vh' }}>Invalid Invitation</div>

  return (
    <div className="flex-center" style={{ minHeight: '80vh' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <img src="/assets/icon.png" alt="LEDGER Logo" style={{ height: '4rem', marginBottom: '1rem' }} />
          <h2 style={{ margin: 0 }}>Join as Admin</h2>
          <p style={{ opacity: 0.6, fontSize: '0.9rem' }}>Create your super admin account</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); handleClaim(); }}>
          <input 
            type="text" 
            placeholder="Username" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ width: '100%', padding: '0.8rem', marginBottom: '1rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }}
            required
          />
          <input 
            type="email" 
            placeholder="Email Address" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '0.8rem', marginBottom: '1rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }}
            required
          />
          <input 
            type="password" 
            placeholder="Choose Password (min 8 chars)" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '0.8rem', marginBottom: '2rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }}
            required
            minLength={8}
          />
          <button type="submit" className="primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Processing...' : 'Claim Invitation'}
          </button>
        </form>
      </div>
    </div>
  )
}

const Dashboard: React.FC<{ view: 'list' | 'calendar', setView: (v: 'list' | 'calendar') => void }> = ({ view, setView: _setView }) => {
  const { user } = useAuth()
  const { data: accounts } = useApi('/api/accounts')
  const { data: transactions, mutate: mutateTx } = useApi('/api/transactions')
  const { data: templates } = useApi('/api/templates')
  const { data: status } = useApi('/api/household/status', { refreshInterval: 10000 })
  const [timeframe, setTimeframe] = useState('paycheck')
  const { data: analytics } = useApi(`/api/analytics/summary?timeframe=${timeframe}`)
  const { data: insightsData } = useApi('/api/analytics/insights')
  const [toast, setToast] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [linkingTx, setLinkingTx] = useState<any>(null)
  const [settings, setSettings] = useState<any>({ dashboard_layout: {} }) // Default
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([])
  const { data: budgetsData, mutate: mutateBudgets } = useApi('/api/budgets')
  const [showFundModal, setShowFundModal] = useState(false)
  const [fundAmount, setFundAmount] = useState('')
  const [fundCategoryId, setFundCategoryId] = useState('')
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [depositAmount, setDepositAmount] = useState('')

  useEffect(() => {
    if (user?.settings_json) {
       try {
         setSettings(JSON.parse(user.settings_json))
       } catch(e) {}
    }
  }, [user])

  const updateSettings = async (newSettings: any) => {
    setSettings(newSettings)
    await fetch(`${import.meta.env.VITE_API_URL}/api/user/profile`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('ledger_token')}`
      },
      body: JSON.stringify({ settings_json: JSON.stringify(newSettings) })
    })
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }


  const handleDeposit = async () => {
    await fetch(`${import.meta.env.VITE_API_URL}/api/budget/deposit`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('ledger_token')}`
      },
      body: JSON.stringify({ amount_cents: parseFloat(depositAmount) * 100 })
    })
    mutateBudgets()
    setShowDepositModal(false)
    setDepositAmount('')
    showToast('Deposit Successful')
  }

  const handleFund = async () => {
    if (!fundCategoryId) return
    await fetch(`${import.meta.env.VITE_API_URL}/api/budget/fund`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('ledger_token')}`
      },
      body: JSON.stringify({ 
        category_id: fundCategoryId,
        amount_cents: parseFloat(fundAmount) * 100 
      })
    })
    mutateBudgets()
    setShowFundModal(false)
    setFundAmount('')
    showToast('Envelope Funded')
  }


  const toggleReconcile = async (txId: string, current: boolean) => {
    await fetch(`${import.meta.env.VITE_API_URL}/api/transactions/${txId}/reconcile`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('ledger_token')}`,
        'x-household-id': localStorage.getItem('ledger_household_id') || 'household-abc'
      },
      body: JSON.stringify({ reconciled: !current })
    })
    mutateTx()
    showToast('Transaction Updated')
  }

  return (
    <>
      <GuidedTour />
      <div className="dashboard-grid reveal">
        <SeasonalAssets />
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <a href="#/" style={{ display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none', color: 'inherit' }}>
            <img src="/assets/icon.png" alt="LEDGER Logo" style={{ height: '2.5rem' }} />
            <h1 style={{ margin: 0, fontSize: '2rem', background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              LEDGER
            </h1>
          </a>
          <HouseholdSwitcher />
          {status && (
            <div style={{ fontSize: '0.8rem', color: 'var(--primary)', background: 'rgba(16, 185, 129, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span className="pulse" style={{ width: '8px', height: '8px', background: 'var(--primary)', borderRadius: '50%' }}></span>
              {status.activeCount} Active Now
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="search-box card" style={{ padding: '0.4rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '2rem' }}>
            <span>🔍</span>
            <input 
              type="text" 
              placeholder="Search transactions..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '200px' }}
            />
          </div>
          <div className="filter-chips" style={{ display: 'flex', gap: '0.5rem' }}>
            {['all', 'unreconciled', 'reconciled'].map(s => (
              <button 
                key={s}
                onClick={() => setFilterStatus(s)}
                style={{ 
                  fontSize: '0.7rem', 
                  padding: '0.3rem 0.8rem', 
                  background: filterStatus === s ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                  color: filterStatus === s ? 'white' : 'var(--text-secondary)',
                  border: '1px solid var(--glass-border)'
                }}
              >
                {s.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="stagger dashboard-grid">
        <div style={{ gridColumn: '1 / -1' }}>
          <OnboardingChecklist />
        </div>
        {view === 'list' ? (
          <>
            {settings.dashboard_layout?.healthScore !== false && (
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
            )}

            <section className="card" style={{ gridColumn: 'span 1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Envelope Budgeting</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    onClick={() => setShowDepositModal(true)}
                    style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--primary)', border: '1px solid var(--glass-border)' }}
                  >
                    Deposit
                  </button>
                  <button 
                    onClick={() => setShowFundModal(true)}
                    style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: '1px solid var(--glass-border)' }}
                  >
                    Fund
                  </button>
                </div>
              </div>
              <div style={{ marginTop: '1rem' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--primary)' }}>
                  ${((budgetsData?.unallocated_balance_cents || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Unallocated Pool</div>
                
                <div style={{ display: 'grid', gap: '0.8rem' }}>
                  {budgetsData?.budgets?.filter((b: any) => b.is_envelope).map((b: any) => (
                    <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.5rem' }}>
                      <div>
                        <span style={{ marginRight: '0.5rem' }}>{b.icon}</span>
                        <span style={{ fontSize: '0.9rem' }}>{b.name}</span>
                      </div>
                      <div style={{ fontWeight: '600', color: (b.envelope_balance_cents || 0) < 0 ? 'var(--danger)' : 'white' }}>
                        ${((b.envelope_balance_cents || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {settings.dashboard_layout?.healthScore !== false && (
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
            )}

            {settings.dashboard_layout?.recentTransactions !== false && (
              <section className="card" style={{ gridColumn: 'span 1' }}>
                <h3>Recent Transactions</h3>
                <div style={{ marginTop: '1rem', display: 'grid', gap: '0.8rem' }}>
                  {transactions?.filter((tx: any) => {
                    const matchesSearch = tx.description.toLowerCase().includes(searchQuery.toLowerCase())
                    const matchesStatus = filterStatus === 'all' || (filterStatus === 'unreconciled' ? tx.reconciliation_status !== 'reconciled' : tx.reconciliation_status === 'reconciled')
                    return matchesSearch && matchesStatus
                  }).map((tx: any) => (
                    <div key={tx.id} className="slide-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderBottom: '1px solid var(--glass-border)' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedTxIds.includes(tx.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedTxIds([...selectedTxIds, tx.id])
                          else setSelectedTxIds(selectedTxIds.filter(id => id !== tx.id))
                        }}
                        style={{ marginRight: '1rem', width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {tx.description}
                          {tx.reconciliation_status === 'reconciled' && <span style={{ fontSize: '0.6rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--primary)', padding: '0.1rem 0.4rem', borderRadius: '1rem' }}>Satisifed</span>}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{tx.transaction_date}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontWeight: '700' }}>${(tx.amount_cents / 100).toFixed(2)}</span>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button 
                            onClick={() => setLinkingTx(tx)}
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.2)' }}
                            title="Link to another transaction"
                          >
                            🔗
                          </button>
                          <button 
                            onClick={() => toggleReconcile(tx.id, tx.status === 'reconciled')}
                            style={{ padding: '0.2rem 0.6rem', fontSize: '0.7rem', background: tx.status === 'reconciled' ? 'var(--primary)' : 'transparent', border: '1px solid var(--primary)', borderRadius: '0.4rem' }}
                          >
                            {tx.status === 'reconciled' ? '✓' : 'Reconcile'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          <section className="card" style={{ gridColumn: 'span 3' }}>
            <h3>Financial Calendar</h3>
            <Calendar transactions={transactions || []} />
          </section>
        )}

        <section className="card" style={{ gridColumn: 'span 1' }}>
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

        <AICoach />
        <TransferForm />
        <InviteManager />
        {settings.dashboard_layout?.smartInsights !== false && <SmartInsights insights={insightsData?.insights || []} />}
        <FutureFlow />
        <GoalSeek />
        {settings.dashboard_layout?.savingsBuckets !== false && <SavingsBuckets />}
        <PrivacySettings />
        <AuditChronicle />
        <Subscriptions />
        <BudgetProgress />
        <WhatIfLedger />
        <DeveloperSettings />
        <ImportWizard />

        <section className="card dashboard-span-full">
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
                'Authorization': `Bearer ${localStorage.getItem('ledger_token')}`,
                'x-household-id': localStorage.getItem('ledger_household_id') || 'household-abc'
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

        <Footer className="dashboard-span-full" />
      </main>

      {toast && <div className="status-toast flex-center"><span>●</span> {toast}</div>}

      {/* Floating Calculation Bar */}
      {selectedTxIds.length > 0 && (
        <div className="status-toast reveal" style={{ bottom: '6rem', width: 'auto', minWidth: '300px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '2rem', border: '1px solid var(--secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontWeight: '800', color: 'var(--secondary)' }}>{selectedTxIds.length} SELECTED</span>
            <div style={{ height: '20px', width: '1px', background: 'var(--glass-border)' }}></div>
            <span style={{ fontWeight: '800' }}>
              TOTAL: ${((transactions?.filter((t: any) => selectedTxIds.includes(t.id)).reduce((acc: number, t: any) => acc + t.amount_cents, 0) || 0) / 100).toFixed(2)}
            </span>
          </div>
          <button 
            onClick={() => setSelectedTxIds([])}
            style={{ padding: '0.2rem 0.5rem', background: 'rgba(255,255,255,0.05)', fontSize: '0.8rem' }}
          >
            Clear
          </button>
        </div>
      )}

      {linkingTx && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card reveal" style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ margin: 0 }}>Reconcile: {linkingTx.description}</h3>
                <span style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--primary)' }}>${(linkingTx.amount_cents / 100).toFixed(2)}</span>
              </div>
              <button onClick={() => setLinkingTx(null)} style={{ background: 'transparent', color: 'var(--text-secondary)', fontSize: '1.5rem', border: 'none' }}>×</button>
            </div>
            
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Select one or more transactions to satisfy this entry.
            </p>

            {/* Smart Suggestions */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 'bold', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>SMART SUGGESTIONS</div>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {transactions?.filter((t: any) => 
                  t.id !== linkingTx.id && 
                  t.reconciliation_status === 'unreconciled' &&
                  Math.abs(t.amount_cents) === Math.abs(linkingTx.amount_cents)
                ).map((t: any) => (
                  <div 
                    key={`suggest-${t.id}`}
                    onClick={async () => {
                      await fetch(`${import.meta.env.VITE_API_URL}/api/transactions/${linkingTx.id}/link`, {
                        method: 'POST',
                        headers: { 
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${localStorage.getItem('ledger_token')}`,
                          'x-household-id': localStorage.getItem('ledger_household_id') || 'household-abc'
                        },
                        body: JSON.stringify({ linkedToIds: [t.id] })
                      })
                      mutateTx()
                      setLinkingTx(null)
                      showToast('Auto-Matched Successfully')
                    }}
                    style={{ 
                      cursor: 'pointer', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      padding: '1rem', 
                      background: 'rgba(16, 185, 129, 0.1)', 
                      border: '1px solid var(--primary)',
                      borderRadius: '0.5rem',
                      animation: 'pulse 2s infinite'
                    }}
                  >
                    <span>✨ {t.description}</span>
                    <span style={{ fontWeight: '700' }}>${(t.amount_cents / 100).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 'bold', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>ALL CANDIDATES</div>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {transactions?.filter((t: any) => t.id !== linkingTx.id).map((t: any) => {
                return (
                  <div 
                    key={t.id} 
                    className="card" 
                    onClick={async () => {
                      await fetch(`${import.meta.env.VITE_API_URL}/api/transactions/${linkingTx.id}/link`, {
                        method: 'POST',
                        headers: { 
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${localStorage.getItem('ledger_token')}`,
                          'x-household-id': localStorage.getItem('ledger_household_id') || 'household-abc'
                        },
                        body: JSON.stringify({ linkedToIds: [t.id] })
                      })
                      mutateTx()
                      setLinkingTx(null)
                      showToast('Linked Successfully')
                    }}
                    style={{ 
                      cursor: 'pointer', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      padding: '1rem', 
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--glass-border)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '600' }}>{t.description}</div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>{t.transaction_date}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '700' }}>${(t.amount_cents / 100).toFixed(2)}</div>
                      {Math.abs(t.amount_cents) === Math.abs(linkingTx.amount_cents) && (
                        <span style={{ fontSize: '0.6rem', color: 'var(--primary)', fontWeight: 'bold' }}>EXACT MATCH</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            
            {linkingTx.reconciliation_status === 'reconciled' && (
              <button 
                onClick={async () => {
                  // Simplified unlink - remove all links for this source
                  // In a real app we'd list the links and allow individual unlinking
                  await fetch(`${import.meta.env.VITE_API_URL}/api/transactions/${linkingTx.id}/unlink`, {
                    method: 'POST',
                    headers: { 
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${localStorage.getItem('ledger_token')}`,
                      'x-household-id': localStorage.getItem('ledger_household_id') || 'household-abc'
                    },
                    body: JSON.stringify({ targetId: 'all' }) // Backend needs to handle this or we need the targetId
                  })
                  mutateTx()
                  setLinkingTx(null)
                  showToast('Links Reset')
                }}
                style={{ marginTop: '2rem', width: '100%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
              >
                Reset All Links
              </button>
            )}
          </div>
        </div>
      )}
      <Customizer settings={settings} onUpdate={updateSettings} />

      {showFundModal && (
        <div className="modal-overlay" onClick={() => setShowFundModal(false)}>
          <div className="modal card slide-up" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3>Fund Envelope</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Allocate money from your unallocated pool into a specific category.</p>
            <div style={{ marginTop: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Select Envelope</label>
              <select 
                value={fundCategoryId} 
                onChange={(e) => setFundCategoryId(e.target.value)}
                style={{ width: '100%', padding: '0.8rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white', marginBottom: '1rem' }}
              >
                <option value="">Choose a category...</option>
                {budgetsData?.budgets?.filter((b: any) => b.is_envelope).map((b: any) => (
                  <option key={b.id} value={b.id}>{b.icon} {b.name}</option>
                ))}
              </select>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Amount ($)</label>
              <input 
                type="number" 
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                placeholder="0.00"
                style={{ width: '100%', padding: '0.8rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white', marginBottom: '1.5rem' }}
              />
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button onClick={() => setShowFundModal(false)} style={{ flex: 1, background: 'transparent', border: '1px solid var(--glass-border)' }}>Cancel</button>
                <button className="primary" onClick={handleFund} style={{ flex: 1 }}>Allocate Funds</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDepositModal && (
        <div className="modal-overlay" onClick={() => setShowDepositModal(false)}>
          <div className="modal card slide-up" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3>Deposit to Pool</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Add funds to your "To Be Allocated" unallocated pool.</p>
            <div style={{ marginTop: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Amount ($)</label>
              <input 
                type="number" 
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="0.00"
                style={{ width: '100%', padding: '0.8rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white', marginBottom: '1.5rem' }}
              />
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button onClick={() => setShowDepositModal(false)} style={{ flex: 1, background: 'transparent', border: '1px solid var(--glass-border)' }}>Cancel</button>
                <button className="primary" onClick={handleDeposit} style={{ flex: 1 }}>Deposit</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showFundModal && (
        <div className="modal-overlay" onClick={() => setShowFundModal(false)}>
          <div className="modal card slide-up" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3>Fund Envelope</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Allocate money from your unallocated pool into a specific category.</p>
            <div style={{ marginTop: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Select Envelope</label>
              <select 
                value={fundCategoryId} 
                onChange={(e) => setFundCategoryId(e.target.value)}
                style={{ width: '100%', padding: '0.8rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white', marginBottom: '1rem' }}
              >
                <option value="">Choose a category...</option>
                {budgetsData?.budgets?.filter((b: any) => b.is_envelope).map((b: any) => (
                  <option key={b.id} value={b.id}>{b.icon} {b.name}</option>
                ))}
              </select>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Amount ($)</label>
              <input 
                type="number" 
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                placeholder="0.00"
                style={{ width: '100%', padding: '0.8rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white', marginBottom: '1.5rem' }}
              />
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button onClick={() => setShowFundModal(false)} style={{ flex: 1, background: 'transparent', border: '1px solid var(--glass-border)' }}>Cancel</button>
                <button className="primary" onClick={handleFund} style={{ flex: 1 }}>Allocate Funds</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDepositModal && (
        <div className="modal-overlay" onClick={() => setShowDepositModal(false)}>
          <div className="modal card slide-up" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3>Deposit to Pool</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Add funds to your "To Be Allocated" unallocated pool.</p>
            <div style={{ marginTop: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Amount ($)</label>
              <input 
                type="number" 
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="0.00"
                style={{ width: '100%', padding: '0.8rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white', marginBottom: '1.5rem' }}
              />
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button onClick={() => setShowDepositModal(false)} style={{ flex: 1, background: 'transparent', border: '1px solid var(--glass-border)' }}>Cancel</button>
                <button className="primary" onClick={handleDeposit} style={{ flex: 1 }}>Deposit</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  )
}

const AppContent: React.FC = () => {
  const { user, globalRole } = useAuth()
  const [currentHash, setCurrentHash] = useState(window.location.hash)
  const [view, setView] = useState<'list' | 'calendar'>('list')

  useEffect(() => {
    const handleHashChange = () => setCurrentHash(window.location.hash)
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // Public Routes (No session required)
  if (currentHash === '#/privacy') return <PrivacyPolicy />
  if (currentHash === '#/terms') return <TermsOfService />
  if (currentHash.startsWith('#/claim')) return <ClaimInvite />

  if (!user) return <Login />

  // Protected Admin Routes
  const isAdmin = currentHash === '#/admin' && globalRole === 'super_admin'
  
  return (
    <div style={{ position: 'relative' }}>
      <UserMenu view={view} setView={setView} />
      {isAdmin ? <AdminDashboard /> : <Dashboard view={view} setView={setView} />}
    </div>
  )
}

const App: React.FC = () => (
  <AuthProvider>
    <ToastProvider>
      <OnboardingProvider>
        <AppContent />
      </OnboardingProvider>
    </ToastProvider>
  </AuthProvider>
)

export default App
