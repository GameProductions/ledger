import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { Trash2, AlertCircle, Share2, ShieldCheck, Layers, CreditCard } from 'lucide-react';
import { LiabilitySplitter } from './LiabilitySplitter';
import { Price } from './Price';

export const InstallmentsList: React.FC = () => {
    const { token, householdId } = useAuth();
    const { data: installments = [], loading, mutate } = useApi('/api/planning/installment-plans');
    const { showToast } = useToast();
    
    // UI State for Modals
    const [openSplitterId, setOpenSplitterId] = React.useState<string | null>(null);
    const [openTrackerId, setOpenTrackerId] = React.useState<string | null>(null);

    const handleDelete = async (id: string) => {
        if (!token) return;
        const apiUrl = import.meta.env.VITE_API_URL.replace(/\/$/, '');

        const res = await fetch(`${apiUrl}/api/planning/installment-plans/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-household-id': householdId || ''
            }
        });

        if (res.ok) {
            showToast('Installment plan removed from ledger');
            mutate();
        }
    };

    const handleTogglePublic = async (targetId: string, isPublic: boolean) => {
        if (!token) return;
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/planning/splits/installment/${targetId}/public`, {
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

    if (loading) return <div className="text-center py-8 text-xs font-black uppercase tracking-[0.2em] text-white/30">Calculating Installment Amortization...</div>;

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white/40 flex items-center gap-2">
                    <Layers size={14} className="text-indigo-500" /> Installment Plans
                </h3>
            </div>

            <div className="grid grid-cols-1 gap-3">
                {installments?.length > 0 ? installments.map((inst: any) => {
                    const totalPayments = inst.total_installments;
                    const remainingPayments = inst.remaining_installments;
                    const paidPayments = totalPayments - remainingPayments;
                    const progressPercent = (paidPayments / totalPayments) * 100;
                    const paidAmountCents = paidPayments * inst.installment_amountCents;

                    return (
                        <div key={inst.id} className="group relative bg-white/[0.03] border border-white/5 rounded-[1.5rem] p-5 hover:bg-white/[0.05] transition-all hover:border-indigo-500/30 overflow-hidden">
                            {inst.upcoming_effective_date && (
                                <div className="absolute top-0 right-0 bg-indigo-500/10 border-b border-l border-indigo-500/20 px-3 py-1 rounded-bl-xl">
                                    <div className="text-[9px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                                        Rate Change: <Price amountCents={inst.upcoming_amountCents} /> on {inst.upcoming_effective_date}
                                    </div>
                                </div>
                            )}
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="font-black text-lg tracking-tighter uppercase italic">{inst.name}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400`}>
                                            {paidPayments} OF {totalPayments} PAID
                                        </span>
                                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                                            Next: {inst.next_payment_date}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <Price amountCents={inst.installment_amountCents} className="text-xl font-black tracking-tighter" />
                                    <div className="text-[9px] font-black uppercase tracking-widest text-white/30 mt-0.5">Per {inst.frequency}</div>
                                </div>
                            </div>

                            {/* Progress Section */}
                            <div className="space-y-2 mb-4">
                                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                                    <span className="text-white/40">Total Progress</span>
                                    <div className="flex gap-2">
                                        <span className="text-white/40 italic">Paid <Price amountCents={paidAmountCents} /></span>
                                        <span className="text-white">Of <Price amountCents={inst.total_amountCents} /></span>
                                    </div>
                                </div>
                                <div className="h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                                    <div 
                                        className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-1000"
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                            </div>

                            {inst.is_split_portion && (
                                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 mb-4">
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-400">
                                        <Share2 size={12} /> Assigned Split Portion
                                    </div>
                                </div>
                            )}

                            {/* Premium Internal Tracking for Originators */}
                            {inst.is_split_originator && inst.splits && (
                                <div className="mb-4">
                                    <button 
                                        onClick={() => setOpenTrackerId(openTrackerId === inst.id ? null : inst.id)}
                                        className="w-full bg-primary/10 border border-primary/20 rounded-xl p-3 flex flex-col hover:bg-primary/20 transition-all text-left group/tracker shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
                                    >
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center gap-2">
                                                <ShieldCheck size={14} className="text-primary group-hover/tracker:scale-110 transition-transform" />
                                                <span className="text-[10px] uppercase font-black tracking-widest text-primary">Master Split Ledger</span>
                                            </div>
                                            <span className="text-[10px] uppercase font-black text-white/40">{openTrackerId === inst.id ? 'Close' : 'View Stats'}</span>
                                        </div>
                                        {openTrackerId === inst.id && (
                                            <div className="mt-3 pt-3 border-t border-primary/20 space-y-3 cursor-default" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center justify-between px-2 py-1 bg-white/5 rounded-lg border border-white/5 mb-2">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Broadcasting Status</span>
                                                    <label className="relative inline-flex items-center cursor-pointer scale-75 origin-right">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={inst.splits?.[0]?.is_master_ledger_public || false} 
                                                            onChange={(e) => handleTogglePublic(inst.id, e.target.checked)}
                                                            className="sr-only peer" 
                                                        />
                                                        <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white/40 after:border-white/10 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                                                    </label>
                                                </div>
                                                {inst.splits.map((split: any) => (
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
                                    <button 
                                        className="text-[10px] font-black uppercase tracking-widest bg-white/5 text-white/40 px-4 py-2 rounded-xl cursor-not-allowed border border-white/5"
                                        disabled
                                    >
                                        Payment Logic Pending
                                    </button>
                                    {!inst.is_split_originator && !inst.is_split_portion && (
                                        <button 
                                            onClick={() => setOpenSplitterId(openSplitterId === inst.id ? null : inst.id)}
                                            className="text-[10px] font-black uppercase tracking-widest bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-2 rounded-xl hover:bg-indigo-500/20 transition-all flex items-center gap-2"
                                        >
                                            <Share2 size={14} /> Split Bill
                                        </button>
                                    )}
                                </div>
                                <button 
                                    onClick={() => handleDelete(inst.id)}
                                    className="w-10 h-10 flex items-center justify-center bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            {openSplitterId === inst.id && (
                                <div className="mt-4 pt-4 border-t border-white/10 animate-in fade-in slide-in-from-top-2">
                                    <LiabilitySplitter 
                                        targetId={inst.id} 
                                        targetType="installment" 
                                        totalAmountCents={inst.installment_amountCents} 
                                        onComplete={() => {
                                            setOpenSplitterId(null);
                                            mutate();
                                        }} 
                                    />
                                </div>
                            )}
                        </div>
                    );
                }) : (
                    <div className="py-12 text-center border border-dashed border-white/10 rounded-[2rem]">
                        <AlertCircle size={24} className="mx-auto text-white/20 mb-3" />
                        <p className="text-xs font-black uppercase tracking-widest text-white/20">No active installment plans found</p>
                    </div>
                )}
            </div>
        </section>
    );
};
