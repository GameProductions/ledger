import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// @ts-nocheck
/** @jsxImportSource react */
import { useState } from 'react';
/**
 * GameProductions Foundation Audit Trail (v1.3.0)
 * Standardized forensic history view.
 * Visualizes the 'history' JSON column for audit-compliant data tracking.
 */
export const AuditTrail = ({ entries }) => {
    const [filter, setFilter] = useState('');
    const filtered = entries.filter((e) => e.action.toLowerCase().includes(filter.toLowerCase()) ||
        e.userId.toLowerCase().includes(filter.toLowerCase()));
    return (_jsxs("div", { className: "gp-audit-trail", children: [_jsxs("div", { className: "audit-header", children: [_jsx("h3", { children: "Forensic Audit Trail" }), _jsx("input", { type: "text", placeholder: "Filter by action or user...", value: filter, onChange: (e) => setFilter(e.target.value) })] }), _jsx("div", { className: "audit-list scrollable-list", children: filtered.map((entry) => (_jsxs("div", { className: "audit-card", children: [_jsxs("div", { className: "audit-meta", children: [_jsx("span", { className: "timestamp", children: new Date(entry.timestamp).toLocaleString() }), _jsxs("span", { className: "user-id", children: ["User: ", entry.userId] })] }), _jsx("div", { className: "audit-action", children: entry.action }), _jsxs("div", { className: "audit-values", children: [_jsxs("span", { className: "old", children: ["From: ", entry.previousValue] }), _jsx("span", { className: "arrow", children: "\u2192" }), _jsxs("span", { className: "new", children: ["To: ", entry.newValue] })] }), entry.metadata && (_jsx("div", { className: "audit-metadata", children: _jsx("pre", { children: JSON.stringify(entry.metadata, null, 2) }) }))] }, entry.id))) })] }));
};
