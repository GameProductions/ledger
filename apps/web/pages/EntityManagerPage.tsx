import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useApi, globalMutate } from '../hooks/useApi'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { MainLayout } from '../components/layout/MainLayout'
import { Modal } from '../components/ui/Modal'
import type { SearchableOption } from '../components/ui/SearchableSelect'
import { getApiUrl } from '../utils/api'
import { Price } from '../components/Price'
import { EntityActionButtons } from '../components/entity/EntityActionButtons'
import { EntityFormField } from '../components/entity/EntityFormField'
import { EntityFormSection } from '../components/entity/EntityFormSection'
import { LogoPreview } from '../components/ui/LogoPreview'
import { getFieldDefs, type FieldDef } from '../lib/entity-field-defs'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { 
  Tag, Building2, CreditCard, Wallet, Link2, GitMerge, CalendarClock, FileText,
  Banknote, Receipt, Clock,
  Plus, Check, Search, Trash2, History, AlertTriangle,
  DollarSign, Calendar, ToggleLeft, Database, FolderTree,
} from 'lucide-react'

const API = getApiUrl()

function getSafeValue(obj: any, key: string): any {
  if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
    return undefined;
  }
  return obj ? obj[key] : undefined;
}

function setSafeValue(obj: any, key: string, value: any): any {
  if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
    return obj;
  }
  if (obj) {
    obj[key] = value;
  }
  return obj;
}

function safeSpreadUpdate(obj: any, key: string, value: any): any {
  if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
    return { ...obj };
  }
  return { ...obj, [key]: value };
}

// ─── Generic CRUD helper ────────────────────────────────────────────
async function apiCall(token: string, householdId: string, method: string, path: string, body?: any) {
  const res = (await fetch(`${API}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'x-household-id': householdId || '' },
      body: body ? JSON.stringify(body) : undefined
    }) as any)
  return res.json()
}

const SECTION_ORDER = ['details', 'amounts', 'dates', 'organization', 'settings', 'notes', 'metadata'] as const

const SECTION_ICONS: Record<string, React.ReactNode> = {
  details: <FileText size={14} />,
  amounts: <DollarSign size={14} />,
  dates: <Calendar size={14} />,
  organization: <FolderTree size={14} />,
  settings: <ToggleLeft size={14} />,
  notes: <FileText size={14} />,
  metadata: <Database size={14} />,
}

const SECTION_COLORS: Record<string, string> = {
  details: 'blue',
  amounts: 'emerald',
  dates: 'amber',
  organization: 'violet',
  settings: 'slate',
  notes: 'indigo',
  metadata: 'slate',
}

const FIELD_SECTION = (f: FieldDef): string => {
  if (f.locked) return 'metadata'
  if (f.type === 'textarea') return 'notes'
  if (f.type === 'boolean') return 'settings'
  if (f.type === 'date') return 'dates'
  if (f.reference) return 'organization'
  if (f.type === 'cents' || f.type === 'number') return 'amounts'
  return 'details'
}

const WEBSITE_KEYS = new Set(['website', 'websiteUrl'])

const SCRAPE_FIELD_MAP: Record<string, Record<string, string>> = {
  '/api/financials/billers': { name: 'name', logoUrl: 'logoUrl', industry: 'description' },
  '/api/user/service-providers': { name: 'name', iconUrl: 'logoUrl' },
  '/api/financials/billing-processors': { name: 'name', brandingUrl: 'logoUrl' },
}

const CREATE_DEFAULTS: Record<string, Record<string, any>> = {
  '/api/financials/accounts': { type: 'checking' },
  '/api/user/payment-methods': { type: 'other' },
  '/api/planning/pay-schedules': { amountCents: 0, frequency: 'monthly' },
  '/api/planning/subscriptions': { amountCents: 0, billingCycle: 'monthly', nextBillingDate: new Date().toISOString().split('T')[0] },
}

const ENTITY_AUDIT_MAP: Record<string, string> = {
  accounts: 'accounts',
  bills: 'bills',
  billers: 'billers',
  'billing-processors': 'billing_processors',
  categories: 'categories',
  'charge-descriptors': 'charge_descriptors',
  'credit-cards': 'credit_cards',
  'installment-plans': 'installment_plans',
  lenders: 'service_providers',
  'linked-accounts': 'linked_accounts',
  'pairing-rules': 'pairing_rules',
  'pay-schedules': 'pay_schedules',
  'payment-methods': 'user_payment_methods',
  subscriptions: 'subscriptions',
}

// ─── Reusable Entity Manager ────────────────────────────────────────
interface EntityManagerProps {
  title: string
  icon: React.ReactNode
  apiPath: string
  fields: FieldDef[]
  displayFn: (item: any) => React.ReactNode
  idField?: string
  emptyMessage?: string
  scope?: 'household' | 'user'
  createPath?: string
  writePath?: string
  canWrite?: boolean
}

const EntityManager: React.FC<EntityManagerProps> = ({ title, icon, apiPath, fields: rawFields, displayFn, idField = 'id', emptyMessage, scope = 'household', createPath, writePath, canWrite = true }) => {
  const fields = rawFields.filter(f => !f.locked)
  const { token, householdId } = useAuth()
  const { showToast } = useToast()
  const reduced = useReducedMotion()
  const { data: items = [], loading, mutate } = (useApi(apiPath) as any)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [formData, setFormData] = useState<any>({})
  const [deleting, setDeleting] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [sortAsc, setSortAsc] = useState(true)
  const [refCache, setRefCache] = useState<Record<string, any[]>>({})
  const [historyItem, setHistoryItem] = useState<any>(null)
  const [historyLogs, setHistoryLogs] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const referencePaths = useMemo(() => {
    const paths = new Set<string>()
    fields.forEach(f => { if (f.reference) paths.add(f.reference.apiPath) })
    return Array.from(paths)
  }, [fields])

  useEffect(() => {
    if (!showForm || referencePaths.length === 0) return
    const missing = referencePaths.filter(p => !refCache[p] || !Array.isArray(refCache[p]))
    if (missing.length === 0) return
    Promise.all(missing.map(async path => {
      try {
        const res = await apiCall(token!, householdId!, 'GET', path)
        const data = res?.data ?? res
        return { path, data: Array.isArray(data) ? data : [] }
      } catch {
        return { path, data: [] }
      }
    })).then(results => {
      setRefCache(prev => {
        const next = { ...prev }
        results.forEach(r => { next[r.path] = r.data })
        return next
      })
    })
  }, [showForm, referencePaths, token, householdId])

  const handleCreateReference = useCallback(async (apiPath: string, search: string) => {
    const defaults = CREATE_DEFAULTS[apiPath] || {}
    const res = await apiCall(token!, householdId!, 'POST', apiPath, { name: search, ...defaults })
    const newItem = res?.data ?? res
    setRefCache(prev => ({
      ...prev,
      [apiPath]: [...(prev[apiPath] || []), newItem]
    }))
    return newItem?.id
  }, [token, householdId])

  const handleScrapeWebsite = useCallback(async (url: string) => {
    try {
      const res = await apiCall(token!, householdId!, 'POST', '/api/data/scrape', { url })
      const data = res?.data ?? res
      if (!data) return
      const fieldMap = SCRAPE_FIELD_MAP[apiPath]
      if (!fieldMap) return
      const updates: Record<string, any> = {}
      Object.entries(fieldMap).forEach(([fieldKey, scrapeKey]) => {
        const val = data[scrapeKey]
        if (val) updates[fieldKey] = val
      })
      if (Object.keys(updates).length > 0) {
        setFormData((prev: any) => ({ ...prev, ...updates }))
        showToast('Site details fetched', 'success')
      }
    } catch {
      showToast('Failed to fetch site details', 'error')
    }
  }, [token, householdId, apiPath, showToast])

  const openHistory = async (item: any) => {
    setHistoryItem(item)
    setHistoryLoading(true)
    setHistoryLogs([])
    try {
      const res = await apiCall(token!, householdId!, 'GET', '/api/user/audit')
      const auditType = ENTITY_AUDIT_MAP[apiPath.split('/').pop() || ''] || ''
      const itemId = getSafeValue(item, idField)
      const logs: any[] = res?.data || res || []
      setHistoryLogs(logs.filter((l: any) => l.target_type === auditType && l.target_id === itemId))
    } catch { /* ignore */ }
    setHistoryLoading(false)
  }

  const resetForm = () => { setFormData({}); setEditing(null); setShowForm(false) }
  
  const openEdit = (item: any) => {
    const data: any = {}
    fields.forEach(f => {
      const val = getSafeValue(item, f.key)
      if (f.type === 'cents' && val !== undefined) {
        setSafeValue(data, f.key, val / 100)
      } else {
        setSafeValue(data, f.key, val ?? '')
      }
    })
    setFormData(data)
    setEditing(item)
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload: any = {}
    fields.forEach(f => {
      const v = getSafeValue(formData, f.key)
      if (v === undefined || v === '') return
      if (f.type === 'cents') {
        setSafeValue(payload, f.key, Math.round(parseFloat(v) * 100))
      } else if (f.type === 'number') {
        setSafeValue(payload, f.key, parseFloat(v))
      } else if (f.type === 'boolean') {
        setSafeValue(payload, f.key, v === true || v === 'true')
      } else {
        setSafeValue(payload, f.key, v)
      }
    })
    
    if (editing) {
      await apiCall(token!, householdId!, 'PATCH', `${writePath || apiPath}/${getSafeValue(editing, idField)}`, payload)
      showToast(`${title.slice(0, -1)} updated`, 'success')
    } else {
      await apiCall(token!, householdId!, 'POST', createPath || writePath || apiPath, payload)
      showToast(`${title.slice(0, -1)} created`, 'success')
    }
    resetForm()
    mutate();
    globalMutate();
  }

  const handleDelete = async (id: string) => {
    await apiCall(token!, householdId!, 'DELETE', `${writePath || apiPath}/${id}`)
    showToast(`${title.slice(0, -1)} removed`, 'success')
    setDeleting(null)
    mutate();
    globalMutate();
  }

  useEffect(() => { setPage(0) }, [search])

  useEffect(() => {
    if (!showForm && !deleting && !historyItem) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [showForm, deleting, historyItem])

  const sortItems = (list: any[]) =>
    [...list].sort((a, b) => {
      const cmp = (a.name || a.pattern || '').localeCompare(b.name || b.pattern || '')
      return sortAsc ? cmp : -cmp
    })

  const filtered = sortItems(search
    ? (items || []).filter((item: any) => JSON.stringify(item).toLowerCase().includes(search.toLowerCase()))
    : items || [])

  const sectionGroups = useMemo(() => {
    const groups: Record<string, FieldDef[]> = {}
    fields.forEach(f => {
      const s = FIELD_SECTION(f)
      if (!groups[s]) groups[s] = []
      groups[s].push(f)
    })
    return groups
  }, [fields])

  const refOptions = useMemo(() => {
    const map: Record<string, SearchableOption[]> = {}
    Object.keys(refCache).forEach(path => {
      map[path] = (refCache[path] || []).map((ref: any) => ({
        value: ref.id,
        label: ref.name || ref.id,
        ...(ref.iconUrl || ref.logoUrl || ref.brandingUrl ? {
          icon: <img src={ref.iconUrl || ref.logoUrl || ref.brandingUrl} className="w-full h-full object-cover" />
        } : {}),
      }))
    })
    return map
  }, [refCache])

  return (
    <>
      <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">{icon}</div>
          <div>
            <h3 className="text-lg font-black tracking-tight">{title}</h3>
            <span className="text-[10px] font-bold tracking-widest text-white/40">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
          </div>
          <button onClick={() => { setSortAsc(s => !s); setPage(0) }} className="text-[10px] font-black tracking-widest text-white/30 hover:text-white/60 transition-colors ml-auto mr-3" title="Toggle sort order">
            A–Z {sortAsc ? '↑' : '↓'}
          </button>
        </div>
        {canWrite && (
          <button onClick={() => { resetForm(); setShowForm(true) }} className="flex items-center gap-2 px-4 py-2 bg-primary/20 border border-primary/30 rounded-xl text-xs font-black tracking-widest text-primary hover:bg-primary/30 transition-all">
            <Plus size={14} /> Add
          </button>
        )}
      </div>

      {(() => { const desc = ENTITY_CONFIGS.find(c => c.label === title)?.description; return desc ? <p className="text-xs text-white/40 font-medium leading-relaxed">{desc}</p> : null })()}

      {/* Search */}
      {(items || []).length > 4 && (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${title.toLowerCase()}...`} className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm" />
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="py-12 text-center text-white/30 text-sm">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-white/30 text-sm">{emptyMessage || (canWrite ? `No ${title.toLowerCase()} yet. Click Add to create one.` : `No ${title.toLowerCase()} yet.`)}</div>
      ) : (
        <>
        <div className="space-y-2">
          {filtered.slice(page * pageSize, (page + 1) * pageSize).map((item: any) => {
            const itemId = getSafeValue(item, idField);
            return (
              <div key={itemId} className="group flex items-center justify-between p-4 bg-white/[0.03] border border-white/5 rounded-xl hover:bg-white/[0.06] transition-all">
                <div className="flex-1 min-w-0">{displayFn(item)}</div>
                <EntityActionButtons onHistory={() => openHistory(item)} onEdit={canWrite ? () => openEdit(item) : undefined} onDelete={canWrite ? () => setDeleting(itemId) : undefined} />
              </div>
            );
          })}
        </div>
        {filtered.length > pageSize && (
          <div className="flex items-center justify-between pt-2 text-xs text-white/40">
            <span>{filtered.length} records</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-2 py-1 rounded hover:bg-white/10 disabled:opacity-30">Prev</button>
              <span>Page {page + 1} of {Math.ceil(filtered.length / pageSize)}</span>
              <button onClick={() => setPage(p => Math.min(Math.ceil(filtered.length / pageSize) - 1, p + 1))} disabled={page >= Math.ceil(filtered.length / pageSize) - 1} className="px-2 py-1 rounded hover:bg-white/10 disabled:opacity-30">Next</button>
              <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(0) }} className="bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-xs">
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        )}
        </>
      )}
    </div>
    <Modal isOpen={showForm} onClose={resetForm} title={editing ? `Edit ${title.slice(0, -1)}` : `New ${title.slice(0, -1)}`} maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {SECTION_ORDER.map(section => {
          const sectionFields = sectionGroups[section]
          if (!sectionFields || sectionFields.length === 0) return null

          return (
            <EntityFormSection
              key={section}
              title={section.charAt(0).toUpperCase() + section.slice(1)}
              icon={SECTION_ICONS[section]}
              color={SECTION_COLORS[section]}
              defaultOpen={section !== 'metadata'}
              columns={section === 'notes' || section === 'settings' ? 1 : 2}
            >
              {sectionFields.map(f => (
                <EntityFormField
                  key={f.key}
                  field={f}
                  value={getSafeValue(formData, f.key)}
                  onChange={v => setFormData(safeSpreadUpdate(formData, f.key, v))}
                  referenceOptions={f.reference ? refOptions[f.reference.apiPath] : undefined}
                  onCreateReference={f.reference ? (s: string) => handleCreateReference(f.reference!.apiPath, s) : undefined}
                  onScrapeWebsite={WEBSITE_KEYS.has(f.key) ? handleScrapeWebsite : undefined}
                />
              ))}
            </EntityFormSection>
          )
        })}
        <div className="flex items-center justify-between pt-4">
          <button type="button" onClick={resetForm} className="px-4 py-2 text-sm text-white/40 hover:text-white/80 transition-colors">Cancel</button>
          <button type="submit" className="flex items-center gap-2 px-6 py-3 bg-primary rounded-xl text-sm font-bold text-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/20">
            <Check size={16} /> {editing ? 'Save Changes' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>

    <Modal isOpen={!!deleting} onClose={() => setDeleting(null)} title="Confirm Removal" footer={
      <>
        <button onClick={() => setDeleting(null)} className="px-4 py-2 text-sm text-white/40 hover:text-white/80 transition-colors">Cancel</button>
        <button onClick={() => deleting && handleDelete(deleting)} className="flex items-center gap-2 px-6 py-3 bg-red-600 rounded-xl text-sm font-bold text-white hover:bg-red-500 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-red-500/20">
          <Trash2 size={16} /> Remove Permanently
        </button>
      </>
    }>
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
          <AlertTriangle size={24} className="text-red-400" />
        </div>
        <div>
          <p className="font-bold text-white/90">Are you absolutely sure?</p>
          <p className="text-sm text-white/50 mt-1 leading-relaxed">
            This will permanently remove this {title.slice(0, -1).toLowerCase()} and all associated data. This action cannot be undone.
          </p>
        </div>
      </div>
    </Modal>

    <Modal isOpen={!!historyItem} onClose={() => setHistoryItem(null)} title="Audit History">
      {historyLoading ? (
        <div className="py-12 text-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin mx-auto mb-3" />
          <div className="text-sm text-white/40">Loading audit trail...</div>
        </div>
      ) : historyLogs.length === 0 ? (
        <div className="py-12 text-center">
          <History size={32} className="text-white/10 mx-auto mb-3" />
          <p className="text-sm text-white/30 font-medium">No audit history for this record.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {historyLogs.map((log: any) => {
            const isCreate = log.action?.toLowerCase().includes('create');
            const isDelete = log.action?.toLowerCase().includes('delete');
            let borderClass = 'border-blue-500/10';
            let textClass = 'text-blue-400';
            if (isCreate) { borderClass = 'border-emerald-500/10'; textClass = 'text-emerald-400'; }
            if (isDelete) { borderClass = 'border-red-500/10'; textClass = 'text-red-400'; }
            return (
              <div key={log.id} className={`p-4 bg-white/[0.03] border ${borderClass} rounded-xl`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-black tracking-widest ${textClass} uppercase`}>{log.action}</span>
                  <span className="text-[10px] text-white/30 font-mono">{log.created_at ? new Date(log.created_at).toLocaleString() : '—'}</span>
                </div>
                {log.actor_name && (
                  <div className="text-xs text-white/40 flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                    by {log.actor_name}
                  </div>
                )}
                {log.details_json && (
                  <pre className="mt-2 text-xs text-white/25 font-mono whitespace-pre-wrap bg-black/40 p-3 rounded-xl border border-white/5">{JSON.stringify(log.details_json, null, 2)}</pre>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Modal>
    </>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────
type TabKey = 'accounts' | 'bills' | 'billers' | 'billing-processors' | 'categories' | 'charge-descriptors' | 'credit-cards' | 'installment-plans' | 'lenders' | 'linked-accounts' | 'pairing-rules' | 'pay-schedules' | 'payment-methods' | 'subscriptions'

interface EntityConfig {
  key: TabKey
  label: string
  description: string
  icon: React.ReactNode
  apiPath: string
  createPath?: string
  scope?: 'household' | 'user'
  writePath?: string
  displayFn: (item: any) => React.ReactNode
}

const ENTITY_CONFIGS: EntityConfig[] = [
  {
    key: 'accounts', label: 'Funding Sources', description: 'Bank accounts, savings, and other places your money lives',
    icon: <Wallet size={18} />, apiPath: '/api/financials/accounts',
    displayFn: (acc: any) => (
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${acc.status === 'closed' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
          {acc.type?.slice(0, 2) || '??'}
        </div>
        <div>
          <div className="font-bold text-sm flex items-center gap-2">
            {acc.name}
            {acc.status === 'closed' && <span className="text-[8px] font-black tracking-widest px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">Closed</span>}
          </div>
          <div className="text-[10px] text-white/40 font-medium">
            <Price amountCents={acc.balanceCents || acc.balance_cents} /> · {acc.type} · {acc.currency || 'USD'}
          </div>
        </div>
      </div>
    ),
  },
  {
    key: 'bills', label: 'Bills', description: 'Recurring and one-time bills with due dates and amounts',
    icon: <Banknote size={18} />, apiPath: '/api/planning/bills',
    displayFn: (bill: any) => (
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
          bill.status === 'paid'
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : bill.status === 'cancelled'
            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
        }`}>
          <Banknote size={14} />
        </div>
        <div>
          <div className="font-bold text-sm flex items-center gap-2">
            {bill.name}
            {bill.isRecurring && <span className="text-[8px] font-black tracking-widest px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">Recurring</span>}
          </div>
          <div className="text-[10px] text-white/40 font-medium">
            <Price amountCents={bill.amountCents} /> · Due: {bill.dueDate} · {bill.status}
          </div>
        </div>
      </div>
    ),
  },
  {
    key: 'billers', label: 'Billers', description: 'Companies or individuals you pay bills to',
    icon: <Building2 size={18} />, apiPath: '/api/financials/billers',
    displayFn: (biller: any) => (
      <div className="flex items-center gap-3">
        <LogoPreview src={biller.logoUrl} name={biller.name} size={32} className="bg-white/5 border border-white/10" />
        <div>
          <div className="font-bold text-sm">{biller.name}</div>
          <div className="text-[10px] text-white/40 font-medium">{biller.industry || 'Unknown Industry'}</div>
        </div>
      </div>
    ),
  },
  {
    key: 'billing-processors', label: 'Billing Processors', description: 'Payment processing networks like Stripe, PayPal, etc.',
    icon: <CreditCard size={18} />, apiPath: '/api/financials/billing-processors', writePath: '/api/admin/billing/networks',
    displayFn: (bp: any) => (
      <div className="flex items-center gap-3">
        <LogoPreview src={bp.brandingUrl} name={bp.name} size={32} className="bg-sky-500/10 border border-sky-500/20" />
        <div>
          <div className="font-bold text-sm">{bp.name}</div>
          <div className="text-[10px] text-white/40 font-medium">{bp.websiteUrl || '-'}</div>
        </div>
      </div>
    ),
  },
  {
    key: 'categories', label: 'Categories', description: 'Organize your spending into groups like Groceries, Utilities, etc.',
    icon: <Tag size={18} />, apiPath: '/api/financials/categories',
    displayFn: (cat: any) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ background: cat.color ? `${cat.color}20` : 'rgba(255,255,255,0.05)', borderColor: cat.color || 'rgba(255,255,255,0.1)', borderWidth: 1 }}>
          {cat.icon || '📁'}
        </div>
        <div>
          <div className="font-bold text-sm">{cat.name}</div>
          <div className="text-[10px] text-white/40 font-medium">
            Budget: <Price amountCents={cat.envelopeBalanceCents || cat.monthlyBudgetCents || 0} />
            {cat.rolloverEnabled ? ' · Rollover' : ''}
          </div>
        </div>
      </div>
    ),
  },
  {
    key: 'charge-descriptors', label: 'Charge Descriptors', description: 'Transaction description patterns used for auto-categorization',
    icon: <FileText size={18} />, apiPath: '/api/financials/charge-descriptors',
    displayFn: (cd: any) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
          <FileText size={14} />
        </div>
        <div>
          <div className="font-bold text-sm">{cd.name}</div>
          <div className="text-[10px] text-white/40 font-medium">{cd.description || 'No description'}{cd.isActive === false ? ' · Inactive' : ' · Active'}</div>
        </div>
      </div>
    ),
  },
  {
    key: 'credit-cards', label: 'Credit Cards', description: 'Credit card accounts with limits, statement dates, and payment due dates',
    icon: <CreditCard size={18} />, apiPath: '/api/financials/credit-cards',
    displayFn: (card: any) => (
      <div>
        <div className="font-bold text-sm">Credit Card</div>
        <div className="text-[10px] text-white/40 font-medium">
          Limit: <Price amountCents={card.credit_limit_cents} /> · Statement Day: {card.statementClosingDay} · Due Day: {card.paymentDueDay}
        </div>
      </div>
    ),
  },
  {
    key: 'installment-plans', label: 'Installment Plans', description: 'Buy now, pay later plans and installment agreements',
    icon: <CalendarClock size={18} />, apiPath: '/api/planning/installment-plans',
    displayFn: (plan: any) => (
      <div>
        <div className="font-bold text-sm">{plan.name}</div>
        <div className="text-[10px] text-white/40 font-medium">
          <Price amountCents={plan.installmentAmountCents} />/installment · {plan.remainingInstallments}/{plan.totalInstallments} remaining · {plan.frequency} · Next: {plan.nextPayDate}
        </div>
      </div>
    ),
  },
  {
    key: 'lenders', label: 'Lenders', description: 'Banks, credit unions, and other lending institutions',
    icon: <Building2 size={18} />, apiPath: '/api/user/service-providers',
    displayFn: (p: any) => (
      <div className="flex items-center gap-3">
        <LogoPreview src={p.iconUrl} name={p.name} size={32} className="bg-blue-500/10 border border-blue-500/20" />
        <div>
          <div className="font-bold text-sm flex items-center gap-2">
            {p.name}
            {p.status === 'active' ? (
              <span className="text-[8px] font-black tracking-widest px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded">Active</span>
            ) : (
              <span className="text-[8px] font-black tracking-widest px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">Inactive</span>
            )}
          </div>
          <div className="text-[10px] text-white/40 font-medium">
            {p.visibility} · {p.defaultCategoryId ? `Category: ${p.defaultCategoryId.slice(0, 8)}...` : 'No default category'}
          </div>
        </div>
      </div>
    ),
  },
  {
    key: 'linked-accounts', label: 'Linked Accounts', description: 'External service accounts connected to your subscriptions',
    icon: <Link2 size={18} />, apiPath: '/api/user/linked-accounts', scope: 'user',
    displayFn: (la: any) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
          <Link2 size={14} />
        </div>
        <div>
          <div className="font-bold text-sm">{la.providerName || la.custom_label || 'Linked Account'}</div>
          <div className="text-[10px] text-white/40 font-medium">
            {la.emailAttached || 'No email'} · <span className={la.status === 'active' ? 'text-emerald-400' : 'text-amber-400'}>{la.status || 'unknown'}</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    key: 'pairing-rules', label: 'Pairing Rules', description: 'Rules that automatically match and reconcile transactions',
    icon: <GitMerge size={18} />, apiPath: '/api/financials/pairing-rules',
    displayFn: (rule: any) => (
      <div>
        <div className="font-bold text-sm font-mono">{rule.pattern}</div>
        <div className="text-[10px] text-white/40 font-medium">
          {rule.targetProviderId ? `Provider: ${rule.targetProviderId.slice(0, 8)}...` : ''}
          {rule.targetCategoryId ? ` · Category: ${rule.targetCategoryId.slice(0, 8)}...` : ''}
          {rule.autoConfirm ? ' · Auto-confirm' : ''}
          {rule.visibility ? ` · ${rule.visibility}` : ''}
        </div>
      </div>
    ),
  },
  {
    key: 'pay-schedules', label: 'Pay Schedules', description: 'Regular income schedules like salary, freelance payments, etc.',
    icon: <Clock size={18} />, apiPath: '/api/planning/pay-schedules',
    displayFn: (ps: any) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
          <Clock size={14} />
        </div>
        <div>
          <div className="font-bold text-sm">{ps.name}</div>
          <div className="text-[10px] text-white/40 font-medium">
            <Price amountCents={ps.estimatedAmountCents} /> · {ps.frequency} · Next: {ps.nextPayDate || '—'}
          </div>
        </div>
      </div>
    ),
  },
  {
    key: 'payment-methods', label: 'Payment Methods', description: 'Cards, bank transfers, and other ways you pay for things',
    icon: <Wallet size={18} />, apiPath: '/api/user/payment-methods', scope: 'user',
    displayFn: (pm: any) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
          <CreditCard size={14} />
        </div>
        <div>
          <div className="font-bold text-sm">{pm.name || pm.type}</div>
          <div className="text-[10px] text-white/40 font-medium">{pm.type}{pm.lastFour ? ` · ****${pm.lastFour}` : ''}</div>
        </div>
      </div>
    ),
  },
  {
    key: 'subscriptions', label: 'Subscriptions', description: 'Recurring subscription services with billing cycles',
    icon: <Receipt size={18} />, apiPath: '/api/planning/subscriptions',
    displayFn: (sub: any) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
          <Receipt size={14} />
        </div>
        <div>
          <div className="font-bold text-sm flex items-center gap-2">
            {sub.name}
            {sub.isTrial && <span className="text-[8px] font-black tracking-widest px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">Trial</span>}
          </div>
          <div className="text-[10px] text-white/40 font-medium">
            <Price amountCents={sub.amountCents} />/{sub.billingCycle} · Next: {sub.nextBillingDate || '—'} · {sub.paymentMode}
          </div>
        </div>
      </div>
    ),
  },
]

const EntityManagerPage: React.FC = () => {
  const { globalRole } = useAuth() as any
  const isPlatformOwner = globalRole === 'owner'
  const [activeTab, setActiveTab] = useState<TabKey>('accounts')
  const [sortAlpha, setSortAlpha] = useState(false)

  const sortedConfigs = useMemo(() => {
    if (!sortAlpha) return ENTITY_CONFIGS
    return [...ENTITY_CONFIGS].sort((a, b) => a.label.localeCompare(b.label))
  }, [sortAlpha])

  const renderTab = () => {
    const config = ENTITY_CONFIGS.find(c => c.key === activeTab)
    if (!config) return null
    return (
      <EntityManager
        title={config.label}
        icon={config.icon}
        apiPath={config.apiPath}
        fields={getFieldDefs(config.key)}
        displayFn={config.displayFn}
        scope={config.scope}
        createPath={config.createPath}
        writePath={config.writePath}
        canWrite={!config.writePath || isPlatformOwner}
      />
    )
  }

  return (
    <MainLayout title="Entity Manager" subtitle="Manage your financial entities">
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 max-w-7xl mx-auto">
        {/* Sidebar Nav */}
        <nav className="bg-white/[0.02] border border-white/5 rounded-2xl p-3 h-fit lg:sticky lg:top-6">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-[9px] font-black tracking-[0.2em] text-white/30">Entity Types</span>
            <button
              onClick={() => setSortAlpha(s => !s)}
              className="text-[9px] font-black tracking-widest text-white/20 hover:text-white/50 transition-colors"
              title={sortAlpha ? 'Sort by default order' : 'Sort A–Z'}
            >
              {sortAlpha ? 'A–Z ↑' : 'A–Z ↓'}
            </button>
          </div>
          <div className="space-y-1">
            {sortedConfigs.map(cfg => (
              <button
                key={cfg.key}
                onClick={() => setActiveTab(cfg.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === cfg.key
                    ? 'bg-primary/15 text-primary border border-primary/20'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5 border border-transparent'
                }`}
              >
                {cfg.icon}
                {cfg.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Content */}
        <div className="min-w-0">
          {renderTab()}
      </div>
      </div>
    </MainLayout>
  )
}

export default EntityManagerPage
