import React from 'react'
import { FieldDef } from '../../lib/entity-field-defs'
import { Lock, Unlock } from 'lucide-react'

interface TypedFieldInputProps {
  def: FieldDef
  value: any
  onChange: (value: any) => void
  disabled?: boolean
  onToggleLock?: () => void
}

export const TypedFieldInput: React.FC<TypedFieldInputProps> = ({ def, value, onChange, disabled, onToggleLock }) => {
  const showPadlock = def.locked && onToggleLock

  if (def.type === 'boolean') {
    return (
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={value === true || value === 'true' || value === 1}
            onChange={e => onChange(e.target.checked)}
            disabled={disabled}
            className="sr-only peer"
          />
          <div className={`w-10 h-5 rounded-full transition-colors relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5 ${disabled ? 'bg-white/5' : 'bg-white/10 peer-checked:bg-primary'} ${disabled ? 'after:bg-white/20' : 'after:bg-white/40 peer-checked:after:bg-white'}`} />
          <span className="text-sm text-white/60">{value ? 'Enabled' : 'Disabled'}</span>
        </label>
        {showPadlock && (
          <button type="button" onClick={onToggleLock} className="text-white/30 hover:text-white transition-colors" title={disabled ? 'Unlock to edit' : 'Lock'}>
            {disabled ? <Lock size={14} /> : <Unlock size={14} />}
          </button>
        )}
      </div>
    )
  }

  if (def.type === 'select') {
    return (
      <div className="relative">
        <select
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-sm font-mono disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
        >
          <option value="">Select...</option>
          {def.options?.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {showPadlock && (
          <button type="button" onClick={onToggleLock} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors" title={disabled ? 'Unlock to edit' : 'Lock'}>
            {disabled ? <Lock size={14} /> : <Unlock size={14} />}
          </button>
        )}
      </div>
    )
  }

  if (def.type === 'textarea') {
    return (
      <div className="relative">
        <textarea
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          placeholder={def.placeholder || def.label}
          rows={3}
          className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-sm font-mono disabled:opacity-50 disabled:cursor-not-allowed resize-none"
        />
        {showPadlock && (
          <button type="button" onClick={onToggleLock} className="absolute right-3 top-3 text-white/30 hover:text-white transition-colors" title={disabled ? 'Unlock to edit' : 'Lock'}>
            {disabled ? <Lock size={14} /> : <Unlock size={14} />}
          </button>
        )}
      </div>
    )
  }

  if (def.type === 'cents') {
    const displayValue = value !== undefined && value !== null && value !== '' ? (value / 100).toFixed(2) : ''
    return (
      <div className="relative">
        <input
          type="number"
          step="0.01"
          value={displayValue}
          onChange={e => {
            const raw = e.target.value
            const cents = raw === '' ? '' : Math.round(parseFloat(raw) * 100)
            onChange(cents)
          }}
          disabled={disabled}
          placeholder={def.placeholder || def.label}
          className={`w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-sm font-mono disabled:opacity-50 disabled:cursor-not-allowed ${showPadlock ? 'pr-10' : ''}`}
        />
        {showPadlock && (
          <button type="button" onClick={onToggleLock} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors" title={disabled ? 'Unlock to edit' : 'Lock'}>
            {disabled ? <Lock size={14} /> : <Unlock size={14} />}
          </button>
        )}
      </div>
    )
  }

  if (def.type === 'date') {
    return (
      <div className="relative">
        <input
          type="date"
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          className={`w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-sm font-mono disabled:opacity-50 disabled:cursor-not-allowed ${showPadlock ? 'pr-10' : ''}`}
        />
        {showPadlock && (
          <button type="button" onClick={onToggleLock} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors" title={disabled ? 'Unlock to edit' : 'Lock'}>
            {disabled ? <Lock size={14} /> : <Unlock size={14} />}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      <input
        type={def.type === 'number' ? 'number' : 'text'}
        step={def.type === 'number' ? 'any' : undefined}
        value={value ?? ''}
        onChange={e => onChange(def.type === 'number' ? parseFloat(e.target.value) || '' : e.target.value)}
        disabled={disabled}
        placeholder={def.placeholder || def.label}
        className={`w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-sm font-mono disabled:opacity-50 disabled:cursor-not-allowed ${showPadlock ? 'pr-10' : ''}`}
      />
      {showPadlock && (
        <button type="button" onClick={onToggleLock} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors" title={disabled ? 'Unlock to edit' : 'Lock'}>
          {disabled ? <Lock size={14} /> : <Unlock size={14} />}
        </button>
      )}
    </div>
  )
}

export default TypedFieldInput
