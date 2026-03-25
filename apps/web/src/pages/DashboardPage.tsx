import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
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
import { PrivacySettings } from '../components/PrivacySettings'
import FutureFlow from '../components/FutureFlow'
import GoalSeek from '../components/GoalSeek'
import SavingsBuckets from '../components/SavingsBuckets'
import { MainLayout } from '../components/layout/MainLayout'
import { GuidedTour } from '../components/GuidedTour'
import { OnboardingChecklist } from '../components/OnboardingChecklist'

const DashboardPage: React.FC<{ view: 'list' | 'calendar', setView: (v: 'list' | 'calendar') => void }> = ({ view, setView }) => {
  const { user } = useAuth()
  const { data: accounts } = useApi('/api/accounts')
  const { data: transactions, mutate: mutateTx } = useApi('/api/transactions')
  const { data: templates } = useApi('/api/templates')
  const [timeframe, setTimeframe] = useState('paycheck')
  const { data: analytics } = useApi(`/api/analytics/summary?timeframe=${timeframe}`)
  const { data: insightsData } = useApi('/api/analytics/insights')
  const { data: projections } = useApi('/api/analytics/projection')
  const { data: smartSuggestions } = useApi('/api/transactions/suggest-links')
  const [toast, setToast] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [linkingTx, setLinkingTx] = useState<any>(null)
  const [settings, setSettings] = useState<any>({ dashboard_layout: {} })
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
    <MainLayout view={view} setView={setView}>
      <GuidedTour />
      <div className="reveal">
        <OnboardingChecklist />
      </div>

      <div className="dashboard-grid stagger mt-8">
        {view === 'list' ? (
          <>
            {settings.dashboard_layout?.healthScore !== false && (
              <section className="card">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold">Safety Number</h3>
                  <select 
                    value={timeframe} 
                    onChange={(e) => setTimeframe(e.target.value)}
                    className="bg-transparent border-none text-primary text-xs font-bold cursor-pointer outline-none"
                  >
                    <option value="paycheck">Until Payday</option>
                    <option value="month">Until End of Month</option>
                    <option value="30d">Rolling 30 Days</option>
                  </select>
                </div>
                <div className="safety-number-container">
                  ${((analytics?.safetyNumberCents || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-secondary uppercase tracking-widest font-bold opacity-60">Spendable cash for selected window</p>
              </section>
            )}

            {settings.dashboard_layout?.healthScore !== false && (
              <section className="card">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold">Projected Outlook</h3>
                  <div className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase font-black">6-Month Forecast</div>
                </div>
                <div className="text-3xl font-black text-white mb-2">
                  ${((projections?.[projections.length - 1]?.balanceCents || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                </div>
                <div className="flex items-center gap-2 mb-4">
                   <span className="w-2 h-2 bg-emerald-500 rounded-full pulse"></span>
                   <span className="text-[10px] text-secondary font-bold uppercase tracking-widest opacity-60">Estimated Liquid Capital</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden flex">
                  {projections?.slice(0, 6).map((p: any, i: number) => (
                    <div 
                      key={i} 
                      className="h-full border-r border-black/20 bg-primary/40 transition-all hover:bg-primary"
                      style={{ width: '16.66%', opacity: 0.3 + (i * 0.1) }}
                      title={`${p.date}: $${(p.balanceCents/100).toFixed(0)}`}
                    />
                  ))}
                </div>
              </section>
            )}

            <section className="card">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Envelope Budgeting</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowDepositModal(true)}
                    className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-all"
                  >
                    Deposit
                  </button>
                  <button 
                    onClick={() => setShowFundModal(true)}
                    className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-secondary/10 text-secondary border border-secondary/20 rounded-lg hover:bg-secondary/20 transition-all"
                  >
                    Fund
                  </button>
                </div>
              </div>
              <div className="mt-4">
                <div className="text-3xl font-black text-primary mb-1">
                  ${((budgetsData?.unallocated_balance_cents || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-secondary uppercase tracking-widest font-bold opacity-60 mb-6">Unallocated Pool</div>
                
                <div className="space-y-2">
                  {budgetsData?.budgets?.filter((b: any) => b.is_envelope).map((b: any) => (
                    <div key={b.id} className="flex justify-between items-center p-3 bg-white/5 border border-glass-border rounded-xl hover:border-primary/30 transition-all">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{b.icon}</span>
                        <span className="text-sm font-bold">{b.name}</span>
                      </div>
                      <div className={`font-black tracking-tighter ${((b.envelope_balance_cents || 0) < 0) ? 'text-red-500' : 'text-white'}`}>
                        ${((b.envelope_balance_cents || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {settings.dashboard_layout?.healthScore !== false && (
              <section className="card">
                <h3 className="text-lg font-bold mb-6">Financial Intelligence</h3>
                <div className="flex items-center gap-8">
                  <HealthScore score={analytics?.healthScore || 0} />
                  <div className="flex-1 space-y-4">
                    <div>
                      <div className="text-[10px] text-secondary uppercase tracking-widest font-bold mb-2">Spending Trend</div>
                      <SpendingChart data={transactions || []} />
                    </div>
                    <div>
                      <div className="text-[10px] text-secondary uppercase tracking-widest font-bold mb-2">Activity Heatmap</div>
                      <SpendingHeatmap transactions={transactions || []} />
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => window.open(`${import.meta.env.VITE_API_URL}/api/report/summary`, '_blank')}
                  className="mt-8 w-full py-3 bg-white/5 border border-glass-border rounded-xl text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 hover:border-primary/50 transition-all"
                >
                  📥 Generate Monthly Digest (PDF)
                </button>
              </section>
            )}

            {settings.dashboard_layout?.recentTransactions !== false && (
              <section className="card dashboard-span-full">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold">Recent Activity</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex bg-white/5 p-1 rounded-xl border border-glass-border">
                       <input 
                          type="text" 
                          placeholder="Filter search..." 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="bg-transparent border-none text-xs text-white px-3 py-1 outline-none w-32 focus:w-48 transition-all"
                        />
                    </div>
                    <div className="flex gap-1">
                      <a 
                        href="#/data" 
                        className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border bg-white/5 border-glass-border text-secondary hover:text-white transition-all flex items-center gap-2"
                      >
                        <span>📥</span> Interop
                      </a>
                      {['all', 'unreconciled', 'reconciled'].map(s => (
                        <button 
                          key={s}
                          onClick={() => setFilterStatus(s)}
                          className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all ${filterStatus === s ? 'bg-primary border-primary text-white' : 'bg-white/5 border-glass-border text-secondary hover:text-white'}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  {transactions?.filter((tx: any) => {
                    const matchesSearch = tx.description.toLowerCase().includes(searchQuery.toLowerCase())
                    const matchesStatus = filterStatus === 'all' || (filterStatus === 'unreconciled' ? tx.reconciliation_status !== 'reconciled' : tx.reconciliation_status === 'reconciled')
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
                            {tx.reconciliation_status === 'reconciled' && (
                              <span className="text-[8px] bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase font-black">Satisfied</span>
                            )}
                            {tx.reconciliation_status === 'partial' && (
                              <span className="text-[8px] bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded-full uppercase font-black">Partial (${(tx.reconciliation_progress_cents/100).toFixed(0)})</span>
                            )}
                          </div>
                          <div className="text-[10px] text-secondary uppercase font-bold opacity-60">{tx.transaction_date}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <span className="text-lg font-black tracking-tighter">${(tx.amount_cents / 100).toFixed(2)}</span>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => setLinkingTx(tx)}
                            className="p-2 bg-secondary/10 text-secondary border border-secondary/20 rounded-lg hover:bg-secondary/20"
                            title="Relink Transaction"
                          >
                            🔗
                          </button>
                          <button 
                            onClick={() => toggleReconcile(tx.id, tx.status === 'reconciled')}
                            className={`px-3 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg border transition-all ${tx.status === 'reconciled' ? 'bg-primary border-primary text-white' : 'bg-transparent border-primary/50 text-primary hover:bg-primary/10'}`}
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
          <section className="card dashboard-span-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">Financial Calendar</h3>
              <div className="text-[10px] text-secondary uppercase tracking-widest font-bold opacity-60">Visual Cashflow Projection</div>
            </div>
            <Calendar transactions={transactions || []} />
          </section>
        )}

        <section className="card">
          <h3 className="text-lg font-bold mb-6">Your Connected Accounts</h3>
          <div className="space-y-3">
            {accounts?.map((acc: any) => (
              <div key={acc.id} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-glass-border">
                <span className="text-sm font-bold text-secondary">{acc.name}</span>
                <span className="font-black tracking-tighter">${(acc.balance_cents / 100).toFixed(2)}</span>
              </div>
            )) || <p className="text-xs text-secondary italic">No accounts found.</p>}
          </div>
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

        <section className="card dashboard-span-full bg-primary/5 border-primary/20">
          <h3 className="text-lg font-bold mb-1">Quick Ledger Entry</h3>
          <p className="text-[10px] text-secondary uppercase font-bold opacity-60 mb-6">Instantly record manual entries</p>
          
          <div className="flex flex-wrap gap-2 mb-6">
            {templates?.map((tpl: any) => (
              <button 
                key={tpl.id} 
                onClick={() => {
                  const descInput = document.getElementById('qe-desc') as HTMLInputElement
                  const amountInput = document.getElementById('qe-amount') as HTMLInputElement
                  if (descInput) descInput.value = tpl.name
                  if (amountInput) amountInput.value = (tpl.amount_cents / 100).toFixed(2)
                }}
                className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 bg-white/5 border border-glass-border rounded-lg hover:border-primary/50 hover:bg-white/10 transition-all"
              >
                {tpl.name}
              </button>
            ))}
          </div>

          <form className="flex gap-4" onSubmit={(e) => {
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
            }).then(() => {
               showToast('Transaction Added Successfully');
               mutateTx();
            })
          }}>
            <input id="qe-desc" name="description" placeholder="Description (e.g. Coffee)" className="flex-[2] p-4 bg-white/10 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all font-bold" required />
            <input id="qe-amount" name="amount" type="number" step="0.01" placeholder="0.00" className="flex-1 p-4 bg-white/10 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all font-bold" required />
            <button type="submit" className="px-8 bg-primary rounded-xl font-black uppercase tracking-widest text-[10px]">Publish</button>
          </form>
        </section>
      </div>

      {toast && <div className="status-toast reveal"><span>●</span> {toast}</div>}

      {/* Floating Calculation Bar */}
      {selectedTxIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] p-1 bg-[#0f172a]/95 backdrop-blur-2xl border border-secondary rounded-2xl shadow-2xl reveal flex items-center gap-6 min-w-[400px]">
          <div className="flex items-center gap-4 pl-6">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary">{selectedTxIds.length} Selected</span>
            <div className="h-4 w-px bg-glass-border" />
            <span className="text-xl font-black tracking-tighter">
              ${((transactions?.filter((t: any) => selectedTxIds.includes(t.id)).reduce((acc: number, t: any) => acc + t.amount_cents, 0) || 0) / 100).toFixed(2)}
            </span>
          </div>
          <button 
            onClick={() => setSelectedTxIds([])}
            className="ml-auto px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest"
          >
            Clear Selection
          </button>
        </div>
      )}

      {linkingTx && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[2000] flex items-center justify-center p-4">
          <div className="card w-full max-w-2xl reveal max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl font-black m-0">Reconcile: {linkingTx.description}</h3>
                <span className="text-2xl font-black tracking-tighter text-primary">${(linkingTx.amount_cents / 100).toFixed(2)}</span>
              </div>
              <button onClick={() => setLinkingTx(null)} className="text-2xl opacity-50 hover:opacity-100 transition-opacity">×</button>
            </div>
            
            <p className="text-sm text-secondary mb-8">Select one or more transactions to satisfy this ledger entry.</p>

            <div className="space-y-6">
              <div>
                <div className="text-[10px] text-primary font-black uppercase tracking-[0.2em] mb-3">Smart Suggestions</div>
                <div className="space-y-2">
                  {smartSuggestions?.find((s: any) => s.source.id === linkingTx.id)?.candidates.map((t: any) => (
                    <div 
                      key={`suggest-${t.id}`}
                      onClick={async () => {
                        await fetch(`${import.meta.env.VITE_API_URL}/api/transactions/${linkingTx.id}/link`, {
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
                          <p className="text-[10px] uppercase font-black text-primary opacity-60">{t.type} • {t.confidence} confidence</p>
                        </div>
                      </div>
                      <span className="font-black tracking-tighter text-lg">${(Math.abs(t.amount_cents) / 100).toFixed(2)}</span>
                    </div>
                  ))}
                  {(!smartSuggestions || smartSuggestions.find((s: any) => s.source.id === linkingTx.id)?.candidates.length === 0) && (
                    <p className="text-[10px] text-secondary italic opacity-50 px-2 py-4">Scanning records for patterns...</p>
                  )}
                </div>
              </div>

              <div>
                <div className="text-[10px] text-secondary font-black uppercase tracking-[0.2em] mb-3">All Candidates</div>
                <div className="space-y-2">
                  {transactions?.filter((t: any) => t.id !== linkingTx.id).map((t: any) => (
                    <div 
                      key={t.id} 
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
                      className="cursor-pointer flex justify-between p-4 bg-white/5 border border-glass-border rounded-xl hover:border-primary/50 transition-all group"
                    >
                      <div>
                        <div className="font-bold group-hover:text-primary transition-colors">{t.description}</div>
                        <div className="text-[10px] text-secondary uppercase font-bold opacity-60">{t.transaction_date}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-black tracking-tighter text-lg">${(t.amount_cents / 100).toFixed(2)}</div>
                        {Math.abs(t.amount_cents) === Math.abs(linkingTx.amount_cents) && (
                          <span className="text-[8px] text-primary font-black uppercase">Exact Match</span>
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
                  await fetch(`${import.meta.env.VITE_API_URL}/api/transactions/${linkingTx.id}/unlink`, {
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
                className="mt-8 w-full py-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all"
              >
                Reset All Links
              </button>
            )}
          </div>
        </div>
      )}

      {showFundModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[2000] flex items-center justify-center p-4" onClick={() => setShowFundModal(false)}>
          <div className="card w-full max-w-md p-8 reveal space-y-6" onClick={e => e.stopPropagation()}>
            <div>
              <h3 className="text-xl font-black m-0">Fund Envelope</h3>
              <p className="text-[10px] text-secondary uppercase font-bold opacity-60">Allocate balance from unallocated pool</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-secondary ml-1">Select Envelope</label>
                <select 
                  value={fundCategoryId} 
                  onChange={(e) => setFundCategoryId(e.target.value)}
                  className="w-full p-4 bg-white/5 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all font-bold"
                >
                  <option value="">Choose a category...</option>
                  {budgetsData?.budgets?.filter((b: any) => b.is_envelope).map((b: any) => (
                    <option key={b.id} value={b.id}>{b.icon} {b.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-secondary ml-1">Amount ($)</label>
                <input 
                  type="number" 
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full p-4 bg-white/5 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all font-bold"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowFundModal(false)} className="flex-1 py-4 bg-white/5 border border-glass-border rounded-xl font-black uppercase text-[10px]">Cancel</button>
                <button className="flex-1 py-4 bg-primary rounded-xl font-black uppercase text-[10px]" onClick={handleFund}>Allocate Funds</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDepositModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[2000] flex items-center justify-center p-4" onClick={() => setShowDepositModal(false)}>
          <div className="card w-full max-w-md p-8 reveal space-y-6" onClick={e => e.stopPropagation()}>
            <div>
              <h3 className="text-xl font-black m-0">Deposit to Pool</h3>
              <p className="text-[10px] text-secondary uppercase font-bold opacity-60">Add funds to "To Be Allocated" pool</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-secondary ml-1">Amount ($)</label>
                <input 
                  type="number" 
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full p-4 bg-white/5 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all font-bold"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowDepositModal(false)} className="flex-1 py-4 bg-white/5 border border-glass-border rounded-xl font-black uppercase text-[10px]">Cancel</button>
                <button className="flex-1 py-4 bg-primary rounded-xl font-black uppercase text-[10px]" onClick={handleDeposit}>Deposit</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  )
}

export default DashboardPage
