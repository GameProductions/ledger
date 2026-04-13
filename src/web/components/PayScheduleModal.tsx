import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Modal } from './ui/Modal';
import { Calendar, DollarSign, Wallet, Shield, Info, Tag, Users } from 'lucide-react';
import { useApi } from '../hooks/useApi';

interface PayScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
    schedule?: any; // For editing
}

export const PayScheduleModal: React.FC<PayScheduleModalProps> = ({ isOpen, onClose, onUpdate, schedule }) => {
    const { token, householdId } = useAuth();
    const { showToast } = useToast();
    const { data: household } = useApi('/api/households/current');
    const [loading, setLoading] = React.useState(false);

    // Form State
    const [name, setName] = React.useState(schedule?.name || '');
    const [amountCents, setAmountCents] = React.useState(schedule?.estimated_amountCents || 0);
    const [frequency, setFrequency] = React.useState(schedule?.frequency || 'biweekly');
    const [nextPayDate, setNextPayDate] = React.useState(schedule?.nextPayDate || new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = React.useState(schedule?.notes || '');
    const [d1, setD1] = React.useState(schedule?.semi_monthly_day_1 || 1);
    const [d2, setD2] = React.useState(schedule?.semi_monthly_day_2 || 15);
    const [userId, setUserId] = React.useState(schedule?.user_id || '');
    const [upcomingAmountCents, setUpcomingAmountCents] = React.useState(schedule?.upcoming_amountCents || 0);
    const [upcomingEffectiveDate, setUpcomingEffectiveDate] = React.useState(schedule?.upcoming_effective_date || '');

    React.useEffect(() => {
        if (schedule) {
            setName(schedule.name);
            setAmountCents(schedule.estimated_amountCents || 0);
            setFrequency(schedule.frequency);
            setNextPayDate(schedule.nextPayDate);
            setNotes(schedule.notes || '');
            setD1(schedule.semi_monthly_day_1 || 1);
            setD2(schedule.semi_monthly_day_2 || 15);
            setUserId(schedule.user_id || '');
            setUpcomingAmountCents(schedule.upcoming_amountCents || 0);
            setUpcomingEffectiveDate(schedule.upcoming_effective_date || '');
        }
    }, [schedule]);

    const handleSave = async () => {
        if (!token) return;
        setLoading(true);

        const payload = {
            name,
            frequency,
            estimated_amountCents: amountCents,
            nextPayDate: nextPayDate,
            notes,
            semi_monthly_day_1: frequency === 'semi-monthly' ? d1 : null,
            semi_monthly_day_2: frequency === 'semi-monthly' ? d2 : null,
            user_id: userId || null,
            upcoming_amountCents: upcomingAmountCents || null,
            upcoming_effective_date: upcomingEffectiveDate || null
        };

        const apiUrl = import.meta.env.VITE_API_URL.replace(/\/$/, '');
        const method = schedule ? 'PATCH' : 'POST';
        const url = schedule ? `${apiUrl}/api/planning/pay-schedules/${schedule.id}` : `${apiUrl}/api/planning/pay-schedules`;

        const res = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            showToast(schedule ? 'Income schedule updated' : 'New income source added');
            onUpdate();
            onClose();
        } else {
            showToast('Failed to save pay schedule', 'error');
        }
        setLoading(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={schedule ? 'Edit Income Source' : 'Add Income Source'}>
            <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Name */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                            <Tag size={12} /> Source Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-primary outline-none transition-all font-bold"
                            placeholder="e.g. Main Salary, Rental Income"
                        />
                    </div>

                    {/* Amount */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                            <DollarSign size={12} /> Expected Net Pay
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                value={amountCents ? amountCents / 100 : ''}
                                onChange={(e) => setAmountCents(e.target.value ? Math.round(parseFloat(e.target.value) * 100) : 0)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 pl-8 text-sm focus:border-primary outline-none transition-all font-bold"
                                placeholder="0.00"
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 font-bold">$</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Frequency */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                            <Wallet size={12} /> Pay Frequency
                        </label>
                        <select
                            value={frequency}
                            onChange={(e) => setFrequency(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-primary outline-none transition-all font-bold appearance-none cursor-pointer"
                        >
                            <option value="weekly">Weekly</option>
                            <option value="biweekly">Bi-Weekly</option>
                            <option value="semi-monthly">Semi-Monthly (e.g. 1st & 15th)</option>
                            <option value="monthly">Monthly</option>
                            <option value="quarterly">Quarterly</option>
                            <option value="annually">Annually</option>
                            <option value="manual">Manual / One-Off</option>
                        </select>
                    </div>

                    {/* Next Pay Date */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                            <Calendar size={12} /> {frequency === 'manual' ? 'Pay Day' : 'Next Pay Day'}
                        </label>
                        <input
                            type="date"
                            value={nextPayDate}
                            onChange={(e) => setNextPayDate(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-primary outline-none transition-all font-bold"
                        />
                    </div>
                </div>

                {/* Semi-Monthly Options */}
                {frequency === 'semi-monthly' && (
                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl animate-in slide-in-from-top-2 duration-300">
                        <div className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">Semi-Monthly Days</div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <span className="text-[9px] font-bold text-white/40 uppercase">First Day</span>
                                <input type="number" min="1" max="31" value={d1} onChange={(e) => setD1(parseInt(e.target.value))} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm outline-none focus:border-primary" />
                            </div>
                            <div className="space-y-1">
                                <span className="text-[9px] font-bold text-white/40 uppercase">Second Day</span>
                                <input type="number" min="1" max="31" value={d2} onChange={(e) => setD2(parseInt(e.target.value))} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm outline-none focus:border-primary" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Ownership */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                        <Users size={12} /> Income Earner
                    </label>
                    <select
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-primary outline-none transition-all font-bold appearance-none cursor-pointer"
                    >
                        <option value="">Household (Generic)</option>
                        {household?.members?.map((m: any) => (
                            <option key={m.user.id} value={m.user.id}>{m.user.displayName || m.user.username}</option>
                        ))}
                    </select>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                        <Info size={12} /> Notes
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-primary outline-none transition-all min-h-[80px]"
                        placeholder="Additional details..."
                    />
                </div>

                {/* Upcoming Adjustment */}
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl space-y-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Planned Pay Adjustment (Optional)</div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <span className="text-[9px] font-bold text-white/40 uppercase">Upcoming Net Pay</span>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={upcomingAmountCents ? upcomingAmountCents / 100 : ''}
                                    onChange={(e) => setUpcomingAmountCents(e.target.value ? Math.round(parseFloat(e.target.value) * 100) : 0)}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm outline-none focus:border-emerald-500 pl-6"
                                    placeholder="0.00"
                                />
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-white/20 font-bold text-xs">$</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[9px] font-bold text-white/40 uppercase">Effective Date</span>
                            <input
                                type="date"
                                value={upcomingEffectiveDate}
                                onChange={(e) => setUpcomingEffectiveDate(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm outline-none focus:border-emerald-500"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:bg-white/5 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="px-8 py-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                    >
                        {loading ? 'Saving...' : (schedule ? 'Update Income' : 'Add Income Source')}
                    </button>
                </div>
            </div>
        </Modal>
    );
};
