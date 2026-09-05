import React from 'react'
import { Plus, Trash2, Hash } from 'lucide-react'
import { SearchableSelect, SearchableOption } from './SearchableSelect'

export interface ConfirmationNumberItem {
  id?: string
  category: string
  customCategoryLabel?: string | null
  value: string
  isPrimary?: boolean
  sortOrder?: number
}

export const CONFIRMATION_NUMBER_CATEGORIES: SearchableOption[] = [
  { value: 'confirmation', label: 'Confirmation #', icon: <span className="text-base leading-none">✅</span> },
  { value: 'authorization', label: 'Auth Code', icon: <span className="text-base leading-none">🔐</span> },
  { value: 'balance_transfer', label: 'Balance Transfer', icon: <span className="text-base leading-none">🔄</span> },
  { value: 'receipt', label: 'Receipt #', icon: <span className="text-base leading-none">🧾</span> },
  { value: 'order', label: 'Order #', icon: <span className="text-base leading-none">📦</span> },
  { value: 'invoice', label: 'Invoice #', icon: <span className="text-base leading-none">🧾</span> },
  { value: 'payment', label: 'Payment #', icon: <span className="text-base leading-none">💳</span> },
  { value: 'po', label: 'PO #', icon: <span className="text-base leading-none">📋</span> },
  { value: 'reference', label: 'Reference #', icon: <span className="text-base leading-none">🔗</span> },
  { value: 'tracking', label: 'Tracking #', icon: <span className="text-base leading-none">📍</span> },
  { value: 'custom', label: 'Custom Category...', icon: <span className="text-base leading-none">🔖</span> }
]

interface ConfirmationNumberBuilderProps {
  value?: string
  onChangeValue?: (val: string) => void
  confirmationNumbers?: ConfirmationNumberItem[]
  onChangeNumbers?: (items: ConfirmationNumberItem[]) => void
  label?: string
  accentColor?: 'orange' | 'blue' | 'primary'
  compact?: boolean
  helperText?: string
}

export const ConfirmationNumberBuilder: React.FC<ConfirmationNumberBuilderProps> = ({
  value = '',
  onChangeValue,
  confirmationNumbers = [],
  onChangeNumbers,
  label = 'Categorized Confirmation Numbers & References',
  accentColor = 'primary',
  compact = false,
  helperText
}) => {
  const isOrange = accentColor === 'orange'
  const isBlue = accentColor === 'blue'

  const focusBorderClass = isOrange 
    ? 'focus:border-orange-500/50' 
    : isBlue 
    ? 'focus:border-blue-400' 
    : 'focus:border-primary'

  const badgeTextClass = isOrange
    ? 'text-orange-400'
    : isBlue
    ? 'text-blue-400'
    : 'text-primary'

  const badgeBgClass = isOrange
    ? 'bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/20'
    : isBlue
    ? 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20'
    : 'bg-primary/10 hover:bg-primary/20 border-primary/20'

  const handleAddInstance = () => {
    if (!onChangeNumbers) return
    const next: ConfirmationNumberItem[] = [
      ...confirmationNumbers,
      { category: 'confirmation', value: '', customCategoryLabel: '' }
    ]
    onChangeNumbers(next)
  }

  const handleUpdateInstance = (idx: number, updates: Partial<ConfirmationNumberItem>) => {
    if (!onChangeNumbers) return
    const next = [...confirmationNumbers]
    next[idx] = { ...next[idx], ...updates }
    onChangeNumbers(next)
  }

  const handleRemoveInstance = (idx: number) => {
    if (!onChangeNumbers) return
    const next = confirmationNumbers.filter((_, i) => i !== idx)
    onChangeNumbers(next)
  }

  return (
    <div className={`bg-black/30 border border-white/10 rounded-2xl ${compact ? 'p-3' : 'p-4'} space-y-3`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="text-xs font-bold tracking-wider text-secondary flex items-center gap-1.5">
          <Hash size={13} className={badgeTextClass} /> {label}
        </label>
        {onChangeNumbers && (
          <button
            type="button"
            onClick={handleAddInstance}
            className={`text-[10px] font-black tracking-wider ${badgeTextClass} hover:text-white px-2.5 py-1 rounded-xl ${badgeBgClass} border flex items-center gap-1 cursor-pointer transition-all`}
          >
            <Plus size={11} /> Add Reference Number
          </button>
        )}
      </div>

      {helperText && (
        <p className="text-[10px] text-slate-400 font-medium leading-relaxed">{helperText}</p>
      )}

      {/* Primary Reference Row */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
        <div className="sm:col-span-4">
          <SearchableSelect
            options={CONFIRMATION_NUMBER_CATEGORIES}
            value={confirmationNumbers?.[0]?.category || (value ? 'confirmation' : 'confirmation')}
            onChange={(cat) => {
              if (onChangeNumbers) {
                if (confirmationNumbers && confirmationNumbers.length > 0) {
                  handleUpdateInstance(0, { category: cat })
                } else {
                  onChangeNumbers([
                    { category: cat, value: value, customCategoryLabel: '' }
                  ])
                  if (onChangeValue) onChangeValue('')
                }
              }
            }}
            placeholder="Category..."
          />
        </div>
        <div className="sm:col-span-8">
          <input
            type="text"
            value={confirmationNumbers && confirmationNumbers.length > 0 ? confirmationNumbers[0].value : value}
            onChange={(e) => {
              if (confirmationNumbers && confirmationNumbers.length > 0 && onChangeNumbers) {
                handleUpdateInstance(0, { value: e.target.value })
                if (onChangeValue) onChangeValue(e.target.value)
              } else if (onChangeValue) {
                onChangeValue(e.target.value)
              }
            }}
            placeholder="e.g. TXN-12345, Auth #, Receipt ID, Ref #..."
            className={`w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none ${focusBorderClass} transition-colors placeholder:text-white/20`}
          />
        </div>
      </div>

      {/* Multi-instance Rows (index >= 1 if primary exists in array, or all if primary separate) */}
      {(confirmationNumbers && confirmationNumbers.length > 0 ? confirmationNumbers.slice(1) : []).map((cn, sliceIdx) => {
        const idx = sliceIdx + 1
        return (
        <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center pt-2.5 border-t border-white/5">
          <div className="sm:col-span-4">
            <SearchableSelect
              options={CONFIRMATION_NUMBER_CATEGORIES}
              value={cn.category || 'confirmation'}
              onChange={(cat) => handleUpdateInstance(idx, { category: cat })}
              placeholder="Category..."
            />
          </div>
          <div className={cn.category === 'custom' ? 'sm:col-span-3' : 'sm:col-span-7'}>
            <input
              type="text"
              value={cn.value}
              onChange={(e) => handleUpdateInstance(idx, { value: e.target.value })}
              placeholder="Reference Value..."
              className={`w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none ${focusBorderClass} transition-colors placeholder:text-white/20`}
            />
          </div>
          {cn.category === 'custom' && (
            <div className="sm:col-span-4">
              <input
                type="text"
                value={cn.customCategoryLabel || ''}
                onChange={(e) => handleUpdateInstance(idx, { customCategoryLabel: e.target.value })}
                placeholder="Custom Label..."
                className={`w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none ${focusBorderClass} transition-colors placeholder:text-white/20`}
              />
            </div>
          )}
          <div className="sm:col-span-1 flex justify-end">
            <button
              type="button"
              onClick={() => handleRemoveInstance(idx)}
              className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
              title="Remove reference number"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
        )
      })}
    </div>
  )
}
