import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useApi } from '../hooks/useApi'
import { Settings, Shield, LogOut, Palette, ChevronDown, List, Calendar as CalendarIcon } from 'lucide-react'

const UserMenu: React.FC<{ view?: string, setView?: (v: 'list'|'calendar') => void }> = ({ view, setView }) => {
  const { user, logout, globalRole } = useAuth()
  const { data: profile } = useApi('/api/user/profile')
  const [isOpen, setIsOpen] = useState(false)

  const isHome = !window.location.hash || window.location.hash === '#/'
  const avatarUrl = profile?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${profile?.id || user?.id || 'default'}`

  return (
    <div className="z-[2000] relative">
      {/* Menu Trigger */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 pr-3 rounded-full hover:bg-white/10 transition-all border border-glass-border shadow-2xl"
        style={{ background: isOpen ? 'rgba(255,255,255,0.12)' : 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(10px)' }}
      >
        <img 
          src={avatarUrl} 
          alt="User Avatar" 
          className="w-8 h-8 rounded-full border border-primary shadow-lg"
        />
        <span className="text-sm font-semibold text-white ml-1">{(profile?.display_name || user?.displayName || 'User')}</span>
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
              className="absolute right-0 mt-3 w-64 card overflow-hidden p-2 shadow-2xl"
              style={{ background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(20px)', border: '1px solid var(--primary)' }}
            >
              <div className="px-3 py-2 border-b border-glass-border mb-2">
                <div className="text-[10px] text-primary uppercase tracking-widest font-black mb-1">Authenticated Account</div>
                <div className="text-sm text-white font-medium truncate opacity-80">{profile?.email || user?.email}</div>
              </div>

              <div className="space-y-1">
                {!isHome && (
                  <button 
                    onClick={() => { window.location.hash = '#/'; setIsOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-text-main transition-colors text-left"
                    style={{ background: 'none', border: 'none' }}
                  >
                    <ChevronDown size={18} className="text-primary -rotate-90" />
                    <span>Return to Dashboard</span>
                  </button>
                )}

                <button 
                  onClick={() => { window.location.hash = '#/settings'; setIsOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-text-main transition-colors text-left"
                  style={{ background: 'none', border: 'none' }}
                >
                  <Settings size={18} className="text-primary" />
                  <span>User Settings</span>
                </button>

                <button 
                  onClick={() => { window.location.hash = '#/preferences'; setIsOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-text-main transition-colors text-left"
                  style={{ background: 'none', border: 'none' }}
                >
                  <Palette size={18} className="text-secondary" />
                  <span>Preferences</span>
                </button>

                {globalRole === 'super_admin' && (
                  <button 
                    onClick={() => { window.location.hash = '#/admin'; setIsOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-text-main transition-colors text-left"
                    style={{ background: 'none', border: 'none' }}
                  >
                    <Shield size={18} className="text-indigo-400" />
                    <span>Admin Control Center</span>
                  </button>
                )}

                {setView && isHome && (
                  <div className="px-3 py-2 border-t border-glass-border mt-2">
                    <div className="text-[10px] text-secondary uppercase tracking-widest font-bold mb-2">Dashboard View</div>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => { setView('list'); setIsOpen(false); }}
                        className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs transition-all ${view === 'list' ? 'bg-primary text-white' : 'bg-white/5 text-secondary hover:text-white'}`}
                        style={{ border: 'none' }}
                      >
                        <List size={14} />
                        <span>List</span>
                      </button>
                      <button 
                        onClick={() => { setView('calendar'); setIsOpen(false); }}
                        className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs transition-all ${view === 'calendar' ? 'bg-primary text-white' : 'bg-white/5 text-secondary hover:text-white'}`}
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
                    onClick={logout}
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
