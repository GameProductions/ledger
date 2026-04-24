import React, { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { useAuth } from '../context/AuthContext'
import { getApiUrl } from '../utils/api'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
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
import HealthScore from '../components/HealthScore'
import AICoach from '../components/AICoach'
import DeveloperSettings from '../components/DeveloperSettings'
import AuditChronicle from '../components/AuditChronicle'
import { Price } from '../components/Price'
import FutureFlow from '../components/FutureFlow'
import GoalSeek from '../components/GoalSeek'
import SavingsBuckets from '../components/SavingsBuckets'
import { TransactionLedger } from '../components/TransactionLedger'
import { MainLayout } from '../components/layout/MainLayout'
import { Modal } from '../components/ui/Modal';
import { GuidedTour } from '../components/GuidedTour';
import { OnboardingChecklist } from '../components/OnboardingChecklist';
import { SearchableSelect } from '../components/ui/SearchableSelect'
import { CalendarEntryModal } from '../components/CalendarEntryModal'
import { BillsList } from '../components/BillsList'
import { InstallmentsList } from '../components/InstallmentsList'
import { PaySchedulesList } from '../components/PaySchedulesList'
import { PaydayExceptionModal } from '../components/PaydayExceptionModal'
import { PayCycleTimeline } from '../components/PayCycleTimeline'
import { projectPaydays } from '../utils/payCycleUtils'
import { AlertTriangle, Info, Bell, XCircle, GripVertical, Eye, EyeOff, Settings2 } from 'lucide-react';

const DEFAULT_LAYOUT: Record<string, { id: string, visible: boolean }[]> = {
  overview: [
    { id: 'calendar', visible: true },
    { id: 'transaction-ledger', visible: true },
    { id: 'safe-to-spend', visible: true }
  ],
  activity: [
    { id: 'recent-activity', visible: true },
    { id: 'spending-trend', visible: true },
    { id: 'activity-heatmap', visible: true },
    { id: 'audit-chronicle', visible: true },
    { id: 'add-transaction', visible: true }
  ],
  planning: [
    { id: 'future-balance', visible: true },
    { id: 'budget-categories', visible: true },
    { id: 'pay-schedules-list', visible: true },
    { id: 'pay-cycle-timeline', visible: true },
    { id: 'savings-buckets', visible: true },
    { id: 'budget-progress', visible: true },
    { id: 'transfer-form', visible: true },
    { id: 'bills-list', visible: true },
    { id: 'installments-list', visible: true },
    { id: 'subscriptions', visible: true },
    { id: 'what-if-ledger', visible: true }
  ],
  insights: [
    { id: 'financial-health', visible: true },
    { id: 'ai-coach', visible: true },
    { id: 'smart-insights', visible: true },
    { id: 'goal-seek', visible: true },
    { id: 'future-flow', visible: true }
  ]
};

const DEFAULT_TABS_CONFIG = [
  { id: 'overview', label: 'Wallet', icon: '💰', visible: true },
  { id: 'planning', label: 'Lifecycle', icon: '🗓️', visible: true },
  { id: 'insights', label: 'Advisor', icon: '🤖', visible: true },
];

const DashboardPage: React.FC<{ view: 'list' | 'calendar', setView: (v: 'list' | 'calendar') => void }> = ({ view, setView }) => {
  const { user, token, householdId, logout } = useAuth()
  const apiUrl = getApiUrl();
  const { data: _accounts = [] } = useApi('/api/financials/accounts')
  const { data: transactions = [], mutate: mutateTx } = useApi('/api/financials/transactions')
  const { data: subscriptions = [], mutate: mutateSubs } = useApi('/api/planning/subscriptions')
  const { data: paySchedules = [], mutate: mutateSchedules } = useApi('/api/planning/pay-schedules')
  const { data: bills = [], mutate: mutateBills } = useApi('/api/planning/bills')
  const { data: templates = [] } = useApi('/api/planning/templates')
  const [timeframe, setTimeframe] = useState('paycheck')
  const { data: analysis } = useApi(`/api/data/analysis/summary?timeframe=${timeframe}`)
  const { data: insightsData } = useApi('/api/data/analysis/insights')
  const { data: forecast = [] } = useApi('/api/data/analysis/forecast')
  const { data: smartSuggestions = [] } = useApi('/api/financials/transactions/suggest-links')
  const { data: announcements = [], mutate: mutateAnnouncements } = useApi('/api/admin/announcements')
  const { data: installments = [], mutate: mutateInstallments } = useApi('/api/planning/installment-plans')
  const { data: payExceptions = [], mutate: mutateExceptions } = useApi('/api/planning/pay-exceptions')
  const [toast, setToast] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [linkingTx, setLinkingTx] = useState<any>(null)
  const [_settings, setSettings] = useState<any>({ dashboardLayout: {}, tabConfig: [] })
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([])
  
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false)
  const [selectedCalendarItem, setSelectedCalendarItem] = useState<any>(null)
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>()
  const [selectedPayday, setSelectedPayday] = useState<any | null>(null)

  const { data: budgetsData, mutate: mutateBudgets } = useApi('/api/planning/budgets')
  const [showFundModal, setShowFundModal] = useState(false)
  const [fundAmount, setFundAmount] = useState('')
  const [fundCategoryId, setFundCategoryId] = useState('')
  const [isRolloverModalOpen, setIsRolloverModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deletePending, setDeletePending] = useState<{ id: string, type: string } | null>(null)
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [depositAmount, setDepositAmount] = useState('')

  const [layout, setLayout] = useState(DEFAULT_LAYOUT);
  const [tabConfig, setTabConfig] = useState(DEFAULT_TABS_CONFIG);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (user?.settings_json) {
       try {
         const parsed = JSON.parse(user.settings_json)
         setSettings(parsed)
         
         if (parsed.tabConfig && Array.isArray(parsed.tabConfig)) {
           // Merge saved tab config with defaults to ensure new tabs appear
           const savedIds = parsed.tabConfig.map((t: any) => t.id);
           const mergedTabs = [
             ...parsed.tabConfig,
             ...DEFAULT_TABS_CONFIG.filter(t => !savedIds.includes(t.id))
           ];
           setTabConfig(mergedTabs);
           
           // Ensure activeTab is actually visible
           const currentTabVisible = mergedTabs.find(t => t.id === activeTab)?.visible;
           if (!currentTabVisible) {
             const firstVisible = mergedTabs.find(t => t.visible);
             if (firstVisible) setActiveTab(firstVisible.id);
           }
         }

         if (parsed.dashboardLayout) {
             const merged = { ...DEFAULT_LAYOUT };
              Object.keys(parsed.dashboardLayout).forEach(tab => {
                  if (merged[tab] && Array.isArray(parsed.dashboardLayout[tab])) {
                      const savedWidgets = parsed.dashboardLayout[tab];
                      const defaultWidgets = merged[tab];
                      const activeIds = savedWidgets.map((w: any) => w.id);
                      merged[tab] = [
                          ...savedWidgets,
                          ...defaultWidgets.filter((w: any) => !activeIds.includes(w.id))
                      ];
                  }
              });
             setLayout(merged);
         }
       } catch(e) {}
    }
  }, [user])

  const saveLayout = async (newLayout: any, newTabConfig: any = tabConfig) => {
    setLayout(newLayout);
    setTabConfig(newTabConfig);
    const newSettings = { ..._settings, dashboardLayout: newLayout, tabConfig: newTabConfig };
    setSettings(newSettings);
    await fetch(`${apiUrl}/api/user/profile`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ settings_json: JSON.stringify(newSettings) })
    });
    showToast('Layout settings saved');
  };

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const tabs = tabConfig;


  const projectedPaydays = React.useMemo(() => {
    if (!paySchedules) return [];
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 3, 0);
    return projectPaydays(paySchedules, start, end, payExceptions);
  }, [paySchedules, payExceptions]);

  const handleDeposit = async () => {
    await fetch(`${apiUrl}/api/planning/budget/deposit`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-household-id': householdId || ''
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
    await fetch(`${apiUrl}/api/planning/budget/fund`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-household-id': householdId || ''
      },
      body: JSON.stringify({ 
        categoryId: fundCategoryId,
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
    await fetch(`${apiUrl}/api/planning/budget/rollover`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'x-household-id': householdId || ''
      }
    })
    mutateBudgets()
    setIsRolloverModalOpen(false)
    showToast('Month Rolled Over Successfully')
  }

  const toggleReconcile = async (txId: string, current: boolean) => {
    await fetch(`${apiUrl}/api/financials/transactions/${txId}/reconcile`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-household-id': householdId || ''
      },
      body: JSON.stringify({ status: current ? 'none' : 'reconciled' })
    })
    mutateTx()
    showToast('Transaction Updated')
  }

  const handleCalendarSave = async (data: any) => {
    const isNew = !data.id
    const endpoint = data.type === 'pay_schedule' ? '/api/planning/pay-schedules' : data.type === 'bill' ? '/api/planning/bills' : data.type === 'subscription' ? '/api/planning/subscriptions' : '/api/financials/transactions'
    const method = isNew ? 'POST' : 'PATCH'
    const url = isNew ? endpoint : `${endpoint}/${data.id}`
    
    // Map fields for backend
    let payload = {}
    if (data.type === 'pay_schedule') {
        payload = {
            name: data.name,
            frequency: data.frequency,
            estimated_amount_cents: data.estimated_amount_cents,
            next_pay_date: data.next_pay_date,
            notes: data.notes
        }
    } else if (data.type === 'bill') {
        payload = {
            name: data.name,
            amount_cents: data.amount_cents,
            due_date: data.dueDate,
            status: data.status,
            notes: data.notes,
            is_recurring: data.isRecurring,
            frequency: data.frequency
        }
    } else {
        payload = {
            description: data.description,
            amount_cents: data.amount_cents,
            transaction_date: data.date,
            status: 'none'
        }
    }

    await fetch(`${apiUrl}${url}`, {
      method,
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-household-id': householdId || ''
      },
      body: JSON.stringify(payload)
    })
    
    if (data.type === 'pay_schedule') mutateSchedules()
    else if (data.type === 'bill') mutateBills()
    else if (data.type === 'subscription') mutateSubs()
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
    const endpoint = type === 'pay_schedule' ? '/api/planning/pay-schedules' : type === 'bill' ? '/api/planning/bills' : type === 'subscription' ? '/api/planning/subscriptions' : '/api/financials/transactions'
    
    await fetch(`${apiUrl}${endpoint}/${id}`, {
      method: 'DELETE',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'x-household-id': householdId || ''
      }
    })
    
    if (type === 'pay_schedule') mutateSchedules()
    else if (type === 'bill') mutateBills()
    else if (type === 'subscription') mutateSubs()
    else mutateTx()
    
    setIsDeleteModalOpen(false)
    setIsCalendarModalOpen(false)
    setDeletePending(null)
    showToast('Entry Deleted')
  }

  const renderWidget = (id: string) => {
    switch(id) {
      case 'calendar': return (
            <section key="calendar" className="card relative h-auto">
              <Calendar 
                  transactions={transactions || []} 
                  subscriptions={subscriptions || []} 
                  bills={bills || []}
                  installments={installments || []}
                  paySchedules={projectedPaydays}
                  payScheduleDefinitions={paySchedules}
                  onDayClick={(date) => {
                    setSelectedCalendarDate(date)
                    setSelectedCalendarItem(null)
                    setIsCalendarModalOpen(true)
                  }}
                  onItemClick={(item) => {
                    if (item.type === 'pay_schedule') {
                      setSelectedPayday(item);
                    } else {
                      setSelectedCalendarItem(item)
                      setIsCalendarModalOpen(true)
                    }
                  }}
                />
            </section>
      );
      case 'transaction-ledger': return (
        <TransactionLedger key="transaction-ledger" />
      )
      case 'safe-to-spend': return (
            <section key="safe-to-spend" className="card">
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
                <Price amount_cents={analysis?.safe_to_spend_cents || analysis?.safety_number_cents || 0} />
              </div>
              <p className="text-sm text-secondary uppercase tracking-widest font-bold opacity-60">Spendable cash for selected window</p>
            </section>
      );
      case 'future-balance': return (
            <section key="future-balance" className="card">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Future Balance</h3>
                <div className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase font-black">6-Month Forecast</div>
              </div>
              <div className="text-3xl font-black text-white mb-2">
                <Price amount_cents={Array.isArray(forecast) ? (forecast.at(-1)?.balance_cents || 0) : 0} options={{ minimumFractionDigits: 0 }} />
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
                    title={`${p.date}: $${(p.balance_cents/100).toFixed(0)}`}
                  />
                ))}
              </div>
            </section>
      );
      case 'recent-activity': return (
            <section key="recent-activity" className="card animate-in fade-in zoom-in duration-500">
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
                                     (tx.confirmationNumber && tx.confirmationNumber.toLowerCase().includes(searchQuery.toLowerCase()))
                  const matchesStatus = filterStatus === 'all' || 
                                     (filterStatus === 'unmatched' ? tx.reconciliationStatus !== 'reconciled' : tx.reconciliationStatus === 'reconciled')
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
                            <span className="text-xs font-bold bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full uppercase border border-emerald-500/20">Paid</span>
                          )}
                          {tx.status === 'pending' && (
                            <span className="text-xs font-bold bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full uppercase border border-amber-500/20">Pending</span>
                          )}
                          {tx.status === 'scheduled' && (
                            <span className="text-xs font-bold bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full uppercase border border-blue-500/20">Scheduled</span>
                          )}
                          {(tx.status === 'unpaid' || !tx.status) && (
                            <span className="text-xs font-bold bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full uppercase border border-red-500/20">Unpaid</span>
                          )}
                          {tx.reconciliationStatus === 'reconciled' && (
                            <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase">Cleared</span>
                          )}
                        </div>
                        <div className="text-xs text-secondary uppercase font-bold opacity-60 flex items-center gap-2">
                           {tx.transaction_date}
                           {tx.confirmationNumber && <span className="text-slate-500 pr-2 border-r border-white/10">#{tx.confirmationNumber}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <Price amount_cents={tx.amount_cents} className="text-lg font-black tracking-tighter" />
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
                          className={`px-3 py-2 text-xs font-bold uppercase tracking-widest rounded-lg border transition-all ${tx.status === 'reconciled' ? 'bg-primary border-primary text-white' : 'bg-transparent border-primary/50 text-primary hover:bg-primary/10'}`}
                        >
                          {tx.status === 'reconciled' ? '✓' : 'Match'}
                        </button>
                      </div>
                    </div>
                  </div>
                )) : <p className="text-xs text-secondary italic opacity-40 py-4 px-2">No activity records found.</p>}
              </div>
            </section>
      );
      case 'spending-trend': return (
              <section key="spending-trend" className="card animate-in fade-in zoom-in duration-500">
                <div className="text-xs text-secondary uppercase tracking-widest font-bold mb-4">Spending Trend</div>
                <SpendingChart data={transactions || []} />
              </section>
      );
      case 'activity-heatmap': return (
              <section key="activity-heatmap" className="card animate-in fade-in zoom-in duration-500 delay-75">
                <div className="text-xs text-secondary uppercase tracking-widest font-bold mb-4">Activity Heatmap</div>
                <SpendingHeatmap transactions={transactions || []} />
              </section>
      );
      case 'audit-chronicle': return <AuditChronicle key="audit-chronicle" />;
      case 'add-transaction': return (
            <section key="add-transaction" className="card bg-primary/5 border-primary/20 animate-in fade-in zoom-in duration-500 delay-150">
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
                    className="text-xs font-bold uppercase tracking-widest px-3 py-1.5 bg-white/5 border border-glass-border rounded-lg hover:border-primary/50 hover:bg-white/10 transition-all"
                  >
                    {tpl.name}
                  </button>
                )) : <p className="text-xs text-secondary italic opacity-40">No templates available.</p>}
              </div>

              <form className="flex flex-col sm:flex-row gap-2 sm:gap-4" onSubmit={async (e) => { 
                e.preventDefault(); 
                const descInput = document.getElementById('qe-desc') as HTMLInputElement;
                const amountInput = document.getElementById('qe-amount') as HTMLInputElement;
                if(!descInput.value || !amountInput.value) return;
                try {
                    await fetch(`${apiUrl}/api/financials/transactions`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'x-household-id': householdId || ''
                      },
                      body: JSON.stringify({ 
                        description: descInput.value, 
                        amount_cents: Math.round(parseFloat(amountInput.value) * 100), 
                        transaction_date: new Date().toISOString().split('T')[0], 
                        status: 'none' 
                      })
                  });
                  mutateTx();
                  descInput.value = '';
                  amountInput.value = '';
                  showToast('Transaction Added');
                } catch(err) {
                  showToast('Failed to add transaction');
                }
              }}>
                <input id="qe-desc" name="description" placeholder="Description (e.g. Coffee)" className="flex-[2] p-4 bg-white/10 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all font-bold text-sm" required />
                <div className="flex gap-2 sm:contents">
                  <input id="qe-amount" name="amount" type="number" step="0.01" placeholder="0.00" className="flex-1 p-4 bg-white/10 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all font-bold text-sm" required />
                  <button type="submit" className="px-8 bg-primary rounded-xl font-black uppercase tracking-widest text-xs">Save</button>
                </div>
              </form>
            </section>
      );
      case 'budget-categories': return (
              <section key="budget-categories" className="card animate-in fade-in zoom-in duration-500">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                  <h3 className="text-lg font-bold uppercase tracking-tight italic">Budget Categories</h3>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={handleRollover} className="text-xs font-bold uppercase tracking-widest px-3 py-2 bg-white/5 border border-glass-border rounded-xl hover:bg-white/10 transition-all">Roll Over</button>
                    <button onClick={() => setShowDepositModal(true)} className="text-xs font-bold uppercase tracking-widest px-3 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl hover:bg-primary/20 transition-all">Deposit</button>
                    <button onClick={() => setShowFundModal(true)} className="text-xs font-bold uppercase tracking-widest px-3 py-2 bg-secondary/10 text-secondary border border-secondary/20 rounded-xl hover:bg-secondary/20 transition-all">Fund</button>
                  </div>
                </div>
                <div className="text-3xl font-black text-primary mb-1">
                  <Price amount_cents={budgetsData?.unallocated_balance_cents || 0} />
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
                                <p className="text-xs text-secondary opacity-40 uppercase tracking-widest mt-1 hide-on-narrow">Active Category</p>
                             </div>
                          </div>
                          <div className={`text-xl font-black tracking-tighter ${((b.envelope_balance_cents || 0) < 0) ? 'text-red-500' : 'text-white'}`}>
                             <Price amount_cents={b.envelope_balance_cents || 0} />
                          </div>
                       </div>
                       
                       <div className="space-y-2">
                          <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                             <span className="text-secondary opacity-60">Activity</span>
                             <span className="text-white opacity-80"><Price amount_cents={b.spend_cents || 0} /> <span className="hide-on-narrow">/ <Price amount_cents={b.monthly_budget_cents || 0} /></span></span>
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
      );
      case 'pay-schedules-list': return <PaySchedulesList key="pay-schedules-list" />;
      case 'pay-cycle-timeline': return <PayCycleTimeline key="pay-cycle-timeline" paydays={projectedPaydays} liabilities={[...(subscriptions || []), ...(bills || []), ...(installments || [])]} />;
      case 'savings-buckets': return <SavingsBuckets key="savings-buckets" />;
      case 'budget-progress': return <BudgetProgress key="budget-progress" />;
      case 'transfer-form': return <TransferForm key="transfer-form" />;
      case 'bills-list': return <BillsList key="bills-list" />;
      case 'installments-list': return <InstallmentsList key="installments-list" />;
      case 'subscriptions': return <Subscriptions key="subscriptions" />;
      case 'what-if-ledger': return <WhatIfLedger key="what-if-ledger" />;
      case 'financial-health': return (
            <section key="financial-health" className="card animate-in fade-in zoom-in duration-500">
              <h3 className="text-lg font-bold mb-6">Financial Health</h3>
              <HealthScore score={analysis?.healthScore || 0} />
              <button 
                onClick={() => window.open(`${apiUrl}/api/data/history/summary`, '_blank')}
                className="mt-8 w-full py-3 bg-white/5 border border-glass-border rounded-xl text-xs font-black uppercase tracking-widest text-primary hover:bg-primary/5 hover:border-primary/50 transition-all"
              >
                📥 Download Statement Summary
              </button>
            </section>
      );
      case 'ai-coach': return <AICoach key="ai-coach" />;
      case 'smart-insights': return <SmartInsights key="smart-insights" insights={insightsData?.insights || []} />;
      case 'goal-seek': return <GoalSeek key="goal-seek" />;
      case 'future-flow': return <FutureFlow key="future-flow" />;
      default: return null;
    }
  }

  const renderLayoutCustomizer = () => {
    if (!isCustomizing) return null;
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[9999] p-4 flex items-center justify-center pointer-events-auto" onClick={(e) => { e.stopPropagation(); setIsCustomizing(false); }}>
        <div className="card w-full max-w-lg p-8 max-h-[80vh] overflow-y-auto space-y-6" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center bg-deep sticky top-0 pb-4 z-10 border-b border-white/5">
              <div>
                  <h3 className="text-xl font-black uppercase tracking-tighter italic m-0">Customize Layout</h3>
                  <p className="text-xs text-secondary font-bold uppercase tracking-widest opacity-60">Drag to reorder • Toggle visibility</p>
              </div>
              <button onClick={() => setIsCustomizing(false)} className="opacity-50 hover:opacity-100 p-2">✕</button>
          </div>

          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-black uppercase tracking-widest text-primary border-b border-primary/20 pb-2">Main Navigation</h4>
            <Reorder.Group 
                axis="y" 
                values={tabConfig} 
                onReorder={(newOrder) => setTabConfig(newOrder)}
                className="space-y-2"
            >
                {tabConfig.map((tab) => (
                    <Reorder.Item 
                        key={tab.id} 
                        value={tab}
                        className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-grab active:cursor-grabbing ${tab.visible ? 'bg-white/5 border-glass-border hover:border-primary/50' : 'bg-transparent border-white/5 opacity-50'}`}
                    >
                        <div className="flex items-center gap-3">
                            <GripVertical size={16} className="text-secondary/50" />
                            <span className="text-sm font-bold text-white">{tab.icon} {tab.label}</span>
                        </div>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                const newTabs = tabConfig.map(t => t.id === tab.id ? { ...t, visible: !t.visible } : t);
                                setTabConfig(newTabs);
                                
                                // Fallback for activeTab if hidden
                                if (tab.id === activeTab && tab.visible) {
                                   const nextVisible = newTabs.find(t => t.visible);
                                   if (nextVisible) setActiveTab(nextVisible.id);
                                }
                            }}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            {tab.visible ? <Eye size={16} className="text-primary" /> : <EyeOff size={16} className="text-secondary" />}
                        </button>
                    </Reorder.Item>
                ))}
            </Reorder.Group>
          </div>

          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-black uppercase tracking-widest text-primary border-b border-primary/20 pb-2">{tabs.find(t => t.id === activeTab)?.label} Tab Configuration</h4>
            <Reorder.Group 
                axis="y" 
                values={layout[activeTab] || []} 
                onReorder={(newOrder) => {
                    setLayout({ ...layout, [activeTab]: newOrder });
                }}
                className="space-y-2"
            >
                {(layout[activeTab] || []).map((item) => (
                    <Reorder.Item 
                        key={item.id} 
                        value={item}
                        className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-grab active:cursor-grabbing ${item.visible ? 'bg-white/5 border-glass-border hover:border-primary/50' : 'bg-transparent border-white/5 opacity-50'}`}
                    >
                        <div className="flex items-center gap-3">
                            <GripVertical size={16} className="text-secondary/50" />
                            <span className="text-xs font-black uppercase tracking-widest text-white">{item.id.replace(/-/g, ' ')}</span>
                        </div>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                const newTabItems = (layout[activeTab] || []).map(w => w.id === item.id ? { ...w, visible: !w.visible } : w);
                                setLayout({ ...layout, [activeTab]: newTabItems });
                            }}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            {item.visible ? <Eye size={16} className="text-primary" /> : <EyeOff size={16} className="text-secondary" />}
                        </button>
                    </Reorder.Item>
                ))}
            </Reorder.Group>
            
          </div>
          
          <div className="pt-6 border-t border-white/5 flex gap-4 sticky bottom-0 bg-deep pt-4">
              <button 
                  className="flex-1 py-4 bg-white/5 border border-glass-border rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all"
                  onClick={() => {
                    // Reset to saved state on cancel
                    if (user?.settings_json) {
                      const parsed = JSON.parse(user.settings_json);
                      if (parsed.tabConfig) setTabConfig(parsed.tabConfig);
                      if (parsed.dashboardLayout) setLayout(parsed.dashboardLayout);
                    }
                    setIsCustomizing(false);
                  }}
              >
                  Cancel
              </button>
              <button 
                  className="flex-1 py-4 bg-primary text-white shadow-[0_0_20px_rgba(16,185,129,0.2)] rounded-xl text-xs font-bold uppercase tracking-widest hover:brightness-110 transition-all transition-all"
                  onClick={() => { saveLayout(layout, tabConfig); setIsCustomizing(false); }}
              >
                  Save Global Layout
              </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <MainLayout view={view} setView={setView}>
      <AnimatePresence>
        {Array.isArray(announcements) && announcements.length > 0 && (
          <div className="mb-8 space-y-4">
            {announcements.map((ann: any) => (
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
                  <div className="text-xs font-bold opacity-70 leading-relaxed markdown-content">
                    <ReactMarkdown>{ann.contentMd}</ReactMarkdown>
                  </div>
                </div>
                {user?.globalRole === 'super_admin' && (
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

      
      <div className="tab-container mt-8 reveal flex items-center pr-2 overflow-hidden">
        <div className="flex gap-4 overflow-x-auto scrollbar-hide flex-1 py-1">
          {(tabs || []).filter(t => t.visible).map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>
        <button 
          onClick={() => setIsCustomizing(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-glass-border hover:bg-white/10 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ml-4 whitespace-nowrap"
        >
          <Settings2 size={14} className="text-secondary hover:text-white" /> Customize View
        </button>
      </div>


      <div className="tab-content relative">
         <div className="dashboard-grid stagger min-h-[50vh]">
            {(layout[activeTab] || []).filter((w: any) => w.visible).map((w: any) => (
                <div 
                  key={w.id} 
                  className={activeTab === 'overview' && (w.id === 'calendar' || w.id === 'transaction-ledger') ? 'dashboard-full-width' : ''}
                >
                    {renderWidget(w.id)}
                </div>
            ))}
         </div>
      </div>

      {renderLayoutCustomizer()}

      {toast && <div className="status-toast reveal"><span>●</span> {toast}</div>}

      {selectedTxIds.length > 0 && (
        <div className="fixed bottom-24 sm:bottom-8 left-1/2 -translate-x-1/2 z-[100] p-1 bg-[#0f172a]/95 backdrop-blur-2xl border border-secondary rounded-2xl shadow-2xl reveal flex items-center gap-3 sm:gap-6 min-w-[300px] sm:min-w-[400px]">
          <div className="flex items-center gap-2 sm:gap-4 pl-4 sm:pl-6">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-secondary">{selectedTxIds.length} <span className="hidden xs:inline">Selected</span></span>
            <div className="h-4 w-px bg-glass-border" />
            <span className="text-lg sm:text-xl font-black tracking-tighter">
              <Price amount_cents={(Array.isArray(transactions) ? transactions : []).filter((t: any) => selectedTxIds.includes(t.id)).reduce((acc: number, t: any) => acc + (t.amount_cents || 0), 0)} />
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
                <Price amount_cents={linkingTx.amount_cents} className="text-2xl font-black tracking-tighter text-primary" />
              </div>
              <button onClick={() => setLinkingTx(null)} className="text-2xl opacity-50 hover:opacity-100 transition-opacity">×</button>
            </div>
            
            <p className="text-sm text-secondary mb-8">Select one or more transactions to match this entry.</p>

            <div className="space-y-6">
              <div>
                <div className="text-xs text-primary font-black uppercase tracking-[0.2em] mb-3">Matches</div>
                <div className="space-y-2">
                  {Array.isArray(smartSuggestions?.find((s: any) => s.source.id === linkingTx.id)?.candidates) && 
                  smartSuggestions?.find((s: any) => s.source.id === linkingTx.id)?.candidates?.map((t: any) => (
                      <div 
                        key={`suggest-${t.id}`}
                        onClick={async () => {
                          await fetch(`${apiUrl}/api/financials/transactions/${linkingTx.id}/link`, {
                            method: 'POST',
                            headers: { 
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${token}`,
                              'x-household-id': householdId || ''
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
                          </div>
                        </div>
                        <span className="font-black tracking-tighter text-lg">${(Math.abs(t.amount_cents) / 100).toFixed(2)}</span>
                      </div>
                    ))}
                  {(!smartSuggestions || !smartSuggestions.find((s: any) => s.source.id === linkingTx.id)?.candidates?.length) && (
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
                        await fetch(`${apiUrl}/api/financials/transactions/${linkingTx.id}/link`, {
                          method: 'POST',
                          headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`,
                            'x-household-id': householdId || ''
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
            
            {linkingTx.reconciliationStatus === 'reconciled' && (
              <button 
                onClick={async () => {
                  await fetch(`${apiUrl}/api/financials/transactions/${linkingTx.id}/unlink`, {
                    method: 'POST',
                    headers: { 
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`,
                      'x-household-id': householdId || ''
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
                <a href="#/settings" className="text-[10px] sm:text-xs text-primary font-black uppercase tracking-widest hover:underline mt-2 inline-block ml-1">Manage Categories &rarr;</a>
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
      {selectedPayday && (
        <PaydayExceptionModal 
          payday={selectedPayday} 
          isOpen={!!selectedPayday} 
          onClose={() => setSelectedPayday(null)} 
          onUpdate={() => {
            mutateExceptions();
          }} 
        />
      )}
    </MainLayout>
  )
}

export default DashboardPage
