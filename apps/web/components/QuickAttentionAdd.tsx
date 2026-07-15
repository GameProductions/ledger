import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApi } from '../hooks/useApi'
import { Flag, ShieldAlert, ArrowRightLeft, HandCoins, Copy, Trash2, Plus } from 'lucide-react'
import { getApiUrl } from '../utils/api'
import { TrackedExpenseList } from './TrackedExpenseList'
import { CurrencyInput } from './ui/CurrencyInput'
import { Checkbox } from './ui/Checkbox'

interface QuickAttentionAddProps {
  onAdded: () => void;
}

interface FormInstance {
  id: string;
  description: string;
  amountCents: number;
  attentionRequired: boolean;
  needsBalanceTransfer: boolean;
  transferTiming: string;
  isBorrowed: boolean;
  borrowSource: string;
  transactionDate: string;
  createdAt: string;
}

export const QuickAttentionAdd: React.FC<QuickAttentionAddProps> = ({ onAdded }) => {
  const { data: categories = [] } = (useApi('/api/financials/categories') as any)

  const createEmptyInstance = (): FormInstance => ({
    id: Math.random().toString(36).substr(2, 9),
    description: '',
    amountCents: 0,
    attentionRequired: false,
    needsBalanceTransfer: false,
    transferTiming: 'future',
    isBorrowed: false,
    borrowSource: '',
    transactionDate: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString().split('T')[0]
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
      const promises = validInstances.map(inst =>
        fetch(`${getApiUrl()}/api/tracked-expenses`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('ledger_token')}`,
            'x-household-id': localStorage.getItem('ledger_householdId') || ''
          },
          body: JSON.stringify({
            description: inst.description,
            amountCents: inst.amountCents,
            attentionRequired: inst.attentionRequired,
            needsBalanceTransfer: inst.needsBalanceTransfer,
            transferTiming: inst.needsBalanceTransfer ? inst.transferTiming : null,
            isBorrowed: inst.isBorrowed,
            borrowSource: inst.isBorrowed ? inst.borrowSource : null,
            transactionDate: new Date(inst.transactionDate).toISOString().split('T')[0],
          })
        })
      );

      await Promise.all(promises);

      setInstances([createEmptyInstance()]);
      setRefreshTrigger(prev => prev + 1);
      onAdded();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card mb-6 border-l-4 border-l-orange-500 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-3xl rounded-full"></div>
      
      <div className="flex items-center justify-between gap-2 mb-3 relative z-20">
        <div className="flex items-center gap-2">
          <Flag className="text-orange-500" size={18} />
          <h3 className="font-bold text-white tracking-widest text-sm text-orange-100">Add Tracked Expense</h3>
        </div>
        <div className="flex items-center gap-2">
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
                    <div className="bg-orange-500/5 border border-orange-500/10 rounded-xl p-4 mt-2 space-y-4">
                      
                      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer flex-1">
                          <Checkbox 
                            checked={inst.needsBalanceTransfer} 
                            onChange={v => handleUpdate(index, { needsBalanceTransfer: v })}
                            iconClassName="text-orange-500"
                          />
                          <span className="text-sm flex items-center gap-1.5 text-orange-200">
                            <ArrowRightLeft size={16} /> Requires Balance Transfer
                          </span>
                        </label>
                        
                        {inst.needsBalanceTransfer && (
                          <select 
                            value={inst.transferTiming} 
                            onChange={e => handleUpdate(index, { transferTiming: e.target.value })}
                            className="bg-black/50 border border-orange-500/20 rounded-lg p-2 text-sm text-white w-full md:w-auto outline-none"
                          >
                            <option value="same_day">Must do Same Day</option>
                            <option value="future">Can do in Future</option>
                          </select>
                        )}
                      </div>

                      <div className="w-full h-px bg-white/5"></div>

                      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer flex-1">
                          <Checkbox 
                            checked={inst.isBorrowed} 
                            onChange={v => handleUpdate(index, { isBorrowed: v })}
                            iconClassName="text-orange-500"
                          />
                          <span className="text-sm flex items-center gap-1.5 text-orange-200">
                            <HandCoins size={16} /> Funds were Borrowed
                          </span>
                        </label>
                        
                        {inst.isBorrowed && (
                          <input 
                            type="text" 
                            placeholder="Who/what to reimburse?"
                            value={inst.borrowSource}
                            onChange={e => handleUpdate(index, { borrowSource: e.target.value })}
                            className="bg-black/50 border border-orange-500/20 rounded-lg p-2 text-sm text-white w-full md:w-1/2 outline-none"
                          />
                        )}
                      </div>

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <div className="text-xs text-secondary font-semibold">
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
