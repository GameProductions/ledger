import React from 'react'

interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md'
}

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  paid: { bg: 'bg-emerald-500/20', text: 'text-emerald-500', dot: 'bg-emerald-500' },
  completed: { bg: 'bg-emerald-500/20', text: 'text-emerald-500', dot: 'bg-emerald-500' },
  pending: { bg: 'bg-amber-500/20', text: 'text-amber-500', dot: 'bg-amber-500' },
  unpaid: { bg: 'bg-red-500/20', text: 'text-red-500', dot: 'bg-red-500' },
  overdue: { bg: 'bg-red-500/20', text: 'text-red-500', dot: 'bg-red-500' },
  active: { bg: 'bg-blue-500/20', text: 'text-blue-500', dot: 'bg-blue-500' },
  scheduled: { bg: 'bg-blue-500/20', text: 'text-blue-500', dot: 'bg-blue-500' },
  cancelled: { bg: 'bg-slate-500/20', text: 'text-slate-400', dot: 'bg-slate-500' },
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  const style = STATUS_STYLES[status] || STATUS_STYLES.pending
  const sizeClasses = size === 'sm'
    ? 'text-[10px] px-2 py-0.5'
    : 'text-xs px-3 py-1'

  return (
    <span className={`inline-flex items-center gap-1.5 font-black tracking-widest rounded-md ${sizeClasses} ${style.bg} ${style.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {status}
    </span>
  )
}
