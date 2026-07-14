import React, { useState } from 'react'
import { useApi, globalMutate } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { Modal } from '../../components/ui/Modal'
import AdminPortal from './AdminPortal'
import { getApiUrl } from '../../utils/api'
import { 
  Shield, Tag, Wallet, CreditCard, Link2, CalendarClock, Receipt, Clock, Banknote, Building2,
  Plus, Pencil, Trash2, Search, Check, Filter, Eye, FileText, ChevronDown
} from 'lucide-react'

const API = getApiUrl()

// Helper for Owner actions
const adminRequest = async (secureFetch: any, method: string, path: string, body?: any) => {
  const res = (await secureFetch(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    }) as any)
  return res.json()
}

type EntityType = 'categories' | 'accounts' | 'credit-cards' | 'payment-methods' | 'linked-accounts' | 'subscriptions' | 'bills' | 'installment-plans' | 'pay-schedules' | 'pairing-rules' | 'providers'

const ENTITY_TYPES: { key: EntityType; label: string; icon: React.ReactNode; scope: 'household' | 'user' }[] = [
  { key: 'accounts', label: 'Accounts', icon: <Wallet size={16} />, scope: 'household' },
  { key: 'bills', label: 'Bills', icon: <Banknote size={16} />, scope: 'household' },
  { key: 'categories', label: 'Categories', icon: <Tag size={16} />, scope: 'household' },
  { key: 'credit-cards', label: 'Credit Cards', icon: <CreditCard size={16} />, scope: 'household' },
  { key: 'installment-plans', label: 'Installment Plans', icon: <CalendarClock size={16} />, scope: 'household' },
  { key: 'linked-accounts', label: 'Linked Accounts', icon: <Link2 size={16} />, scope: 'user' },
  { key: 'pairing-rules', label: 'Pairing Rules', icon: <Link2 size={16} />, scope: 'household' },
  { key: 'pay-schedules', label: 'Pay Schedules', icon: <Clock size={16} />, scope: 'household' },
  { key: 'payment-methods', label: 'Payment Methods', icon: <CreditCard size={16} />, scope: 'user' },
  { key: 'subscriptions', label: 'Subscriptions', icon: <Receipt size={16} />, scope: 'household' },
  { key: 'providers', label: 'Providers', icon: <Building2 size={16} />, scope: 'household' },
]

const AdminEntityManager: React.FC = () => {
  const { secureFetch } = useAuth()
  const { showToast } = useToast()
  const [activeType, setActiveType] = useState<EntityType>('accounts')
  const [householdFilter, setHouseholdFilter] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const [search, setSearch] = useState('')

  // Audit log
  const [showAudit, setShowAudit] = useState(false)
  const { data: auditLog = [] } = (useApi(showAudit ? '/api/admin/entity-manager/audit/report' : '') as any)

  // Build query
  const activeMeta = ENTITY_TYPES.find(e => e.key === activeType)!
  const qs = activeMeta.scope === 'household' && householdFilter
    ? `?householdId=${householdFilter}`
    : activeMeta.scope === 'user' && userFilter
    ? `?userId=${userFilter}`
    : ''

  const { data: items = [], loading, mutate } = (useApi(`/api/admin/entity-manager/${activeType}${qs}`) as any)
  const { data: allHouseholds = [] } = (useApi('/api/admin/households?limit=200') as any)

  // Edit state
  const [editing, setEditing] = useState<any>(null)
  const [editData, setEditData] = useState<any>({})
  const [deleting, setDeleting] = useState<string | null>(null)

  const filtered = search
    ? (items || []).filter((item: any) => JSON.stringify(item).toLowerCase().includes(search.toLowerCase()))
    : items || []

  const handleSave = async () => {
    if (!editing) return
    await adminRequest(secureFetch, 'PATCH', `/api/admin/entity-manager/${activeType}/${editing.id}`, editData)
    showToast('Record updated via Owner', 'success')
    setEditing(null)
    setEditData({})
    mutate();
    globalMutate();
  }

  const handleDelete = async (id: string) => {
    await adminRequest(secureFetch, 'DELETE', `/api/admin/entity-manager/${activeType}/${id}`)
    showToast('Record removed via Owner', 'success')
    setDeleting(null)
    mutate();
    globalMutate();
  }

  const openEdit = (item: any) => {
    setEditData({ ...item })
    setEditing(item)
  }

  return (
    <AdminPortal activePath="#/admin/entity-manager">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Shield size={24} className="text-emerald-500" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight">Entity Manager</h2>
            <p className="text-xs text-white/40 font-medium">Platform-wide CRUD access across all households and users. All actions are audited.</p>
          </div>
        </div>
        <button onClick={() => setShowAudit(!showAudit)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${showAudit ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10'}`}>
          <FileText size={14} /> Audit Trail
        </button>
      </div>

      {/* Audit Log Drawer */}
      {showAudit && (
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
          <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Owner Audit Log</div>
          {(auditLog || []).length === 0 ? (
            <div className="text-sm text-white/30">No god-mode actions recorded yet.</div>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-1">
              {(auditLog || []).map((log: any) => (
                <div key={log.id} className="flex items-center justify-between text-xs p-2 bg-white/[0.03] rounded-lg border border-white/5">
                  <div>
                    <span className="font-mono text-emerald-400">{log.action}</span>
                    <span className="text-white/30 ml-2">→ {log.targetId?.slice(0, 12)}...</span>
                  </div>
                  <span className="text-white/20">{log.createdAt ? new Date(log.createdAt).toLocaleString() : ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* Left Nav */}
        <div className="space-y-4">
          <nav className="bg-white/[0.02] border border-white/5 rounded-2xl p-3">
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 px-3 py-2">Entity Types</div>
            {ENTITY_TYPES.map(et => (
              <button
                key={et.key}
                onClick={() => { setActiveType(et.key); setSearch('') }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                  activeType === et.key
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                    : 'text-slate-400 border-transparent hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-5 h-5 flex items-center justify-center shrink-0 ${activeType === et.key ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {et.icon}
                  </div>
                  <span className="truncate">{et.label}</span>
                </div>
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                  et.scope === 'household'
                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/25'
                    : 'bg-blue-500/10 text-blue-400 border-blue-500/25'
                }`}>
                  {et.scope}
                </span>
              </button>
            ))}
          </nav>

          {/* Scope Filters */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-3">
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2"><Filter size={12} /> Scope Filter</div>
            {activeMeta.scope === 'household' ? (
              <div>
                <label className="text-[10px] font-bold text-white/40 uppercase block mb-1">Household ID</label>
                <input value={householdFilter} onChange={e => setHouseholdFilter(e.target.value)} placeholder="Leave blank for ALL" className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-xs" />
                <div className="text-[9px] text-white/20 mt-1">Filter results to a specific household</div>
              </div>
            ) : (
              <div>
                <label className="text-[10px] font-bold text-white/40 uppercase block mb-1">User ID</label>
                <input value={userFilter} onChange={e => setUserFilter(e.target.value)} placeholder="Leave blank for ALL" className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-xs" />
                <div className="text-[9px] text-white/20 mt-1">Filter results to a specific user</div>
              </div>
            )}
            <button onClick={() => mutate()} className="w-full py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-xs font-black uppercase tracking-widest text-emerald-400 hover:bg-emerald-500/30 transition-all">
              <Eye size={12} className="inline mr-2" /> Load Records
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${activeMeta.label.toLowerCase()}...`} className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm" />
          </div>

          {/* Count */}
          <div className="text-[10px] font-black uppercase tracking-widest text-white/30">
            {loading ? 'Loading...' : `${filtered.length} record${filtered.length !== 1 ? 's' : ''} found`}
            {!householdFilter && !userFilter && <span className="text-amber-400 ml-2">⚠ PLATFORM-WIDE</span>}
          </div>

          {/* Table */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
            {filtered.length === 0 ? (
              <div className="py-16 text-center text-white/30 text-sm">
                {loading ? 'Loading records...' : 'No records found. Adjust scope filters and click Load Records.'}
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {filtered.map((item: any) => (
                  <div key={item.id} className="group flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-all">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate">{item.name || item.pattern || item.id}</div>
                      <div className="text-[10px] text-white/30 font-mono truncate">
                        {item.id} {item.householdId ? `· HH: ${item.householdId.slice(0, 10)}` : ''} {item.userId ? `· User: ${item.userId.slice(0, 10)}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(item)} className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-emerald-400 transition-colors" title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setDeleting(item.id)} className="p-2 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

    <Modal isOpen={!!editing} onClose={() => { setEditing(null); setEditData({}) }} title={`Edit ${activeMeta.label.slice(0, -1)}`}>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {editing && Object.entries(editData).filter(([k]) => k !== 'id' && !k.endsWith('_at')).map(([key, value]) => (
          <div key={key}>
            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block mb-1">{key}</label>
            <input
              value={String(value ?? '')}
              onChange={e => setEditData({ ...editData, [key]: e.target.value })}
              className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-sm font-mono"
            />
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-white/10">
        <button onClick={() => { setEditing(null); setEditData({}) }} className="px-4 py-2 text-sm text-white/60">Cancel</button>
        <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 rounded-xl text-sm font-bold text-white hover:bg-emerald-500 transition-all">
          <Check size={14} /> Save (Audited)
        </button>
      </div>
    </Modal>

    <Modal isOpen={!!deleting} onClose={() => setDeleting(null)} title="Owner Delete" footer={
      <>
        <button onClick={() => setDeleting(null)} className="px-4 py-2 text-sm text-white/60">Cancel</button>
        <button onClick={() => deleting && handleDelete(deleting)} className="px-5 py-2.5 bg-red-600 rounded-xl text-sm font-bold text-white hover:bg-red-500 transition-all">
          Confirm Delete (Audited)
        </button>
      </>
    }>
      <p className="text-white/60 text-sm">This action will be permanently logged in the admin audit trail. Continue?</p>
      </Modal>
    </AdminPortal>
  )
}

export default AdminEntityManager
