import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useApi } from '../hooks/useApi'
import { Price } from './Price'
import { Search, Filter, HelpCircle, ChevronDown, ChevronUp, Link as LinkIcon, Check, SplitSquareVertical } from 'lucide-react'
import { Modal } from './ui/Modal'

export const TransactionLedger: React.FC = () => {
  const { token, householdId } = useAuth()
  
  // Filtering & Sorting State
  const [q, setQ] = useState('')
  const [sortBy, setSortBy] = useState('date') // 'date' | 'amount'
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc')
  const [limit, setLimit] = useState(50)
  
  // Data Fetching
  const { data: transactions, mutate: mutateTx } = useApi(`/api/financials/transactions?q=${q}&sort_by=${sortBy}&sort_dir=${sortDir}&limit=${limit}`)
  const { data: accounts } = useApi('/api/financials/accounts')
  const { data: categories } = useApi('/api/financials/categories')

  // Selection & Details State
  const [selectedIds, setSelectedIds] = useState<string[]>([])
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
        if (!tx.category_id && !suggestions[tx.id]) {
          try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/financials/transactions/infer`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'x-household-id': householdId || ''
              },
              body: JSON.stringify({ raw_description: tx.description })
            });
            const data = await res.json();
            if (data.suggestions) {
              setSuggestions(prev => ({ ...prev, [tx.id]: data.suggestions }));
            }
          } catch(e) {}
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
      .reduce((sum: number, t: any) => sum + (t.amount_cents || 0), 0)
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

  const bulkReconcile = async (reconciled: boolean) => {
    await fetch(`${import.meta.env.VITE_API_URL}/api/financials/transactions/bulk-reconcile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-household-id': householdId || ''
      },
      body: JSON.stringify({ transaction_ids: selectedIds, reconciled })
    })
    mutateTx()
    setSelectedIds([])
  }

  return (
    <div className="card w-full" id="transaction-ledger">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          📖 Transaction Ledger
          <button onClick={() => setIsHelpOpen(true)} className="p-1 hover:bg-white/10 rounded-full transition-colors text-primary">
            <HelpCircle size={16} />
          </button>
        </h2>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search descriptions..." 
              className="pl-9 pr-4 py-1.5 text-sm bg-black/40 border border-white/10 rounded-full focus:outline-none focus:border-primary"
            />
          </div>
          <button className="p-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10">
            <Filter size={16} />
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
              transactions.map((tx: any) => (
              <React.Fragment key={tx.id}>
                <tr className={`border-b border-white/5 hover:bg-white/5 transition-colors ${selectedIds.includes(tx.id) ? 'bg-primary/5' : ''}`}>
                  <td className="py-2 pl-2">
                    <input type="checkbox" checked={selectedIds.includes(tx.id)} onChange={() => toggleSelect(tx.id)} />
                  </td>
                  <td className="py-2 opacity-80 whitespace-nowrap">{tx.transaction_date}</td>
                  <td className="py-2 font-medium">{tx.description}</td>
                  <td className="py-2">
                    {tx.category_id ? (
                      <span className="px-2 py-0.5 bg-white/10 rounded-full text-xs opacity-80">
                        {categories?.find((c:any) => c.id === tx.category_id)?.name || 'Unknown'}
                      </span>
                    ) : suggestions[tx.id] ? (
                      <div className="flex items-center gap-2">
                         <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-full text-xs flex items-center gap-1">
                           ✨ {categories?.find((c:any) => c.id === suggestions[tx.id].category_id)?.name || 'Suggested'}
                         </span>
                         <button 
                           onClick={() => {/* Mock confirm & remember */ mutateTx()}}
                           className="text-[10px] bg-orange-500 text-black px-2 rounded-full font-bold uppercase tracking-widest hover:scale-105"
                         >
                           Confirm
                         </button>
                      </div>
                    ) : (
                      <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 rounded-full text-xs">Uncategorized</span>
                    )}
                  </td>
                  <td className={`py-2 text-right font-bold ${tx.amount_cents > 0 ? 'text-emerald-400' : 'text-white'}`}>
                    <Price cents={Math.abs(tx.amount_cents)} />
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
                          <div className="mt-3 flex gap-2">
                            <button onClick={() => setActiveSplitTx(tx)} className="flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded hover:bg-white/20 transition">
                              <SplitSquareVertical size={14} /> Split Transaction
                            </button>
                            <button onClick={() => setActiveLinkTx(tx)} className="flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded hover:bg-white/20 transition">
                              <LinkIcon size={14} /> Link to Bill/Transfer
                            </button>
                          </div>
                        </div>
                        <div>
                          <p className="mb-1 uppercase tracking-wider font-bold opacity-50">Audit History</p>
                          <ul className="space-y-1">
                            <li>Created: {tx.created_at || 'N/A'}</li>
                            <li>Status: {tx.reconciliation_status}</li>
                            {tx.owner_id && <li>Owner ID: {tx.owner_id}</li>}
                          </ul>
                          {tx.notes && (
                            <div className="mt-2 bg-yellow-500/10 border border-yellow-500/20 p-2 rounded text-yellow-500">
                              Note: {tx.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

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
                <Price cents={selectionSumCents} />
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
                onClick={() => setSelectedIds([])}
                className="px-4 py-2 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-colors"
              >
                Clear Selection
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
             <p className="text-secondary text-sm">Original Amount: <span className="text-white font-bold"><Price cents={activeSplitTx.amount_cents} /></span></p>
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
             <button onClick={() => { setActiveSplitTx(null); mutateTx(); }} className="w-full bg-primary text-black font-bold uppercase tracking-widest py-3 rounded-xl mt-4 max-w-[200px] mx-auto block">Execute Split</button>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!activeLinkTx} onClose={() => setActiveLinkTx(null)} title="Link to Transfer/Bill">
        {activeLinkTx && (
          <div className="space-y-4 text-center">
             <p className="text-secondary text-sm mb-6">Select a parent transfer or bill to link this transaction to. This allows the system to accurately track multi-payment scenarios.</p>
             <select className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white mb-6">
                <option value="">-- Select Parent Transaction --</option>
                {transactions?.slice(0, 10).map((t:any) => <option key={t.id} value={t.id}>{t.description} ({t.amount_cents/100})</option>)}
             </select>
             <button onClick={() => { setActiveLinkTx(null); mutateTx(); }} className="bg-primary text-black font-bold uppercase tracking-widest py-3 px-8 rounded-xl">Link Items</button>
          </div>
        )}
      </Modal>
    </div>
  )
}
