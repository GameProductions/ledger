import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useAuth } from '../context/AuthContext'
import { getApiUrl } from '../utils/api'
import { useApi, globalMutate } from '../hooks/useApi'
import { useToast } from '../context/ToastContext'
import { Price } from './Price'
import { 
  Search, 
  Filter, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Link as LinkIcon, 
  Check, 
  SplitSquareVertical, 
  Flag, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  Hash, 
  Users, 
  Percent, 
  DollarSign, 
  Sparkles,
  ArrowRight,
  Calculator
} from 'lucide-react'
import { Modal } from './ui/Modal'
import { SearchableSelect } from './ui/SearchableSelect'
import { CurrencyInput } from './ui/CurrencyInput'
import { Checkbox } from './ui/Checkbox'
import { QuickAttentionAdd } from './QuickAttentionAdd'
import { TransactionTimeline } from './TransactionTimeline'

interface SplitRow {
  id: string;
  amountCents: number;
  description: string;
  transactionDate: string;
  accountId: string;
  categoryId: string;
  notes: string;
  assignedUserId: string;
  splitSharedAmountCents: number;
}

export const TransactionLedger: React.FC = () => {
  const { token, householdId, user } = useAuth()
  const { showToast } = useToast()
  const reduced = useReducedMotion()
  
  // Filtering & Sorting State
  const [q, setQ] = useState('')
  const [sortBy, setSortBy] = useState('date') // 'date' | 'amount'
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc')
  const [limit, setLimit] = useState(50)
  const [showNeedsAttentionOnly, setShowNeedsAttentionOnly] = useState(false)
  
  // Data Fetching
  const { data: transactions = [], mutate: mutateTx } = (useApi(`/api/financials/transactions?q=${q}&sort_by=${sortBy}&sort_dir=${sortDir}&limit=${limit}`) as any)
  const { data: accounts = [] } = (useApi('/api/financials/accounts') as any)
  const { data: categories = [] } = (useApi('/api/financials/categories') as any)
  const { data: household } = (useApi('/api/user/households/current') as any)

  // Selection & Details State
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isAddTxOpen, setIsAddTxOpen] = useState(false)
  const [editingTx, setEditingTx] = useState<any>(null)
  const [txForm, setTxForm] = useState<any>({
    description: '',
    amountCents: 0,
    accountId: '',
    categoryId: '',
    transactionDate: new Date().toISOString().split('T')[0],
    notes: '',
    confirmationNumber: '',
    status: 'pending'
  })

  // Multi-way Splitting State
  const [activeSplitTx, setActiveSplitTx] = useState<any>(null)
  const [splitRows, setSplitRows] = useState<SplitRow[]>([])
  const [isSubmittingSplit, setIsSubmittingSplit] = useState(false)
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newTemplateDesc, setNewTemplateDesc] = useState('')

  const { data: splitTemplatesData, mutate: mutateSplitTemplates } = (useApi('/api/financials/split-templates') as any) || { data: [] }
  const savedSplitTemplates = Array.isArray(splitTemplatesData) ? splitTemplatesData : splitTemplatesData?.data || []

  const BUILT_IN_SPLIT_PRESETS = [
    { name: '50 / 50 Equal Split', allocations: [{ percent: 50, descriptionSuffix: 'Part 1' }, { percent: 50, descriptionSuffix: 'Part 2' }] },
    { name: '70 / 30 Personal & Shared', allocations: [{ percent: 70, descriptionSuffix: 'Personal' }, { percent: 30, descriptionSuffix: 'Shared' }] },
    { name: '60 / 20 / 20 3-Way Split', allocations: [{ percent: 60, descriptionSuffix: 'Primary' }, { percent: 20, descriptionSuffix: 'Secondary' }, { percent: 20, descriptionSuffix: 'Tertiary' }] },
    { name: '33 / 33 / 34 Equal 3-Way', allocations: [{ percent: 33.33, descriptionSuffix: 'Part 1' }, { percent: 33.33, descriptionSuffix: 'Part 2' }, { percent: 33.34, descriptionSuffix: 'Part 3' }] }
  ]

  // Expense Sharing State
  const [activeShareTx, setActiveShareTx] = useState<any>(null)
  const [shareTargetUserId, setShareTargetUserId] = useState('')
  const [shareSplitMode, setShareSplitMode] = useState<'percentage' | 'fixed'>('percentage')
  const [shareValue, setShareValue] = useState<number>(50)
  const [isShareMasterPublic, setIsShareMasterPublic] = useState(false)
  const [isSubmittingShare, setIsSubmittingShare] = useState(false)

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<Record<string, any>>({})
  const [activeLinkTx, setActiveLinkTx] = useState<any>(null)

  // Inline confirmation number editing state for linked (transfer) transactions
  const [transferConfirmEditing, setTransferConfirmEditing] = useState<string | null>(null)
  const [transferConfirmValue, setTransferConfirmValue] = useState('')

  const handleCreateTx = async (e: React.FormEvent) => {
    e.preventDefault();
    const apiUrl = getApiUrl();
    const res = await fetch(`${apiUrl}/api/financials/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-household-id': householdId || ''
      },
      body: JSON.stringify(txForm)
    });
    if (res.ok) {
      showToast('Transaction created successfully', 'success');
      setIsAddTxOpen(false);
      setTxForm({
        description: '',
        amountCents: 0,
        accountId: '',
        categoryId: '',
        transactionDate: new Date().toISOString().split('T')[0],
        notes: '',
        confirmationNumber: '',
        status: 'pending'
      });
      mutateTx();
      globalMutate();
    } else {
      showToast('Failed to create transaction', 'error');
    }
  };

  const handleUpdateTx = async (e: React.FormEvent) => {
    e.preventDefault();
    const apiUrl = getApiUrl();
    const res = await fetch(`${apiUrl}/api/financials/transactions/${editingTx.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-household-id': householdId || ''
      },
      body: JSON.stringify(txForm)
    });
    if (res.ok) {
      showToast('Transaction updated & audit logged', 'success');
      setEditingTx(null);
      mutateTx();
      globalMutate();
    } else {
      showToast('Failed to update transaction', 'error');
    }
  };

  const handleDeleteTx = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
    const apiUrl = getApiUrl();
    const res = await fetch(`${apiUrl}/api/financials/transactions/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-household-id': householdId || ''
      }
    });
    if (res.ok) {
      showToast('Transaction deleted', 'success');
      mutateTx();
      globalMutate();
    }
  };

  const handleBulkDeleteTxs = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} transactions?`)) return;
    const apiUrl = getApiUrl();
    const res = await fetch(`${apiUrl}/api/financials/transactions/bulk`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-household-id': householdId || ''
      },
      body: JSON.stringify({ ids: selectedIds })
    });
    if (res.ok) {
      showToast(`Deleted ${selectedIds.length} transactions`, 'success');
      setSelectedIds([]);
      mutateTx();
      globalMutate();
    }
  };

  const handleCreateCategory = async (name: string): Promise<string> => {
    const res = await fetch(`${getApiUrl()}/api/financials/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-household-id': householdId || ''
      },
      body: JSON.stringify({ name })
    });
    const data = await res.json() as any;
    globalMutate();
    return data.id;
  };

  const handleCreateAccount = async (name: string): Promise<string> => {
    const res = await fetch(`${getApiUrl()}/api/financials/accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-household-id': householdId || ''
      },
      body: JSON.stringify({ name, type: 'checking', balanceCents: 0 })
    });
    const data = await res.json() as any;
    globalMutate();
    return data.id;
  };

  const handleSaveTransferConfirmation = async (txId: string) => {
    const apiUrl = getApiUrl()
    const res = await fetch(`${apiUrl}/api/financials/transactions/${txId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-household-id': householdId || ''
      },
      body: JSON.stringify({ confirmationNumber: transferConfirmValue })
    });
    if (res.ok) {
      setTransferConfirmEditing(null)
      showToast('Transfer confirmation saved', 'success')
      globalMutate()
    }
  }
  
  // Suggestion Engine
  useEffect(() => {
    if (!transactions) return;
    const checkSuggestions = async () => {
      for (const tx of transactions) {
        if (!tx.categoryId && !suggestions[tx.id]) {
          try {
            const apiUrl = getApiUrl();
            const res = await fetch(`${apiUrl}/api/financials/transactions/infer`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'x-household-id': householdId || ''
              },
              body: JSON.stringify({ rawDescription: tx.description })
            });
            const data = await res.json() as any;
            if (data.suggestions) {
              setSuggestions(prev => ({ ...prev, [tx.id]: data.suggestions }));
            }
          } catch(e: any) {}
        }
      }
    };
    checkSuggestions();
  }, [transactions, householdId, token]);

  // Selection Math
  const selectionSumCents = useMemo(() => {
    if (!transactions) return 0
    return transactions
      .filter((t: any) => selectedIds.includes(t.id))
      .reduce((sum: number, t: any) => sum + (t.amountCents || 0), 0)
  }, [selectedIds, transactions])

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortDir('desc')
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const toggleSelectAll = () => {
    if (transactions && selectedIds.length === transactions.length) {
      setSelectedIds([])
    } else if (transactions) {
      setSelectedIds(transactions.map((t: any) => t.id))
    }
  }

  const resolveAttention = async (id: string) => {
    const apiUrl = getApiUrl();
    await fetch(`${apiUrl}/api/financials/transactions/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-household-id': householdId || ''
      },
      body: JSON.stringify({ accountedFor: true })
    })
    globalMutate()
  }

  const bulkReconcile = async (reconciled: boolean) => {
    const apiUrl = getApiUrl();
    await fetch(`${apiUrl}/api/financials/transactions/bulk-reconcile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-household-id': householdId || ''
      },
      body: JSON.stringify({ transactionIds: selectedIds, reconciled })
    })
    globalMutate()
    setSelectedIds([])
  }

  // --- MULTI-WAY SPLITTING HANDLERS ---
  const openSplitModal = (tx: any) => {
    const half = Math.floor(tx.amountCents / 2)
    const rest = tx.amountCents - half
    const defaultDate = tx.transactionDate || new Date().toISOString().split('T')[0]
    const defaultAcc = tx.accountId || accounts[0]?.id || ''
    const defaultCat = tx.categoryId || ''

    setSplitRows([
      {
        id: crypto.randomUUID(),
        amountCents: half,
        description: `${tx.description} (Part 1)`,
        transactionDate: defaultDate,
        accountId: defaultAcc,
        categoryId: defaultCat,
        notes: '',
        assignedUserId: '',
        splitSharedAmountCents: 0
      },
      {
        id: crypto.randomUUID(),
        amountCents: rest,
        description: `${tx.description} (Part 2)`,
        transactionDate: defaultDate,
        accountId: defaultAcc,
        categoryId: '',
        notes: '',
        assignedUserId: '',
        splitSharedAmountCents: 0
      }
    ])
    setActiveSplitTx(tx)
  }

  const totalSplitSumCents = useMemo(() => {
    return splitRows.reduce((acc, row) => acc + (row.amountCents || 0), 0)
  }, [splitRows])

  const splitDifferenceCents = useMemo(() => {
    if (!activeSplitTx) return 0
    return (activeSplitTx.amountCents || 0) - totalSplitSumCents
  }, [activeSplitTx, totalSplitSumCents])

  const handleAddSplitRow = () => {
    if (!activeSplitTx) return
    const defaultDate = activeSplitTx.transactionDate || new Date().toISOString().split('T')[0]
    const defaultAcc = activeSplitTx.accountId || accounts[0]?.id || ''
    const fillAmount = Math.max(0, splitDifferenceCents)

    setSplitRows(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        amountCents: fillAmount,
        description: `${activeSplitTx.description} (Part ${prev.length + 1})`,
        transactionDate: defaultDate,
        accountId: defaultAcc,
        categoryId: '',
        notes: '',
        assignedUserId: '',
        splitSharedAmountCents: 0
      }
    ])
  }

  const handleRemoveSplitRow = (rowId: string) => {
    if (splitRows.length <= 2) {
      showToast('A transaction split requires at least 2 parts', 'error')
      return
    }
    setSplitRows(prev => prev.filter(r => r.id !== rowId))
  }

  const handleUpdateSplitRow = (rowId: string, updates: Partial<SplitRow>) => {
    setSplitRows(prev => prev.map(r => r.id === rowId ? { ...r, ...updates } : r))
  }

  const handleAutoFillRemainder = (rowId: string) => {
    if (!activeSplitTx) return
    const otherRowsSum = splitRows.filter(r => r.id !== rowId).reduce((s, r) => s + r.amountCents, 0)
    const needed = activeSplitTx.amountCents - otherRowsSum
    handleUpdateSplitRow(rowId, { amountCents: needed })
  }

  const handleApplySplitTemplate = (template: any) => {
    if (!activeSplitTx || !template.allocations || template.allocations.length === 0) return
    const total = activeSplitTx.amountCents || 0
    const defaultDate = activeSplitTx.transactionDate || new Date().toISOString().split('T')[0]
    const defaultAcc = activeSplitTx.accountId || accounts[0]?.id || ''
    
    let runningSum = 0
    const newRows = template.allocations.map((alloc: any, i: number) => {
      let cents = 0
      if (i === template.allocations.length - 1) {
        cents = total - runningSum
      } else {
        cents = Math.round(((alloc.percent || (100 / template.allocations.length)) / 100) * total)
        runningSum += cents
      }
      return {
        id: crypto.randomUUID(),
        amountCents: cents,
        description: alloc.descriptionSuffix ? `${activeSplitTx.description} (${alloc.descriptionSuffix})` : `${activeSplitTx.description} (Part ${i + 1})`,
        transactionDate: defaultDate,
        accountId: alloc.defaultAccountId || defaultAcc,
        categoryId: alloc.defaultCategoryId || (i === 0 ? activeSplitTx.categoryId || '' : ''),
        notes: '',
        assignedUserId: alloc.assignedUserId || '',
        splitSharedAmountCents: alloc.assignedUserId ? cents : 0
      }
    })
    setSplitRows(newRows)
    showToast(`Applied split template: ${template.name}`, 'success')
  }

  const handleSaveCurrentAsTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTemplateName.trim() || splitRows.length < 2) return
    const total = totalSplitSumCents || 1
    const allocations = splitRows.map((r, i) => ({
      percent: Math.round(((r.amountCents || 0) / total) * 1000) / 10,
      defaultCategoryId: r.categoryId || null,
      descriptionSuffix: r.description ? r.description.replace(activeSplitTx?.description || '', '').trim().replace(/^\(|\)$/g, '') || `Part ${i + 1}` : `Part ${i + 1}`,
      defaultAccountId: r.accountId || null,
      assignedUserId: r.assignedUserId || null
    }))

    try {
      const res = await fetch(`${getApiUrl()}/api/financials/split-templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-household-id': householdId || ''
        },
        body: JSON.stringify({
          name: newTemplateName.trim(),
          description: newTemplateDesc.trim() || undefined,
          allocations
        })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        showToast('Split template saved successfully!', 'success')
        setShowSaveTemplateModal(false)
        setNewTemplateName('')
        setNewTemplateDesc('')
        if (mutateSplitTemplates) mutateSplitTemplates()
      } else {
        showToast(data.error || 'Failed to save template', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Error saving template', 'error')
    }
  }

  const handleDeleteSplitTemplate = async (id: string, name: string) => {
    try {
      const res = await fetch(`${getApiUrl()}/api/financials/split-templates/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-household-id': householdId || ''
        }
      })
      if (res.ok) {
        showToast(`Deleted template: ${name}`, 'success')
        if (mutateSplitTemplates) mutateSplitTemplates()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleExecuteMultiSplit = async () => {
    if (!activeSplitTx) return
    if (splitDifferenceCents !== 0) {
      showToast(`Split total must exactly equal ${Math.abs(activeSplitTx.amountCents / 100).toFixed(2)}`, 'error')
      return
    }

    setIsSubmittingSplit(true)
    try {
      const apiUrl = getApiUrl()
      const payload = {
        splits: splitRows.map(row => ({
          amountCents: row.amountCents,
          description: row.description || `${activeSplitTx.description} (Split)`,
          categoryId: row.categoryId || null,
          accountId: row.accountId || null,
          transactionDate: row.transactionDate || activeSplitTx.transactionDate,
          notes: row.notes || null,
          assignedUserId: row.assignedUserId || null,
          splitSharedAmountCents: row.splitSharedAmountCents || null
        }))
      }

      const res = await fetch(`${apiUrl}/api/financials/transactions/${activeSplitTx.id}/split`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-household-id': householdId || ''
        },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        showToast('Transaction successfully split into multiple records', 'success')
        setActiveSplitTx(null)
        setSplitRows([])
        mutateTx()
        globalMutate()
      } else {
        const data = await res.json() as any
        showToast(data.message || 'Failed to split transaction', 'error')
      }
    } catch (e: any) {
      showToast('Split request failed', 'error')
    } finally {
      setIsSubmittingSplit(false)
    }
  }

  // --- EXPENSE SHARING / LIABILITY DELEGATION ---
  const openShareModal = (tx: any) => {
    setActiveShareTx(tx)
    setShareSplitMode('percentage')
    setShareValue(50)
    setIsShareMasterPublic(false)
    const otherMembers = (household?.members || []).filter((m: any) => m.user?.id !== user?.id && m.userId !== user?.id)
    setShareTargetUserId(otherMembers[0]?.user?.id || otherMembers[0]?.userId || '')
  }

  const calculatedShareAmountCents = useMemo(() => {
    if (!activeShareTx) return 0
    if (shareSplitMode === 'percentage') {
      return Math.round((shareValue / 100) * activeShareTx.amountCents)
    }
    return Math.round(shareValue * 100)
  }, [activeShareTx, shareSplitMode, shareValue])

  const handleExecuteShare = async () => {
    if (!activeShareTx || !shareTargetUserId || calculatedShareAmountCents <= 0) return
    setIsSubmittingShare(true)
    try {
      const apiUrl = getApiUrl()
      const res = await fetch(`${apiUrl}/api/financials/transactions/${activeShareTx.id}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-household-id': householdId || ''
        },
        body: JSON.stringify({
          assignedUserId: shareTargetUserId,
          splitType: shareSplitMode,
          splitValue: shareValue,
          calculatedAmountCents: calculatedShareAmountCents,
          isMasterLedgerPublic: isShareMasterPublic
        })
      })

      if (res.ok) {
        showToast('Expense shared and IOU balance synchronized', 'success')
        setActiveShareTx(null)
        globalMutate()
      } else {
        showToast('Failed to delegate expense', 'error')
      }
    } catch (e) {
      showToast('Error delegating expense', 'error')
    } finally {
      setIsSubmittingShare(false)
    }
  }

  return (
    <>
      <div className="card w-full relative overflow-hidden" id="transaction-ledger">
        <QuickAttentionAdd onAdded={() => globalMutate()} />

        <div className="mb-6">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-1">
                <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                  📖 Transaction Ledger
                  <button onClick={() => setIsHelpOpen(true)} className="p-1 hover:bg-white/10 rounded-full transition-colors text-primary" title="Help">
                    <HelpCircle size={16} />
                  </button>
                </h2>
                <button 
                  onClick={() => {
                    setTxForm({
                      description: '',
                      amountCents: 0,
                      accountId: accounts[0]?.id || 'default-account',
                      categoryId: '',
                      transactionDate: new Date().toISOString().split('T')[0],
                      notes: '',
                      confirmationNumber: '',
                      status: 'pending'
                    });
                    setIsAddTxOpen(true);
                  }} 
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-black font-bold tracking-widest text-[10px] rounded-lg hover:brightness-110 transition-all shadow-md self-start"
                  title="Add Transaction"
                >
                  <Plus size={12} /> Add Item
                </button>
              </div>
              <p className="text-xs text-secondary font-medium">A complete list of your historical purchases and deposits. Search, filter, and edit transactions, or split and delegate them to keep your ledger pristine.</p>
            </div>

            {selectedIds.length > 0 && (
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full lg:w-auto animate-in slide-in-from-top-2 duration-300 shrink-0">
                <div className="flex flex-col">
                  <span className="text-[9px] tracking-widest opacity-60 font-bold">Selected ({selectedIds.length} items)</span>
                  <span className={`text-md font-black tracking-tighter ${selectionSumCents > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    <Price amountCents={selectionSumCents} />
                  </span>
                </div>
                <div className="hidden sm:block w-px h-8 bg-white/10"></div>
                <div className="flex flex-wrap items-center gap-2">
                  <button 
                    onClick={() => bulkReconcile(true)}
                    className="px-2.5 py-1.5 bg-primary text-black font-black tracking-widest text-[9px] rounded-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Check size={10} /> Reconcile
                  </button>
                  <button 
                    onClick={handleBulkDeleteTxs}
                    className="px-2.5 py-1.5 bg-red-500/20 text-red-400 font-black border border-red-500/30 tracking-widest text-[9px] rounded-lg hover:bg-red-500/35 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 size={10} /> Delete
                  </button>
                  <button 
                    onClick={() => setSelectedIds([])}
                    className="px-2.5 py-1.5 bg-white/10 text-white font-black tracking-widest text-[9px] rounded-lg hover:bg-white/20 transition-all cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative group/search">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary group-focus-within/search:text-primary transition-colors" />
              <input 
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search..." 
                className="pl-9 pr-4 py-1.5 text-xs bg-black/40 border border-white/10 rounded-full focus:outline-none focus:border-primary w-28 sm:w-32 focus:w-36 sm:focus:w-48 transition-all font-black tracking-widest"
              />
            </div>
            <button 
              onClick={() => setShowNeedsAttentionOnly(!showNeedsAttentionOnly)}
              className={`p-2 border rounded-xl transition-all cursor-pointer ${showNeedsAttentionOnly ? 'bg-orange-500/20 border-orange-500/50 text-orange-400' : 'bg-white/5 border-white/10 text-secondary hover:bg-white/10'}`}
              title="Filter by Needs Attention"
            >
              <Flag size={14} className={showNeedsAttentionOnly ? 'fill-current' : ''} />
            </button>
            <button className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all cursor-pointer" title="Filters">
              <Filter size={14} className="text-secondary" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/10">
          <table className="w-full text-left border-collapse text-xs sm:text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-white/10 text-gray-400 bg-white/[0.02]">
                <th className="py-2.5 pl-3 w-8">
                  <Checkbox 
                    checked={!!(transactions && transactions.length > 0 && selectedIds.length === transactions?.length)} 
                    onChange={toggleSelectAll} 
                  />
                </th>
                <th className="py-2.5 cursor-pointer hover:text-white whitespace-nowrap" onClick={() => toggleSort('date')}>
                  Date {sortBy === 'date' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="py-2.5">Description</th>
                <th className="py-2.5 hidden sm:table-cell">Category</th>
                <th className="py-2.5 text-right cursor-pointer hover:text-white whitespace-nowrap" onClick={() => toggleSort('amount')}>
                  Amount {sortBy === 'amount' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="py-2.5 pr-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!transactions ? <tr><td colSpan={6} className="text-center py-8 text-secondary">Loading ledger...</td></tr> : 
                transactions.filter((tx: any) => showNeedsAttentionOnly ? tx.attentionRequired && !tx.accountedFor : true).map((tx: any) => (
                <React.Fragment key={tx.id}>
                  <tr className={`border-b border-white/5 hover:bg-white/[0.04] transition-colors ${selectedIds.includes(tx.id) ? 'bg-primary/5' : ''}`}>
                    <td className="py-2.5 pl-3">
                      <Checkbox 
                        checked={selectedIds.includes(tx.id)} 
                        onChange={() => toggleSelect(tx.id)} 
                      />
                    </td>
                    <td className="py-2.5 opacity-80 whitespace-nowrap text-[11px] sm:text-xs font-mono">{tx.transactionDate}</td>
                    <td className="py-2.5 font-medium max-w-[200px] truncate">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-white font-bold">{tx.description}</span>
                        {tx.reconciliationStatus === 'split' && (
                          <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded text-[9px] font-black uppercase tracking-wider">
                            Split Parent
                          </span>
                        )}
                        {tx.attentionRequired && !tx.accountedFor && (
                           <Flag size={12} className="text-orange-500 shrink-0" />
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 hidden sm:table-cell">
                      {tx.categoryId ? (
                        <span className="px-2 py-0.5 bg-white/10 rounded-full text-[10px] sm:text-xs opacity-80 whitespace-nowrap font-medium text-white">
                          {categories?.find((c:any) => c.id === tx.categoryId)?.name || 'Category'}
                        </span>
                      ) : suggestions[tx.id] ? (
                        <div className="flex items-center gap-1.5">
                           <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-full text-[10px] flex items-center gap-1 whitespace-nowrap font-bold">
                             ✨ {categories?.find((c:any) => c.id === suggestions[tx.id].categoryId)?.name || 'Suggested'}
                           </span>
                           <button 
                             onClick={() => { globalMutate() }}
                             className="text-[9px] bg-orange-500 text-black px-1.5 rounded-full font-bold hover:scale-105 cursor-pointer"
                           >
                             ✓
                           </button>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-full text-[10px] whitespace-nowrap">Uncat</span>
                      )}
                    </td>
                    <td className={`py-2.5 text-right font-bold text-xs sm:text-sm ${tx.amountCents > 0 ? 'text-emerald-400' : 'text-white'}`}>
                      <Price amountCents={Math.abs(tx.amountCents)} />
                    </td>
                    <td className="py-2.5 pr-3 text-right">
                      <button onClick={() => setExpandedId(expandedId === tx.id ? null : tx.id)} className="p-1 hover:bg-white/10 rounded cursor-pointer transition-colors">
                        {expandedId === tx.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </td>
                  </tr>
                  {expandedId === tx.id && (
                    <tr className="bg-black/30 border-b border-white/10">
                      <td colSpan={6} className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                          <div>
                            <p className="mb-2 tracking-wider font-bold text-secondary uppercase text-[10px]">Transaction Actions & Details</p>
                            <div className="font-mono bg-black/60 p-2.5 rounded-xl border border-white/5 text-white/90 mb-4 break-all">
                              {tx.rawDescription || tx.description}
                            </div>
                            
                            <div className="flex gap-2 flex-wrap">
                              <button 
                                onClick={() => openSplitModal(tx)} 
                                className="flex items-center gap-1.5 bg-purple-500/15 text-purple-300 border border-purple-500/30 px-3 py-1.5 rounded-xl hover:bg-purple-500/25 transition cursor-pointer font-bold text-xs"
                              >
                                <SplitSquareVertical size={13} /> Split Transaction
                              </button>
                              <button 
                                onClick={() => openShareModal(tx)} 
                                className="flex items-center gap-1.5 bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 px-3 py-1.5 rounded-xl hover:bg-cyan-500/25 transition cursor-pointer font-bold text-xs"
                              >
                                <Users size={13} /> Delegate / Share
                              </button>
                              <button 
                                onClick={() => setActiveLinkTx(tx)} 
                                className="flex items-center gap-1.5 bg-white/10 text-white px-3 py-1.5 rounded-xl hover:bg-white/20 transition cursor-pointer font-bold text-xs"
                              >
                                <LinkIcon size={13} /> Link Transfer
                              </button>
                              <button 
                                onClick={() => {
                                  setEditingTx(tx);
                                  setTxForm({
                                    description: tx.description,
                                    amountCents: tx.amountCents,
                                    accountId: tx.accountId || '',
                                    categoryId: tx.categoryId || '',
                                    transactionDate: tx.transactionDate,
                                    notes: tx.notes || '',
                                    confirmationNumber: tx.confirmationNumber || '',
                                    status: tx.status || 'pending'
                                  });
                                }} 
                                className="flex items-center gap-1.5 bg-blue-500/15 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-xl hover:bg-blue-500/25 transition cursor-pointer font-bold text-xs"
                              >
                                <Edit3 size={13} /> Edit
                              </button>
                              <button 
                                onClick={() => handleDeleteTx(tx.id)} 
                                className="flex items-center gap-1.5 bg-red-500/15 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-xl hover:bg-red-500/25 transition cursor-pointer font-bold text-xs"
                              >
                                <Trash2 size={13} /> Delete
                              </button>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <p className="tracking-wider font-bold text-secondary uppercase text-[10px]">Audit History & Activity</p>
                            <div className="max-h-60 overflow-y-auto bg-black/40 border border-white/5 rounded-2xl p-4">
                              <TransactionTimeline transactionId={tx.id} onActivity={() => mutateTx()} />
                            </div>
                          </div>
                        </div>

                        {tx.attentionRequired && !tx.accountedFor && (
                          <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-center justify-between gap-4 flex-wrap">
                            <div className="space-y-1">
                              <h4 className="text-orange-400 font-bold tracking-widest text-xs flex items-center gap-1"><Flag size={12} /> Attention Required</h4>
                              {tx.needsBalanceTransfer && <p className="text-xs text-white/80">🔄 Balance Transfer timing: <span className="text-white font-bold">{tx.transferTiming === 'same_day' ? 'Same Day' : 'Future'}</span></p>}
                              {tx.isBorrowed && <p className="text-xs text-white/80">💸 Borrowed Funds Source: <span className="text-white font-bold">{tx.borrowSource || 'Not specified'}</span></p>}
                            </div>
                            <button 
                              onClick={() => resolveAttention(tx.id)}
                              className="px-3 py-1.5 bg-orange-500 text-black font-bold tracking-widest text-xs rounded-lg hover:scale-105 transition-transform cursor-pointer"
                            >
                              Mark Accounted For
                            </button>
                          </div>
                        )}

                        {tx.linkedTransactionId && (
                          <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <h4 className="text-blue-400 font-bold tracking-widest text-xs flex items-center gap-1 mb-2">
                                  <Hash size={12} /> Transfer Confirmation
                                </h4>
                                {transferConfirmEditing === tx.id ? (
                                  <div className="flex items-center gap-2">
                                    <input
                                      autoFocus
                                      type="text"
                                      value={transferConfirmValue}
                                      onChange={e => setTransferConfirmValue(e.target.value)}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') handleSaveTransferConfirmation(tx.id)
                                        if (e.key === 'Escape') setTransferConfirmEditing(null)
                                      }}
                                      placeholder="e.g. REF-12345"
                                      className="flex-1 bg-black/60 border border-blue-500/40 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                                    />
                                    <button
                                      onClick={() => handleSaveTransferConfirmation(tx.id)}
                                      className="p-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                    >
                                      <Save size={13} />
                                    </button>
                                    <button
                                      onClick={() => setTransferConfirmEditing(null)}
                                      className="p-1.5 text-secondary hover:text-white transition-colors"
                                    >
                                      <X size={13} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-3">
                                    <span className="font-mono text-xs text-white/80">
                                      {tx.confirmationNumber || <span className="text-white/30 italic">No confirmation number set</span>}
                                    </span>
                                    <button
                                      onClick={() => {
                                        setTransferConfirmEditing(tx.id)
                                        setTransferConfirmValue(tx.confirmationNumber || '')
                                      }}
                                      className="text-[10px] tracking-widest font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors cursor-pointer"
                                    >
                                      <Edit3 size={10} /> {tx.confirmationNumber ? 'Edit' : 'Add'}
                                    </button>
                                  </div>
                                )}
                              </div>
                              <div className="text-[10px] tracking-widest text-blue-400/60 font-bold whitespace-nowrap pt-0.5">
                                Linked Transfer
                              </div>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MULTI-WAY SPLIT MODAL */}
      <Modal isOpen={!!activeSplitTx} onClose={() => setActiveSplitTx(null)} title="Split Transaction across Dates & Accounts">
        {activeSplitTx && (
          <div className="space-y-6 text-white max-h-[75vh] overflow-y-auto pr-1">
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <span className="text-xs text-secondary font-bold uppercase tracking-wider block">Original Transaction</span>
                <span className="font-bold text-white text-sm">{activeSplitTx.description}</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-secondary font-bold uppercase tracking-wider block">Target Total</span>
                <span className="text-lg font-black text-emerald-400"><Price amountCents={activeSplitTx.amountCents} /></span>
              </div>
            </div>

            {/* Split Templates Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-white/60">1-Click Split Recipes</span>
                <span className="text-[10px] text-primary/80 font-bold">Auto-allocates amounts & categories</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {BUILT_IN_SPLIT_PRESETS.map((preset, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleApplySplitTemplate(preset)}
                    className="px-3 py-1.5 bg-white/5 hover:bg-primary/20 border border-white/10 hover:border-primary/40 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer"
                  >
                    ⚡ {preset.name}
                  </button>
                ))}
                {savedSplitTemplates.map((template: any) => (
                  <div key={template.id} className="inline-flex items-center bg-emerald-500/10 border border-emerald-500/20 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => handleApplySplitTemplate(template)}
                      className="px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer"
                    >
                      📁 {template.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSplitTemplate(template.id, template.name)}
                      className="px-2 py-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all border-l border-emerald-500/20 cursor-pointer"
                      title="Delete saved template"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Split Balance Counter */}
            <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-4 ${
              splitDifferenceCents === 0 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              <div className="flex items-center gap-2">
                <Calculator size={16} />
                <span className="text-xs font-bold">
                  Allocated: <Price amountCents={totalSplitSumCents} />
                </span>
              </div>
              <span className="text-xs font-black">
                {splitDifferenceCents === 0 ? '✓ Perfect Balance' : `Remaining: $${(Math.abs(splitDifferenceCents) / 100).toFixed(2)}`}
              </span>
            </div>

            {/* Split Rows */}
            <div className="space-y-4">
              {splitRows.map((row, idx) => (
                <div key={row.id} className="p-4 bg-black/40 border border-white/10 rounded-2xl space-y-3 relative group">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">
                      Part #{idx + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAutoFillRemainder(row.id)}
                        className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded cursor-pointer transition-colors"
                        title="Auto-fill remaining balance to this row"
                      >
                        Auto-Fill Remaining
                      </button>
                      {splitRows.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSplitRow(row.id)}
                          className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10 transition-colors cursor-pointer"
                          title="Remove part"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-secondary tracking-wider block mb-1">Amount</label>
                      <CurrencyInput 
                        valueCents={row.amountCents} 
                        onChangeCents={cents => handleUpdateSplitRow(row.id, { amountCents: cents })}
                        className="bg-white/5 border-white/10"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-secondary tracking-wider block mb-1">Date</label>
                      <input 
                        type="date"
                        value={row.transactionDate}
                        onChange={e => handleUpdateSplitRow(row.id, { transactionDate: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-secondary tracking-wider block mb-1">Payment Account</label>
                      <SearchableSelect 
                        options={accounts.map((a: any) => ({ value: a.id, label: a.name }))}
                        value={row.accountId}
                        onChange={val => handleUpdateSplitRow(row.id, { accountId: val })}
                        placeholder="Select Account..."
                        onCreate={handleCreateAccount}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-secondary tracking-wider block mb-1">Description</label>
                      <input 
                        type="text"
                        value={row.description}
                        onChange={e => handleUpdateSplitRow(row.id, { description: e.target.value })}
                        placeholder="Description for this part..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-secondary tracking-wider block mb-1">Category</label>
                      <SearchableSelect 
                        options={categories.map((c: any) => ({ value: c.id, label: c.name }))}
                        value={row.categoryId}
                        onChange={val => handleUpdateSplitRow(row.id, { categoryId: val })}
                        placeholder="Select Category..."
                        onCreate={handleCreateCategory}
                      />
                    </div>
                  </div>

                  {/* Optional user delegation on split */}
                  <div className="pt-1 flex items-center gap-3">
                    <span className="text-[10px] font-bold text-secondary">Assign Part to User:</span>
                    <select
                      value={row.assignedUserId}
                      onChange={e => {
                        const uid = e.target.value
                        handleUpdateSplitRow(row.id, {
                          assignedUserId: uid,
                          splitSharedAmountCents: uid ? row.amountCents : 0
                        })
                      }}
                      className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                    >
                      <option value="">-- No User Assignment --</option>
                      {(household?.members || []).filter((m: any) => (m.user?.id || m.userId) !== user?.id).map((m: any) => (
                        <option key={m.user?.id || m.userId} value={m.user?.id || m.userId}>
                          {m.user?.displayName || m.user?.username}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleAddSplitRow}
                  className="flex-1 sm:flex-initial px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-white/10 cursor-pointer transition-colors"
                >
                  <Plus size={13} /> Add Another Part
                </button>
                <button
                  type="button"
                  onClick={() => setShowSaveTemplateModal(true)}
                  className="flex-1 sm:flex-initial px-3 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-emerald-500/20 cursor-pointer transition-colors"
                  title="Save this split configuration as a reusable template"
                >
                  Save as Template
                </button>
              </div>
              <button
                type="button"
                disabled={isSubmittingSplit || splitDifferenceCents !== 0}
                onClick={handleExecuteMultiSplit}
                className="w-full sm:w-auto px-8 py-3 bg-primary text-black font-black tracking-widest text-xs rounded-xl hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg cursor-pointer"
              >
                {isSubmittingSplit ? 'Splitting...' : 'Execute Multi-Split'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* SAVE SPLIT TEMPLATE MODAL */}
      <Modal isOpen={showSaveTemplateModal} onClose={() => setShowSaveTemplateModal(false)} title="Save Split Template Recipe">
        <form onSubmit={handleSaveCurrentAsTemplate} className="space-y-4 text-white">
          <p className="text-xs text-secondary font-medium">
            Save this {splitRows.length}-way split structure so you can apply it in 1-click to future transactions.
          </p>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-white/60">Template Name *</label>
            <input
              type="text"
              required
              value={newTemplateName}
              onChange={e => setNewTemplateName(e.target.value)}
              placeholder="e.g. Costco Household & Groceries 70/30"
              className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-sm font-bold text-white outline-none focus:border-primary"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-white/60">Description (Optional)</label>
            <input
              type="text"
              value={newTemplateDesc}
              onChange={e => setNewTemplateDesc(e.target.value)}
              placeholder="e.g. Splits bulk purchases into 70% food and 30% household items"
              className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-sm font-bold text-white outline-none focus:border-primary"
            />
          </div>
          <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-2">
            <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Allocations Preview</span>
            <div className="space-y-1 text-xs">
              {splitRows.map((r, i) => (
                <div key={r.id} className="flex justify-between text-slate-300">
                  <span>Part #{i + 1} ({r.description || 'Split'})</span>
                  <span className="font-bold font-mono text-emerald-400">
                    {totalSplitSumCents > 0 ? Math.round((r.amountCents / totalSplitSumCents) * 100) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowSaveTemplateModal(false)}
              className="px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newTemplateName.trim()}
              className="px-6 py-2.5 bg-primary text-black rounded-xl text-xs font-black uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              Save Template
            </button>
          </div>
        </form>
      </Modal>

      {/* EXPENSE SHARING / LIABILITY DELEGATION MODAL */}
      <Modal isOpen={!!activeShareTx} onClose={() => setActiveShareTx(null)} title="Delegate Liability & Expense Sharing">
        {activeShareTx && (
          <div className="space-y-5 text-white">
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex justify-between items-center">
              <div>
                <span className="text-xs text-secondary font-bold uppercase tracking-wider block">Transaction</span>
                <span className="font-bold text-white text-sm">{activeShareTx.description}</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-secondary font-bold uppercase tracking-wider block">Total Amount</span>
                <span className="text-base font-black text-emerald-400"><Price amountCents={activeShareTx.amountCents} /></span>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-secondary uppercase tracking-wider block">Assign Liability To</label>
              <select
                value={shareTargetUserId}
                onChange={e => setShareTargetUserId(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-primary"
              >
                <option value="">-- Select Household Member --</option>
                {(household?.members || []).filter((m: any) => (m.user?.id || m.userId) !== user?.id).map((m: any) => (
                  <option key={m.user?.id || m.userId} value={m.user?.id || m.userId}>
                    {m.user?.displayName || m.user?.username} ({m.role || 'member'})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-secondary uppercase tracking-wider block">Split Calculation Mode</label>
              <div className="flex bg-black/40 rounded-xl p-1 w-full max-w-xs border border-white/10">
                <button 
                  type="button"
                  onClick={() => { setShareSplitMode('percentage'); setShareValue(50); }}
                  className={`flex-1 py-1.5 text-xs font-black tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${shareSplitMode === 'percentage' ? 'bg-primary text-black' : 'text-white/60'}`}
                >
                  <Percent size={12} /> Percentage
                </button>
                <button 
                  type="button"
                  onClick={() => { setShareSplitMode('fixed'); setShareValue(Math.round(activeShareTx.amountCents / 200)); }}
                  className={`flex-1 py-1.5 text-xs font-black tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${shareSplitMode === 'fixed' ? 'bg-primary text-black' : 'text-white/60'}`}
                >
                  <DollarSign size={12} /> Fixed Dollar
                </button>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input 
                  type="number"
                  min="0"
                  max={shareSplitMode === 'percentage' ? 100 : undefined}
                  value={shareValue}
                  onChange={e => setShareValue(Number(e.target.value))}
                  className="w-28 bg-black/40 border border-white/10 rounded-xl p-2.5 text-right font-bold text-white focus:outline-none focus:border-primary"
                />
                <span className="text-sm font-bold text-secondary">
                  {shareSplitMode === 'percentage' ? '% of total' : 'USD ($)'}
                </span>
              </div>
            </div>

            <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-300">Synchronized IOU & Liability:</span>
              <span className="text-base font-black text-cyan-400"><Price amountCents={calculatedShareAmountCents} /></span>
            </div>

            <label className="flex items-center justify-between p-3.5 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
              <div>
                <div className="text-xs font-bold text-white">Public Master Ledger</div>
                <div className="text-[10px] text-secondary mt-0.5">Show progress on shared household trackers</div>
              </div>
              <Checkbox checked={isShareMasterPublic} onChange={setIsShareMasterPublic} />
            </label>

            <button 
              type="button"
              disabled={isSubmittingShare || !shareTargetUserId || calculatedShareAmountCents <= 0}
              onClick={handleExecuteShare}
              className="w-full py-3 bg-primary text-black font-black tracking-widest text-xs rounded-xl hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xl cursor-pointer"
            >
              {isSubmittingShare ? 'Delegating...' : 'Confirm Expense Delegation'}
            </button>
          </div>
        )}
      </Modal>

      {/* HELP MODAL */}
      <Modal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} title="Mastering the Ledger">
        <div className="space-y-6 text-sm text-gray-300">
          <div>
            <h3 className="text-white font-bold text-lg mb-2">Smart Multi-Way Splitting</h3>
            <p>Divide any single transaction into 2, 3, or more distinct parts with individual amounts, dates, payment accounts, categories, notes, and user assignments. The original record is preserved with full audit traceability.</p>
          </div>
          <div>
            <h3 className="text-white font-bold text-lg mb-2">Expense Sharing & Delegation</h3>
            <p>Share and delegate liabilities with other household members across all transaction lifecycles. Automatically syncs shared balances (IOUs) and debt progression.</p>
          </div>
          <div>
            <h3 className="text-white font-bold text-lg mb-2">Audit History & Timeline CRUD</h3>
            <p>Every transaction maintains a chronological ledger of its initial creation, modifications, confirmations, and persistent notes. Full CRUD enables you to add, edit, or delete notes and reference numbers on demand.</p>
          </div>
        </div>
      </Modal>

      {/* LINK TO TRANSFER MODAL */}
      <Modal isOpen={!!activeLinkTx} onClose={() => setActiveLinkTx(null)} title="Link to Transfer/Bill">
        {activeLinkTx && (
          <div className="space-y-4 text-center">
            <p className="text-secondary text-sm mb-6">Select a parent transfer or bill to link this transaction to. This allows the system to accurately track multi-payment scenarios.</p>
            <select className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white mb-6">
              <option value="">-- Select Parent Transaction --</option>
              {(transactions || []).slice(0, 10).map((t:any) => <option key={t.id} value={t.id}>{t.description} ({t.amountCents/100})</option>)}
            </select>
            <button onClick={() => { setActiveLinkTx(null); globalMutate(); }} className="bg-primary text-black font-bold tracking-widest py-3 px-8 rounded-xl cursor-pointer">Link Items</button>
          </div>
        )}
      </Modal>

      {/* ADD TRANSACTION MODAL */}
      <Modal isOpen={isAddTxOpen} onClose={() => setIsAddTxOpen(false)} title="Add Transaction">
        <form onSubmit={handleCreateTx} className="space-y-4">
          <div>
            <label className="text-xs tracking-widest text-secondary block mb-1">Description</label>
            <input 
              type="text" 
              value={txForm.description} 
              onChange={e => setTxForm({...txForm, description: e.target.value})} 
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary" 
              required 
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs tracking-widest text-secondary block mb-1">Amount</label>
              <CurrencyInput 
                valueCents={txForm.amountCents} 
                onChangeCents={cents => setTxForm({...txForm, amountCents: cents})} 
                required 
              />
            </div>
            <div>
              <label className="text-xs tracking-widest text-secondary block mb-1">Date</label>
              <input 
                type="date" 
                value={txForm.transactionDate} 
                onChange={e => setTxForm({...txForm, transactionDate: e.target.value})} 
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary" 
                required 
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs tracking-widest text-secondary block mb-1">Account</label>
              <SearchableSelect 
                options={accounts.map((a: any) => ({ value: a.id, label: a.name }))}
                value={txForm.accountId} 
                onChange={val => setTxForm({...txForm, accountId: val})} 
                placeholder="Select Account..."
                onCreate={handleCreateAccount}
              />
            </div>
            <div>
              <label className="text-xs tracking-widest text-secondary block mb-1">Category</label>
              <SearchableSelect 
                options={categories.map((c: any) => ({ value: c.id, label: c.name }))}
                value={txForm.categoryId} 
                onChange={val => setTxForm({...txForm, categoryId: val})} 
                placeholder="Uncategorized..."
                onCreate={handleCreateCategory}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs tracking-widest text-secondary block mb-1">Confirmation Number</label>
              <input 
                type="text" 
                value={txForm.confirmationNumber} 
                onChange={e => setTxForm({...txForm, confirmationNumber: e.target.value})} 
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary" 
                placeholder="e.g. REF-12345"
              />
            </div>
            <div>
              <label className="text-xs tracking-widest text-secondary block mb-1">Status</label>
              <select 
                value={txForm.status} 
                onChange={e => setTxForm({...txForm, status: e.target.value})} 
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary"
              >
                <option value="pending">Pending</option>
                <option value="reconciled">Reconciled</option>
                <option value="paid">Paid</option>
                <option value="none">None</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs tracking-widest text-secondary block mb-1">Notes</label>
            <textarea 
              value={txForm.notes} 
              onChange={e => setTxForm({...txForm, notes: e.target.value})} 
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary h-20 resize-none" 
              placeholder="Additional notes..."
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={() => setIsAddTxOpen(false)} className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition-colors cursor-pointer">Cancel</button>
            <button type="submit" className="px-6 py-3 bg-primary text-black font-bold rounded-xl hover:brightness-110 transition-all cursor-pointer">Add Transaction</button>
          </div>
        </form>
      </Modal>

      {/* EDIT TRANSACTION MODAL */}
      <Modal isOpen={!!editingTx} onClose={() => setEditingTx(null)} title="Edit Transaction">
        {editingTx && (
          <form onSubmit={handleUpdateTx} className="space-y-4">
            <div>
              <label className="text-xs tracking-widest text-secondary block mb-1">Description</label>
              <input 
                type="text" 
                value={txForm.description} 
                onChange={e => setTxForm({...txForm, description: e.target.value})} 
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary" 
                required 
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs tracking-widest text-secondary block mb-1">Amount</label>
                <CurrencyInput 
                  valueCents={txForm.amountCents} 
                  onChangeCents={cents => setTxForm({...txForm, amountCents: cents})} 
                  required 
                />
              </div>
              <div>
                <label className="text-xs tracking-widest text-secondary block mb-1">Date</label>
                <input 
                  type="date" 
                  value={txForm.transactionDate} 
                  onChange={e => setTxForm({...txForm, transactionDate: e.target.value})} 
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary" 
                  required 
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs tracking-widest text-secondary block mb-1">Account</label>
                <SearchableSelect 
                  options={accounts.map((a: any) => ({ value: a.id, label: a.name }))}
                  value={txForm.accountId} 
                  onChange={val => setTxForm({...txForm, accountId: val})} 
                  placeholder="Select Account..."
                  onCreate={handleCreateAccount}
                />
              </div>
              <div>
                <label className="text-xs tracking-widest text-secondary block mb-1">Category</label>
                <SearchableSelect 
                  options={categories.map((c: any) => ({ value: c.id, label: c.name }))}
                  value={txForm.categoryId} 
                  onChange={val => setTxForm({...txForm, categoryId: val})} 
                  placeholder="Uncategorized..."
                  onCreate={handleCreateCategory}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={editingTx?.linkedTransactionId ? 'sm:col-span-2' : ''}>
                <label className={`text-xs tracking-widest block mb-1 flex items-center gap-1.5 ${editingTx?.linkedTransactionId ? 'text-blue-400 font-black' : 'text-secondary'}`}>
                  {editingTx?.linkedTransactionId && <Hash size={12} />}
                  Confirmation Number{editingTx?.linkedTransactionId ? ' (Transfer)' : ''}
                </label>
                <input 
                  type="text" 
                  value={txForm.confirmationNumber} 
                  onChange={e => setTxForm({...txForm, confirmationNumber: e.target.value})} 
                  className={`w-full bg-black/40 border rounded-xl p-3 text-white focus:outline-none ${editingTx?.linkedTransactionId ? 'border-blue-500/40 focus:border-blue-400' : 'border-white/10 focus:border-primary'}`}
                  placeholder="e.g. REF-12345"
                />
                {editingTx?.linkedTransactionId && (
                  <p className="text-[10px] text-blue-400/70 mt-1">This transaction is linked to a transfer. Adding a confirmation number helps track the transfer.</p>
                )}
              </div>
              {!editingTx?.linkedTransactionId && (
                <div>
                  <label className="text-xs tracking-widest text-secondary block mb-1">Status</label>
                  <select 
                    value={txForm.status} 
                    onChange={e => setTxForm({...txForm, status: e.target.value})} 
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary"
                  >
                    <option value="pending">Pending</option>
                    <option value="reconciled">Reconciled</option>
                    <option value="paid">Paid</option>
                    <option value="none">None</option>
                  </select>
                </div>
              )}
            </div>
            <div>
              <label className="text-xs tracking-widest text-secondary block mb-1">Notes</label>
              <textarea 
                value={txForm.notes} 
                onChange={e => setTxForm({...txForm, notes: e.target.value})} 
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary h-20 resize-none" 
                placeholder="Additional notes..."
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => setEditingTx(null)} className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition-colors cursor-pointer">Cancel</button>
              <button type="submit" className="px-6 py-3 bg-primary text-black font-bold rounded-xl hover:brightness-110 transition-all cursor-pointer">Save Changes</button>
            </div>
          </form>
        )}
      </Modal>
    </>
  )
}
