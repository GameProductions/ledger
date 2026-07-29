import React, { useState } from 'react'
import { ChevronDown, type LucideIcon } from 'lucide-react'

interface AccordionSectionProps {
  icon?: LucideIcon
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}

export const AccordionSection: React.FC<AccordionSectionProps> = ({ icon: Icon, title, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border border-white/5 rounded-2xl overflow-hidden transition-all duration-300">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 bg-white/[0.02] hover:bg-white/[0.04] transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon size={14} className="text-primary" />}
          <span className="text-[11px] font-black tracking-widest text-white/60">{title}</span>
        </div>
        <ChevronDown
          size={14}
          className={`text-white/30 transition-transform duration-200 ${open ? 'rotate-0' : '-rotate-90'}`}
        />
      </button>
      {open && (
        <div className="p-4 pt-2 border-t border-white/5 space-y-3 animate-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  )
}
