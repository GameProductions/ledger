import React, { useState, useMemo, useEffect } from 'react';
import { X, Trash2, CheckCircle2, Hash, Activity, Database, User, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TypeableSelect } from './ui/TypeableSelect';
import { TransactionTimeline } from './TransactionTimeline';
import { CurrencyInput } from './ui/CurrencyInput';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { SearchableSelect } from './ui/SearchableSelect';
import { Checkbox } from './ui/Checkbox';
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

export const CalendarEntryModal: React.FC<CalendarEntryModalProps> = ({ 
  isOpen, onClose, onSave, onDelete, initialData, date, paySchedules = []
}) => {
  const { householdId, token } = useAuth();
  const reduced = useReducedMotion();

  // Load API resources
  const { data: providersEnvelope, mutate: mutateProviders } = useApi('/api/user/service-providers') as any;
  const providers = providersEnvelope?.data || [];

  const { data: categories = [] } = useApi('/api/financials/categories') as any;
  const { data: accounts = [] } = useApi('/api/financials/accounts') as any;
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

  const [type, setType] = useState<'charge' | 'bill' | 'pay_schedule'>(
    initialData?.type === 'pay_schedule' 
      ? 'pay_schedule' 
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

  const handleProviderChange = (providerName: string) => {
    setDescription(providerName);
    const matched = providers.find((p: any) => p.name.toLowerCase() === providerName.toLowerCase());
    if (matched) {
      setSelectedProvider(matched);
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
    }
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
    initialData.type === 'pay_schedule'
  );

  if (!isOpen) return null;

  const submitForm = async (scope?: 'one' | 'future' | 'all') => {
    const id = initialData?.originalId || initialData?.id;

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
        notes
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
          originalDate: initialData?.date
        }, scope);
      } else {
        onSave({
          id,
          type: 'charge',
          description,
          amountCents: amountCents,
          transactionDate: paymentDate,
          status,
          confirmationNumber: confirmationNumber,
          categoryId: categoryId || null,
          accountId: accountId || null,
          payScheduleId: payScheduleId || null,
          paycheckDate: paymentDate || null
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
        {type === 'pay_schedule' ? (
          // Pay Tab Layout
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                 <label className="text-xs font-black uppercase tracking-widest text-secondary ml-1">Source Type</label>
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
                 <label className="text-xs font-black uppercase tracking-widest text-secondary ml-1">Source Name (e.g. Company)</label>
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
                 <label className="text-xs font-black uppercase tracking-widest text-secondary ml-1">Frequency</label>
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
                 <label className="text-xs font-black uppercase tracking-widest text-secondary ml-1">Internal Notes</label>
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
                   <label className="text-[10px] font-black uppercase tracking-widest text-blue-500/60 ml-1">First Day of Month</label>
                   <input 
                     type="number" min="1" max="31"
                     value={semiMonthlyDay1}
                     onChange={(e) => setSemiMonthlyDay1(Number(e.target.value))}
                     className="w-full p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl text-white font-bold"
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-blue-500/60 ml-1">Second Day of Month</label>
                   <input 
                     type="number" min="1" max="31"
                     value={semiMonthlyDay2}
                     onChange={(e) => setSemiMonthlyDay2(Number(e.target.value))}
                     className="w-full p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl text-white font-bold"
                   />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-secondary ml-1">Estimated Net Amount</label>
                  <CurrencyInput 
                    valueCents={amountCents}
                    onChangeCents={setAmountCents}
                    placeholder="0.00"
                    showSymbol={true}
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-secondary ml-1">Next Pay Date</label>
                  <input 
                    required
                    type="date" 
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full p-4 bg-white/5 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all font-bold text-lg appearance-none"
                  />
               </div>
            </div>

            {/* Planned Rate Adjustment for Paydays */}
            <div className="p-4 border rounded-2xl space-y-4 bg-blue-500/5 border-blue-500/10">
              <button
                type="button"
                onClick={() => setShowRateAdjustment(!showRateAdjustment)}
                className="w-full flex items-center justify-between outline-none cursor-pointer"
              >
                <div className="text-[10px] font-black uppercase tracking-widest text-blue-500">Planned Rate Adjustment (Optional)</div>
                <span className="text-xs text-slate-500">{showRateAdjustment ? '▼' : '▶'}</span>
              </button>
              {showRateAdjustment && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                     <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-1">Upcoming Amount</label>
                     <CurrencyInput
                       valueCents={upcomingAmountCents}
                       onChangeCents={setUpcomingAmountCents}
                       placeholder="0.00;;"
                       className="bg-black/40 border-white/5"
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-1">Effective Date</label>
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
        ) : (
          // Combined Bills & Charges Layout
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* GROUP 1: PRIORITY FIELDS (Provider, Category, Amount, Due Date, Pay Date) */}
            <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Core Entry Information</div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Provider Dropdown (Linked to Service Providers registry) */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-secondary ml-1">Provider / Description</label>
                  <SearchableSelect
                    options={providerOptions}
                    value={description}
                    onChange={handleProviderChange}
                    placeholder="Search or enter provider..."
                    onCreate={(val) => {
                      handleProviderChange(val);
                      return val;
                    }}
                  />
                </div>

                {/* Category Dropdown */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-secondary ml-1">Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full p-4 bg-white/5 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all font-bold text-sm"
                  >
                    <option value="">Select Category...</option>
                    {categories.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Amount */}
                <div className="space-y-2">
                   <label className="text-xs font-black uppercase tracking-widest text-secondary ml-1">Amount</label>
                   <CurrencyInput 
                     valueCents={amountCents}
                     onChangeCents={setAmountCents}
                     placeholder="0.00"
                     showSymbol={true}
                   />
                </div>

                {/* Due Date */}
                <div className="space-y-2">
                   <label className="text-xs font-black uppercase tracking-widest text-secondary ml-1">Due Date</label>
                   <input 
                     required
                     type="date" 
                     value={dueDate}
                     onChange={(e) => handleDueDateChange(e.target.value)}
                     className="w-full p-4 bg-white/5 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all font-bold text-md"
                   />
                </div>

                {/* Pay/Payment Date */}
                <div className="space-y-2">
                   <label className="text-xs font-black uppercase tracking-widest text-secondary ml-1">Pay Date</label>
                   <input 
                     required
                     type="date" 
                     value={paymentDate}
                     onChange={(e) => setPaymentDate(e.target.value)}
                     className="w-full p-4 bg-white/5 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all font-bold text-md"
                   />
                </div>
              </div>

              {/* Account Dropdown */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-secondary ml-1">Pay From Account</label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full p-4 bg-white/5 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all font-bold text-sm"
                >
                  <option value="">Select Account...</option>
                  {accounts.map((a: any) => (
                    <option key={a.id} value={a.id}>{a.name.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* OPTIONAL PROVIDER REGISTRY SYNC PANEL */}
            {hasChangesToProvider && selectedProvider && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl space-y-3 animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3">
                  <Checkbox 
                    checked={saveToRegistry} 
                    onChange={setSaveToRegistry} 
                    iconClassName="text-primary"
                  />
                  <label onClick={() => setSaveToRegistry(!saveToRegistry)} className="text-xs font-black uppercase tracking-widest text-primary/90 cursor-pointer select-none">
                    Save defaults to provider registry?
                  </label>
                </div>
                {saveToRegistry && (
                  <div className="pl-7 space-y-2 animate-in fade-in duration-150">
                    <div className="text-[10px] text-secondary font-bold uppercase tracking-wider">Save scope / visibility:</div>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-xs font-semibold text-white cursor-pointer">
                        <input 
                          type="radio" 
                          name="provider_scope"
                          checked={registryScope === 'private'}
                          onChange={() => setRegistryScope('private')}
                          className="accent-primary"
                        />
                        Personal (Private)
                      </label>
                      {canManageHousehold && (
                        <label className="flex items-center gap-2 text-xs font-semibold text-white cursor-pointer">
                          <input 
                            type="radio" 
                            name="provider_scope"
                            checked={registryScope === 'household'}
                            onChange={() => setRegistryScope('household')}
                            className="accent-primary"
                          />
                          Household (Shared)
                        </label>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* GROUP 2: SECONDARY LOGICAL FIELDS (Status, Recurrence, Rate Adj, Paycheck Alignment) */}
            <div className="p-5 bg-white/[0.01] border border-white/5 rounded-2xl space-y-5">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-1">Status & Scheduling Details</div>

              {/* Status & Confirmation Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-secondary ml-1">Status</label>
                    <TypeableSelect 
                      options={[
                        { value: 'paid', label: 'PAID', icon: <div className="w-2 h-2 rounded-full bg-emerald-500" /> },
                        { value: 'pending', label: 'PENDING', icon: <div className="w-2 h-2 rounded-full bg-amber-500" /> },
                        { value: 'scheduled', label: 'SCHEDULED', icon: <div className="w-2 h-2 rounded-full bg-blue-500" /> },
                        { value: 'unpaid', label: 'UNPAID', icon: <div className="w-2 h-2 rounded-full bg-red-500" /> }
                      ]}
                      value={status}
                      onChange={(val) => setStatus(val)}
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-secondary ml-1">Confirmation #</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={confirmationNumber}
                        onChange={(e) => setConfirmationNumber(e.target.value)}
                        placeholder="Optional..."
                        className="w-full p-4 pl-12 bg-white/5 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all font-bold text-md"
                      />
                      <Hash size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    </div>
                 </div>
              </div>

              {/* Expandable Recurrence Section */}
              <div className="border border-white/5 bg-white/[0.01] rounded-2xl overflow-hidden transition-all duration-300">
                <button
                  type="button"
                  onClick={() => setIsRecurring(!isRecurring)}
                  className="w-full flex items-center justify-between p-4 outline-none hover:bg-white/[0.02] transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <Checkbox 
                      checked={isRecurring} 
                      onChange={setIsRecurring} 
                      iconClassName="text-amber-500"
                    />
                    <span className="text-xs font-black uppercase tracking-widest text-secondary">
                      Make this a recurring bill
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">{isRecurring ? '▼' : '▶'}</span>
                </button>
                {isRecurring && (
                  <div className="p-4 pt-0 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-white/5 animate-in slide-in-from-top-2 duration-300">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-secondary ml-1">Frequency</label>
                      <TypeableSelect 
                        options={FREQUENCY_OPTIONS}
                        value={frequency === 'semi-monthly' || frequency === 'manual' ? 'monthly' : frequency}
                        onChange={(val) => setFrequency(val)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-secondary ml-1">End Date</label>
                      <input 
                        type="date"
                        value={billEndDate}
                        onChange={(e) => setBillEndDate(e.target.value)}
                        className="w-full p-3 bg-black/40 border border-white/5 rounded-xl text-white font-bold text-xs outline-none focus:border-white/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-secondary ml-1">Max Occurrences</label>
                      <input 
                        type="number"
                        placeholder="Unlimited"
                        value={billMaxOccurrences}
                        onChange={(e) => setBillMaxOccurrences(e.target.value)}
                        className="w-full p-3 bg-black/40 border border-white/5 rounded-xl text-white font-bold text-xs outline-none focus:border-white/20"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Expandable Rate Adjustment for Bills */}
              <div className="p-4 border rounded-2xl space-y-4 bg-amber-500/5 border-amber-500/10">
                <button
                  type="button"
                  onClick={() => setShowRateAdjustment(!showRateAdjustment)}
                  className="w-full flex items-center justify-between outline-none cursor-pointer"
                >
                  <div className="text-[10px] font-black uppercase tracking-widest text-amber-500">Planned Rate Adjustment (Optional)</div>
                  <span className="text-xs text-slate-500">{showRateAdjustment ? '▼' : '▶'}</span>
                </button>
                {showRateAdjustment && (
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-1">Upcoming Amount</label>
                       <CurrencyInput
                         valueCents={upcomingAmountCents}
                         onChangeCents={setUpcomingAmountCents}
                         placeholder="0.00"
                         className="bg-black/40 border-white/5"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-1">Effective Date</label>
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

              {/* Assign to Paycheck alignment options */}
              {paySchedules && paySchedules.length > 0 && (
                <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-widest text-secondary ml-1">Assign to Paycheck</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <select
                      value={payScheduleId}
                      onChange={(e) => setPayScheduleId(e.target.value)}
                      className="w-full p-4 bg-white/5 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all font-bold text-sm"
                    >
                      <option value="">Do not assign schedule</option>
                      {paySchedules.map(ps => (
                        <option key={ps.id} value={ps.id}>{ps.name.toUpperCase()}</option>
                      ))}
                    </select>

                    <input 
                      type="date" 
                      value={paymentDate} 
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full p-4 bg-white/5 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all font-bold text-md"
                      placeholder="Align paycheck date..."
                    />
                  </div>
                </div>
              )}
            </div>
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
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white transition-colors">Privacy & Data Ownership Audit History</span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 group-hover:text-amber-500 transition-colors">
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

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4 overflow-y-auto">
      {/* Absolute background overlay */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose} />
      
      {reduced ? (
        // REDUCED MOTION LAYOUT
        <div className="card w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden reveal p-0 relative z-10">
          <div className="p-8 pb-4 flex justify-between items-center border-b border-white/5">
             <div>
                <h3 className="text-2xl font-black italic tracking-tighter uppercase">{initialData ? 'Update' : 'New'} <span className="text-primary">Entry</span></h3>
                <p className="text-xs text-secondary uppercase font-bold tracking-widest mt-1">Calendar Ledger Management</p>
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
                className={`flex-1 flex justify-center items-center py-3 px-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${type === 'pay_schedule' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-white'}`}
              >
                Pay
              </button>
              <button 
                type="button"
                onClick={() => setType(isRecurring ? 'bill' : 'charge')}
                className={`flex-1 flex justify-center items-center py-3 px-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${type !== 'pay_schedule' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-slate-500 hover:text-white'}`}
              >
                Bills & Charges
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
                  className="w-14 h-14 flex items-center justify-center bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl hover:bg-red-500/20 transition-all cursor-pointer"
                 >
                   <Trash2 size={24} />
                 </button>
               )}
               <button 
                type="submit"
                className={`flex-1 py-4 px-6 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl cursor-pointer ${type === 'pay_schedule' ? 'bg-blue-500 text-white shadow-blue-500/20' : 'bg-amber-500 text-black shadow-amber-500/20'}`}
               >
                 <CheckCircle2 size={18} />
                 {initialData ? 'Save Changes' : 'Create Entry'}
               </button>
            </div>
          </form>
        </div>
      ) : (
        // STANDARD ANIMATED LAYOUT (MOTION.DIV)
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="card w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden reveal p-0 relative z-10"
        >
          <div className="p-8 pb-4 flex justify-between items-center border-b border-white/5">
             <div>
                <h3 className="text-2xl font-black italic tracking-tighter uppercase">{initialData ? 'Update' : 'New'} <span className="text-primary">Entry</span></h3>
                <p className="text-xs text-secondary uppercase font-bold tracking-widest mt-1">Calendar Ledger Management</p>
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
                className={`flex-1 flex justify-center items-center py-3 px-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${type === 'pay_schedule' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-white'}`}
              >
                Pay
              </button>
              <button 
                type="button"
                onClick={() => setType(isRecurring ? 'bill' : 'charge')}
                className={`flex-1 flex justify-center items-center py-3 px-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${type !== 'pay_schedule' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-slate-500 hover:text-white'}`}
              >
                Bills & Charges
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
                  className="w-14 h-14 flex items-center justify-center bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl hover:bg-red-500/20 transition-all cursor-pointer"
                 >
                   <Trash2 size={24} />
                 </button>
               )}
               <button 
                type="submit"
                className={`flex-1 py-4 px-6 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl cursor-pointer ${type === 'pay_schedule' ? 'bg-blue-500 text-white shadow-blue-500/20' : 'bg-amber-500 text-black shadow-amber-500/20'}`}
               >
                 <CheckCircle2 size={18} />
                 {initialData ? 'Save Changes' : 'Create Entry'}
               </button>
            </div>
          </form>
        </motion.div>
      )}

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
              <h3 className="text-xl font-black italic tracking-tighter uppercase text-amber-500">
                Confirm {scopeConfirmState === 'edit' ? 'Update' : 'Delete'} Scope
              </h3>
              <p className="text-xs text-secondary font-bold uppercase tracking-widest mt-1">
                This is a recurring {type === 'pay_schedule' ? 'income schedule' : 'bill'}
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
              className="w-full py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer"
            >
              Go Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
