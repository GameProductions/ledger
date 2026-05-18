// @ts-nocheck
import React, { useState } from 'react'
import { useApi } from '../hooks/useApi'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { MainLayout } from '../components/layout/MainLayout'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { getApiUrl } from '../utils/api'
import { Price } from '../components/Price'
import { 
  Tag, Building2, CreditCard, Wallet, Link2, GitMerge, CalendarClock,
  Plus, Pencil, Trash2, X, Check, ChevronDown, ChevronRight, Search
} from 'lucide-react'

const API = getApiUrl()

// ─── Generic CRUD helper ────────────────────────────────────────────
async function apiCall(token: string, householdId: string, method: string, path: string, body?: any) {
  const res = (await fetch(`${API}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'x-household-id': householdId || '' },
      body: body ? JSON.stringify(body) : undefined
    }) as any)
  return res.json()
}

// ─── Reusable Entity Manager ────────────────────────────────────────
interface Field { key: string; label: string; type: 'text' | 'number' | 'select' | 'date' | 'boolean' | 'cents'; options?: { value: string; label: string }[]; placeholder?: string }
interface EntityManagerProps {
  title: string
  icon: React.ReactNode
  apiPath: string
  fields: Field[]
  displayFn: (item: any) => React.ReactNode
  idField?: string
  emptyMessage?: string
  scope?: 'household' | 'user'
}

const EntityManager: React.FC<EntityManagerProps> = ({ title, icon, apiPath, fields, displayFn, idField = 'id', emptyMessage, scope = 'household' }) => {
  const { token, householdId } = useAuth()
  const { showToast } = useToast()
  const { data: items = [], loading, mutate } = (useApi(apiPath) as any)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [formData, setFormData] = useState<any>({})
  const [deleting, setDeleting] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const resetForm = () => { setFormData({}); setEditing(null); setShowForm(false) }
  
  const openEdit = (item: any) => {
    const data: any = {}
    fields.forEach(f => {
      if (f.type === 'cents' && item[f.key] !== undefined) data[f.key] = item[f.key] / 100
      else data[f.key] = item[f.key] ?? ''
    })
    setFormData(data)
    setEditing(item)
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload: any = {}
    fields.forEach(f => {
      const v = formData[f.key]
      if (v === undefined || v === '') return
      if (f.type === 'cents') payload[f.key] = Math.round(parseFloat(v) * 100)
      else if (f.type === 'number') payload[f.key] = parseFloat(v)
      else if (f.type === 'boolean') payload[f.key] = v === true || v === 'true'
      else payload[f.key] = v
    })
    
    if (editing) {
      await apiCall(token!, householdId!, 'PATCH', `${apiPath}/${editing[idField]}`, payload)
      showToast(`${title.slice(0, -1)} updated`, 'success')
    } else {
      await apiCall(token!, householdId!, 'POST', apiPath, payload)
      showToast(`${title.slice(0, -1)} created`, 'success')
    }
    resetForm()
    mutate()
  }

  const handleDelete = async (id: string) => {
    await apiCall(token!, householdId!, 'DELETE', `${apiPath}/${id}`)
    showToast(`${title.slice(0, -1)} removed`, 'success')
    setDeleting(null)
    mutate()
  }

  const filtered = search
    ? (items || []).filter((item: any) => JSON.stringify(item).toLowerCase().includes(search.toLowerCase()))
    : items || []

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">{icon}</div>
          <div>
            <h3 className="text-lg font-black tracking-tight">{title}</h3>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true) }} className="flex items-center gap-2 px-4 py-2 bg-primary/20 border border-primary/30 rounded-xl text-xs font-black uppercase tracking-widest text-primary hover:bg-primary/30 transition-all">
          <Plus size={14} /> Add
        </button>
      </div>

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
        <div className="py-12 text-center text-white/30 text-sm">{emptyMessage || `No ${title.toLowerCase()} yet. Click Add to create one.`}</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item: any) => (
            <div key={item[idField]} className="group flex items-center justify-between p-4 bg-white/[0.03] border border-white/5 rounded-xl hover:bg-white/[0.06] transition-all">
              <div className="flex-1 min-w-0">{displayFn(item)}</div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(item)} className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-primary transition-colors" title="Edit">
                  <Pencil size={14} />
                </button>
                <button onClick={() => setDeleting(item[idField])} className="p-2 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors" title="Delete">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal isOpen={showForm} onClose={resetForm} title={editing ? `Edit ${title.slice(0, -1)}` : `New ${title.slice(0, -1)}`}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map(f => (
            <div key={f.key}>
              <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block mb-1.5">{f.label}</label>
              {f.type === 'select' ? (
                <select value={formData[f.key] ?? ''} onChange={e => setFormData({ ...formData, [f.key]: e.target.value })} className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-sm">
                  <option value="">Select...</option>
                  {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : f.type === 'boolean' ? (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={formData[f.key] === true || formData[f.key] === 'true' || formData[f.key] === 1} onChange={e => setFormData({ ...formData, [f.key]: e.target.checked })} className="sr-only peer" />
                  <div className="w-10 h-5 bg-white/10 rounded-full peer peer-checked:bg-primary transition-colors relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white/40 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5 peer-checked:after:bg-white" />
                  <span className="text-sm text-white/60">{formData[f.key] ? 'Enabled' : 'Disabled'}</span>
                </label>
              ) : (
                <input
                  type={f.type === 'cents' ? 'number' : f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                  step={f.type === 'cents' ? '0.01' : f.type === 'number' ? 'any' : undefined}
                  value={formData[f.key] ?? ''}
                  onChange={e => setFormData({ ...formData, [f.key]: e.target.value })}
                  placeholder={f.placeholder || f.label}
                  className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-sm"
                />
              )}
            </div>
          ))}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={resetForm} className="px-4 py-2 text-sm text-white/60 hover:text-white">Cancel</button>
            <button type="submit" className="flex items-center gap-2 px-5 py-2.5 bg-primary rounded-xl text-sm font-bold text-white hover:bg-primary/80 transition-all">
              <Check size={14} /> {editing ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal isOpen={!!deleting} onClose={() => setDeleting(null)} title="Confirm Removal" footer={
        <>
          <button onClick={() => setDeleting(null)} className="px-4 py-2 text-sm text-white/60 hover:text-white">Cancel</button>
          <button onClick={() => deleting && handleDelete(deleting)} className="px-5 py-2.5 bg-red-600 rounded-xl text-sm font-bold text-white hover:bg-red-500 transition-all">
            Remove Permanently
          </button>
        </>
      }>
        <p className="text-white/60 text-sm">This action cannot be undone. Are you sure you want to remove this {title.slice(0, -1).toLowerCase()}?</p>
      </Modal>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────
type TabKey = 'categories' | 'accounts' | 'credit-cards' | 'payment-methods' | 'linked-accounts' | 'pairing-rules' | 'installment-plans'

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'categories', label: 'Categories', icon: <Tag size={16} /> },
  { key: 'accounts', label: 'Accounts', icon: <Wallet size={16} /> },
  { key: 'credit-cards', label: 'Credit Cards', icon: <CreditCard size={16} /> },
  { key: 'payment-methods', label: 'Payment Methods', icon: <Wallet size={16} /> },
  { key: 'linked-accounts', label: 'Linked Accounts', icon: <Link2 size={16} /> },
  { key: 'pairing-rules', label: 'Pairing Rules', icon: <GitMerge size={16} /> },
  { key: 'installment-plans', label: 'Installment Plans', icon: <CalendarClock size={16} /> },
  { key: 'billers', label: 'Billers', icon: <Building2 size={16} /> },
]

const DataManagerPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('categories')

  const renderTab = () => {
    switch (activeTab) {
      case 'categories':
        return (
          <EntityManager
            title="Categories"
            icon={<Tag size={18} />}
            apiPath="/api/financials/categories"
            fields={[
              { key: 'name', label: 'Name', type: 'text', placeholder: 'e.g. Groceries' },
              { key: 'icon', label: 'Icon', type: 'text', placeholder: '🛒' },
              { key: 'color', label: 'Color', type: 'text', placeholder: '#4ade80' },
              { key: 'monthlyBudgetCents', label: 'Monthly Budget', type: 'cents', placeholder: '500.00' },
              { key: 'rolloverEnabled', label: 'Rollover Unused Budget', type: 'boolean' },
              { key: 'emergencyFund', label: 'Emergency Fund', type: 'boolean' },
            ]}
            displayFn={(cat: any) => (
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
            )}
          />
        )

      case 'accounts':
        return (
          <EntityManager
            title="Accounts"
            icon={<Wallet size={18} />}
            apiPath="/api/financials/accounts"
            fields={[
              { key: 'name', label: 'Name', type: 'text', placeholder: 'e.g. Chase Checking' },
              { key: 'type', label: 'Type', type: 'select', options: [
                { value: 'checking', label: 'Checking' }, { value: 'savings', label: 'Savings' },
                { value: 'credit', label: 'Credit' }, { value: 'investment', label: 'Investment' },
                { value: 'cash', label: 'Cash' }, { value: 'other', label: 'Other' }
              ]},
              { key: 'balance_cents', label: 'Balance', type: 'cents', placeholder: '0.00' },
              { key: 'currency', label: 'Currency', type: 'text', placeholder: 'USD' },
            ]}
            displayFn={(acc: any) => (
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black uppercase ${acc.status === 'closed' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                  {acc.type?.slice(0, 2) || '??'}
                </div>
                <div>
                  <div className="font-bold text-sm flex items-center gap-2">
                    {acc.name}
                    {acc.status === 'closed' && <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">Closed</span>}
                  </div>
                  <div className="text-[10px] text-white/40 font-medium">
                    <Price amountCents={acc.balance_cents} /> · {acc.type} · {acc.currency || 'USD'}
                  </div>
                </div>
              </div>
            )}
          />
        )

      case 'credit-cards':
        return (
          <EntityManager
            title="Credit Cards"
            icon={<CreditCard size={18} />}
            apiPath="/api/financials/credit-cards"
            fields={[
              { key: 'accountId', label: 'Account ID', type: 'text' },
              { key: 'credit_limit_cents', label: 'Credit Limit', type: 'cents', placeholder: '5000.00' },
              { key: 'interestRateApy', label: 'Interest Rate APY (%)', type: 'number', placeholder: '24.99' },
              { key: 'statementClosingDay', label: 'Statement Closing Day', type: 'number', placeholder: '15' },
              { key: 'paymentDueDay', label: 'Payment Due Day', type: 'number', placeholder: '5' },
            ]}
            displayFn={(card: any) => (
              <div>
                <div className="font-bold text-sm">Credit Card · {card.accountId?.slice(0, 12)}...</div>
                <div className="text-[10px] text-white/40 font-medium">
                  Limit: <Price amountCents={card.credit_limit_cents} /> · Statement Day: {card.statementClosingDay} · Due Day: {card.paymentDueDay}
                </div>
              </div>
            )}
          />
        )

      case 'payment-methods':
        return (
          <EntityManager
            title="Payment Methods"
            icon={<Wallet size={18} />}
            apiPath="/api/user/payment-methods"
            scope="user"
            fields={[
              { key: 'name', label: 'Name', type: 'text', placeholder: 'e.g. Visa ****1234' },
              { key: 'type', label: 'Type', type: 'select', options: [
                { value: 'credit_card', label: 'Credit Card' }, { value: 'debit_card', label: 'Debit Card' },
                { value: 'bank_account', label: 'Bank Account' }, { value: 'paypal', label: 'PayPal' },
                { value: 'apple_pay', label: 'Apple Pay' }, { value: 'google_pay', label: 'Google Pay' },
                { value: 'other', label: 'Other' }
              ]},
              { key: 'lastFour', label: 'Last 4 Digits', type: 'text', placeholder: '1234' },
            ]}
            displayFn={(pm: any) => (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <CreditCard size={14} />
                </div>
                <div>
                  <div className="font-bold text-sm">{pm.name || pm.type}</div>
                  <div className="text-[10px] text-white/40 font-medium">{pm.type}{pm.lastFour ? ` · ****${pm.lastFour}` : ''}</div>
                </div>
              </div>
            )}
          />
        )

      case 'linked-accounts':
        return (
          <EntityManager
            title="Linked Accounts"
            icon={<Link2 size={18} />}
            apiPath="/api/user/linked-accounts"
            scope="user"
            fields={[
              { key: 'providerId', label: 'Provider ID', type: 'text' },
              { key: 'emailAttached', label: 'Email', type: 'text', placeholder: 'account@email.com' },
              { key: 'status', label: 'Status', type: 'select', options: [
                { value: 'active', label: 'Active' }, { value: 'cancelled', label: 'Cancelled' },
                { value: 'expired', label: 'Expired' }, { value: 'pending', label: 'Pending' }
              ]},
              { key: 'notes', label: 'Notes', type: 'text', placeholder: 'Additional notes...' },
            ]}
            displayFn={(la: any) => (
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
            )}
          />
        )

      case 'pairing-rules':
        return (
          <EntityManager
            title="Pairing Rules"
            icon={<GitMerge size={18} />}
            apiPath="/api/financials/pairing-rules"
            fields={[
              { key: 'pattern', label: 'Pattern (match description)', type: 'text', placeholder: 'e.g. AMAZON*' },
              { key: 'targetProviderId', label: 'Target Provider ID', type: 'text', placeholder: 'Provider UUID (optional)' },
              { key: 'targetCategoryId', label: 'Target Category ID', type: 'text', placeholder: 'Category UUID (optional)' },
              { key: 'autoConfirm', label: 'Auto Confirm', type: 'boolean' },
              { key: 'visibility', label: 'Visibility', type: 'select', options: [
                { value: 'private', label: 'Private' },
                { value: 'household', label: 'Household' },
                { value: 'public', label: 'Public' }
              ]},
              { key: 'ruleType', label: 'Rule Type', type: 'select', options: [
                { value: 'manual', label: 'Manual' },
                { value: 'smart_biller', label: 'Smart Biller' },
                { value: 'auto_learned', label: 'Auto Learned' }
              ]}
            ]}
            displayFn={(rule: any) => (
              <div>
                <div className="font-bold text-sm font-mono">{rule.pattern}</div>
                <div className="text-[10px] text-white/40 font-medium">
                  {rule.targetProviderId ? `Provider: ${rule.targetProviderId.slice(0, 8)}...` : ''}
                  {rule.targetCategoryId ? ` · Category: ${rule.targetCategoryId.slice(0, 8)}...` : ''}
                  {rule.autoConfirm ? ' · Auto-confirm' : ''}
                  {rule.visibility ? ` · ${rule.visibility}` : ''}
                </div>
              </div>
            )}
          />
        )

      case 'billers':
        return (
          <EntityManager
            title="Billers"
            icon={<Building2 size={18} />}
            apiPath="/api/financials/billers"
            fields={[
              { key: 'name', label: 'Name', type: 'text', placeholder: 'e.g. Netflix' },
              { key: 'logoUrl', label: 'Logo URL', type: 'text', placeholder: 'https://...' },
              { key: 'website', label: 'Website', type: 'text', placeholder: 'https://...' },
              { key: 'industry', label: 'Industry', type: 'text', placeholder: 'Streaming' },
            ]}
            displayFn={(biller: any) => (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                  {biller.logoUrl ? <img src={biller.logoUrl} className="w-full h-full object-cover" /> : <Building2 size={14} />}
                </div>
                <div>
                  <div className="font-bold text-sm">{biller.name}</div>
                  <div className="text-[10px] text-white/40 font-medium">{biller.industry || 'Unknown Industry'}</div>
                </div>
              </div>
            )}
          />
        )

      case 'installment-plans':
        return (
          <EntityManager
            title="Installment Plans"
            icon={<CalendarClock size={18} />}
            apiPath="/api/planning/installment-plans"
            fields={[
              { key: 'name', label: 'Name', type: 'text', placeholder: 'e.g. Furniture Payment' },
              { key: 'totalAmountCents', label: 'Total Amount', type: 'cents', placeholder: '2400.00' },
              { key: 'installmentAmountCents', label: 'Per Installment', type: 'cents', placeholder: '200.00' },
              { key: 'totalInstallments', label: 'Total Installments', type: 'number', placeholder: '12' },
              { key: 'frequency', label: 'Frequency', type: 'select', options: [
                { value: 'weekly', label: 'Weekly' }, { value: 'biweekly', label: 'Biweekly' },
                { value: 'monthly', label: 'Monthly' }, { value: 'quarterly', label: 'Quarterly' },
                { value: 'yearly', label: 'Yearly' }
              ]},
              { key: 'nextPayDate', label: 'Next Payment Date', type: 'date' },
              { key: 'paymentMode', label: 'Payment Mode', type: 'select', options: [
                { value: 'manual', label: 'Manual' }, { value: 'autopay', label: 'Autopay' }
              ]},
            ]}
            displayFn={(plan: any) => (
              <div>
                <div className="font-bold text-sm">{plan.name}</div>
                <div className="text-[10px] text-white/40 font-medium">
                  <Price amountCents={plan.installmentAmountCents} />/installment · {plan.remainingInstallments}/{plan.totalInstallments} remaining · {plan.frequency} · Next: {plan.nextPayDate}
                </div>
              </div>
            )}
          />
        )
    }
  }

  return (
    <MainLayout title="Data Manager" subtitle="Manage your financial entities">
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 max-w-7xl mx-auto">
        {/* Sidebar Nav */}
        <nav className="bg-white/[0.02] border border-white/5 rounded-2xl p-3 h-fit lg:sticky lg:top-6">
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 px-3 py-2">Entity Types</div>
          <div className="space-y-1">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === tab.key
                    ? 'bg-primary/15 text-primary border border-primary/20'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5 border border-transparent'
                }`}
              >
                {tab.icon}
                {tab.label}
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

export default DataManagerPage
