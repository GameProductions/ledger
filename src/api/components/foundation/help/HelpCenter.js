import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// @ts-nocheck
/** @jsxImportSource react */
import { useState } from 'react';
/**
 * GameProductions Foundation Help Center (v1.3.0)
 * Searchable, categorized help system.
 * Ported setup guides for YouTube, Twitch, Plaid, etc.
 */
export const HelpCenter = ({ items }) => {
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('all');
    const categories = ['all', ...new Set(items.map((i) => i.category))];
    const filteredItems = items.filter((i) => {
        const matchesSearch = i.title.toLowerCase().includes(search.toLowerCase()) || i.content.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = category === 'all' || i.category === category;
        return matchesSearch && matchesCategory;
    });
    return (_jsxs("div", { className: "gp-help-center", children: [_jsxs("div", { className: "help-header", children: [_jsx("input", { type: "text", placeholder: "Search for guides, faqs, and more...", value: search, onChange: (e) => setSearch(e.target.value) }), _jsx("select", { onChange: (e) => setCategory(e.target.value), children: categories.map((c) => (_jsx("option", { value: c, children: c.toUpperCase() }, c))) })] }), _jsx("div", { className: "help-content scrollable-list", children: filteredItems.map((item) => (_jsxs("div", { className: "help-card", children: [_jsx("h3", { children: item.title }), _jsx("div", { className: "help-category", children: item.category }), _jsx("div", { className: "help-body", children: item.content })] }, item.id))) })] }));
};
