import React from 'react';
import { CheckSquare, Square } from 'lucide-react';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  iconClassName?: string;
  disabled?: boolean;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  className = '',
  iconClassName = '',
  disabled = false,
}) => {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`focus:outline-none transition-all flex items-center justify-center disabled:opacity-50 ${className}`}
    >
      {checked ? (
        <CheckSquare size={18} className={`text-primary ${iconClassName}`} />
      ) : (
        <Square size={18} className={`text-secondary ${iconClassName}`} />
      )}
    </button>
  );
};

export default Checkbox;
