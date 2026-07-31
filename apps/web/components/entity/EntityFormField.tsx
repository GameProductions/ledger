import React, { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { SearchableSelect, type SearchableOption } from '../ui/SearchableSelect'
import { LogoPreview } from '../ui/LogoPreview'
import type { FieldDef } from '../../lib/entity-field-defs'

const WEBSITE_KEYS = new Set(['website', 'websiteUrl'])
const LOGO_KEYS = new Set(['iconUrl', 'logoUrl', 'brandingUrl'])

interface EntityFormFieldProps {
  field: FieldDef
  value: any
  onChange: (value: any) => void
  referenceOptions?: SearchableOption[]
  onCreateReference?: (search: string) => Promise<string | void>
  onScrapeWebsite?: (url: string) => Promise<Record<string, any> | void>
}

export const EntityFormField: React.FC<EntityFormFieldProps> = ({
  field, value, onChange, referenceOptions, onCreateReference, onScrapeWebsite,
}) => {
  const id = `em-${field.key}`
  const [scraping, setScraping] = useState(false)
  const isWebsite = onScrapeWebsite && WEBSITE_KEYS.has(field.key)
  const isLogo = LOGO_KEYS.has(field.key)
  const hasLogoUrl = isLogo && value && typeof value === 'string' && value.trim()

  if (field.reference) {
    return (
      <div>
        <label htmlFor={id} className="text-[10px] font-black tracking-widest text-white/40 block mb-1.5 uppercase">{field.label}</label>
        <SearchableSelect
          options={referenceOptions || []}
          value={value ?? ''}
          onChange={onChange}
          placeholder={`Select ${field.label}...`}
          onCreate={onCreateReference}
        />
      </div>
    )
  }

  if (field.type === 'select') {
    return (
      <div>
        <label htmlFor={id} className="text-[10px] font-black tracking-widest text-white/40 block mb-1.5 uppercase">{field.label}</label>
        <SearchableSelect
          options={(field.options || []).map(o => ({ value: o.value, label: o.label }))}
          value={value ?? ''}
          onChange={onChange}
          placeholder="Select..."
        />
      </div>
    )
  }

  if (field.type === 'boolean') {
    const checked = value === true || value === 'true' || value === 1
    return (
      <div>
        <label htmlFor={id} className="text-[10px] font-black tracking-widest text-white/40 block mb-1.5 uppercase">{field.label}</label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            id={id}
            type="checkbox"
            checked={checked}
            onChange={e => onChange(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-10 h-5 bg-white/10 rounded-full peer peer-checked:bg-primary transition-colors relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white/40 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5 peer-checked:after:bg-white" />
          <span className="text-sm text-white/60">{checked ? 'Enabled' : 'Disabled'}</span>
        </label>
      </div>
    )
  }

  if (field.type === 'textarea') {
    return (
      <div>
        <label htmlFor={id} className="text-[10px] font-black tracking-widest text-white/40 block mb-1.5 uppercase">{field.label}</label>
        <textarea
          id={id}
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder || field.label}
          rows={3}
          className="w-full p-3 bg-white/5 border border-glass-border rounded-xl text-sm focus:border-primary transition-all resize-none"
        />
      </div>
    )
  }

  const handleScrape = async () => {
    if (!value || typeof value !== 'string' || !value.trim()) return
    setScraping(true)
    try {
      await onScrapeWebsite!(value.trim())
    } finally {
      setScraping(false)
    }
  }

  return (
    <div>
      <label htmlFor={id} className="text-[10px] font-black tracking-widest text-white/40 block mb-1.5 uppercase">{field.label}</label>
      <div className="relative">
        <input
          id={id}
          type={field.type === 'cents' ? 'number' : field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
          step={field.type === 'cents' ? '0.01' : field.type === 'number' ? 'any' : undefined}
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder || field.label}
          className={`w-full p-3 bg-white/5 border border-glass-border rounded-xl text-sm focus:border-primary transition-all ${isWebsite ? 'pr-14' : isLogo && hasLogoUrl ? 'pl-14' : ''}`}
        />
        {hasLogoUrl && (
          <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
            <LogoPreview src={value} size={28} />
          </div>
        )}
        {isWebsite && value && typeof value === 'string' && value.trim() && (
          <button
            type="button"
            onClick={handleScrape}
            disabled={scraping}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2.5 py-1.5 bg-primary/20 border border-primary/30 rounded-lg text-[10px] font-black tracking-widest text-primary hover:bg-primary/30 transition-all disabled:opacity-50"
            title="Fetch site details to auto-fill fields"
          >
            {scraping ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            <span className="hidden sm:inline">Fetch</span>
          </button>
        )}
      </div>
    </div>
  )
}
