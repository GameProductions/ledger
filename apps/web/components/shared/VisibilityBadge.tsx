import React from 'react'
import { Lock, Users, Globe } from 'lucide-react'

interface VisibilityBadgeProps {
  visibility: 'private' | 'household' | 'public'
  size?: 'sm' | 'md'
}

const CONFIG = {
  private: { icon: Lock, label: 'Private', class: 'bg-red-500/10 text-red-400 border-red-500/20' },
  household: { icon: Users, label: 'Household', class: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  public: { icon: Globe, label: 'Global', class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
}

export const VisibilityBadge: React.FC<VisibilityBadgeProps> = ({ visibility, size = 'sm' }) => {
  const config = CONFIG[visibility] || CONFIG.household
  const Icon = config.icon
  const sizeClass = size === 'sm' ? 'text-[9px] px-1.5 py-0.5' : 'text-xs px-2 py-1'

  return (
    <span className={`inline-flex items-center gap-1 font-black tracking-widest rounded-md border ${config.class} ${sizeClass}`}>
      <Icon size={size === 'sm' ? 10 : 12} />
      {config.label}
    </span>
  )
}
