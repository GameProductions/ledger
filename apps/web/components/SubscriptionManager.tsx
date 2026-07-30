import React, { useState, useEffect, useMemo } from 'react'
import { useApi, globalMutate } from '../hooks/useApi'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { getApiUrl } from '../utils/api'
import { Bell, Link, Share2, Search, Plus, X, Trash2, CheckCircle2, Receipt, Globe, Ban, Info } from 'lucide-react'
import { Price } from './Price'
import { ProviderLogo } from './shared/ProviderLogo'
import { StatusBadge } from './shared/StatusBadge'
import { UpcomingChangeBadge } from './shared/UpcomingChangeBadge'
import { MasterSplitLedger } from './shared/MasterSplitLedger'
import { LiabilityItemCard } from './shared/LiabilityItemCard'
import { EmptyPlaceholder } from './shared/EmptyPlaceholder'
import { SearchableSelect } from './ui/SearchableSelect'
import { CurrencyInput } from './ui/CurrencyInput'
import { ReminderManager } from './ReminderManager'
import { LiabilitySplitter } from './LiabilitySplitter'
import { ShareDialog } from './shared/ShareDialog'
import { autoFetchLogo } from '../utils/logoUtils'

const BILLING_CYCLES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'biannual', label: 'Biannual' },
  { value: 'annual', label: 'Annual' },
  { value: 'biennial', label: 'Biennial' },
]

const ANNUAL_MULTIPLIER: Record<string, number> = {
  weekly: 52,
  biweekly: 26,
  monthly: 12,
  quarterly: 4,
  biannual: 2,
  annual: 1,
  biennial: 0.5,
}

interface SubManagerProps {
  compact?: boolean
  onNavigateToFull?: () => void
}

const SubscriptionManager: React.FC<SubManagerProps> = ({ compact, onNavigateToFull }) => {
  const { token, householdId } = useAuth()
  const { showToast } = useToast()
  const { data: subs = [], loading, mutate } = (useApi('/api/planning/subscriptions') as any)
  const { data: linkedAccounts = [] } = (useApi('/api/user/linked-accounts') as any)
  const { data: providers = [] } = (useApi('/api/user/service-providers') as any)
  const { data: paymentMethodsData } = (useApi('/api/user/payment-methods') as any)
  const paymentMethods: any[] = paymentMethodsData?.data ?? []

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [cycleFilter, setCycleFilter] = useState('all')
  const [sortBy, setSortBy] = useState('name')
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingSub, setEditingSub] = useState<any>(null)
  const [cancelTarget, setCancelTarget] = useState<any>(null)
  const [reminderTarget, setReminderTarget] = useState<{ id: string; name: string } | null>(null)
  const [openSplitterId, setOpenSplitterId] = useState<string | null>(null)
  const [openTrackerId, setOpenTrackerId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [shareTarget, setShareTarget] = useState<{ id: string; name: string } | null>(null)

  const isCancelled = (s: any) => s.endDate && new Date(s.endDate) < new Date()

  const filtered = useMemo(() => {
    if (!Array.isArray(subs)) return []
    let result = subs.filter((s: any) => {
      const cancelled = isCancelled(s)
      if (search && !s.name?.toLowerCase().includes(search.toLowerCase())) return false
      if (statusFilter === 'active' && (cancelled || s.isTrial)) return false
      if (statusFilter === 'trial' && !s.isTrial) return false
      if (statusFilter === 'cancelled' && !cancelled) return false
      if (cycleFilter !== 'all' && s.billingCycle !== cycleFilter) return false
      return true
    })
    result.sort((a: any, b: any) => {
      let cmp = 0
      if (sortBy === 'name') cmp = (a.name || '').localeCompare(b.name || '')
      else if (sortBy === 'amount') cmp = (a.amountCents || 0) - (b.amountCents || 0)
      else if (sortBy === 'nextBilling') cmp = (a.nextBillingDate || '').localeCompare(b.nextBillingDate || '')
      else if (sortBy === 'billingCycle') cmp = (a.billingCycle || '').localeCompare(b.billingCycle || '')
      return sortDir === 'asc' ? cmp : -cmp
    })
    return result
  }, [subs, search, statusFilter, cycleFilter, sortBy, sortDir])

  const stats = useMemo(() => {
    const active = Array.isArray(subs) ? subs.filter((s: any) => !isCancelled(s)) : []
    const monthlyTotal = active.reduce((sum: number, s: any) => {
      const mult = ANNUAL_MULTIPLIER[s.billingCycle] || 12
      return sum + ((s.amountCents || 0) * mult) / 12
    }, 0)
    const annualTotal = active.reduce((sum: number, s: any) => {
      const mult = ANNUAL_MULTIPLIER[s.billingCycle] || 12
      return sum + (s.amountCents || 0) * mult
    }, 0)
    return { activeCount: active.length, monthlyTotal, annualTotal }
  }, [subs])

  const handleTogglePublic = async (targetId: string, isPublic: boolean) => {
    if (!token) return
    const res = await fetch(`${getApiUrl()}/api/planning/splits/subscription/${targetId}/public`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ isPublic }),
    })
    if (res.ok) {
      showToast(isPublic ? 'Master Ledger is now public' : 'Master Ledger is now private')
      mutate()
      globalMutate()
    }
  }

  const handleDelete = async (id: string) => {
    if (!token) return
    const res = await fetch(`${getApiUrl()}/api/planning/subscriptions/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}`, 'x-household-id': householdId || '' },
    })
    if (res.ok) {
      showToast('Subscription removed')
      setConfirmDelete(null)
      mutate()
      globalMutate()
    }
  }

  const countdownDays = (dateStr: string): string => {
    if (!dateStr) return ''
    const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return 'Overdue'
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Tomorrow'
    return `${diff}d`
  }

  const providerOptions = useMemo(() => {
    return providers.map((p: any) => ({ value: p.id, label: p.name }))
  }, [providers])

  const linkedAccountOptions = useMemo(() => {
    return (linkedAccounts || []).map((acc: any) => ({
      value: acc.id,
      label: acc.providerName,
      metadata: { email: acc.emailAttached },
    }))
  }, [linkedAccounts])

  if (loading) return <div className="text-center py-8 text-xs font-black tracking-[0.2em] text-white/30">Loading Subscriptions...</div>

  return (
    <section className="space-y-4">
      {reminderTarget && (
        <ReminderManager
          targetId={reminderTarget.id}
          targetType="subscription"
          targetName={reminderTarget.name}
          onClose={() => setReminderTarget(null)}
        />
      )}
      {shareTarget && (
        <ShareDialog
          targetType="subscription"
          targetId={shareTarget.id}
          targetName={shareTarget.name}
          onClose={() => setShareTarget(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-black tracking-[0.2em] text-white/40 flex items-center gap-2">
          <Receipt size={14} className="text-amber-500" /> Subscriptions
        </h3>
        <div className="flex items-center gap-2">
          {onNavigateToFull && (
            <button onClick={onNavigateToFull} className="text-[10px] font-black tracking-widest px-3 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all">
              Full View
            </button>
          )}
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-xs font-black tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20">
            <Plus size={14} /> Add
          </button>
        </div>
      </div>
      <p className="text-xs text-secondary font-medium w-full">Manage your recurring memberships and auto-renewing services.</p>

      {/* Stats bar */}
      {!compact && (
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
            <div className="text-[8px] font-black tracking-widest text-white/30">Active</div>
            <div className="text-lg font-black text-white">{stats.activeCount}</div>
          </div>
          <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
            <div className="text-[8px] font-black tracking-widest text-white/30">Monthly</div>
            <Price amountCents={Math.round(stats.monthlyTotal)} className="text-lg font-black text-amber-400" />
          </div>
          <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
            <div className="text-[8px] font-black tracking-widest text-white/30">Annual</div>
            <Price amountCents={Math.round(stats.annualTotal)} className="text-lg font-black text-emerald-400" />
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subscriptions..."
            className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white outline-none focus:border-primary transition-all placeholder:text-white/20"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white/5 border border-white/10 text-[10px] font-black tracking-widest px-3 py-2 rounded-xl text-secondary outline-none"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={cycleFilter}
          onChange={(e) => setCycleFilter(e.target.value)}
          className="bg-white/5 border border-white/10 text-[10px] font-black tracking-widest px-3 py-2 rounded-xl text-secondary outline-none"
        >
          <option value="all">All Cycles</option>
          {BILLING_CYCLES.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <div className="flex items-center gap-1">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-white/5 border border-white/10 text-[10px] font-black tracking-widest px-3 py-2 rounded-xl text-secondary outline-none"
          >
            <option value="name">Name</option>
            <option value="amount">Amount</option>
            <option value="nextBilling">Date</option>
            <option value="billingCycle">Cycle</option>
          </select>
          <button
            onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
            className="w-9 h-9 flex items-center justify-center bg-white/5 border border-white/10 rounded-xl text-secondary hover:text-white hover:bg-white/10 transition-all text-xs"
            title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
          >
            {sortDir === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* Subscription Cards */}
      <div className="grid grid-cols-1 gap-3">
        {filtered.length === 0 ? (
          <EmptyPlaceholder
            icon={Receipt}
            message={search || statusFilter !== 'all' || cycleFilter !== 'all' ? 'No matching subscriptions' : 'No subscriptions tracked yet'}
            action={
              <button onClick={() => setShowAddModal(true)} className="px-4 py-2 bg-primary/20 text-primary rounded-xl text-xs font-black tracking-widest hover:bg-primary/30 transition-all">
                Add your first subscription
              </button>
            }
          />
        ) : (
          filtered.map((sub: any) => {
            const annualCost = (sub.amountCents || 0) * (ANNUAL_MULTIPLIER[sub.billingCycle] || 12)
            return (
              <LiabilityItemCard key={sub.id} color="amber">
                <UpcomingChangeBadge
                  amountCents={sub.upcomingAmountCents}
                  effectiveDate={sub.upcomingEffectiveDate}
                  color="amber"
                />
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <ProviderLogo url={sub.iconUrl || sub.logoUrl} name={sub.name} size={36} className="border border-white/10" />
                    <div className="min-w-0">
                      <h4 className="font-black text-base tracking-tighter flex items-center gap-2">
                        {sub.name}
                        {sub.isTrial && (
                          <span className="text-[8px] font-black tracking-widest px-1.5 py-0.5 bg-amber-500/20 text-amber-500 rounded">TRIAL</span>
                        )}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {sub.nextBillingDate && (
                          <span className={`text-[10px] font-bold ${countdownDays(sub.nextBillingDate) === 'Overdue' ? 'text-red-400' : 'text-white/30'} tracking-widest`}>
                            {countdownDays(sub.nextBillingDate)} · Due: {sub.nextBillingDate}
                          </span>
                        )}
                        {sub.trialEndDate && sub.isTrial && (
                          <span className="text-[10px] font-bold text-amber-400/60 tracking-widest">
                            Trial ends: {sub.trialEndDate}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    {sub.amountCents === 0 ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black tracking-widest px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg">FREE</span>
                    ) : (
                      <>
                        <Price amountCents={sub.amountCents} className="text-lg font-black tracking-tighter" />
                        <div className="text-[9px] text-white/30 font-black tracking-widest mt-0.5">
                          /{sub.billingCycle} · <Price amountCents={annualCost} hideCents />/yr
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Badges Row */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {sub.providerAccountId && (
                    <span className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-black tracking-widest text-amber-500 w-fit">
                      <Link size={10} /> Account Linked
                    </span>
                  )}
                  {isCancelled(sub) && <StatusBadge status="cancelled" />}
                </div>

                {/* Notes */}
                {sub.notes && (
                  <div className="text-[11px] font-medium text-white/40 italic leading-relaxed mb-3 border-l-2 border-white/10 pl-3">
                    {sub.notes}
                  </div>
                )}

                {/* Split portion */}
                {sub.isSplitPortion && (
                  <div className="flex items-center gap-2 text-[10px] font-black tracking-widest text-primary/80 bg-white/5 border border-white/10 rounded-lg p-2 w-fit mb-3">
                    <Share2 size={12} /> Assigned Split Portion
                  </div>
                )}

                {/* Master Split Ledger */}
                {sub.isSplitOriginator && sub.splits && (
                  <div className="mb-3">
                    <MasterSplitLedger
                      splits={sub.splits}
                      isMasterLedgerPublic={sub.splits?.[0]?.isMasterLedgerPublic || false}
                      onTogglePublic={(isPublic) => handleTogglePublic(sub.id, isPublic)}
                      open={openTrackerId === sub.id}
                      onToggle={() => setOpenTrackerId(openTrackerId === sub.id ? null : sub.id)}
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-white/5">
                  <button
                    onClick={() => setEditingSub(sub)}
                    className="text-[10px] font-black tracking-widest px-3 py-1.5 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all active:scale-95"
                  >
                    Edit
                  </button>
                  {!isCancelled(sub) && (
                    <button
                      onClick={() => setCancelTarget(sub)}
                      className="flex items-center gap-1 text-[10px] font-black tracking-widest px-3 py-1.5 border border-slate-500/30 text-slate-400 rounded-lg hover:bg-slate-500/10 transition-all active:scale-95"
                    >
                      <Ban size={10} /> Cancel
                    </button>
                  )}
                  <button
                    onClick={() => setReminderTarget({ id: sub.id, name: sub.name })}
                    className="flex items-center gap-1 text-[10px] font-black tracking-widest px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all active:scale-95"
                  >
                    <Bell size={10} /> Alerts
                  </button>
                  {!sub.isSplitOriginator && !sub.isSplitPortion && (
                    <button
                      onClick={() => setOpenSplitterId(openSplitterId === sub.id ? null : sub.id)}
                      className="flex items-center gap-1 text-[10px] font-black tracking-widest px-3 py-1.5 border border-emerald-500/30 text-emerald-500 rounded-lg hover:bg-emerald-500/10 transition-all active:scale-95"
                    >
                      <Share2 size={10} /> Split
                    </button>
                  )}
                  <button
                    onClick={() => setShareTarget({ id: sub.id, name: sub.name })}
                    className="flex items-center gap-1 text-[10px] font-black tracking-widest px-3 py-1.5 border border-blue-500/30 text-blue-500 rounded-lg hover:bg-blue-500/10 transition-all active:scale-95"
                  >
                    <Globe size={10} /> Share
                  </button>
                  <button
                    onClick={() => setConfirmDelete(sub.id)}
                    className="flex items-center gap-1 text-[10px] font-black tracking-widest px-3 py-1.5 border border-red-500/30 text-red-500 rounded-lg hover:bg-red-500/10 transition-all active:scale-95"
                  >
                    <Trash2 size={10} /> Delete
                  </button>
                </div>

                {openSplitterId === sub.id && (
                  <div className="mt-3 pt-3 border-t border-white/10 animate-in fade-in slide-in-from-top-2">
                    <LiabilitySplitter
                      targetId={sub.id}
                      targetType="subscription"
                      totalAmountCents={sub.amountCents}
                      onComplete={() => {
                        setOpenSplitterId(null)
                        mutate()
                        globalMutate()
                      }}
                    />
                  </div>
                )}
              </LiabilityItemCard>
            )
          })
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingSub) && (
        <SubscriptionFormModal
          initial={editingSub}
          providerOptions={providerOptions}
          linkedAccountOptions={linkedAccountOptions}
          paymentMethods={paymentMethods}
          onSave={async (data) => {
            const apiUrl = getApiUrl().replace(/\/$/, '')
            const isNew = !editingSub
            const url = isNew ? `${apiUrl}/api/planning/subscriptions` : `${apiUrl}/api/planning/subscriptions/${editingSub.id}`
            const method = isNew ? 'POST' : 'PATCH'

            const res = await fetch(url, {
              method,
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'x-household-id': householdId || '',
              },
              body: JSON.stringify(data),
            })

            if (res.ok) {
              showToast(isNew ? 'Subscription added!' : 'Subscription updated!', 'success')
              setShowAddModal(false)
              setEditingSub(null)
              mutate()
              globalMutate()
            }
          }}
          onClose={() => { setShowAddModal(false); setEditingSub(null) }}
        />
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl" onClick={() => setConfirmDelete(null)}>
          <div className="card w-full max-w-sm p-6 space-y-4 relative" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-black tracking-tighter">Delete Subscription</h3>
            <p className="text-sm text-secondary font-medium">Are you sure you want to remove this subscription? This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-black tracking-widest hover:bg-white/10 transition-all">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete)} className="flex-1 py-3 text-red-500 border border-red-500/30 rounded-xl text-xs font-black tracking-widest hover:bg-red-500/10 transition-all">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel confirmation */}
      {cancelTarget && (
        <CancelSubscriptionModal
          sub={cancelTarget}
          onConfirm={async (endDate) => {
            if (!token) return
            const res = await fetch(`${getApiUrl()}/api/planning/subscriptions/${cancelTarget.id}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'x-household-id': householdId || '',
              },
              body: JSON.stringify({ endDate }),
            })
            if (res.ok) {
              showToast('Subscription cancelled', 'success')
              setCancelTarget(null)
              mutate()
              globalMutate()
            } else {
              showToast('Failed to cancel subscription', 'error')
            }
          }}
          onClose={() => setCancelTarget(null)}
        />
      )}
    </section>
  )
}

// ─── Add/Edit Subscription Form Modal ───────────────────────────────────

interface SubscriptionFormModalProps {
  initial: any
  providerOptions: { value: string; label: string }[]
  linkedAccountOptions: { value: string; label: string; metadata?: { email?: string } }[]
  paymentMethods: any[]
  onSave: (data: any) => Promise<void>
  onClose: () => void
}

const SubscriptionFormModal: React.FC<SubscriptionFormModalProps> = ({
  initial,
  providerOptions,
  linkedAccountOptions,
  paymentMethods,
  onSave,
  onClose,
}) => {
  const { showToast } = useToast()

  const apiUrl = getApiUrl().replace(/\/$/, '')
  const token = localStorage.getItem('ledger_token')

  const handleCreateProvider = async (search: string) => {
    const res = await fetch(`${apiUrl}/api/user/service-providers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ name: search, visibility: 'private' }),
    })
    const data: any = await res.json()
    if (data.success) {
      globalMutate()
      showToast(`Provider "${search}" created`, 'success')
      return data.id
    }
    showToast('Failed to create provider', 'error')
  }

  const handleCreateLinkedAccount = async (search: string) => {
    if (!selectedProviderId) {
      showToast('Select a provider first before linking an account', 'error')
      return
    }
    const res = await fetch(`${apiUrl}/api/user/linked-accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ providerId: selectedProviderId, emailAttached: search }),
    })
    const data: any = await res.json()
    if (data.success) {
      globalMutate()
      showToast(`Linked account "${search}" created`, 'success')
      return data.id
    }
    showToast('Failed to create linked account', 'error')
  }

  const handleCreatePaymentMethod = async (search: string) => {
    const res = await fetch(`${apiUrl}/api/user/payment-methods`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ name: search, type: 'other' }),
    })
    const data: any = await res.json()
    if (data.success) {
      globalMutate()
      showToast(`Payment method "${search}" created`, 'success')
      return data.id
    }
    showToast('Failed to create payment method', 'error')
  }

  const [name, setName] = useState(initial?.name || '')
  const [selectedProviderId, setSelectedProviderId] = useState(initial?.providerId || '')
  const [amountCents, setAmountCents] = useState(initial?.amountCents || 0)
  const [billingCycle, setBillingCycle] = useState(initial?.billingCycle || 'monthly')
  const [nextBillingDate, setNextBillingDate] = useState(initial?.nextBillingDate || '')
  const [trialEndDate, setTrialEndDate] = useState(initial?.trialEndDate || '')
  const [isTrial, setIsTrial] = useState(initial?.isTrial || !!initial?.trialEndDate)
  const [linkedAccountId, setLinkedAccountId] = useState(initial?.providerAccountId || '')
  const [categoryId, setCategoryId] = useState('')
  const [iconUrl, setIconUrl] = useState(initial?.iconUrl || initial?.logoUrl || '')
  const [upcomingAmountCents, setUpcomingAmountCents] = useState(initial?.upcomingAmountCents || 0)
  const [upcomingEffectiveDate, setUpcomingEffectiveDate] = useState(initial?.upcomingEffectiveDate || '')
  const [showRateChange, setShowRateChange] = useState(!!(initial?.upcomingAmountCents || initial?.upcomingEffectiveDate))
  const [paymentMethodId, setPaymentMethodId] = useState(initial?.paymentMethodId || '')
  const [notes, setNotes] = useState(initial?.notes || '')
  const [saving, setSaving] = useState(false)

  const { data: categories = [] } = (useApi('/api/financials/categories') as any)

  const handleAutoFetchLogo = () => {
    const logos = autoFetchLogo(name)
    if (logos) setIconUrl(logos.clearbit)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || amountCents === null || amountCents === undefined || !nextBillingDate) return
    setSaving(true)
    await onSave({
      name,
      amountCents,
      billingCycle,
      nextBillingDate,
      trialEndDate: isTrial ? trialEndDate : null,
      isTrial: isTrial && !!trialEndDate,
      providerAccountId: linkedAccountId || null,
      paymentMethodId: paymentMethodId || null,
      iconUrl: iconUrl || null,
      categoryId: categoryId || null,
      upcomingAmountCents: upcomingAmountCents || null,
      upcomingEffectiveDate: upcomingEffectiveDate || null,
      notes: notes || null,
      status: initial?.status || 'active',
    })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-[10001] overflow-y-auto bg-black/80 backdrop-blur-xl" onClick={onClose}>
      <div className="min-h-full flex items-center justify-center p-4">
        <div className="card w-full max-w-lg p-6 space-y-5 relative" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black italic tracking-tighter">
            {initial ? 'Edit' : 'Add'} <span className="text-primary">Subscription</span>
          </h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded-full transition-all">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name + Logo */}
          <div className="flex items-center gap-3">
            <ProviderLogo url={iconUrl} name={name} size={40} className="border border-white/10" />
            <div className="flex-1 space-y-1">
              <FieldLabel label="Service Name" tooltip="A friendly name to identify this subscription (e.g. &quot;Netflix Standard&quot;)" />
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Netflix, Spotify, etc."
                required
                className="w-full p-3 bg-white/5 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all font-bold text-sm"
              />
            </div>
          </div>

          {/* Logo URL + Auto-fetch */}
          <div className="space-y-1">
            <FieldLabel label="Logo URL" tooltip="URL for the service logo. Use &quot;Auto&quot; to fetch one automatically." />
            <div className="flex gap-2">
              <input
                value={iconUrl}
                onChange={e => setIconUrl(e.target.value)}
                placeholder="https://logo.clearbit.com/netflix.com"
                className="flex-1 p-3 bg-white/5 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all text-xs font-bold"
              />
              <button
                type="button"
                onClick={handleAutoFetchLogo}
                disabled={!name}
                className="px-3 bg-primary/10 border border-primary/30 text-primary rounded-xl text-[10px] font-black tracking-widest hover:bg-primary/20 transition-all disabled:opacity-40"
              >
                Auto
              </button>
            </div>
          </div>

          {/* Provider Link */}
          <div className="space-y-1">
            <FieldLabel label="Link Provider" tooltip="The company or service providing this subscription. Selecting one can auto-fill the service name." />
            <SearchableSelect
              options={providerOptions}
              value={selectedProviderId}
              onCreate={handleCreateProvider}
              onChange={(val) => {
                setSelectedProviderId(val)
                if (!name) {
                  const match = providerOptions.find((opt: any) => opt.value === val)
                  if (match) setName(match.label)
                }
              }}
              placeholder="Select provider..."
            />
          </div>

          {/* Amount + Cycle */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <FieldLabel label="Amount" tooltip="How much you pay each billing cycle (in cents for precision)" />
              <CurrencyInput valueCents={amountCents} onChangeCents={setAmountCents} placeholder="0.00" />
            </div>
            <div className="space-y-1">
              <FieldLabel label="Billing Cycle" tooltip="How often you are billed (monthly, yearly, weekly, etc.)" />
              <select
                value={billingCycle}
                onChange={e => setBillingCycle(e.target.value)}
                className="w-full p-3 bg-white/5 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all text-sm font-bold"
              >
                {BILLING_CYCLES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <FieldLabel label="Next Billing" tooltip="The next date this subscription will charge you" />
              <input
                type="date"
                value={nextBillingDate}
                onChange={e => setNextBillingDate(e.target.value)}
                required
                className="w-full p-3 bg-white/5 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all text-sm font-bold"
              />
            </div>
            <div className="space-y-1">
              <FieldLabel label="Trial Ends" tooltip="If this subscription has a free trial, set the end date here" />
              <input
                type="date"
                value={trialEndDate}
                onChange={e => { setTrialEndDate(e.target.value); setIsTrial(!!e.target.value) }}
                className="w-full p-3 bg-white/5 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all text-sm font-bold"
              />
            </div>
          </div>

          {/* Linked Account */}
          <div className="space-y-1">
            <FieldLabel label="Linked Account" tooltip="The service account (email / username) linked to this subscription" />
            <SearchableSelect
              options={linkedAccountOptions}
              value={linkedAccountId}
              onCreate={handleCreateLinkedAccount}
              onChange={setLinkedAccountId}
              placeholder="Link account..."
            />
          </div>

          {/* Payment Method */}
          <div className="space-y-1">
            <FieldLabel label="Payment Method" tooltip="The card or bank account used to pay for this subscription" />
            <SearchableSelect
              options={paymentMethods.map((pm: any) => ({ value: pm.id, label: pm.name || pm.type || pm.id }))}
              value={paymentMethodId}
              onCreate={handleCreatePaymentMethod}
              onChange={setPaymentMethodId}
              placeholder="Select payment method..."
            />
          </div>

          {/* Category */}
          <div className="space-y-1">
            <FieldLabel label="Category" tooltip="Group this subscription under a spending category for budgeting" />
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full p-3 bg-white/5 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all text-sm font-bold"
            >
              <option value="">No category</option>
              {(categories || []).map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Rate Change */}
          <div className="p-3 bg-primary/5 border border-primary/10 rounded-xl space-y-3">
            <button
              type="button"
              onClick={() => setShowRateChange(!showRateChange)}
              className="w-full flex items-center justify-between text-[10px] font-black tracking-widest text-primary"
            >
              Planned Rate Change {showRateChange ? '▼' : '▶'}
            </button>
            {showRateChange && (
              <div className="grid grid-cols-2 gap-2 animate-in slide-in-from-top-2 duration-200">
                <div className="space-y-1">
                  <label className="text-[8px] font-black tracking-widest text-white/30">Upcoming Amount</label>
                  <CurrencyInput valueCents={upcomingAmountCents} onChangeCents={setUpcomingAmountCents} placeholder="0.00" className="bg-black/40 border-white/10" />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black tracking-widest text-white/30">Effective Date</label>
                  <input type="date" value={upcomingEffectiveDate} onChange={e => setUpcomingEffectiveDate(e.target.value)} className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-white text-sm font-bold outline-none focus:border-white/20" />
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <FieldLabel label="Notes" tooltip="Any additional info about this subscription (contract terms, login details, etc.)" />
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
              className="w-full p-3 bg-white/5 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all text-xs font-bold resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-black tracking-widest hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name || amountCents === null || amountCents === undefined || !nextBillingDate}
              className="flex-1 py-3 bg-primary text-white rounded-xl text-xs font-black tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/20 disabled:opacity-40 disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={14} />
              {saving ? 'Saving...' : initial ? 'Update' : 'Add Subscription'}
            </button>
          </div>
        </form>
      </div>
      </div>
    </div>
  )
}

// ─── Field Label with Tooltip ─────────────────────────────────────

const FieldLabel: React.FC<{ label: string; tooltip: string }> = ({ label, tooltip }) => (
  <span className="inline-flex items-center gap-1.5 group text-[10px] font-black tracking-widest text-secondary">
    {label}
    <span className="relative inline-flex">
      <Info size={11} className="text-slate-600 cursor-help" />
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-slate-800 border border-white/10 text-[11px] text-slate-300 rounded-lg whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 max-w-[220px] font-medium leading-relaxed">
        {tooltip}
      </span>
    </span>
  </span>
)

// ─── Cancel Subscription Modal ──────────────────────────────────────

interface CancelSubscriptionModalProps {
  sub: any
  onConfirm: (endDate: string) => Promise<void>
  onClose: () => void
}

const CancelSubscriptionModal: React.FC<CancelSubscriptionModalProps> = ({ sub, onConfirm, onClose }) => {
  const today = new Date().toISOString().split('T')[0]
  const [endDate, setEndDate] = useState(today)
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    await onConfirm(endDate)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl" onClick={onClose}>
      <div className="card w-full max-w-sm p-6 space-y-4 relative" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black tracking-tighter">Cancel <span className="text-primary">{sub.name}</span></h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded-full transition-all">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-secondary font-medium">
          Set the date when this subscription will end. Future payments after this date will not be tracked.
        </p>
        <div className="space-y-1">
          <label className="text-[10px] font-black tracking-widest text-secondary">Cancellation Date</label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="w-full p-3 bg-white/5 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all text-sm font-bold"
          />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-black tracking-widest hover:bg-white/10 transition-all">
            Keep Active
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || !endDate}
            className="flex-1 py-3 text-slate-400 border border-slate-500/30 rounded-xl text-xs font-black tracking-widest hover:bg-slate-500/10 transition-all disabled:opacity-40"
          >
            {loading ? 'Cancelling...' : 'Confirm Cancellation'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SubscriptionManager
