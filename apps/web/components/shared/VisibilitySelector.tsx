import React from 'react'
import { Lock, Users, Globe } from 'lucide-react'

interface VisibilitySelectorProps {
  value: 'private' | 'household' | 'public'
  publicScope: 'name_only' | 'full'
  onChange: (value: 'private' | 'household' | 'public') => void
  onPublicScopeChange: (value: 'name_only' | 'full') => void
}

const OPTIONS = [
  { value: 'private' as const, label: 'Only me', icon: Lock, desc: 'Only you can see this item' },
  { value: 'household' as const, label: 'Household', icon: Users, desc: 'All household members can see this' },
  { value: 'public' as const, label: 'Global', icon: Globe, desc: 'Visible to all households on the platform' },
]

export const VisibilitySelector: React.FC<VisibilitySelectorProps> = ({
  value,
  publicScope,
  onChange,
  onPublicScopeChange,
}) => {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map(opt => {
          const Icon = opt.icon
          const selected = value === opt.value
          return (
            <button
              type="button"
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={`p-3 rounded-xl border text-left transition-all ${
                selected
                  ? 'bg-primary/10 border-primary text-white'
                  : 'bg-white/[0.02] border-white/5 text-white/50 hover:bg-white/[0.04] hover:text-white'
              }`}
            >
              <Icon size={16} className={selected ? 'text-primary' : 'text-white/30'} />
              <div className="text-[10px] font-black tracking-widest mt-1">{opt.label}</div>
              <div className="text-[8px] text-white/40 mt-0.5 leading-tight">{opt.desc}</div>
            </button>
          )
        })}
      </div>

      {value === 'public' && (
        <div className="space-y-2 pl-1 animate-in fade-in duration-150">
          <label className="text-[10px] font-black tracking-widest text-white/40">Public display</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-xs font-semibold text-white cursor-pointer">
              <input
                type="radio"
                name="publicScope"
                checked={publicScope === 'name_only'}
                onChange={() => onPublicScopeChange('name_only')}
                className="accent-primary"
              />
              Name only
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-white cursor-pointer">
              <input
                type="radio"
                name="publicScope"
                checked={publicScope === 'full'}
                onChange={() => onPublicScopeChange('full')}
                className="accent-primary"
              />
              Full amount
            </label>
          </div>
        </div>
      )}
    </div>
  )
}
