import React from 'react'
import { useApi, globalMutate } from '../../hooks/useApi'
import { SearchableSelect, SearchableOption } from './SearchableSelect'

interface EntityManagerSelectProps {
  entityType: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onCreate?: (name: string) => Promise<string | void> | string | void
  extraQuery?: string
}

export const EntityManagerSelect: React.FC<EntityManagerSelectProps> = ({
  entityType,
  value,
  onChange,
  placeholder,
  onCreate,
  extraQuery = '',
}) => {
  const householdId = localStorage.getItem('ledger_householdId') || ''
  const qs = `?householdId=${householdId}${extraQuery}`
  const { data } = (useApi(`/api/admin/entity-manager/${entityType}${qs}`) as any)

  const options: SearchableOption[] = (data?.data || []).map((item: any) => ({
    value: item.id,
    label: item.name || item.label || item.description || item.id,
  }))

  return (
    <SearchableSelect
      options={options}
      value={value}
      onChange={(val) => { onChange(val); globalMutate() }}
      placeholder={placeholder || `Choose ${entityType}...`}
      onCreate={onCreate}
    />
  )
}
