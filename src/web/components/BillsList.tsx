import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { getApiUrl } from '../utils/api';
import { Trash2, AlertCircle, Calendar as CalendarIcon, ExternalLink, ShieldCheck, Share2 } from 'lucide-react';
import { LiabilitySplitter } from './LiabilitySplitter';
import { Price } from './Price';


export const BillsList: React.FC = () => {
    const { token, householdId, user } = useAuth();
    const { data: bills = [], loading, mutate } = useApi('/api/planning/bills');
    const { showToast } = useToast();
    
    // UI State for Modals
    const [openSplitterId, setOpenSplitterId] = React.useState<string | null>(null);
    const [openTrackerId, setOpenTrackerId] = React.useState<string | null>(null);

    const handleDelete = async (id: string) => {
        if (!token) return;
        const apiUrl = getApiUrl().replace(/\/$/, '');

        const res = await fetch(`${apiUrl}/api/planning/bills/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-household-id': householdId || ''
            }
        });

        if (res.ok) {
            showToast('Bill removed from ledger');
            mutate();
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        if (!token) return;
        const apiUrl = getApiUrl().replace(/\/$/, '');

        const res = await fetch(`${apiUrl}/api/planning/bills/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'x-household-id': householdId || ''
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (res.ok) {
            showToast(`Bill marked as ${newStatus}`);
            mutate();
        }
    };

    const handleTogglePublic = async (targetId: string, isPublic: boolean) => {
        if (!token) return;
        const res = await fetch(`${getApiUrl()}/api/planning/splits/bill/${targetId}/public`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ is_public: isPublic })
        });

        if (res.ok) {
            showToast(isPublic ? 'Master Ledger is now public' : 'Master Ledger is now private');
            mutate();
        }
    };

    if (loading) return <div className="text-center py-8 text-xs font-black uppercase tracking-[0.2em] text-white/30">Analyzing Ledger Liquidity...</div>;

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white/40 flex items-center gap-2">
                    <CalendarIcon size={14} className="text-amber-500" /> Active Bills
                </h3>
            </div>

            <div className="grid grid-cols-1 gap-3">
                {bills?.length > 0 ? bills.map((bill: any) => (
                    <div key={bill.id} className="group relative bg-white/[0.03] border border-white/5 rounded-[1.5rem] p-5 hover:bg-white/[0.05] transition-all hover:border-amber-500/30 overflow-hidden">
                        {bill.upcoming_effective_date && (
                            <div className="absolute top-0 right-0 bg-amber-500/10 border-b border-l border-amber-500/20 px-3 py-1 rounded-bl-xl">
                                <div className="text-[9px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                                    Planned Adjustment: <Price amountCents={bill.upcoming_amountCents} /> on {bill.upcoming_effective_date}
                                </div>
                            </div>
                        )}
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="font-black text-lg tracking-tighter uppercase italic">{bill.name}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                                        bill.status === 'paid' ? 'bg-emerald-500/20 text-emerald-500' :
                                        bill.status === 'pending' ? 'bg-amber-500/20 text-amber-500' :
                                        'bg-red-500/20 text-red-500'
                                    }`}>
                                        {bill.status}
                                    </span>
                                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                                        Due: {bill.dueDate}
                                    </span>
                                </div>
                            </div>
                            <div className="text-right">
                                <Price amountCents={bill.amountCents} className="text-xl font-black tracking-tighter" />
                                {bill.isRecurring && (
                                    <div className="text-[9px] font-black uppercase tracking-widest text-primary/60 mt-0.5">Recurring Monthly</div>
                                )}
                            </div>
                        </div>

                        {(bill.notes || bill.is_split_portion) && (
                            <div className="bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/10 to-transparent border border-white/10 rounded-xl p-3 mb-4 flex flex-col gap-2">
                                {bill.is_split_portion && (
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary/80">
                                        <Share2 size={12} /> Assigned Split Portion
                                    </div>
                                )}
                                {bill.notes && (
                                    <div className="text-[11px] font-medium text-white/60 italic leading-relaxed">
                                        {bill.notes}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Premium Internal Tracking for Originators */}
                        {bill.is_split_originator && bill.splits && (
                            <div className="mb-4">
                                <button 
                                    onClick={() => setOpenTrackerId(openTrackerId === bill.id ? null : bill.id)}
                                    className="w-full bg-primary/10 border border-primary/20 rounded-xl p-3 flex flex-col hover:bg-primary/20 transition-all text-left group/tracker shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
                                >
                                    <div className="flex items-center justify-between w-full">
                                        <div className="flex items-center gap-2">
                                            <ShieldCheck size={14} className="text-primary group-hover/tracker:scale-110 transition-transform" />
                                            <span className="text-[10px] uppercase font-black tracking-widest text-primary">Master Split Ledger</span>
                                        </div>
                                        <span className="text-[10px] uppercase font-black text-white/40">{openTrackerId === bill.id ? 'Close' : 'View Stats'}</span>
                                    </div>
                                    {openTrackerId === bill.id && (
                                        <div className="mt-3 pt-3 border-t border-primary/20 space-y-3 cursor-default" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center justify-between px-2 py-1 bg-white/5 rounded-lg border border-white/5 mb-2">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Broadcasting Status</span>
                                                <label className="relative inline-flex items-center cursor-pointer scale-75 origin-right">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={bill.splits?.[0]?.is_master_ledger_public || false} 
                                                        onChange={(e) => handleTogglePublic(bill.id, e.target.checked)}
                                                        className="sr-only peer" 
                                                    />
                                                    <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white/40 after:border-white/10 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                                                </label>
                                            </div>
                                            {bill.splits.map((split: any) => (
                                                <div key={split.id} className="flex items-center justify-between bg-black/40 p-2 rounded-lg border border-white/5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-5 h-5 rounded-full bg-white/10 text-[9px] flex items-center justify-center font-bold">{split.assigned_user_id.substring(0, 2)}</span>
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Portion</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                                                            split.status === 'paid' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'
                                                        }`}>
                                                            {split.status}
                                                        </span>
                                                        <Price amountCents={split.calculated_amountCents} className="text-[11px] font-black tracking-widest" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </button>
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-4 border-t border-white/5">
                            <div className="flex gap-2">
                                {bill.status !== 'paid' && (
                                    <>
                                        <button 
                                            onClick={() => handleStatusUpdate(bill.id, 'paid')}
                                            className="text-[10px] font-black uppercase tracking-widest bg-emerald-500 text-black px-4 py-2 rounded-xl hover:scale-105 transition-all shadow-lg shadow-emerald-500/20"
                                        >
                                            Mark Paid
                                        </button>
                                        {!bill.is_split_originator && !bill.is_split_portion && (
                                            <button 
                                                onClick={() => setOpenSplitterId(openSplitterId === bill.id ? null : bill.id)}
                                                className="text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-2 rounded-xl hover:bg-emerald-500/20 transition-all"
                                            >
                                                <Share2 size={14} />
                                            </button>
                                        )}
                                    </>
                                )}
                                {bill.status === 'paid' && (
                                    <button 
                                        onClick={() => handleStatusUpdate(bill.id, 'pending')}
                                        className="text-[10px] font-black uppercase tracking-widest border border-white/10 text-white/60 px-4 py-2 rounded-xl hover:bg-white/5 transition-all"
                                    >
                                        Revert to Pending
                                    </button>
                                )}
                            </div>
                            <button 
                                onClick={() => handleDelete(bill.id)}
                                className="w-10 h-10 flex items-center justify-center bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-all opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>

                        {openSplitterId === bill.id && (
                            <div className="mt-4 pt-4 border-t border-white/10 animate-in fade-in slide-in-from-top-2">
                                <LiabilitySplitter 
                                    targetId={bill.id} 
                                    targetType="bill" 
                                    totalAmountCents={bill.amountCents} 
                                    onComplete={() => {
                                        setOpenSplitterId(null);
                                        mutate();
                                    }} 
                                />
                            </div>
                        )}
                    </div>

                )) : (
                    <div className="py-12 text-center border border-dashed border-white/10 rounded-[2rem]">
                        <AlertCircle size={24} className="mx-auto text-white/20 mb-3" />
                        <p className="text-xs font-black uppercase tracking-widest text-white/20">No active bills in this lifecycle</p>
                    </div>
                )}
            </div>
        </section>
    );
};
