import React, { useState, useEffect } from 'react'
import { Check, X, AlertCircle, Info, Loader2 } from 'lucide-react'

export type InlineToastType = 'info' | 'success' | 'error' | 'warning' | 'confirm' | 'loading'

interface InlineToastProps {
  message: string
  type?: InlineToastType
  onConfirm?: () => void
  onCancel?: () => void
  autoClose?: number // ms
}

export const InlineToast: React.FC<InlineToastProps> = ({ 
  message, 
  type = 'info', 
  onConfirm, 
  onCancel,
  autoClose
}) => {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (autoClose && type !== 'confirm' && type !== 'loading') {
      const timer = setTimeout(() => setIsVisible(false), autoClose)
      return () => clearTimeout(timer)
    }
  }, [autoClose, type])

  if (!isVisible) return null

  const getIcon = () => {
    switch (type) {
      case 'success': return <Check size={14} className="text-emerald-400" />
      case 'error': return <X size={14} className="text-red-400" />
      case 'warning': return <AlertCircle size={14} className="text-amber-400" />
      case 'loading': return <Loader2 size={14} className="text-primary animate-spin" />
      default: return <Info size={14} className="text-blue-400" />
    }
  }

  const getTypeStyles = () => {
    switch (type) {
      case 'success': return 'border-emerald-500/20 bg-emerald-500/5 text-emerald-200/80'
      case 'error': return 'border-red-500/20 bg-red-500/5 text-red-200/80'
      case 'warning': return 'border-amber-500/20 bg-amber-500/5 text-amber-200/80'
      case 'confirm': return 'border-primary/20 bg-primary/5 text-primary-200/80'
      default: return 'border-white/10 bg-white/5 text-white/60'
    }
  }

  return (
    <div className={`inline-flex items-center gap-3 px-3 py-1.5 rounded-lg border text-[11px] font-medium transition-all animate-in fade-in slide-in-from-top-1 duration-200 ${getTypeStyles()}`}>
      <span className="flex-shrink-0">{getIcon()}</span>
      <span className="whitespace-nowrap">{message}</span>
      
      {type === 'confirm' && (
        <div className="flex items-center gap-1.5 ml-2 border-l border-white/10 pl-2">
          <button 
            onClick={onCancel}
            className="px-2 py-0.5 rounded hover:bg-white/10 transition-colors tracking-widest text-[9px] font-black"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className="px-2 py-0.5 rounded bg-primary text-black hover:bg-primary/90 transition-colors tracking-widest text-[9px] font-black"
          >
            Confirm
          </button>
        </div>
      )}

      {(type !== 'confirm' && type !== 'loading' && !autoClose) && (
        <button 
          onClick={() => setIsVisible(false)}
          className="ml-2 hover:text-white transition-colors"
        >
          <X size={12} />
        </button>
      )}
    </div>
  )
}
