import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useApi, globalMutate } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { getApiUrl } from '../utils/api';
import { Trash2, AlertCircle, Share2, Layers } from 'lucide-react';
import { LiabilitySplitter } from './LiabilitySplitter';
import { Price } from './Price';
import { UpcomingChangeBadge } from './shared/UpcomingChangeBadge';
import { MasterSplitLedger } from './shared/MasterSplitLedger';
import { LiabilityItemCard } from './shared/LiabilityItemCard';
import { EmptyPlaceholder } from './shared/EmptyPlaceholder';
import { ProviderLogo } from './shared/ProviderLogo';

export const InstallmentsList: React.FC = () => {
    const { token, householdId } = useAuth();
    const { data: installments = [], loading, mutate } = (useApi('/api/planning/installment-plans') as any);
    const { showToast } = useToast();
    
    const [openSplitterId, setOpenSplitterId] = React.useState<string | null>(null);
    const [openTrackerId, setOpenTrackerId] = React.useState<string | null>(null);

    const handleDelete = async (id: string) => {
        if (!token) return;
        const apiUrl = getApiUrl().replace(/\/$/, '');

        const res = (await fetch(`${apiUrl}/api/planning/installment-plans/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'x-household-id': householdId || ''
                    }
                }) as any);

        if (res.ok) {
            showToast('Installment plan removed from ledger');
            mutate();
            globalMutate();
        }
    };

    const handleTogglePublic = async (targetId: string, isPublic: boolean) => {
        if (!token) return;
        const res = (await fetch(`${getApiUrl()}/api/planning/splits/installment/${targetId}/public`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ isPublic: isPublic })
                }) as any);

        if (res.ok) {
            showToast(isPublic ? 'Master Ledger is now public' : 'Master Ledger is now private');
            mutate();
            globalMutate();
        }
    };

    if (loading) return <div className="text-center py-8 text-xs font-black tracking-[0.2em] text-white/30">Calculating Installment Amortization...</div>;

    return (
        <section className="space-y-4">
            <div>
                <h3 className="text-sm font-black tracking-[0.2em] text-white/40 flex items-center gap-2 mb-1">
                    <Layers size={14} className="text-indigo-500" /> Installment Plans
                </h3>
                <p className="text-xs text-secondary font-medium">Manage finite payment agreements (like financing a phone, a car loan, or furniture store installment plans).</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
                {installments?.length > 0 ? installments.map((inst: any) => {
                    const totalPayments = inst.totalInstallments;
                    const remainingPayments = inst.remainingInstallments;
                    const paidPayments = totalPayments - remainingPayments;
                    const progressPercent = (paidPayments / totalPayments) * 100;
                    const paidAmountCents = paidPayments * inst.installmentAmountCents;

                    return (
                        <LiabilityItemCard key={inst.id} color="violet">
                            <UpcomingChangeBadge
                                amountCents={inst.upcomingAmountCents}
                                effectiveDate={inst.upcomingEffectiveDate}
                                label="Rate Change"
                                color="violet"
                            />
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <ProviderLogo url={inst.iconUrl || inst.logoUrl} name={inst.name} size={32} />
                                    <div>
                                        <h4 className="font-black text-lg tracking-tighter italic">{inst.name}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded-md bg-violet-500/20 text-violet-400">
                                                {paidPayments} OF {totalPayments} PAID
                                            </span>
                                            <span className="text-[10px] font-bold text-white/30 tracking-widest">
                                                Next: {inst.nextPayDate}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <Price amountCents={inst.installmentAmountCents} className="text-xl font-black tracking-tighter" />
                                    <div className="text-[10px] font-bold tracking-widest text-white/30 mt-0.5">Per {inst.frequency}</div>
                                </div>
                            </div>

                            <div className="space-y-2 mb-4">
                                <div className="flex justify-between text-[10px] font-bold tracking-widest">
                                    <span className="text-white/40">Total Progress</span>
                                    <div className="flex gap-2">
                                        <span className="text-white/40 italic">Paid <Price amountCents={paidAmountCents} /></span>
                                        <span className="text-white">Of <Price amountCents={inst.totalAmountCents} /></span>
                                    </div>
                                </div>
                                <div className="h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                                    <div 
                                        className="h-full bg-violet-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-1000"
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                            </div>

                            {inst.isSplitPortion && (
                                <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3 mb-4">
                                    <div className="flex items-center gap-2 text-[10px] font-black tracking-widest text-violet-400">
                                        <Share2 size={12} /> Assigned Split Portion
                                    </div>
                                </div>
                            )}

                            {inst.isSplitOriginator && inst.splits && (
                                <div className="mb-4">
                                    <MasterSplitLedger
                                        splits={inst.splits}
                                        isMasterLedgerPublic={inst.splits?.[0]?.isMasterLedgerPublic || false}
                                        onTogglePublic={(isPublic) => handleTogglePublic(inst.id, isPublic)}
                                        open={openTrackerId === inst.id}
                                        onToggle={() => setOpenTrackerId(openTrackerId === inst.id ? null : inst.id)}
                                    />
                                </div>
                            )}

                            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                <div className="flex gap-2">
                                    <button 
                                        className="text-[10px] font-black tracking-widest bg-white/5 text-white/40 px-4 py-2 rounded-xl cursor-not-allowed border border-white/5"
                                        disabled
                                    >
                                        Payment Logic Pending
                                    </button>
                                    {!inst.isSplitOriginator && !inst.isSplitPortion && (
                                        <button 
                                            onClick={() => setOpenSplitterId(openSplitterId === inst.id ? null : inst.id)}
                                            className="flex items-center gap-1 text-[10px] font-black tracking-widest border border-violet-500/30 text-violet-400 px-3 py-2 rounded-xl hover:bg-violet-500/10 transition-all"
                                        >
                                            <Share2 size={14} /> Split
                                        </button>
                                    )}
                                </div>
                                <button 
                                    onClick={() => handleDelete(inst.id)}
                                    className="flex items-center gap-1 text-[10px] font-black tracking-widest border border-red-500/30 text-red-500 px-3 py-2 rounded-xl hover:bg-red-500/10 transition-all"
                                >
                                    <Trash2 size={14} /> Delete
                                </button>
                            </div>

                            {openSplitterId === inst.id && (
                                <div className="mt-4 pt-4 border-t border-white/10 animate-in fade-in slide-in-from-top-2">
                                    <LiabilitySplitter 
                                        targetId={inst.id} 
                                        targetType="installment" 
                                        totalAmountCents={inst.installmentAmountCents} 
                                        onComplete={() => {
                                            setOpenSplitterId(null);
                                            mutate();
                                            globalMutate();
                                        }} 
                                    />
                                </div>
                            )}
                        </LiabilityItemCard>
                    );
                }) : (
                    <EmptyPlaceholder icon={AlertCircle} message="No active installment plans found" />
                )}
            </div>
        </section>
    );
};
