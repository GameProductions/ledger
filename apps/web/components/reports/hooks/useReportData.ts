import { useMemo } from 'react'
import { useApi } from '../../../hooks/useApi'
import { useReportFilters } from '../context/ReportFilterContext'
import { getApiUrl } from '../../../utils/api'
import { ReportFilters } from '../types'

function buildQuery(filters: ReportFilters): string {
  const params = new URLSearchParams()
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  if (filters.accountIds.length) params.set('account_ids', filters.accountIds.join(','))
  if (filters.categoryIds.length) params.set('category_ids', filters.categoryIds.join(','))
  if (filters.type !== 'all') params.set('type', filters.type)
  if (filters.compareFrom) params.set('compare_from', filters.compareFrom)
  if (filters.compareTo) params.set('compare_to', filters.compareTo)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export function useReportData<T>(endpoint: string) {
  const { filters } = useReportFilters()
  const query = useMemo(() => buildQuery(filters), [filters])
  return useApi<T>(`${endpoint}${query}` as any)
}
