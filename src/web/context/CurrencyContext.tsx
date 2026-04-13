import React, { createContext, useContext, useMemo } from 'react'
import { useApi } from '../hooks/useApi'

interface CurrencyContextType {
  currency: string
  formatPrice: (cents: number, options?: Intl.NumberFormatOptions) => string
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: profile } = useApi('/api/user/profile')
  const { data: globalConfig } = useApi('/api/config')
  
  const settings = useMemo(() => {
    try {
      return JSON.parse(profile?.settingsJson || '{}')
    } catch {
      return {}
    }
  }, [profile?.settingsJson])

  const currency = settings.currency || globalConfig?.config?.PLATFORM_DEFAULT_CURRENCY || 'USD'

  const formatPrice = (cents: number, options?: Intl.NumberFormatOptions) => {
    const amount = cents / 100
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...options
    }).format(amount)
  }

  return (
    <CurrencyContext.Provider value={{ currency, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export const useCurrency = () => {
  const context = useContext(CurrencyContext)
  if (!context) throw new Error('useCurrency must be used within a CurrencyProvider')
  return context
}
