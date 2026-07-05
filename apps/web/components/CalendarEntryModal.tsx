import React, { useState, useMemo } from 'react';
import { X, Trash2, CheckCircle2, Hash, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TypeableSelect } from './ui/TypeableSelect';
import { TransactionTimeline } from './TransactionTimeline';
import { CurrencyInput } from './ui/CurrencyInput';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { SearchableSelect } from './ui/SearchableSelect';

interface CalendarEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any, recurrenceScope?: 'one' | 'future' | 'all') => void;
  onDelete?: (id: string, type: string, recurrenceScope?: 'one' | 'future' | 'all', selectedDate?: string) => void;
  initialData?: any;
  date?: Date;
  paySchedules?: any[];
}

export const CalendarEntryModal: React.FC<CalendarEntryModalProps> = ({ 
  isOpen, onClose, onSave, onDelete, initialData, date, paySchedules = []
}) => {
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
    
    // Add default user-friendly fallback paycheck / income source types
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
          if (match) {
            names.add(match[2]);
          }
        }
      });
    }
    return Array.from(names).map(name => ({ value: name, label: name }));
  }, [paySchedules]);

  const parseInitialSource = (fullName: string) => {
    if (!fullName) return { type: '', name: '' };
    const match = fullName.match(/^(.+?)\s*\((.+?)\)$/);
    if (match) {
      return { type: match[1], name: match[2] };
    }
    return { type: fullName, name: '' };
  };

  const initialSource = parseInitialSource(initialData?.description || initialData?.name || '');

  const [type, setType] = useState<'charge' | 'bill' | 'pay_schedule'>(initialData?.type === 'pay_schedule' ? 'pay_schedule' : initialData?.type === 'subscription' ? 'bill' : 'charge');
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
  const [paycheckDate, setPaycheckDate] = useState(initialData?.paycheckDate || '');
  const [scopeConfirmState, setScopeConfirmState] = useState<'edit' | 'delete' | null>(null);
  const reduced = useReducedMotion();

  const isItemRecurring = !!initialData && (
    initialData.isRecurring || 
    initialData.originalData?.isRecurring || 
    initialData.type === 'subscription' || 
    initialData.type === 'pay_schedule'
  );

  if (!isOpen) return null;

  const submitForm = (scope?: 'one' | 'future' | 'all') => {
    const id = initialData?.originalId || initialData?.id;
    if (type === 'pay_schedule') {
      const combinedName = sourceName?.trim() ? `${sourceType.trim()} (${sourceName.trim()})` : sourceType.trim();
      onSave({
        id,
        type,
        name: combinedName,
        estimatedAmountCents: amountCents,
        nextPayDate: currentDate,
        frequency,
        semiMonthlyDay1: frequency === 'semi-monthly' ? semiMonthlyDay1 : null,
        semiMonthlyDay2: frequency === 'semi-monthly' ? semiMonthlyDay2 : null,
        notes
      }, scope);
    } else if (type === 'bill') {
      onSave({
        id,
        type: 'bill',
        name: description,
        amountCents: amountCents,
        dueDate: currentDate,
        status: status,
        notes: notes,
        isRecurring: isRecurring,
        frequency: isRecurring ? (frequency === 'semi-monthly' || frequency === 'manual' ? 'monthly' : frequency) : null,
        endDate: isRecurring && billEndDate ? billEndDate : null,
        maxOccurrences: isRecurring && billMaxOccurrences ? parseInt(billMaxOccurrences) : null,
        payScheduleId: payScheduleId || null,
        paycheckDate: paycheckDate || null,
        originalDate: initialData?.date
      }, scope);
    } else {
      onSave({
        id,
        type: 'charge',
        description,
        amountCents: amountCents,
        transactionDate: currentDate,
        status,
        confirmationNumber: confirmationNumber,
        payScheduleId: payScheduleId || null,
        paycheckDate: paycheckDate || null
      }, scope);
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

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl" onClick={onClose}>
      {reduced ? (
        <div 
          className="card w-full max-w-2xl p-8 reveal space-y-8 overflow-y-auto max-h-[90vh]"
          onClick={e => e.stopPropagation()}
        >
        <div className="flex justify-between items-center">
           <div>
              <h3 className="text-2xl font-black italic tracking-tighter uppercase">{initialData ? 'Update' : 'New'} <span className="text-primary">Entry</span></h3>
              <p className="text-xs text-secondary uppercase font-bold tracking-widest mt-1">Calendar Ledger Management</p>
           </div>
           <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded-full transition-all text-slate-500 hover:text-white">
             <X size={24} />
           </button>
        </div>

        <div className="flex bg-white/5 p-1 rounded-2xl border border-glass-border">
          <button 
            type="button"
            onClick={() => setType('pay_schedule')}
            className={`flex-1 flex justify-center items-center py-3 px-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${type === 'pay_schedule' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-white'}`}
          >
            Payday
          </button>
          <button 
            type="button"
            onClick={() => setType('bill')}
            className={`flex-1 flex justify-center items-center py-3 px-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${type === 'bill' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-slate-500 hover:text-white'}`}
          >
            Future Bill
          </button>
          <button 
            type="button"
            onClick={() => setType('charge')}
            className={`flex-1 flex justify-center items-center py-3 px-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${type === 'charge' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-white'}`}
          >
            Charge
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
              {type === 'pay_schedule' ? (
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
              ) : (
                <div className="space-y-2">
                   <label className="text-xs font-black uppercase tracking-widest text-secondary ml-1">Label / Description</label>
                   <input 
                     required
                     type="text" 
                     value={description}
                     onChange={(e) => setDescription(e.target.value)}
                     placeholder="e.g. Amazon Web Services"
                     className="w-full p-4 bg-white/5 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all font-bold text-lg"
                   />
                </div>
              )}

              {type !== 'pay_schedule' ? (
                <div className="grid grid-cols-2 gap-4">
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
                          className="w-full p-4 pl-12 bg-white/5 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all font-bold text-lg"
                        />
                        <Hash size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                      </div>
                   </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-xs font-black uppercase tracking-widest text-secondary ml-1">Frequency</label>
                       <TypeableSelect 
                         options={[
                           { value: 'manual', label: 'JUST ONCE' },
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
                </div>
              )}

              {(type === 'bill' || type === 'pay_schedule') && (
                <div className={`p-4 border rounded-2xl space-y-4 animate-in zoom-in-95 duration-300 ${type === 'pay_schedule' ? 'bg-blue-500/5 border-blue-500/10' : 'bg-amber-500/5 border-amber-500/10'}`}>
                  <div className={`text-[10px] font-black uppercase tracking-widest ${type === 'pay_schedule' ? 'text-blue-500' : 'text-amber-500'}`}>Planned Rate Adjustment (Optional)</div>
                  <div className="grid grid-cols-2 gap-4">
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
                </div>
              )}

              {type === 'bill' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                      <input 
                        type="checkbox" 
                        id="isRecurring"
                        checked={isRecurring}
                        onChange={(e) => setIsRecurring(e.target.checked)}
                        className="w-5 h-5 accent-amber-500"
                      />
                      <label htmlFor="isRecurring" className="text-xs font-black uppercase tracking-widest text-amber-500/80 cursor-pointer">
                          This is a recurring bill
                      </label>
                  </div>
                  {isRecurring && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-white/5 border border-glass-border rounded-2xl animate-in slide-in-from-top-2 duration-300">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-secondary ml-1">Frequency</label>
                        <TypeableSelect 
                          options={[
                            { value: 'weekly', label: 'WEEKLY' },
                            { value: 'biweekly', label: 'BIWEEKLY' },
                            { value: 'monthly', label: 'MONTHLY' },
                            { value: 'quarterly', label: 'QUARTERLY' },
                            { value: 'annually', label: 'ANNUALLY' }
                          ]}
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
              )}

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-secondary ml-1">Amount</label>
                     <CurrencyInput 
                       valueCents={amountCents}
                       onChangeCents={setAmountCents}
                       placeholder="0.00"
                     />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-secondary ml-1">Due / Scheduled Date</label>
                    <input 
                      required
                      type="date" 
                      value={currentDate}
                      onChange={(e) => setCurrentDate(e.target.value)}
                      className="w-full p-4 bg-white/5 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all font-bold text-lg appearance-none"
                    />
                 </div>
              </div>

              {(type === 'bill' || type === 'charge') && paySchedules && paySchedules.length > 0 && (
                <div className="space-y-2 animate-in fade-in duration-300">
                  <label className="text-xs font-black uppercase tracking-widest text-secondary ml-1">Assign to Paycheck</label>
                  <select
                    value={payScheduleId}
                    onChange={(e) => setPayScheduleId(e.target.value)}
                    className="w-full p-4 bg-white/5 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all font-bold text-sm"
                  >
                    <option value="">Do not assign</option>
                    {paySchedules.map(ps => (
                      <option key={ps.id} value={ps.id}>{ps.name.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              )}

              {initialData?.id && (
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
                   
                    {showTimeline && (
                      <div className="overflow-hidden mt-6">
                        <TransactionTimeline transactionId={initialData.id} />
                      </div>
                    )}
                 </div>
               )}
           </div>

           <div className="pt-4 flex gap-4">
              {initialData && onDelete && (
                <button 
                 type="button"
                 onClick={() => onDelete(initialData.id, initialData.type)}
                 className="w-14 h-14 flex items-center justify-center bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl hover:bg-red-500/20 transition-all"
                >
                  <Trash2 size={24} />
                </button>
              )}
              <button 
               type="submit"
               className={`flex-1 py-4 px-6 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl ${type === 'pay_schedule' ? 'bg-blue-500 text-white shadow-blue-500/20 hover:scale-[1.02]' : type === 'charge' ? 'bg-emerald-500 text-black shadow-emerald-500/20 hover:scale-[1.02]' : 'bg-amber-500 text-black shadow-amber-500/20 hover:scale-[1.02]'}`}
              >
                <CheckCircle2 size={18} />
                {initialData ? 'Save Changes' : 'Create Entry'}
              </button>
           </div>
         </form>
       </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="card w-full max-w-2xl p-8 reveal space-y-8 overflow-y-auto max-h-[90vh]"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-between items-center">
             <div>
                <h3 className="text-2xl font-black italic tracking-tighter uppercase">{initialData ? 'Update' : 'New'} <span className="text-primary">Entry</span></h3>
                <p className="text-xs text-secondary uppercase font-bold tracking-widest mt-1">Calendar Ledger Management</p>
             </div>
             <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded-full transition-all text-slate-500 hover:text-white">
               <X size={24} />
             </button>
          </div>

          <div className="flex bg-white/5 p-1 rounded-2xl border border-glass-border">
            <button 
              type="button"
              onClick={() => setType('pay_schedule')}
              className={`flex-1 flex justify-center items-center py-3 px-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${type === 'pay_schedule' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-white'}`}
            >
              Payday
            </button>
            <button 
              type="button"
              onClick={() => setType('bill')}
              className={`flex-1 flex justify-center items-center py-3 px-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${type === 'bill' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-slate-500 hover:text-white'}`}
            >
              Future Bill
            </button>
            <button 
              type="button"
              onClick={() => setType('charge')}
              className={`flex-1 flex justify-center items-center py-3 px-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${type === 'charge' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-white'}`}
            >
              Charge
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              {type === 'pay_schedule' ? (
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
              ) : (
                <div className="space-y-2">
                   <label className="text-xs font-black uppercase tracking-widest text-secondary ml-1">Label / Description</label>
                   <input 
                     required
                     type="text" 
                     value={description}
                     onChange={(e) => setDescription(e.target.value)}
                     placeholder="e.g. Amazon Web Services"
                     className="w-full p-4 bg-white/5 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all font-bold text-lg"
                   />
                </div>
              )}

               {type !== 'pay_schedule' ? (
                 <div className="grid grid-cols-2 gap-4">
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
                           className="w-full p-4 pl-12 bg-white/5 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all font-bold text-lg"
                         />
                         <Hash size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                       </div>
                    </div>
                 </div>
               ) : (
                 <div className="space-y-4">
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
                 </div>
               )}

               {(type === 'bill' || type === 'pay_schedule') && (
                 <div className={`p-4 border rounded-2xl space-y-4 animate-in zoom-in-95 duration-300 ${type === 'pay_schedule' ? 'bg-blue-500/5 border-blue-500/10' : 'bg-amber-500/5 border-amber-500/10'}`}>
                   <div className={`text-[10px] font-black uppercase tracking-widest ${type === 'pay_schedule' ? 'text-blue-500' : 'text-amber-500'}`}>Planned Rate Adjustment (Optional)</div>
                   <div className="grid grid-cols-2 gap-4">
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
                 </div>
               )}

               {type === 'bill' && (
                 <div className="space-y-4">
                   <div className="flex items-center gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                       <input 
                         type="checkbox" 
                         id="isRecurring"
                         checked={isRecurring}
                         onChange={(e) => setIsRecurring(e.target.checked)}
                         className="w-5 h-5 accent-amber-500"
                       />
                       <label htmlFor="isRecurring" className="text-xs font-black uppercase tracking-widest text-amber-500/80 cursor-pointer">
                           This is a recurring bill
                       </label>
                   </div>
                   {isRecurring && (
                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-white/5 border border-glass-border rounded-2xl animate-in slide-in-from-top-2 duration-300">
                       <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-secondary ml-1">Frequency</label>
                         <TypeableSelect 
                           options={[
                             { value: 'weekly', label: 'WEEKLY' },
                             { value: 'biweekly', label: 'BIWEEKLY' },
                             { value: 'monthly', label: 'MONTHLY' },
                             { value: 'quarterly', label: 'QUARTERLY' },
                             { value: 'annually', label: 'ANNUALLY' }
                           ]}
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
               )}

               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <label className="text-xs font-black uppercase tracking-widest text-secondary ml-1">Amount</label>
                     <CurrencyInput 
                       valueCents={amountCents}
                       onChangeCents={setAmountCents}
                       placeholder="0.00"
                       showSymbol={true}
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-xs font-black uppercase tracking-widest text-secondary ml-1">Due / Scheduled Date</label>
                     <input 
                       required
                       type="date" 
                       value={currentDate}
                       onChange={(e) => setCurrentDate(e.target.value)}
                       className="w-full p-4 bg-white/5 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all font-bold text-lg appearance-none"
                     />
                  </div>
               </div>

              {(type === 'bill' || type === 'charge') && paySchedules && paySchedules.length > 0 && (
                <div className="space-y-2 animate-in fade-in duration-300">
                  <label className="text-xs font-black uppercase tracking-widest text-secondary ml-1">Assign to Paycheck</label>
                  <select
                    value={payScheduleId}
                    onChange={(e) => setPayScheduleId(e.target.value)}
                    className="w-full p-4 bg-white/5 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all font-bold text-sm"
                  >
                    <option value="">Do not assign</option>
                    {paySchedules.map(ps => (
                      <option key={ps.id} value={ps.id}>{ps.name.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              )}

               {initialData?.id && (
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
               )}
            </div>

            <div className="pt-4 flex gap-4">
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
                className={`flex-1 py-4 px-6 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl cursor-pointer ${type === 'pay_schedule' ? 'bg-blue-500 text-white shadow-blue-500/20 hover:scale-[1.02]' : type === 'charge' ? 'bg-emerald-500 text-black shadow-emerald-500/20 hover:scale-[1.02]' : 'bg-amber-500 text-black shadow-amber-500/20 hover:scale-[1.02]'}`}
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
