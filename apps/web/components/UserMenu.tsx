import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useAuth } from '../context/AuthContext'
import { useApi } from '../hooks/useApi'
import { Settings, Shield, LogOut, Palette, ChevronDown, List, Calendar as CalendarIcon, HelpCircle, Cpu, Database, Users, Activity, LayoutDashboard, CreditCard, MessageSquare, HandCoins, Briefcase, Megaphone, GitMerge } from 'lucide-react'
import { Masked } from './ui/Masked'
import { sanitizeImageUrl } from '../utils/security'


const UserMenu: React.FC<{ 
  view?: string, 
  setView?: (v: 'list'|'calendar') => void,
  isAdminPortal?: boolean 
}> = ({ view, setView, isAdminPortal = false }) => {
  const { user, logout, globalRole, isImpersonating } = useAuth() as any
  const { data: profile } = (useApi('/api/user/profile') as any)
  const [isOpen, setIsOpen] = useState(false)
  const reduced = useReducedMotion()

  const isHome = !window.location.hash || window.location.hash === '#/'
  const displayName = profile?.displayName || user?.displayName || profile?.username || user?.username || 'User'
  const avatarUrl = sanitizeImageUrl(profile?.avatarUrl || user?.avatarUrl)
  const initials = displayName.split(' ').map((s: string) => s[0]).join('').slice(0, 2).toUpperCase()
  const role = profile?.globalRole || user?.globalRole || globalRole || 'user'

  const getRoleBadgeStyles = (r: string) => {
    switch (r?.toLowerCase()) {
      case 'owner':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 'admin':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      case 'user':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
    }
  }

  const menuItems = isAdminPortal ? [
    { icon: LayoutDashboard, label: 'Owner Dashboard', hash: '#/admin/dashboard', color: 'text-emerald-500' },
    { icon: Cpu, label: 'System Configuration', hash: '#/admin/config', color: 'text-blue-400' },
    { icon: Database, label: 'Master Registry', hash: '#/admin/registry', color: 'text-orange-400' },
    { icon: Users, label: 'User Directory', hash: '#/admin/users', color: 'text-primary' },
    { icon: Megaphone, label: 'Global Broadcast', hash: '#/admin/broadcast', color: 'text-rose-500' },
    { icon: Activity, label: 'Safety Vault', hash: '#/admin/audit', color: 'text-secondary' },
    { icon: Shield, label: 'Owner Portal', hash: '#/admin/entities', color: 'text-amber-500' },
  ] : [
    { icon: Settings, label: 'My Settings', hash: '#/settings', color: 'text-primary' },
    { icon: CreditCard, label: 'Payment Central', hash: '#/payments', color: 'text-amber-500' },
    { icon: HandCoins, label: 'Loan Manager', hash: '#/loans', color: 'text-orange-400' },
    { icon: Briefcase, label: 'Investments', hash: '#/investments', color: 'text-indigo-400' },
    { icon: Database, label: 'Data Center', hash: '#/data', color: 'text-emerald-500' },
    { icon: List, label: 'Data Manager', hash: '#/manage', color: 'text-cyan-400' },
    { icon: GitMerge, label: 'Smart Reconciliation', hash: '#/reconcile', color: 'text-primary' },
    { icon: HelpCircle, label: 'Help & Guides', hash: '#/help', color: 'text-blue-400' },
    { icon: MessageSquare, label: 'High-Priority Support', hash: '#/help/support', color: 'text-primary' },
  ]

  return (
    <div className="z-[2000] relative flex items-center">
      {/* Menu Trigger */}
      <button 
        onClick={() => setIsOpen(!isOpen)} aria-expanded={isOpen} aria-haspopup="true"
        className="flex items-center gap-2 p-1 pr-3 rounded-full hover:bg-white/10 transition-all border border-glass-border shadow-2xl"
        style={{ background: isOpen ? 'rgba(255,255,255,0.12)' : 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(10px)' }}
      >
        <div className="relative">
          {avatarUrl ? (
            <img 
              src={avatarUrl} 
              alt="User Avatar" 
              className="w-8 h-8 rounded-full border border-primary shadow-lg"
            />
          ) : (
            <div className="w-8 h-8 rounded-full border border-primary shadow-lg bg-gradient-to-br from-primary/40 to-blue-500/40 flex items-center justify-center text-[11px] font-black text-white select-none">
              {initials}
            </div>
          )}
          {isImpersonating && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-purple-500 border border-black flex items-center justify-center">
              <Shield size={8} className="text-white" />
            </div>
          )}
        </div>
        <div className="flex flex-col items-start ml-1 leading-none text-left">
          <Masked>
            <span className="text-sm font-bold text-white">{displayName}</span>
          </Masked>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${getRoleBadgeStyles(role)}`}>
              {role}
            </span>
            {isImpersonating && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border bg-purple-500/10 text-purple-400 border-purple-500/20">
                Impersonated
              </span>
            )}
          </div>
        </div>
        <ChevronDown size={14} className={`text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {reduced ? (
        isOpen && (
          <>
            <div className="fixed inset-0 z-[-1]" onClick={() => setIsOpen(false)} />
            <div
              role="menu"
              className="!absolute top-full right-0 mt-3 w-64 card overflow-y-auto max-h-[calc(100vh-100px)] p-2 shadow-2xl z-[2001] overflow-list"
              style={{ background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(20px)', border: '1px solid var(--primary)' }}
            >
              <div className="px-3 py-2 border-b border-glass-border mb-2">
                <div className="min-w-0">
                  <div className="text-xs text-primary uppercase tracking-widest font-black mb-1">
                    {isAdminPortal ? 'Owner Portal' : isImpersonating ? 'Mirrored Identity' : 'Account'}
                  </div>
                  <Masked>
                    <div className="text-sm text-white font-medium truncate opacity-80">{profile?.email || user?.email}</div>
                  </Masked>
                </div>
              </div>

              <div className="space-y-1">
                {isAdminPortal ? (
                  <button 
                    role="menuitem"
                    onClick={() => { window.location.hash = '#/'; setIsOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-emerald-400 transition-colors text-left"
                    style={{ background: 'none', border: 'none' }}
                  >
                    <LayoutDashboard size={18} className="text-emerald-500" />
                    <span>Exit Owner</span>
                  </button>
                ) : (
                  !isHome && (
                    <button 
                      onClick={() => { window.location.hash = '#/'; setIsOpen(false); }}
                      role="menuitem"
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-text-main transition-colors text-left"
                      style={{ background: 'none', border: 'none' }}
                    >
                      <LayoutDashboard size={18} className="text-primary" />
                      <span>Return to Dashboard</span>
                    </button>
                  )
                )}

                {menuItems.map((item) => (
                  <button 
                    key={item.hash}
                    role="menuitem"
                    onClick={() => { window.location.hash = item.hash; setIsOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-text-main transition-colors text-left group"
                    style={{ background: 'none', border: 'none' }}
                  >
                    <item.icon size={18} className={item.color} />
                    <span>{item.label}</span>
                  </button>
                ))}
                
                {!isAdminPortal && (globalRole === 'owner' || profile?.globalRole === 'owner') && (
                  <button 
                    role="menuitem"
                    onClick={() => { window.location.hash = '#/admin/dashboard'; setIsOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-emerald-500/10 text-sm text-text-main transition-colors text-left group"
                    style={{ background: 'none', border: 'none' }}
                  >
                    <Shield size={18} className="text-emerald-500 group-hover:animate-pulse" />
                    <span className="group-hover:text-emerald-400 transition-colors">Owner</span>
                  </button>
                )}

                {!isAdminPortal && setView && isHome && (
                  <div className="px-3 py-2 border-t border-glass-border mt-2">
                    <div className="text-xs text-secondary uppercase tracking-widest font-bold mb-2">Dashboard View</div>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        role="menuitem"
                        onClick={() => { setView('list'); setIsOpen(false); }}
                        className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-all ${view === 'list' ? 'bg-primary text-white' : 'bg-white/5 text-secondary hover:text-white'}`}
                        style={{ border: 'none' }}
                      >
                        <List size={14} />
                        <span>List</span>
                      </button>
                      <button 
                        role="menuitem"
                        onClick={() => { setView('calendar'); setIsOpen(false); }}
                        className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-all ${view === 'calendar' ? 'bg-primary text-white' : 'bg-white/5 text-secondary hover:text-white'}`}
                        style={{ border: 'none' }}
                      >
                        <CalendarIcon size={14} />
                        <span>Calendar</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
                  </div>
                )}

                <div className="border-t border-glass-border mt-2 pt-1">
                  <button 
                    role="menuitem"
                    onClick={(e) => { e.stopPropagation(); logout(); setIsOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-500/10 text-sm text-red-400 transition-colors text-left"
                    style={{ background: 'none', border: 'none' }}
                  >
                    <LogOut size={18} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          </>
        )
      ) : (
        <AnimatePresence>
          {isOpen && (
            <>
              <div className="fixed inset-0 z-[-1]" onClick={() => setIsOpen(false)} />
              <motion.div
                role="menu"
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="!absolute top-full right-0 mt-3 w-64 card overflow-y-auto max-h-[calc(100vh-100px)] p-2 shadow-2xl z-[2001] overflow-list"
                style={{ background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(20px)', border: '1px solid var(--primary)' }}
              >
                <div className="px-3 py-2 border-b border-glass-border mb-2">
                  <div className="min-w-0">
                    <div className="text-xs text-primary uppercase tracking-widest font-black mb-1">
                      {isAdminPortal ? 'Owner Portal' : isImpersonating ? 'Mirrored Identity' : 'Account'}
                    </div>
                    <Masked>
                      <div className="text-sm text-white font-medium truncate opacity-80">{profile?.email || user?.email}</div>
                    </Masked>
                  </div>
                </div>

                <div className="space-y-1">
                  {isAdminPortal ? (
                    <button 
                      role="menuitem"
                      onClick={() => { window.location.hash = '#/'; setIsOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-emerald-400 transition-colors text-left"
                      style={{ background: 'none', border: 'none' }}
                    >
                      <LayoutDashboard size={18} className="text-emerald-500" />
                      <span>Exit Owner</span>
                    </button>
                  ) : (
                    !isHome && (
                      <button 
                        role="menuitem"
                        onClick={() => { window.location.hash = '#/'; setIsOpen(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-text-main transition-colors text-left"
                        style={{ background: 'none', border: 'none' }}
                      >
                        <LayoutDashboard size={18} className="text-primary" />
                        <span>Return to Dashboard</span>
                      </button>
                    )
                  )}

                  {menuItems.map((item) => (
                    <button 
                      key={item.hash}
                      role="menuitem"
                      onClick={() => { window.location.hash = item.hash; setIsOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-text-main transition-colors text-left group"
                      style={{ background: 'none', border: 'none' }}
                    >
                      <item.icon size={18} className={item.color} />
                      <span>{item.label}</span>
                    </button>
                  ))}
                  {!isAdminPortal && (globalRole === 'owner' || profile?.globalRole === 'owner') && (
                    <button 
                      role="menuitem"
                      onClick={() => { window.location.hash = '#/admin/dashboard'; setIsOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-emerald-500/10 text-sm text-text-main transition-colors text-left group"
                      style={{ background: 'none', border: 'none' }}
                    >
                      <Shield size={18} className="text-emerald-500 group-hover:animate-pulse" />
                      <span className="group-hover:text-emerald-400 transition-colors">Owner</span>
                    </button>
                  )}

                    {!isAdminPortal && setView && isHome && (
                    <div className="px-3 py-2 border-t border-glass-border mt-2">
                      <div className="text-xs text-secondary uppercase tracking-widest font-bold mb-2">Dashboard View</div>
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          role="menuitem"
                          onClick={() => { setView('list'); setIsOpen(false); }}
                          className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-all ${view === 'list' ? 'bg-primary text-white' : 'bg-white/5 text-secondary hover:text-white'}`}
                          style={{ border: 'none' }}
                        >
                          <List size={14} />
                          <span>List</span>
                        </button>
                        <button 
                          role="menuitem"
                          onClick={() => { setView('calendar'); setIsOpen(false); }}
                          className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-all ${view === 'calendar' ? 'bg-primary text-white' : 'bg-white/5 text-secondary hover:text-white'}`}
                          style={{ border: 'none' }}
                        >
                          <CalendarIcon size={14} />
                          <span>Calendar</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="border-t border-glass-border mt-2 pt-1">
                    <button 
                      role="menuitem"
                      onClick={(e) => { e.stopPropagation(); logout(); setIsOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-500/10 text-sm text-red-400 transition-colors text-left"
                      style={{ background: 'none', border: 'none' }}
                    >
                      <LogOut size={18} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      )}
    </div>
  )
}

export default UserMenu
