import React, { useState, useMemo } from 'react'
import { InlineToast } from './ui/InlineToast'
const toLocalDate = (s?: string): string => { if (!s) { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` } const d = new Date(s); return isNaN(d.getTime()) ? toLocalDate() : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
import { useCurrency } from '../context/CurrencyContext'
import { useToast } from '../context/ToastContext'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useApi, globalMutate } from '../hooks/useApi'
import { getApiUrl } from '../utils/api'
import { Price } from './Price'
import { Trash2, Edit3, Send, CheckSquare, Square, Save, X, Calendar, Tag, CreditCard, ChevronRight, ChevronDown, AlertTriangle, ArrowLeftRight, Wallet, Copy, Check, CheckCircle2, Search, SearchX } from 'lucide-react'
import { Modal } from './ui/Modal'
import { SearchableSelect } from './ui/SearchableSelect'
import { CurrencyInput } from './ui/CurrencyInput'
import { Checkbox } from './ui/Checkbox'
import { ConfirmationNumberBuilder, ConfirmationNumberItem } from './ui/ConfirmationNumberBuilder'
import { DateTimeInput } from './ui/DateTimeInput'
import { PromoteToLedgerModal } from './PromoteToLedgerModal'

interface TrackedExpenseListProps {
  refreshTrigger?: number
}

export const TrackedExpenseList: React.FC<TrackedExpenseListProps> = ({ refreshTrigger }) => {
  const { data: tracked = [], mutate } = (useApi('/api/tracked-expenses') as any)
  const { data: accounts = [] } = (useApi('/api/financials/accounts') as any)
  const { data: categories = [] } = (useApi('/api/financials/categories') as any)
  const { data: chargeDescriptors = [] } = (useApi('/api/financials/charge-descriptors') as any)
  const { data: bills = [] } = (useApi('/api/planning/bills') as any)
  const { data: subscriptions = [] } = (useApi('/api/planning/subscriptions') as any)
  const { data: members = [] } = (useApi('/api/user/households/current/members') as any)
  const { data: paymentMethodsData } = (useApi('/api/user/payment-methods') as any)
  const paymentMethods: any[] = paymentMethodsData?.data ?? []
  const { formatPrice } = useCurrency()
  const reduced = useReducedMotion()

  const lastRefreshRef = React.useRef(refreshTrigger)
  React.useEffect(() => {
    if (refreshTrigger && refreshTrigger !== lastRefreshRef.current) {
      lastRefreshRef.current = refreshTrigger
      mutate()
    }
  }, [refreshTrigger, mutate])

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [singlePromoteId, setSinglePromoteId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isMoveToLedgerOpen, setIsMoveToLedgerOpen] = useState(false)
  const [ledgerDetails, setLedgerDetails] = useState({
    accountId: '',
    categoryId: '',
    transactionDate: toLocalDate(),
    status: 'paid',
    chargeDescriptorId: ''
  })

  // Single Item Edit State
  const [editForm, setEditForm] = useState<any>(null)

  // Bulk Edit State
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false)
  const [bulkUpdates, setBulkUpdates] = useState<any>({})

  // Duplicate State
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false)
  const [duplicateCopies, setDuplicateCopies] = useState(1)
  const [isDuplicating, setIsDuplicating] = useState(false)

  // Inline Confirmation State
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)

  // Search State
  const [searchTerm, setSearchTerm] = useState('')

  // Sort / Filter State
  const [sortKey, setSortKey] = useState<string>('newest')
  const [flagFilters, setFlagFilters] = useState<{ attentionRequired: boolean; needsBalanceTransfer: boolean; isBorrowed: boolean }>({
    attentionRequired: false,
    needsBalanceTransfer: false,
    isBorrowed: false,
  })

  const hasFlagFilters = flagFilters.attentionRequired || flagFilters.needsBalanceTransfer || flagFilters.isBorrowed

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()

    let items = tracked.filter((item: any) => {
      if (q) {
        const match =
          String(item.description || '').toLowerCase().includes(q) ||
          String(item.notes || '').toLowerCase().includes(q) ||
          String(item.confirmationNumber || '').toLowerCase().includes(q) ||
          String(item.borrowSource || '').toLowerCase().includes(q)
        if (!match) return false
      }
      if (hasFlagFilters) {
        if (flagFilters.attentionRequired && item.attentionRequired) return true
        if (flagFilters.needsBalanceTransfer && item.needsBalanceTransfer) return true
        if (flagFilters.isBorrowed && item.isBorrowed) return true
        return false
      }
      return true
    })

    const dateOf = (item: any) => new Date(item.transactionDate || item.createdAt || 0).getTime() || 0

    items = [...items].sort((a: any, b: any) => {
      switch (sortKey) {
        case 'oldest': return dateOf(a) - dateOf(b)
        case 'amount-desc': return (b.amountCents ?? 0) - (a.amountCents ?? 0)
        case 'amount-asc': return (a.amountCents ?? 0) - (b.amountCents ?? 0)
        case 'alpha-asc': return String(a.description || '').localeCompare(String(b.description || ''))
        case 'alpha-desc': return String(b.description || '').localeCompare(String(a.description || ''))
        case 'newest':
        default: return dateOf(b) - dateOf(a)
      }
    })

    return items
  }, [tracked, searchTerm, sortKey, flagFilters, hasFlagFilters])

  const billInstanceOptions: SearchableOption[] = useMemo(() => {
    const list: SearchableOption[] = []
    
    // Process Subscriptions
    const subList = Array.isArray(subscriptions) ? subscriptions : subscriptions?.data || []
    for (const sub of subList) {
      const owner = (members || []).find((m: any) => (m.user?.id || m.id) === sub.ownerId)
      const ownerName = owner?.displayName || owner?.user?.displayName || owner?.user?.username || 'Household'
      const formattedAmount = sub.amountCents ? `$${(sub.amountCents / 100).toFixed(2)}` : ''
      const cycle = sub.billingCycle ? `/${sub.billingCycle.replace('ly', '')}` : ''
      const renew = sub.nextBillingDate ? ` • Renews ${sub.nextBillingDate}` : ''
      list.push({
        value: sub.id,
        label: `${sub.name} • ${ownerName}`,
        icon: <span className="text-base leading-none">🔁</span>,
        metadata: {
          subtext: `${formattedAmount}${cycle}${renew}`
        }
      })
    }

    // Process Recurring / Single Bills
    const billList = Array.isArray(bills) ? bills : bills?.data || []
    for (const bill of billList) {
      const owner = (members || []).find((m: any) => (m.user?.id || m.id) === bill.ownerId)
      const ownerName = owner?.displayName || owner?.user?.displayName || owner?.user?.username || 'Household'
      const formattedAmount = bill.amountCents ? `$${(bill.amountCents / 100).toFixed(2)}` : ''
      const due = bill.dueDate ? ` • Due ${bill.dueDate}` : ''
      list.push({
        value: bill.id,
        label: `${bill.name} • ${ownerName}`,
        icon: <span className="text-base leading-none">🧾</span>,
        metadata: {
          subtext: `${formattedAmount}${due}`
        }
      })
    }

    return list.sort((a, b) => a.label.localeCompare(b.label))
  }, [subscriptions, bills, members])

  const findBillOrSub = (id?: string) => {
    if (!id) return null
    const subList = Array.isArray(subscriptions) ? subscriptions : subscriptions?.data || []
    const billList = Array.isArray(bills) ? bills : bills?.data || []
    return [...subList, ...billList].find((b: any) => b.id === id)
  }

  const handleBulkDuplicate = async () => {
    if (duplicateCopies <= 0 || selectedIds.length === 0) return
    setIsDuplicating(true)
    const promises: Promise<Response>[] = []

    selectedIds.forEach(id => {
      const item = tracked.find((t: any) => t.id === id)
      if (!item) return

      for (let i = 0; i < duplicateCopies; i++) {
        promises.push(
          fetch(`${getApiUrl()}/api/tracked-expenses`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('ledger_token')}`,
              'x-household-id': localStorage.getItem('ledger_householdId') || ''
            },
            body: JSON.stringify({
              description: item.description,
              amountCents: item.amountCents,
              notes: item.notes,
              confirmationNumber: item.confirmationNumber,
              attentionRequired: item.attentionRequired ?? false,
              needsBalanceTransfer: item.needsBalanceTransfer ?? false,
              transferTiming: item.transferTiming,
              isBorrowed: item.isBorrowed ?? false,
              borrowSource: item.borrowSource,
              createdAt: item.createdAt || toLocalDate()
            })
          })
        )
      }
    })

    try {
      await Promise.all(promises)
      showToast(`Successfully duplicated ${selectedIds.length} items (${duplicateCopies} copies each)`, 'success')
      globalMutate()
      setSelectedIds([])
      setIsDuplicateModalOpen(false)
      setDuplicateCopies(1)
    } catch (err) {
      showToast('Some duplicates failed to create', 'error')
    } finally {
      setIsDuplicating(false)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const toggleSelectAll = () => {
    const visibleIds = filtered.map((t: any) => t.id)
    if (selectedIds.length === filtered.length && selectedIds.every(id => visibleIds.includes(id))) {
      setSelectedIds([])
    } else {
      setSelectedIds(visibleIds)
    }
  }

  const { showToast } = useToast()

  const handleDelete = async (ids: string[]) => {
    const res = (await fetch(`${getApiUrl()}/api/tracked-expenses/bulk`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('ledger_token')}`,
            'x-household-id': localStorage.getItem('ledger_householdId') || ''
          },
          body: JSON.stringify({ ids })
        }) as any)
    if (res.ok) {
      globalMutate()
      setSelectedIds([])
      setConfirmDeleteId(null)
      setConfirmBulkDelete(false)
    }
  }

  const openMoveToLedger = (itemId?: string) => {
    setLedgerDetails({
      accountId: '',
      categoryId: '',
      transactionDate: toLocalDate(),
      status: 'paid',
      chargeDescriptorId: ''
    })
    if (itemId) {
      const item = tracked.find((t: any) => t.id === itemId)
      if (item && item.createdAt) {
        setLedgerDetails(prev => ({
          ...prev,
          transactionDate: toLocalDate(item.createdAt)
        }))
      }
      setSinglePromoteId(itemId)
    } else {
      setSinglePromoteId(null)
    }
    setIsMoveToLedgerOpen(true)
  }

  const handleMoveToLedger = async () => {
    const idsToPromote = singlePromoteId ? [singlePromoteId] : selectedIds
    const res = (await fetch(`${getApiUrl()}/api/tracked-expenses/promote`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('ledger_token')}`,
            'x-household-id': localStorage.getItem('ledger_householdId') || ''
          },
          body: JSON.stringify({
            ids: idsToPromote,
            transactionDetails: ledgerDetails
          })
        }) as any)
    if (res.ok) {
      globalMutate()
      if (singlePromoteId) {
        setSelectedIds(prev => prev.filter(id => id !== singlePromoteId))
        setSinglePromoteId(null)
      } else {
        setSelectedIds([])
      }
      setIsMoveToLedgerOpen(false)
    }
  }

  const handleCreateCategory = async (name: string): Promise<string> => {
    const res = (await fetch(`${getApiUrl()}/api/financials/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('ledger_token')}`,
        'x-household-id': localStorage.getItem('ledger_householdId') || ''
      },
      body: JSON.stringify({ name })
    }) as any);
    const data = (await res.json() as any);
    globalMutate();
    return data.id;
  };

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

  const handleCreateChargeDescriptor = async (name: string): Promise<string> => {
    const res = (await fetch(`${getApiUrl()}/api/financials/charge-descriptors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('ledger_token')}`,
        'x-household-id': localStorage.getItem('ledger_householdId') || ''
      },
      body: JSON.stringify({ name })
    }) as any);
    const data = (await res.json() as any);
    globalMutate();
    return data.id;
  };

  /** Creates a payment method and returns its name (borrowSource stores names, not IDs) */
  const handleCreatePaymentMethod = async (name: string): Promise<string> => {
    const res = (await fetch(`${getApiUrl()}/api/user/payment-methods`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('ledger_token')}`,
        'x-household-id': localStorage.getItem('ledger_householdId') || ''
      },
      body: JSON.stringify({ name, type: 'other' })
    }) as any);
    if (res.ok) globalMutate();
    // Return the name itself — borrowSource is free-text, not an ID reference
    return name;
  };

  const handleUpdate = async (id: string, updates: any) => {
    const { transactionDate: _td, ...clean } = updates
    const res = (await fetch(`${getApiUrl()}/api/tracked-expenses/bulk`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('ledger_token')}`,
            'x-household-id': localStorage.getItem('ledger_householdId') || ''
          },
          body: JSON.stringify({
            ids: [id],
            updates: clean
          })
        }) as any)
    if (res.ok) {
      globalMutate()
      setEditingId(null)
      setEditForm(null)
    }
  }

  const handleBulkUpdate = async () => {
    const res = (await fetch(`${getApiUrl()}/api/tracked-expenses/bulk`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('ledger_token')}`,
            'x-household-id': localStorage.getItem('ledger_householdId') || ''
          },
          body: JSON.stringify({
            ids: selectedIds,
            updates: bulkUpdates
          })
        }) as any)
    if (res.ok) {
      globalMutate()
      setIsBulkEditOpen(false)
      setBulkUpdates({})
    }
  }

  if (tracked.length === 0) return null;

  return (
    <>
      <div className="mt-4 border-t border-white/5 pt-6">
        <div className="mb-4">
          <h4 className="text-xs font-black tracking-[0.2em] text-orange-200/60 flex items-center gap-2 mb-1">
            <ChevronRight size={14} className="text-orange-500" />
            Pending Tracked Expenses ({filtered.length})
            <span className="ml-2 px-2 py-0.5 bg-orange-500/10 rounded-full text-orange-400 border border-orange-500/10">
              {formatPrice(filtered.reduce((sum: number, item: any) => sum + (item.amountCents ?? 0), 0))}
            </span>
          </h4>
          <p className="text-xs text-secondary font-medium">Pending expenses tracked automatically from your accounts. You can review them here, bulk edit them, or match/promote them to the main ledger.</p>
        </div>

        <div className="relative mb-4">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary/50" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tracked expenses..."
            className="w-full bg-black/60 border border-white/10 rounded-xl pl-11 pr-10 py-3 text-sm text-white focus:border-orange-500/50 outline-none transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-white transition-colors cursor-pointer"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black tracking-widest text-secondary/60">Sort</span>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
              className="bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-xs font-bold text-white outline-none focus:border-orange-500/50 transition-all"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="amount-desc">Amount: High to Low</option>
              <option value="amount-asc">Amount: Low to High</option>
              <option value="alpha-asc">Description: A to Z</option>
              <option value="alpha-desc">Description: Z to A</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black tracking-widest text-secondary/60">Filter</span>
            {[
              { key: 'attentionRequired' as const, label: 'Needs Attention', icon: <AlertTriangle size={11} /> },
              { key: 'needsBalanceTransfer' as const, label: 'Balance Transfer', icon: <ArrowLeftRight size={11} /> },
              { key: 'isBorrowed' as const, label: 'Borrowed', icon: <Wallet size={11} /> },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFlagFilters(prev => ({ ...prev, [f.key]: !prev[f.key] }))}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[10px] font-black tracking-widest transition-all cursor-pointer ${flagFilters[f.key] ? 'bg-orange-500/15 border-orange-500/40 text-orange-300' : 'bg-black/60 border-white/10 text-secondary hover:bg-white/5'}`}
              >
                {f.icon}
                {f.label}
              </button>
            ))}
            {(hasFlagFilters || sortKey !== 'newest') && (
              <button
                onClick={() => {
                  setSortKey('newest')
                  setFlagFilters({ attentionRequired: false, needsBalanceTransfer: false, isBorrowed: false })
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 text-[10px] font-black tracking-widest text-slate-500 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                <X size={11} /> Reset
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={toggleSelectAll}
              className="text-[10px] font-black tracking-widest text-secondary hover:text-primary transition-colors"
            >
              {selectedIds.length === filtered.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          
          {reduced ? (
            selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 bg-orange-500/5 border border-orange-500/20 rounded-xl p-1 pr-2 sm:pr-3 w-full sm:w-auto">
              <div className="px-3 py-1.5 text-[10px] font-black tracking-widest text-orange-200/60 border-r border-white/10 mr-1">
                Selected: {formatPrice(selectedIds.reduce((sum: number, id: string) => {
                  const item = tracked.find((t: any) => t.id === id)
                  return sum + (item?.amountCents ?? 0)
                }, 0))}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button 
                  onClick={() => setIsBulkEditOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black tracking-widest hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <Edit3 size={12} /> Bulk Edit
                </button>
                <button 
                  onClick={() => { setDuplicateCopies(1); setIsDuplicateModalOpen(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black tracking-widest hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <Copy size={12} /> Duplicate
                </button>
                <button 
                  onClick={() => openMoveToLedger()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-[10px] font-black tracking-widest hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20 cursor-pointer"
                >
                  <Send size={12} /> Move to Ledger ({selectedIds.length})
                </button>
              </div>
              <div className="w-px h-4 bg-white/10 mx-1 hidden sm:block"></div>
              {confirmBulkDelete ? (
                <InlineToast 
                  message={`Delete ${selectedIds.length} items?`} 
                  type="confirm" 
                  onConfirm={() => handleDelete(selectedIds)} 
                  onCancel={() => setConfirmBulkDelete(false)} 
                />
              ) : (
                <button 
                  onClick={() => setConfirmBulkDelete(true)}
                  className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                  aria-label="Delete selected"
                  title="Delete Selected"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          )
        ) : (
          <AnimatePresence>
            {selectedIds.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-wrap items-center gap-2 bg-orange-500/5 border border-orange-500/20 rounded-xl p-1 pr-2 sm:pr-3 w-full sm:w-auto"
              >
                <div className="px-3 py-1.5 text-[10px] font-black tracking-widest text-orange-200/60 border-r border-white/10 mr-1">
                  Selected: {formatPrice(selectedIds.reduce((sum: number, id: string) => {
                    const item = tracked.find((t: any) => t.id === id)
                    return sum + (item?.amountCents ?? 0)
                  }, 0))}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button 
                    onClick={() => setIsBulkEditOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black tracking-widest hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <Edit3 size={12} /> Bulk Edit
                  </button>
                  <button 
                    onClick={() => { setDuplicateCopies(1); setIsDuplicateModalOpen(true); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black tracking-widest hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <Copy size={12} /> Duplicate
                  </button>
                  <button 
                    onClick={() => openMoveToLedger()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-[10px] font-black tracking-widest hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20 cursor-pointer"
                  >
                    <Send size={12} /> Move to Ledger ({selectedIds.length})
                  </button>
                </div>
                <div className="w-px h-4 bg-white/10 mx-1 hidden sm:block"></div>
                {confirmBulkDelete ? (
                  <InlineToast 
                    message={`Delete ${selectedIds.length} items?`} 
                    type="confirm" 
                    onConfirm={() => handleDelete(selectedIds)} 
                    onCancel={() => setConfirmBulkDelete(false)} 
                  />
                ) : (
                  <button 
                    onClick={() => setConfirmBulkDelete(true)}
                    className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    aria-label="Delete selected"
                    title="Delete Selected"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-white/5 rounded-2xl text-slate-600">
            <SearchX size={28} className="opacity-30" />
            <span className="text-xs font-black tracking-widest">
              {searchTerm ? `No tracked expenses match "${searchTerm}"` : 'No pending tracked expenses'}
            </span>
            {searchTerm ? (
              <button
                onClick={() => setSearchTerm('')}
                className="text-[10px] font-black tracking-widest text-orange-400 hover:text-orange-300 transition-colors cursor-pointer"
              >
                Clear Search
              </button>
            ) : (
              <p className="text-[11px] text-slate-600 font-medium">Use the form above to quickly log expenses to track and review.</p>
            )}
          </div>
        ) : filtered.map((item: any) => {
          const itemContent = (
            <>
              {editingId === item.id ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black tracking-widest text-secondary mb-1 block">Charge Descriptor</label>
                      <SearchableSelect
                        options={(chargeDescriptors || []).map((cd: any) => ({ value: cd.id, label: cd.name }))}
                        value={editForm?.chargeDescriptorId || ''}
                        onChange={(val) => {
                          const cd = (chargeDescriptors || []).find((c: any) => c.id === val)
                          setEditForm({...editForm, chargeDescriptorId: val, description: cd?.name || editForm?.description || ''})
                        }}
                        placeholder="Choose or create descriptor..."
                        onCreate={handleCreateChargeDescriptor}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black tracking-widest text-secondary mb-1 flex items-center justify-between">
                        <span>Linked Bill / Subscription</span>
                        <span className="text-[9px] text-orange-400 font-normal">Layer 2 Instance</span>
                      </label>
                      <SearchableSelect
                        options={billInstanceOptions}
                        value={editForm?.billId || ''}
                        onChange={(val) => {
                          const matched = findBillOrSub(val)
                          const updates: any = { billId: val }
                          if (matched && (!editForm?.amountCents || editForm?.amountCents === 0)) {
                            updates.amountCents = matched.amountCents || 0
                          }
                          if (matched && !editForm?.description) {
                            updates.description = matched.name
                          }
                          setEditForm({ ...editForm, ...updates })
                        }}
                        placeholder="Select specific bill instance..."
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black tracking-widest text-secondary mb-1 block">Description</label>
                      <input 
                        type="text" 
                        value={editForm?.description || ''} 
                        onChange={e => setEditForm({...editForm, description: e.target.value})}
                        className="w-full bg-black/60 border border-white/10 rounded-xl p-2 text-sm text-white focus:border-orange-500/50 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black tracking-widest text-secondary mb-1 block">Amount</label>
                      <CurrencyInput 
                        valueCents={editForm?.amountCents || 0} 
                        onChangeCents={cents => setEditForm({...editForm, amountCents: cents})}
                        className="focus:border-orange-500/50 p-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black tracking-widest text-secondary mb-1 block">Transaction date</label>
                      <input 
                        type="date" 
                        value={editForm?.transactionDate ? toLocalDate(editForm.transactionDate) : toLocalDate()} 
                        onChange={e => setEditForm({...editForm, transactionDate: e.target.value, createdAt: e.target.value})}
                        style={{ colorScheme: 'dark' }}
                        className="w-full bg-black/60 border border-white/10 rounded-xl p-2 text-sm text-white focus:border-orange-500/50 outline-none"
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <ConfirmationNumberBuilder
                        value={editForm?.confirmationNumber || ''}
                        onChangeValue={val => {
                          const updates: any = { confirmationNumber: val }
                          if (val.trim() && editForm?.needsBalanceTransfer) {
                            updates.transferReconciled = true
                          }
                          setEditForm({ ...editForm, ...updates })
                        }}
                        confirmationNumbers={editForm?.confirmationNumbers || []}
                        onChangeNumbers={items => setEditForm({ ...editForm, confirmationNumbers: items })}
                        accentColor="orange"
                        compact={true}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black tracking-widest text-secondary mb-1 block">Notes</label>
                      <textarea 
                        value={editForm?.notes || ''} 
                        onChange={e => setEditForm({...editForm, notes: e.target.value})}
                        className="w-full bg-black/60 border border-white/10 rounded-xl p-2 text-sm text-white focus:border-orange-500/50 outline-none h-12 resize-none"
                        placeholder="Additional details..."
                      />
                    </div>
                  </div>

                  {/* --- Flags --- */}
                  <div className="border-t border-white/5 pt-4">
                    <label className="text-[10px] font-black tracking-widest text-secondary mb-3 block">Flags</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

                      {/* Needs Attention */}
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={editForm?.attentionRequired ?? false}
                          onChange={v => setEditForm({...editForm, attentionRequired: v})}
                          iconClassName="text-orange-500"
                        />
                        <span className="text-xs font-bold text-secondary flex items-center gap-1"><AlertTriangle size={12} className="text-orange-400" /> Needs Attention</span>
                      </div>

                      {/* Needs Balance Transfer */}
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={editForm?.needsBalanceTransfer ?? false}
                          onChange={v => {
                            const updates: any = { needsBalanceTransfer: v };
                            if (v && editForm?.confirmationNumber?.trim()) {
                              updates.transferReconciled = true;
                            }
                            setEditForm({...editForm, ...updates});
                          }}
                          iconClassName="text-blue-400"
                        />
                        <span className="text-xs font-bold text-secondary flex items-center gap-1"><ArrowLeftRight size={12} className="text-blue-400" /> Balance Transfer</span>
                      </div>

                      {/* Is Borrowed */}
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={editForm?.isBorrowed ?? false}
                          onChange={v => setEditForm({...editForm, isBorrowed: v})}
                          iconClassName="text-purple-400"
                        />
                        <span className="text-xs font-bold text-secondary flex items-center gap-1"><Wallet size={12} className="text-purple-400" /> Borrowed</span>
                      </div>
                    </div>

                    {/* Conditional sub-fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                      {editForm?.needsBalanceTransfer && (
                        <div className="space-y-4">
                          <div>
                            <label className="text-[10px] font-black tracking-widest text-secondary mb-1 block">Transfer Timing</label>
                            <select 
                              value={editForm?.transferTiming || 'same_day'} 
                              onChange={e => setEditForm({...editForm, transferTiming: e.target.value})}
                              className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:border-orange-500/50 outline-none"
                            >
                              <option value="same_day">Must do Same Day (Default)</option>
                              <option value="future">Can do in Future</option>
                            </select>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={editForm?.transferReconciled ?? false}
                              onChange={v => setEditForm({...editForm, transferReconciled: v})}
                              iconClassName="text-emerald-500"
                            />
                            <span className="text-xs font-bold text-secondary flex items-center gap-1">
                              <CheckCircle2 size={12} className="text-emerald-400" /> Transfer Reconciled
                            </span>
                          </div>
                        </div>
                      )}
                      {editForm?.isBorrowed && (
                        <div>
                          <label className="text-[10px] font-black tracking-widest text-secondary mb-1 block">Borrow Source</label>
                          <SearchableSelect
                            options={paymentMethods.map((pm: any) => ({
                              value: pm.name,
                              label: pm.name + (pm.lastFour ? ` ···${pm.lastFour}` : '')
                            }))}
                            value={editForm?.borrowSource || ''}
                            onChange={v => setEditForm({...editForm, borrowSource: v})}
                            placeholder="Select payment method..."
                            onCreate={handleCreatePaymentMethod}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-2 border-t border-white/5 pt-2">
                    <div>
                      {confirmDeleteId === item.id ? (
                        <InlineToast 
                          message="Delete item?" 
                          type="confirm" 
                          onConfirm={() => handleDelete([item.id])} 
                          onCancel={() => setConfirmDeleteId(null)} 
                        />
                      ) : (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setConfirmDeleteId(item.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg text-xs transition-colors"
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                          <button
                            onClick={() => openMoveToLedger(item.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 rounded-lg text-xs transition-colors font-bold"
                          >
                            <Send size={14} /> Move to Ledger
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingId(null)} className="p-2 text-secondary hover:text-white transition-colors" aria-label="Cancel editing"><X size={16} /></button>
                      <button onClick={() => handleUpdate(item.id, editForm)} className="p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors" aria-label="Save changes"><Save size={16} /></button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <Checkbox 
                      checked={selectedIds.includes(item.id)} 
                      onChange={() => toggleSelect(item.id)} 
                      iconClassName="text-orange-500 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white group-hover:text-orange-100 transition-colors truncate">{item.description}</div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                        <div className="text-[10px] tracking-widest text-secondary font-black flex items-center gap-1 whitespace-nowrap">
                          <Calendar size={10} /> {new Date(item.transactionDate || item.createdAt).toLocaleDateString()}
                        </div>
                        {item.attentionRequired && (
                          <div className="text-[10px] tracking-widest text-orange-400 font-black flex items-center gap-1 whitespace-nowrap">
                            <AlertTriangle size={10} /> Needs Attention
                          </div>
                        )}
                        {item.needsBalanceTransfer && (
                          <div className="flex items-center gap-1.5">
                            <div className="text-[10px] tracking-widest text-blue-400 font-black flex items-center gap-1 whitespace-nowrap">
                              <ArrowLeftRight size={10} /> Transfer
                            </div>
                            {item.transferReconciled ? (
                              <div className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black tracking-wider rounded flex items-center gap-0.5">
                                <Check size={10} /> Done
                              </div>
                            ) : (
                              <div className="px-1.5 py-0.5 bg-slate-500/10 border border-slate-500/20 text-slate-400 text-[10px] font-black tracking-wider rounded flex items-center gap-0.5">
                                Pending
                              </div>
                            )}
                          </div>
                        )}
                        {item.isBorrowed && (
                          <div className="text-[10px] tracking-widest text-purple-400 font-black flex items-center gap-1 truncate max-w-[200px] sm:max-w-none">
                            <Wallet size={10} />{item.borrowSource ? ` ${item.borrowSource}` : ' Borrowed'}
                          </div>
                        )}
                        {item.billId && (() => {
                          const linked = findBillOrSub(item.billId)
                          if (!linked) return null
                          const owner = (members || []).find((m: any) => (m.user?.id || m.id) === linked.ownerId)
                          const ownerName = owner?.displayName || owner?.user?.displayName || owner?.user?.username || 'Household'
                          return (
                            <div className="text-[10px] font-black tracking-wide text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg flex items-center gap-1 truncate max-w-[220px] sm:max-w-none">
                              <span>🔗</span> {linked.name} • {ownerName}
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 shrink-0">
                    <div className="text-left sm:text-right">
                      <Price amountCents={item.amountCents} className="text-base sm:text-lg font-black text-orange-200" />
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <button
                        onClick={() => openMoveToLedger(item.id)}
                        className="p-1.5 sm:p-2 hover:bg-orange-500/10 rounded-xl transition-all text-orange-400 hover:text-orange-300 flex items-center justify-center cursor-pointer"
                        aria-label="Move to ledger"
                        title="Move to ledger"
                      >
                        <Send size={16} />
                      </button>
                      <button 
                        onClick={() => {
                          setEditingId(item.id)
                          setEditForm({
                            description: item.description,
                            amountCents: item.amountCents,
                            notes: item.notes,
                            confirmationNumber: item.confirmationNumber,
                            attentionRequired: item.attentionRequired ?? false,
                            needsBalanceTransfer: item.needsBalanceTransfer ?? false,
                            transferReconciled: item.transferReconciled ?? false,
                            transferTiming: item.transferTiming || 'same_day',
                            chargeDescriptorId: item.chargeDescriptorId || '',
                            billId: item.billId || '',
                            isBorrowed: item.isBorrowed ?? false,
                            borrowSource: item.borrowSource || '',
                            transactionDate: toLocalDate(item.transactionDate || item.createdAt),
                            createdAt: item.createdAt || toLocalDate()
                          })
                        }}
                        className="p-1.5 sm:p-2 hover:bg-white/10 rounded-xl transition-all text-secondary hover:text-white"
                        aria-label={`Expand and edit ${item.description}`}
                      >
                        <ChevronDown size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )
          if (reduced) {
            return (
              <div key={item.id} className={`group relative flex flex-col p-4 rounded-2xl border transition-all ${selectedIds.includes(item.id) ? 'bg-orange-500/10 border-orange-500/40' : 'bg-black/40 border-white/5 hover:border-white/20'}`}>
                {itemContent}
              </div>
            )
          }
          return (
            <motion.div 
              key={item.id}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`group relative flex flex-col p-4 rounded-2xl border transition-all ${selectedIds.includes(item.id) ? 'bg-orange-500/10 border-orange-500/40' : 'bg-black/40 border-white/5 hover:border-white/20'}`}
            >
              {itemContent}
            </motion.div>
          )
        })}
      </div>
    </div>
    <PromoteToLedgerModal
        isOpen={isMoveToLedgerOpen}
        onClose={() => { setIsMoveToLedgerOpen(false); setSinglePromoteId(null); }}
        items={
          singlePromoteId
            ? tracked.filter((t: any) => t.id === singlePromoteId)
            : selectedIds.map((id: string) => tracked.find((t: any) => t.id === id)).filter(Boolean)
        }
        ledgerDetails={ledgerDetails}
        setLedgerDetails={setLedgerDetails}
        onSubmit={handleMoveToLedger}
        handleCreateAccount={handleCreateAccount}
        handleCreateCategory={handleCreateCategory}
        handleCreateChargeDescriptor={handleCreateChargeDescriptor}
      />

      <Modal isOpen={isBulkEditOpen} onClose={() => setIsBulkEditOpen(false)} title="Bulk Edit Tracked Expenses">
        <div className="space-y-6 p-1">
          <p className="text-xs text-secondary italic mb-4">Editing {selectedIds.length} items. Leave fields blank to keep existing values.</p>
          
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-xs font-black tracking-widest text-secondary mb-2 block">New Amount (Optional)</label>
              <CurrencyInput 
                valueCents={bulkUpdates.amountCents ?? 0} 
                onChangeCents={cents => setBulkUpdates({...bulkUpdates, amountCents: cents})}
                placeholder="0.00"
                className="focus:border-orange-500/50"
              />
            </div>

            <div>
              <label className="text-xs font-black tracking-widest text-secondary mb-2 block">New Description (Optional)</label>
              <input 
                type="text"
                placeholder="Description"
                onChange={e => setBulkUpdates({...bulkUpdates, description: e.target.value})}
                className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-orange-500/50 outline-none"
              />
            </div>

            <div className="border-t border-white/5 pt-4">
              <label className="text-xs font-black tracking-widest text-secondary mb-3 block">Flags (Optional — applies to all selected)</label>
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={bulkUpdates.attentionRequired ?? false}
                    onChange={v => setBulkUpdates({...bulkUpdates, attentionRequired: v})}
                    iconClassName="text-orange-500"
                  />
                  <span className="text-xs font-bold text-secondary flex items-center gap-1.5"><AlertTriangle size={12} className="text-orange-400" /> Mark as Needs Attention</span>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={bulkUpdates.needsBalanceTransfer ?? false}
                    onChange={v => setBulkUpdates({...bulkUpdates, needsBalanceTransfer: v})}
                    iconClassName="text-blue-400"
                  />
                  <span className="text-xs font-bold text-secondary flex items-center gap-1.5"><ArrowLeftRight size={12} className="text-blue-400" /> Mark as Balance Transfer Needed</span>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={bulkUpdates.isBorrowed ?? false}
                    onChange={v => setBulkUpdates({...bulkUpdates, isBorrowed: v})}
                    iconClassName="text-purple-400"
                  />
                  <span className="text-xs font-bold text-secondary flex items-center gap-1.5"><Wallet size={12} className="text-purple-400" /> Mark as Borrowed</span>
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={handleBulkUpdate}
            className="w-full bg-white/10 hover:bg-white/20 text-white font-black tracking-widest py-4 rounded-2xl transition-all border border-white/10"
          >
            Apply Bulk Updates
          </button>
        </div>
      </Modal>

      <Modal isOpen={isDuplicateModalOpen} onClose={() => setIsDuplicateModalOpen(false)} title="Duplicate Tracked Expenses">
        <div className="space-y-6 p-1">
          <div className="bg-orange-500/5 border border-orange-500/10 rounded-2xl p-4 mb-4">
            <p className="text-sm text-orange-200/80 font-medium">
              You are about to duplicate {selectedIds.length} selected transaction(s).
            </p>
          </div>

          <div>
            <label className="text-xs font-black tracking-widest text-secondary mb-2 block">
              Number of copies to make (per transaction)
            </label>
            <input 
              type="number"
              min="1"
              max="50"
              value={duplicateCopies}
              onChange={e => setDuplicateCopies(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-orange-500/50 outline-none font-bold"
            />
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => setIsDuplicateModalOpen(false)}
              className="flex-1 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-xs font-black tracking-widest transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button 
              onClick={handleBulkDuplicate}
              disabled={isDuplicating}
              className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl text-xs font-black tracking-widest transition-all shadow-lg shadow-orange-500/20 cursor-pointer"
            >
              {isDuplicating ? 'Duplicating...' : 'Duplicate'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
