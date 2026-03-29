import React, { useState } from 'react';
import { X, Trash2, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

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
  const [type, setType] = useState<'charge' | 'bill'>(initialData?.type === 'subscription' ? 'bill' : 'charge');
  const [description, setDescription] = useState(initialData?.description || '');
  const [amount, setAmount] = useState(initialData?.amount_cents ? (initialData.amount_cents / 100).toString() : '');
  const [currentDate, setCurrentDate] = useState(initialData?.transaction_date || initialData?.next_billing_date || date?.toISOString().split('T')[0] || '');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: initialData?.id,
      type,
      description,
      amount_cents: Math.round(parseFloat(amount) * 100),
      date: currentDate
    });
  };

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="card w-full max-w-lg p-8 reveal space-y-8"
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
            onClick={() => setType('charge')}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${type === 'charge' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-white'}`}
          >
            Immediate Charge
          </button>
          <button 
            type="button"
            onClick={() => setType('bill')}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${type === 'bill' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-slate-500 hover:text-white'}`}
          >
            Future Bill
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
              className={`flex-1 py-4 px-6 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl ${type === 'charge' ? 'bg-primary text-black shadow-primary/20 hover:scale-[1.02]' : 'bg-amber-500 text-black shadow-amber-500/20 hover:scale-[1.02]'}`}
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
