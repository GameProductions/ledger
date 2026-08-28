import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, CheckCircle2, Hash, Activity, Database, User, Users, Image, RefreshCw, Tag, Wallet, Clock, Palette, Info } from 'lucide-react';
import { ProviderLogo } from './shared/ProviderLogo';
import { AccordionSection } from './shared/AccordionSection';
import { VisibilitySelector } from './shared/VisibilitySelector';
import { ExternalContactSelect } from './shared/ExternalContactSelect';
import { autoFetchLogo } from '../utils/logoUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { TypeableSelect } from './ui/TypeableSelect';
import { TransactionTimeline } from './TransactionTimeline';
import { CurrencyInput } from './ui/CurrencyInput';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { SearchableSelect } from './ui/SearchableSelect';
import { Checkbox } from './ui/Checkbox';
import { ConfirmationNumberBuilder, ConfirmationNumberItem } from './ui/ConfirmationNumberBuilder';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { getApiUrl } from '../utils/api';

interface CalendarEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any, recurrenceScope?: 'one' | 'future' | 'all') => void;
  onDelete?: (id: string, type: string, recurrenceScope?: 'one' | 'future' | 'all', selectedDate?: string) => void;
  initialData?: any;
  date?: Date;
  paySchedules?: any[];
}

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'WEEKLY', description: 'Occurs once a week (52 times a year)' },
  { value: 'biweekly', label: 'BIWEEKLY', description: 'Occurs every two weeks (26 times a year)' },
  { value: 'monthly', label: 'MONTHLY', description: 'Occurs once a month (12 times a year)' },
  { value: 'quarterly', label: 'QUARTERLY', description: 'Occurs every three months (4 times a year)' },
  { value: 'biannual', label: 'BIANNUAL', description: 'Occurs twice a year (every 6 months)' },
  { value: 'annually', label: 'ANNUALLY', description: 'Occurs once a year' },
  { value: 'biennial', label: 'BIENNIAL', description: 'Occurs once every two years' }
];

const TooltipPopover: React.FC<{ text: string; el: Element }> = ({ text, el }) => {
  const rect = el.getBoundingClientRect()
  return (
    <div
      style={{
        position: 'fixed',
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
        transform: 'translate(-50%, -100%)',
        zIndex: 9999,
      }}
      className="px-3 py-2 bg-slate-800 text-white text-[10px] font-medium rounded-lg shadow-xl whitespace-nowrap pointer-events-none"
    >
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
    </div>
  )
}

export const CalendarEntryModal: React.FC<CalendarEntryModalProps> = ({ 
  isOpen, onClose, onSave, onDelete, initialData, date, paySchedules = []
}) => {
  const { householdId, token } = useAuth();
  const reduced = useReducedMotion();

  // Load API resources
  const { data: providers = [], mutate: mutateProviders } = useApi('/api/user/service-providers') as any;

  const { data: categories = [], mutate: mutateCategories } = useApi('/api/financials/categories') as any;
  const { data: accounts = [], mutate: mutateAccounts } = useApi('/api/financials/accounts') as any;
  const { data: merchants = [], mutate: mutateMerchants } = useApi('/api/financials/merchants') as any;
  const { data: profile } = useApi('/api/user/profile') as any;
  const { data: members } = useApi(householdId ? `/api/user/households/${householdId}/members` : null) as any;

  // Compute household permissions
  const userRole = useMemo(() => {
    if (Array.isArray(members) && profile?.id) {
      const member = members.find((m: any) => m.id === profile.id);
      return member?.role || 'member';
    }
    return 'member';
  }, [members, profile]);

  const canManageHousehold = userRole === 'owner' || userRole === 'admin';

  // State hooks
  const payScheduleNames = useMemo(() => {
    const names = new Set<string>();
    if (Array.isArray(paySchedules)) {
      paySchedules.forEach(ps => {
        if (ps.name) {
          const match = ps.name.match(/^(.+?)\s*\((.+?)\)$/);
          names.add(match ? match[1] : ps.name);
        }
      });
    }
    names.add('Salary');
    names.add('Freelance');
    names.add('Investment');
    names.add('Bonus');
    names.add('Gift');
    names.add('Tax Refund');
    names.add('Other Income');
    return Array.from(names).map(name => ({ value: name, label: name }));
  }, [paySchedules]);

  const paySourceNameOptions = useMemo(() => {
    const names = new Set<string>();
    if (Array.isArray(paySchedules)) {
      paySchedules.forEach(ps => {
        if (ps.name) {
          const match = ps.name.match(/^(.+?)\s*\((.+?)\)$/);
          if (match) names.add(match[2]);
        }
      });
    }
    return Array.from(names).map(name => ({ value: name, label: name }));
  }, [paySchedules]);

  const parseInitialSource = (fullName: string) => {
    if (!fullName) return { type: '', name: '' };
    const match = fullName.match(/^(.+?)\s*\((.+?)\)$/);
    if (match) return { type: match[1], name: match[2] };
    return { type: fullName, name: '' };
  };

  const initialSource = parseInitialSource(initialData?.description || initialData?.name || '');

  const [type, setType] = useState<'charge' | 'bill' | 'pay_schedule' | 'installment'>(
    initialData?.type === 'pay_schedule' 
      ? 'pay_schedule' 
      : initialData?.type === 'installment'
        ? 'installment'
        : (initialData?.type === 'subscription' || initialData?.type === 'bill') 
          ? 'bill' 
          : 'charge'
  );

  const [description, setDescription] = useState(initialData?.description || initialData?.name || '');
  const [sourceType, setSourceType] = useState(initialSource.type || 'Salary');
  const [sourceName, setSourceName] = useState(initialSource.name);
  const [amountCents, setAmountCents] = useState(initialData?.amountCents || initialData?.estimatedAmountCents || 0);
  const [currentDate, setCurrentDate] = useState(initialData?.transactionDate || initialData?.nextBillingDate || initialData?.nextPayDate || date?.toISOString().split('T')[0] || '');
  const [status, setStatus] = useState(initialData?.status || 'unpaid');
  const [confirmationNumber, setConfirmationNumber] = useState(initialData?.confirmationNumber || '');
  const [confirmationNumbers, setConfirmationNumbers] = useState<ConfirmationNumberItem[]>(initialData?.confirmationNumbers || []);
  const [frequency, setFrequency] = useState(initialData?.frequency || 'biweekly');
  const [semiMonthlyDay1, setSemiMonthlyDay1] = useState(initialData?.semiMonthlyDay1 || 1);
  const [semiMonthlyDay2, setSemiMonthlyDay2] = useState(initialData?.semiMonthlyDay2 || 15);
  const [isRecurring, setIsRecurring] = useState(initialData?.isRecurring || initialData?.originalData?.isRecurring || initialData?.type === 'subscription' || false);
  const [billEndDate, setBillEndDate] = useState(initialData?.endDate || '');
  const [billMaxOccurrences, setBillMaxOccurrences] = useState(initialData?.maxOccurrences ? initialData.maxOccurrences.toString() : '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [showTimeline, setShowTimeline] = useState(false);
  const [upcomingAmountCents, setUpcomingAmountCents] = useState(initialData?.upcomingAmountCents || 0);
  const [upcomingDate, setUpcomingDate] = useState(initialData?.upcomingEffectiveDate || '');
  const [payScheduleId, setPayScheduleId] = useState(initialData?.payScheduleId || '');
  const [showRateAdjustment, setShowRateAdjustment] = useState(!!(initialData?.upcomingAmountCents || initialData?.upcomingEffectiveDate));
  const [scopeConfirmState, setScopeConfirmState] = useState<'edit' | 'delete' | null>(null);

  // BNPL / Installment-specific fields
  const [totalAmountCents, setTotalAmountCents] = useState(initialData?.totalAmountCents || 0);
  const [installmentAmountCents, setInstallmentAmountCents] = useState(initialData?.installmentAmountCents || initialData?.amountCents || 0);
  const [totalInstallments, setTotalInstallments] = useState(initialData?.totalInstallments || 4);
  const [remainingInstallments, setRemainingInstallments] = useState(initialData?.remainingInstallments || initialData?.totalInstallments || 4);
  const [nextPaymentDate, setNextPaymentDate] = useState(initialData?.nextPaymentDate || initialData?.nextPayDate || date?.toISOString().split('T')[0] || '');
  const [lender, setLender] = useState(initialData?.type === 'installment' ? (initialData?.name || '') : '');
  const [merchant, setMerchant] = useState('');
  const [interestRateApr, setInterestRateApr] = useState(0);
  useEffect(() => {
    if (initialData?.type === 'installment' && initialData?.notes) {
      const m = initialData.notes.match(/Merchant:\s*(.+)/);
      if (m) setMerchant(m[1].trim());
      const a = initialData.notes.match(/APR:\s*([\d.]+)/);
      if (a) setInterestRateApr(parseFloat(a[1]));
    }
  }, [initialData]);

  // New Category and Account selection states
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || initialData?.originalData?.categoryId || '');
  const [accountId, setAccountId] = useState(initialData?.accountId || initialData?.originalData?.accountId || '');

  // Separated Due Date and Payment Date
  const [dueDate, setDueDate] = useState(initialData?.dueDate || initialData?.transactionDate || date?.toISOString().split('T')[0] || '');
  const [paymentDate, setPaymentDate] = useState(initialData?.transactionDate || initialData?.paycheckDate || date?.toISOString().split('T')[0] || '');

  // Registry Sync states
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [hasChangesToProvider, setHasChangesToProvider] = useState(false);
  const [saveToRegistry, setSaveToRegistry] = useState(false);
  const [registryScope, setRegistryScope] = useState<'private' | 'household'>('private');

  // Logo state
  const [iconUrl, setIconUrl] = useState(initialData?.iconUrl || initialData?.logoUrl || '');
  const [isAutoFetching, setIsAutoFetching] = useState(false);

  // Visibility & External Contact state
  const [visibility, setVisibility] = useState<'private' | 'household' | 'public'>(initialData?.visibility || 'household');
  const [publicScope, setPublicScope] = useState<'name_only' | 'full'>(initialData?.publicScope || 'name_only');
  const [externalContactId, setExternalContactId] = useState(initialData?.externalContactId || '');

  // Tooltip state for field info icons
  const [activeTooltip, setActiveTooltip] = useState<{ text: string; el: Element } | null>(null)

  const hideTooltip = useCallback(() => setActiveTooltip(null), [])

  const showTooltip = useCallback((text: string, el: Element) => {
    setActiveTooltip({ text, el })
  }, [])

  // Close tooltip on click outside
  useEffect(() => {
    if (!activeTooltip) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Element
      if (target.closest('[data-tip]')) return
      if (target.closest('[data-tip-popover]')) return
      hideTooltip()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [activeTooltip, hideTooltip])

  const infoIcon = (text: string, className = 'ml-1') => (
    <Info
      size={12}
      data-tip
      className={`text-slate-500 cursor-help shrink-0 ${className}`}
      onMouseEnter={(e) => showTooltip(text, e.currentTarget)}
      onMouseLeave={hideTooltip}
      onClick={(e) => {
        e.stopPropagation()
        if (activeTooltip?.text === text) {
          hideTooltip()
        } else {
          showTooltip(text, e.currentTarget)
        }
      }}
    />
  )

  // Load and match initial provider if editing
  useEffect(() => {
    if (description && providers.length > 0) {
      const match = providers.find((p: any) => p.name.toLowerCase() === description.toLowerCase());
      if (match) {
        setSelectedProvider(match);
      }
    }
  }, [providers, description]);

  const providerOptions = useMemo(() => {
    return providers.map((p: any) => ({
      value: p.name,
      label: p.name.toUpperCase()
    }));
  }, [providers]);

  const merchantOptions = useMemo(() => {
    return merchants.map((m: any) => ({
      value: m.name,
      label: m.name.toUpperCase()
    }));
  }, [merchants]);

  const handleProviderChange = (providerName: string) => {
    setDescription(providerName);
    const matched = providers.find((p: any) => p.name.toLowerCase() === providerName.toLowerCase());
    if (matched) {
      setSelectedProvider(matched);
      if (matched.iconUrl) setIconUrl(matched.iconUrl);
      if (matched.defaultCategoryId) {
        setCategoryId(matched.defaultCategoryId);
      }
      if (matched.defaultDueDate) {
        const dayNum = parseInt(matched.defaultDueDate);
        if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
          const baseDate = dueDate ? new Date(dueDate) : new Date();
          baseDate.setDate(dayNum);
          const yyyy = baseDate.getFullYear();
          const mm = String(baseDate.getMonth() + 1).padStart(2, '0');
          const dd = String(dayNum).padStart(2, '0');
          setDueDate(`${yyyy}-${mm}-${dd}`);
        } else {
          setDueDate(matched.defaultDueDate);
        }
      }
      setHasChangesToProvider(false);
    } else {
      setSelectedProvider({ name: providerName, visibility: 'public' });
      setHasChangesToProvider(true);
      const logos = autoFetchLogo(providerName);
      if (logos) setIconUrl(logos.clearbit);
    }
  };

  const handleAutoFetchLogo = () => {
    if (!description) return;
    setIsAutoFetching(true);
    const logos = autoFetchLogo(description);
    if (logos) {
      setIconUrl(logos.clearbit);
    }
    setIsAutoFetching(false);
  };

  const handleCategoryChange = (val: string) => {
    setCategoryId(val);
    setHasChangesToProvider(true);
  };

  const handleDueDateChange = (val: string) => {
    setDueDate(val);
    setHasChangesToProvider(true);
  };

  const isItemRecurring = !!initialData && (
    initialData.isRecurring || 
    initialData.originalData?.isRecurring || 
    initialData.type === 'subscription' || 
    initialData.type === 'pay_schedule' || 
    initialData.type === 'installment'
  );

  if (!isOpen) return null;

  const submitForm = async (scope?: 'one' | 'future' | 'all') => {
    const id = initialData?.originalId || initialData?.id;

    if (selectedProvider && iconUrl) {
      setSelectedProvider({ ...selectedProvider, iconUrl });
    }

    // Sync to provider registry if selected
    if (saveToRegistry && selectedProvider) {
      const payload = {
        name: selectedProvider.name,
        visibility: registryScope,
        defaultCategoryId: categoryId || null,
        defaultDueDate: dueDate ? new Date(dueDate).getDate().toString() : null
      };
      const apiUrl = getApiUrl();
      const isNewProvider = selectedProvider.visibility === 'public' || 
        (selectedProvider.visibility === 'household' && registryScope === 'private') ||
        !selectedProvider.id;
        
      const method = isNewProvider ? 'POST' : 'PATCH';
      const url = isNewProvider ? `${apiUrl}/api/user/service-providers` : `${apiUrl}/api/user/service-providers/${selectedProvider.id}`;
      
      try {
        await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'x-household-id': householdId || ''
          },
          body: JSON.stringify(payload)
        });
        mutateProviders();
      } catch (e) {
        console.error('Failed to sync provider registry', e);
      }
    }

    if (type === 'pay_schedule') {
      const combinedName = sourceName?.trim() ? `${sourceType.trim()} (${sourceName.trim()})` : sourceType.trim();
      onSave({
        id,
        type: 'pay_schedule',
        name: combinedName,
        estimatedAmountCents: amountCents,
        nextPayDate: paymentDate,
        frequency,
        semiMonthlyDay1: frequency === 'semi-monthly' ? semiMonthlyDay1 : null,
        semiMonthlyDay2: frequency === 'semi-monthly' ? semiMonthlyDay2 : null,
        notes,
        upcomingAmountCents: upcomingAmountCents || null,
        upcomingEffectiveDate: upcomingDate || null
      }, scope);
    } else if (type === 'installment') {
      const instNotes = [notes, merchant ? `Merchant: ${merchant}` : '', interestRateApr > 0 ? `APR: ${interestRateApr}` : ''].filter(Boolean).join('\n');
      onSave({
        id,
        type: 'installment',
        name: lender || 'Buy Now, Pay Later',
        totalAmountCents,
        installmentAmountCents,
        totalInstallments,
        remainingInstallments: remainingInstallments || totalInstallments,
        frequency,
        nextPaymentDate,
        accountId: accountId || null,
        categoryId: null,
        status: status || 'active',
        notes: instNotes
      }, scope);
    } else {
      if (isRecurring) {
        onSave({
          id,
          type: 'bill',
          name: description,
          amountCents: amountCents,
          dueDate: dueDate,
          status: status,
          notes: notes,
          categoryId: categoryId || null,
          accountId: accountId || null,
          isRecurring: true,
          frequency: frequency === 'semi-monthly' || frequency === 'manual' ? 'monthly' : frequency,
          endDate: billEndDate || null,
          maxOccurrences: billMaxOccurrences ? parseInt(billMaxOccurrences) : null,
          payScheduleId: payScheduleId || null,
          paycheckDate: paymentDate || null,
          originalDate: initialData?.date,
          iconUrl: iconUrl || null,
          visibility: visibility,
          publicScope: visibility === 'public' ? publicScope : undefined,
          externalContactId: externalContactId || null,
          upcomingAmountCents: upcomingAmountCents || null,
          upcomingEffectiveDate: upcomingDate || null
        }, scope);
      } else {
        onSave({
          id,
          type: 'charge',
          description,
          amountCents: amountCents,
          transactionDate: paymentDate,
          status,
          confirmationNumber: confirmationNumber || (confirmationNumbers[0]?.value ?? ''),
          confirmationNumbers: confirmationNumbers,
          categoryId: categoryId || null,
          accountId: accountId || null,
          payScheduleId: payScheduleId || null,
          paycheckDate: paymentDate || null,
          iconUrl: iconUrl || null,
          visibility: visibility,
          publicScope: visibility === 'public' ? publicScope : undefined,
          externalContactId: externalContactId || null
        }, scope);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isItemRecurring) {
      setScopeConfirmState('edit');
    } else {
      submitForm();
    }
  };

  // Shared form fields layout logic for both animated and reduced motion views
  const renderFormContent = () => {
    return (
      <div className="space-y-6">
        {type === 'installment' ? (
          // BNPL Tab Layout
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] font-black tracking-widest text-slate-500">Buy Now, Pay Later</div>
                <div className="text-[9px] font-black tracking-widest px-2 py-1 rounded bg-violet-500/10 border border-violet-500/20 text-violet-400">Category: Buy Now, Pay Later</div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black tracking-widest text-secondary ml-1 flex items-center gap-1">Lender{infoIcon('The financial institution providing this Buy Now, Pay Later financing')}</label>
                  <SearchableSelect
                    options={providerOptions}
                    value={lender}
                    onChange={setLender}
                    placeholder="Search or enter lender..."
                    onCreate={(val) => {
                      setLender(val);
                      return val;
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black tracking-widest text-secondary ml-1 flex items-center gap-1">Merchant{infoIcon('The store or business where the purchase was made')}</label>
                  <SearchableSelect
                    options={merchantOptions}
                    value={merchant}
                    onChange={setMerchant}
                    placeholder="Search or enter merchant..."
                    onCreate={async (name) => {
                      const res = await fetch('/api/financials/merchants', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'x-household-id': householdId || '' },
                        body: JSON.stringify({ name })
                      })
                      const d = await res.json() as any
                      if (d.success) { mutateMerchants(); setMerchant(name); return name }
                      return ''
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-2">
                   <label className="text-xs font-black tracking-widest text-secondary ml-1 flex items-center gap-1">Total Amount{infoIcon('The full purchase amount financed through this Buy Now, Pay Later plan')}</label>
                   <CurrencyInput 
                     valueCents={totalAmountCents}
                     onChangeCents={setTotalAmountCents}
                     placeholder="0.00"
                     showSymbol={true}
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-xs font-black tracking-widest text-secondary ml-1 flex items-center gap-1">Installment Amount{infoIcon('The amount due each payment period')}</label>
                   <CurrencyInput 
                     valueCents={installmentAmountCents}
                     onChangeCents={setInstallmentAmountCents}
                     placeholder="0.00"
                     showSymbol={true}
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-xs font-black tracking-widest text-secondary ml-1 flex items-center gap-1"># of Payments{infoIcon('Total number of scheduled payments for this plan')}</label>
                   <input 
                     type="number" min="1" max="99"
                     value={totalInstallments}
                     onChange={(e) => { const v = Number(e.target.value); setTotalInstallments(v); setRemainingInstallments(v) }}
                     className="w-full p-4 bg-white/5 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all font-bold text-lg"
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-xs font-black tracking-widest text-secondary ml-1 flex items-center gap-1">APR (%){infoIcon('Annual Percentage Rate — the yearly cost of borrowing including fees and interest')}</label>
                   <input 
                     type="number" min="0" max="100" step="0.01"
                     value={interestRateApr}
                     onChange={(e) => { setInterestRateApr(parseFloat(e.target.value) || 0) }}
                     placeholder="0.00"
                     className="w-full p-4 bg-white/5 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all font-bold text-lg"
                   />
                </div>
              </div>
            </div>

            {/* SCHEDULING: accordion, collapsed */}
            <AccordionSection icon={Clock} title="Scheduling" defaultOpen={false}>
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                     <label className="text-xs font-black tracking-widest text-secondary ml-1 flex items-center gap-1">Frequency{infoIcon('How often payments are due — weekly, biweekly, monthly, etc.')}</label>
                     <select
                       value={frequency}
                       onChange={(e) => setFrequency(e.target.value)}
                       className="w-full p-4 bg-white/5 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all font-bold text-sm"
                     >
                       <option value="weekly">Weekly</option>
                       <option value="biweekly">Biweekly</option>
                       <option value="monthly">Monthly</option>
                       <option value="quarterly">Quarterly</option>
                       <option value="yearly">Yearly</option>
                     </select>
                  </div>
                  <div className="space-y-2">
                     <label className="text-xs font-black tracking-widest text-secondary ml-1 flex items-center gap-1">Next Payment Date{infoIcon('The date of the next scheduled payment in this plan')}</label>
                     <input 
                       required
                       type="date" 
                       value={nextPaymentDate}
                       onChange={(e) => setNextPaymentDate(e.target.value)}
                       className="w-full p-4 bg-white/5 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all font-bold text-md"
                     />
                  </div>
                   <div className="space-y-2">
                      <label className="text-xs font-black tracking-widest text-secondary ml-1 flex items-center gap-1">Account{infoIcon('Which account this Buy Now, Pay Later plan is linked to for payments')}</label>
                      <SearchableSelect
                        options={accounts.map((a: any) => ({ value: a.id, label: a.name }))}
                        value={accountId}
                        onChange={(val) => setAccountId(val)}
                        placeholder="Select Account..."
                        onCreate={async (name) => {
                          const res = await fetch('/api/financials/accounts', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'x-household-id': householdId || '' },
                            body: JSON.stringify({ name, type: 'checking' })
                          })
                          const d = await res.json() as any
                          if (d.success) { mutateAccounts(); return d.id }
                          return ''
                        }}
                      />
                   </div>
                </div>
              </div>
            </AccordionSection>

            {/* PROGRESS: accordion, collapsed */}
            <AccordionSection icon={Activity} title="Progress" defaultOpen={false}>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black tracking-widest text-secondary ml-1 flex items-center gap-1">Installments Paid{infoIcon('How many payments have been completed so far out of the total')}</label>
                    <input 
                      type="number" min="0"
                      value={totalInstallments - remainingInstallments}
                      onChange={(e) => setRemainingInstallments(totalInstallments - Number(e.target.value))}
                      className="w-full p-4 bg-white/5 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all font-bold text-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black tracking-widest text-secondary ml-1 flex items-center gap-1">Status{infoIcon('Current state of this Buy Now, Pay Later plan — Active, Completed, or Cancelled')}</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full p-4 bg-white/5 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all font-bold text-sm"
                    >
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              </div>
            </AccordionSection>
          </div>
        ) : type === 'pay_schedule' ? (
          // Pay Tab Layout
          <div className="space-y-4 animate-in fade-in duration-300">

            {/* ESSENTIALS: always visible */}
            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-4">
              <div className="text-[9px] font-black tracking-widest text-slate-500">Essentials</div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                   <label className="text-xs font-black tracking-widest text-secondary ml-1 flex items-center gap-1">Source Type{infoIcon('Type of income — e.g. Salary, Freelance, Investment')}</label>
                   <SearchableSelect
                     options={payScheduleNames}
                     value={sourceType}
                     onChange={(v) => setSourceType(v)}
                     placeholder="Select source type..."
                     onCreate={(v) => {
                       setSourceType(v);
                       return v;
                     }}
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-xs font-black tracking-widest text-secondary ml-1 flex items-center gap-1">Source Name (e.g. Company){infoIcon('The employer, client, or institution providing this income')}</label>
                   <SearchableSelect
                     options={paySourceNameOptions}
                     value={sourceName}
                     onChange={(v) => setSourceName(v)}
                     placeholder="Select or type company name..."
                     onCreate={(v) => {
                       setSourceName(v);
                       return v;
                     }}
                   />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-xs font-black tracking-widest text-secondary ml-1 flex items-center gap-1">Estimated Net Amount{infoIcon('Expected take-home amount after taxes and deductions')}</label>
                    <CurrencyInput 
                      valueCents={amountCents}
                      onChangeCents={setAmountCents}
                      placeholder="0.00"
                      showSymbol={true}
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-black tracking-widest text-secondary ml-1 flex items-center gap-1">Next Pay Date{infoIcon('The date when this income is expected to arrive')}</label>
                    <input 
                      required
                      type="date" 
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full p-4 bg-white/5 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all font-bold text-lg appearance-none"
                    />
                 </div>
              </div>
            </div>

            {/* SCHEDULING: accordion, collapsed */}
            <AccordionSection icon={Clock} title="Scheduling" defaultOpen={false}>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <label className="text-xs font-black tracking-widest text-secondary ml-1 flex items-center gap-1">Frequency{infoIcon('How often you receive this income — weekly, biweekly, semi-monthly, or monthly')}</label>
                     <TypeableSelect 
                       options={[
                         { value: 'weekly', label: 'WEEKLY' },
                         { value: 'biweekly', label: 'BIWEEKLY' },
                         { value: 'semi-monthly', label: 'SEMI-MONTHLY' },
                         { value: 'monthly', label: 'MONTHLY' }
                       ]}
                       value={frequency}
                       onChange={(val) => setFrequency(val)}
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-xs font-black tracking-widest text-secondary ml-1 flex items-center gap-1">Internal Notes{infoIcon('Private notes about this income source — e.g. expected bonus, overtime')}</label>
                     <input 
                       type="text" 
                       value={notes}
                       onChange={(e) => setNotes(e.target.value)}
                       placeholder="e.g. Include bonus"
                       className="w-full p-4 bg-white/5 border border-glass-border rounded-xl text-white outline-none focus:border-blue-500 transition-all font-bold text-lg"
                     />
                  </div>
                </div>

                {frequency === 'semi-monthly' && (
                  <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black tracking-widest text-blue-500/60 ml-1 flex items-center gap-1">First Day of Month{infoIcon('The first pay date each month (e.g. 1st or 15th)')}</label>
                       <input 
                         type="number" min="1" max="31"
                         value={semiMonthlyDay1}
                         onChange={(e) => setSemiMonthlyDay1(Number(e.target.value))}
                         className="w-full p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl text-white font-bold"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black tracking-widest text-blue-500/60 ml-1 flex items-center gap-1">Second Day of Month{infoIcon('The second pay date each month (e.g. 15th or last day)')}</label>
                       <input 
                         type="number" min="1" max="31"
                         value={semiMonthlyDay2}
                         onChange={(e) => setSemiMonthlyDay2(Number(e.target.value))}
                         className="w-full p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl text-white font-bold"
                       />
                    </div>
                  </div>
                )}

                {/* Planned Rate Adjustment for Paydays */}
                <div className="p-4 border rounded-2xl space-y-4 bg-blue-500/5 border-blue-500/10">
                  <button
                    type="button"
                    onClick={() => setShowRateAdjustment(!showRateAdjustment)}
                    className="w-full flex items-center justify-between outline-none cursor-pointer"
                  >
                    <div className="text-[10px] font-black tracking-widest text-blue-500">Planned Rate Adjustment (Optional)</div>
                    <span className="text-xs text-slate-500">{showRateAdjustment ? '▼' : '▶'}</span>
                  </button>
                  {showRateAdjustment && (
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2">
                         <label className="text-[9px] font-black tracking-widest text-white/30 ml-1 flex items-center gap-1">Upcoming Amount{infoIcon('The new amount when the rate change takes effect')}</label>
                         <CurrencyInput
                           valueCents={upcomingAmountCents}
                           onChangeCents={setUpcomingAmountCents}
                           placeholder="0.00;;"
                           className="bg-black/40 border-white/5"
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[9px] font-black tracking-widest text-white/30 ml-1 flex items-center gap-1">Effective Date{infoIcon('The date when the new amount takes effect')}</label>
                         <input 
                          type="date"
                          value={upcomingDate}
                          onChange={(e) => setUpcomingDate(e.target.value)}
                          className="w-full p-3 bg-black/40 border border-white/5 rounded-xl text-white font-bold text-sm outline-none focus:border-white/20"
                         />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </AccordionSection>
          </div>
        ) : (
          // Combined Bills & Charges Layout (Accordion)
          <div className="space-y-4 animate-in fade-in duration-300">

            {/* ESSENTIALS: always visible */}
            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-4">
              <div className="text-[9px] font-black tracking-widest text-slate-500">Essentials</div>

              {/* Provider */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black tracking-widest text-secondary flex items-center gap-1">Provider / Description{infoIcon('The company, service, or person being paid')}</label>
                <div className="flex items-center gap-2">
                  <ProviderLogo url={iconUrl} name={description} size={28} className="border border-white/10 flex-shrink-0" />
                  <div className="flex-1">
                    <SearchableSelect
                      options={providerOptions}
                      value={description}
                      onChange={handleProviderChange}
                      placeholder="Search or enter provider..."
                      onCreate={(val) => { handleProviderChange(val); return val; }}
                    />
                  </div>
                </div>
              </div>

              {/* Amount + Due Date + Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black tracking-widest text-secondary flex items-center gap-1">Amount{infoIcon('How much is due each billing period')}</label>
                  <CurrencyInput valueCents={amountCents} onChangeCents={setAmountCents} placeholder="0.00" showSymbol={true} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black tracking-widest text-secondary flex items-center gap-1">Due Date{infoIcon('The date this payment is due')}</label>
                  <input required type="date" value={dueDate} onChange={(e) => handleDueDateChange(e.target.value)}
                    className="w-full p-3 bg-white/5 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all font-bold text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black tracking-widest text-secondary flex items-center gap-1">Status{infoIcon('Current payment state — Unpaid, Paid, Pending, or Scheduled')}</label>
                  <TypeableSelect options={[
                    { value: 'paid', label: 'PAID', icon: <div className="w-2 h-2 rounded-full bg-emerald-500" /> },
                    { value: 'pending', label: 'PENDING', icon: <div className="w-2 h-2 rounded-full bg-amber-500" /> },
                    { value: 'scheduled', label: 'SCHEDULED', icon: <div className="w-2 h-2 rounded-full bg-blue-500" /> },
                    { value: 'unpaid', label: 'UNPAID', icon: <div className="w-2 h-2 rounded-full bg-red-500" /> }
                  ]} value={status} onChange={(val) => setStatus(val)} />
                </div>
                </div>
              </div>

              {/* Recurrence */}
              <div className="border border-white/5 rounded-xl overflow-hidden">
                <div role="button" tabIndex={0} onClick={() => setIsRecurring(!isRecurring)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsRecurring(!isRecurring) } }}
                  className="w-full flex items-center justify-between p-3 outline-none hover:bg-white/[0.02] transition-colors text-left cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={isRecurring} onChange={setIsRecurring} iconClassName="text-amber-500" />
                    <span className="text-[10px] font-black tracking-widest text-secondary flex items-center gap-1">Recurring bill{infoIcon('Enable for repeating obligations like subscriptions, rent, or loan payments')}</span>
                  </div>
                  <span className="text-[10px] text-slate-500">{isRecurring ? '▼' : '▶'}</span>
                </div>
                {isRecurring && (
                  <div className="p-3 pt-0 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-white/5 animate-in slide-in-from-top-2">
                    <div>
                      <label className="text-[9px] font-black tracking-widest text-secondary flex items-center gap-1">Frequency{infoIcon('How often this bill repeats — weekly, monthly, annually, etc.')}</label>
                      <TypeableSelect options={FREQUENCY_OPTIONS}
                        value={frequency === 'semi-monthly' || frequency === 'manual' ? 'monthly' : frequency}
                        onChange={(val) => setFrequency(val)} />
                    </div>
                    <div>
                      <label className="text-[9px] font-black tracking-widest text-secondary flex items-center gap-1">End Date{infoIcon('When this recurring bill ends — leave blank if ongoing')}</label>
                      <input type="date" value={billEndDate} onChange={(e) => setBillEndDate(e.target.value)}
                        className="w-full p-2.5 bg-black/40 border border-white/5 rounded-xl text-white text-xs font-bold outline-none focus:border-white/20" />
                    </div>
                    <div>
                      <label className="text-[9px] font-black tracking-widest text-secondary flex items-center gap-1">Max Occurrences{infoIcon('Total number of payments before this bill ends — leave blank for unlimited')}</label>
                      <input type="number" placeholder="Unlimited" value={billMaxOccurrences}
                        onChange={(e) => setBillMaxOccurrences(e.target.value)}
                        className="w-full p-2.5 bg-black/40 border border-white/5 rounded-xl text-white text-xs font-bold outline-none focus:border-white/20" />
                    </div>
                  </div>
                )}
              </div>

            {/* ORGANIZATION: accordion, default open */}
            <AccordionSection icon={Tag} title="Organization" defaultOpen={true}>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black tracking-widest text-secondary flex items-center gap-1">Category{infoIcon('Type of expense for budgeting and reporting purposes')}</label>
                  <SearchableSelect
                    options={categories.map((c: any) => ({ value: c.id, label: c.name }))}
                    value={categoryId}
                    onChange={(val) => handleCategoryChange(val)}
                    placeholder="Select Category..."
                    onCreate={async (name) => {
                      const res = await fetch('/api/financials/categories', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'x-household-id': householdId || '' },
                        body: JSON.stringify({ name })
                      })
                      const d = await res.json() as any
                      if (d.success) { mutateCategories(); return d.id }
                      return ''
                    }}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black tracking-widest text-secondary flex items-center gap-1">Pay From Account{infoIcon('Which account will be used to pay this bill')}</label>
                  <SearchableSelect
                    options={accounts.map((a: any) => ({ value: a.id, label: a.name }))}
                    value={accountId}
                    onChange={(val) => setAccountId(val)}
                    placeholder="Select Account..."
                    onCreate={async (name) => {
                      const res = await fetch('/api/financials/accounts', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'x-household-id': householdId || '' },
                        body: JSON.stringify({ name, type: 'checking' })
                      })
                      const d = await res.json() as any
                      if (d.success) { mutateAccounts(); return d.id }
                      return ''
                    }}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black tracking-widest text-secondary flex items-center gap-1">External Owner{infoIcon('Someone outside your household who shares financial responsibility for this bill')}</label>
                  <ExternalContactSelect value={externalContactId} onChange={setExternalContactId} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black tracking-widest text-secondary flex items-center gap-1">Visibility{infoIcon('Controls who can see this entry — just you, your household, or anyone with a share link')}</label>
                  <VisibilitySelector
                    value={visibility}
                    publicScope={publicScope}
                    onChange={setVisibility}
                    onPublicScopeChange={setPublicScope}
                  />
                </div>
              </div>
            </AccordionSection>

            {/* SCHEDULING: accordion, collapsed */}
            <AccordionSection icon={Clock} title="Scheduling" defaultOpen={false}>
              <div className="space-y-3">

                {/* Rate Adjustment */}
                <div className="p-3 border border-amber-500/10 bg-amber-500/5 rounded-xl">
                  <button type="button" onClick={() => setShowRateAdjustment(!showRateAdjustment)}
                    className="w-full flex items-center justify-between outline-none cursor-pointer">
                    <span className="text-[10px] font-black tracking-widest text-amber-500 flex items-center gap-1">Planned Rate Adjustment{infoIcon('Schedule a future change to this bill amount')}</span>
                    <span className="text-[10px] text-slate-500">{showRateAdjustment ? '▼' : '▶'}</span>
                  </button>
                  {showRateAdjustment && (
                    <div className="grid grid-cols-2 gap-3 pt-3 animate-in slide-in-from-top-2">
                      <div>
                        <label className="text-xs font-bold tracking-wider uppercase text-white/60 flex items-center gap-1">Upcoming Amount{infoIcon('The new amount when the rate change takes effect')}</label>
                        <CurrencyInput valueCents={upcomingAmountCents} onChangeCents={setUpcomingAmountCents}
                          placeholder="0.00" className="bg-black/40 border-white/5" />
                      </div>
                      <div>
                        <label className="text-xs font-bold tracking-wider uppercase text-white/60 flex items-center gap-1">Effective Date{infoIcon('The date when the new amount takes effect')}</label>
                        <input type="date" value={upcomingDate} onChange={(e) => setUpcomingDate(e.target.value)}
                          className="w-full p-2.5 bg-black/40 border border-white/5 rounded-xl text-white text-xs font-bold outline-none focus:border-white/20" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Paycheck Alignment */}
                {paySchedules && paySchedules.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black tracking-widest text-secondary flex items-center gap-1">Assign to Paycheck{infoIcon('Link this bill to a specific income schedule for cash flow planning')}</label>
                    <div className="grid grid-cols-2 gap-3">
                      <SearchableSelect
                        options={[{ value: '', label: 'Do not assign' }, ...paySchedules.map((ps: any) => ({ value: ps.id, label: ps.name }))]}
                        value={payScheduleId}
                        onChange={(val) => setPayScheduleId(val)}
                        placeholder="Search pay schedule..."
                      />
                      <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)}
                        className="w-full p-3 bg-white/5 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all font-bold text-sm" />
                    </div>
                  </div>
                )}
              </div>
            </AccordionSection>

            {/* BRANDING: accordion, collapsed */}
            <AccordionSection icon={Palette} title="Branding" defaultOpen={false}>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black tracking-widest text-secondary flex items-center gap-1">Logo URL{infoIcon('URL to the company logo for visual identification — auto-fetched if available')}</label>
                  <div className="flex gap-2">
                    <input type="text" value={iconUrl} onChange={(e) => setIconUrl(e.target.value)}
                      placeholder="https://logo.clearbit.com/netflix.com"
                      className="flex-1 p-3 bg-white/5 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all text-xs font-bold" />
                    <button type="button" onClick={handleAutoFetchLogo} disabled={isAutoFetching || !description}
                      className="px-3 bg-primary/10 border border-primary/30 text-primary rounded-xl text-[10px] font-black tracking-widest hover:bg-primary/20 transition-all disabled:opacity-40 flex items-center gap-1">
                      <RefreshCw size={12} className={isAutoFetching ? 'animate-spin' : ''} /> Auto
                    </button>
                  </div>
                </div>

                {/* Confirmation Number */}
                <div className="space-y-1.5">
                  <ConfirmationNumberBuilder
                    value={confirmationNumber}
                    onChangeValue={setConfirmationNumber}
                    confirmationNumbers={confirmationNumbers}
                    onChangeNumbers={setConfirmationNumbers}
                    accentColor="primary"
                    compact={true}
                    helperText="Payment reference or confirmation number from the provider."
                  />
                </div>

                {/* Pay Date */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black tracking-widest text-secondary flex items-center gap-1">Pay Date{infoIcon('The date the payment is actually made (may differ from the due date)')}</label>
                  <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full p-3 bg-white/5 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all text-sm font-bold" />
                </div>

                {/* Save to Registry */}
                {hasChangesToProvider && selectedProvider && (
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox checked={saveToRegistry} onChange={setSaveToRegistry} iconClassName="text-primary" />
                      <label onClick={() => setSaveToRegistry(!saveToRegistry)} className="text-[10px] font-black tracking-widest text-primary/90 cursor-pointer select-none flex items-center gap-1">
                        Save defaults to provider registry{infoIcon('Save the current settings as defaults for this provider for future entries')}
                      </label>
                    </div>
                    {saveToRegistry && (
                      <div className="pl-6 space-y-1.5 animate-in fade-in">
                        <div className="flex gap-4">
                          <label className="flex items-center gap-1.5 text-[10px] font-semibold text-white cursor-pointer">
                            <input type="radio" name="provider_scope" checked={registryScope === 'private'}
                              onChange={() => setRegistryScope('private')} className="accent-primary" />
                            Personal
                          </label>
                          {canManageHousehold && (
                            <label className="flex items-center gap-1.5 text-[10px] font-semibold text-white cursor-pointer">
                              <input type="radio" name="provider_scope" checked={registryScope === 'household'}
                                onChange={() => setRegistryScope('household')} className="accent-primary" />
                              Household
                            </label>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </AccordionSection>
          </div>
        )}
      </div>
    );
  };

  const renderTimelineLogs = () => {
    if (initialData?.id && initialData.type !== 'pay_schedule' && initialData.type !== 'bill' && initialData.type !== 'subscription' && !initialData.id.startsWith('bill-proj-') && !initialData.id.startsWith('pay-proj-') && !initialData.isProjected) {
      return (
        <div className="pt-4 border-t border-white/5">
          <button 
            type="button"
            onClick={() => setShowTimeline(!showTimeline)}
            className="w-full py-3 px-4 rounded-xl flex items-center justify-between bg-white/5 border border-white/5 hover:bg-white/10 transition-all group"
          >
            <div className="flex items-center gap-3">
               <Activity size={16} className="text-amber-500" />
               <span className="text-[10px] font-black tracking-widest text-slate-400 group-hover:text-white transition-colors">Privacy & Data Ownership Audit History</span>
            </div>
            <span className="text-[10px] font-black tracking-widest text-slate-600 group-hover:text-amber-500 transition-colors">
              {showTimeline ? 'Close Logs' : 'View Logs'}
            </span>
          </button>
          
          <AnimatePresence>
            {showTimeline && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-6"
              >
                <TransactionTimeline transactionId={initialData.id} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }
    return null;
  };

  const ModalContainer = reduced ? 'div' : motion.div;
  const containerProps = reduced ? {} : {
    initial: { opacity: 0, scale: 0.9, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0 }
  };

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4 overflow-y-auto">
      {/* Absolute background overlay */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose} />
      
      {/* @ts-ignore */}
      <ModalContainer 
        {...containerProps} 
        className="card w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden reveal p-0 relative z-10"
      >
        <div className="p-8 pb-4 flex justify-between items-center border-b border-white/5">
           <div>
              <h3 className="text-2xl font-black italic tracking-tighter">{initialData ? 'Update' : 'New'} <span className="text-primary">Entry</span></h3>
              <p className="text-xs text-secondary font-bold tracking-widest mt-1">Calendar Ledger Management</p>
           </div>
           <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded-full transition-all text-slate-500 hover:text-white">
             <X size={24} />
           </button>
        </div>

        <div className="px-8 pt-4">
          <div className="flex bg-white/5 p-1 rounded-2xl border border-glass-border">
            <button 
              type="button"
              onClick={() => setType('pay_schedule')}
              className={`flex-1 flex justify-center items-center py-3 px-2 rounded-xl text-[10px] sm:text-xs font-black tracking-widest transition-all ${type === 'pay_schedule' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-white'}`}
            >
              Pay
            </button>
            <button 
              type="button"
              onClick={() => setType(isRecurring ? 'bill' : 'charge')}
              className={`flex-1 flex justify-center items-center py-3 px-2 rounded-xl text-[10px] sm:text-xs font-black tracking-widest transition-all ${type !== 'pay_schedule' && type !== 'installment' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-slate-500 hover:text-white'}`}
            >
              Expenses
            </button>
            <button 
              type="button"
              onClick={() => setType('installment')}
              className={`flex-1 flex justify-center items-center py-3 px-2 rounded-xl text-[9px] sm:text-[11px] font-black tracking-widest leading-tight text-center transition-all ${type === 'installment' ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/20' : 'text-slate-500 hover:text-white'}`}
            >
              Buy Now,<br />Pay Later
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            {renderFormContent()}
            {renderTimelineLogs()}
          </div>

          <div className="p-8 pt-4 border-t border-white/5 bg-black/40 flex gap-4">
             {initialData && onDelete && (
               <button 
                type="button"
                onClick={() => {
                  if (isItemRecurring) {
                    setScopeConfirmState('delete');
                  } else {
                    onDelete(initialData.id, initialData.type);
                  }
                }}
                 className="flex items-center gap-2 px-4 py-3 border border-red-500/30 text-red-500 rounded-2xl hover:bg-red-500/10 transition-all cursor-pointer text-xs font-black tracking-widest"
                >
                  <Trash2 size={18} /> Delete
                </button>
             )}
             <button 
              type="submit"
               className={`flex-1 py-4 px-6 rounded-2xl text-xs font-black tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl cursor-pointer ${type === 'pay_schedule' ? 'bg-blue-500 text-white shadow-blue-500/20' : type === 'installment' ? 'bg-violet-500 text-white shadow-violet-500/20' : 'bg-amber-500 text-black shadow-amber-500/20'}`}
             >
               <CheckCircle2 size={18} />
               {initialData ? 'Save Changes' : 'Create Entry'}
             </button>
          </div>
        </form>
      </ModalContainer>

      {scopeConfirmState && (
        <div 
          className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
          onClick={() => setScopeConfirmState(null)}
        >
          <div 
            className="card w-full max-w-md p-8 space-y-6"
            onClick={e => e.stopPropagation()}
          >
            <div>
              <h3 className="text-xl font-black italic tracking-tighter text-amber-500">
                Confirm {scopeConfirmState === 'edit' ? 'Update' : 'Delete'} Scope
              </h3>
              <p className="text-xs text-secondary font-bold tracking-widest mt-1">
                This is a recurring {type === 'pay_schedule' ? 'income schedule' : type === 'installment' ? 'Buy Now, Pay Later installment plan' : 'bill'}
              </p>
            </div>

            <div className="space-y-3">
              {[
                {
                  id: 'one' as const,
                  title: 'Just this time',
                  desc: `Only ${scopeConfirmState === 'edit' ? 'change' : 'delete'} this occurrence on ${initialData?.date || currentDate}. Other instances in this schedule won't change.`
                },
                {
                  id: 'future' as const,
                  title: 'From now on',
                  desc: `Apply this ${scopeConfirmState === 'edit' ? 'change' : 'deletion'} to this occurrence and all upcoming ones. Past history remains unchanged.`
                },
                {
                  id: 'all' as const,
                  title: 'All payments',
                  desc: `Apply this ${scopeConfirmState === 'edit' ? 'change' : 'deletion'} to all instances (past, present, and future) in this schedule.`
                }
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    const cleanId = initialData.originalId || initialData.id;
                    if (scopeConfirmState === 'edit') {
                      submitForm(opt.id);
                    } else {
                      if (onDelete) onDelete(cleanId, initialData.type, opt.id, initialData.date);
                    }
                    setScopeConfirmState(null);
                  }}
                  className="w-full p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-amber-500/30 text-left transition-all flex flex-col gap-1 hover:bg-white/[0.08] cursor-pointer"
                >
                  <div className="text-sm font-black text-white">{opt.title}</div>
                  <div className="text-xs text-secondary leading-relaxed font-medium">{opt.desc}</div>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setScopeConfirmState(null)}
              className="w-full py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-xs font-black tracking-widest transition-all cursor-pointer"
            >
              Go Back
            </button>
          </div>
        </div>
      )}

      {activeTooltip && createPortal(
        <TooltipPopover text={activeTooltip.text} el={activeTooltip.el} />,
        document.body
      )}
    </div>
  );
};
