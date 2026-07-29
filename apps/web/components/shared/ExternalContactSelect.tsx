import React, { useMemo } from 'react'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { SearchableSelect } from '../ui/SearchableSelect'

interface ExternalContactSelectProps {
  value: string
  onChange: (id: string) => void
  placeholder?: string
}

export const ExternalContactSelect: React.FC<ExternalContactSelectProps> = ({
  value,
  onChange,
  placeholder = 'Who does this belong to?',
}) => {
  const { token, householdId } = useAuth()
  const { data: contacts = [], mutate } = (useApi('/api/planning/contacts') as any)

  const options = useMemo(() => {
    return (contacts || []).map((c: any) => ({ value: c.id, label: c.name }))
  }, [contacts])

  const handleCreate = async (name: string): Promise<string> => {
    const res = await fetch('/api/planning/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-household-id': householdId || '',
      },
      body: JSON.stringify({ name, scope: 'private' }),
    })
    const data = await res.json() as any
    if (data.success) {
      mutate()
      return data.id
    }
    return ''
  }

  return (
    <SearchableSelect
      options={options}
      value={value}
      onChange={(val) => onChange(val)}
      placeholder={placeholder}
      onCreate={handleCreate}
    />
  )
}
