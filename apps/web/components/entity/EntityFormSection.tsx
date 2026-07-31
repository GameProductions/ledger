import React, { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useReducedMotion } from '../../hooks/useReducedMotion'

interface EntityFormSectionProps {
  title: string
  icon?: React.ReactNode
  color?: string
  defaultOpen?: boolean
  columns?: 1 | 2
  children: React.ReactNode
}

const COLOR_MAP: Record<string, { border: string; bg: string; text: string }> = {
  blue: { border: 'border-blue-500/20', bg: 'bg-blue-500/5', text: 'text-blue-400' },
  emerald: { border: 'border-emerald-500/20', bg: 'bg-emerald-500/5', text: 'text-emerald-400' },
  amber: { border: 'border-amber-500/20', bg: 'bg-amber-500/5', text: 'text-amber-400' },
  violet: { border: 'border-violet-500/20', bg: 'bg-violet-500/5', text: 'text-violet-400' },
  red: { border: 'border-red-500/20', bg: 'bg-red-500/5', text: 'text-red-400' },
  indigo: { border: 'border-indigo-500/20', bg: 'bg-indigo-500/5', text: 'text-indigo-400' },
  slate: { border: 'border-white/10', bg: 'bg-white/[0.02]', text: 'text-white/50' },
}

export const EntityFormSection: React.FC<EntityFormSectionProps> = ({
  title, icon, color = 'blue', defaultOpen = true, columns = 2, children,
}) => {
  const [open, setOpen] = useState(defaultOpen)
  const reduced = useReducedMotion()
  const c = COLOR_MAP[color] || COLOR_MAP.blue

  return (
    <div className={`border ${c.border} ${c.bg} rounded-2xl overflow-hidden`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left"
      >
        <div className="flex items-center gap-3">
          {icon && <div className={`${c.text}`}>{icon}</div>}
          <span className={`text-xs font-black tracking-widest ${c.text} uppercase`}>{title}</span>
        </div>
        <ChevronDown
          size={16}
          className={`${c.text} transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className={`px-5 pb-5 ${reduced ? '' : 'animate-in slide-in-from-top-1 duration-200'}`}>
          <div className={columns === 2 ? 'grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4' : 'space-y-4'}>
            {children}
          </div>
        </div>
      )}
    </div>
  )
}
