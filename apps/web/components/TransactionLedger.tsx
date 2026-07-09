import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useAuth } from '../context/AuthContext'
import { getApiUrl } from '../utils/api'
import { useApi, globalMutate } from '../hooks/useApi'
import { Price } from './Price'
import { Search, Filter, HelpCircle, ChevronDown, ChevronUp, Link as LinkIcon, Check, SplitSquareVertical, Flag, Plus, Trash2, Edit3, Save, X, Hash } from 'lucide-react'
import { Modal } from './ui/Modal'
import { SearchableSelect } from './ui/SearchableSelect'
import { CurrencyInput } from './ui/CurrencyInput'
import { Checkbox } from './ui/Checkbox'
import { QuickAttentionAdd } from './QuickAttentionAdd'
import { TransactionTimeline } from './TransactionTimeline'

export const TransactionLedger: React.FC = () => {
  const { token, householdId } = useAuth()
  const reduced = useReducedMotion()
  
  // Filtering & Sorting State
  const [q, setQ] = useState('')
  const [sortBy, setSortBy] = useState('date') // 'date' | 'amount'
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc')
  const [limit, setLimit] = useState(50)
  const [showNeedsAttentionOnly, setShowNeedsAttentionOnly] = useState(false)
  
  // Data Fetching
  const { data: transactions = [], mutate: mutateTx } = (useApi(`/api/financials/transactions?q=${q}&sort_by=${sortBy}&sort_dir=${sortDir}&limit=${limit}`) as any)
  const { data: accounts = [] } = (useApi('/api/financials/accounts') as any)
  const { data: categories = [] } = (useApi('/api/financials/categories') as any)

  // Selection & Details State
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isAddTxOpen, setIsAddTxOpen] = useState(false)
  const [editingTx, setEditingTx] = useState<any>(null)
  const [txForm, setTxForm] = useState<any>({
    description: '',
    amountCents: 0,
    accountId: '',
    categoryId: '',
    transactionDate: new Date().toISOString().split('T')[0],
    notes: '',
    confirmationNumber: '',
    status: 'pending'
  })
  
  const handleCreateTx = async (e: React.FormEvent) => {
    e.preventDefault();
    const apiUrl = getApiUrl();
    const res = (await fetch(`${apiUrl}/api/financials/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-household-id': householdId || ''
      },
      body: JSON.stringify(txForm)
    }) as any);
    if (res.ok) {
      setIsAddTxOpen(false);
      setTxForm({
        description: '',
        amountCents: 0,
        accountId: '',
        categoryId: '',
        transactionDate: new Date().toISOString().split('T')[0],
        notes: '',
        confirmationNumber: '',
        status: 'pending'
      });
      globalMutate();
    }
  };

  const handleUpdateTx = async (e: React.FormEvent) => {
    e.preventDefault();
    const apiUrl = getApiUrl();
    const res = (await fetch(`${apiUrl}/api/financials/transactions/${editingTx.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-household-id': householdId || ''
      },
      body: JSON.stringify(txForm)
    }) as any);
    if (res.ok) {
      setEditingTx(null);
      globalMutate();
    }
  };

  const handleDeleteTx = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
    const apiUrl = getApiUrl();
    const res = (await fetch(`${apiUrl}/api/financials/transactions/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-household-id': householdId || ''
      }
    }) as any);
    if (res.ok) {
      globalMutate();
    }
  };

  const handleBulkDeleteTxs = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} transactions?`)) return;
    const apiUrl = getApiUrl();
    const res = (await fetch(`${apiUrl}/api/financials/transactions/bulk`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-household-id': householdId || ''
      },
      body: JSON.stringify({ ids: selectedIds })
    }) as any);
    if (res.ok) {
      setSelectedIds([]);
      globalMutate();
    }
  };

  const handleCreateCategory = async (name: string): Promise<string> => {
    const res = (await fetch(`${getApiUrl()}/api/financials/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-household-id': householdId || ''
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
        'Authorization': `Bearer ${token}`,
        'x-household-id': householdId || ''
      },
      body: JSON.stringify({ name, type: 'checking', balanceCents: 0 })
    }) as any);
    const data = (await res.json() as any);
    globalMutate();
    return data.id;
  };

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<Record<string, any>>({})
  const [activeSplitTx, setActiveSplitTx] = useState<any>(null)
  const [activeLinkTx, setActiveLinkTx] = useState<any>(null)
  const [split1Cents, setSplit1Cents] = useState(0)
  const [split2Cents, setSplit2Cents] = useState(0)
  const [split1Desc, setSplit1Desc] = useState('')
  const [split2Desc, setSplit2Desc] = useState('')

  // Inline confirmation number editing state for linked (transfer) transactions
  const [transferConfirmEditing, setTransferConfirmEditing] = useState<string | null>(null)
  const [transferConfirmValue, setTransferConfirmValue] = useState('')

  const handleSaveTransferConfirmation = async (txId: string) => {
    const apiUrl = getApiUrl()
    const res = (await fetch(`${apiUrl}/api/financials/transactions/${txId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-household-id': householdId || ''
      },
      body: JSON.stringify({ confirmationNumber: transferConfirmValue })
    }) as any)
    if (res.ok) {
      setTransferConfirmEditing(null)
      globalMutate()
    }
  }
  
  // Suggestion Engine
  useEffect(() => {
    if (!transactions) return;
    const checkSuggestions = async () => {
      for (const tx of transactions) {
        if (!tx.categoryId && !suggestions[tx.id]) {
          try {
            const apiUrl = getApiUrl();
            const res = (await fetch(`${apiUrl}/api/financials/transactions/infer`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`,
                            'x-household-id': householdId || ''
                          },
                          body: JSON.stringify({ rawDescription: tx.description })
                        }) as any);
            const data = (await res.json() as any);
            if (data.suggestions) {
              setSuggestions(prev => ({ ...prev, [tx.id]: data.suggestions }));
            }
          } catch(e: any) {}
        }
      }
    };
    checkSuggestions();
  }, [transactions, householdId, token]);

  // Selection Math
  const selectionSumCents = useMemo(() => {
    if (!transactions) return 0
    return transactions
      .filter((t: any) => selectedIds.includes(t.id))
      .reduce((sum: number, t: any) => sum + (t.amountCents || 0), 0)
  }, [selectedIds, transactions])

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortDir('desc')
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const toggleSelectAll = () => {
    if (transactions && selectedIds.length === transactions.length) {
      setSelectedIds([])
    } else if (transactions) {
      setSelectedIds(transactions.map((t: any) => t.id))
    }
  }

  const resolveAttention = async (id: string) => {
    const apiUrl = getApiUrl();
    await fetch(`${apiUrl}/api/financials/transactions/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-household-id': householdId || ''
      },
      body: JSON.stringify({ accountedFor: true })
    })
    globalMutate()
  }

  const bulkReconcile = async (reconciled: boolean) => {
    const apiUrl = getApiUrl();
    await fetch(`${apiUrl}/api/financials/transactions/bulk-reconcile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-household-id': householdId || ''
      },
      body: JSON.stringify({ transaction_ids: selectedIds, reconciled })
    })
    globalMutate()
    setSelectedIds([])
  }

  const handleExecuteSplit = async () => {
    if (!activeSplitTx || !split1Cents || !split2Cents) return
    const apiUrl = getApiUrl()
    await fetch(`${apiUrl}/api/financials/transactions/${activeSplitTx.id}/split`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-household-id': householdId || ''
      },
      body: JSON.stringify({
        splits: [
          { amountCents: split1Cents, description: split1Desc || 'Split 1' },
          { amountCents: split2Cents, description: split2Desc || 'Split 2' }
        ]
      })
    })
    setActiveSplitTx(null)
    setSplit1Cents(0)
    setSplit2Cents(0)
    setSplit1Desc('')
    setSplit2Desc('')
    globalMutate()
  }

  return (
    <>
      <div className="card w-full relative overflow-hidden" id="transaction-ledger">
      
      <QuickAttentionAdd onAdded={() => globalMutate()} />

      <div className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-1">
              📖 Transaction Ledger
              <button onClick={() => setIsHelpOpen(true)} className="p-1 hover:bg-white/10 rounded-full transition-colors text-primary" title="Help">
                <HelpCircle size={16} />
              </button>
              <button 
                onClick={() => {
                  setTxForm({
                    description: '',
                    amountCents: 0,
                    accountId: accounts[0]?.id || 'default-account',
                    categoryId: '',
                    transactionDate: new Date().toISOString().split('T')[0],
                    notes: '',
                    confirmationNumber: '',
                    status: 'pending'
                  });
                  setIsAddTxOpen(true);
                }} 
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-black font-bold uppercase tracking-widest text-[10px] rounded-lg hover:brightness-110 transition-all shadow-md"
                title="Add Transaction"
              >
                <Plus size={12} /> Add Item
              </button>
            </h2>
            <p className="text-xs text-secondary font-medium">A complete list of your historical purchases and deposits. Search, filter, and edit transactions, or map them to categories to keep your budget accurate.</p>
          </div>

          {selectedIds.length > 0 && (
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full lg:w-auto animate-in slide-in-from-top-2 duration-300">
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-widest opacity-60 font-bold">Selected ({selectedIds.length} items)</span>
                <span className={`text-md font-black tracking-tighter ${selectionSumCents > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  <Price amountCents={selectionSumCents} />
                </span>
              </div>
              <div className="hidden sm:block w-px h-8 bg-white/10"></div>
              <div className="flex flex-wrap items-center gap-2">
                <button 
                  onClick={() => bulkReconcile(true)}
                  className="px-2.5 py-1.5 bg-primary text-black font-black uppercase tracking-widest text-[9px] rounded-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-1"
                >
                  <Check size={10} /> Reconcile
                </button>
                <button 
                  onClick={handleBulkDeleteTxs}
                  className="px-2.5 py-1.5 bg-red-500/20 text-red-400 font-black border border-red-500/30 uppercase tracking-widest text-[9px] rounded-lg hover:bg-red-500/35 transition-all flex items-center gap-1"
                >
                  <Trash2 size={10} /> Delete
                </button>
                <button 
                  onClick={() => setSelectedIds([])}
                  className="px-2.5 py-1.5 bg-white/10 text-white font-black uppercase tracking-widest text-[9px] rounded-lg hover:bg-white/20 transition-all"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 ml-auto">
          <div className="relative group/search">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary group-focus-within/search:text-primary transition-colors" />
            <input 
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search..." 
              className="pl-9 pr-4 py-1.5 text-xs bg-black/40 border border-white/10 rounded-full focus:outline-none focus:border-primary w-32 focus:w-48 transition-all font-black uppercase tracking-widest"
            />
          </div>
          <button 
            onClick={() => setShowNeedsAttentionOnly(!showNeedsAttentionOnly)}
            className={`p-2 border rounded-xl transition-all ${showNeedsAttentionOnly ? 'bg-orange-500/20 border-orange-500/50 text-orange-400' : 'bg-white/5 border-white/10 text-secondary hover:bg-white/10'}`}
            title="Filter by Needs Attention"
          >
            <Flag size={14} className={showNeedsAttentionOnly ? 'fill-current' : ''} />
          </button>
          <button className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all">
            <Filter size={14} className="text-secondary" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/10 text-gray-400">
              <th className="py-2 pl-2 w-10">
                <Checkbox 
                  checked={!!(transactions && transactions.length > 0 && selectedIds.length === transactions?.length)} 
                  onChange={toggleSelectAll} 
                />
              </th>
              <th className="py-2 cursor-pointer hover:text-white" onClick={() => toggleSort('date')}>
                Date {sortBy === 'date' && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
              <th className="py-2">Description</th>
              <th className="py-2">Category</th>
              <th className="py-2 text-right cursor-pointer hover:text-white" onClick={() => toggleSort('amount')}>
                Amount {sortBy === 'amount' && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
              <th className="py-2 pr-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {!transactions ? <tr><td colSpan={6} className="text-center py-8">Loading ledger...</td></tr> : 
              transactions.filter((tx: any) => showNeedsAttentionOnly ? tx.attentionRequired && !tx.accountedFor : true).map((tx: any) => (
              <React.Fragment key={tx.id}>
                <tr className={`border-b border-white/5 hover:bg-white/5 transition-colors ${selectedIds.includes(tx.id) ? 'bg-primary/5' : ''}`}>
                  <td className="py-2 pl-2">
                    <Checkbox 
                      checked={selectedIds.includes(tx.id)} 
                      onChange={() => toggleSelect(tx.id)} 
                    />
                  </td>
                  <td className="py-2 opacity-80 whitespace-nowrap">{tx.transactionDate}</td>
                  <td className="py-2 font-medium flex items-center gap-2">
                    {tx.description}
                    {tx.attentionRequired && !tx.accountedFor && (
                       <Flag size={14} className="text-orange-500" />
                    )}
                  </td>
                  <td className="py-2">
                    {tx.categoryId ? (
                      <span className="px-2 py-0.5 bg-white/10 rounded-full text-xs opacity-80">
                        {categories?.find((c:any) => c.id === tx.categoryId)?.name || 'Unknown'}
                      </span>
                    ) : suggestions[tx.id] ? (
                      <div className="flex items-center gap-2">
                         <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-full text-xs flex items-center gap-1">
                           ✨ {categories?.find((c:any) => c.id === suggestions[tx.id].categoryId)?.name || 'Suggested'}
                         </span>
                         <button 
                           onClick={() => {/* Mock confirm & remember */ globalMutate()}}
                           className="text-[10px] bg-orange-500 text-black px-2 rounded-full font-bold uppercase tracking-widest hover:scale-105"
                         >
                           Confirm
                         </button>
                      </div>
                    ) : (
                      <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 rounded-full text-xs">Uncategorized</span>
                    )}
                  </td>
                  <td className={`py-2 text-right font-bold ${tx.amountCents > 0 ? 'text-emerald-400' : 'text-white'}`}>
                    <Price amountCents={Math.abs(tx.amountCents)} />
                  </td>
                  <td className="py-2 pr-2 text-right">
                    <button onClick={() => setExpandedId(expandedId === tx.id ? null : tx.id)} className="p-1 hover:bg-white/10 rounded">
                      {expandedId === tx.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </td>
                </tr>
                {expandedId === tx.id && (
                  <tr className="bg-black/20 border-b border-white/10">
                    <td colSpan={6} className="p-4">
                      <div className="grid grid-cols-2 gap-4 text-xs opacity-80">
                        <div>
                          <p className="mb-1 uppercase tracking-wider font-bold opacity-50">Raw Bank Data</p>
                           <p className="font-mono bg-black/50 p-2 rounded">{tx.rawDescription || tx.description}</p>
                           <div className="mt-3 flex gap-2 flex-wrap">
                            <button onClick={() => setActiveSplitTx(tx)} className="flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded hover:bg-white/20 transition">
                              <SplitSquareVertical size={14} /> Split Transaction
                            </button>
                            <button onClick={() => setActiveLinkTx(tx)} className="flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded hover:bg-white/20 transition">
                              <LinkIcon size={14} /> Link to Bill/Transfer
                            </button>
                            <button 
                              onClick={() => {
                                setEditingTx(tx);
                                setTxForm({
                                  description: tx.description,
                                  amountCents: tx.amountCents,
                                  accountId: tx.accountId || '',
                                  categoryId: tx.categoryId || '',
                                  transactionDate: tx.transactionDate,
                                  notes: tx.notes || '',
                                  confirmationNumber: tx.confirmationNumber || '',
                                  status: tx.status || 'pending'
                                });
                              }} 
                              className="flex items-center gap-1 bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded hover:bg-blue-500/20 transition"
                            >
                              <Edit3 size={14} /> Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteTx(tx.id)} 
                              className="flex items-center gap-1 bg-red-500/10 text-red-400 px-3 py-1.5 rounded hover:bg-red-500/20 transition"
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <p className="mb-1 uppercase tracking-wider font-bold opacity-50">Audit History</p>
                          <div className="max-h-40 overflow-y-auto bg-black/25 border border-white/5 rounded-xl p-3">
                            <TransactionTimeline transactionId={tx.id} />
                          </div>
                          <ul className="space-y-1 text-xs">
                            <li>Created: {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : 'N/A'}</li>
                            <li>Status: {tx.reconciliationStatus || 'unreconciled'}</li>
                            {tx.ownerId && <li>Owner ID: {tx.ownerId}</li>}
                          </ul>
                          {tx.notes && (
                            <div className="mt-2 bg-yellow-500/10 border border-yellow-500/20 p-2 rounded text-yellow-500 text-xs">
                              Note: {tx.notes}
                            </div>
                          )}
                        </div>
                      </div>

                      {tx.attentionRequired && !tx.accountedFor && (
                        <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                           <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <h4 className="text-orange-400 font-bold uppercase tracking-widest text-xs flex items-center gap-1"><Flag size={12} /> Attention Required</h4>
                                {tx.needsBalanceTransfer && <p className="text-sm">🔄 Balance Transfer timing: <span className="text-white font-bold">{tx.transferTiming === 'same_day' ? 'Same Day' : 'Future'}</span></p>}
                                {tx.isBorrowed && <p className="text-sm">💸 Borrowed Funds Source: <span className="text-white font-bold">{tx.borrowSource || 'Not specified'}</span></p>}
                              </div>
                              <button 
                                onClick={() => resolveAttention(tx.id)}
                                className="px-4 py-2 bg-orange-500 text-black font-bold uppercase tracking-widest text-xs rounded-lg hover:scale-105 transition-transform"
                              >
                                Mark Accounted For
                              </button>
                           </div>
                        </div>
                      )}

                      {tx.linkedTransactionId && (
                        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h4 className="text-blue-400 font-bold uppercase tracking-widest text-xs flex items-center gap-1 mb-2">
                                <Hash size={12} /> Transfer Confirmation
                              </h4>
                              {transferConfirmEditing === tx.id ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    autoFocus
                                    type="text"
                                    value={transferConfirmValue}
                                    onChange={e => setTransferConfirmValue(e.target.value)}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') handleSaveTransferConfirmation(tx.id)
                                      if (e.key === 'Escape') setTransferConfirmEditing(null)
                                    }}
                                    placeholder="e.g. REF-12345"
                                    className="flex-1 bg-black/60 border border-blue-500/40 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-400"
                                  />
                                  <button
                                    onClick={() => handleSaveTransferConfirmation(tx.id)}
                                    className="p-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                    aria-label="Save confirmation number"
                                  >
                                    <Save size={14} />
                                  </button>
                                  <button
                                    onClick={() => setTransferConfirmEditing(null)}
                                    className="p-1.5 text-secondary hover:text-white transition-colors"
                                    aria-label="Cancel"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-3">
                                  <span className="font-mono text-sm text-white/80">
                                    {tx.confirmationNumber || <span className="text-white/30 italic text-xs">No confirmation number set</span>}
                                  </span>
                                  <button
                                    onClick={() => {
                                      setTransferConfirmEditing(tx.id)
                                      setTransferConfirmValue(tx.confirmationNumber || '')
                                    }}
                                    className="text-[10px] uppercase tracking-widest font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                                  >
                                    <Edit3 size={10} /> {tx.confirmationNumber ? 'Edit' : 'Add'}
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className="text-[10px] uppercase tracking-widest text-blue-400/60 font-bold whitespace-nowrap pt-0.5">
                              Linked Transfer
                            </div>
                          </div>
                        </div>
                      )}

                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>


    </div>
    <Modal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} title="Mastering the Ledger">
      <div className="space-y-6 text-sm text-gray-300">
        <div>
          <h3 className="text-white font-bold text-lg mb-2">Smart Matching</h3>
          <p>The ledger learns from your habits. If you regularly tag "AMZN MKTPLACE" as "Shopping", the system will start suggesting this category automatically. You can click "Remember this" to let the system auto-categorize it next time.</p>
        </div>
        <div>
          <h3 className="text-white font-bold text-lg mb-2">Splitting Transactions</h3>
          <p>Did you buy groceries and a gift at the same store? You can split a single transaction into multiple categories. The original amount remains as the "parent" so your bank records stay accurate.</p>
        </div>
        <div>
          <h3 className="text-white font-bold text-lg mb-2">Linking Transfers</h3>
          <p>If you made a large deposit (like $1,000) meant to cover several bills, you can use the Link tool to tie that single transfer to multiple expenses, helping you track exactly where that money was spent.</p>
        </div>
      </div>
    </Modal>

    <Modal isOpen={!!activeSplitTx} onClose={() => setActiveSplitTx(null)} title="Split Transaction">
      {activeSplitTx && (
        <div className="space-y-4">
           <p className="text-secondary text-sm">Original Amount: <span className="text-white font-bold"><Price amountCents={activeSplitTx.amountCents} /></span></p>
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                 <label className="text-xs font-bold uppercase tracking-widest text-secondary block mb-2">Split 1 Amount</label>
                 <CurrencyInput valueCents={split1Cents} onChangeCents={setSplit1Cents} placeholder="Enter amount" className="bg-white/5 border-white/10" />
                 <input value={split1Desc} onChange={e => setSplit1Desc(e.target.value)} placeholder="Description" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm" />
              </div>
              <div className="space-y-2">
                 <label className="text-xs font-bold uppercase tracking-widest text-secondary block mb-2">Split 2 Amount</label>
                 <CurrencyInput valueCents={split2Cents} onChangeCents={setSplit2Cents} placeholder="Enter amount" className="bg-white/5 border-white/10" />
                 <input value={split2Desc} onChange={e => setSplit2Desc(e.target.value)} placeholder="Description" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm" />
              </div>
           </div>
           <button onClick={handleExecuteSplit} className="w-full bg-primary text-black font-bold uppercase tracking-widest py-3 rounded-xl mt-4 max-w-[200px] mx-auto block">Execute Split</button>
         </div>
      )}
    </Modal>

    <Modal isOpen={!!activeLinkTx} onClose={() => setActiveLinkTx(null)} title="Link to Transfer/Bill">
      {activeLinkTx && (
        <div className="space-y-4 text-center">
           <p className="text-secondary text-sm mb-6">Select a parent transfer or bill to link this transaction to. This allows the system to accurately track multi-payment scenarios.</p>
           <select className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white mb-6">
              <option value="">-- Select Parent Transaction --</option>
              {(transactions || []).slice(0, 10).map((t:any) => <option key={t.id} value={t.id}>{t.description} ({t.amountCents/100})</option>)}
           </select>
           <button onClick={() => { setActiveLinkTx(null); globalMutate(); }} className="bg-primary text-black font-bold uppercase tracking-widest py-3 px-8 rounded-xl">Link Items</button>
         </div>
      )}
    </Modal>

    <Modal isOpen={isAddTxOpen} onClose={() => setIsAddTxOpen(false)} title="Add Transaction">
      <form onSubmit={handleCreateTx} className="space-y-4">
        <div>
          <label className="text-xs uppercase tracking-widest text-secondary block mb-1">Description</label>
          <input 
            type="text" 
            value={txForm.description} 
            onChange={e => setTxForm({...txForm, description: e.target.value})} 
            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary" 
            required 
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs uppercase tracking-widest text-secondary block mb-1">Amount</label>
            <CurrencyInput 
              valueCents={txForm.amountCents} 
              onChangeCents={cents => setTxForm({...txForm, amountCents: cents})} 
              required 
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-secondary block mb-1">Date</label>
            <input 
              type="date" 
              value={txForm.transactionDate} 
              onChange={e => setTxForm({...txForm, transactionDate: e.target.value})} 
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary" 
              required 
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs uppercase tracking-widest text-secondary block mb-1">Account</label>
            <SearchableSelect 
              options={accounts.map((a: any) => ({ value: a.id, label: a.name }))}
              value={txForm.accountId} 
              onChange={val => setTxForm({...txForm, accountId: val})} 
              placeholder="Select Account..."
              onCreate={handleCreateAccount}
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-secondary block mb-1">Category</label>
            <SearchableSelect 
              options={categories.map((c: any) => ({ value: c.id, label: c.name }))}
              value={txForm.categoryId} 
              onChange={val => setTxForm({...txForm, categoryId: val})} 
              placeholder="Uncategorized..."
              onCreate={handleCreateCategory}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs uppercase tracking-widest text-secondary block mb-1">Confirmation Number</label>
            <input 
              type="text" 
              value={txForm.confirmationNumber} 
              onChange={e => setTxForm({...txForm, confirmationNumber: e.target.value})} 
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary" 
              placeholder="e.g. REF-12345"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-secondary block mb-1">Status</label>
            <select 
              value={txForm.status} 
              onChange={e => setTxForm({...txForm, status: e.target.value})} 
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary"
            >
              <option value="pending">Pending</option>
              <option value="reconciled">Reconciled</option>
              <option value="none">None</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs uppercase tracking-widest text-secondary block mb-1">Notes</label>
          <textarea 
            value={txForm.notes} 
            onChange={e => setTxForm({...txForm, notes: e.target.value})} 
            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary h-20 resize-none" 
            placeholder="Additional notes..."
          />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button type="button" onClick={() => setIsAddTxOpen(false)} className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition-colors">Cancel</button>
          <button type="submit" className="px-6 py-3 bg-primary text-black font-bold rounded-xl hover:brightness-110 transition-all">Add Transaction</button>
        </div>
      </form>
    </Modal>

    <Modal isOpen={!!editingTx} onClose={() => setEditingTx(null)} title="Edit Transaction">
      {editingTx && (
        <form onSubmit={handleUpdateTx} className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-widest text-secondary block mb-1">Description</label>
            <input 
              type="text" 
              value={txForm.description} 
              onChange={e => setTxForm({...txForm, description: e.target.value})} 
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary" 
              required 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase tracking-widest text-secondary block mb-1">Amount</label>
              <CurrencyInput 
                valueCents={txForm.amountCents} 
                onChangeCents={cents => setTxForm({...txForm, amountCents: cents})} 
                required 
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-secondary block mb-1">Date</label>
              <input 
                type="date" 
                value={txForm.transactionDate} 
                onChange={e => setTxForm({...txForm, transactionDate: e.target.value})} 
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary" 
                required 
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase tracking-widest text-secondary block mb-1">Account</label>
              <SearchableSelect 
                options={accounts.map((a: any) => ({ value: a.id, label: a.name }))}
                value={txForm.accountId} 
                onChange={val => setTxForm({...txForm, accountId: val})} 
                placeholder="Select Account..."
                onCreate={handleCreateAccount}
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-secondary block mb-1">Category</label>
              <SearchableSelect 
                options={categories.map((c: any) => ({ value: c.id, label: c.name }))}
                value={txForm.categoryId} 
                onChange={val => setTxForm({...txForm, categoryId: val})} 
                placeholder="Uncategorized..."
                onCreate={handleCreateCategory}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className={editingTx?.linkedTransactionId ? 'col-span-2' : ''}>
              <label className={`text-xs uppercase tracking-widest block mb-1 flex items-center gap-1.5 ${editingTx?.linkedTransactionId ? 'text-blue-400 font-black' : 'text-secondary'}`}>
                {editingTx?.linkedTransactionId && <Hash size={12} />}
                Confirmation Number{editingTx?.linkedTransactionId ? ' (Transfer)' : ''}
              </label>
              <input 
                type="text" 
                value={txForm.confirmationNumber} 
                onChange={e => setTxForm({...txForm, confirmationNumber: e.target.value})} 
                className={`w-full bg-black/40 border rounded-xl p-3 text-white focus:outline-none ${editingTx?.linkedTransactionId ? 'border-blue-500/40 focus:border-blue-400' : 'border-white/10 focus:border-primary'}`}
                placeholder="e.g. REF-12345"
              />
              {editingTx?.linkedTransactionId && (
                <p className="text-[10px] text-blue-400/70 mt-1">This transaction is linked to a transfer. Adding a confirmation number helps track the transfer.
                </p>
              )}
            </div>
            {!editingTx?.linkedTransactionId && (
            <div>
              <label className="text-xs uppercase tracking-widest text-secondary block mb-1">Status</label>
              <select 
                value={txForm.status} 
                onChange={e => setTxForm({...txForm, status: e.target.value})} 
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary"
              >
                <option value="pending">Pending</option>
                <option value="reconciled">Reconciled</option>
                <option value="none">None</option>
              </select>
            </div>
            )}
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-secondary block mb-1">Notes</label>
            <textarea 
              value={txForm.notes} 
              onChange={e => setTxForm({...txForm, notes: e.target.value})} 
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary h-20 resize-none" 
              placeholder="Additional notes..."
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={() => setEditingTx(null)} className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition-colors">Cancel</button>
            <button type="submit" className="px-6 py-3 bg-primary text-black font-bold rounded-xl hover:brightness-110 transition-all">Save Changes</button>
          </div>
        </form>
      )}
    </Modal>
    </>
  )
}
