import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApi, globalMutate } from '../hooks/useApi'
import { useAuth } from '../context/AuthContext'
import { Flag, ShieldAlert, ArrowRightLeft, HandCoins, Copy, Trash2, Plus, Hash } from 'lucide-react'
import { getApiUrl } from '../utils/api'
import { TrackedExpenseList } from './TrackedExpenseList'
import { CurrencyInput } from './ui/CurrencyInput'
import { SearchableSelect, SearchableOption } from './ui/SearchableSelect'
import { Checkbox } from './ui/Checkbox'
import { ConfirmationNumberBuilder, ConfirmationNumberItem } from './ui/ConfirmationNumberBuilder'
import { TransactionFlagsSelector } from './ui/TransactionFlagsSelector'
import { Search, ArrowUpDown, X } from 'lucide-react'

interface QuickAttentionAddProps {
  onAdded: () => void;
}

interface FormInstance {
  id: string;
  description: string;
  amountCents: number;
  chargeDescriptorId: string;
  billId: string;
  confirmationNumber: string;
  confirmationNumbers: ConfirmationNumberItem[];
  attentionRequired: boolean;
  needsBalanceTransfer: boolean;
  transferTiming: string; // 'same_day' | 'future'
  isBorrowed: boolean;
  borrowType: 'member' | 'external';
  borrowUserId: string;
  borrowCustomName: string;
  borrowPaybackDate: string;
  borrowPaybackMethod: string;
  borrowNotes: string;
  recordHouseholdIou: boolean;
  borrowSource: string;
  transactionDate: string;
  createdAt: string;
}

const TRANSFER_TIMING_OPTIONS: SearchableOption[] = [
  { value: 'same_day', label: 'Must do Same Day (Default)' },
  { value: 'future', label: 'Can do in Future' }
];

const DEFAULT_REIMBURSEMENT_METHODS: SearchableOption[] = [
  { value: 'venmo', label: 'Venmo' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'manual', label: 'Manual' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'cashapp', label: 'Cash App' },
  { value: 'apple_pay', label: 'Apple Pay' }
];

export const QuickAttentionAdd: React.FC<QuickAttentionAddProps> = ({ onAdded }) => {
  const { householdId, user } = useAuth()
  const { data: chargeDescriptors = [] } = (useApi('/api/financials/charge-descriptors') as any)
  const { data: bills = [] } = (useApi('/api/planning/bills') as any)
  const { data: subscriptions = [] } = (useApi('/api/planning/subscriptions') as any)
  const { data: members = [] } = (useApi(householdId ? `/api/user/households/${householdId}/members` : null) as any)

  const otherMembers = (members || []).filter((m: any) => (m.user?.id || m.id) !== user?.id)

  const [customLenders, setCustomLenders] = useState<string[]>(['Parent', 'Friend', 'Bank Loan'])
  const [customReimbursementMethods, setCustomReimbursementMethods] = useState<SearchableOption[]>(DEFAULT_REIMBURSEMENT_METHODS)

  const createEmptyInstance = (): FormInstance => ({
    id: Math.random().toString(36).substr(2, 9),
    description: '',
    amountCents: 0,
    chargeDescriptorId: '',
    billId: '',
    confirmationNumber: '',
    confirmationNumbers: [],
    attentionRequired: false,
    needsBalanceTransfer: false,
    transferTiming: 'same_day', // Default to Must do Same Day
    isBorrowed: false,
    borrowType: otherMembers.length > 0 ? 'member' : 'external',
    borrowUserId: otherMembers[0]?.user?.id || otherMembers[0]?.id || '',
    borrowCustomName: '',
    borrowPaybackDate: '',
    borrowPaybackMethod: 'venmo',
    borrowNotes: '',
    recordHouseholdIou: true,
    borrowSource: '',
    transactionDate: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })(),
    createdAt: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })()
  });

  const [instances, setInstances] = useState<FormInstance[]>(() => [createEmptyInstance()]);
  const [loading, setLoading] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [showInfo, setShowInfo] = useState(false)
  const [instanceSort, setInstanceSort] = useState<'default' | 'amount-desc' | 'amount-asc' | 'date'>('default')
  const [instanceFilter, setInstanceFilter] = useState<'all' | 'flagged' | 'transfer' | 'borrowed'>('all')

  const handleSortInstances = (sortType: 'default' | 'amount-desc' | 'amount-asc' | 'date') => {
    setInstanceSort(sortType)
    if (sortType === 'default') return
    setInstances(prev => {
      const copy = [...prev]
      copy.sort((a, b) => {
        if (sortType === 'amount-desc') return (b.amountCents || 0) - (a.amountCents || 0)
        if (sortType === 'amount-asc') return (a.amountCents || 0) - (b.amountCents || 0)
        if (sortType === 'date') return (a.transactionDate || '').localeCompare(b.transactionDate || '')
        return 0
      })
      return copy
    })
  }

  const handleDuplicate = (index: number) => {
    const source = instances[index];
    const copy: FormInstance = {
      ...source,
      id: Math.random().toString(36).substr(2, 9)
    };
    setInstances(prev => {
      const next = [...prev];
      next.splice(index + 1, 0, copy);
      return next;
    });
  };

  const handleRemove = (index: number) => {
    setInstances(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdate = (index: number, updates: Partial<FormInstance>) => {
    setInstances(prev => prev.map((inst, idx) => idx === index ? { ...inst, ...updates } : inst));
  };

  const handleAddBlank = () => {
    setInstances(prev => [...prev, createEmptyInstance()]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validInstances = instances.filter(inst => inst.amountCents > 0 && inst.description.trim() !== '');
    if (validInstances.length === 0) {
      return;
    }
    setLoading(true)

    try {
      const promises = validInstances.map(inst => {
        let formattedBorrowSource = inst.borrowSource
        let targetUserId: string | null = null

        if (inst.isBorrowed) {
          if (inst.borrowType === 'member') {
            const memberObj = (members || []).find((m: any) => (m.user?.id || m.id) === inst.borrowUserId)
            const lenderName = memberObj?.displayName || memberObj?.user?.displayName || memberObj?.user?.username || memberObj?.email || 'Household Member'
            targetUserId = inst.borrowUserId || null
            formattedBorrowSource = `IOU: ${lenderName}${inst.borrowPaybackDate ? ` • Repay by ${inst.borrowPaybackDate}` : ''}${inst.borrowPaybackMethod ? ` via ${inst.borrowPaybackMethod.toUpperCase()}` : ''}${inst.borrowNotes ? ` (${inst.borrowNotes})` : ''}`
          } else {
            const lenderName = inst.borrowCustomName.trim() || 'External Lender'
            formattedBorrowSource = `Borrowed from ${lenderName}${inst.borrowPaybackDate ? ` • Repay by ${inst.borrowPaybackDate}` : ''}${inst.borrowPaybackMethod ? ` via ${inst.borrowPaybackMethod.toUpperCase()}` : ''}${inst.borrowNotes ? ` (${inst.borrowNotes})` : ''}`
          }
        }

        const validConfirmationNumbers = (inst.confirmationNumbers || []).filter(cn => cn.value && cn.value.trim() !== '').map((cn, i) => ({
          id: crypto.randomUUID(),
          category: cn.category,
          customCategoryLabel: cn.category === 'custom' ? (cn.customCategoryLabel || null) : null,
          value: cn.value.trim(),
          isPrimary: i === 0,
          sortOrder: i
        }))

        const primaryConfirmationNumber = inst.confirmationNumber?.trim() || validConfirmationNumbers[0]?.value || null

        return fetch(`${getApiUrl()}/api/tracked-expenses`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('ledger_token')}`,
            'x-household-id': localStorage.getItem('ledger_householdId') || ''
          },
          body: JSON.stringify({
            description: inst.description,
            amountCents: inst.amountCents,
            chargeDescriptorId: inst.chargeDescriptorId || null,
            billId: inst.billId || null,
            confirmationNumber: primaryConfirmationNumber,
            confirmationNumbers: validConfirmationNumbers,
            attentionRequired: inst.attentionRequired,
            needsBalanceTransfer: inst.needsBalanceTransfer,
            transferTiming: inst.needsBalanceTransfer ? (inst.transferTiming || 'same_day') : null,
            isBorrowed: inst.isBorrowed,
            borrowSource: inst.isBorrowed ? formattedBorrowSource : null,
            recordHouseholdIou: inst.isBorrowed && inst.borrowType === 'member' && inst.recordHouseholdIou,
            iouToUserId: targetUserId,
            iouAmountCents: inst.amountCents,
            iouNotes: inst.borrowNotes || `Borrowed funds for: ${inst.description}`,
            createdAt: inst.transactionDate,
          })
        })
      });

      await Promise.all(promises);

      setInstances([createEmptyInstance()]);
      setRefreshTrigger(prev => prev + 1);
      globalMutate();
      onAdded();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const billInstanceOptions: SearchableOption[] = useMemo(() => {
    const list: SearchableOption[] = []
    
    // Process Subscriptions
    const subList = Array.isArray(subscriptions) ? subscriptions : subscriptions?.data || []
    for (const sub of subList) {
      const owner = (members || []).find((m: any) => (m.user?.id || m.id) === sub.ownerId)
      const ownerName = owner?.displayName || owner?.user?.displayName || owner?.user?.username || (sub.ownerId === user?.id ? 'You' : 'Household')
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
      const ownerName = owner?.displayName || owner?.user?.displayName || owner?.user?.username || (bill.ownerId === user?.id ? 'You' : 'Household')
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
  }, [subscriptions, bills, members, user?.id])

  const memberOptions: SearchableOption[] = useMemo(() => {
    return otherMembers.map((m: any) => ({
      value: m.user?.id || m.id,
      label: m.displayName || m.user?.displayName || m.user?.username || m.email || 'Unknown Member'
    }))
  }, [otherMembers])

  const lenderOptions: SearchableOption[] = useMemo(() => {
    return customLenders.map(l => ({ value: l, label: l }))
  }, [customLenders])

  return (
    <div className="card mb-6 border-l-4 border-l-orange-500 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-3xl rounded-full"></div>
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 relative z-20">
        <div className="flex items-center gap-2">
          <Flag className="text-orange-500" size={18} />
          <h3 className="font-bold text-white tracking-widest text-sm text-orange-100">Add Tracked Expense</h3>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button 
            type="button"
            onClick={handleAddBlank}
            className="text-[10px] font-black tracking-widest text-emerald-400 hover:text-white px-2.5 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 transition-all border border-emerald-500/20 flex items-center gap-1 cursor-pointer"
          >
            <Plus size={10} /> Add Instance
          </button>
          <button 
            type="button"
            onClick={() => setShowInfo(!showInfo)}
            className="text-[10px] font-black tracking-widest text-orange-400 hover:text-white px-2.5 py-1 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 transition-all border border-orange-500/20 cursor-pointer"
          >
            {showInfo ? 'Hide Guide' : 'Show Guide'}
          </button>
        </div>
      </div>

      {showInfo && (
        <div className="mb-5 p-4 bg-orange-500/5 border border-orange-500/10 rounded-2xl text-xs space-y-2.5 leading-relaxed text-orange-200/80 animate-in slide-in-from-top-2 duration-300">
          <p className="font-bold text-orange-400">
            💡 What are Tracked Expenses?
          </p>
          <p>
            Tracked Expenses serve as a "staging area" to draft pending items, log upcoming bills, or flag transactions that require verification before committing them permanently to the main ledger.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <span className="font-black tracking-wider text-[9px] text-orange-300">Use Cases</span>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                <li>Logging borrowed funds needing repayment.</li>
                <li>Staging items requiring a balance transfer.</li>
                <li>Drafting quick payments to audit/reconcile later.</li>
              </ul>
            </div>
            <div className="space-y-1">
              <span className="font-black tracking-wider text-[9px] text-orange-300">Quick Guide</span>
              <ul className="list-decimal pl-4 space-y-0.5 text-[11px]">
                <li>Enter the Amount and Description.</li>
                <li>Toggle optional flags (attention, borrow, transfer).</li>
                <li>Click Add to place it in the Pending Staging List.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
        {instances.length > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-black/40 border border-white/10 rounded-2xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black tracking-widest text-secondary/60">Sort</span>
              <select
                value={instanceSort}
                onChange={(e) => handleSortInstances(e.target.value as any)}
                className="bg-black/60 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white outline-none focus:border-orange-500/50 transition-all"
              >
                <option value="default">Default (Order Added)</option>
                <option value="amount-desc">Amount: High to Low</option>
                <option value="amount-asc">Amount: Low to High</option>
                <option value="date">Transaction Date</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-black tracking-widest text-secondary/60 mr-1">Filter</span>
              {[
                { key: 'all' as const, label: 'All' },
                { key: 'flagged' as const, label: 'Flagged' },
                { key: 'transfer' as const, label: 'Transfer' },
                { key: 'borrowed' as const, label: 'Borrowed' },
              ].map(f => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setInstanceFilter(f.key)}
                  className={`px-2.5 py-1 rounded-lg border text-[10px] font-black tracking-widest transition-all cursor-pointer ${instanceFilter === f.key ? 'bg-orange-500/15 border-orange-500/40 text-orange-300' : 'bg-black/60 border-white/10 text-secondary hover:bg-white/5'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-6">
          {instances
            .map((inst, origIndex) => ({ inst, origIndex }))
            .filter(({ inst }) => {
              if (instanceFilter === 'flagged') return inst.attentionRequired || inst.needsBalanceTransfer || inst.isBorrowed
              if (instanceFilter === 'transfer') return inst.needsBalanceTransfer
              if (instanceFilter === 'borrowed') return inst.isBorrowed
              return true
            })
            .map(({ inst, origIndex }) => (
            <div 
              key={inst.id} 
              className={`p-4 bg-black/20 border rounded-2xl relative transition-all ${
                instances.length > 1 ? 'border-white/10 hover:border-orange-500/20' : 'border-transparent'
              }`}
            >
              {/* Instance Control Buttons */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20">
                <button
                  type="button"
                  onClick={() => handleDuplicate(origIndex)}
                  className="p-1.5 text-secondary hover:text-primary hover:bg-white/5 rounded-lg transition-all cursor-pointer animate-in fade-in"
                  title="Duplicate this instance"
                >
                  <Copy size={13} />
                </button>
                {instances.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemove(origIndex)}
                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer animate-in fade-in"
                    title="Remove this instance"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              {instances.length > 1 && (
                <div className="text-[9px] tracking-widest text-orange-400/60 font-black mb-3">
                  Instance #{origIndex + 1}
                </div>
              )}




              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs tracking-widest text-secondary mb-1 flex">Amount</label>
                  <CurrencyInput 
                    valueCents={inst.amountCents} 
                    onChangeCents={cents => handleUpdate(origIndex, { amountCents: cents })}
                    placeholder="0.00" 
                    required 
                    className="focus:border-orange-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs tracking-widest text-secondary mb-1 flex">Transaction date</label>
                  <input 
                    type="date" 
                    value={inst.transactionDate} 
                    onChange={e => handleUpdate(origIndex, { transactionDate: e.target.value })}
                    style={{ colorScheme: 'dark' }}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-orange-500/50 transition-colors animate-in"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs tracking-widest text-secondary mb-1 flex">Charge Descriptor</label>
                  <SearchableSelect
                    options={(chargeDescriptors || []).map((cd: any) => ({ value: cd.id, label: cd.name }))}
                    value={inst.chargeDescriptorId}
                    onChange={(val) => {
                      const cd = (chargeDescriptors || []).find((c: any) => c.id === val)
                      handleUpdate(origIndex, { chargeDescriptorId: val, description: cd?.name || inst.description })
                    }}
                    placeholder="Choose or create descriptor..."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs tracking-widest text-secondary mb-1 flex items-center justify-between">
                    <span>Linked Bill / Subscription</span>
                    <span className="text-[10px] text-orange-400/80 font-normal">Layer 2 Instance</span>
                  </label>
                  <SearchableSelect
                    options={billInstanceOptions}
                    value={inst.billId || ''}
                    onChange={(val) => {
                      const subList = Array.isArray(subscriptions) ? subscriptions : subscriptions?.data || []
                      const billList = Array.isArray(bills) ? bills : bills?.data || []
                      const matched = [...subList, ...billList].find((b: any) => b.id === val)
                      const updates: Partial<FormInstance> = { billId: val }
                      if (matched && (!inst.amountCents || inst.amountCents === 0)) {
                        updates.amountCents = matched.amountCents || 0
                      }
                      if (matched && !inst.description) {
                        updates.description = matched.name
                      }
                      handleUpdate(origIndex, updates)
                    }}
                    placeholder="Select specific bill instance..."
                  />
                </div>
                <div className="md:col-span-4">
                  <label className="text-xs tracking-widest text-secondary mb-1 flex">Description</label>
                  <input 
                    type="text" 
                    value={inst.description} 
                    onChange={e => handleUpdate(origIndex, { description: e.target.value })}
                    placeholder="What was this for?" 
                    required 
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-orange-500/50 transition-colors"
                  />
                </div>
                {/* Enhanced Categorized Confirmation Numbers */}
                <div className="md:col-span-4">
                  <ConfirmationNumberBuilder
                    value={inst.confirmationNumber}
                    onChangeValue={val => handleUpdate(origIndex, { confirmationNumber: val })}
                    confirmationNumbers={inst.confirmationNumbers}
                    onChangeNumbers={items => handleUpdate(origIndex, { confirmationNumbers: items })}
                    accentColor="orange"
                    compact={true}
                  />
                </div>
              </div>

              {/* Flags Selector */}
              <TransactionFlagsSelector
                flags={{
                  attentionRequired: inst.attentionRequired,
                  needsBalanceTransfer: inst.needsBalanceTransfer,
                  transferTiming: inst.transferTiming,
                  isBorrowed: inst.isBorrowed,
                  borrowType: inst.borrowType,
                  borrowUserId: inst.borrowUserId,
                  borrowCustomName: inst.borrowCustomName,
                  borrowPaybackDate: inst.borrowPaybackDate,
                  borrowPaybackMethod: inst.borrowPaybackMethod,
                  borrowNotes: inst.borrowNotes,
                  recordHouseholdIou: inst.recordHouseholdIou,
                  borrowSource: inst.borrowSource
                }}
                onChange={updates => handleUpdate(origIndex, updates)}
                members={members}
                currentUserId={user?.id}
                showTransferReconciled={false}
                accentColor="orange"
              />
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-white/5">
          <div className="flex items-center gap-3 order-2 sm:order-1">
            <span className="text-xs text-secondary font-semibold">
              {instances.length > 1 && `${instances.length} items staged to add`}
            </span>
            {(instances.length > 1 || instances[0]?.description || instances[0]?.amountCents > 0) && (
              <button
                type="button"
                onClick={() => setInstances([createEmptyInstance()])}
                className="text-[10px] font-black tracking-widest text-red-400 hover:text-red-300 hover:underline cursor-pointer"
              >
                Discard / Reset Changes
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 order-1 sm:order-2">
            <button
              type="button"
              onClick={() => setInstances([createEmptyInstance()])}
              className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white font-bold tracking-wider text-xs rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-6 py-2.5 bg-white text-black font-black tracking-widest text-xs rounded-xl hover:scale-105 transition-transform cursor-pointer"
            >
              {loading ? 'Adding...' : instances.length > 1 ? `Save All Transactions (${instances.length})` : 'Save Transaction'}
            </button>
          </div>
        </div>
      </form>

      <TrackedExpenseList refreshTrigger={refreshTrigger} />
    </div>
  )
}

