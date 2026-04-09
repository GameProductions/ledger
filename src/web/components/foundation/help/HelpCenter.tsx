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
 * GameProductions Foundation Help Center (v1.3.0)
 * Searchable, categorized help system.
 * Ported setup guides for YouTube, Twitch, Plaid, etc.
 */
export const HelpCenter = ({ items = [] }: any) => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [isOpen, setIsOpen] = useState(false);

  const categories = ['all', ...new Set(items.map((i: any) => i.category))];

  const filteredItems = items.filter((i: any) => {
    const matchesSearch = i.title.toLowerCase().includes(search.toLowerCase()) || i.content.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'all' || i.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <>
      <style>{`
        .gp-help-bubble {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 10px 25px rgba(16, 185, 129, 0.4);
          z-index: 9999;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .gp-help-bubble:hover {
          transform: translateY(-4px) scale(1.05);
          box-shadow: 0 14px 30px rgba(16, 185, 129, 0.5);
        }
        .gp-help-bubble svg {
          width: 24px;
          height: 24px;
          transition: transform 0.3s ease;
        }
        .gp-help-bubble.open svg {
          transform: rotate(180deg);
        }
        .gp-help-center-overlay {
          position: fixed;
          bottom: 100px;
          right: 24px;
          width: 380px;
          max-height: calc(100vh - 140px);
          background: #111827;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
          z-index: 9998;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          opacity: 0;
          transform: translateY(20px) scale(0.95);
          pointer-events: none;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .gp-help-center-overlay.open {
          opacity: 1;
          transform: translateY(0) scale(1);
          pointer-events: auto;
        }
        .gp-help-header {
          padding: 24px 24px 16px;
          background: linear-gradient(180deg, #1f2937 0%, #111827 100%);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .gp-help-header h2 {
          margin: 0 0 16px 0;
          color: #f3f4f6;
          font-size: 1.25rem;
          font-weight: 600;
        }
        .gp-help-controls {
          display: flex;
          gap: 12px;
        }
        .gp-help-controls input {
          flex: 1;
          background: #374151;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #fff;
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .gp-help-controls input:focus {
          border-color: #10b981;
        }
        .gp-help-controls select {
          background: #374151;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #d1d5db;
          border-radius: 8px;
          padding: 10px;
          font-size: 0.875rem;
          outline: none;
          cursor: pointer;
        }
        .gp-help-content {
          padding: 16px 24px;
          overflow-y: auto;
          flex: 1;
          max-height: 400px;
        }
        .gp-help-content::-webkit-scrollbar {
          width: 6px;
        }
        .gp-help-content::-webkit-scrollbar-thumb {
          background: #374151;
          border-radius: 6px;
        }
        .gp-help-card {
          padding: 16px;
          background: #1f2937;
          border-radius: 12px;
          margin-bottom: 12px;
          border: 1px solid transparent;
          transition: border-color 0.2s;
        }
        .gp-help-card:hover {
          border-color: rgba(16, 185, 129, 0.3);
        }
        .gp-help-card h3 {
          margin: 0 0 4px 0;
          color: #f3f4f6;
          font-size: 0.95rem;
        }
        .gp-help-category {
          font-size: 0.75rem;
          color: #10b981;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 8px;
          font-weight: 600;
        }
        .gp-help-body {
          color: #9ca3af;
          font-size: 0.875rem;
          line-height: 1.5;
        }
        .gp-help-empty {
          text-align: center;
          padding: 32px 0;
          color: #6b7280;
          font-size: 0.875rem;
        }
      `}</style>

      <button 
        className={`gp-help-bubble ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Help Center"
      >
        {isOpen ? (
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </button>

      <div className={`gp-help-center-overlay ${isOpen ? 'open' : ''}`}>
        <div className="gp-help-header">
          <h2>Help Center</h2>
          <div className="gp-help-controls">
            <input
              type="text"
              placeholder="Search guides..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select onChange={(e) => setCategory(e.target.value)} value={category}>
              {categories.map((c) => (
                <option key={c} value={c}>{String(c).toUpperCase()}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="gp-help-content">
          {filteredItems.length === 0 ? (
            <div className="gp-help-empty">No guides found.</div>
          ) : (
            filteredItems.map((item: any) => (
              <div key={item.id} className="gp-help-card">
                <h3>{item.title}</h3>
                <div className="gp-help-category">{item.category}</div>
                <div className="gp-help-body">{item.content}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};
