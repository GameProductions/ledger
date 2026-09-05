import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldAlert, ArrowRightLeft, HandCoins, CheckCircle2 } from 'lucide-react'
import { Checkbox } from './Checkbox'
import { SearchableSelect, SearchableOption } from './SearchableSelect'

export interface TransactionFlagsData {
  attentionRequired?: boolean
  needsBalanceTransfer?: boolean
  transferTiming?: string | null
  transferReconciled?: boolean
  isBorrowed?: boolean
  borrowType?: 'member' | 'external'
  borrowUserId?: string | null
  borrowCustomName?: string | null
  borrowPaybackDate?: string | null
  borrowPaybackMethod?: string | null
  borrowNotes?: string | null
  recordHouseholdIou?: boolean
  borrowSource?: string | null
}

const TRANSFER_TIMING_OPTIONS: SearchableOption[] = [
  { value: 'same_day', label: 'Must do Same Day (Default)' },
  { value: 'future', label: 'Can do in Future' }
]

const DEFAULT_REIMBURSEMENT_METHODS: SearchableOption[] = [
  { value: 'venmo', label: 'Venmo' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'manual', label: 'Manual' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'cashapp', label: 'Cash App' },
  { value: 'apple_pay', label: 'Apple Pay' }
]

interface TransactionFlagsSelectorProps {
  flags: TransactionFlagsData
  onChange: (updates: Partial<TransactionFlagsData>) => void
  members?: any[]
  currentUserId?: string
  showTransferReconciled?: boolean
  accentColor?: 'orange' | 'primary'
}

export const TransactionFlagsSelector: React.FC<TransactionFlagsSelectorProps> = ({
  flags,
  onChange,
  members = [],
  currentUserId,
  showTransferReconciled = true,
  accentColor = 'orange'
}) => {
  const isOrange = accentColor === 'orange'
  const otherMembers = members.filter((m: any) => (m.user?.id || m.id) !== currentUserId)

  const [customLenders, setCustomLenders] = useState<string[]>(['Parent', 'Friend', 'Bank Loan'])
  const [reimbursementMethods, setReimbursementMethods] = useState<SearchableOption[]>(DEFAULT_REIMBURSEMENT_METHODS)

  const memberOptions: SearchableOption[] = otherMembers.map((m: any) => ({
    value: m.user?.id || m.id,
    label: m.displayName || m.user?.displayName || m.user?.username || m.email || 'Household Member'
  }))

  const lenderOptions: SearchableOption[] = customLenders.map(l => ({ value: l, label: l }))

  return (
    <div className="space-y-3">
      {/* Top Level Flag Checkbox */}
      <div className="flex items-center gap-4 py-2 border-y border-white/5">
        <label className="flex items-center gap-2 cursor-pointer group">
          <Checkbox 
            checked={!!flags.attentionRequired} 
            onChange={v => onChange({ attentionRequired: v })} 
            iconClassName={isOrange ? "text-orange-500" : "text-primary"}
          />
          <span className="text-sm font-bold opacity-80 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
            <ShieldAlert size={14} className={flags.attentionRequired ? (isOrange ? "text-orange-400" : "text-primary") : ""} />
            Flag for Future Attention
          </span>
        </label>
      </div>

      <AnimatePresence>
        {flags.attentionRequired && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className={`bg-white/[0.02] border ${isOrange ? 'border-orange-500/20 bg-orange-500/5' : 'border-primary/20 bg-primary/5'} rounded-2xl p-4 space-y-4`}>
              
              {/* Requires Balance Transfer */}
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer flex-1">
                  <Checkbox 
                    checked={!!flags.needsBalanceTransfer} 
                    onChange={v => onChange({ 
                      needsBalanceTransfer: v,
                      transferTiming: flags.transferTiming || 'same_day'
                    })}
                    iconClassName={isOrange ? "text-orange-500" : "text-primary"}
                  />
                  <span className={`text-xs sm:text-sm font-bold flex items-center gap-1.5 ${isOrange ? 'text-orange-200' : 'text-slate-200'}`}>
                    <ArrowRightLeft size={16} className="text-blue-400" /> Requires Balance Transfer
                  </span>
                </label>
                
                {flags.needsBalanceTransfer && (
                  <div className="flex items-center gap-2 w-full sm:w-auto min-w-[240px]">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 hidden sm:inline">Timing:</span>
                    <div className="w-full sm:w-64">
                      <SearchableSelect 
                        options={TRANSFER_TIMING_OPTIONS}
                        value={flags.transferTiming || 'same_day'} 
                        onChange={val => onChange({ transferTiming: val })}
                        placeholder="Select transfer timing..."
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Optional Reconciled Toggle (Manual Check Only) */}
              {flags.needsBalanceTransfer && showTransferReconciled && (
                <div className="pl-6 pt-1 flex items-center gap-2">
                  <Checkbox
                    checked={!!flags.transferReconciled}
                    onChange={v => onChange({ transferReconciled: v })}
                    iconClassName="text-emerald-500"
                  />
                  <span className="text-xs font-bold text-secondary flex items-center gap-1">
                    <CheckCircle2 size={13} className="text-emerald-400" /> Transfer Reconciled / Cleared
                  </span>
                </div>
              )}

              <div className="w-full h-px bg-white/5"></div>

              {/* Funds Were Borrowed */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox 
                    checked={!!flags.isBorrowed} 
                    onChange={v => onChange({ 
                      isBorrowed: v,
                      borrowType: flags.borrowType || (otherMembers.length > 0 ? 'member' : 'external'),
                      borrowUserId: flags.borrowUserId || otherMembers[0]?.user?.id || otherMembers[0]?.id || null,
                      borrowPaybackMethod: flags.borrowPaybackMethod || 'venmo'
                    })}
                    iconClassName={isOrange ? "text-orange-500" : "text-primary"}
                  />
                  <span className={`text-xs sm:text-sm font-bold flex items-center gap-1.5 ${isOrange ? 'text-orange-200' : 'text-slate-200'}`}>
                    <HandCoins size={16} className="text-purple-400" /> Funds were Borrowed
                  </span>
                </label>
                
                {flags.isBorrowed && (
                  <div className="p-3.5 bg-black/40 border border-white/10 rounded-xl space-y-4 animate-in slide-in-from-top-1 duration-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                        Who to Reimburse & Payback Details
                      </span>
                      {otherMembers.length > 0 && (
                        <div className="flex bg-black/40 rounded-lg p-0.5 border border-white/10 self-start sm:self-auto">
                          <button
                            type="button"
                            onClick={() => onChange({ borrowType: 'member' })}
                            className={`px-2.5 py-1 text-[10px] font-black rounded-md transition-all cursor-pointer ${
                              flags.borrowType === 'member' 
                                ? (isOrange ? 'bg-orange-500 text-black shadow-sm' : 'bg-primary text-black shadow-sm') 
                                : 'text-white/60 hover:text-white'
                            }`}
                          >
                            Household Member
                          </button>
                          <button
                            type="button"
                            onClick={() => onChange({ borrowType: 'external' })}
                            className={`px-2.5 py-1 text-[10px] font-black rounded-md transition-all cursor-pointer ${
                              flags.borrowType === 'external' 
                                ? (isOrange ? 'bg-orange-500 text-black shadow-sm' : 'bg-primary text-black shadow-sm') 
                                : 'text-white/60 hover:text-white'
                            }`}
                          >
                            External / Other
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Lender Selection */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {flags.borrowType === 'member' && otherMembers.length > 0 ? (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block">
                            Household Member (IOU Recipient)
                          </label>
                          <SearchableSelect
                            options={memberOptions}
                            value={flags.borrowUserId || otherMembers[0]?.user?.id || otherMembers[0]?.id || ''}
                            onChange={val => onChange({ borrowUserId: val })}
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
                            value={flags.borrowCustomName || flags.borrowSource || ''}
                            onChange={val => onChange({ borrowCustomName: val, borrowSource: val })}
                            onCreate={(search) => {
                              const trimmed = search.trim()
                              if (trimmed) {
                                setCustomLenders(prev => Array.from(new Set([...prev, trimmed])))
                                onChange({ borrowCustomName: trimmed, borrowSource: trimmed })
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
                          value={flags.borrowPaybackDate || ''}
                          onChange={e => onChange({ borrowPaybackDate: e.target.value })}
                          style={{ colorScheme: 'dark' }}
                          className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs font-bold text-white outline-none focus:border-white/30"
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
                          options={reimbursementMethods}
                          value={flags.borrowPaybackMethod || 'venmo'}
                          onChange={val => onChange({ borrowPaybackMethod: val })}
                          onCreate={(search) => {
                            const trimmed = search.trim()
                            if (trimmed) {
                              const newOpt: SearchableOption = { value: trimmed.toLowerCase().replace(/\s+/g, '_'), label: trimmed }
                              setReimbursementMethods(prev => [...prev, newOpt])
                              onChange({ borrowPaybackMethod: newOpt.value })
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
                          value={flags.borrowNotes || ''}
                          onChange={e => onChange({ borrowNotes: e.target.value })}
                          placeholder="e.g. Repay from next Friday paycheck"
                          className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs font-bold text-white outline-none focus:border-white/30"
                        />
                      </div>
                    </div>

                    {/* Auto-record Household IOU Option */}
                    {flags.borrowType === 'member' && otherMembers.length > 0 && (
                      <label className="flex items-center gap-2 p-2.5 bg-white/5 border border-white/10 rounded-xl cursor-pointer">
                        <Checkbox
                          checked={!!flags.recordHouseholdIou}
                          onChange={v => onChange({ recordHouseholdIou: v })}
                          iconClassName={isOrange ? "text-orange-400" : "text-primary"}
                        />
                        <span className={`text-xs font-bold ${isOrange ? 'text-orange-200' : 'text-slate-200'}`}>
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
  )
}
