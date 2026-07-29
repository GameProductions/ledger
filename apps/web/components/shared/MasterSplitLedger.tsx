import React from 'react'
import { ShieldCheck } from 'lucide-react'
import { Price } from '../Price'
import { StatusBadge } from './StatusBadge'

interface SplitEntry {
  id: string
  assignedUserId: string
  status: string
  calculatedAmountCents: number
  isMasterLedgerPublic?: boolean
}

interface MasterSplitLedgerProps {
  splits: SplitEntry[]
  isMasterLedgerPublic: boolean
  onTogglePublic: (isPublic: boolean) => void
  open: boolean
  onToggle: () => void
}

export const MasterSplitLedger: React.FC<MasterSplitLedgerProps> = ({
  splits,
  isMasterLedgerPublic,
  onTogglePublic,
  open,
  onToggle,
}) => {
  if (!splits || splits.length === 0) return null

  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full bg-primary/10 border border-primary/20 rounded-xl p-3 flex flex-col hover:bg-primary/20 transition-all text-left group/tracker shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-primary group-hover/tracker:scale-110 transition-transform" />
            <span className="text-[10px] font-black tracking-widest text-primary">Master Split Ledger</span>
          </div>
          <span className="text-[10px] font-black text-white/40">{open ? 'Close' : 'View Stats'}</span>
        </div>
        {open && (
          <div className="mt-3 pt-3 border-t border-primary/20 space-y-3 cursor-default" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-2 py-1 bg-white/5 rounded-lg border border-white/5 mb-2">
              <span className="text-[9px] font-black tracking-widest text-white/40">Broadcasting Status</span>
              <label className="relative inline-flex items-center cursor-pointer scale-75 origin-right">
                <input
                  type="checkbox"
                  checked={isMasterLedgerPublic}
                  onChange={(e) => onTogglePublic(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white/40 after:border-white/10 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
              </label>
            </div>
            {splits.map((split: SplitEntry) => (
              <div key={split.id} className="flex items-center justify-between bg-black/40 p-2 rounded-lg border border-white/5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-white/10 text-[9px] flex items-center justify-center font-bold">{split.assignedUserId.substring(0, 2)}</span>
                  <span className="text-[10px] font-bold tracking-widest text-white/60">Portion</span>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={split.status} />
                  <Price amountCents={split.calculatedAmountCents} className="text-[11px] font-black tracking-widest" />
                </div>
              </div>
            ))}
          </div>
        )}
      </button>
    </div>
  )
}
