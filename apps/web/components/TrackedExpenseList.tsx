import React, { useState, useMemo } from 'react'
import { InlineToast } from './ui/InlineToast'
import { useCurrency } from '../context/CurrencyContext'
import { useToast } from '../context/ToastContext'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useApi, globalMutate } from '../hooks/useApi'
import { getApiUrl } from '../utils/api'
import { Price } from './Price'
import { Trash2, Edit3, Send, CheckSquare, Square, Save, X, Calendar, Tag, CreditCard, ChevronRight, ChevronDown, AlertTriangle, ArrowLeftRight, Wallet, Copy } from 'lucide-react'
import { Modal } from './ui/Modal'
import { SearchableSelect } from './ui/SearchableSelect'
import { CurrencyInput } from './ui/CurrencyInput'
import { Checkbox } from './ui/Checkbox'
import { DateTimeInput } from './ui/DateTimeInput'

interface TrackedExpenseListProps {
  refreshTrigger?: number
}

export const TrackedExpenseList: React.FC<TrackedExpenseListProps> = ({ refreshTrigger }) => {
  const { data: tracked = [], mutate } = (useApi('/api/tracked-expenses') as any)
  const { data: accounts = [] } = (useApi('/api/financials/accounts') as any)
  const { data: categories = [] } = (useApi('/api/financials/categories') as any)
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
    transactionDate: new Date().toISOString().split('T')[0],
    status: 'paid'
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
              createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString()
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
    if (selectedIds.length === tracked.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(tracked.map((t: any) => t.id))
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
    const res = (await fetch(`${getApiUrl()}/api/tracked-expenses/bulk`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('ledger_token')}`,
            'x-household-id': localStorage.getItem('ledger_householdId') || ''
          },
          body: JSON.stringify({
            ids: [id],
            updates
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
          <h4 className="text-xs font-black uppercase tracking-[0.2em] text-orange-200/60 flex items-center gap-2 mb-1">
            <ChevronRight size={14} className="text-orange-500" />
            Pending Tracked Expenses ({tracked.length})
            <span className="ml-2 px-2 py-0.5 bg-orange-500/10 rounded-full text-orange-400 border border-orange-500/10">
              {formatPrice(tracked.reduce((sum: number, item: any) => sum + (item.amountCents ?? 0), 0))}
            </span>
          </h4>
          <p className="text-xs text-secondary font-medium">Pending expenses tracked automatically from your accounts. You can review them here, bulk edit them, or match/promote them to the main ledger.</p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={toggleSelectAll}
              className="text-[10px] font-black uppercase tracking-widest text-secondary hover:text-primary transition-colors"
            >
              {selectedIds.length === tracked.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          
          {reduced ? (
            selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 bg-orange-500/5 border border-orange-500/20 rounded-xl p-1 pr-2 sm:pr-3 w-full sm:w-auto">
              <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-orange-200/60 border-r border-white/10 mr-1">
                Selected: {formatPrice(selectedIds.reduce((sum: number, id: string) => {
                  const item = tracked.find((t: any) => t.id === id)
                  return sum + (item?.amountCents ?? 0)
                }, 0))}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button 
                  onClick={() => setIsBulkEditOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <Edit3 size={12} /> Bulk Edit
                </button>
                <button 
                  onClick={() => { setDuplicateCopies(1); setIsDuplicateModalOpen(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <Copy size={12} /> Duplicate
                </button>
                <button 
                  onClick={() => setIsMoveToLedgerOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20 cursor-pointer"
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
                <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-orange-200/60 border-r border-white/10 mr-1">
                  Selected: {formatPrice(selectedIds.reduce((sum: number, id: string) => {
                    const item = tracked.find((t: any) => t.id === id)
                    return sum + (item?.amountCents ?? 0)
                  }, 0))}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button 
                    onClick={() => setIsBulkEditOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <Edit3 size={12} /> Bulk Edit
                  </button>
                  <button 
                    onClick={() => { setDuplicateCopies(1); setIsDuplicateModalOpen(true); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <Copy size={12} /> Duplicate
                  </button>
                  <button 
                    onClick={() => setIsMoveToLedgerOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20 cursor-pointer"
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
        {tracked.map((item: any) => {
          const itemContent = (
            <>
              {editingId === item.id ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase font-black tracking-widest text-secondary mb-1 block">Description</label>
                      <input 
                        type="text" 
                        value={editForm?.description || ''} 
                        onChange={e => setEditForm({...editForm, description: e.target.value})}
                        className="w-full bg-black/60 border border-white/10 rounded-xl p-2 text-sm text-white focus:border-orange-500/50 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-black tracking-widest text-secondary mb-1 block">Amount</label>
                      <CurrencyInput 
                        valueCents={editForm?.amountCents || 0} 
                        onChangeCents={cents => setEditForm({...editForm, amountCents: cents})}
                        className="focus:border-orange-500/50 p-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-black tracking-widest text-secondary mb-1 block">Transaction date</label>
                      <input 
                        type="date" 
                        value={editForm?.createdAt ? editForm.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]} 
                        onChange={e => setEditForm({...editForm, createdAt: new Date(e.target.value).toISOString()})}
                        style={{ colorScheme: 'dark' }}
                        className="w-full bg-black/60 border border-white/10 rounded-xl p-2 text-sm text-white focus:border-orange-500/50 outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-black tracking-widest text-secondary mb-1 block">Confirmation Number</label>
                      <input 
                        type="text" 
                        value={editForm?.confirmationNumber || ''} 
                        onChange={e => setEditForm({...editForm, confirmationNumber: e.target.value})}
                        className="w-full bg-black/60 border border-white/10 rounded-xl p-2 text-sm text-white focus:border-orange-500/50 outline-none"
                        placeholder="e.g. TXN-12345"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] uppercase font-black tracking-widest text-secondary mb-1 block">Notes</label>
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
                    <label className="text-[10px] uppercase font-black tracking-widest text-secondary mb-3 block">Flags</label>
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
                          onChange={v => setEditForm({...editForm, needsBalanceTransfer: v})}
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
                        <div>
                          <label className="text-[10px] uppercase font-black tracking-widest text-secondary mb-1 block">Transfer Timing</label>
                          <select 
                            value={editForm?.transferTiming || 'future'} 
                            onChange={e => setEditForm({...editForm, transferTiming: e.target.value})}
                            className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:border-orange-500/50 outline-none"
                          >
                            <option value="same_day">Must do Same Day</option>
                            <option value="future">Can do in Future</option>
                          </select>
                        </div>
                      )}
                      {editForm?.isBorrowed && (
                        <div>
                          <label className="text-[10px] uppercase font-black tracking-widest text-secondary mb-1 block">Borrow Source</label>
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
                            onClick={() => {
                              setSinglePromoteId(item.id)
                              setIsMoveToLedgerOpen(true)
                            }}
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Checkbox 
                      checked={selectedIds.includes(item.id)} 
                      onChange={() => toggleSelect(item.id)} 
                      iconClassName="text-orange-500"
                    />
                    <div>
                      <div className="text-sm font-bold text-white group-hover:text-orange-100 transition-colors">{item.description}</div>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="text-[10px] uppercase tracking-widest text-secondary font-black flex items-center gap-1">
                          <Calendar size={10} /> {new Date(item.createdAt).toLocaleDateString()}
                        </div>
                        {item.attentionRequired && (
                          <div className="text-[10px] uppercase tracking-widest text-orange-400 font-black flex items-center gap-1">
                            <AlertTriangle size={10} /> Needs Attention
                          </div>
                        )}
                        {item.needsBalanceTransfer && (
                          <div className="text-[10px] uppercase tracking-widest text-blue-400 font-black flex items-center gap-1">
                            <ArrowLeftRight size={10} /> Balance Transfer{item.transferTiming ? `: ${(() => {
                              const v = item.transferTiming
                              if (v.includes('T')) {
                                const [d, t] = v.split('T')
                                return `${d} @ ${t}`
                              }
                              return v
                            })()}` : ''}
                          </div>
                        )}
                        {item.isBorrowed && (
                          <div className="text-[10px] uppercase tracking-widest text-purple-400 font-black flex items-center gap-1">
                            <Wallet size={10} /> Borrowed{item.borrowSource ? ` from ${item.borrowSource}` : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <Price amountCents={item.amountCents} className="text-lg font-black text-orange-200" />
                      <div className="text-[9px] uppercase font-black tracking-widest text-secondary mt-0.5">
                        Running: {formatPrice(tracked.slice(0, tracked.indexOf(item) + 1).reduce((s: number, i: any) => s + (i.amountCents ?? 0), 0))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSinglePromoteId(item.id)
                          setIsMoveToLedgerOpen(true)
                        }}
                        className="p-2 hover:bg-orange-500/10 rounded-xl transition-all text-orange-400 hover:text-orange-300 flex items-center justify-center cursor-pointer"
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
                            transferTiming: item.transferTiming || '',
                            isBorrowed: item.isBorrowed ?? false,
                            borrowSource: item.borrowSource || '',
                            createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString()
                          })
                        }}
                        className="p-2 hover:bg-white/10 rounded-xl transition-all text-secondary hover:text-white"
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
    <Modal isOpen={isMoveToLedgerOpen} onClose={() => { setIsMoveToLedgerOpen(false); setSinglePromoteId(null); }} title="Add to Main Ledger">
        <div className="space-y-6 p-1">
          <div className="bg-orange-500/5 border border-orange-500/10 rounded-2xl p-4 mb-4">
            <p className="text-sm text-orange-200/80 font-medium">Moving {singlePromoteId ? 1 : selectedIds.length} item(s) to the transaction ledger.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase font-black tracking-widest text-secondary mb-2 flex items-center gap-1.5">
                <CreditCard size={14} className="text-orange-500" /> Select Account
              </label>
              <SearchableSelect 
                options={accounts.map((a: any) => ({ value: a.id, label: a.name }))}
                value={ledgerDetails.accountId}
                onChange={val => setLedgerDetails({...ledgerDetails, accountId: val})}
                placeholder="Choose Account..."
                onCreate={handleCreateAccount}
              />
            </div>
            <div>
              <label className="text-xs uppercase font-black tracking-widest text-secondary mb-2 flex items-center gap-1.5">
                <Tag size={14} className="text-orange-500" /> Select Category
              </label>
              <SearchableSelect 
                options={categories.map((c: any) => ({ value: c.id, label: c.name }))}
                value={ledgerDetails.categoryId}
                onChange={val => setLedgerDetails({...ledgerDetails, categoryId: val})}
                placeholder="Choose Category..."
                onCreate={handleCreateCategory}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase font-black tracking-widest text-secondary mb-2 flex items-center gap-1.5">
                <Calendar size={14} className="text-orange-500" /> Effective Date
              </label>
              <input 
                type="date"
                value={ledgerDetails.transactionDate}
                onChange={e => setLedgerDetails({...ledgerDetails, transactionDate: e.target.value})}
                className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-orange-500/50 outline-none"
              />
            </div>
            <div>
              <label className="text-xs uppercase font-black tracking-widest text-secondary mb-2 flex items-center gap-1.5">
                Initial Status
              </label>
              <div className="flex gap-2">
                {['paid', 'pending'].map(s => (
                  <button
                    key={s}
                    onClick={() => setLedgerDetails({...ledgerDetails, status: s})}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${ledgerDetails.status === s ? 'bg-orange-500 border-orange-400 text-white' : 'bg-black/40 border-white/10 text-secondary'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button 
            onClick={handleMoveToLedger}
            disabled={!ledgerDetails.accountId}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest py-4 rounded-2xl transition-all shadow-xl shadow-orange-500/20 flex items-center justify-center gap-2"
          >
            <Send size={18} />
            Move to Ledger
          </button>
        </div>
      </Modal>

      <Modal isOpen={isBulkEditOpen} onClose={() => setIsBulkEditOpen(false)} title="Bulk Edit Tracked Expenses">
        <div className="space-y-6 p-1">
          <p className="text-xs text-secondary italic mb-4">Editing {selectedIds.length} items. Leave fields blank to keep existing values.</p>
          
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-xs uppercase font-black tracking-widest text-secondary mb-2 block">New Amount (Optional)</label>
              <CurrencyInput 
                valueCents={bulkUpdates.amountCents ?? 0} 
                onChangeCents={cents => setBulkUpdates({...bulkUpdates, amountCents: cents})}
                placeholder="0.00"
                className="focus:border-orange-500/50"
              />
            </div>

            <div>
              <label className="text-xs uppercase font-black tracking-widest text-secondary mb-2 block">New Description (Optional)</label>
              <input 
                type="text"
                placeholder="Description"
                onChange={e => setBulkUpdates({...bulkUpdates, description: e.target.value})}
                className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-orange-500/50 outline-none"
              />
            </div>

            <div className="border-t border-white/5 pt-4">
              <label className="text-xs uppercase font-black tracking-widest text-secondary mb-3 block">Flags (Optional — applies to all selected)</label>
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
            className="w-full bg-white/10 hover:bg-white/20 text-white font-black uppercase tracking-widest py-4 rounded-2xl transition-all border border-white/10"
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
            <label className="text-xs uppercase font-black tracking-widest text-secondary mb-2 block">
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
              className="flex-1 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button 
              onClick={handleBulkDuplicate}
              disabled={isDuplicating}
              className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-500/20 cursor-pointer"
            >
              {isDuplicating ? 'Duplicating...' : 'Duplicate'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
