import React from 'react'
import { Pencil, Trash2, History as HistoryIcon } from 'lucide-react'

interface Props {
  onHistory?: () => void
  onEdit?: () => void
  onDelete?: () => void
}

const btnClass = 'p-2 rounded-lg hover:bg-white/10 transition-colors'

export const EntityActionButtons: React.FC<Props> = ({ onHistory, onEdit, onDelete }) => (
  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
    {onHistory && (
      <button onClick={onHistory} className={`${btnClass} text-white/40 hover:text-amber-400`} title="History">
        <HistoryIcon size={14} />
      </button>
    )}
    {onEdit && (
      <button onClick={onEdit} className={`${btnClass} text-white/40 hover:text-primary`} title="Edit">
        <Pencil size={14} />
      </button>
    )}
    {onDelete && (
      <button onClick={onDelete} className={`${btnClass} text-white/40 hover:text-red-400`} title="Delete">
        <Trash2 size={14} />
      </button>
    )}
  </div>
)
