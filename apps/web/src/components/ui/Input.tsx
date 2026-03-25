import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="space-y-2 w-full">
      {label && (
        <label className="block text-[10px] font-black text-secondary uppercase tracking-widest ml-1">
          {label}
        </label>
      )}
      <input
        className={`w-full p-4 bg-white/5 border border-glass-border rounded-xl text-white placeholder:text-slate-500 focus:border-primary outline-none transition-all font-bold ${className}`}
        {...props}
      />
      {error && <p className="text-[10px] text-red-500 font-bold ml-1 uppercase tracking-wider">{error}</p>}
    </div>
  );
};
