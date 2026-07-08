import React, { useState } from 'react';
import { InlineToast } from './ui/InlineToast';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getApiUrl } from '../utils/api';
import { Price } from './Price';
import { Wallet, Plus, Edit3, Trash2, Calendar, User, TrendingUp, ChevronDown } from 'lucide-react';
import { PayScheduleModal } from './PayScheduleModal';

export const PaySchedulesList: React.FC = () => {
    const { token } = useAuth();
    const { showToast } = useToast();
    const { data: schedules = [], mutate: mutateSchedules } = (useApi('/api/planning/pay-schedules') as any);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<any>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const handleDelete = async (id: string) => {
        if (!token) return;
        
        const apiUrl = getApiUrl().replace(/\/$/, '');
        const res = (await fetch(`${apiUrl}/api/planning/pay-schedules/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                }) as any);

        if (res.ok) {
            showToast('Income source removed');
            mutateSchedules();
            setConfirmDeleteId(null);
        }
    };

    // Calculate Projected Monthly Income (Rough estimate based on frequency)
    const projectedMonthlyCents = schedules?.reduce((acc: number, s: any) => {
        const amount = s.estimatedAmountCents || 0;
        switch (s.frequency) {
            case 'weekly': return acc + (amount * 4.33);
            case 'biweekly': return acc + (amount * 2.16);
            case 'semi-monthly': return acc + (amount * 2);
            case 'monthly': return acc + amount;
            case 'quarterly': return acc + (amount / 3);
            case 'biannual': return acc + (amount / 6);
            case 'annually': return acc + (amount / 12);
            case 'biennial': return acc + (amount / 24);
            default: return acc;
        }
    }, 0) || 0;

    return (
        <>
          <section className="card space-y-6">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Wallet size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold uppercase tracking-tight italic">Income Pipeline</h3>
                        <p className="text-[10px] text-white/30 font-black uppercase tracking-widest">Active Pay Schedules</p>
                        <p className="text-xs text-secondary font-medium mt-1 pr-6">Set up your recurring paychecks here (e.g., weekly or bi-weekly). This helps the system forecast your cash flow and calculate your budget intervals.</p>
                    </div>
                </div>
                <button 
                    onClick={() => { setEditingSchedule(null); setIsModalOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                >
                    <Plus size={14} /> Add Source
                </button>
            </div>

            {/* Income Summary Card */}
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-center gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
                        <TrendingUp size={14} /> Projected Monthly Total
                    </div>
                    <div className="text-4xl font-black tracking-tighter text-white">
                        <Price amountCents={Math.round(projectedMonthlyCents)} />
                    </div>
                    <p className="text-[10px] text-white/30 italic">Estimated net inflow across all active schedules</p>
                </div>
                <div className="h-20 w-px bg-white/5 hidden sm:block" />
                <div className="text-right">
                    <div className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Active Sources</div>
                    <div className="text-2xl font-black text-white">{schedules?.length || 0}</div>
                </div>
            </div>

            <div className="space-y-3">
                {schedules?.map((s: any) => (
                    <div key={s.id} className="group relative flex flex-col p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.05] hover:border-white/10 transition-all">
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-4">
                                <div className="w-2 h-8 rounded-full bg-blue-500/20 group-hover:bg-blue-500 transition-all" />
                                <div>
                                    <h4 className="font-bold text-white group-hover:text-primary transition-colors">{s.name}</h4>
                                    <div className="flex flex-wrap items-center gap-3 mt-1">
                                        <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-white/30">
                                            <Calendar size={10} /> {s.frequency}
                                        </div>
                                        {s.userId && (
                                            <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-primary/60">
                                                <User size={10} /> Assigned
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                {(s.upcomingEffectiveDate || s.upcomingAmountCents) && (
                                    <div className="hidden lg:flex flex-col items-end px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg animate-in fade-in slide-in-from-right-2">
                                        <div className="text-[8px] font-black uppercase tracking-widest text-emerald-500/60">Planned Adjustment</div>
                                        <div className="flex items-center gap-1.5">
                                            <Price amountCents={s.upcomingAmountCents} className="text-[10px] font-black text-emerald-500" />
                                            <span className="text-[8px] text-emerald-500/40 font-bold">@ {s.upcomingEffectiveDate}</span>
                                        </div>
                                    </div>
                                )}
                                <div className="text-right">
                                    <Price amountCents={s.estimatedAmountCents} className="text-lg font-black tracking-tighter" />
                                    <div className="text-[9px] font-black uppercase tracking-widest text-white/20">Next: {s.nextPayDate || 'N/A'}</div>
                                </div>
                                
                                <div className="flex items-center">
                                    <button 
                                        onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                                        className="p-2 hover:bg-white/10 rounded-xl transition-all text-secondary hover:text-white"
                                        aria-label={expandedId === s.id ? `Collapse ${s.name}` : `Expand ${s.name}`}
                                    >
                                        <ChevronDown size={18} className={`transition-transform duration-200 ${expandedId === s.id ? 'rotate-180' : ''}`} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {expandedId === s.id && (
                            <div className="mt-3 pt-3 border-t border-white/5 flex justify-between items-center w-full animate-in fade-in slide-in-from-top-1">
                                <div>
                                    {confirmDeleteId === s.id ? (
                                        <InlineToast 
                                            message="Remove schedule?" 
                                            type="confirm" 
                                            onConfirm={() => handleDelete(s.id)} 
                                            onCancel={() => setConfirmDeleteId(null)} 
                                        />
                                    ) : (
                                        <button 
                                            onClick={() => setConfirmDeleteId(s.id)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg text-xs transition-colors"
                                        >
                                            <Trash2 size={14} /> Delete
                                        </button>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => { setEditingSchedule(s); setIsModalOpen(true); }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 text-white rounded-lg text-xs hover:bg-white/10 transition-colors"
                                    >
                                        <Edit3 size={14} /> Edit details
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {(!schedules || schedules.length === 0) && (
                    <div className="py-12 text-center border border-dashed border-white/5 rounded-3xl">
                        <p className="text-sm text-white/20 italic">No income sources configured yet.</p>
                    </div>
                )}
            </div>

        </section>
        <PayScheduleModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            onUpdate={() => mutateSchedules()}
            schedule={editingSchedule}
        />
        </>
    );
};
