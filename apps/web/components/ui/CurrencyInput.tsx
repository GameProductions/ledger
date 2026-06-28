import React, { useEffect, useState } from 'react';
import { parseToCents, formatCentsToDecimal } from '../../utils/currencyUtils';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  valueCents: number;
  onChangeCents: (cents: number) => void;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  valueCents,
  onChangeCents,
  className,
  ...props
}) => {
  const [displayValue, setDisplayValue] = useState(formatCentsToDecimal(valueCents));

  useEffect(() => {
    setDisplayValue(formatCentsToDecimal(valueCents));
  }, [valueCents]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const cents = parseToCents(rawVal);
    onChangeCents(cents);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && valueCents === 0) {
      e.preventDefault();
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Delay slightly to ensure browser focus event has finished setting selection
    setTimeout(() => {
      e.target.setSelectionRange(val.length, val.length);
    }, 0);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      className={className}
      {...props}
    />
  );
};
export default CurrencyInput;
