import React, { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Price } from '../Price'
import { CurrencyInput } from '../ui/CurrencyInput'
import { Checkbox } from '../ui/Checkbox'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { getApiUrl } from '../../utils/api'
import { HandCoins, ArrowRight, ShieldCheck, Check } from 'lucide-react'

interface SettleBalancesModalProps {
  isOpen: boolean
  onClose: () => void
  onSettled?: () => void
  targetUser: {
    id: string
    displayName: string
    avatarUrl?: string
    balanceCents: number // positive = they owe you, negative = you owe them
  } | null
  accounts: Array<{ id: string; name: string; type: string }>
}

export const SettleBalancesModal: React.FC<SettleBalancesModalProps> = ({
  isOpen,
  onClose,
  onSettled,
  targetUser,
  accounts
}) => {
  const { token, user } = useAuth()
  const { showToast } = useToast()

  const defaultAmount = targetUser ? Math.abs(targetUser.balanceCents) : 0
  const [settleAmountCents, setSettleAmountCents] = useState<number>(defaultAmount)
  const [method, setMethod] = useState<'venmo' | 'zelle' | 'cash' | 'bank_transfer' | 'manual'>('venmo')
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '')
  const [createLedgerTx, setCreateLedgerTx] = useState<boolean>(true)
  const [notes, setNotes] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)

  // Reset when target user changes
  React.useEffect(() => {
    if (targetUser) {
      setSettleAmountCents(Math.abs(targetUser.balanceCents))
    }
  }, [targetUser])

  if (!targetUser) return null

  const isOwed = targetUser.balanceCents > 0 // They owe user
  const isOwing = targetUser.balanceCents < 0 // User owes them

  const handleSettle = async () => {
    if (!token || !targetUser) return
    setLoading(true)
    try {
      const res = await fetch(`${getApiUrl()}/api/financials/shared-balances/settle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          withUserId: targetUser.id,
          amountCents: settleAmountCents,
          paymentAccountId: createLedgerTx ? selectedAccountId : null,
          method,
          createLedgerTransaction: createLedgerTx,
          notes: notes.trim() || undefined
        })
      })

      const data = await res.json()
      if (res.ok && data.success) {
        showToast(`Settled balance with ${targetUser.displayName}!`, 'success')
        if (onSettled) onSettled()
        onClose()
      } else {
        showToast(data.error || 'Failed to settle balance', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Error executing settlement', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Settle Household Balances"
      maxWidth="max-w-xl"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading || settleAmountCents <= 0}
            onClick={handleSettle}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-black rounded-xl text-xs font-black uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {loading ? (
              'Processing...'
            ) : (
              <>
                <Check size={14} /> Confirm Settlement (<Price amountCents={settleAmountCents} />)
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Header Summary */}
        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-emerald-500/30 flex items-center justify-center text-sm font-black text-emerald-400">
              {targetUser.displayName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">{targetUser.displayName}</h4>
              <p className="text-xs text-white/50">
                {isOwed ? 'Owes you' : isOwing ? 'You owe' : 'Even balance'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold uppercase tracking-wider text-white/40">Current IOU</div>
            <Price
              amountCents={Math.abs(targetUser.balanceCents)}
              className={`text-xl font-black ${isOwed ? 'text-emerald-400' : 'text-amber-400'}`}
            />
          </div>
        </div>

        {/* Settlement Amount */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-white/60">Settlement Amount</label>
          <div className="flex gap-2">
            <div className="flex-1">
              <CurrencyInput
                valueCents={settleAmountCents}
                onChangeCents={setSettleAmountCents}
                className="w-full bg-black/50 border-white/10 text-white font-bold"
              />
            </div>
            <button
              type="button"
              onClick={() => setSettleAmountCents(Math.abs(targetUser.balanceCents))}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-primary transition-all whitespace-nowrap"
            >
              Full Balance
            </button>
          </div>
        </div>

        {/* Payment Method Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-white/60">Payment Method</label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {(['venmo', 'zelle', 'bank_transfer', 'cash', 'manual'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={`py-2 px-2 rounded-xl text-xs font-bold capitalize transition-all border ${
                  method === m
                    ? 'bg-primary/20 border-primary text-primary shadow-lg shadow-primary/10'
                    : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                {m === 'bank_transfer' ? 'Transfer' : m}
              </button>
            ))}
          </div>
        </div>

        {/* Create Matching Ledger Transaction Option */}
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-primary" /> Create Ledger Transaction
              </div>
              <p className="text-[11px] text-white/50">
                Automatically post a matching paid transaction to your ledger
              </p>
            </div>
            <Checkbox checked={createLedgerTx} onChange={setCreateLedgerTx} />
          </div>

          {createLedgerTx && (
            <div className="pt-2 border-t border-primary/10 space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-white/60">
                Funding Account
              </label>
              <select
                value={selectedAccountId}
                onChange={e => setSelectedAccountId(e.target.value)}
                className="w-full bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs font-bold text-white outline-none focus:border-primary"
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id} className="bg-slate-900 text-white">
                    {acc.name} ({acc.type})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-white/60">Notes / Reference</label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Venmo confirmation #12345 or dinner split squared"
            className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs font-bold text-white outline-none focus:border-primary"
          />
        </div>
      </div>
    </Modal>
  )
}
