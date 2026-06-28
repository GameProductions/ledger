import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useAuth } from '../context/AuthContext'
import { getApiUrl } from '../utils/api'
import { useApi, globalMutate } from '../hooks/useApi'
import { Price } from './Price'
import { useCurrency } from '../context/CurrencyContext'
import { Search, Filter, HelpCircle, ChevronDown, ChevronUp, Link as LinkIcon, Check, SplitSquareVertical, Flag, Plus, Trash2, Edit3, Save, X } from 'lucide-react'
import { Modal } from './ui/Modal'
import { CurrencyInput } from './ui/CurrencyInput'
import { QuickAttentionAdd } from './QuickAttentionAdd'

export const TransactionLedger: React.FC = () => {
  const { token, householdId } = useAuth()
  const { symbol } = useCurrency()
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

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<Record<string, any>>({})
  const [activeSplitTx, setActiveSplitTx] = useState<any>(null)
  const [activeLinkTx, setActiveLinkTx] = useState<any>(null)
  
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
                          body: JSON.stringify({ raw_description: tx.description })
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
      body: JSON.stringify({ accounted_for: true })
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

  return (
    <>
      <div className="card w-full relative overflow-hidden" id="transaction-ledger">
      
      <QuickAttentionAdd onAdded={() => globalMutate()} />

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
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
                <input type="checkbox" onChange={toggleSelectAll} checked={transactions && transactions.length > 0 && selectedIds.length === transactions?.length} />
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
              transactions.filter((tx: any) => showNeedsAttentionOnly ? tx.attentionRequired && !tx.accounted_for : true).map((tx: any) => (
              <React.Fragment key={tx.id}>
                <tr className={`border-b border-white/5 hover:bg-white/5 transition-colors ${selectedIds.includes(tx.id) ? 'bg-primary/5' : ''}`}>
                  <td className="py-2 pl-2">
                    <input type="checkbox" checked={selectedIds.includes(tx.id)} onChange={() => toggleSelect(tx.id)} />
                  </td>
                  <td className="py-2 opacity-80 whitespace-nowrap">{tx.transactionDate}</td>
                  <td className="py-2 font-medium flex items-center gap-2">
                    {tx.description}
                    {tx.attentionRequired && !tx.accounted_for && (
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
                          <p className="font-mono bg-black/50 p-2 rounded">{tx.raw_description || tx.description}</p>
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
                        <div>
                          <p className="mb-1 uppercase tracking-wider font-bold opacity-50">Audit History</p>
                          <ul className="space-y-1">
                            <li>Created: {tx.createdAt || 'N/A'}</li>
                            <li>Status: {tx.reconciliation_status}</li>
                            {tx.ownerId && <li>Owner ID: {tx.ownerId}</li>}
                          </ul>
                            {tx.notes && (
                              <div className="mt-2 bg-yellow-500/10 border border-yellow-500/20 p-2 rounded text-yellow-500">
                                Note: {tx.notes}
                              </div>
                            )}
                          </div>
                      </div>

                      {tx.attentionRequired && !tx.accounted_for && (
                        <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                           <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <h4 className="text-orange-400 font-bold uppercase tracking-widest text-xs flex items-center gap-1"><Flag size={12} /> Attention Required</h4>
                                {tx.needs_balance_transfer && <p className="text-sm">🔄 Balance Transfer timing: <span className="text-white font-bold">{tx.transfer_timing === 'same_day' ? 'Same Day' : 'Future'}</span></p>}
                                {tx.is_borrowed && <p className="text-sm">💸 Borrowed Funds Source: <span className="text-white font-bold">{tx.borrow_source || 'Not specified'}</span></p>}
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

                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {reduced ? (
        selectedIds.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-deep/90 backdrop-blur-xl border border-white/20 p-4 rounded-3xl shadow-2xl flex items-center gap-6 z-50">
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-widest opacity-60">Selection Sum ({selectedIds.length} items)</span>
              <span className={`text-xl font-bold ${selectionSumCents > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                <Price amountCents={selectionSumCents} />
              </span>
            </div>
            <div className="w-px h-8 bg-white/20"></div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => bulkReconcile(true)}
                className="px-4 py-2 bg-primary text-black font-bold rounded-xl hover:scale-105 transition-transform flex items-center gap-2"
              >
                <Check size={16} /> Mark Reconciled
              </button>
              <button 
                onClick={handleBulkDeleteTxs}
                className="px-4 py-2 bg-red-500/20 text-red-400 font-bold border border-red-500/30 rounded-xl hover:bg-red-500/35 transition-all flex items-center gap-2"
              >
                <Trash2 size={16} /> Delete Selected
              </button>
              <button 
                onClick={() => setSelectedIds([])}
                className="px-4 py-2 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-colors"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )
      ) : (
        <AnimatePresence>
          {selectedIds.length > 0 && (
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-deep/90 backdrop-blur-xl border border-white/20 p-4 rounded-3xl shadow-2xl flex items-center gap-6 z-50"
            >
              <div className="flex flex-col">
                <span className="text-xs uppercase tracking-widest opacity-60">Selection Sum ({selectedIds.length} items)</span>
                <span className={`text-xl font-bold ${selectionSumCents > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  <Price amountCents={selectionSumCents} />
                </span>
              </div>
              <div className="w-px h-8 bg-white/20"></div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => bulkReconcile(true)}
                  className="px-4 py-2 bg-primary text-black font-bold rounded-xl hover:scale-105 transition-transform flex items-center gap-2"
                >
                  <Check size={16} /> Mark Reconciled
                </button>
                <button 
                  onClick={handleBulkDeleteTxs}
                  className="px-4 py-2 bg-red-500/20 text-red-400 font-bold border border-red-500/30 rounded-xl hover:bg-red-500/35 transition-all flex items-center gap-2"
                >
                  <Trash2 size={16} /> Delete Selected
                </button>
                <button 
                  onClick={() => setSelectedIds([])}
                  className="px-4 py-2 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-colors"
                >
                  Clear Selection
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
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
              <div>
                 <label className="text-xs font-bold uppercase tracking-widest text-secondary block mb-2">Split 1 Amount</label>
                 <input type="number" placeholder="Enter amount" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white" />
              </div>
              <div>
                 <label className="text-xs font-bold uppercase tracking-widest text-secondary block mb-2">Split 2 Amount</label>
                 <input type="number" placeholder="Enter amount" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white" />
              </div>
           </div>
           <button onClick={() => { setActiveSplitTx(null); globalMutate(); }} className="w-full bg-primary text-black font-bold uppercase tracking-widest py-3 rounded-xl mt-4 max-w-[200px] mx-auto block">Execute Split</button>
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
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary font-black text-sm">{symbol}</span>
              <CurrencyInput 
                valueCents={txForm.amountCents} 
                onChangeCents={cents => setTxForm({...txForm, amountCents: cents})} 
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 pl-8 text-white focus:outline-none focus:border-primary" 
                required 
              />
            </div>
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
            <select 
              value={txForm.accountId} 
              onChange={e => setTxForm({...txForm, accountId: e.target.value})} 
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary"
              required
            >
              <option value="">-- Select Account --</option>
              {accounts.map((a: any) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-secondary block mb-1">Category</label>
            <select 
              value={txForm.categoryId} 
              onChange={e => setTxForm({...txForm, categoryId: e.target.value})} 
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary"
            >
              <option value="">-- Uncategorized --</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
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
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary font-black text-sm">{symbol}</span>
                <CurrencyInput 
                  valueCents={txForm.amountCents} 
                  onChangeCents={cents => setTxForm({...txForm, amountCents: cents})} 
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 pl-8 text-white focus:outline-none focus:border-primary" 
                  required 
                />
              </div>
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
              <select 
                value={txForm.accountId} 
                onChange={e => setTxForm({...txForm, accountId: e.target.value})} 
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary"
                required
              >
                <option value="">-- Select Account --</option>
                {accounts.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-secondary block mb-1">Category</label>
              <select 
                value={txForm.categoryId} 
                onChange={e => setTxForm({...txForm, categoryId: e.target.value})} 
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary"
              >
                <option value="">-- Uncategorized --</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
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
            <button type="button" onClick={() => setEditingTx(null)} className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition-colors">Cancel</button>
            <button type="submit" className="px-6 py-3 bg-primary text-black font-bold rounded-xl hover:brightness-110 transition-all">Save Changes</button>
          </div>
        </form>
      )}
    </Modal>
    </>
  )
}
