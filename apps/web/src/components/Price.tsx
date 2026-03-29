import { Masked } from './ui/Masked'

interface PriceProps {
  amountCents: number
  className?: string
  hideCents?: boolean
  options?: Intl.NumberFormatOptions
}

export const Price: React.FC<PriceProps> = ({ amountCents, className, hideCents, options }) => {
  const { formatPrice } = useCurrency()
  
  const formatted = formatPrice(amountCents, hideCents ? {
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
