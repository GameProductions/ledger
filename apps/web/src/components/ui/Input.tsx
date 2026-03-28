import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  showReveal?: boolean;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', type, showReveal, ...props }) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className="space-y-2 w-full">
      {label && (
        <label className="block text-[10px] font-black text-secondary uppercase tracking-widest text-center">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type={isPassword && isRevealed ? 'text' : type}
          className={`w-full p-4 bg-white/5 border border-glass-border rounded-xl text-white placeholder:text-slate-500 focus:border-primary outline-none transition-all font-bold ${isPassword && showReveal ? 'pr-12' : ''} ${className}`}
          {...props}
        />
        {isPassword && showReveal && (
          <button
            type="button"
            onClick={() => setIsRevealed(!isRevealed)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary hover:text-white transition-colors"
          >
            {isRevealed ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && <p className="text-[10px] text-red-500 font-bold ml-1 uppercase tracking-wider">{error}</p>}
    </div>
  );
};
