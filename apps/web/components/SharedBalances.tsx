import React, { useState, useEffect } from 'react'
import { InlineToast } from './ui/InlineToast'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useApi } from '../hooks/useApi'
import { getApiUrl } from '../utils/api'
import { ArrowRightLeft, Plus, Trash2, Handshake, Users } from 'lucide-react'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { CurrencyInput } from './ui/CurrencyInput'

interface SharedBalance {
  id: string
  fromUserId: string
  toUserId: string
  amountCents: number
  transactionId: string | null
  fromDisplayName: string
  toDisplayName: string
  fromAvatarUrl: string | null
  toAvatarUrl: string | null
  transactionDescription: string | null
}

interface BalanceSummary {
  fromUserId: string
  toUserId: string
  netCents: number
  fromName: string
  toName: string
  fromAvatar: string | null
  toAvatar: string | null
}

export default function SharedBalances() {
  const { token, user, householdId } = useAuth()
  const { showToast } = useToast()
  const { data: balances = [], mutate: mutateBalances } = (useApi('/api/financials/shared-balances') as any)
  const { data: summary = [], mutate: mutateSummary } = (useApi('/api/financials/shared-balances/summary') as any)
  const { data: members = [] } = (useApi(householdId ? `/api/user/households/${householdId}/members` : null) as any)
  
  const [showAddModal, setShowAddModal] = useState(false)
  const [newIOU, setNewIOU] = useState({ toUserId: '', amountCents: 0, description: '' })
  const [adding, setAdding] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [confirmSettleUserId, setConfirmSettleUserId] = useState<string | null>(null)

  const createIOU = async () => {
    if (!newIOU.toUserId || !newIOU.amountCents) return
    setAdding(true)
    try {
      const apiUrl = getApiUrl()
      const res = (await fetch(`${apiUrl}/api/financials/shared-balances`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'x-household-id': householdId || ''
              },
              body: JSON.stringify({
                toUserId: newIOU.toUserId,
                amountCents: newIOU.amountCents,
                description: newIOU.description || undefined
              })
            }) as any)
      if (res.ok) {
        showToast('IOU recorded', 'success')
        setShowAddModal(false)
        setNewIOU({ toUserId: '', amountCents: 0, description: '' })
        mutateBalances()
        mutateSummary()
      } else {
        showToast('Failed to record IOU', 'error')
      }
    } catch (err: any) {
      showToast('Error creating IOU', 'error')
    } finally {
      setAdding(false)
    }
  }

  const deleteBalance = async (id: string) => {
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
      setConfirmDeleteId(null)
      mutateBalances()
      mutateSummary()
    } catch (err: any) {
      showToast('Failed to delete', 'error')
    }
  }

  const settleWith = async (withUserId: string) => {
    try {
      const apiUrl = getApiUrl()
      const res = (await fetch(`${apiUrl}/api/financials/shared-balances/settle`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'x-household-id': householdId || ''
              },
              body: JSON.stringify({ withUserId: withUserId })
            }) as any)
      if (res.ok) {
        showToast('All settled!', 'success')
        setConfirmSettleUserId(null)
        mutateBalances()
        mutateSummary()
      }
    } catch (err: any) {
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
            <p className="text-xs text-secondary font-medium mt-1 pr-6">Keep track of informal debts and shared costs with other members of your household. You can record IOUs and mark them as settled when paid back.</p>
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
              const isOwed = s.fromUserId === user?.id
              return (
                <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-violet-500/20 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      <img src={s.fromAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${s.fromUserId}`} className="w-8 h-8 rounded-lg border-2 border-black" />
                      <img src={s.toAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${s.toUserId}`} className="w-8 h-8 rounded-lg border-2 border-black" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">
                        {s.fromName} → {s.toName}
                      </p>
                      <p className={`text-xs font-black uppercase tracking-widest ${isOwed ? 'text-red-400' : 'text-emerald-400'}`}>
                        {isOwed ? 'You owe' : 'Owes you'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-lg font-black ${isOwed ? 'text-red-400' : 'text-emerald-400'}`}>
                      ${(Math.abs(s.netCents) / 100).toFixed(2)}
                    </span>
                    {confirmSettleUserId === (isOwed ? s.toUserId : s.fromUserId) ? (
                      <InlineToast 
                        message="Settle up?" 
                        type="confirm" 
                        onConfirm={() => settleWith(isOwed ? s.toUserId : s.fromUserId)} 
                        onCancel={() => setConfirmSettleUserId(null)} 
                      />
                    ) : (
                      <button
                        onClick={() => setConfirmSettleUserId(isOwed ? s.toUserId : s.fromUserId)}
                        className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all"
                        title="Settle Up"
                      >
                        <Handshake className="w-4 h-4" />
                      </button>
                    )}
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
                    <img src={b.fromAvatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${b.fromUserId}`} className="w-7 h-7 rounded-lg border-2 border-black" />
                    <img src={b.toAvatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${b.toUserId}`} className="w-7 h-7 rounded-lg border-2 border-black" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">
                      {b.fromDisplayName} → {b.toDisplayName}
                    </p>
                    {b.transactionDescription && (
                      <p className="text-[10px] text-slate-500 font-mono truncate max-w-[200px]">
                        {b.transactionDescription}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black text-violet-400">
                    ${(b.amountCents / 100).toFixed(2)}
                  </span>
                  {confirmDeleteId === b.id ? (
                    <InlineToast 
                      message="Delete entry?" 
                      type="confirm" 
                      onConfirm={() => deleteBalance(b.id)} 
                      onCancel={() => setConfirmDeleteId(null)} 
                    />
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(b.id)}
                      className="p-1.5 rounded-lg text-red-500/60 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
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
            <Button variant="primary" onClick={createIOU} disabled={adding || !newIOU.toUserId || !newIOU.amountCents}>
              {adding ? 'Recording...' : 'Record IOU'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block">Who do you owe?</label>
            <select
              value={newIOU.toUserId}
              onChange={(e) => setNewIOU({ ...newIOU, toUserId: e.target.value })}
              className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-sm font-bold outline-none focus:border-violet-500/50 transition-all"
            >
              <option value="">Select a member...</option>
              {otherMembers.map((m: any) => (
                <option key={m.id} value={m.id}>{m.displayName || m.email}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block">Amount</label>
            <CurrencyInput 
              valueCents={newIOU.amountCents || 0} 
              onChangeCents={cents => setNewIOU({ ...newIOU, amountCents: cents })}
              placeholder="0.00"
              className="focus:border-violet-500/50"
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
