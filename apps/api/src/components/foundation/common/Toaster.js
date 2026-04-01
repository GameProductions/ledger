import { jsx as _jsx } from "react/jsx-runtime";
import { Toaster as Sonner } from 'sonner';
/**
 * GameProductions Foundation Toaster (v1.3.0)
 * Standardized notification engine based on 'sonner'.
 * Supports soft-force and hard-force theme colors via CSS variables.
 */
export const Toaster = (props) => {
    return (_jsx(Sonner, { position: "bottom-right", ...props, toastOptions: {
            style: {
                background: 'var(--bg-primary, #ffffff)',
                color: 'var(--text-primary, #111111)',
                border: '1px solid var(--border-color, #e5e7eb)',
                borderRadius: '12px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                padding: '16px',
            },
            className: 'gp-toast',
        }, closeButton: true, richColors: true, expand: true }));
};
