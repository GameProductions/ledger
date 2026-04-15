// @ts-nocheck
/** @jsxImportSource react */



import React, { useState } from 'react';

type AuditEntry = {
  id: string;
  userId: string;
  action: string;
  previousValue: string;
  newValue: string;
  timestamp: string;
  metadata?: Record<string, any>;
};

/**
 * Foundation Audit Trail (Stable)
 * Standardized forensic history view.
 * Visualizes the 'history' JSON column for audit-compliant data tracking.
 */
export const AuditTrail = ({ entries }: { entries: AuditEntry[] }) => {
  const [filter, setFilter] = useState('');

  const filtered = entries.filter((e) => 
    e.action.toLowerCase().includes(filter.toLowerCase()) || 
    e.userId.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="gp-audit-trail">
      <div className="audit-header">
        <h3>Forensic Audit Trail</h3>
        <input 
          type="text" 
          placeholder="Filter by action or user..." 
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <div className="audit-list scrollable-list">
        {filtered.map((entry) => (
          <div key={entry.id} className="audit-card">
            <div className="audit-meta">
              <span className="timestamp">{new Date(entry.timestamp).toLocaleString()}</span>
              <span className="user-id">User: {entry.userId}</span>
            </div>
            <div className="audit-action">{entry.action}</div>
            <div className="audit-values">
              <span className="old">From: {entry.previousValue}</span>
              <span className="arrow">→</span>
              <span className="new">To: {entry.newValue}</span>
            </div>
            {entry.metadata && (
              <div className="audit-metadata">
                <pre>{JSON.stringify(entry.metadata, null, 2)}</pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
