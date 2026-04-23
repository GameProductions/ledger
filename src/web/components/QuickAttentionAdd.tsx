import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApi } from '../hooks/useApi'
import { Flag, ShieldAlert, ArrowRightLeft, HandCoins } from 'lucide-react'

interface QuickAttentionAddProps {
  onAdded: () => void;
}

export const QuickAttentionAdd: React.FC<QuickAttentionAddProps> = ({ onAdded }) => {
  const { data: categories = [] } = useApi('/api/financials/categories')

  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [attentionRequired, setAttentionRequired] = useState(false)
  const [needsBalanceTransfer, setNeedsBalanceTransfer] = useState(false)
  const [transferTiming, setTransferTiming] = useState('future')
  const [isBorrowed, setIsBorrowed] = useState(false)
  const [borrowSource, setBorrowSource] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    await fetch(`${import.meta.env.VITE_API_URL}/api/financials/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('ledger_token')}`,
        'x-household-id': localStorage.getItem('ledger_householdId') || ''
      },
      body: JSON.stringify({
        description,
        amount_cents: Math.round(parseFloat(amount) * 100),
        category_id: categoryId || undefined,
        attention_required: attentionRequired,
        needs_balance_transfer: needsBalanceTransfer,
        transfer_timing: needsBalanceTransfer ? transferTiming : null,
        is_borrowed: isBorrowed,
        borrow_source: isBorrowed ? borrowSource : null,
      })
    })

    setLoading(false)
    setDescription('')
    setAmount('')
    setCategoryId('')
    setAttentionRequired(false)
    setNeedsBalanceTransfer(false)
    setIsBorrowed(false)
    setBorrowSource('')
    onAdded()
  }

  return (
    <div className="card mb-6 border-l-4 border-l-orange-500 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-3xl rounded-full"></div>
      
      <div className="flex items-center gap-2 mb-4">
        <Flag className="text-orange-500" size={18} />
        <h3 className="font-bold text-white uppercase tracking-widest text-sm text-orange-100">Add Tracked Expense</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs uppercase tracking-widest text-secondary mb-1 flex">Amount</label>
            <input 
              type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="0.00" required 
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-orange-500/50 transition-colors"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs uppercase tracking-widest text-secondary mb-1 flex">Description</label>
            <input 
              type="text" value={description} onChange={e => setDescription(e.target.value)}
              placeholder="What was this for?" required 
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-orange-500/50 transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 py-2 border-y border-white/5">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input 
              type="checkbox" 
              checked={attentionRequired} 
              onChange={e => setAttentionRequired(e.target.checked)} 
              className="w-4 h-4 rounded text-orange-500 focus:ring-0 focus:ring-offset-0 bg-black border-white/20"
            />
            <span className="text-sm font-bold opacity-80 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
              <ShieldAlert size={14} className={attentionRequired ? "text-orange-400" : ""} />
              Flag for Future Attention
            </span>
          </label>
        </div>

        <AnimatePresence>
          {attentionRequired && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-orange-500/5 border border-orange-500/10 rounded-xl p-4 space-y-4">
                
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer flex-1">
                    <input 
                      type="checkbox" 
                      checked={needsBalanceTransfer} 
                      onChange={e => setNeedsBalanceTransfer(e.target.checked)}
                    />
                    <span className="text-sm flex items-center gap-1.5 text-orange-200">
                      <ArrowRightLeft size={16} /> Requires Balance Transfer
                    </span>
                  </label>
                  
                  {needsBalanceTransfer && (
                    <select 
                      value={transferTiming} 
                      onChange={e => setTransferTiming(e.target.value)}
                      className="bg-black/50 border border-orange-500/20 rounded-lg p-2 text-sm text-white w-full md:w-auto"
                    >
                      <option value="same_day">Must do Same Day</option>
                      <option value="future">Can do in Future</option>
                    </select>
                  )}
                </div>

                <div className="w-full h-px bg-white/5"></div>

                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer flex-1">
                    <input 
                      type="checkbox" 
                      checked={isBorrowed} 
                      onChange={e => setIsBorrowed(e.target.checked)}
                    />
                    <span className="text-sm flex items-center gap-1.5 text-orange-200">
                      <HandCoins size={16} /> Funds were Borrowed
                    </span>
                  </label>
                  
                  {isBorrowed && (
                    <input 
                      type="text" 
                      placeholder="Who/what to reimburse?"
                      value={borrowSource}
                      onChange={e => setBorrowSource(e.target.value)}
                      className="bg-black/50 border border-orange-500/20 rounded-lg p-2 text-sm text-white w-full md:w-1/2"
                    />
                  )}
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-end pt-2">
          <button 
            type="submit" 
            disabled={loading}
            className="px-6 py-2.5 bg-white text-black font-black uppercase tracking-widest text-xs rounded-xl hover:scale-105 transition-transform"
          >
            {loading ? 'Adding...' : 'Save Transaction'}
          </button>
        </div>
      </form>
    </div>
  )
}
