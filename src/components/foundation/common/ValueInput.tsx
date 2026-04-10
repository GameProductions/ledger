// @ts-nocheck
/** @jsxImportSource react */



import React, { useState } from 'react';

/**
 * Foundation Value Input (v1.3.0)
 * Standardized, high-fidelity UI component for currency and price inputs.
 * Enforces cent-perfect math and precision handling for all organization apps.
 */
export const ValueInput = ({ value, label, currency = 'USD', onChange }) => {
  const [inputValue, setInputValue] = useState(value?.toString() || '0.00');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    setInputValue(raw);
    
    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) {
      onChange(Math.round(parsed * 100)); // Standardized stored as INT (cents)
    }
  };

  return (
    <div className="gp-value-input">
      <label>{label}</label>
      <div className="input-wrapper">
        <span className="currency-symbol">{currency === 'USD' ? '$' : currency}</span>
        <input
          type="text"
          value={inputValue}
          onChange={handleChange}
          onBlur={() => setInputValue((parseFloat(inputValue) || 0).toFixed(2))}
          placeholder="0.00"
        />
      </div>
    </div>
  );
};
