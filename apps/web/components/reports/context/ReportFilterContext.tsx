import React, { createContext, useContext, useState, useCallback } from 'react'
import { ReportFilters } from '../types'

function defaultFilters(): ReportFilters {
  const now = new Date()
  const to = now.toISOString().split('T')[0]
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  return { from, to, preset: 'thisMonth', accountIds: [], categoryIds: [], type: 'all', compareFrom: '', compareTo: '' }
}

interface ReportFilterContextValue {
  filters: ReportFilters
  setFilters: React.Dispatch<React.SetStateAction<ReportFilters>>
  setDateRange: (preset: string, from: string, to: string) => void
  resetFilters: () => void
}

const ReportFilterContext = createContext<ReportFilterContextValue | null>(null)

export const ReportFilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [filters, setFilters] = useState<ReportFilters>(defaultFilters)

  const setDateRange = useCallback((preset: string, from: string, to: string) => {
    const now = new Date()
    let compareFrom = ''
    let compareTo = ''
    const days = Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / 86400000)
    const compareEnd = new Date(new Date(from).getTime() - 86400000)
    const compareStart = new Date(compareEnd.getTime() - days * 86400000)
    compareFrom = compareStart.toISOString().split('T')[0]
    compareTo = compareEnd.toISOString().split('T')[0]

    setFilters(prev => ({ ...prev, preset, from, to, compareFrom, compareTo }))
  }, [])

  const resetFilters = useCallback(() => setFilters(defaultFilters()), [])

  return (
    <ReportFilterContext.Provider value={{ filters, setFilters, setDateRange, resetFilters }}>
      {children}
    </ReportFilterContext.Provider>
  )
}

export function useReportFilters() {
  const ctx = useContext(ReportFilterContext)
  if (!ctx) throw new Error('useReportFilters must be used within ReportFilterProvider')
  return ctx
}
