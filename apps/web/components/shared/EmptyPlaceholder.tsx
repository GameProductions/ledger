import React from 'react'
import type { LucideIcon } from 'lucide-react'
import { AlertCircle } from 'lucide-react'

interface EmptyPlaceholderProps {
  icon?: LucideIcon
  message: string
  action?: React.ReactNode
}

export const EmptyPlaceholder: React.FC<EmptyPlaceholderProps> = ({ icon: Icon = AlertCircle, message, action }) => {
  return (
    <div className="py-12 text-center border border-dashed border-white/10 rounded-[2rem]">
      <Icon size={24} className="mx-auto text-white/20 mb-3" />
      <p className="text-xs font-black tracking-widest text-white/20">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
