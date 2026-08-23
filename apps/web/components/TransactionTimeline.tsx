import React, { useState, useEffect } from 'react';
import { Clock, MessageSquare, Hash, Activity, Send, Edit2, Trash2, Check, X, Sparkles, Users, SplitSquareVertical, ArrowRight } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { Price } from './Price';

interface TimelineEntry {
  id: string;
  transactionId?: string;
  transaction_id?: string;
  type: 'note' | 'confirmation' | 'status_change' | 'creation' | 'edit' | 'split' | 'share';
  content: string;
  createdAt: string;
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
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { token, householdId } = useAuth();
  const { showToast } = useToast();
  const { data: accounts = [] } = (useApi('/api/financials/accounts') as any);
  const { data: categories = [] } = (useApi('/api/financials/categories') as any);
  const { data: household } = (useApi('/api/user/households/current') as any);

  const fetchTimeline = async () => {
    if (!token || !transactionId) return;
    try {
      const res = await fetch(`/api/financials/transactions/${transactionId}/timeline`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-household-id': householdId || ''
        }
      });
      const data = await res.json() as any;
      setEntries(data?.success && Array.isArray(data.data) ? data.data : []);
    } catch (e: any) {
      console.error('Timeline fetch failed', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline();
  }, [transactionId, token, householdId]);

  const handleAddNote = async (type: 'note' | 'confirmation' = 'note') => {
    if (!newNote.trim() || !token) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/financials/transactions/${transactionId}/timeline`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-household-id': householdId || ''
        },
        body: JSON.stringify({ type, content: newNote.trim() })
      });
      if (res.ok) {
        showToast(`Stored ${type} successfully`, 'success');
        setNewNote('');
        fetchTimeline();
        if (onActivity) onActivity();
      }
    } catch (e: any) {
      showToast('Action failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async (entryId: string) => {
    if (!editContent.trim() || !token) return;
    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/financials/transactions/${transactionId}/timeline/${entryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-household-id': householdId || ''
        },
        body: JSON.stringify({ content: editContent.trim() })
      });
      if (res.ok) {
        showToast('Timeline entry updated', 'success');
        setEditingEntryId(null);
        fetchTimeline();
        if (onActivity) onActivity();
      }
    } catch (e: any) {
      showToast('Failed to update entry', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/financials/transactions/${transactionId}/timeline/${entryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-household-id': householdId || ''
        }
      });
      if (res.ok) {
        showToast('Timeline entry deleted', 'success');
        setConfirmDeleteId(null);
        fetchTimeline();
        if (onActivity) onActivity();
      }
    } catch (e: any) {
      showToast('Failed to delete entry', 'error');
    }
  };

  const resolveAccountName = (accId?: string | null) => {
    if (!accId) return 'Default Account';
    const acc = (accounts || []).find((a: any) => a.id === accId);
    return acc ? acc.name : accId;
  };

  const resolveCategoryName = (catId?: string | null) => {
    if (!catId) return 'Uncategorized';
    const cat = (categories || []).find((c: any) => c.id === catId);
    return cat ? cat.name : catId;
  };

  const resolveUserName = (userId?: string | null) => {
    if (!userId) return 'Member';
    const member = (household?.members || []).find((m: any) => m.user?.id === userId || m.userId === userId);
    return member?.user?.displayName || member?.user?.username || 'Household Member';
  };

  const renderParsedContent = (entry: TimelineEntry) => {
    let parsed: any = null;
    try {
      parsed = JSON.parse(entry.content);
    } catch {
      parsed = null;
    }

    if (entry.type === 'creation') {
      if (parsed) {
        return (
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-white text-sm">{parsed.description || 'Initial Transaction'}</span>
              {parsed.amountCents !== undefined && (
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-md font-black">
                  <Price amountCents={parsed.amountCents} />
                </span>
              )}
              {parsed.status && (
                <span className="px-2 py-0.5 bg-white/10 text-white/80 rounded-md capitalize font-semibold">
                  {parsed.status}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-white/70">
              {parsed.transactionDate && (
                <div>📅 Date: <span className="text-white font-medium">{parsed.transactionDate}</span></div>
              )}
              {parsed.accountId && (
                <div>💳 Account: <span className="text-white font-medium">{resolveAccountName(parsed.accountId)}</span></div>
              )}
              {parsed.categoryId && (
                <div>🏷️ Category: <span className="text-white font-medium">{resolveCategoryName(parsed.categoryId)}</span></div>
              )}
              {parsed.source && (
                <div>⚡ Source: <span className="text-white font-medium capitalize">{parsed.source.replace('_', ' ')}</span></div>
              )}
            </div>
            {parsed.notes && (
              <div className="p-2 bg-white/5 rounded-lg text-white/80 italic border border-white/5">
                "{parsed.notes}"
              </div>
            )}
          </div>
        );
      }
      return <p className="text-sm text-white font-medium">{entry.content}</p>;
    }

    if (entry.type === 'edit') {
      if (parsed && parsed.changes) {
        return (
          <div className="space-y-2 text-xs">
            <span className="font-bold text-amber-400 tracking-wider text-[11px] uppercase block">Changes Recorded:</span>
            <div className="space-y-1.5">
              {Object.entries(parsed.changes).map(([field, change]: [string, any]) => {
                let fromDisplay = change.from ?? 'None';
                let toDisplay = change.to ?? 'None';

                if (field === 'amountCents') {
                  fromDisplay = typeof change.from === 'number' ? `$${(change.from / 100).toFixed(2)}` : 'None';
                  toDisplay = typeof change.to === 'number' ? `$${(change.to / 100).toFixed(2)}` : 'None';
                } else if (field === 'accountId') {
                  fromDisplay = resolveAccountName(change.from);
                  toDisplay = resolveAccountName(change.to);
                } else if (field === 'categoryId') {
                  fromDisplay = resolveCategoryName(change.from);
                  toDisplay = resolveCategoryName(change.to);
                }

                const fieldLabel = field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

                return (
                  <div key={field} className="flex items-center gap-2 flex-wrap bg-white/5 p-1.5 rounded-lg border border-white/5">
                    <span className="font-bold text-white/90">{fieldLabel}:</span>
                    <span className="line-through text-red-400/80 bg-red-500/10 px-1.5 py-0.5 rounded">{String(fromDisplay)}</span>
                    <ArrowRight size={12} className="text-white/40" />
                    <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">{String(toDisplay)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }
      return <p className="text-sm text-white font-medium">{entry.content}</p>;
    }

    if (entry.type === 'split') {
      if (parsed) {
        return (
          <div className="space-y-1 text-xs">
            <span className="font-bold text-purple-400 flex items-center gap-1.5">
              <SplitSquareVertical size={13} />
              Divided into {parsed.splitCount || 2} child transactions
            </span>
            {parsed.totalAmountCents !== undefined && (
              <p className="text-white/70">
                Original sum: <span className="text-white font-bold"><Price amountCents={parsed.totalAmountCents} /></span>
              </p>
            )}
          </div>
        );
      }
      return <p className="text-sm text-white font-medium">{entry.content}</p>;
    }

    if (entry.type === 'share') {
      if (parsed) {
        return (
          <div className="space-y-1 text-xs">
            <span className="font-bold text-cyan-400 flex items-center gap-1.5">
              <Users size={13} />
              Shared with {resolveUserName(parsed.assignedUserId)}
            </span>
            <p className="text-white/70">
              Delegated liability portion: <span className="text-emerald-400 font-bold"><Price amountCents={parsed.amountCents} /></span>
            </p>
          </div>
        );
      }
      return <p className="text-sm text-white font-medium">{entry.content}</p>;
    }

    // Default note / confirmation / status_change
    return (
      <p className="text-sm text-white font-medium leading-relaxed tracking-tight">
        {entry.content}
      </p>
    );
  };

  if (loading) return (
    <div className="animate-pulse space-y-3">
      {[1, 2, 3].map(i => <div key={i} className="h-10 bg-white/5 rounded-xl w-full" />)}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Quick Entry */}
      <div className="relative group">
        <input 
          type="text"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a persistent note or confirmation #..."
          onKeyDown={(e) => e.key === 'Enter' && handleAddNote('note')}
          className="w-full bg-black/40 border border-white/10 rounded-2xl pl-10 pr-48 py-3 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:border-primary focus:outline-none transition-all font-medium"
        />
        <MessageSquare size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-primary transition-colors" />
        
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          <button 
            type="button"
            onClick={() => handleAddNote('confirmation')}
            disabled={isSubmitting || !newNote.trim()}
            className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[9px] font-black tracking-tight transition-all disabled:opacity-40 cursor-pointer"
          >
            + Ref #
          </button>
          <button 
            type="button"
            onClick={() => handleAddNote('note')}
            disabled={isSubmitting || !newNote.trim()}
            className="px-2.5 py-1 bg-primary text-black font-black hover:brightness-110 rounded-lg text-[9px] tracking-tight transition-all disabled:opacity-40 cursor-pointer"
          >
            + Note
          </button>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="py-8 text-center bg-white/[0.02] border border-dashed border-white/5 rounded-2xl">
          <Activity size={24} className="mx-auto text-slate-600 mb-2 opacity-50" />
          <p className="text-xs text-slate-400 font-bold tracking-wider">No audit history entries recorded yet</p>
        </div>
      ) : (
        <div className="relative space-y-6 before:absolute before:left-[17px] before:top-4 before:bottom-4 before:w-[2px] before:bg-white/10">
          {entries.map((entry) => (
            <div key={entry.id} className="relative pl-11 group animate-in fade-in slide-in-from-left-2 duration-300">
              {/* Connector icon */}
              <div className={`absolute left-0 top-0 w-8 h-8 rounded-xl flex items-center justify-center border transition-all duration-300 ${
                entry.type === 'creation' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]' :
                entry.type === 'edit' ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' :
                entry.type === 'split' ? 'bg-purple-500/15 border-purple-500/30 text-purple-400' :
                entry.type === 'share' ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400' :
                entry.type === 'note' ? 'bg-blue-500/15 border-blue-500/30 text-blue-400' :
                entry.type === 'confirmation' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' :
                'bg-slate-500/15 border-slate-500/30 text-slate-300'
              }`}>
                {entry.type === 'creation' ? <Sparkles size={14} /> :
                 entry.type === 'edit' ? <Edit2 size={14} /> :
                 entry.type === 'split' ? <SplitSquareVertical size={14} /> :
                 entry.type === 'share' ? <Users size={14} /> :
                 entry.type === 'note' ? <MessageSquare size={14} /> :
                 entry.type === 'confirmation' ? <Hash size={14} /> :
                 <Clock size={14} />}
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-black tracking-widest uppercase ${
                    entry.type === 'creation' ? 'text-emerald-400' :
                    entry.type === 'edit' ? 'text-amber-400' :
                    entry.type === 'split' ? 'text-purple-400' :
                    entry.type === 'share' ? 'text-cyan-400' :
                    entry.type === 'note' ? 'text-blue-400' :
                    entry.type === 'confirmation' ? 'text-emerald-400' :
                    'text-slate-400'
                  }`}>
                    {entry.type === 'creation' ? 'Initial Creation' : entry.type.replace('_', ' ')}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium text-slate-400 tabular-nums">
                      {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                    </span>
                    {(entry.type === 'note' || entry.type === 'confirmation') && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingEntryId(entry.id);
                            setEditContent(entry.content);
                          }}
                          className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/10 transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={11} />
                        </button>
                        {confirmDeleteId === entry.id ? (
                          <div className="flex items-center gap-1 bg-red-500/20 px-1 py-0.5 rounded border border-red-500/30 animate-in fade-in">
                            <button
                              type="button"
                              onClick={() => handleDeleteEntry(entry.id)}
                              className="text-[9px] font-bold text-red-400 hover:underline"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-slate-400 hover:text-white"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(entry.id)}
                            className="p-1 text-slate-400 hover:text-red-400 rounded hover:bg-red-500/10 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5 group-hover:border-white/10 transition-colors">
                  {editingEntryId === entry.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editContent}
                        onChange={e => setEditContent(e.target.value)}
                        className="w-full bg-black/50 border border-primary/40 rounded-lg p-2 text-xs text-white focus:outline-none h-16 resize-none"
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingEntryId(null)}
                          className="px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-white bg-white/5 rounded-md"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isSavingEdit || !editContent.trim()}
                          onClick={() => handleSaveEdit(entry.id)}
                          className="px-2.5 py-1 text-[10px] font-bold text-black bg-primary rounded-md hover:brightness-110 flex items-center gap-1"
                        >
                          <Check size={10} /> Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    renderParsedContent(entry)
                  )}
                </div>

                <span className="text-[9px] text-slate-500 font-medium pl-1">
                  {format(new Date(entry.createdAt), 'MMM d, yyyy • h:mm a')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
