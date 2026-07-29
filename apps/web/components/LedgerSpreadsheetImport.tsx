import React, { useState, useCallback, useMemo } from 'react'
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, ChevronDown, ChevronRight, User, Building2, Tag, Wallet } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { getApiUrl } from '../utils/api'
import { parseLedgerSpreadsheet } from '../utils/import/ledgerSpreadsheetParser'
import { suggestPersonMatch, suggestEntityMatch, suggestAccountMatch } from '../utils/import/entityResolver'
import type { ParsedLedgerData, PaycheckBlock } from '../utils/import/types'
import { SearchableSelect } from './ui/SearchableSelect'

interface Props {
  scope: 'household' | 'private'
  onImportComplete: () => void
}

const API_URL = getApiUrl()

export const LedgerSpreadsheetImport: React.FC<Props> = ({ scope, onImportComplete }) => {
  const [file, setFile] = useState<File | null>(null)
  const [parsed, setParsed] = useState<ParsedLedgerData | null>(null)
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [committing, setCommitting] = useState(false)
  const [commitResult, setCommitResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const [personMap, setPersonMap] = useState<Record<string, string>>({})
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({})
  const [providerMap, setProviderMap] = useState<Record<string, string>>({})
  const [accountMap, setAccountMap] = useState<Record<string, string>>({})
  const [expenseOverride, setExpenseOverride] = useState<Record<string, { isRecurring: boolean; categoryId: string | null }>>({})

  const { data: members = [] } = useApi<any[]>(
    scope === 'household' ? '/api/user/households' : null
  ) as any
  const { data: categories = [] } = useApi<any[]>('/api/financials/categories') as any
  const { data: accounts = [] } = useApi<any[]>('/api/financials/accounts') as any
  const { data: providers = [] } = useApi<any[]>('/api/user/service-providers') as any

  const householdMembers = useMemo(() => {
    if (!Array.isArray(members)) return []
    const all: { id: string; displayName: string; username: string }[] = []
    for (const m of members) {
      const membership = m.members || m
      if (Array.isArray(membership)) {
        for (const sub of membership) {
          if (sub.id || sub.userId) all.push({ id: sub.id || sub.userId, displayName: sub.displayName || sub.name || '', username: sub.username || '' })
        }
      } else if (membership.id || membership.userId) {
        all.push({ id: membership.id || membership.userId, displayName: membership.displayName || membership.name || '', username: membership.username || '' })
      }
    }
    return all
  }, [members])

  const memberOptions = useMemo(() => {
    return householdMembers.map((m: any) => ({ value: m.id, label: (m.displayName || m.username || m.name || '').toUpperCase() }))
  }, [householdMembers])

  const categoryOptions = useMemo(() => {
    return (Array.isArray(categories) ? categories : []).map((c: any) => ({ value: c.id, label: c.name.toUpperCase() }))
  }, [categories])

  const providerOptions = useMemo(() => {
    return (Array.isArray(providers) ? providers : []).map((p: any) => ({ value: p.name, label: p.name.toUpperCase() }))
  }, [providers])

  const accountOptions = useMemo(() => {
    return (Array.isArray(accounts) ? accounts : []).map((a: any) => ({ value: a.id, label: `${a.name} (${a.type})`.toUpperCase() }))
  }, [accounts])

  const handleFile = useCallback(async (f: File) => {
    setFile(f)
    setParsed(null)
    setParseError(null)
    setParsing(true)
    setPersonMap({})
    setCategoryMap({})
    setProviderMap({})
    setAccountMap({})
    setExpenseOverride({})

    try {
      const ext = f.name.split('.').pop()?.toLowerCase()
      if (ext !== 'xlsx' && ext !== 'xls') {
        setParseError('Please upload an Excel (.xlsx or .xls) file')
        setParsing(false)
        return
      }

      const ExcelJS = await import('exceljs')
      const buffer = await f.arrayBuffer()
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(buffer)

      const sheetName = workbook.worksheets[0]?.name
      if (!sheetName) {
        setParseError('Workbook has no sheets')
        setParsing(false)
        return
      }

      const data = parseLedgerSpreadsheet(workbook, sheetName)
      setParsed(data)

      const autoPersonMap: Record<string, string> = {}
      for (const personName of data.persons) {
        const match = suggestPersonMatch(personName, householdMembers)
        if (match) autoPersonMap[personName] = match.id
      }
      setPersonMap(autoPersonMap)

      const allPayees = new Set<string>()
      const allCategories = new Set<string>()
      const allocations = new Set<string>()

      for (const pc of data.paychecks) {
        for (const exp of pc.expenses) {
          if (exp.payee) allPayees.add(exp.payee)
          if (exp.category) allCategories.add(exp.category)
        }
        for (const alloc of pc.accountAllocations) {
          allocations.add(`${alloc.bankName}||${alloc.accountType}`)
        }
      }

      const autoCatMap: Record<string, string> = {}
      for (const catName of allCategories) {
        const match = suggestEntityMatch(catName, Array.isArray(categories) ? categories : [])
        if (match) autoCatMap[catName] = match.id
      }
      setCategoryMap(autoCatMap)

      const autoProviderMap: Record<string, string> = {}
      for (const payee of allPayees) {
        const match = suggestEntityMatch(payee, Array.isArray(providers) ? providers : [])
        if (match) autoProviderMap[payee] = match.name
      }
      setProviderMap(autoProviderMap)

      const autoAccountMap: Record<string, string> = {}
      for (const key of allocations) {
        const [bankName, accType] = key.split('||')
        const match = suggestAccountMatch(bankName, accType, Array.isArray(accounts) ? accounts : [])
        if (match) autoAccountMap[key] = match.id
      }
      setAccountMap(autoAccountMap)

    } catch (e: any) {
      setParseError(e.message || 'Failed to parse spreadsheet')
    } finally {
      setParsing(false)
    }
  }, [householdMembers, categories, providers, accounts])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }, [handleFile])

  const totalExpenseCount = useMemo(() => {
    if (!parsed) return 0
    return parsed.paychecks.reduce((acc, pc) => acc + pc.expenses.length, 0)
  }, [parsed])

  const buildPayload = useCallback(() => {
    if (!parsed) return null

    const allPayees = new Map<string, string>()
    for (const pc of parsed.paychecks) {
      for (const exp of pc.expenses) {
        if (exp.payee && providerMap[exp.payee]) {
          allPayees.set(exp.payee, providerMap[exp.payee])
        }
      }
    }

    return {
      type: 'ledger_spreadsheet' as const,
      scope,
      year: parsed.year,
      personMap,
      paychecks: parsed.paychecks.map((pc) => {
        const monthDates: Record<string, string> = {}
        for (const [month, date] of Object.entries(pc.dates)) {
          if (date) monthDates[month] = date
        }

        return {
          label: pc.label,
          monthDates,
          income: pc.income,
          additionalIncome: pc.additionalIncome,
          freeSpending: pc.freeSpending,
          accountAllocations: pc.accountAllocations
            .map((alloc) => {
              const key = `${alloc.bankName}||${alloc.accountType}`
              const accountId = accountMap[key]
              if (!accountId) return null
              const results: { bankName: string; accountType: string; userId: string; amountCents: number }[] = []
              for (const [personName, amountCents] of Object.entries(alloc.amounts)) {
                const ownerId = personMap[personName]
                if (ownerId && amountCents > 0) {
                  results.push({ bankName: alloc.bankName, accountType: alloc.accountType, userId: ownerId, amountCents })
                }
              }
              return results
            })
            .filter(Boolean)
            .flat(),
          expenses: pc.expenses.map((exp) => {
            const expenseKey = `${pc.label}::${exp.billName}`
            const override = expenseOverride[expenseKey] || {}
            const personOwnerId = exp.paidBy ? personMap[exp.paidBy] : null
            return {
              billName: exp.billName,
              payee: exp.payee,
              categoryId: override.categoryId ?? categoryMap[exp.category || ''] ?? null,
              dueDate: exp.dueDate || null,
              frequency: exp.frequency || null,
              ownerId: personOwnerId || Object.values(personMap)[0] || '',
              amountCents: exp.amountCents,
              notes: exp.notes || null,
              isRecurring: override.isRecurring ?? true,
              paycheckDate: null,
            }
          }),
        }
      }),
    }
  }, [parsed, scope, personMap, categoryMap, providerMap, accountMap, expenseOverride])

  const handleCommit = async () => {
    setError(null)
    setCommitting(true)
    try {
      const payload = buildPayload()
      if (!payload) {
        setError('Nothing to commit — parse a spreadsheet first')
        setCommitting(false)
        return
      }

      const token = localStorage.getItem('ledger_token')
      const householdId = localStorage.getItem('ledger_householdId')

      const res = await fetch(`${API_URL}/api/data/import/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-household-id': householdId || '',
        },
        body: JSON.stringify(payload),
      })

      const result = await res.json() as any
      if (!res.ok || !result.success) {
        setError(result.error || 'Import failed')
      } else {
        setCommitResult(result)
      }
    } catch (e: any) {
      setError(e.message || 'Network error')
    } finally {
      setCommitting(false)
    }
  }

  const renderPaycheckBlock = (pc: PaycheckBlock, idx: number) => {
    return (
      <div key={idx} className="border border-white/10 rounded-2xl overflow-hidden">
        <div className="bg-white/5 px-5 py-3 flex items-center justify-between">
          <span className="font-bold text-white">{pc.label}</span>
          <span className="text-xs text-slate-500">{Object.keys(pc.dates).length} months</span>
        </div>

        <div className="p-4 space-y-3 text-sm">
          <div className="flex flex-wrap gap-4 text-xs">
            <span className="text-slate-400">
              Income:{' '}
              <span className="text-emerald-400 font-bold">
                {Object.entries(pc.income)
                  .filter(([, v]) => v > 0)
                  .map(([name, val]) => `${name}: $${(val / 100).toFixed(2)}`)
                  .join(', ')}
              </span>
            </span>
            {pc.additionalIncome && (
              <span className="text-slate-400">
                Additional:{' '}
                <span className="text-emerald-400 font-bold">
                  {Object.entries(pc.additionalIncome)
                    .filter(([, v]) => v > 0)
                    .map(([name, val]) => `${name}: $${(val / 100).toFixed(2)}`)
                    .join(', ')}
                </span>
              </span>
            )}
            {pc.freeSpending && (
              <span className="text-slate-400">
                Free spending:{' '}
                <span className="text-emerald-400 font-bold">
                  {Object.entries(pc.freeSpending)
                    .filter(([, v]) => v > 0)
                    .map(([name, val]) => `${name}: $${(val / 100).toFixed(2)}`)
                    .join(', ')}
                </span>
              </span>
            )}
          </div>

          {pc.accountAllocations.length > 0 && (
            <div className="pt-2 border-t border-white/5">
              <p className="text-[10px] font-bold tracking-widest text-slate-500 mb-2">ACCOUNT ALLOCATIONS</p>
              {pc.accountAllocations.map((alloc, ai) => {
                const key = `${alloc.bankName}||${alloc.accountType}`
                const mappedId = accountMap[key]
                return (
                  <div key={ai} className="flex items-center gap-2 text-xs mb-1">
                    <Wallet size={12} className="text-slate-500 shrink-0" />
                    <span className="text-slate-400">{alloc.bankName} ({alloc.accountType})</span>
                    {mappedId ? (
                      <span className="text-emerald-500 text-[10px]">mapped</span>
                    ) : (
                      <span className="text-amber-500 text-[10px]">unmapped</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {pc.expenses.length > 0 && (
            <div className="pt-2 border-t border-white/5">
              <p className="text-[10px] font-bold tracking-widest text-slate-500 mb-2">
                {pc.expenses.length} EXPENSES
              </p>
              {pc.expenses.slice(0, 10).map((exp, ei) => {
                const expenseKey = `${pc.label}::${exp.billName}`
                const override = expenseOverride[expenseKey] || {}
                const isRecurring = override.isRecurring ?? true
                return (
                  <div
                    key={ei}
                    className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">
                        {exp.payee || exp.billName}
                      </p>
                      {exp.category && (
                        <p className="text-[10px] text-slate-500 truncate">{exp.category}</p>
                      )}
                    </div>
                    <span className="text-xs font-bold text-white shrink-0">
                      ${(exp.amountCents / 100).toFixed(2)}
                    </span>
                    <span className={`text-[10px] font-bold shrink-0 ${isRecurring ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {isRecurring ? 'bill' : 'once'}
                    </span>
                  </div>
                )
              })}
              {pc.expenses.length > 10 && (
                <p className="text-xs text-slate-500 mt-2">+{pc.expenses.length - 10} more</p>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (commitResult) {
    return (
      <div className="text-center py-12 space-y-6">
        <CheckCircle2 size={64} className="mx-auto text-emerald-500" />
        <h3 className="text-2xl font-black text-white italic">Import Complete</h3>
        <div className="text-slate-400 space-y-1 text-sm">
          <p>{commitResult.counts?.paySchedules || 0} pay schedules created</p>
          <p>{commitResult.counts?.bills || 0} bills created</p>
          <p>{commitResult.counts?.subscriptions || 0} one-time expenses recorded</p>
          <p>{commitResult.counts?.transactions || 0} transactions recorded</p>
        </div>
        <button
          onClick={onImportComplete}
          className="px-8 py-3 bg-emerald-500 text-black font-black text-sm rounded-2xl hover:scale-105 transition-all"
        >
          Done
        </button>
      </div>
    )
  }

  if (parsed) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-white italic">
              {parsed.year} Ledger
            </h3>
            <p className="text-xs text-slate-500">
              {parsed.persons.join(' & ')} &middot; {parsed.paychecks.length} paycheck groups &middot; {totalExpenseCount} expenses
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { setParsed(null); setFile(null) }}
              className="px-5 py-2 bg-white/5 text-white font-bold text-xs rounded-xl hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleCommit}
              disabled={committing}
              className="px-6 py-2 bg-emerald-500 text-black font-black text-xs rounded-xl hover:scale-105 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {committing && <Loader2 size={14} className="animate-spin" />}
              {committing ? 'Importing...' : 'Import to Ledger'}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-sm">
            <AlertCircle size={18} className="shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <p className="text-[10px] font-bold tracking-widest text-slate-500 flex items-center gap-2">
              <User size={12} /> PEOPLE MAPPING
            </p>
            {parsed.persons.map((personName) => (
              <div key={personName} className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-24 shrink-0">{personName}</span>
                <SearchableSelect
                  options={memberOptions}
                  value={personMap[personName] || ''}
                  onChange={(val) => setPersonMap((prev) => ({ ...prev, [personName]: val }))}
                  placeholder="Select household member..."
                />
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-bold tracking-widest text-slate-500 flex items-center gap-2">
              <Building2 size={12} /> PROVIDER MAPPING
            </p>
            {Array.from(new Set(parsed.paychecks.flatMap((pc) => pc.expenses.map((e) => e.payee).filter(Boolean)))).slice(0, 10).map((payee) => (
              <div key={payee} className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-24 truncate shrink-0">{payee}</span>
                <SearchableSelect
                  options={providerOptions}
                  value={providerMap[payee] || ''}
                  onChange={(val) => setProviderMap((prev) => ({ ...prev, [payee]: val }))}
                  placeholder="Select or type provider..."
                  onCreate={(val) => {
                    setProviderMap((prev) => ({ ...prev, [payee]: val }))
                    return val
                  }}
                />
              </div>
            ))}
            {Array.from(new Set(parsed.paychecks.flatMap((pc) => pc.expenses.map((e) => e.payee).filter(Boolean)))).length > 10 && (
              <p className="text-xs text-slate-500">+ more (scroll to see all)</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <p className="text-[10px] font-bold tracking-widest text-slate-500 flex items-center gap-2">
              <Tag size={12} /> CATEGORY MAPPING
            </p>
            {Array.from(new Set(parsed.paychecks.flatMap((pc) => pc.expenses.map((e) => e.category).filter(Boolean)))).map((cat) => (
              <div key={cat} className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-24 truncate shrink-0">{cat}</span>
                <SearchableSelect
                  options={categoryOptions}
                  value={categoryMap[cat || ''] || ''}
                  onChange={(val) => {
                    if (cat) setCategoryMap((prev) => ({ ...prev, [cat]: val }))
                  }}
                  placeholder="Select category..."
                  onCreate={async (name) => {
                    const token = localStorage.getItem('ledger_token')
                    const householdId = localStorage.getItem('ledger_householdId')
                    const res = await fetch(`${API_URL}/api/financials/categories`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'x-household-id': householdId || '' },
                      body: JSON.stringify({ name }),
                    })
                    const d = await res.json() as any
                    if (d.success) {
                      if (cat) setCategoryMap((prev) => ({ ...prev, [cat]: d.id }))
                      return d.id
                    }
                    return ''
                  }}
                />
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-bold tracking-widest text-slate-500 flex items-center gap-2">
              <Wallet size={12} /> ACCOUNT MAPPING
            </p>
            {Array.from(new Set(parsed.paychecks.flatMap((pc) => pc.accountAllocations.map((a) => `${a.bankName}||${a.accountType}`)))).map((key) => {
              const [bankName, accType] = key.split('||')
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-24 truncate shrink-0">{bankName} ({accType})</span>
                  <SearchableSelect
                    options={accountOptions}
                    value={accountMap[key] || ''}
                    onChange={(val) => setAccountMap((prev) => ({ ...prev, [key]: val }))}
                    placeholder="Select account..."
                    onCreate={async (name) => {
                      const token = localStorage.getItem('ledger_token')
                      const householdId = localStorage.getItem('ledger_householdId')
                      const res = await fetch(`${API_URL}/api/financials/accounts`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'x-household-id': householdId || '' },
                        body: JSON.stringify({ name, type: accType || 'checking' }),
                      })
                      const d = await res.json() as any
                      if (d.success) {
                        setAccountMap((prev) => ({ ...prev, [key]: d.id }))
                        return d.id
                      }
                      return ''
                    }}
                  />
                </div>
              )
            })}
          </div>
        </div>

        <p className="text-[10px] font-bold tracking-widest text-slate-500 flex items-center gap-2 mt-2">
          <FileText size={12} /> DETECTED PAYCHECK BLOCKS
        </p>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {parsed.paychecks.map((pc, idx) => renderPaycheckBlock(pc, idx))}
        </div>
      </div>
    )
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="border-2 border-dashed border-white/10 rounded-3xl p-16 text-center hover:border-emerald-500/30 transition-all cursor-pointer group"
    >
      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileInput}
        className="hidden"
        id="ledger-spreadsheet-input"
      />
      <label htmlFor="ledger-spreadsheet-input" className="cursor-pointer space-y-4">
        {parsing ? (
          <Loader2 size={48} className="mx-auto text-emerald-500 animate-spin" />
        ) : (
          <Upload size={48} className="mx-auto text-slate-600 group-hover:text-emerald-500 transition-all" />
        )}
        <div>
          <p className="text-lg font-bold text-white">
            {parsing ? 'Parsing spreadsheet...' : 'Drop your Ledger spreadsheet here'}
          </p>
          <p className="text-sm text-slate-500 mt-1">or click to browse &middot; .xlsx files only</p>
        </div>
      </label>

      {parseError && (
        <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-sm text-left max-w-md mx-auto">
          <AlertCircle size={18} className="shrink-0" />
          <p>{parseError}</p>
        </div>
      )}
    </div>
  )
}
