import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useApi } from '../hooks/useApi'
import ThemeSwitcher from './ThemeSwitcher'
import { Settings, Shield, LogOut, Palette, ChevronDown, X, List, Calendar as CalendarIcon, Download } from 'lucide-react'

const UserMenu: React.FC<{ view?: string, setView?: (v: 'list'|'calendar') => void }> = ({ view, setView }) => {
  const { logout, globalRole } = useAuth()
  const { data: profile } = useApi('/api/user/profile')
  const [isOpen, setIsOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [name, setName] = useState('')

  useEffect(() => {
    if (profile) setName(profile.display_name)
  }, [profile])

  if (!profile) return null

  const handleUpdateProfile = async () => {
    await fetch(`${import.meta.env.VITE_API_URL}/api/user/profile`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('ledger_token')}`
      },
      body: JSON.stringify({ display_name: name })
    })
    setShowSettings(false)
    window.location.reload()
  }

  const handleExport = async () => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/export/csv`, {
      headers: { 
        'Authorization': `Bearer ${localStorage.getItem('ledger_token')}`,
        'x-household-id': localStorage.getItem('ledger_household_id') || 'household-abc'
      }
    })
    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ledger-export-${Date.now()}.csv`
    a.click()
  }

  const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${profile.id}`
  const isHome = !window.location.hash || window.location.hash === '#/'

  return (
    <div className="absolute top-0 right-0 z-[2000]">
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
        <span className="text-sm font-semibold text-white ml-1">{profile.display_name || 'User'}</span>
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
                <div className="text-sm text-white font-medium truncate opacity-80">{profile.email}</div>
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
                  onClick={() => { setShowSettings(true); setIsOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-text-main transition-colors text-left"
                  style={{ background: 'none', border: 'none' }}
                >
                  <Settings size={18} className="text-primary" />
                  <span>User Settings</span>
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

                {setView && (
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

                <div className="border-t border-glass-border mt-2 pt-2 px-3 pb-2">
                   <div className="text-[10px] text-secondary uppercase tracking-widest font-bold mb-2">System Actions</div>
                   <button 
                    onClick={() => { handleExport(); setIsOpen(false); }}
                    className="w-full flex items-center gap-3 py-1 rounded-lg hover:text-primary text-xs text-secondary transition-colors text-left"
                    style={{ background: 'none', border: 'none' }}
                   >
                     <Download size={14} />
                     <span>Export Ledger (CSV)</span>
                   </button>
                </div>

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

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-overlay backdrop-blur">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="card max-w-lg w-full p-8 relative shadow-2xl"
              style={{ border: '1px solid var(--primary)' }}
            >
              <button 
                onClick={() => setShowSettings(false)} 
                className="absolute top-4 right-4 text-secondary hover:text-white transition-colors"
                style={{ background: 'none', border: 'none', padding: '0.5rem' }}
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-3 mb-8 border-b border-glass-border pb-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                  <Settings size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight">User Settings</h2>
                  <p className="text-xs text-secondary uppercase tracking-widest">Manage your profile and platform preferences</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-2">Display Name</label>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-3 bg-white/5 border border-glass-border rounded-xl text-white focus:border-primary outline-none transition-all"
                    placeholder="General Kenobi"
                  />
                  <p className="text-[10px] text-secondary mt-2 opacity-60">This is how you will appear across the LEDGER platform.</p>
                </div>

                <div className="pt-4 border-t border-glass-border">
                  <label className="flex items-center gap-2 text-xs font-bold text-secondary uppercase tracking-widest mb-4">
                    <Palette size={14} className="text-primary" />
                    <span>Personalization & Branding</span>
                  </label>
                  <div className="p-4 bg-white/5 rounded-xl border border-glass-border">
                    <ThemeSwitcher />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button className="flex-1" onClick={() => setShowSettings(false)} style={{ background: 'none', border: '1px solid var(--glass-border)' }}>Cancel</button>
                  <button className="primary flex-1" onClick={handleUpdateProfile}>Save Changes</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default UserMenu
