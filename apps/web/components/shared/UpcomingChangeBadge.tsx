import React from 'react'
import { Price } from '../Price'

interface UpcomingChangeBadgeProps {
  amountCents: number
  effectiveDate: string
  label?: string
  color?: string
}

const COLOR_MAP: Record<string, { text: string; bg: string; border: string; dot: string }> = {
  amber: { text: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', dot: 'bg-amber-500' },
  blue: { text: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20', dot: 'bg-blue-500' },
  violet: { text: 'text-violet-500', bg: 'bg-violet-500/10', border: 'border-violet-500/20', dot: 'bg-violet-500' },
  primary: { text: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20', dot: 'bg-primary' },
}

export const UpcomingChangeBadge: React.FC<UpcomingChangeBadgeProps> = ({
  amountCents,
  effectiveDate,
  label = 'Rate Change',
  color = 'primary',
}) => {
  const c = COLOR_MAP[color] || COLOR_MAP.primary
  if (!effectiveDate || amountCents === 0) return null

  return (
    <div className={`absolute top-0 right-0 ${c.bg} border-b border-l ${c.border} px-3 py-1 rounded-bl-xl`}>
      <div className={`text-[9px] font-black tracking-widest ${c.text} flex items-center gap-1.5`}>
        <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${c.dot}`} />
        {label}: <Price amountCents={amountCents} /> on {effectiveDate}
      </div>
    </div>
  )
}
