import React from 'react';
import { useApi } from '../hooks/useApi';
import { formatEntityTitle, formatUserDisplayName } from '../utils/entityFormatter';

const AuditChronicle: React.FC = () => {
  const { data: logs = [] } = (useApi('/api/user/audit') as any);

  return (
    <section className="card" style={{ gridColumn: 'span 1' }}>
      <h3 style={{ marginBottom: '0.25rem' }}>📖 Household Activity</h3>
      <p className="text-xs text-secondary font-medium mb-6">
        A private timeline showing changes made in your household, such as added, modified, or deleted budget items and settings. Helpful for tracking changes in shared budgets.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
        {Array.isArray(logs) && logs.length > 0 ? (
          logs.map((log: any) => {
            const actorResolved = formatUserDisplayName(log.actor_name, log.actor_username, 'Household Member');
            const entityTitle = formatEntityTitle(log.target_type);
            const friendlyAction = (log?.action || '').replace(/_/g, ' ').toUpperCase();

            return (
              <div key={log.id} style={{ paddingLeft: '1rem', borderLeft: '2px solid var(--primary)', position: 'relative' }}>
                <div style={{ position: 'absolute', left: '-5px', top: '0', width: '8px', height: '8px', background: 'var(--primary)', borderRadius: '50%' }}></div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {new Date(log.created_at || log.createdAt).toLocaleString()} • <strong className="text-white font-medium">{actorResolved}</strong>
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 'bold', margin: '0.2rem 0' }}>
                  {friendlyAction} {entityTitle}
                </div>
                {log.reason && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    Reason: {log.reason}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <p style={{ color: 'var(--text-secondary)' }}>No history found.</p>
        )}
      </div>
    </section>
  );
};

export default AuditChronicle;
