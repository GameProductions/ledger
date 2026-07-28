import React from 'react'

interface LiabilityItemCardProps {
  color?: string
  children: React.ReactNode
  className?: string
}

const BORDER_COLORS: Record<string, string> = {
  blue: 'hover:border-blue-500/30',
  amber: 'hover:border-amber-500/30',
  violet: 'hover:border-violet-500/30',
  emerald: 'hover:border-emerald-500/30',
}

export const LiabilityItemCard: React.FC<LiabilityItemCardProps> = ({ color = 'amber', children, className = '' }) => {
  const hoverBorder = BORDER_COLORS[color] || BORDER_COLORS.amber

  return (
    <div className={`group relative bg-white/[0.03] border border-white/5 rounded-[1.5rem] p-5 hover:bg-white/[0.05] transition-all ${hoverBorder} overflow-hidden ${className}`}>
      {children}
    </div>
  )
}
