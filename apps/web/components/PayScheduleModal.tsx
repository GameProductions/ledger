import React, { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Modal } from './ui/Modal';
import { Calendar, DollarSign, Wallet, Shield, Info, Tag, Users, Trash2 } from 'lucide-react';
import { CurrencyInput } from './ui/CurrencyInput';
import { useApi } from '../hooks/useApi';
import { getApiUrl } from '../utils/api';
import { SearchableSelect } from './ui/SearchableSelect';
import { TypeableSelect } from './ui/TypeableSelect';

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'WEEKLY', description: 'Occurs once a week (52 times a year)' },
  { value: 'biweekly', label: 'BIWEEKLY', description: 'Occurs every two weeks (26 times a year)' },
  { value: 'semi-monthly', label: 'SEMI-MONTHLY', description: 'Occurs twice a month (e.g. 1st & 15th, 24 times a year)' },
  { value: 'monthly', label: 'MONTHLY', description: 'Occurs once a month (12 times a year)' },
  { value: 'quarterly', label: 'QUARTERLY', description: 'Occurs every three months (4 times a year)' },
  { value: 'biannual', label: 'BIANNUAL', description: 'Occurs twice a year (every 6 months)' },
  { value: 'annually', label: 'ANNUALLY', description: 'Occurs once a year (1 time a year)' },
  { value: 'biennial', label: 'BIENNIAL', description: 'Occurs once every two years' },
  { value: 'manual', label: 'MANUAL / ONE-OFF', description: 'Occurs manually / as a one-off single entry' }
];

interface PayScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
    schedule?: any; // For editing
}

export const PayScheduleModal: React.FC<PayScheduleModalProps> = ({ isOpen, onClose, onUpdate, schedule }) => {
    const { token, householdId } = useAuth();
    const { showToast, showConfirm } = useToast();
    const { data: household } = (useApi('/api/user/households/current') as any);
    const { data: paySchedules = [] } = (useApi('/api/planning/pay-schedules') as any);
    const [loading, setLoading] = React.useState(false);

    const payScheduleNames = useMemo(() => {
        const names = new Set<string>();
        if (Array.isArray(paySchedules)) {
            paySchedules.forEach((ps: any) => {
                if (ps.name) {
                    const match = ps.name.match(/^(.+?)\s*\((.+?)\)$/);
                    names.add(match ? match[1] : ps.name);
                }
            });
        }
        names.add('Salary');
        names.add('Freelance');
        names.add('Investment');
        names.add('Bonus');
        names.add('Gift');
        names.add('Tax Refund');
        names.add('Other Income');
        return Array.from(names).map(name => ({ value: name, label: name }));
    }, [paySchedules]);

    const paySourceNameOptions = useMemo(() => {
        const names = new Set<string>();
        if (Array.isArray(paySchedules)) {
            paySchedules.forEach((ps: any) => {
                if (ps.name) {
                    const match = ps.name.match(/^(.+?)\s*\((.+?)\)$/);
                    if (match) {
                        names.add(match[2]);
                    }
                }
            });
        }
        return Array.from(names).map(name => ({ value: name, label: name }));
    }, [paySchedules]);

    const parseInitialSource = (fullName: string) => {
        if (!fullName) return { type: '', name: '' };
        const match = fullName.match(/^(.+?)\s*\((.+?)\)$/);
        if (match) {
            return { type: match[1], name: match[2] };
        }
        return { type: fullName, name: '' };
    };

    const initialSource = parseInitialSource(schedule?.name || '');

    // Form State
    const [sourceType, setSourceType] = React.useState(initialSource.type || 'Salary');
    const [sourceName, setSourceName] = React.useState(initialSource.name);
    const [amountCents, setAmountCents] = React.useState(schedule?.estimatedAmountCents || 0);
    const [frequency, setFrequency] = React.useState(schedule?.frequency || 'biweekly');
    const [nextPayDate, setNextPayDate] = React.useState(schedule?.nextPayDate || new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = React.useState(schedule?.notes || '');
    const [d1, setD1] = React.useState(schedule?.semiMonthlyDay1 || 1);
    const [d2, setD2] = React.useState(schedule?.semiMonthlyDay2 || 15);
    const [userId, setUserId] = React.useState(schedule?.userId || '');
    const [upcomingAmountCents, setUpcomingAmountCents] = React.useState(schedule?.upcomingAmountCents || 0);
    const [upcomingEffectiveDate, setUpcomingEffectiveDate] = React.useState(schedule?.upcomingEffectiveDate || '');

    React.useEffect(() => {
        if (schedule) {
            const parsed = parseInitialSource(schedule.name || '');
            setSourceType(parsed.type || 'Salary');
            setSourceName(parsed.name);
            setAmountCents(schedule.estimatedAmountCents || 0);
            setFrequency(schedule.frequency);
            setNextPayDate(schedule.nextPayDate);
            setNotes(schedule.notes || '');
            setD1(schedule.semiMonthlyDay1 || 1);
            setD2(schedule.semiMonthlyDay2 || 15);
            setUserId(schedule.userId || '');
            setUpcomingAmountCents(schedule.upcomingAmountCents || 0);
            setUpcomingEffectiveDate(schedule.upcomingEffectiveDate || '');
        }
    }, [schedule]);

    const handleDelete = async () => {
        if (!token || !schedule?.id) return;
        
        const confirmed = await showConfirm('Are you sure you want to remove this income source?', 'Remove Income Source');
        if (!confirmed) return;

        setLoading(true);
        const apiUrl = getApiUrl().replace(/\/$/, '');
        const res = (await fetch(`${apiUrl}/api/planning/pay-schedules/${schedule.id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                }) as any);

        if (res.ok) {
            showToast('Income source removed');
            onUpdate();
            onClose();
        } else {
            showToast('Failed to remove income source', 'error');
        }
        setLoading(false);
    };

    const handleSave = async () => {
        if (!token) return;
        setLoading(true);

        const combinedName = sourceName?.trim() ? `${sourceType.trim()} (${sourceName.trim()})` : sourceType.trim();

        const payload = {
            name: combinedName,
            frequency,
            estimatedAmountCents: amountCents,
            nextPayDate: nextPayDate,
            notes,
            semiMonthlyDay1: frequency === 'semi-monthly' ? d1 : null,
            semiMonthlyDay2: frequency === 'semi-monthly' ? d2 : null,
            userId: userId || null,
            upcomingAmountCents: upcomingAmountCents || null,
            upcomingEffectiveDate: upcomingEffectiveDate || null
        };

        const apiUrl = getApiUrl().replace(/\/$/, '');
        const method = schedule ? 'PATCH' : 'POST';
        const url = schedule ? `${apiUrl}/api/planning/pay-schedules/${schedule.id}` : `${apiUrl}/api/planning/pay-schedules`;

        const res = (await fetch(url, {
                    method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                }) as any);

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
                    {/* Source Type & Name */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                            <Tag size={12} /> Source Type
                        </label>
                        <SearchableSelect
                            options={payScheduleNames}
                            value={sourceType}
                            onChange={(v) => setSourceType(v)}
                            placeholder="Select source type..."
                            onCreate={(v) => {
                                setSourceType(v);
                                return v;
                            }}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                            <Tag size={12} /> Source Name (e.g. Company)
                        </label>
                        <SearchableSelect
                            options={paySourceNameOptions}
                            value={sourceName}
                            onChange={(v) => setSourceName(v)}
                            placeholder="Select or type company name..."
                            onCreate={(v) => {
                                setSourceName(v);
                                return v;
                            }}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    {/* Amount */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                            <DollarSign size={12} /> Expected Net Pay
                        </label>
                        <CurrencyInput 
                            valueCents={amountCents}
                            onChangeCents={setAmountCents}
                            placeholder="0.00"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Frequency */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                            <Wallet size={12} /> Pay Frequency
                        </label>
                        <TypeableSelect
                            options={FREQUENCY_OPTIONS}
                            value={frequency}
                            onChange={setFrequency}
                            icon={<Wallet size={16} />}
                        />
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
                            <CurrencyInput 
                                valueCents={upcomingAmountCents}
                                onChangeCents={setUpcomingAmountCents}
                                placeholder="0.00"
                                className="bg-black/40 border-white/10 focus:border-emerald-500"
                            />
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

                <div className="flex justify-between items-center pt-4 border-t border-white/10">
                    {schedule?.id ? (
                        <button
                            onClick={handleDelete}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 text-red-500/60 hover:text-red-500 hover:bg-red-500/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                            <Trash2 size={14} /> Remove Source
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
                        className="px-8 py-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                    >
                        {loading ? 'Saving...' : (schedule ? 'Update Income' : 'Add Income Source')}
                    </button>
                </div>
                </div>
            </div>
        </Modal>
    );
};
