import React from 'react';
import { Calendar, Clock, RotateCcw } from 'lucide-react';

export type FrequencyType = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';

interface SchedulingPickerProps {
  value: {
    frequency_type: FrequencyType;
    frequency_interval: number;
    day_of_month?: number;
    days_of_week?: string;
    total_installments?: number;
  };
  onChange: (value: any) => void;
}

const SchedulingPicker: React.FC<SchedulingPickerProps> = ({ value, onChange }) => {
  const frequencies: { id: FrequencyType; label: string }[] = [
    { id: 'daily', label: 'Daily' },
    { id: 'weekly', label: 'Weekly' },
    { id: 'biweekly', label: 'Bi-Weekly' },
    { id: 'monthly', label: 'Monthly' },
    { id: 'yearly', label: 'Yearly' },
  ];

  const updateField = (field: string, val: any) => {
    onChange({ ...value, [field]: val });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Frequency Type */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest font-black text-secondary flex items-center gap-2">
            <RotateCcw size={12} className="text-primary" />
            Frequency
          </label>
          <select
            value={value.frequency_type}
            onChange={(e) => updateField('frequency_type', e.target.value)}
            className="w-full p-3 bg-white/5 border border-glass-border rounded-xl text-sm font-bold focus:outline-none focus:border-primary transition-all"
          >
            {frequencies.map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>
        </div>

        {/* Interval */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest font-black text-secondary flex items-center gap-2">
            <Clock size={12} className="text-secondary" />
            Every X Intervals
          </label>
          <input
            type="number"
            min="1"
            max="100"
            value={value.frequency_interval}
            onChange={(e) => updateField('frequency_interval', parseInt(e.target.value) || 1)}
            className="w-full p-3 bg-white/5 border border-glass-border rounded-xl text-sm font-bold focus:outline-none focus:border-primary transition-all"
          />
        </div>
      </div>

      {/* Monthly specific options */}
      {value.frequency_type === 'monthly' && (
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl animate-in fade-in slide-in-from-top-2">
          <label className="text-[10px] uppercase tracking-widest font-black text-primary mb-3 block">Day of the Month</label>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => updateField('day_of_month', day)}
                className={`p-2 text-[10px] font-bold rounded-lg transition-all ${
                  value.day_of_month === day 
                    ? 'bg-primary text-white shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)]' 
                    : 'bg-white/5 text-secondary hover:bg-white/10'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Weekly/Bi-Weekly specific options */}
      {(value.frequency_type === 'weekly' || value.frequency_type === 'biweekly') && (
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl animate-in fade-in slide-in-from-top-2">
          <label className="text-[10px] uppercase tracking-widest font-black text-primary mb-3 block">Days of the Week</label>
          <div className="flex flex-wrap gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
              <button
                key={day}
                type="button"
                onClick={() => {
                  const days = value.days_of_week ? value.days_of_week.split(',') : [];
                  const dayStr = i.toString();
                  const newDays = days.includes(dayStr) 
                    ? days.filter(d => d !== dayStr) 
                    : [...days, dayStr];
                  updateField('days_of_week', newDays.sort().join(','));
                }}
                className={`flex-1 p-2 text-[10px] font-bold rounded-lg transition-all ${
                  (value.days_of_week || '').split(',').includes(i.toString())
                    ? 'bg-primary text-white shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)]' 
                    : 'bg-white/5 text-secondary hover:bg-white/10'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Termination logic */}
      <div className="pt-4 border-t border-white/5">
        <label className="flex items-center gap-3 cursor-pointer group">
          <input 
            type="checkbox" 
            checked={!!value.total_installments} 
            onChange={(e) => updateField('total_installments', e.target.checked ? 12 : undefined)}
            className="hidden"
          />
          <div className={`w-10 h-6 rounded-full transition-all relative ${value.total_installments ? 'bg-primary' : 'bg-white/10'}`}>
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${value.total_installments ? 'right-1' : 'left-1'}`} />
          </div>
          <span className="text-xs font-bold text-secondary group-hover:text-white transition-colors">Terminate after fixed number of occurrences</span>
        </label>

        {value.total_installments && (
           <div className="mt-4 animate-in zoom-in-95 duration-200">
             <input
                type="number"
                min="1"
                placeholder="Number of installments (e.g. 12)"
                value={value.total_installments}
                onChange={(e) => updateField('total_installments', parseInt(e.target.value) || 1)}
                className="w-full p-3 bg-white/5 border border-glass-border rounded-xl text-sm font-bold focus:outline-none focus:border-primary transition-all"
              />
           </div>
        )}
      </div>
    </div>
  );
};

export default SchedulingPicker;
