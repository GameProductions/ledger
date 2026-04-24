import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { Users, Percent, DollarSign, CheckCircle2 } from 'lucide-react';
import { Price } from './Price';
import { getApiUrl } from '../utils/api';

interface LiabilitySplitterProps {
    targetId: string;
    targetType: 'bill' | 'subscription' | 'installment';
    totalAmountCents: number;
    onComplete?: () => void;
}

export const LiabilitySplitter: React.FC<LiabilitySplitterProps> = ({ targetId, targetType, totalAmountCents, onComplete }) => {
    const { token, user } = useAuth();
    const { showToast } = useToast();
    const { data: household } = useApi('/api/user/households/current');
    
    const [splitMode, setSplitMode] = useState<'percentage' | 'fixed'>('percentage');
    const [assignments, setAssignments] = useState<Record<string, number>>({});
    const [isMasterPublic, setIsMasterPublic] = useState(false);
    
    // Auto-calculate for percentage mode
    const totalAssignedValue = Object.values(assignments).reduce((a, b) => a + (b || 0), 0);
    
    const calculatedCents = (userId: string) => {
        const val = assignments[userId] || 0;
        if (splitMode === 'fixed') return Math.round(val * 100);
        return Math.round((val / 100) * totalAmountCents);
    };

    const totalCalculatedCents = Object.keys(assignments).reduce((acc, uid) => acc + calculatedCents(uid), 0);
    const unassignedCents = Math.max(0, totalAmountCents - totalCalculatedCents);
    const isValid = splitMode === 'percentage' ? totalAssignedValue === 100 : totalCalculatedCents === totalAmountCents;

    const handleSave = async () => {
        if (!isValid) return;

        const splits = Object.keys(assignments).map(uid => ({
            target_id: targetId,
            target_type: targetType,
            assigned_user_id: uid,
            split_type: splitMode,
            split_value: assignments[uid],
            calculated_amount_cents: calculatedCents(uid),
            status: 'pending',
            is_master_ledger_public: isMasterPublic
        }));

        try {
            const res = await fetch(`${getApiUrl()}/api/planning/splits`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ splits })
            });

            if (res.ok) {
                showToast('Liability delegated securely.');
                if (onComplete) onComplete();
            }
        } catch (e) {
            console.error(e);
            showToast('Failed to delegate liability, check connection.');
        }
    };

    return (
        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-5">
            <div className="flex items-center gap-3">
                <Users size={18} className="text-secondary" />
                <h3 className="font-bold uppercase tracking-widest text-xs">Delegate Liability</h3>
            </div>

            <div className="flex bg-black/40 rounded-xl p-1 w-full max-w-xs">
                <button 
                    onClick={() => { setSplitMode('percentage'); setAssignments({}); }}
                    className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 ${splitMode === 'percentage' ? 'bg-primary text-black' : 'text-white/40'}`}
                >
                    <Percent size={12} /> Percentage
                </button>
                <button 
                    onClick={() => { setSplitMode('fixed'); setAssignments({}); }}
                    className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 ${splitMode === 'fixed' ? 'bg-primary text-black' : 'text-white/40'}`}
                >
                    <DollarSign size={12} /> Fixed Amount
                </button>
            </div>

            <div className="space-y-3">
                {household?.members && household.members.length > 0 ? household.members.map((member: any) => (
                    <div key={member.id} className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 text-sm font-bold">
                            <span className="w-8 h-8 rounded-full bg-white/10 flex flex-col items-center justify-center uppercase text-xs text-primary/60">
                                {member.user?.name?.charAt(0) || '?'}
                            </span>
                            {member.user?.name} {member.user?.id === user?.id && <span className="text-[9px] text-white/30 uppercase tracking-widest ml-1">(You)</span>}
                        </div>
                        <div className="flex items-center gap-2">
                            <input 
                                type="number"
                                min="0"
                                max={splitMode === 'percentage' ? 100 : undefined}
                                value={assignments[member.user?.id] || ''}
                                onChange={(e) => setAssignments({ ...assignments, [member.user?.id]: Number(e.target.value) })}
                                className="w-20 bg-white/10 border border-white/5 rounded-lg px-3 py-1.5 text-right font-bold focus:border-primary outline-none transition-colors"
                            />
                            <span className="text-xs text-white/40 font-black tracking-widest min-w-[20px]">
                                {splitMode === 'percentage' ? '%' : '$'}
                            </span>
                        </div>
                    </div>
                )) : (
                    <div className="text-[10px] uppercase tracking-widest text-white/30 p-4 border border-dashed border-white/10 rounded-xl text-center">
                        Add members to your household via Identity settings to use delegation.
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between p-3 bg-black/30 rounded-xl border border-white/5">
                <span className="text-[10px] uppercase tracking-widest font-black text-white/40">Unassigned Balance</span>
                <Price amountCents={unassignedCents} className={`font-black tracking-tighter ${unassignedCents === 0 ? 'text-primary' : 'text-red-500'}`} />
            </div>

            <label className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-xl cursor-pointer hover:bg-primary/10 transition-colors">
                <div>
                   <div className="text-[10px] uppercase font-black tracking-widest text-primary">Public Master Ledger</div>
                   <div className="text-[9px] font-medium text-white/50 w-4/5 leading-tight mt-1">Allow assignees to view the master tracker showing everyone's progress.</div>
                </div>
                <input type="checkbox" checked={isMasterPublic} onChange={(e) => setIsMasterPublic(e.target.checked)} className="w-4 h-4 rounded appearance-none border border-primary/40 bg-black/50 checked:bg-primary checked:border-primary transition-colors cursor-pointer relative after:content-[''] after:absolute after:hidden checked:after:block after:left-[4.5px] after:top-[2px] after:w-[5px] after:h-[9px] after:border-solid after:border-black after:border-r-2 after:border-b-2 after:rotate-45" />
            </label>

            <button 
                onClick={handleSave}
                disabled={!isValid || household?.members?.length === 0}
                className="w-full flex justify-center items-center gap-2 py-3 bg-primary text-black font-black uppercase tracking-widest rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-primary/10 hover:bg-white hover:shadow-2xl"
            >
                <CheckCircle2 size={16} /> Confirm Delegation
            </button>
        </div>
    );
};
