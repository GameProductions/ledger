import React, { useState, useCallback, useMemo } from 'react'
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, User, Building2, Tag, Wallet } from 'lucide-react'
import { parseLegacyExpenseTracker } from '../utils/import/legacyExpenseTrackerParser'
import type { ParsedLedgerData, EntityInput } from '../utils/import/types'
import { useEntityMatching } from '../utils/import/useEntityMatching'
import EntityMatchReview from './entity/EntityMatchReview'

interface Props {
  scope: 'household' | 'private'
  onImportComplete: () => void
}

const API_URL = '' // getApiUrl is called inline

export const LegacyExpenseTrackerImport: React.FC<Props> = ({ scope, onImportComplete }) => {
  const [file, setFile] = useState<File | null>(null)
  const [parsed, setParsed] = useState<ParsedLedgerData | null>(null)
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [committing, setCommitting] = useState(false)
  const [commitResult, setCommitResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [showMatchReview, setShowMatchReview] = useState(false)

  const [personMap, setPersonMap] = useState<Record<string, string>>({})
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({})
  const [providerMap, setProviderMap] = useState<Record<string, string>>({})
  const [accountMap, setAccountMap] = useState<Record<string, string>>({})
  const [expenseOverride, setExpenseOverride] = useState<Record<string, { isRecurring: boolean; categoryId: string | null }>>({})

  const [entityInputs, setEntityInputs] = useState<EntityInput[]>([])
  const match = useEntityMatching(entityInputs)

  const providers = useMemo(() => {
    const token = localStorage.getItem('ledger_token')
    if (!token) return []
    return []
  }, [])

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
    setShowMatchReview(false)

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

      const data = parseLegacyExpenseTracker(workbook, sheetName)
      setParsed(data)

      // Build entity inputs for matching
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

      const inputs: EntityInput[] = []
      if (Array.from(allPayees).length > 0) {
        inputs.push({ group: 'provider', names: Array.from(allPayees) })
      }
      if (Array.from(allCategories).length > 0) {
        inputs.push({ group: 'category', names: Array.from(allCategories) })
      }
      if (allocations.size > 0) {
        const accountNames = Array.from(allocations).map((key) => {
          const [bankName, accType] = key.split('||')
          return { name: bankName, accountType: accType }
        })
        inputs.push({
          group: 'account',
          names: accountNames.map((a) => a.name),
          context: Object.fromEntries(accountNames.map((a) => [a.name, { accountType: a.accountType }])),
        })
      }
      setEntityInputs(inputs)
      setShowMatchReview(true)

    } catch (e: any) {
      setParseError(e.message || 'Failed to parse spreadsheet')
    } finally {
      setParsing(false)
    }
  }, [])

  const handleMatchConfirm = useCallback(() => {
    const mapping = match.getFinalMapping()
    setProviderMap((prev) => ({ ...prev, ...mapping.providerMap }))
    setCategoryMap((prev) => ({ ...prev, ...mapping.categoryMap }))
    setAccountMap((prev) => ({ ...prev, ...mapping.accountMap }))
    setShowMatchReview(false)
  }, [match])

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
              const accountId = accountMap[key] || accountMap[alloc.bankName]
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
      const apiUrl = ''

      const res = await fetch(`${apiUrl}/api/data/import/confirm`, {
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

  const renderPaycheckBlock = (pc: any, idx: number) => {
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
                {(Object.entries(pc.income) as [string, number][])
                  .filter(([, v]) => v > 0)
                  .map(([name, val]) => `${name}: $${(val / 100).toFixed(2)}`)
                  .join(', ')}
              </span>
            </span>
          </div>
          {pc.expenses.length > 0 && (
            <div className="pt-2 border-t border-white/5">
              <p className="text-[10px] font-bold tracking-widest text-slate-500 mb-2">{pc.expenses.length} EXPENSES</p>
              {pc.expenses.slice(0, 10).map((exp: any, ei: number) => (
                <div key={ei} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{exp.payee || exp.billName}</p>
                    {exp.category && <p className="text-[10px] text-slate-500 truncate">{exp.category}</p>}
                  </div>
                  <span className="text-xs font-bold text-white shrink-0">${(exp.amountCents / 100).toFixed(2)}</span>
                </div>
              ))}
              {pc.expenses.length > 10 && <p className="text-xs text-slate-500 mt-2">+{pc.expenses.length - 10} more</p>}
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
        <button onClick={onImportComplete} className="px-8 py-3 bg-emerald-500 text-black font-black text-sm rounded-2xl hover:scale-105 transition-all">
          Done
        </button>
      </div>
    )
  }

  // Show entity match review modal
  if (showMatchReview && parsed) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="p-8 sm:p-12 rounded-[2.5rem] border border-amber-500/20 bg-black/40 backdrop-blur-3xl shadow-2xl">
          <div className="flex items-center gap-4 mb-8 border-b border-white/5 pb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <User size={20} />
            </div>
            <div>
              <h4 className="text-2xl font-black text-white italic tracking-tighter mb-1">Entity Match Review</h4>
              <p className="text-[10px] text-slate-500 font-black tracking-widest">
                {parsed.year} Ledger · {parsed.persons.join(' & ')}
              </p>
            </div>
          </div>
          <EntityMatchReview
            items={match.items}
            loading={match.loading}
            entityOptions={{
              provider: [],
              account: [],
              category: [],
              biller: [],
              'payment-method': [],
              subscription: [],
              person: parsed.persons.map((name) => ({ value: name, label: name.toUpperCase() })),
            }}
            onApproveAll={match.approveAll}
            onRejectAll={match.rejectAll}
            onUpdate={match.updateItem}
            onSetManualMatch={match.setManualMatch}
            onSetCreateNew={match.setCreateNew}
            onSetNewName={match.setNewName}
            onConfirm={handleMatchConfirm}
            onCancel={() => { setParsed(null); setFile(null); setShowMatchReview(false) }}
          />
        </div>
      </div>
    )
  }

  if (parsed) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-white italic">{parsed.year} Ledger</h3>
            <p className="text-xs text-slate-500">
              {parsed.persons.join(' & ')} · {parsed.paychecks.length} paycheck groups · {totalExpenseCount} expenses
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setParsed(null); setFile(null) }} className="px-5 py-2 bg-white/5 text-white font-bold text-xs rounded-xl hover:bg-white/10 transition-all">
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
            <p>{typeof error === 'string' ? error : (error as any)?.message || String(error)}</p>
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
                <select
                  value={personMap[personName] || ''}
                  onChange={(e) => setPersonMap((prev) => ({ ...prev, [personName]: e.target.value }))}
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500/50"
                >
                  <option value="">Select person...</option>
                  <option value="manual">Manual entry</option>
                </select>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-bold tracking-widest text-slate-500 flex items-center gap-2">
              <Building2 size={12} /> SUMMARY
            </p>
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Net Income:</span>
                <span className="text-emerald-400 font-bold">
                  {Object.entries(parsed.netIncome).map(([n, v]) => `${n}: $${(v / 100).toFixed(2)}`).join(', ')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Expenses:</span>
                <span className="text-red-400 font-bold">
                  {Object.entries(parsed.totalExpenses).map(([n, v]) => `${n}: $${(v / 100).toFixed(2)}`).join(', ')}
                </span>
              </div>
            </div>
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
      <input type="file" accept=".xlsx,.xls" onChange={handleFileInput} className="hidden" id="legacy-expense-tracker-input" />
      <label htmlFor="legacy-expense-tracker-input" className="cursor-pointer space-y-4">
        {parsing ? (
          <Loader2 size={48} className="mx-auto text-emerald-500 animate-spin" />
        ) : (
          <Upload size={48} className="mx-auto text-slate-600 group-hover:text-emerald-500 transition-all" />
        )}
        <div>
          <p className="text-lg font-bold text-white">
            {parsing ? 'Parsing spreadsheet...' : 'Drop your Legacy Expense Tracker here'}
          </p>
          <p className="text-sm text-slate-500 mt-1">or click to browse · .xlsx files only</p>
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
