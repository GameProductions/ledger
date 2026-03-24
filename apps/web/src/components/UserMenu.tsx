import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, Shield, LogOut, Palette, ChevronDown } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useApi } from '../hooks/useApi'
import ThemeSwitcher from './ThemeSwitcher'

const UserMenu: React.FC = () => {
  const { logout, globalRole } = useAuth()
  const { data: profile } = useApi('/api/user/profile')
  const [isOpen, setIsOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  if (!profile) return null

  const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${profile.id}`

  return (
    <div className="relative">
      {/* Menu Trigger */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 pr-3 rounded-full hover:bg-white/5 transition-all border border-glass-border"
        style={{ background: isOpen ? 'rgba(255,255,255,0.08)' : 'transparent' }}
      >
        <img 
          src={avatarUrl} 
          alt="User Avatar" 
          className="w-8 h-8 rounded-full border border-primary shadow-lg"
        />
        <span className="text-sm font-semibold text-white ml-1">{profile.display_name || 'User'}</span>
        <ChevronDown size={14} className={`text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-[1000]" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-3 w-64 card z-[1001] overflow-hidden p-2"
              style={{ background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(20px)' }}
            >
              <div className="px-3 py-2 border-b border-glass-border mb-2">
                <div className="text-xs text-secondary uppercase tracking-widest font-bold">Account</div>
                <div className="text-sm text-white font-medium truncate">{profile.email}</div>
              </div>

              <div className="space-y-1">
                <button 
                  onClick={() => { setShowSettings(true); setIsOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-text-main transition-colors text-left"
                >
                  <Settings size={18} className="text-primary" />
                  <span>User Settings</span>
                </button>

                {globalRole === 'super_admin' && (
                  <button 
                    onClick={() => { window.location.hash = '#/admin'; setIsOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-text-main transition-colors text-left"
                  >
                    <Shield size={18} className="text-indigo-400" />
                    <span>Admin Console</span>
                  </button>
                )}

                <div className="px-3 py-2 border-t border-glass-border mt-2 mb-1">
                  <div className="flex items-center gap-2 text-xs text-secondary uppercase tracking-widest font-bold mb-3">
                    <Palette size={14} />
                    <span>Personalization</span>
                  </div>
                  <ThemeSwitcher />
                </div>

                <div className="border-t border-glass-border mt-2 pt-1">
                  <button 
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-500/10 text-sm text-red-400 transition-colors text-left"
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

      {/* Settings Modal (Placeholder for now) */}
      {showSettings && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-overlay backdrop-blur">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="card max-w-lg w-full p-6 relative"
          >
            <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 text-secondary hover:text-white">✕</button>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Settings className="text-primary" />
              Settings
            </h2>
            <div className="space-y-4">
               <div>
                 <label className="block text-sm text-secondary mb-2">Display Name</label>
                 <input 
                  type="text" 
                  defaultValue={profile.display_name} 
                  className="w-full p-2 bg-white/5 border border-glass-border rounded-lg text-white"
                  placeholder="Your Name"
                 />
               </div>
               {/* Add more settings here */}
               <button className="primary w-full mt-4" onClick={() => setShowSettings(false)}>Close</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default UserMenu
