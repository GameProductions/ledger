import React, { useState, useEffect } from 'react';
import { Clock, MessageSquare, Hash, Activity, Send } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useToast } from '../context/ToastContext';

interface TimelineEntry {
  id: string;
  transaction_id: string;
  type: 'note' | 'confirmation' | 'status_change';
  content: string;
  created_at: string;
}

interface TransactionTimelineProps {
  transactionId: string;
  onActivity?: () => void;
}

export const TransactionTimeline: React.FC<TransactionTimelineProps> = ({ transactionId, onActivity }) => {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const fetchTimeline = async () => {
    try {
      const res = await fetch(`/api/financials/transactions/${transactionId}/timeline`);
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Timeline fetch failed', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline();
  }, [transactionId]);

  const handleAddNote = async (type: 'note' | 'confirmation' = 'note') => {
    if (!newNote.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/financials/transactions/${transactionId}/timeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, content: newNote.trim() })
      });
      if (res.ok) {
        showToast(`Stored ${type} successfully`, 'success');
        setNewNote('');
        fetchTimeline();
        if (onActivity) onActivity();
      }
    } catch (e) {
      showToast('Action failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="animate-pulse space-y-4">
      {[1, 2, 3].map(i => <div key={i} className="h-12 bg-white/5 rounded-xl w-full" />)}
    </div>
  );

  return (
    <div className="flex flex-col gap-8">
      {/* Quick Entry */}
      <div className="relative group">
        <input 
          type="text"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a persistent note or confirmation #..."
          onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
          className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-24 py-4 text-sm text-white placeholder:text-slate-600 focus:border-amber-500/30 transition-all font-medium"
        />
        <MessageSquare size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-amber-500/50 transition-colors" />
        
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
           <button 
             onClick={() => handleAddNote('confirmation')}
             disabled={isSubmitting || !newNote.trim()}
             className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all disabled:opacity-50"
           >
             + Confirmation
           </button>
           <button 
             onClick={() => handleAddNote('note')}
             disabled={isSubmitting || !newNote.trim()}
             className="w-8 h-8 flex items-center justify-center bg-amber-500 text-black rounded-lg hover:scale-105 transition-transform disabled:opacity-50"
           >
             <Send size={14} />
           </button>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="py-12 text-center bg-white/[0.02] border border-dashed border-white/5 rounded-[2rem]">
          <Activity size={32} className="mx-auto text-slate-700 mb-4 opacity-50" />
          <p className="text-sm text-slate-500 font-black uppercase tracking-[0.2em] italic">No Sovereignty Logs</p>
        </div>
      ) : (
        <div className="relative space-y-8 before:absolute before:left-[17px] before:top-4 before:bottom-4 before:w-[2px] before:bg-white/5">
          {entries?.map((entry) => (
            <div key={entry.id} className="relative pl-12 group animate-in fade-in slide-in-from-left-4 duration-500">
              {/* Connector icon */}
              <div className={`absolute left-0 top-0 w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-500 ${
                entry.type === 'note' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 group-hover:bg-amber-500/20' :
                entry.type === 'confirmation' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 group-hover:bg-emerald-500/20' :
                'bg-blue-500/10 border-blue-500/20 text-blue-500 group-hover:bg-blue-500/20'
              }`}>
                {entry.type === 'note' ? <MessageSquare size={16} /> :
                 entry.type === 'confirmation' ? <Hash size={16} /> :
                 <Clock size={16} />}
              </div>

              <div className="flex flex-col gap-1.5">
                 <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-black uppercase tracking-[0.1em] italic ${
                      entry.type === 'note' ? 'text-amber-500/70' :
                      entry.type === 'confirmation' ? 'text-emerald-500/70' :
                      'text-blue-500/70'
                    }`}>
                      {entry.type.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] font-bold text-slate-600 tabular-nums">
                      {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                    </span>
                 </div>
                 <div className="bg-white/2 rounded-2xl p-4 border border-white/5 group-hover:border-white/10 transition-colors">
                    <p className="text-sm text-white font-medium leading-relaxed tracking-tight">
                      {entry.content}
                    </p>
                 </div>
                 <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest pl-1">
                   {format(new Date(entry.created_at), 'MMMM d, yyyy • h:mm a')}
                 </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
