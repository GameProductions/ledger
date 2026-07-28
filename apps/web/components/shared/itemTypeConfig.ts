import { Wallet, CalendarDays, Bell, Layers, ArrowRight, CreditCard, type LucideIcon } from 'lucide-react'

export interface ItemTypeStyle {
  color: string
  label: string
  icon: LucideIcon
  badgeBg: string
  badgeText: string
  badgeBorder: string
  dotColor: string
}

export const ITEM_TYPE_CONFIG: Record<string, ItemTypeStyle> = {
  pay_schedule: {
    color: 'blue',
    label: 'Income',
    icon: Wallet,
    badgeBg: 'bg-blue-500/10',
    badgeText: 'text-blue-500',
    badgeBorder: 'border-blue-500/20',
    dotColor: 'bg-blue-500',
  },
  bill: {
    color: 'amber',
    label: 'Bill',
    icon: CalendarDays,
    badgeBg: 'bg-amber-500/10',
    badgeText: 'text-amber-500',
    badgeBorder: 'border-amber-500/20',
    dotColor: 'bg-amber-500',
  },
  subscription: {
    color: 'amber',
    label: 'Subscription',
    icon: Bell,
    badgeBg: 'bg-amber-500/10',
    badgeText: 'text-amber-500',
    badgeBorder: 'border-amber-500/20',
    dotColor: 'bg-amber-500',
  },
  installment: {
    color: 'violet',
    label: 'BNPL',
    icon: Layers,
    badgeBg: 'bg-violet-500/10',
    badgeText: 'text-violet-500',
    badgeBorder: 'border-violet-500/20',
    dotColor: 'bg-violet-500',
  },
  transaction: {
    color: 'emerald',
    label: 'Transfer',
    icon: ArrowRight,
    badgeBg: 'bg-emerald-500/10',
    badgeText: 'text-emerald-500',
    badgeBorder: 'border-emerald-500/20',
    dotColor: 'bg-emerald-500',
  },
  charge: {
    color: 'amber',
    label: 'Charge',
    icon: CreditCard,
    badgeBg: 'bg-amber-500/10',
    badgeText: 'text-amber-500',
    badgeBorder: 'border-amber-500/20',
    dotColor: 'bg-amber-500',
  },
}

export function getItemTypeStyle(type: string): ItemTypeStyle {
  return ITEM_TYPE_CONFIG[type] || ITEM_TYPE_CONFIG.transaction
}
