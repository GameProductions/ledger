import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// @ts-nocheck
/** @jsxImportSource react */
import { useState } from 'react';
/**
 * GameProductions Foundation OG Meta Tag Editor (v1.3.0)
 * Admin-only UI for overriding app-sharing metadata.
 * Part of the God Mode Branding suite.
 */
export const OGEditor = ({ initialMetadata, onSave }) => {
    const [metadata, setMetadata] = useState(initialMetadata);
    return (_jsxs("div", { className: "gp-og-editor", children: [_jsx("h3", { children: "Social Metadata (Open Graph)" }), _jsxs("p", { className: "description", children: ["Customize how ", metadata.title, " appears when shared on social media."] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Share Title" }), _jsx("input", { type: "text", value: metadata.title, onChange: (e) => setMetadata({ ...metadata, title: e.target.value }), placeholder: "Override App Name..." })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Share Description" }), _jsx("textarea", { value: metadata.description, onChange: (e) => setMetadata({ ...metadata, description: e.target.value }), placeholder: "Custom sharing description..." })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Share Image URL" }), _jsx("input", { type: "text", value: metadata.imageUrl, onChange: (e) => setMetadata({ ...metadata, imageUrl: e.target.value }), placeholder: "URL to custom 1200x630 image..." })] }), _jsxs("div", { className: "preview-card", children: [_jsx("div", { className: "preview-image", style: { backgroundImage: `url(${metadata.imageUrl})` } }), _jsxs("div", { className: "preview-content", children: [_jsx("h4", { children: metadata.title || 'Sharing Preview' }), _jsx("p", { children: metadata.description || 'App description will appear here...' })] })] }), _jsx("button", { className: "btn-primary", onClick: () => onSave(metadata), children: "Update Social Assets" })] }));
};
