import React from 'react';
import { Check, X } from 'lucide-react';

interface Requirement {
  label: string;
  test: (p: string) => boolean;
}

interface PasswordChecklistProps {
  password: string;
}

export const PasswordChecklist: React.FC<PasswordChecklistProps> = ({ password }) => {
  const requirements: Requirement[] = [
    { label: 'At least 8 characters', test: (p) => p.length >= 8 },
    { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
    { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
    { label: 'One number', test: (p) => /[0-9]/.test(p) },
    { label: 'One special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
  ];

  return (
    <div className="space-y-2 p-6 bg-white/5 border border-white/5 rounded-2xl reveal">
      <div className="text-xs font-black uppercase tracking-[0.2em] text-secondary mb-4">Security Standards</div>
      <div className="grid grid-cols-1 gap-3">
        {requirements.map((req, i) => {
          const met = req.test(password);
          return (
            <div key={i} className={`flex items-center gap-3 transition-all ${met ? 'text-primary' : 'text-slate-500'}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${met ? 'bg-primary/20 border-primary/40' : 'bg-white/5 border-white/10'}`}>
                {met ? <Check size={12} strokeWidth={4} /> : <X size={10} className="opacity-40" />}
              </div>
              <span className="text-sm font-bold tracking-tight">{req.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
