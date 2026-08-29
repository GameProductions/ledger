import React, { useState } from 'react'
import { Sparkles, ScrollText, SlidersHorizontal, Save, FileText } from 'lucide-react'
import type { ParsingMode, TemplateDefinition } from '../../utils/import/types'

const TEMPLATE_STORAGE_KEY = 'ledger_import_templates'

export interface PredefinedFormat {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  extensions: string[]
}

export const PREDEFINED_FORMATS: PredefinedFormat[] = [
  {
    id: 'legacy-expense-tracker',
    name: 'Legacy Expense Tracker',
    description: 'Annual budget spreadsheet with paycheck blocks, monthly columns per person, and line-item expenses',
    icon: <ScrollText size={20} />,
    extensions: ['.xlsx', '.xls'],
  },
  {
    id: 'standard-csv',
    name: 'Standard CSV',
    description: 'Generic CSV file with transaction columns (Date, Description, Amount, Category)',
    icon: <FileText size={20} />,
    extensions: ['.csv'],
  },
]

function getSavedTemplates(): Record<string, TemplateDefinition> {
  try {
    const stored = localStorage.getItem(TEMPLATE_STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

interface Props {
  fileName: string
  onSelect: (mode: ParsingMode, predefinedFormat?: string, templateName?: string) => void
  onCancel: () => void
}

const ParsingModeSelect: React.FC<Props> = ({ fileName, onSelect, onCancel }) => {
  const [selectedMode, setSelectedMode] = useState<ParsingMode | null>(null)
  const [selectedFormat, setSelectedFormat] = useState<string>('')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')

  const savedTemplates = getSavedTemplates()
  const ext = fileName.split('.').pop()?.toLowerCase()

  const compatibleFormats = PREDEFINED_FORMATS.filter(
    (f) => !ext || f.extensions.some((e) => e.slice(1) === ext)
  )

  const handleConfirm = () => {
    if (!selectedMode) return
    if (selectedMode === 'predefined' && !selectedFormat) return
    if (selectedMode === 'template' && !selectedTemplate) return
    onSelect(
      selectedMode,
      selectedMode === 'predefined' ? selectedFormat : undefined,
      selectedMode === 'template' ? selectedTemplate : undefined
    )
  }

  const modes: { mode: ParsingMode; icon: React.ReactNode; name: string; description: string }[] = [
    {
      mode: 'auto',
      icon: <Sparkles size={24} />,
      name: 'Auto-Detect',
      description: 'Let the system figure out the format automatically',
    },
    {
      mode: 'predefined',
      icon: <ScrollText size={24} />,
      name: 'Pre-defined Format',
      description: 'Pick from known spreadsheet formats',
    },
    {
      mode: 'custom',
      icon: <SlidersHorizontal size={24} />,
      name: 'Custom Mapping',
      description: 'Manually map columns to fields',
    },
    {
      mode: 'template',
      icon: <Save size={24} />,
      name: 'Saved Template',
      description: 'Use a column mapping you saved before',
    },
  ]

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="text-center">
        <h3 className="text-2xl font-black italic tracking-tighter text-white">How do you want to parse this file?</h3>
        <p className="text-sm text-slate-400 font-medium mt-2">{fileName}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {modes.map(({ mode, icon, name, description }) => {
          const isSelected = selectedMode === mode
          return (
            <button
              key={mode}
              onClick={() => {
                setSelectedMode(mode)
                if (mode !== 'predefined') setSelectedFormat('')
                if (mode !== 'template') setSelectedTemplate('')
              }}
              className={`p-6 rounded-2xl border text-left transition-all group ${
                isSelected
                  ? 'border-emerald-500/50 bg-emerald-500/10 ring-1 ring-emerald-500/20'
                  : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all ${
                isSelected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-slate-500 group-hover:text-white'
              }`}>
                {icon}
              </div>
              <p className={`font-bold text-base mb-1 ${isSelected ? 'text-emerald-400' : 'text-white'}`}>{name}</p>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">{description}</p>

              {isSelected && mode === 'predefined' && (
                <div className="mt-4 space-y-2" onClick={(e) => e.stopPropagation()}>
                  {compatibleFormats.length === 0 ? (
                    <p className="text-xs text-amber-400">No compatible formats for this file type</p>
                  ) : (
                    compatibleFormats.map((f) => (
                      <label
                        key={f.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          selectedFormat === f.id
                            ? 'border-emerald-500/30 bg-emerald-500/10'
                            : 'border-white/5 hover:border-white/10'
                        }`}
                      >
                        <input
                          type="radio"
                          name="predefined-format"
                          value={f.id}
                          checked={selectedFormat === f.id}
                          onChange={() => setSelectedFormat(f.id)}
                          className="accent-emerald-500"
                        />
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400">
                            {f.icon}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{f.name}</p>
                            <p className="text-[10px] text-slate-500">{f.description}</p>
                          </div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              )}

              {isSelected && mode === 'template' && (
                <div className="mt-4 space-y-2" onClick={(e) => e.stopPropagation()}>
                  {Object.keys(savedTemplates).length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No saved templates yet. Import once with Custom Mapping and save as a template.</p>
                  ) : (
                    Object.keys(savedTemplates).map((name) => (
                      <label
                        key={name}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          selectedTemplate === name
                            ? 'border-emerald-500/30 bg-emerald-500/10'
                            : 'border-white/5 hover:border-white/10'
                        }`}
                      >
                        <input
                          type="radio"
                          name="saved-template"
                          value={name}
                          checked={selectedTemplate === name}
                          onChange={() => setSelectedTemplate(name)}
                          className="accent-emerald-500"
                        />
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400">
                            <Save size={14} />
                          </div>
                          <p className="text-sm font-bold text-white">{name}</p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex justify-end gap-4 pt-4 border-t border-white/5">
        <button onClick={onCancel} className="px-6 py-3 bg-white/5 text-white font-bold text-xs rounded-xl hover:bg-white/10 transition-all">
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={
            !selectedMode ||
            (selectedMode === 'predefined' && !selectedFormat) ||
            (selectedMode === 'template' && !selectedTemplate)
          }
          className="px-8 py-3 bg-emerald-500 text-black font-black text-xs rounded-xl hover:bg-emerald-400 transition-all disabled:opacity-30 disabled:pointer-events-none shadow-xl shadow-emerald-500/10"
        >
          {selectedMode === 'auto' ? 'Auto-Detect' : selectedMode === 'predefined' ? 'Use Format' : selectedMode === 'template' ? 'Use Template' : 'Start Mapping'}
        </button>
      </div>
    </div>
  )
}

export default ParsingModeSelect
