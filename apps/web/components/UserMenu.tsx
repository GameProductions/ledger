import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useApi } from '../hooks/useApi'
import { Settings, Shield, LogOut, Palette, ChevronDown, List, Calendar as CalendarIcon, HelpCircle, Cpu, Database, Users, Activity, LayoutDashboard, CreditCard, MessageSquare, HandCoins, Briefcase, Megaphone } from 'lucide-react'
import { Masked } from './ui/Masked'
import { sanitizeImageUrl } from '../utils/security'


const UserMenu: React.FC<{ 
  view?: string, 
  setView?: (v: 'list'|'calendar') => void,
  isAdminPortal?: boolean 
}> = ({ view, setView, isAdminPortal = false }) => {
  const { user, logout, globalRole, isImpersonating } = useAuth() as any
  const { data: profile } = useApi('/api/user/profile')
  const [isOpen, setIsOpen] = useState(false)

  const isHome = !window.location.hash || window.location.hash === '#/'
  const avatarUrl = sanitizeImageUrl(profile?.avatar_url) || `https://api.dicebear.com/7.x/bottts/svg?seed=${profile?.id || user?.id || 'default'}`

  const menuItems = isAdminPortal ? [
    { icon: LayoutDashboard, label: 'God Mode Dashboard', hash: '#/admin/dashboard', color: 'text-emerald-500' },
    { icon: Cpu, label: 'System Configuration', hash: '#/admin/config', color: 'text-blue-400' },
    { icon: Database, label: 'Master Registry', hash: '#/admin/registry', color: 'text-orange-400' },
    { icon: Users, label: 'User Directory', hash: '#/admin/users', color: 'text-primary' },
    { icon: Megaphone, label: 'Global Broadcast', hash: '#/admin/broadcast', color: 'text-rose-500' },
    { icon: Activity, label: 'Safety Vault', hash: '#/admin/audit', color: 'text-secondary' },
    { icon: Shield, label: 'God Mode Portal', hash: '#/admin/entities', color: 'text-amber-500' },
  ] : [
    { icon: Settings, label: 'My Settings', hash: '#/settings', color: 'text-primary' },
    { icon: CreditCard, label: 'Payment Central', hash: '#/payments', color: 'text-amber-500' },
    { icon: HandCoins, label: 'Loan Manager', hash: '#/loans', color: 'text-orange-400' },
    { icon: Briefcase, label: 'Investments', hash: '#/investments', color: 'text-indigo-400' },
    { icon: Database, label: 'Data Center', hash: '#/data', color: 'text-emerald-500' },
    { icon: List, label: 'Data Manager', hash: '#/manage', color: 'text-cyan-400' },
    { icon: HelpCircle, label: 'Help & Guides', hash: '#/help', color: 'text-blue-400' },
    { icon: MessageSquare, label: 'High-Priority Support', hash: '#/help/support', color: 'text-primary' },
  ]

  return (
    <div className="z-[2000] relative flex items-center">
      {/* Menu Trigger */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 pr-3 rounded-full hover:bg-white/10 transition-all border border-glass-border shadow-2xl"
        style={{ background: isOpen ? 'rgba(255,255,255,0.12)' : 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(10px)' }}
      >
        <div className="relative">
          <img 
            src={avatarUrl} 
            alt="User Avatar" 
            className="w-8 h-8 rounded-full border border-primary shadow-lg"
          />
          {isImpersonating && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-purple-500 border border-black flex items-center justify-center">
              <Shield size={8} className="text-white" />
            </div>
          )}
        </div>
        <div className="flex flex-col items-start ml-1 leading-none text-left">
          <Masked>
            <span className="text-sm font-bold text-white">{(profile?.display_name || user?.displayName || 'User')}</span>
          </Masked>
          {isAdminPortal ? (
            <span className="text-xs text-emerald-500 font-black uppercase tracking-tighter">God Mode</span>
          ) : isImpersonating ? (
            <span className="text-[10px] text-purple-400 font-black uppercase tracking-tighter">Impersonating</span>
          ) : null}
        </div>
        <ChevronDown size={14} className={`text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-[-1]" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="absolute top-full right-0 mt-3 w-64 card overflow-hidden p-2 shadow-2xl z-[2001]"
              style={{ background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(20px)', border: '1px solid var(--primary)' }}
            >
              <div className="px-3 py-2 border-b border-glass-border mb-2">
                <div className="text-xs text-primary uppercase tracking-widest font-black mb-1">
                  {isAdminPortal ? 'Super Admin Portal' : isImpersonating ? 'Mirrored Identity' : 'Account'}
                </div>
                <Masked>
                  <div className="text-sm text-white font-medium truncate opacity-80">{profile?.email || user?.email}</div>
                </Masked>
              </div>

              <div className="space-y-1">
                {isAdminPortal ? (
                  <button 
                    onClick={() => { window.location.hash = '#/'; setIsOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-emerald-400 transition-colors text-left"
                    style={{ background: 'none', border: 'none' }}
                  >
                    <LayoutDashboard size={18} className="text-emerald-500" />
                    <span>Exit God Mode</span>
                  </button>
                ) : (
                  !isHome && (
                    <button 
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
                    onClick={() => { window.location.hash = item.hash; setIsOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-text-main transition-colors text-left group"
                    style={{ background: 'none', border: 'none' }}
                  >
                    <item.icon size={18} className={item.color} />
                    <span>{item.label}</span>
                  </button>
                ))}

                {!isAdminPortal && (globalRole === 'super_admin' || profile?.global_role === 'super_admin') && (
                  <button 
                    onClick={() => { window.location.hash = '#/admin/dashboard'; setIsOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-emerald-500/10 text-sm text-text-main transition-colors text-left group"
                    style={{ background: 'none', border: 'none' }}
                  >
                    <Shield size={18} className="text-emerald-500 group-hover:animate-pulse" />
                    <span className="group-hover:text-emerald-400 transition-colors">God Mode</span>
                  </button>
                )}

                {!isAdminPortal && setView && isHome && (
                  <div className="px-3 py-2 border-t border-glass-border mt-2">
                    <div className="text-xs text-secondary uppercase tracking-widest font-bold mb-2">Dashboard View</div>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => { setView('list'); setIsOpen(false); }}
                        className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-all ${view === 'list' ? 'bg-primary text-white' : 'bg-white/5 text-secondary hover:text-white'}`}
                        style={{ border: 'none' }}
                      >
                        <List size={14} />
                        <span>List</span>
                      </button>
                      <button 
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
    </div>
  )
}

export default UserMenu
