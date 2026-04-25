import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Modal } from './ui/Modal';
import { getApiUrl } from '../utils/api';
import { Calendar, DollarSign, MessageSquare, Trash2, Shield, Info } from 'lucide-react';
import { Price } from './Price';

interface PaydayExceptionModalProps {
    payday: {
        id?: string;
        pay_schedule_id: string;
        date: string;
        original_date: string;
        name: string;
        amount_cents: number;
        notes?: string;
        is_override?: boolean;
    };
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

export const PaydayExceptionModal: React.FC<PaydayExceptionModalProps> = ({ payday, isOpen, onClose, onUpdate }) => {
    const { token } = useAuth();
    const { showToast } = useToast();
    const [loading, setLoading] = React.useState(false);

    // Form State
    const [note, setNote] = React.useState(payday.notes || '');
    const [overrideAmountCents, setOverrideAmountCents] = React.useState<number | null>(payday.is_override ? payday.amount_cents : null);
    const [overrideDate, setOverrideDate] = React.useState<string | null>(payday.is_override ? payday.date : null);

    React.useEffect(() => {
        setNote(payday.notes || '');
        setOverrideAmountCents(payday.is_override ? payday.amount_cents : null);
        setOverrideDate(payday.is_override ? payday.date : null);
    }, [payday]);

    const handleSave = async () => {
        if (!token) return;
        setLoading(true);

        const apiUrl = getApiUrl().replace(/\/$/, '');
        const res = await fetch(`${apiUrl}/api/planning/pay-exceptions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                pay_schedule_id: payday.pay_schedule_id,
                original_date: payday.original_date,
                override_date: overrideDate || null,
                override_amount_cents: overrideAmountCents || null,
                note: note || null
            })
        });

        if (res.ok) {
            showToast('Private payday exception saved');
            onUpdate();
            onClose();
        } else {
            showToast('Failed to save exception', 'error');
        }
        setLoading(false);
    };

    const handleDelete = async () => {
        if (!payday.id || !token) return;
        setLoading(true);

        const apiUrl = getApiUrl().replace(/\/$/, '');
        const res = await fetch(`${apiUrl}/api/planning/pay-exceptions/${payday.id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (res.ok) {
            showToast('Exception cleared - reverted to projected data');
            onUpdate();
            onClose();
        }
        setLoading(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Payday: ${payday.name}`}>
            <div className="space-y-6">
                {/* Privacy Badge */}
                <div className="flex items-center gap-2 px-3 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                    <Shield size={14} className="text-indigo-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Private Exception</span>
                    <span className="text-[10px] text-indigo-400/60 font-medium italic">— Only visible to you</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                        <div className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Projected Date</div>
                        <div className="text-sm font-bold text-white/80">{payday.original_date}</div>
                    </div>
                    <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                        <div className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Projected Amount</div>
                        <Price amount_cents={payday.amount_cents} className="text-sm font-bold" />
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Note Field */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                            <MessageSquare size={12} /> Personal Note
                        </label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm focus:border-indigo-500/50 outline-none transition-all min-h-[100px]"
                            placeholder="Add a bonus note, raise reminder, etc..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Amount Override */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                                <DollarSign size={12} /> Override Amount
                            </label>
                            <input
                                type="number"
                                value={overrideAmountCents ? overrideAmountCents / 100 : ''}
                                onChange={(e) => setOverrideAmountCents(e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm focus:border-indigo-500/50 outline-none transition-all"
                                placeholder="Optional"
                            />
                        </div>

                        {/* Date Override */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                                <Calendar size={12} /> Override Date
                            </label>
                            <input
                                type="date"
                                value={overrideDate || ''}
                                onChange={(e) => setOverrideDate(e.target.value || null)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm focus:border-indigo-500/50 outline-none transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Info Tip */}
                <div className="flex gap-3 p-3 bg-white/5 rounded-xl border border-dashed border-white/10">
                    <Info size={16} className="text-white/40 shrink-0" />
                    <p className="text-[10px] text-white/40 italic leading-relaxed">
                        Setting an exception will replace the projected payday data on your dashboard.
                        This will not affect other household members' views.
                    </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    {payday.id ? (
                        <button
                            onClick={handleDelete}
                            disabled={loading}
                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors"
                        >
                            <Trash2 size={14} /> Clear Exception
                        </button>
                    ) : <div />}
                    
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:bg-white/5 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="px-8 py-2 bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-indigo-500/20"
                        >
                            {loading ? 'Saving...' : 'Save Exception'}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
