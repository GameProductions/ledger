import React, { useMemo } from 'react'
import { X, Plus, Trash2, CheckCircle2, StickyNote } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { motion } from 'framer-motion'
import { Price } from './Price'
import { ProviderLogo } from './shared/ProviderLogo'
import { StatusBadge } from './shared/StatusBadge'
import { getItemTypeStyle } from './shared/itemTypeConfig'
import { useReducedMotion } from '../hooks/useReducedMotion'

interface DayDetailEntry {
  id: string
  type: string
  description: string
  amountCents: number
  status?: string
  iconUrl?: string
  logoUrl?: string
  notes?: string
  [key: string]: any
}

interface DayDetailModalProps {
  isOpen: boolean
  date: Date
  entries: DayDetailEntry[]
  onClose: () => void
  onAddEntry: (date: Date) => void
  onEditEntry: (item: any) => void
  onDeleteEntry?: (item: any) => void
  onMarkPaid?: (item: any) => void
}

export const DayDetailModal: React.FC<DayDetailModalProps> = ({
  isOpen,
  date,
  entries,
  onClose,
  onAddEntry,
  onEditEntry,
  onDeleteEntry,
  onMarkPaid,
}) => {
  const reduced = useReducedMotion()

  const { totalDeposits, totalDebits, netFlow, grouped } = useMemo(() => {
    let deposits = 0
    let debits = 0
    const groups: Record<string, DayDetailEntry[]> = {}

    entries.forEach(entry => {
      const type = entry.type
      if (!groups[type]) groups[type] = []
      groups[type].push(entry)

      const amount = entry.amountCents || 0
      if (type === 'pay_schedule' || (type === 'transaction' && amount > 0)) {
        deposits += Math.abs(amount)
      } else {
        debits += Math.abs(amount)
      }
    })

    return { totalDeposits: deposits, totalDebits: debits, netFlow: deposits - debits, grouped: groups }
  }, [entries])

  if (!isOpen) return null

  const typeOrder = ['pay_schedule', 'subscription', 'bill', 'installment', 'transaction', 'charge']
  const sortedTypes = typeOrder.filter(t => grouped[t])

  const ModalContainer = reduced ? 'div' : motion.div
  const containerProps = reduced ? {} : {
    initial: { opacity: 0, scale: 0.9, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0 }
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose} />

      <ModalContainer
        {...containerProps}
        className="w-full max-w-lg max-h-[85vh] flex flex-col card reveal p-0 relative z-10"
      >
        <div className="p-6 pb-4 border-b border-white/5 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black italic tracking-tighter">
              <span className="text-primary">{format(date, 'MMMM d')}</span>
            </h3>
            <p className="text-xs text-secondary font-bold tracking-widest mt-0.5">
              {format(date, 'EEEE, yyyy')} · {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onAddEntry(date)}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-xl text-xs font-black tracking-widest hover:scale-105 active:scale-95 transition-all"
            >
              <Plus size={14} /> Add
            </button>
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center hover:bg-white/5 rounded-full transition-all text-slate-500 hover:text-white">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="px-6 py-3 border-b border-white/5">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-center">
              <div className="text-[8px] font-black tracking-widest text-blue-400">Income</div>
              <Price amountCents={totalDeposits} className="text-sm font-black text-blue-400" />
            </div>
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center">
              <div className="text-[8px] font-black tracking-widest text-amber-400">Expenses</div>
              <Price amountCents={totalDebits} className="text-sm font-black text-amber-400" />
            </div>
            <div className={`p-2 rounded-xl text-center border ${netFlow >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
              <div className="text-[8px] font-black tracking-widest text-white/40">Net</div>
              <Price amountCents={netFlow} className={`text-sm font-black ${netFlow >= 0 ? 'text-emerald-400' : 'text-red-400'}`} />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {sortedTypes.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-xs font-black tracking-widest text-white/20">No entries for this day</p>
            </div>
          ) : (
            sortedTypes.map(type => {
              const style = getItemTypeStyle(type)
              const typeEntries = grouped[type]
              return (
                <div key={type}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full ${style.dotColor}`} />
                    <span className={`text-[10px] font-black tracking-widest ${style.badgeText}`}>
                      {style.label} · {typeEntries.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {typeEntries.map((entry, i) => (
                      <div
                        key={`${entry.id || i}`}
                        onClick={() => onEditEntry(entry)}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/20 transition-all cursor-pointer group gap-2"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <ProviderLogo url={entry.iconUrl || entry.logoUrl} name={entry.description} size={28} className="flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-sm truncate flex items-center gap-2">
                              {entry.description}
                              {entry.notes && <StickyNote size={12} className="text-white/30 flex-shrink-0" />}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-0.5">
                              {entry.status && <StatusBadge status={entry.status} />}
                              {entry.frequency && (
                                <span className="text-[8px] font-black tracking-widest text-white/20">{entry.frequency}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-1.5 flex-shrink-0 ml-0 sm:ml-2">
                          {onMarkPaid && entry.status !== 'paid' && entry.type !== 'pay_schedule' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onMarkPaid(entry) }}
                              className="flex items-center gap-1 text-emerald-500 hover:text-emerald-400 transition-colors px-2 py-1 text-[10px] font-black tracking-widest border border-emerald-500/30 rounded-lg hover:bg-emerald-500/10 active:scale-90"
                              title="Mark paid"
                            >
                              <CheckCircle2 size={14} /> Paid
                            </button>
                          )}
                          {onDeleteEntry && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onDeleteEntry(entry) }}
                              className="flex items-center gap-1 text-red-500 hover:text-red-400 transition-colors px-2 py-1 text-[10px] font-black tracking-widest border border-red-500/30 rounded-lg hover:bg-red-500/10 active:scale-90"
                              title="Delete"
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </ModalContainer>
    </div>
  )
}
