import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useApi, globalMutate } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { getApiUrl } from '../utils/api';
import { Trash2, AlertCircle, Calendar as CalendarIcon, Share2, Globe } from 'lucide-react';
import { LiabilitySplitter } from './LiabilitySplitter';
import { ShareDialog } from './shared/ShareDialog';
import { Price } from './Price';
import { StatusBadge } from './shared/StatusBadge';
import { UpcomingChangeBadge } from './shared/UpcomingChangeBadge';
import { MasterSplitLedger } from './shared/MasterSplitLedger';
import { LiabilityItemCard } from './shared/LiabilityItemCard';
import { EmptyPlaceholder } from './shared/EmptyPlaceholder';
import { ProviderLogo } from './shared/ProviderLogo';


export const BillsList: React.FC = () => {
    const { token, householdId, user } = useAuth();
    const { data: bills = [], loading, mutate } = (useApi('/api/planning/bills') as any);
    const { showToast } = useToast();
    
    const [openSplitterId, setOpenSplitterId] = React.useState<string | null>(null);
    const [openTrackerId, setOpenTrackerId] = React.useState<string | null>(null);
    const [shareTarget, setShareTarget] = React.useState<{ id: string; name: string } | null>(null);

    const handleDelete = async (id: string) => {
        if (!token) return;
        const apiUrl = getApiUrl().replace(/\/$/, '');

        const res = (await fetch(`${apiUrl}/api/planning/bills/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'x-household-id': householdId || ''
                    }
                }) as any);

        if (res.ok) {
            showToast('Bill removed from ledger');
            mutate();
            globalMutate();
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        if (!token) return;
        const apiUrl = getApiUrl().replace(/\/$/, '');

        const res = (await fetch(`${apiUrl}/api/planning/bills/${id}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'x-household-id': householdId || ''
                    },
                    body: JSON.stringify({ status: newStatus })
                }) as any);

        if (res.ok) {
            showToast(`Bill marked as ${newStatus}`);
            mutate();
            globalMutate();
        }
    };

    const handleTogglePublic = async (targetId: string, isPublic: boolean) => {
        if (!token) return;
        const res = (await fetch(`${getApiUrl()}/api/planning/splits/bill/${targetId}/public`, {
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
        }
    };

    if (loading) return <div className="text-center py-8 text-xs font-black tracking-[0.2em] text-white/30">Analyzing Ledger Liquidity...</div>;

    return (
        <section className="space-y-4">
          {shareTarget && (
            <ShareDialog
              targetType="bill"
              targetId={shareTarget.id}
              targetName={shareTarget.name}
              onClose={() => setShareTarget(null)}
            />
          )}
            <div>
                <h3 className="text-sm font-black tracking-[0.2em] text-white/40 flex items-center gap-2 mb-1">
                    <CalendarIcon size={14} className="text-amber-500" /> Active Bills
                </h3>
                <p className="text-xs text-secondary font-medium">Keep track of your regular, non-subscription household bills (like electricity, rent, or water). You can view due dates, track payment status, split bills with other household members, and set planned adjustments.</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
                {bills?.length > 0 ? bills.map((bill: any) => (
                    <LiabilityItemCard key={bill.id} color="amber">
                        <UpcomingChangeBadge
                            amountCents={bill.upcomingAmountCents}
                            effectiveDate={bill.upcomingEffectiveDate}
                            label="Planned Adjustment"
                            color="amber"
                        />
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <ProviderLogo url={bill.iconUrl || bill.logoUrl} name={bill.name} size={32} />
                                <div>
                                    <h4 className="font-black text-lg tracking-tighter italic flex items-center gap-2">{bill.name}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <StatusBadge status={bill.status} />
                                        <span className="text-[10px] font-bold text-white/30 tracking-widest">
                                            Due: {bill.dueDate}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <Price amountCents={bill.amountCents} className="text-xl font-black tracking-tighter" />
                                {bill.isRecurring && (
                                    <div className="text-[9px] font-black tracking-widest text-primary/60 mt-0.5">Recurring Monthly</div>
                                )}
                            </div>
                        </div>

                        {(bill.notes || bill.isSplitPortion) && (
                            <div className="bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/10 to-transparent border border-white/10 rounded-xl p-3 mb-4 flex flex-col gap-2">
                                {bill.isSplitPortion && (
                                    <div className="flex items-center gap-2 text-[10px] font-black tracking-widest text-primary/80">
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

                        {bill.isSplitOriginator && bill.splits && (
                            <div className="mb-4">
                                <MasterSplitLedger
                                    splits={bill.splits}
                                    isMasterLedgerPublic={bill.splits?.[0]?.isMasterLedgerPublic || false}
                                    onTogglePublic={(isPublic) => handleTogglePublic(bill.id, isPublic)}
                                    open={openTrackerId === bill.id}
                                    onToggle={() => setOpenTrackerId(openTrackerId === bill.id ? null : bill.id)}
                                />
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-white/5">
                            <div className="flex flex-wrap items-center gap-2">
                                {bill.status !== 'paid' && (
                                    <>
                                        <button 
                                            onClick={() => handleStatusUpdate(bill.id, 'paid')}
                                            className="text-[10px] font-black tracking-widest bg-emerald-500 text-black px-4 py-2 rounded-xl hover:scale-105 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                                        >
                                            Mark Paid
                                        </button>
                                        {!bill.isSplitOriginator && !bill.isSplitPortion && (
                                            <button 
                                                onClick={() => setOpenSplitterId(openSplitterId === bill.id ? null : bill.id)}
                                                className="flex items-center gap-1 text-[10px] font-black tracking-widest border border-emerald-500/30 text-emerald-500 px-3 py-2 rounded-xl hover:bg-emerald-500/10 transition-all active:scale-95"
                                            >
                                                <Share2 size={14} /> Split
                                            </button>
                                        )}
                                    </>
                                )}
                                {bill.status === 'paid' && (
                                    <button 
                                        onClick={() => handleStatusUpdate(bill.id, 'pending')}
                                        className="text-[10px] font-black tracking-widest border border-white/10 text-white/60 px-4 py-2 rounded-xl hover:bg-white/5 transition-all active:scale-95"
                                    >
                                        Revert to Pending
                                    </button>
                                )}
                              <button
                                onClick={() => setShareTarget({ id: bill.id, name: bill.name })}
                                className="flex items-center gap-1 text-[10px] font-black tracking-widest border border-blue-500/30 text-blue-500 px-3 py-2 rounded-xl hover:bg-blue-500/10 transition-all active:scale-95"
                              >
                                <Globe size={14} /> Share
                              </button>
                              <button 
                                onClick={() => handleDelete(bill.id)}
                                className="flex items-center gap-1 text-[10px] font-black tracking-widest border border-red-500/30 text-red-500 px-3 py-2 rounded-xl hover:bg-red-500/10 transition-all active:scale-95"
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
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
                                        globalMutate();
                                    }} 
                                />
                            </div>
                        )}
                    </LiabilityItemCard>

                )) : (
                    <EmptyPlaceholder icon={AlertCircle} message="No active bills in this lifecycle" />
                )}
            </div>
        </section>
    );
};
