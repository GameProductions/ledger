import React, { useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApi } from '../hooks/useApi'
import { SearchableSelect } from './ui/SearchableSelect'

const HouseholdSwitcher: React.FC = () => {
  const { householdId, setHouseholdId } = useAuth()
  const { data: households, loading } = (useApi('/api/user/households') as any)

  const options = useMemo(() => {
    if (!Array.isArray(households)) return []
    return [...households]
      .sort((a: any, b: any) => a.name.localeCompare(b.name))
      .map((h: any) => ({
        value: h.id,
        label: `${h.name} (${h.role})`,
        metadata: { subtext: h.role }
      }))
  }, [households])

  if (loading) return null

  return (
    <div style={{ minWidth: 200 }}>
      <SearchableSelect
        options={options}
        value={householdId || ''}
        onChange={(val) => setHouseholdId(val)}
        placeholder="Select household..."
      />
    </div>
  )
}

export default HouseholdSwitcher
