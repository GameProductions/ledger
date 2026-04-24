import React, { useState, useMemo } from 'react'
import { useCurrency } from '../context/CurrencyContext'
import { motion, AnimatePresence } from 'framer-motion'
import { useApi } from '../hooks/useApi'
import { getApiUrl } from '../utils/api'
import { Price } from './Price'
import { Trash2, Edit3, Send, CheckSquare, Square, Save, X, Calendar, Tag, CreditCard, ChevronRight } from 'lucide-react'
import { Modal } from './ui/Modal'

interface TrackedExpenseListProps {
  refreshTrigger?: number
}

export const TrackedExpenseList: React.FC<TrackedExpenseListProps> = ({ refreshTrigger }) => {
  const { data: tracked = [], mutate } = useApi('/api/tracked-expenses')
  const { data: accounts = [] } = useApi('/api/financials/accounts')
  const { data: categories = [] } = useApi('/api/financials/categories')
  const { symbol, formatPrice } = useCurrency()

  React.useEffect(() => {
    if (refreshTrigger) mutate()
  }, [refreshTrigger, mutate])

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false)
  const [promoteDetails, setPromoteDetails] = useState({
    account_id: '',
    category_id: '',
    transaction_date: new Date().toISOString().split('T')[0],
    status: 'paid'
  })

  // Single Item Edit State
  const [editForm, setEditForm] = useState<any>(null)

  // Bulk Edit State
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false)
  const [bulkUpdates, setBulkUpdates] = useState<any>({})

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

  const handleDelete = async (ids: string[]) => {
    if (!confirm(`Are you sure you want to delete ${ids.length} item(s)?`)) return;
    
    const res = await fetch(`${getApiUrl()}/api/tracked-expenses/bulk`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('ledger_token')}`,
        'x-household-id': localStorage.getItem('ledger_householdId') || ''
      },
      body: JSON.stringify({ ids })
    })
    if (res.ok) {
      mutate()
      setSelectedIds([])
    }
  }

  const handlePromote = async () => {
    const res = await fetch(`${getApiUrl()}/api/tracked-expenses/promote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('ledger_token')}`,
        'x-household-id': localStorage.getItem('ledger_householdId') || ''
      },
      body: JSON.stringify({
        ids: selectedIds,
        transaction_details: promoteDetails
      })
    })
    if (res.ok) {
      mutate()
      setSelectedIds([])
      setIsPromoteModalOpen(false)
    }
  }

  const handleUpdate = async (id: string, updates: any) => {
    const res = await fetch(`${getApiUrl()}/api/tracked-expenses/bulk`, {
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
    })
    if (res.ok) {
      mutate()
      setEditingId(null)
      setEditForm(null)
    }
  }

  const handleBulkUpdate = async () => {
    const res = await fetch(`${getApiUrl()}/api/tracked-expenses/bulk`, {
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
    })
    if (res.ok) {
      mutate()
      setIsBulkEditOpen(false)
      setBulkUpdates({})
    }
  }

  if (tracked.length === 0) return null;

  return (
    <div className="mt-4 border-t border-white/5 pt-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h4 className="text-xs font-black uppercase tracking-[0.2em] text-orange-200/60 flex items-center gap-2">
            <ChevronRight size={14} className="text-orange-500" />
            Pending Tracked Expenses ({tracked.length})
            <span className="ml-2 px-2 py-0.5 bg-orange-500/10 rounded-full text-orange-400 border border-orange-500/10">
              {formatPrice(tracked.reduce((sum: number, item: any) => sum + (item.amountCents ?? item.amount_cents ?? 0), 0))}
            </span>
          </h4>
          <button 
            onClick={toggleSelectAll}
            className="text-[10px] font-black uppercase tracking-widest text-secondary hover:text-primary transition-colors"
          >
            {selectedIds.length === tracked.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>
        
        <AnimatePresence>
          {selectedIds.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 bg-orange-500/5 border border-orange-500/20 rounded-xl p-1 pr-3"
            >
              <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-orange-200/60 border-r border-white/10 mr-1">
                Selected: {formatPrice(selectedIds.reduce((sum: number, id: string) => {
                  const item = tracked.find((t: any) => t.id === id)
                  return sum + (item?.amountCents ?? item?.amount_cents ?? 0)
                }, 0))}
              </div>
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => setIsBulkEditOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors"
                >
                  <Edit3 size={12} /> Bulk Edit
                </button>
                <button 
                  onClick={() => setIsPromoteModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20"
                >
                  <Send size={12} /> Move to Ledger ({selectedIds.length})
                </button>
              </div>
              <div className="w-px h-4 bg-white/10 mx-1"></div>
              <button 
                onClick={() => handleDelete(selectedIds)}
                className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Delete Selected"
              >
                <Trash2 size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {tracked.map((item: any) => (
          <motion.div 
            key={item.id}
            layout
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={`group relative flex flex-col p-4 rounded-2xl border transition-all ${selectedIds.includes(item.id) ? 'bg-orange-500/10 border-orange-500/40' : 'bg-black/40 border-white/5 hover:border-white/20'}`}
          >
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
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-orange-200/50 font-black text-xs">{symbol}</span>
                      <input 
                        type="number" step="0.01"
                        value={(editForm?.amount_cents || 0) / 100} 
                        onChange={e => setEditForm({...editForm, amount_cents: Math.round(parseFloat(e.target.value) * 100)})}
                        className="w-full bg-black/60 border border-white/10 rounded-xl p-2 pl-6 text-sm text-white focus:border-orange-500/50 outline-none"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setEditingId(null)} className="p-2 text-secondary hover:text-white transition-colors"><X size={16} /></button>
                  <button onClick={() => handleUpdate(item.id, editForm)} className="p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"><Save size={16} /></button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => toggleSelect(item.id)}
                    className="text-secondary hover:text-orange-500 transition-colors"
                  >
                    {selectedIds.includes(item.id) ? <CheckSquare size={18} className="text-orange-500" /> : <Square size={18} />}
                  </button>
                  <div>
                    <div className="text-sm font-bold text-white group-hover:text-orange-100 transition-colors">{item.description}</div>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="text-[10px] uppercase tracking-widest text-secondary font-black flex items-center gap-1">
                        <Calendar size={10} /> {new Date(item.createdAt).toLocaleDateString()}
                      </div>
                      {item.attentionRequired && (
                        <div className="text-[10px] uppercase tracking-widest text-orange-400 font-black flex items-center gap-1">
                          <Tag size={10} /> Needs Attention
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <Price amountCents={item.amountCents ?? item.amount_cents} className="text-lg font-black text-orange-200" />
                    <div className="text-[9px] uppercase font-black tracking-widest text-secondary mt-0.5">
                      Running: {formatPrice(tracked.slice(0, tracked.indexOf(item) + 1).reduce((s: number, i: any) => s + (i.amountCents ?? i.amount_cents ?? 0), 0))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                      onClick={() => {
                        setEditingId(item.id)
                        setEditForm({
                          description: item.description,
                          amount_cents: item.amountCents,
                          notes: item.notes
                        })
                      }}
                      className="p-2 hover:bg-white/10 rounded-xl transition-all text-secondary hover:text-white"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button 
                      onClick={() => handleDelete([item.id])}
                      className="p-2 hover:bg-red-500/10 rounded-xl transition-all text-secondary hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Move to Ledger Modal */}
      <Modal isOpen={isPromoteModalOpen} onClose={() => setIsPromoteModalOpen(false)} title="Add to Main Ledger">
        <div className="space-y-6 p-1">
          <div className="bg-orange-500/5 border border-orange-500/10 rounded-2xl p-4 mb-4">
            <p className="text-sm text-orange-200/80 font-medium">Moving {selectedIds.length} items to the transaction ledger.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase font-black tracking-widest text-secondary mb-2 flex items-center gap-1.5">
                <CreditCard size={14} className="text-orange-500" /> Select Account
              </label>
              <select 
                value={promoteDetails.account_id}
                onChange={e => setPromoteDetails({...promoteDetails, account_id: e.target.value})}
                className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-orange-500/50 outline-none appearance-none"
              >
                <option value="">Choose Account...</option>
                {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase font-black tracking-widest text-secondary mb-2 flex items-center gap-1.5">
                <Tag size={14} className="text-orange-500" /> Select Category
              </label>
              <select 
                value={promoteDetails.category_id}
                onChange={e => setPromoteDetails({...promoteDetails, category_id: e.target.value})}
                className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-orange-500/50 outline-none appearance-none"
              >
                <option value="">Choose Category...</option>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase font-black tracking-widest text-secondary mb-2 flex items-center gap-1.5">
                <Calendar size={14} className="text-orange-500" /> Effective Date
              </label>
              <input 
                type="date"
                value={promoteDetails.transaction_date}
                onChange={e => setPromoteDetails({...promoteDetails, transaction_date: e.target.value})}
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
                    onClick={() => setPromoteDetails({...promoteDetails, status: s})}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${promoteDetails.status === s ? 'bg-orange-500 border-orange-400 text-white' : 'bg-black/40 border-white/10 text-secondary'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button 
            onClick={handlePromote}
            disabled={!promoteDetails.account_id}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest py-4 rounded-2xl transition-all shadow-xl shadow-orange-500/20 flex items-center justify-center gap-2"
          >
            <Send size={18} />
            Commit to Ledger
          </button>
        </div>
      </Modal>

      {/* Bulk Edit Modal */}
      <Modal isOpen={isBulkEditOpen} onClose={() => setIsBulkEditOpen(false)} title="Bulk Edit Tracked Expenses">
        <div className="space-y-6 p-1">
          <p className="text-xs text-secondary italic mb-4">Editing {selectedIds.length} items. Leave fields blank to keep existing values.</p>
          
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-xs uppercase font-black tracking-widest text-secondary mb-2 block">New Amount (Optional)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-200/50 font-black text-sm">{symbol}</span>
                <input 
                  type="number" step="0.01" 
                  placeholder="0.00"
                  onChange={e => setBulkUpdates({...bulkUpdates, amount_cents: Math.round(parseFloat(e.target.value) * 100)})}
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-3 pl-8 text-sm text-white focus:border-orange-500/50 outline-none"
                />
              </div>
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
          </div>

          <button 
            onClick={handleBulkUpdate}
            className="w-full bg-white/10 hover:bg-white/20 text-white font-black uppercase tracking-widest py-4 rounded-2xl transition-all border border-white/10"
          >
            Apply Bulk Updates
          </button>
        </div>
      </Modal>
    </div>
  )
}
