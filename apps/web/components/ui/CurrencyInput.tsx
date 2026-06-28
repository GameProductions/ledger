import React from 'react';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  valueCents: number;
  onChangeCents: (cents: number) => void;
  showSymbol?: boolean;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  valueCents,
  onChangeCents,
  showSymbol = true,
  className = '',
  ...props
}) => {
  const displayValue = (valueCents / 100).toFixed(2);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (isNaN(val)) {
      onChangeCents(0);
      return;
    }
    onChangeCents(Math.round(val * 100));
  };

  return (
    <div className="relative">
      {showSymbol && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary font-black text-sm pointer-events-none">
          $
        </span>
      )}
      <input
        type="number"
        step="0.01"
        value={displayValue}
        onChange={handleChange}
        className={`w-full bg-black/40 border border-white/10 rounded-xl p-3 ${showSymbol ? 'pl-8' : ''} text-white focus:outline-none focus:border-primary transition-colors ${className}`}
        {...props}
      />
    </div>
  );
};
export default CurrencyInput;
