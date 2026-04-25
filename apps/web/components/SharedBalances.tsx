import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useApi } from '../hooks/useApi'
import { getApiUrl } from '../utils/api'
import { ArrowRightLeft, Plus, Trash2, Handshake, Users } from 'lucide-react'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'

interface SharedBalance {
  id: string
  from_user_id: string
  to_user_id: string
  amount_cents: number
  transaction_id: string | null
  from_display_name: string
  to_display_name: string
  from_avatar_url: string | null
  to_avatar_url: string | null
  transaction_description: string | null
}

interface BalanceSummary {
  from_user_id: string
  to_user_id: string
  net_cents: number
  from_name: string
  to_name: string
  from_avatar: string | null
  to_avatar: string | null
}

export default function SharedBalances() {
  const { token, user, householdId } = useAuth()
  const { showToast, showConfirm } = useToast()
  const { data: balances = [], mutate: mutateBalances } = useApi('/api/financials/shared-balances')
  const { data: summary = [], mutate: mutateSummary } = useApi('/api/financials/shared-balances/summary')
  const { data: members = [] } = useApi(householdId ? `/api/user/households/${householdId}/members` : null)
  
  const [showAddModal, setShowAddModal] = useState(false)
  const [newIOU, setNewIOU] = useState({ to_user_id: '', amount: '', description: '' })
  const [adding, setAdding] = useState(false)

  const createIOU = async () => {
    if (!newIOU.to_user_id || !newIOU.amount) return
    setAdding(true)
    try {
      const apiUrl = getApiUrl()
      const res = await fetch(`${apiUrl}/api/financials/shared-balances`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-household-id': householdId || ''
        },
        body: JSON.stringify({
          to_user_id: newIOU.to_user_id,
          amount_cents: Math.round(parseFloat(newIOU.amount) * 100),
          description: newIOU.description || undefined
        })
      })
      if (res.ok) {
        showToast('IOU recorded', 'success')
        setShowAddModal(false)
        setNewIOU({ to_user_id: '', amount: '', description: '' })
        mutateBalances()
        mutateSummary()
      } else {
        showToast('Failed to record IOU', 'error')
      }
    } catch (err) {
      showToast('Error creating IOU', 'error')
    } finally {
      setAdding(false)
    }
  }

  const deleteBalance = async (id: string) => {
    const confirmed = await showConfirm('Delete this shared balance entry?', 'Delete IOU')
    if (!confirmed) return
    try {
      const apiUrl = getApiUrl()
      await fetch(`${apiUrl}/api/financials/shared-balances/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-household-id': householdId || ''
        }
      })
      showToast('Entry deleted', 'success')
      mutateBalances()
      mutateSummary()
    } catch (err) {
      showToast('Failed to delete', 'error')
    }
  }

  const settleWith = async (withUserId: string) => {
    const confirmed = await showConfirm('This will mark all debts between you and this person as settled.', 'Settle Up')
    if (!confirmed) return
    try {
      const apiUrl = getApiUrl()
      const res = await fetch(`${apiUrl}/api/financials/shared-balances/settle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-household-id': householdId || ''
        },
        body: JSON.stringify({ with_user_id: withUserId })
      })
      if (res.ok) {
        showToast('All settled!', 'success')
        mutateBalances()
        mutateSummary()
      }
    } catch (err) {
      showToast('Settlement failed', 'error')
    }
  }

  const otherMembers = (members || []).filter((m: any) => m.id !== user?.id)
  const summaryList = Array.isArray(summary) ? summary : []
  const balanceList = Array.isArray(balances) ? balances : []

  return (
    <section className="card" style={{ gridColumn: 'span 2' }}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <ArrowRightLeft className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Shared Balances</h3>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Track IOUs and settle debts with household members</p>
          </div>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500 text-white font-bold text-sm hover:bg-violet-600 transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)]"
        >
          <Plus className="w-4 h-4" /> Record IOU
        </button>
      </div>

      {/* Net Summary */}
      {summaryList.length > 0 && (
        <div className="mb-6 space-y-3">
          <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Net Balances</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {summaryList.map((s: BalanceSummary, idx: number) => {
              const isOwed = s.from_user_id === user?.id
              return (
                <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-violet-500/20 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      <img src={s.from_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${s.from_user_id}`} className="w-8 h-8 rounded-lg border-2 border-black" />
                      <img src={s.to_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${s.to_user_id}`} className="w-8 h-8 rounded-lg border-2 border-black" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">
                        {s.from_name} → {s.to_name}
                      </p>
                      <p className={`text-xs font-black uppercase tracking-widest ${isOwed ? 'text-red-400' : 'text-emerald-400'}`}>
                        {isOwed ? 'You owe' : 'Owes you'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-lg font-black ${isOwed ? 'text-red-400' : 'text-emerald-400'}`}>
                      ${(Math.abs(s.net_cents) / 100).toFixed(2)}
                    </span>
                    <button
                      onClick={() => settleWith(isOwed ? s.to_user_id : s.from_user_id)}
                      className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all"
                      title="Settle Up"
                    >
                      <Handshake className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* History */}
      <div className="space-y-2">
        <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">History</h4>
        {balanceList.length === 0 ? (
          <div className="py-12 text-center">
            <Users className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-500 font-bold">No shared balances yet</p>
            <p className="text-xs text-slate-600 mt-1">Record an IOU when someone covers a shared expense</p>
          </div>
        ) : (
          <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar space-y-2">
            {balanceList.map((b: SharedBalance) => (
              <div key={b.id} className="flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-white/10 transition-all group">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    <img src={b.from_avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${b.from_user_id}`} className="w-7 h-7 rounded-lg border-2 border-black" />
                    <img src={b.to_avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${b.to_user_id}`} className="w-7 h-7 rounded-lg border-2 border-black" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">
                      {b.from_display_name} → {b.to_display_name}
                    </p>
                    {b.transaction_description && (
                      <p className="text-[10px] text-slate-500 font-mono truncate max-w-[200px]">
                        {b.transaction_description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black text-violet-400">
                    ${(b.amount_cents / 100).toFixed(2)}
                  </span>
                  <button
                    onClick={() => deleteBalance(b.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-red-500/60 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add IOU Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Record an IOU"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={createIOU} disabled={adding || !newIOU.to_user_id || !newIOU.amount}>
              {adding ? 'Recording...' : 'Record IOU'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block">Who do you owe?</label>
            <select
              value={newIOU.to_user_id}
              onChange={(e) => setNewIOU({ ...newIOU, to_user_id: e.target.value })}
              className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-sm font-bold outline-none focus:border-violet-500/50 transition-all"
            >
              <option value="">Select a member...</option>
              {otherMembers.map((m: any) => (
                <option key={m.id} value={m.id}>{m.display_name || m.email}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block">Amount ($)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={newIOU.amount}
              onChange={(e) => setNewIOU({ ...newIOU, amount: e.target.value })}
              placeholder="0.00"
              className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-sm font-bold outline-none focus:border-violet-500/50 transition-all"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block">Description (optional)</label>
            <input
              type="text"
              value={newIOU.description}
              onChange={(e) => setNewIOU({ ...newIOU, description: e.target.value })}
              placeholder="e.g., Dinner last Thursday"
              className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-sm font-bold outline-none focus:border-violet-500/50 transition-all"
            />
          </div>
        </div>
      </Modal>
    </section>
  )
}
