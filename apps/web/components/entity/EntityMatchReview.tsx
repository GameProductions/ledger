import React, { useMemo, useState, useCallback } from 'react'
import { Check, X, ChevronDown, ChevronRight, AlertCircle, Building2, Wallet, Tag, CreditCard, Receipt, User, Plus } from 'lucide-react'
import { SearchableSelect } from '../ui/SearchableSelect'
import type { EntityMatchItem, EntityGroup, MatchResult } from '../../utils/import/types'

const GROUP_META: Record<EntityGroup, { label: string; icon: React.ReactNode; color: string }> = {
  provider: { label: 'Service Providers', icon: <Building2 size={14} />, color: 'text-blue-400 border-blue-500/20 bg-blue-500/10' },
  account: { label: 'Funding Sources', icon: <Wallet size={14} />, color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' },
  category: { label: 'Categories', icon: <Tag size={14} />, color: 'text-amber-400 border-amber-500/20 bg-amber-500/10' },
  biller: { label: 'Billers', icon: <Building2 size={14} />, color: 'text-violet-400 border-violet-500/20 bg-violet-500/10' },
  'payment-method': { label: 'Payment Methods', icon: <CreditCard size={14} />, color: 'text-sky-400 border-sky-500/20 bg-sky-500/10' },
  subscription: { label: 'Subscriptions', icon: <Receipt size={14} />, color: 'text-purple-400 border-purple-500/20 bg-purple-500/10' },
  person: { label: 'People', icon: <User size={14} />, color: 'text-cyan-400 border-cyan-500/20 bg-cyan-500/10' },
}

const CONFIDENCE_META: Record<string, { label: string; color: string }> = {
  exact: { label: 'Exact', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  high: { label: 'High', color: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  medium: { label: 'Medium', color: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  low: { label: 'Low', color: 'bg-red-500/15 text-red-400 border-red-500/20' },
}

interface Props {
  items: EntityMatchItem[]
  loading: boolean
  entityOptions: Record<EntityGroup, { value: string; label: string }[]>
  onApproveAll: (group?: EntityGroup) => void
  onRejectAll: (group?: EntityGroup) => void
  onUpdate: (id: string, updates: Partial<EntityMatchItem>) => void
  onSetManualMatch: (id: string, match: MatchResult) => void
  onSetCreateNew: (id: string, createNew: boolean) => void
  onSetNewName: (id: string, name: string) => void
  onConfirm: () => void
  onCancel: () => void
}

const EntityMatchReview: React.FC<Props> = ({
  items,
  loading,
  entityOptions,
  onApproveAll,
  onRejectAll,
  onUpdate,
  onSetManualMatch,
  onSetCreateNew,
  onSetNewName,
  onConfirm,
  onCancel,
}) => {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<EntityGroup>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)

  const groups = useMemo(() => {
    const map = new Map<EntityGroup, EntityMatchItem[]>()
    for (const item of items) {
      if (!map.has(item.group)) map.set(item.group, [])
      map.get(item.group)!.push(item)
    }
    return Array.from(map.entries())
  }, [items])

  const allApproved = items.length > 0 && items.every((i) => i.status === 'approved')
  const hasPending = items.some((i) => i.status === 'pending')

  const toggleGroup = useCallback((group: EntityGroup) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
    })
  }, [])

  const handleEditMatch = useCallback(
    (item: EntityMatchItem, value: string) => {
      if (!value) {
        onSetCreateNew(item.id, true)
        setEditingId(null)
        return
      }
      const opt = entityOptions[item.group]?.find((o) => o.value === value)
      if (opt) {
        onSetManualMatch(item.id, {
          entityId: opt.value,
          entityName: opt.label.toLowerCase(),
          confidence: null,
        })
      }
      setEditingId(null)
    },
    [entityOptions, onSetManualMatch, onSetCreateNew]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-400 font-medium">Scanning for existing entities...</p>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16 space-y-4">
        <AlertCircle size={40} className="mx-auto text-slate-600" />
        <p className="text-slate-400 font-medium">No entities found in the imported data.</p>
        <div className="flex justify-center gap-4">
          <button onClick={onConfirm} className="px-8 py-3 bg-emerald-500 text-black font-black text-sm rounded-xl hover:bg-emerald-400 transition-all">
            Continue Import
          </button>
          <button onClick={onCancel} className="px-8 py-3 bg-white/5 text-white font-black text-sm rounded-xl hover:bg-white/10 transition-all">
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">
            {items.length} entities detected
            {hasPending && ` · ${items.filter((i) => i.status === 'pending').length} pending review`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onApproveAll()}
            disabled={allApproved}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs rounded-xl hover:bg-emerald-500/20 transition-all disabled:opacity-30 disabled:pointer-events-none"
          >
            <Check size={14} /> Approve All
          </button>
          <button
            onClick={() => onRejectAll()}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-xs rounded-xl hover:bg-red-500/20 transition-all"
          >
            <X size={14} /> Reject All
          </button>
        </div>
      </div>

      {groups.map(([group, groupItems]) => {
        const meta = GROUP_META[group]
        const groupApproved = groupItems.every((i) => i.status === 'approved')
        const groupPending = groupItems.some((i) => i.status === 'pending')
        const collapsed = collapsedGroups.has(group)
        const groupOptions = entityOptions[group] ?? []

        return (
          <div key={group} className="border border-white/10 rounded-2xl overflow-hidden">
            <button
              onClick={() => toggleGroup(group)}
              className="w-full flex items-center justify-between px-5 py-3 bg-white/5 hover:bg-white/10 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${meta.color}`}>
                  {meta.icon}
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm">{meta.label}</p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {groupItems.length} items · {groupItems.filter((i) => i.status === 'approved').length} approved · {groupPending ? `${groupItems.filter((i) => i.status === 'pending').length} pending` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {!groupApproved && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onApproveAll(group) }}
                    className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 px-3 py-1 rounded-lg hover:bg-emerald-500/10 transition-all"
                  >
                    Approve All
                  </button>
                )}
                {collapsed ? <ChevronRight size={18} className="text-slate-500" /> : <ChevronDown size={18} className="text-slate-500" />}
              </div>
            </button>

            {!collapsed && (
              <div className="divide-y divide-white/5">
                {groupItems.map((item) => {
                  const match = item.manualMatch || item.existing
                  const confidenceColor = match?.confidence ? CONFIDENCE_META[match.confidence] : null
                  const isEditing = editingId === item.id

                  return (
                    <div key={item.id} className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-all">
                      {/* Status indicator */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                        item.status === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : item.status === 'rejected'
                          ? 'bg-red-500/10 text-red-400 border-red-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {item.status === 'approved' ? <Check size={14} /> : item.status === 'rejected' ? <X size={14} /> : <AlertCircle size={14} />}
                      </div>

                      {/* Imported name */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-white truncate">{item.importedName}</p>
                      </div>

                      {/* Match arrow */}
                      <div className="text-slate-600 shrink-0">
                        <ChevronRight size={16} />
                      </div>

                      {/* Matched entity or edit/create */}
                      <div className="w-64 shrink-0">
                        {isEditing ? (
                          <SearchableSelect
                            options={groupOptions}
                            value={match?.entityId || ''}
                            onChange={(val) => handleEditMatch(item, val)}
                            placeholder="Select or skip..."
                            onCreate={async (name) => {
                              onSetCreateNew(item.id, true)
                              onSetNewName(item.id, name)
                              setEditingId(null)
                              return ''
                            }}
                          />
                        ) : item.createNew && !match ? (
                          <div className="flex items-center gap-2">
                            <Plus size={14} className="text-amber-500 shrink-0" />
                            <input
                              type="text"
                              value={item.newName}
                              onChange={(e) => onSetNewName(item.id, e.target.value)}
                              className="flex-1 bg-black/40 border border-amber-500/30 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-amber-500/50"
                              placeholder="New entity name..."
                            />
                          </div>
                        ) : match ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white truncate">{match.entityName}</span>
                            {confidenceColor && (
                              <span className={`text-[8px] font-bold tracking-wider px-1.5 py-0.5 rounded border ${confidenceColor.color}`}>
                                {confidenceColor.label}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 italic">No match — will create new</span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            if (item.status === 'approved') {
                              onUpdate(item.id, { status: 'pending', createNew: false })
                            } else {
                              onUpdate(item.id, { status: 'approved', createNew: false })
                            }
                          }}
                          className={`p-2 rounded-lg transition-all ${item.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-600 hover:text-emerald-400 hover:bg-emerald-500/10'}`}
                          title={item.status === 'approved' ? 'Unapprove' : 'Approve'}
                        >
                          <Check size={14} />
                        </button>

                        <button
                          onClick={() => {
                            if (item.status === 'rejected') {
                              onUpdate(item.id, { status: 'pending', createNew: false })
                            } else {
                              onUpdate(item.id, { status: 'rejected', createNew: !item.existing })
                            }
                          }}
                          className={`p-2 rounded-lg transition-all ${item.status === 'rejected' ? 'bg-red-500/10 text-red-400' : 'text-slate-600 hover:text-red-400 hover:bg-red-500/10'}`}
                          title={item.status === 'rejected' ? 'Unreject' : 'Reject'}
                        >
                          <X size={14} />
                        </button>

                        <button
                          onClick={() => { if (isEditing) setEditingId(null); else setEditingId(item.id) }}
                          className={`p-2 rounded-lg transition-all ${isEditing ? 'bg-amber-500/10 text-amber-400' : 'text-slate-600 hover:text-amber-400 hover:bg-amber-500/10'}`}
                          title="Edit match"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <div className="text-xs text-slate-500">
          {items.filter((i) => i.status === 'approved').length} approved · {items.filter((i) => i.createNew).length} will be created
          {hasPending && ` · ${items.filter((i) => i.status === 'pending').length} pending`}
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="px-6 py-2.5 bg-white/5 text-white font-bold text-xs rounded-xl hover:bg-white/10 transition-all">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={hasPending}
            className="px-8 py-2.5 bg-emerald-500 text-black font-black text-xs rounded-xl hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/10 disabled:opacity-30 disabled:pointer-events-none"
          >
            Confirm Matches & Continue
          </button>
        </div>
      </div>
    </div>
  )
}

export default EntityMatchReview
