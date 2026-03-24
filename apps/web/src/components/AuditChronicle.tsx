import React from 'react'
import { useApi } from '../hooks/useApi'

const AuditChronicle: React.FC = () => {
  const { data: logs } = useApi('/api/audit')

  return (
    <section className="card" style={{ gridColumn: 'span 1' }}>
      <h3 style={{ marginBottom: '1.5rem' }}>📖 Household Chronicle</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
        {Array.isArray(logs) && logs.map((log: any) => (
          <div key={log.id} style={{ paddingLeft: '1rem', borderLeft: '2px solid var(--primary)', position: 'relative' }}>
            <div style={{ position: 'absolute', left: '-5px', top: '0', width: '8px', height: '8px', background: 'var(--primary)', borderRadius: '50%' }}></div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {new Date(log.created_at).toLocaleString()} • {log.actor_id}
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 'bold', margin: '0.2rem 0' }}>
              {log.action.toUpperCase()} {log.table_name.slice(0, -1)}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              Record: {log.record_id.substring(0, 8)}...
            </div>
          </div>
        )) || <p style={{ color: 'var(--text-secondary)' }}>No history found.</p>}
      </div>
    </section>
  )
}

export default AuditChronicle
