import React, { useState } from 'react'
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

interface QuickAttentionAddProps {
  onAdded: () => void;
}

interface FormInstance {
  id: string;
  description: string;
  amountCents: number;
  chargeDescriptorId: string;
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
  const { data: members = [] } = (useApi(householdId ? `/api/user/households/${householdId}/members` : null) as any)

  const otherMembers = (members || []).filter((m: any) => (m.user?.id || m.id) !== user?.id)

  const [customLenders, setCustomLenders] = useState<string[]>(['Parent', 'Friend', 'Bank Loan'])
  const [customReimbursementMethods, setCustomReimbursementMethods] = useState<SearchableOption[]>(DEFAULT_REIMBURSEMENT_METHODS)

  const createEmptyInstance = (): FormInstance => ({
    id: Math.random().toString(36).substr(2, 9),
    description: '',
    amountCents: 0,
    chargeDescriptorId: '',
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

  const memberOptions: SearchableOption[] = otherMembers.map((m: any) => {
    const mId = m.user?.id || m.id
    const mName = m.displayName || m.user?.displayName || m.user?.username || m.email || 'Member'
    return {
      value: mId,
      label: mName
    }
  })

  const lenderOptions: SearchableOption[] = Array.from(new Set([
    ...customLenders,
    ...instances.map(i => i.borrowCustomName).filter(Boolean)
  ])).map(name => ({ value: name, label: name }))

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
        <div className="space-y-6">
          {instances.map((inst, index) => (
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
                  onClick={() => handleDuplicate(index)}
                  className="p-1.5 text-secondary hover:text-primary hover:bg-white/5 rounded-lg transition-all cursor-pointer animate-in fade-in"
                  title="Duplicate this instance"
                >
                  <Copy size={13} />
                </button>
                {instances.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer animate-in fade-in"
                    title="Remove this instance"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              {instances.length > 1 && (
                <div className="text-[9px] tracking-widest text-orange-400/60 font-black mb-3">
                  Instance #{index + 1}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs tracking-widest text-secondary mb-1 flex">Amount</label>
                  <CurrencyInput 
                    valueCents={inst.amountCents} 
                    onChangeCents={cents => handleUpdate(index, { amountCents: cents })}
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
                    onChange={e => handleUpdate(index, { transactionDate: e.target.value })}
                    style={{ colorScheme: 'dark' }}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-orange-500/50 transition-colors animate-in"
                    required
                  />
                </div>
                <div className="md:col-span-2 pr-16">
                  <label className="text-xs tracking-widest text-secondary mb-1 flex">Charge Descriptor</label>
                  <SearchableSelect
                    options={(chargeDescriptors || []).map((cd: any) => ({ value: cd.id, label: cd.name }))}
                    value={inst.chargeDescriptorId}
                    onChange={(val) => {
                      const cd = (chargeDescriptors || []).find((c: any) => c.id === val)
                      handleUpdate(index, { chargeDescriptorId: val, description: cd?.name || inst.description })
                    }}
                    placeholder="Choose or create descriptor..."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs tracking-widest text-secondary mb-1 flex">Description</label>
                  <input 
                    type="text" 
                    value={inst.description} 
                    onChange={e => handleUpdate(index, { description: e.target.value })}
                    placeholder="What was this for?" 
                    required 
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-orange-500/50 transition-colors"
                  />
                </div>
                {/* Enhanced Categorized Confirmation Numbers */}
                <div className="md:col-span-4">
                  <ConfirmationNumberBuilder
                    value={inst.confirmationNumber}
                    onChangeValue={val => handleUpdate(index, { confirmationNumber: val })}
                    confirmationNumbers={inst.confirmationNumbers}
                    onChangeNumbers={items => handleUpdate(index, { confirmationNumbers: items })}
                    accentColor="orange"
                    compact={true}
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 py-2 mt-3 border-y border-white/5">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <Checkbox 
                    checked={inst.attentionRequired} 
                    onChange={v => handleUpdate(index, { attentionRequired: v })} 
                    iconClassName="text-orange-500"
                  />
                  <span className="text-sm font-bold opacity-80 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
                    <ShieldAlert size={14} className={inst.attentionRequired ? "text-orange-400" : ""} />
                    Flag for Future Attention
                  </span>
                </label>
              </div>

              <AnimatePresence>
                {inst.attentionRequired && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-orange-500/5 border border-orange-500/10 rounded-2xl p-4 mt-2 space-y-5">
                      
                      {/* Requires Balance Transfer */}
                      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer flex-1">
                          <Checkbox 
                            checked={inst.needsBalanceTransfer} 
                            onChange={v => handleUpdate(index, { 
                              needsBalanceTransfer: v,
                              transferTiming: inst.transferTiming || 'same_day'
                            })}
                            iconClassName="text-orange-500"
                          />
                          <span className="text-xs sm:text-sm font-bold flex items-center gap-1.5 text-orange-200">
                            <ArrowRightLeft size={16} /> Requires Balance Transfer
                          </span>
                        </label>
                        
                        {inst.needsBalanceTransfer && (
                          <div className="flex items-center gap-2 w-full sm:w-auto min-w-[240px]">
                            <span className="text-[10px] font-black uppercase tracking-wider text-orange-300/70 hidden sm:inline">Timing:</span>
                            <div className="w-full sm:w-64">
                              <SearchableSelect 
                                options={TRANSFER_TIMING_OPTIONS}
                                value={inst.transferTiming || 'same_day'} 
                                onChange={val => handleUpdate(index, { transferTiming: val })}
                                placeholder="Select transfer timing..."
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="w-full h-px bg-white/5"></div>

                      {/* Funds Were Borrowed (Linked to IOU & Payback Details) */}
                      <div className="space-y-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Checkbox 
                            checked={inst.isBorrowed} 
                            onChange={v => handleUpdate(index, { isBorrowed: v })}
                            iconClassName="text-orange-500"
                          />
                          <span className="text-xs sm:text-sm font-bold flex items-center gap-1.5 text-orange-200">
                            <HandCoins size={16} /> Funds were Borrowed
                          </span>
                        </label>
                        
                        {inst.isBorrowed && (
                          <div className="p-3.5 bg-black/40 border border-orange-500/20 rounded-xl space-y-4 animate-in slide-in-from-top-1 duration-200">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
                              <span className="text-[10px] font-black uppercase tracking-wider text-orange-300">
                                Who to Reimburse & Payback Details
                              </span>
                              {otherMembers.length > 0 && (
                                <div className="flex bg-black/40 rounded-lg p-0.5 border border-white/10 self-start sm:self-auto">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdate(index, { borrowType: 'member' })}
                                    className={`px-2.5 py-1 text-[10px] font-black rounded-md transition-all cursor-pointer ${
                                      inst.borrowType === 'member' ? 'bg-orange-500 text-black shadow-sm' : 'text-white/60 hover:text-white'
                                    }`}
                                  >
                                    Household Member
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdate(index, { borrowType: 'external' })}
                                    className={`px-2.5 py-1 text-[10px] font-black rounded-md transition-all cursor-pointer ${
                                      inst.borrowType === 'external' ? 'bg-orange-500 text-black shadow-sm' : 'text-white/60 hover:text-white'
                                    }`}
                                  >
                                    External / Other
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Lender Selection */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {inst.borrowType === 'member' && otherMembers.length > 0 ? (
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block">
                                    Household Member (IOU Recipient)
                                  </label>
                                  <SearchableSelect
                                    options={memberOptions}
                                    value={inst.borrowUserId || otherMembers[0]?.user?.id || otherMembers[0]?.id || ''}
                                    onChange={val => handleUpdate(index, { borrowUserId: val })}
                                    placeholder="Search household member..."
                                  />
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block">
                                    Lender / Entity Name
                                  </label>
                                  <SearchableSelect
                                    options={lenderOptions}
                                    value={inst.borrowCustomName}
                                    onChange={val => handleUpdate(index, { borrowCustomName: val })}
                                    onCreate={(search) => {
                                      const trimmed = search.trim()
                                      if (trimmed) {
                                        setCustomLenders(prev => Array.from(new Set([...prev, trimmed])))
                                        handleUpdate(index, { borrowCustomName: trimmed })
                                        return trimmed
                                      }
                                    }}
                                    placeholder="Search or enter lender/entity name..."
                                  />
                                </div>
                              )}

                              {/* Target Payback Date */}
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block">
                                  Target Payback Date (Optional)
                                </label>
                                <input
                                  type="date"
                                  value={inst.borrowPaybackDate}
                                  onChange={e => handleUpdate(index, { borrowPaybackDate: e.target.value })}
                                  style={{ colorScheme: 'dark' }}
                                  className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs font-bold text-white outline-none focus:border-orange-400"
                                />
                              </div>
                            </div>

                            {/* Payback Method & Terms */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block">
                                  Reimbursement Method
                                </label>
                                <SearchableSelect
                                  options={customReimbursementMethods}
                                  value={inst.borrowPaybackMethod || 'venmo'}
                                  onChange={val => handleUpdate(index, { borrowPaybackMethod: val })}
                                  onCreate={(search) => {
                                    const trimmed = search.trim()
                                    if (trimmed) {
                                      const newOpt: SearchableOption = { value: trimmed.toLowerCase().replace(/\s+/g, '_'), label: trimmed }
                                      setCustomReimbursementMethods(prev => [...prev, newOpt])
                                      handleUpdate(index, { borrowPaybackMethod: newOpt.value })
                                      return newOpt.value
                                    }
                                  }}
                                  placeholder="Select or add method..."
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block">
                                  Payback Terms / Notes
                                </label>
                                <input
                                  type="text"
                                  value={inst.borrowNotes}
                                  onChange={e => handleUpdate(index, { borrowNotes: e.target.value })}
                                  placeholder="e.g. Repay from next Friday paycheck"
                                  className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs font-bold text-white outline-none focus:border-orange-400"
                                />
                              </div>
                            </div>

                            {/* Auto-record Household IOU Option */}
                            {inst.borrowType === 'member' && otherMembers.length > 0 && (
                              <label className="flex items-center gap-2 p-2.5 bg-orange-500/10 border border-orange-500/20 rounded-xl cursor-pointer">
                                <Checkbox
                                  checked={inst.recordHouseholdIou}
                                  onChange={v => handleUpdate(index, { recordHouseholdIou: v })}
                                  iconClassName="text-orange-400"
                                />
                                <span className="text-xs font-bold text-orange-200">
                                  Automatically sync to Household IOU & Shared Balances Ledger
                                </span>
                              </label>
                            )}
                          </div>
                        )}
                      </div>

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-white/5">
          <div className="text-xs text-secondary font-semibold order-2 sm:order-1">
            {instances.length > 1 && `${instances.length} items staged to add`}
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="px-6 py-2.5 bg-white text-black font-black tracking-widest text-xs rounded-xl hover:scale-105 transition-transform cursor-pointer"
          >
            {loading ? 'Adding...' : instances.length > 1 ? `Save All Transactions (${instances.length})` : 'Save Transaction'}
          </button>
        </div>
      </form>

      <TrackedExpenseList refreshTrigger={refreshTrigger} />
    </div>
  )
}

