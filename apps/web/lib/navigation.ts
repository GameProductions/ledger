import {
  CreditCard, Receipt, BarChart3, HandCoins, Briefcase, Database, List, GitMerge, HelpCircle,
  LayoutDashboard, Users, Shield, Globe, Zap, FileText, Search, Cpu, Lock, Settings
} from 'lucide-react'

export interface NavItem {
  id: string
  label: string
  icon: React.ComponentType<{ size?: number | string; className?: string }>
  hash: string
}

export const navItems: NavItem[] = [
  { id: 'payments',      label: 'Payment Central',     icon: CreditCard,   hash: '#/payments' },
  { id: 'reconcile',     label: 'Reconciliation',      icon: GitMerge,     hash: '#/reconcile' },
  { id: 'subscriptions', label: 'Subscriptions',       icon: Receipt,      hash: '#/subscriptions' },
  { id: 'reports',       label: 'Reports',             icon: BarChart3,    hash: '#/reports' },
  { id: 'loans',         label: 'Loan Manager',        icon: HandCoins,    hash: '#/loans' },
  { id: 'investments',   label: 'Investments',         icon: Briefcase,    hash: '#/investments' },
  { id: 'data',          label: 'Import & Export Hub', icon: Database,     hash: '#/data' },
  { id: 'manage',        label: 'Entity Manager',      icon: List,         hash: '#/manage' },
  { id: 'help',          label: 'Help & Guides',       icon: HelpCircle,   hash: '#/help' },
]

export const adminNavItems: NavItem[] = [
  { id: 'admin-dashboard',      label: 'Owner Dashboard',     icon: LayoutDashboard, hash: '#/admin/dashboard' },
  { id: 'admin-users',          label: 'User Directory',      icon: Users,           hash: '#/admin/users' },
  { id: 'admin-households',     label: 'Household Registry',  icon: Shield,          hash: '#/admin/households' },
  { id: 'admin-entity-manager', label: 'Entity Manager',      icon: Database,        hash: '#/admin/entity-manager' },
  { id: 'admin-providers',      label: 'Service Providers',   icon: Globe,           hash: '#/admin/providers' },
  { id: 'admin-processors',     label: 'Payment Networks',    icon: Zap,             hash: '#/admin/processors' },
  { id: 'admin-registry',       label: 'Master Records',      icon: FileText,        hash: '#/admin/registry' },
  { id: 'admin-search',         label: 'Global Search',       icon: Search,          hash: '#/admin/search' },
  { id: 'admin-config',         label: 'Platform Settings',   icon: Cpu,             hash: '#/admin/config' },
  { id: 'admin-guide',          label: 'Owner Guide',         icon: FileText,        hash: '#/admin/guide' },
]

export const SETTINGS_ITEM: NavItem = {
  id: 'settings',
  label: 'My Settings',
  icon: Settings,
  hash: '#/settings',
}

export type NavVisibility = Record<string, boolean>
