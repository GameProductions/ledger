// @ts-nocheck
/** @jsxImportSource react */



import React, { useState } from 'react';

type HelpItem = {
  id: string;
  category: string;
  title: string;
  content: string;
};

/**
 * Foundation Help Center
 * Searchable, categorized help system.
 * Ported setup guides for YouTube, Twitch, Plaid, etc.
 */
export const HelpCenter = ({ items }: any) => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const categories = ['all', ...new Set(items.map((i) => i.category))];

  const filteredItems = items.filter((i) => {
    const matchesSearch = i.title.toLowerCase().includes(search.toLowerCase()) || i.content.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'all' || i.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="gp-help-center">
      <div className="help-header">
        <input
          type="text"
          placeholder="Search for guides, faqs, and more..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select onChange={(e) => setCategory(e.target.value)}>
          {categories.map((c) => (
            <option key={c} value={c}>{c.toUpperCase()}</option>
          ))}
        </select>
      </div>

      <div className="help-content scrollable-list">
        {filteredItems.map((item) => (
          <div key={item.id} className="help-card">
            <h3>{item.title}</h3>
            <div className="help-category">{item.category}</div>
            <div className="help-body">{item.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
