import React from 'react'
import { useApi } from '../../hooks/useApi'

interface ExternalOwnerBadgeProps {
  contactId: string
  size?: 'sm' | 'md'
}

export const ExternalOwnerBadge: React.FC<ExternalOwnerBadgeProps> = ({ contactId, size = 'sm' }) => {
  const { data: contacts = [] } = (useApi('/api/planning/contacts') as any)

  const contact = (contacts || []).find((c: any) => c.id === contactId)
  if (!contact) return null

  const sizeClass = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1'

  return (
    <span className={`inline-flex items-center gap-1 font-black tracking-widest rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 ${sizeClass}`}>
      👤 {contact.name}
    </span>
  )
}
