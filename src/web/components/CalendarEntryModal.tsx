import React, { useState } from 'react';
import { X, Trash2, CheckCircle2, Hash, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TypeableSelect } from './ui/TypeableSelect';
import { TransactionTimeline } from './TransactionTimeline';

interface CalendarEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  onDelete?: (id: string, type: string) => void;
  initialData?: any;
  date?: Date;
}

export const CalendarEntryModal: React.FC<CalendarEntryModalProps> = ({ 
  isOpen, onClose, onSave, onDelete, initialData, date 
}) => {
  const [type, setType] = useState<'charge' | 'bill' | 'pay_schedule'>(initialData?.type === 'pay_schedule' ? 'pay_schedule' : initialData?.type === 'subscription' ? 'bill' : 'charge');
  const [description, setDescription] = useState(initialData?.description || initialData?.name || '');
  const [amount, setAmount] = useState(initialData?.amountCents ? (initialData.amountCents / 100).toString() : initialData?.estimated_amountCents ? (initialData.estimated_amountCents / 100).toString() : '');
  const [currentDate, setCurrentDate] = useState(initialData?.transactionDate || initialData?.next_billing_date || initialData?.nextPayDate || date?.toISOString().split('T')[0] || '');
  const [status, setStatus] = useState(initialData?.status || 'unpaid');
  const [confirmationNumber, setConfirmationNumber] = useState(initialData?.confirmationNumber || '');
  const [frequency, setFrequency] = useState(initialData?.frequency || 'biweekly');
  const [semiMonthlyDay1, setSemiMonthlyDay1] = useState(initialData?.semi_monthly_day_1 || 1);
  const [semiMonthlyDay2, setSemiMonthlyDay2] = useState(initialData?.semi_monthly_day_2 || 15);
  const [isRecurring, setIsRecurring] = useState(initialData?.isRecurring || false);
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [showTimeline, setShowTimeline] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (type === 'pay_schedule') {
      onSave({
        id: initialData?.id,
        type,
        name: description,
        estimated_amountCents: Math.round(parseFloat(amount) * 100),
        nextPayDate: currentDate,
        frequency,
        semi_monthly_day_1: frequency === 'semi-monthly' ? semiMonthlyDay1 : null,
        semi_monthly_day_2: frequency === 'semi-monthly' ? semiMonthlyDay2 : null,
        notes
      });
    } else if (type === 'bill') {
      onSave({
        id: initialData?.id,
        type: 'bill',
        name: description,
        amountCents: Math.round(parseFloat(amount) * 100),
        dueDate: currentDate,
        status: status,
        notes: notes,
        isRecurring: isRecurring,
        frequency: isRecurring ? 'monthly' : null
      });
    } else {
      onSave({
        id: initialData?.id,
        type: 'charge',
        description,
        amountCents: Math.round(parseFloat(amount) * 100),
        date: currentDate,
        status,
        confirmationNumber: confirmationNumber
      });
    }
  };

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl" onClick={onClose}>
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
                       <div className="relative">
                        <input 
                          type="number" step="0.01"
                          value={upcomingAmount}
                          onChange={(e) => setUpcomingAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full p-3 pl-8 bg-black/40 border border-white/5 rounded-xl text-white font-bold text-sm outline-none focus:border-white/20"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 font-bold text-xs">$</span>
                       </div>
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
                <div className="flex items-center gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                    <input 
                      type="checkbox" 
                      id="isRecurring"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      className="w-5 h-5 accent-amber-500"
                    />
                    <label htmlFor="isRecurring" className="text-xs font-black uppercase tracking-widest text-amber-500/80 cursor-pointer">
                        This is a recurring monthly bill
                    </label>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-secondary ml-1">Amount ($)</label>
                    <input 
                      required
                      type="number" 
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full p-4 bg-white/5 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all font-bold text-lg"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-secondary ml-1">Entry Date</label>
                    <input 
                      required
                      type="date" 
                      value={currentDate}
                      onChange={(e) => setCurrentDate(e.target.value)}
                      className="w-full p-4 bg-white/5 border border-glass-border rounded-xl text-white outline-none focus:border-primary transition-all font-bold text-lg appearance-none"
                    />
                 </div>
              </div>

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
               {initialData ? 'Commit Update' : 'Initialize Ledger'}
             </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
