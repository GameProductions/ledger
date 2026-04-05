import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import { useApi } from '../hooks/useApi'
import Subscriptions from '../components/Subscriptions'
import Calendar from '../components/Calendar'
import BudgetProgress from '../components/BudgetProgress'
import WhatIfLedger from '../components/WhatIfLedger'
import SpendingChart from '../components/SpendingChart'
import SmartInsights from '../components/SmartInsights'
import InviteManager from '../components/InviteManager'
import TransferForm from '../components/TransferForm'
import SpendingHeatmap from '../components/SpendingHeatmap'
import ImportWizard from '../components/ImportWizard'
import HealthScore from '../components/HealthScore'
import AICoach from '../components/AICoach'
import DeveloperSettings from '../components/DeveloperSettings'
import AuditChronicle from '../components/AuditChronicle'
import { Price } from '../components/Price'
import FutureFlow from '../components/FutureFlow'
import GoalSeek from '../components/GoalSeek'
import SavingsBuckets from '../components/SavingsBuckets'
import { MainLayout } from '../components/layout/MainLayout'
import { Modal } from '../components/ui/Modal';
import { GuidedTour } from '../components/GuidedTour';
import { OnboardingChecklist } from '../components/OnboardingChecklist';
import { SearchableSelect } from '../components/ui/SearchableSelect'
import { CalendarEntryModal } from '../components/CalendarEntryModal'
import { AlertTriangle, Info, Bell, XCircle } from 'lucide-react';


const DashboardPage: React.FC<{ view: 'list' | 'calendar', setView: (v: 'list' | 'calendar') => void }> = ({ view, setView }) => {
  const { user } = useAuth()
  const { data: _accounts } = useApi('/api/financials/accounts')
  const { data: transactions, mutate: mutateTx } = useApi('/api/financials/transactions')
  const { data: subscriptions, mutate: mutateSubs } = useApi('/api/planning/subscriptions')
  const { data: templates } = useApi('/api/planning/templates')
  const [timeframe, setTimeframe] = useState('paycheck')
  const { data: analysis } = useApi(`/api/data/analysis/summary?timeframe=${timeframe}`)
  const { data: insightsData } = useApi('/api/data/analysis/insights')
  const { data: forecast } = useApi('/api/data/analysis/forecast')
  const { data: smartSuggestions } = useApi('/api/financials/transactions/suggest-links')
  const { data: announcements, mutate: mutateAnnouncements } = useApi('/api/pcc/announcements')
  const [toast, setToast] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [linkingTx, setLinkingTx] = useState<any>(null)
  const [_settings, setSettings] = useState<any>({ dashboard_layout: {} })
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([])
  
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false)
  const [selectedCalendarItem, setSelectedCalendarItem] = useState<any>(null)
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>()

  const { data: budgetsData, mutate: mutateBudgets } = useApi('/api/planning/budgets')
  const [showFundModal, setShowFundModal] = useState(false)
  const [fundAmount, setFundAmount] = useState('')
  const [fundCategoryId, setFundCategoryId] = useState('')
  const [isRolloverModalOpen, setIsRolloverModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deletePending, setDeletePending] = useState<{ id: string, type: string } | null>(null)
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [depositAmount, setDepositAmount] = useState('')

  useEffect(() => {
    if (user?.settings_json) {
       try {
         setSettings(JSON.parse(user.settings_json))
       } catch(e) {}
    }
  }, [user])

  const [activeTab, setActiveTab] = useState('overview')

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'activity', label: 'Activity', icon: '💸' },
    { id: 'planning', label: 'Planning', icon: '🍱' },
    { id: 'insights', label: 'Insights', icon: '🧠' },
    { id: 'ledgers', label: 'Utilities', icon: '🗓️' }
  ]

  const handleDeposit = async () => {
    await fetch(`${import.meta.env.VITE_API_URL}/api/planning/budget/deposit`, {
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
    await fetch(`${import.meta.env.VITE_API_URL}/api/planning/budget/fund`, {
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

  const handleRollover = async () => {
    setIsRolloverModalOpen(true)
  }

  const confirmRollover = async () => {
    await fetch(`${import.meta.env.VITE_API_URL}/api/planning/budget/rollover`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('ledger_token')}` }
    })
    mutateBudgets()
    setIsRolloverModalOpen(false)
    showToast('Month Rolled Over Successfully')
  }

  const toggleReconcile = async (txId: string, current: boolean) => {
    await fetch(`${import.meta.env.VITE_API_URL}/api/financials/transactions/${txId}/reconcile`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('ledger_token')}`,
        'x-household-id': localStorage.getItem('ledger_household_id') || 'household-abc'
      },
      body: JSON.stringify({ status: current ? 'none' : 'reconciled' })
    })
    mutateTx()
    showToast('Transaction Updated')
  }

  const handleCalendarSave = async (data: any) => {
    const isNew = !data.id
    const endpoint = data.type === 'bill' ? '/api/planning/subscriptions' : '/api/financials/transactions'
    const method = isNew ? 'POST' : 'PATCH'
    const url = isNew ? endpoint : `${endpoint}/${data.id}`
    
    // Map fields for backend
    const payload = data.type === 'bill' ? {
      name: data.description,
      amount_cents: data.amount_cents,
      next_billing_date: data.date,
      status: 'active'
    } : {
      description: data.description,
      amount_cents: data.amount_cents,
      transaction_date: data.date,
      status: 'none'
    }

    await fetch(`${import.meta.env.VITE_API_URL}${url}`, {
      method,
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('ledger_token')}`
      },
      body: JSON.stringify(payload)
    })
    
    if (data.type === 'bill') mutateSubs()
    else mutateTx()
    
    setIsCalendarModalOpen(false)
    showToast(isNew ? 'Entry Created' : 'Entry Updated')
  }

  const handleCalendarDelete = async (id: string, type: string) => {
    setDeletePending({ id, type })
    setIsDeleteModalOpen(true)
  }

  const confirmCalendarDelete = async () => {
    if (!deletePending) return
    const { id, type } = deletePending
    const endpoint = type === 'subscription' ? '/api/planning/subscriptions' : '/api/financials/transactions'
    
    await fetch(`${import.meta.env.VITE_API_URL}${endpoint}/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('ledger_token')}` }
    })
    
    if (type === 'subscription') mutateSubs()
    else mutateTx()
    
    setIsDeleteModalOpen(false)
    setIsCalendarModalOpen(false)
    setDeletePending(null)
    showToast('Entry Deleted')
  }

  return (
    <MainLayout view={view} setView={setView}>
      <AnimatePresence>
        {announcements && announcements.length > 0 && (
          <div className="mb-8 space-y-4">
            {Array.isArray(announcements) && announcements.map((ann: any) => (
              <motion.div 
                key={ann.id}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`p-5 rounded-[2rem] border flex items-start gap-4 shadow-2xl backdrop-blur-2xl ${
                  ann.priority === 'critical' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                  ann.priority === 'warning' ? 'bg-orange-500/10 border-orange-500/20 text-orange-500' :
                  'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                }`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  ann.priority === 'critical' ? 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]' :
                  ann.priority === 'warning' ? 'bg-orange-500 text-black' :
                  'bg-emerald-500 text-black'
                }`}>
                  {ann.priority === 'critical' ? <AlertTriangle size={24} /> :
                   ann.priority === 'warning' ? <Bell size={24} /> :
                   <Info size={24} />}
                </div>
                <div className="flex-1 pt-1">
                  <h4 className="text-sm font-black uppercase tracking-[0.2em] mb-1.5">{ann.title}</h4>
                  <p className="text-xs font-bold opacity-70 leading-relaxed">{ann.content_md}</p>
                </div>
                {user?.global_role === 'super_admin' && (
                  <button 
                    onClick={() => mutateAnnouncements()}
                    className="p-2 hover:bg-white/5 rounded-xl transition-all mt-1"
                  >
                    <XCircle size={18} className="opacity-30" />
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
      <GuidedTour />
      <div className="reveal">
        <OnboardingChecklist />
      </div>

      <div className="tab-container mt-8 reveal">
        {tabs.map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="dashboard-grid stagger">
            <section className="card">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Safe-to-Spend Balance</h3>
                <SearchableSelect 
                  options={[
                    { value: 'paycheck', label: 'Until Payday' },
                    { value: 'month', label: 'Until End of Month' },
                    { value: '30d', label: 'Rolling 30 Days' }
                  ]}
                  value={timeframe}
                  onChange={(val) => setTimeframe(val)}
                  className="min-w-[140px]"
                />
              </div>
              <div className="safe-to-spend-container">
                <Price amountCents={analysis?.safeToSpendCents || analysis?.safetyNumberCents || 0} />
              </div>
              <p className="text-sm text-secondary uppercase tracking-widest font-bold opacity-60">Spendable cash for selected window</p>
            </section>

            <section className="card">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Future Balance</h3>
                <div className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase font-black">6-Month Forecast</div>
              </div>
              <div className="text-3xl font-black text-white mb-2">
                <Price amountCents={Array.isArray(forecast) ? (forecast.at(-1)?.balanceCents || 0) : 0} options={{ minimumFractionDigits: 0 }} />
              </div>
              <div className="flex items-center gap-2 mb-4">
                 <span className="w-2 h-2 bg-emerald-500 rounded-full pulse"></span>
                 <span className="text-xs text-secondary font-bold uppercase tracking-widest opacity-60">Estimated Available Money</span>
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden flex">
                {Array.isArray(forecast) && forecast.slice(0, 6).map((p: any, i: number) => (
                  <div 
                    key={i} 
                    className="h-full border-r border-black/20 bg-primary/40 transition-all hover:bg-primary"
                    style={{ width: '16.66%', opacity: 0.3 + (i * 0.1) }}
                    title={`${p.date}: $${(p.balanceCents/100).toFixed(0)}`}
                  />
                ))}
              </div>
            </section>

          </div>
        )}

        {activeTab === 'activity' && (
          <div className="space-y-8">
            <section className="card stagger">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold">Recent Activity</h3>
                <div className="flex items-center gap-4">
                  <div className="flex bg-white/5 p-1 rounded-xl border border-glass-border">
                     <input 
                        type="text" 
                        placeholder="Filter search..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent border-none text-sm text-white px-3 py-1 outline-none w-32 focus:w-48 transition-all"
                      />
                  </div>
                  <div className="flex gap-4 items-center mr-4">
                    <a href="#/data" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary hover:text-white transition-all no-underline">
                      <span>📥</span> Import & Export
                    </a>
                    {['all', 'unmatched', 'matched'].map(s => (
                      <button 
                        key={s}
                        onClick={() => setFilterStatus(s)}
                        className={`text-[12px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all ${filterStatus === s ? 'bg-primary border-primary text-white' : 'bg-white/5 border-glass-border text-secondary hover:text-white'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                {Array.isArray(transactions) ? transactions.filter((tx: any) => {
                  const matchesSearch = tx.description?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                     (tx.confirmation_number && tx.confirmation_number.toLowerCase().includes(searchQuery.toLowerCase()))
                  const matchesStatus = filterStatus === 'all' || 
                                     (filterStatus === 'unmatched' ? tx.reconciliation_status !== 'reconciled' : tx.reconciliation_status === 'reconciled')
                  return matchesSearch && matchesStatus
                }).map((tx: any) => (
                  <div key={tx.id} className="flex items-center justify-between p-4 bg-white/5 border border-transparent hover:border-glass-border rounded-xl transition-all group">
                    <div className="flex items-center gap-4 flex-1">
                      <input 
                        type="checkbox" 
                        checked={selectedTxIds.includes(tx.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedTxIds([...selectedTxIds, tx.id])
                          else setSelectedTxIds(selectedTxIds.filter(id => id !== tx.id))
                        }}
                        className="w-5 h-5 rounded-lg bg-white/5 border-glass-border text-primary focus:ring-primary cursor-pointer"
                      />
                      <div>
                        <div className="font-bold flex items-center gap-3">
                          {tx.description}
                          {tx.status === 'paid' && (
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full uppercase font-black border border-emerald-500/20">Paid</span>
                          )}
                          {tx.status === 'pending' && (
                            <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full uppercase font-black border border-amber-500/20">Pending</span>
                          )}
                          {tx.status === 'scheduled' && (
                            <span className="text-[10px] bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full uppercase font-black border border-blue-500/20">Scheduled</span>
                          )}
                          {(tx.status === 'unpaid' || !tx.status) && (
                            <span className="text-[10px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full uppercase font-black border border-red-500/20">Unpaid</span>
                          )}
                          {tx.reconciliation_status === 'reconciled' && (
                            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase font-black">Cleared</span>
                          )}
                        </div>
                        <div className="text-xs text-secondary uppercase font-bold opacity-60 flex items-center gap-2">
                           {tx.transaction_date}
                           {tx.confirmation_number && <span className="text-slate-500 pr-2 border-r border-white/10">#{tx.confirmation_number}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <Price amountCents={tx.amount_cents} className="text-lg font-black tracking-tighter" />
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setLinkingTx(tx)}
                          className="p-2 bg-secondary/10 text-secondary border border-secondary/20 rounded-lg hover:bg-secondary/20"
                          title="Change Match"
                        >
                          🔗
                        </button>
                        <button 
                          onClick={() => toggleReconcile(tx.id, tx.status === 'reconciled')}
                          className={`px-3 py-2 text-[12px] font-black uppercase tracking-widest rounded-lg border transition-all ${tx.status === 'reconciled' ? 'bg-primary border-primary text-white' : 'bg-transparent border-primary/50 text-primary hover:bg-primary/10'}`}
                        >
                          {tx.status === 'reconciled' ? '✓' : 'Match'}
                        </button>
                      </div>
                    </div>
                  </div>
                )) : <p className="text-xs text-secondary italic opacity-40 py-4 px-2">No activity records found.</p>}
              </div>
            </section>

            <div className="dashboard-grid">
              <section className="card">
                <div className="text-xs text-secondary uppercase tracking-widest font-bold mb-4">Spending Trend</div>
                <SpendingChart data={transactions || []} />
              </section>
              <section className="card">
                <div className="text-xs text-secondary uppercase tracking-widest font-bold mb-4">Activity Heatmap</div>
                <SpendingHeatmap transactions={transactions || []} />
              </section>
            </div>

            <section className="card bg-primary/5 border-primary/20">
              <h3 className="text-lg font-bold mb-1">Add Transaction</h3>
              <p className="text-xs text-secondary uppercase font-bold opacity-60 mb-6">Instantly record new entries</p>
              
              <div className="flex flex-wrap gap-2 mb-6">
                {Array.isArray(templates) ? templates.map((tpl: any) => (
                  <button 
                    key={tpl.id} 
                    onClick={() => {
                      const descInput = document.getElementById('qe-desc') as HTMLInputElement
                      const amountInput = document.getElementById('qe-amount') as HTMLInputElement
                      if (descInput) descInput.value = tpl.name
                      if (amountInput) amountInput.value = (tpl.amount_cents / 100).toFixed(2)
                    }}
                    className="text-[12px] font-black uppercase tracking-widest px-3 py-1.5 bg-white/5 border border-glass-border rounded-lg hover:border-primary/50 hover:bg-white/10 transition-all font-bold"
                  >
                    {tpl.name}
                  </button>
                )) : <p className="text-xs text-secondary italic opacity-40">No templates available.</p>}
              </div>

              <form className="flex flex-col sm:flex-row gap-2 sm:gap-4" onSubmit={(e) => { e.preventDefault(); /* ... */ }}>
                <input id="qe-desc" name="description" placeholder="Description (e.g. Coffee)" className="flex-[2] p-4 bg-white/10 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all font-bold text-sm" required />
                <div className="flex gap-2 sm:contents">
                  <input id="qe-amount" name="amount" type="number" step="0.01" placeholder="0.00" className="flex-1 p-4 bg-white/10 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all font-bold text-sm" required />
                  <button type="submit" className="px-8 bg-primary rounded-xl font-black uppercase tracking-widest text-xs">Save</button>
                </div>
              </form>
            </section>
          </div>
        )}

        {activeTab === 'planning' && (
          <div className="space-y-8 stagger">
            <section className="card">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold">Cash Flow Calendar</h3>
              </div>
              <Calendar 
                transactions={transactions || []} 
                subscriptions={subscriptions || []}
                onDayClick={(date) => {
                  setSelectedCalendarDate(date)
                  setSelectedCalendarItem(null)
                  setIsCalendarModalOpen(true)
                }}
                onItemClick={(item) => {
                  setSelectedCalendarItem(item)
                  setIsCalendarModalOpen(true)
                }}
              />
            </section>

            <div className="dashboard-grid stagger">
              <section className="card">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                  <h3 className="text-lg font-bold uppercase tracking-tight italic">Budget Categories</h3>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={handleRollover} className="text-[10px] font-black uppercase tracking-widest px-3 py-2 bg-white/5 border border-glass-border rounded-xl hover:bg-white/10 transition-all">Roll Over</button>
                    <button onClick={() => setShowDepositModal(true)} className="text-[10px] font-black uppercase tracking-widest px-3 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl hover:bg-primary/20 transition-all">Deposit</button>
                    <button onClick={() => setShowFundModal(true)} className="text-[10px] font-black uppercase tracking-widest px-3 py-2 bg-secondary/10 text-secondary border border-secondary/20 rounded-xl hover:bg-secondary/20 transition-all">Fund</button>
                  </div>
                </div>
                <div className="text-3xl font-black text-primary mb-1">
                  <Price amountCents={budgetsData?.unallocated_balance_cents || 0} />
                </div>
                <div className="text-xs text-secondary uppercase tracking-widest font-bold opacity-60 mb-6">Unallocated Funds</div>
                
                <div className="space-y-2">
                  {Array.isArray(budgetsData?.budgets) ? budgetsData.budgets.filter((b: any) => b.is_envelope).map((b: any) => (
                    <div key={b.id} className="interactive-card hover:border-primary/30 transition-all group p-4 border-l-4 border-l-transparent hover:border-l-primary">
                       <div className="flex flex-row-responsive justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">{b.icon}</div>
                             <div>
                                <h4 className="font-bold text-sm leading-none">{b.name}</h4>
                                <p className="text-[10px] text-secondary opacity-40 uppercase tracking-widest mt-1 hide-on-narrow">Active Category</p>
                             </div>
                          </div>
                          <div className={`text-xl font-black tracking-tighter ${((b.envelope_balance_cents || 0) < 0) ? 'text-red-500' : 'text-white'}`}>
                             <Price amountCents={b.envelope_balance_cents || 0} />
                          </div>
                       </div>
                       
                       <div className="space-y-2">
                          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                             <span className="text-secondary opacity-60">Activity</span>
                             <span className="text-white opacity-80"><Price amountCents={b.spend_cents || 0} /> <span className="hide-on-narrow">/ <Price amountCents={b.monthly_budget_cents || 0} /></span></span>
                          </div>
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                             <div 
                               className={`h-full transition-all duration-700 ${((b.spend_cents || 0) > (b.monthly_budget_cents || 0)) ? 'bg-red-500' : 'bg-primary'}`}
                               style={{ width: `${Math.min(100, Math.max(0, ((b.spend_cents || 0) / (b.monthly_budget_cents || 1)) * 100))}%` }}
                             />
                          </div>
                       </div>
                    </div>
                  )) : <p className="text-sm text-secondary italic opacity-50 px-2 py-4">No budget envelopes found.</p>}
                </div>
              </section>

              <SavingsBuckets />
              <BudgetProgress />
              <TransferForm />
            </div>
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="dashboard-grid stagger">
            <section className="card">
              <h3 className="text-lg font-bold mb-6">Financial Health</h3>
              <HealthScore score={analysis?.healthScore || 0} />
              <button 
                onClick={() => window.open(`${import.meta.env.VITE_API_URL}/api/data/history/summary`, '_blank')}
                className="mt-8 w-full py-3 bg-white/5 border border-glass-border rounded-xl text-xs font-black uppercase tracking-widest text-primary hover:bg-primary/5 hover:border-primary/50 transition-all"
              >
                📥 Download Statement Summary
              </button>
            </section>

            <AICoach />
            <SmartInsights insights={insightsData?.insights || []} />
            <GoalSeek />
            <FutureFlow />
          </div>
        )}

        {activeTab === 'ledgers' && (
          <div className="space-y-8 stagger">
            <div className="dashboard-grid">
              <Subscriptions />
              <WhatIfLedger />
              <AuditChronicle />
            </div>

            <div className="dashboard-grid">
              <InviteManager />
              <DeveloperSettings />
              <ImportWizard />
            </div>
          </div>
        )}
      </div>

      {toast && <div className="status-toast reveal"><span>●</span> {toast}</div>}

      {selectedTxIds.length > 0 && (
        <div className="fixed bottom-24 sm:bottom-8 left-1/2 -translate-x-1/2 z-[100] p-1 bg-[#0f172a]/95 backdrop-blur-2xl border border-secondary rounded-2xl shadow-2xl reveal flex items-center gap-3 sm:gap-6 min-w-[300px] sm:min-w-[400px]">
          <div className="flex items-center gap-2 sm:gap-4 pl-4 sm:pl-6">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-secondary">{selectedTxIds.length} <span className="hidden xs:inline">Selected</span></span>
            <div className="h-4 w-px bg-glass-border" />
            <span className="text-lg sm:text-xl font-black tracking-tighter">
              <Price amountCents={transactions?.filter((t: any) => selectedTxIds.includes(t.id)).reduce((acc: number, t: any) => acc + t.amount_cents, 0) || 0} />
            </span>
          </div>
          <button 
            onClick={() => setSelectedTxIds([])}
            className="ml-auto px-4 sm:px-6 py-2 sm:py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[12px] sm:text-xs font-black uppercase tracking-widest whitespace-nowrap"
          >
            Clear
          </button>
        </div>
      )}

      {linkingTx && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-modal flex items-center justify-center p-4">
          <div className="card w-full max-w-2xl reveal max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl font-black m-0">Match: {linkingTx.description}</h3>
                <Price amountCents={linkingTx.amount_cents} className="text-2xl font-black tracking-tighter text-primary" />
              </div>
              <button onClick={() => setLinkingTx(null)} className="text-2xl opacity-50 hover:opacity-100 transition-opacity">×</button>
            </div>
            
            <p className="text-sm text-secondary mb-8">Select one or more transactions to match this entry.</p>

            <div className="space-y-6">
              <div>
                <div className="text-xs text-primary font-black uppercase tracking-[0.2em] mb-3">Matches</div>
                <div className="space-y-2">
                  {Array.isArray(smartSuggestions?.find((s: any) => s.source.id === linkingTx.id)?.candidates) && 
                  {smartSuggestions?.find((s: any) => s.source.id === linkingTx.id)?.candidates?.map((t: any) => (
                      <div 
                        key={`suggest-${t.id}`}
                        onClick={async () => {
                          await fetch(`${import.meta.env.VITE_API_URL}/api/financials/transactions/${linkingTx.id}/link`, {
                            method: 'POST',
                            headers: { 
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${localStorage.getItem('ledger_token')}`
                            },
                            body: JSON.stringify({ linkedToIds: [t.id] })
                          })
                          mutateTx()
                          setLinkingTx(null)
                          showToast('Smart Match Applied')
                        }}
                        className="cursor-pointer flex justify-between p-4 bg-primary/10 border border-primary/50 rounded-xl hover:bg-primary/20 transition-all border-dashed"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm">✨</span>
                          <div>
                            <p className="font-bold text-sm">{t.description}</p>
                            <p className="text-xs uppercase font-black text-primary opacity-60">{t.type} • {t.confidence} confidence</p>
                          </div>
                        </div>
                        <span className="font-black tracking-tighter text-lg">${(Math.abs(t.amount_cents) / 100).toFixed(2)}</span>
                      </div>
                    ))}
                  {(!smartSuggestions || smartSuggestions.find((s: any) => s.source.id === linkingTx.id)?.candidates.length === 0) && (
                    <p className="text-xs text-secondary italic opacity-50 px-2 py-4">Scanning records for patterns...</p>
                  )}
                </div>
              </div>

              <div>
                <div className="text-xs text-secondary font-black uppercase tracking-[0.2em] mb-3">All Transactions</div>
                <div className="space-y-2">
                  {Array.isArray(transactions) && transactions.filter((t: any) => t.id !== linkingTx.id).map((t: any) => (
                    <div 
                      key={t.id} 
                      onClick={async () => {
                        await fetch(`${import.meta.env.VITE_API_URL}/api/financials/transactions/${linkingTx.id}/link`, {
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
                      className="cursor-pointer flex justify-between p-4 bg-white/5 border border-glass-border rounded-xl hover:border-primary/50 transition-all group"
                    >
                      <div>
                        <div className="font-bold group-hover:text-primary transition-colors">{t.description}</div>
                        <div className="text-xs text-secondary uppercase font-bold opacity-60">{t.transaction_date}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-black tracking-tighter text-lg">${(t.amount_cents / 100).toFixed(2)}</div>
                        {Math.abs(t.amount_cents) === Math.abs(linkingTx.amount_cents) && (
                          <span className="text-[10px] text-primary font-black uppercase">Exact Match</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {linkingTx.reconciliation_status === 'reconciled' && (
              <button 
                onClick={async () => {
                  await fetch(`${import.meta.env.VITE_API_URL}/api/financials/transactions/${linkingTx.id}/unlink`, {
                    method: 'POST',
                    headers: { 
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${localStorage.getItem('ledger_token')}`,
                      'x-household-id': localStorage.getItem('ledger_household_id') || 'household-abc'
                    },
                    body: JSON.stringify({ targetId: 'all' })
                  })
                  mutateTx()
                  setLinkingTx(null)
                  showToast('Links Reset')
                }}
                className="mt-8 w-full py-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-500/20 transition-all"
              >
                Reset All Links
              </button>
            )}
          </div>
        </div>
      )}

      {showFundModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-modal flex items-center justify-center p-4" onClick={() => setShowFundModal(false)}>
          <div className="card w-full max-w-md p-8 reveal space-y-6" onClick={e => e.stopPropagation()}>
            <div>
              <h3 className="text-xl font-black m-0">Add Money to Category</h3>
              <p className="text-xs text-secondary uppercase font-bold opacity-60">Allocate balance from unallocated pool</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-secondary ml-1">Select Category</label>
                <SearchableSelect 
                  options={Array.isArray(budgetsData?.budgets) ? budgetsData.budgets.filter((b: any) => b.is_envelope).map((b: any) => ({
                    value: b.id,
                    label: b.name,
                    icon: <span className="text-sm">{b.icon}</span>,
                    metadata: { subtext: `$${((b.envelope_balance_cents || 0)/100).toFixed(2)}` }
                  })) : []}
                  value={fundCategoryId}
                  onChange={(val) => setFundCategoryId(val)}
                  placeholder="Choose a category..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-secondary ml-1">Amount ($)</label>
                <input 
                  type="number" 
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full p-4 bg-white/5 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all font-bold"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowFundModal(false)} className="flex-1 py-4 bg-white/5 border border-glass-border rounded-xl font-black uppercase text-xs">Cancel</button>
                <button className="flex-1 py-4 bg-primary rounded-xl font-black uppercase text-xs" onClick={handleFund}>Allocate Funds</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDepositModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-modal flex items-center justify-center p-4" onClick={() => setShowDepositModal(false)}>
          <div className="card w-full max-w-md p-8 reveal space-y-6" onClick={e => e.stopPropagation()}>
            <div>
              <h3 className="text-xl font-black m-0">Add to Unallocated</h3>
              <p className="text-xs text-secondary uppercase font-bold opacity-60">Add funds to unallocated pool</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-secondary ml-1">Amount ($)</label>
                <input 
                  type="number" 
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full p-4 bg-white/5 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all font-bold"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowDepositModal(false)} className="flex-1 py-4 bg-white/5 border border-glass-border rounded-xl font-black uppercase text-xs">Cancel</button>
                <button className="flex-1 py-4 bg-primary rounded-xl font-black uppercase text-xs" onClick={handleDeposit}>Deposit</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <CalendarEntryModal 
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
        onSave={handleCalendarSave}
        onDelete={handleCalendarDelete}
        initialData={selectedCalendarItem}
        date={selectedCalendarDate}
      />

      {/* Confirmation Modals */}
      <Modal
        isOpen={isRolloverModalOpen}
        onClose={() => setIsRolloverModalOpen(false)}
        title="Confirm Budget Rollover"
        footer={
          <>
            <button onClick={() => setIsRolloverModalOpen(false)} className="px-6 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-black uppercase tracking-widest transition-all">Cancel</button>
            <button onClick={confirmRollover} className="px-6 py-2 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all">Continue</button>
          </>
        }
      >
        <p className="text-secondary text-sm font-medium">This will move your budget ahead by one month. Any remaining funds will be rolled over. Continue?</p>
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Entry?"
        footer={
          <>
            <button onClick={() => setIsDeleteModalOpen(false)} className="px-6 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-black uppercase tracking-widest transition-all">Cancel</button>
            <button onClick={confirmCalendarDelete} className="px-6 py-2 bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all font-bold">Delete Forever</button>
          </>
        }
      >
        <p className="text-secondary text-sm font-medium">Are you sure you want to delete this entry? This action cannot be undone.</p>
      </Modal>
    </MainLayout>
  )
}

export default DashboardPage
