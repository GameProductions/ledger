import React from 'react'
import { useAuth } from '../context/AuthContext'
import { useApi } from '../hooks/useApi'

const HouseholdSwitcher: React.FC = () => {
  const { householdId, setHouseholdId } = useAuth()
  const { data: households, loading } = useApi('/api/user/households')

  if (loading) return null

  return (
    <div className="household-switcher" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Switch Household:</span>
      <select 
        value={householdId || ''} 
        onChange={(e) => setHouseholdId(e.target.value)}
        style={{ 
          background: 'rgba(255,255,255,0.05)', 
          border: '1px solid var(--glass-border)', 
          color: 'white',
          padding: '0.3rem 0.5rem',
          borderRadius: '0.4rem',
          fontSize: '0.9rem',
          cursor: 'pointer'
        }}
      >
        {Array.isArray(households) && households.map((h: any) => (
          <option key={h.id} value={h.id} style={{ background: 'var(--bg-dark)' }}>
            {h.name} ({h.role})
          </option>
        ))}
      </select>
    </div>
  )
}

export default HouseholdSwitcher
