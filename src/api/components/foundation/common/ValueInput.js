import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// @ts-nocheck
/** @jsxImportSource react */
import { useState } from 'react';
/**
 * GameProductions Foundation Value Input (v1.3.0)
 * Standardized, high-fidelity UI component for currency and price inputs.
 * Enforces cent-perfect math and precision handling for all organization apps.
 */
export const ValueInput = ({ value, label, currency = 'USD', onChange }) => {
    const [inputValue, setInputValue] = useState(value?.toString() || '0.00');
    const handleChange = (e) => {
        const raw = e.target.value.replace(/[^0-9.]/g, '');
        setInputValue(raw);
        const parsed = parseFloat(raw);
        if (!isNaN(parsed)) {
            onChange(Math.round(parsed * 100)); // Standardized stored as INT (cents)
        }
    };
    return (_jsxs("div", { className: "gp-value-input", children: [_jsx("label", { children: label }), _jsxs("div", { className: "input-wrapper", children: [_jsx("span", { className: "currency-symbol", children: currency === 'USD' ? '$' : currency }), _jsx("input", { type: "text", value: inputValue, onChange: handleChange, onBlur: () => setInputValue((parseFloat(inputValue) || 0).toFixed(2)), placeholder: "0.00" })] })] }));
};
