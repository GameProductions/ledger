import React from 'react'
import { useCurrency } from '../context/CurrencyContext'
import { Masked } from './ui/Masked'

interface PriceProps {
  amount_cents: number
  className?: string
  hideCents?: boolean
  options?: Intl.NumberFormatOptions
}

export const Price: React.FC<PriceProps> = ({ amount_cents, className, hideCents, options }) => {
  const { formatPrice } = useCurrency()
  
  const formatted = formatPrice(amount_cents, hideCents ? {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...options
  } : options)

  return (
    <Masked>
      <span className={className}>{formatted}</span>
    </Masked>
  )
}
