import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useApi } from '../hooks/useApi'
import { Settings, X, Save, ArrowLeft } from 'lucide-react'

const SettingsPage: React.FC = () => {
  const { user, token, logout } = useAuth()
  const { data: profile, mutate } = useApi('/api/user/profile')
  const { data: accounts } = useApi<any[]>('/api/accounts')
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState('')
  const [timezone, setTimezone] = useState('UTC')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile) {
      setName(profile.display_name || '')
      setAvatar(profile.avatar_url || '')
      setTimezone(profile.timezone || 'UTC')
    }
  }, [profile])

  const updateProfile = async () => {
    if (!token) return
    setSaving(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/user/profile`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          display_name: name, 
          avatar_url: avatar || null,
          timezone: timezone
        })
      })
      if (!res.ok) {
        const err = await res.json()
        alert(`Update Failed: ${err.error || 'Unknown error'}`)
        return
      }
      if (mutate) mutate()
      alert('Profile Updated Successfully')
    } catch (e) {
      console.error('[SettingsPage] Update Error:', e)
    } finally {
      setSaving(false)
    }
  }

  const avatarUrl = profile?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${profile?.id || user?.id || 'default'}`

  return (
    <div className="min-h-screen p-8 bg-viewport overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => window.location.hash = '#/'}
              className="p-2 rounded-full hover:bg-white/10 text-secondary hover:text-white transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                <Settings className="text-primary" size={32} />
                User Settings
              </h1>
              <p className="text-secondary uppercase tracking-widest text-[10px] font-bold opacity-60">Manage your identity and account security</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="px-4 py-2 border border-red-500/20 text-red-500 rounded-lg hover:bg-red-500/10 transition-colors text-sm font-bold"
          >
            Sign Out
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Sidebar / Overview */}
          <div className="md:col-span-1 space-y-6">
            <div className="card p-6 flex flex-col items-center text-center space-y-4">
              <div className="relative group">
                <img 
                  src={avatar || avatarUrl} 
                  alt="Profile" 
                  className="w-32 h-32 rounded-full border-4 border-primary/20 shadow-2xl group-hover:border-primary transition-all duration-500"
                />
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                  <span className="text-[10px] font-bold uppercase tracking-widest">Update</span>
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold">{name || 'User'}</h2>
                <p className="text-sm text-secondary truncate">{profile?.email || user?.email}</p>
              </div>
              <div className="w-full pt-4 border-t border-glass-border">
                 <div className="text-[10px] text-primary font-black uppercase tracking-widest mb-2">Account Status</div>
                 <div className="flex items-center justify-center gap-2">
                   <span className="w-2 h-2 bg-primary rounded-full pulse"></span>
                   <span className="text-xs font-bold uppercase">{profile?.status || 'Active'}</span>
                 </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="md:col-span-2 space-y-8">
             {/* Profile Section */}
             <section className="card p-8 space-y-8">
                <div>
                  <h3 className="text-lg font-bold mb-1">Profile Details</h3>
                  <p className="text-xs text-secondary mb-6">These details are personal to you and help identify your activity in households.</p>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-black text-secondary uppercase tracking-widest mb-2">Display Name</label>
                      <input 
                        type="text" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)}
                        className="w-full p-4 bg-white/5 border border-glass-border rounded-xl text-white focus:border-primary outline-none transition-all text-lg font-semibold"
                        placeholder="General Kenobi"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-secondary uppercase tracking-widest mb-2">Profile Avatar</label>
                      <div className="flex flex-wrap gap-3 mb-4">
                        {/* Connected Accounts Icons */}
                        {accounts?.filter(acc => acc.icon).map((acc: any) => (
                          <button 
                            key={acc.id}
                            onClick={() => setAvatar(`https://c.1password.com/richicons/images/login/120/${acc.icon}.png`)}
                            className={`w-12 h-12 rounded-xl border-2 transition-all p-1 bg-white/10 ${avatar.includes(acc.icon) ? 'border-primary shadow-[0_0_20px_rgba(16,185,129,0.3)] scale-110' : 'border-glass-border opacity-50 hover:opacity-100 hover:scale-105'}`}
                            title={`Use ${acc.name} icon`}
                          >
                            <img src={`https://c.1password.com/richicons/images/login/120/${acc.icon}.png`} alt={acc.name} className="w-full h-full rounded-lg" />
                          </button>
                        ))}
                        {/* Default Robot Fallback */}
                        <button 
                          onClick={() => setAvatar('')}
                          className={`w-12 h-12 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${!avatar ? 'border-primary bg-primary/20 text-primary' : 'border-glass-border bg-white/5 text-secondary hover:opacity-100 hover:scale-105'}`}
                          title="Automatic Bot Avatar"
                        >
                          <span className="text-xl">🤖</span>
                          <span className="text-[8px] font-black uppercase">Auto</span>
                        </button>
                      </div>
                      <div className="space-y-4">
              <label className="block text-xs font-bold text-secondary uppercase tracking-widest">Avatar Override (URL)</label>
              <input 
                type="text" 
                value={avatar} 
                onChange={(e) => setAvatar(e.target.value)}
                className="w-full p-4 bg-white/5 border border-glass-border rounded-xl text-sm text-white focus:border-primary outline-none transition-all"
                placeholder="https://example.com/photo.jpg"
              />
              <p className="text-[10px] text-secondary opacity-60">Paste a direct link to any image. We'll automatically resize it for you.</p>
            </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6 pt-6 border-t border-glass-border">
                  <h3 className="text-lg font-bold mb-1">Regional Settings</h3>
                  <p className="text-xs text-secondary mb-6">Configure how dates and times are handled for your schedules.</p>
                  
                  <div>
                    <label className="block text-[10px] font-black text-secondary uppercase tracking-widest mb-2">Primary Timezone</label>
                    <select 
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full p-4 bg-white/5 border border-glass-border rounded-xl text-white focus:border-primary outline-none transition-all font-bold"
                    >
                      {Intl.supportedValuesOf('timeZone').map(tz => (
                        <option key={tz} value={tz}>{tz}</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-secondary opacity-60 mt-2">This ensures your recurring transactions and budget resets happen at the correct local time.</p>
                  </div>
                </div>

                <div className="pt-8 border-t border-glass-border flex justify-end">
                   <button 
                    onClick={updateProfile}
                    disabled={saving}
                    className="primary flex items-center gap-2 px-8 py-3 rounded-xl font-black uppercase tracking-tighter text-sm disabled:opacity-50"
                   >
                     <Save size={18} />
                     {saving ? 'Saving Changes...' : 'Save Profile Changes'}
                   </button>
                </div>
             </section>

             {/* Security Placeholder */}
             <section className="card p-8 opacity-50 cursor-not-allowed grayscale">
                <h3 className="text-lg font-bold mb-1">Security & Authentication</h3>
                <p className="text-xs text-secondary mb-6">Manage Multi-Factor Authentication and linked login methods.</p>
                <div className="p-4 border border-dashed border-glass-border rounded-xl text-center text-xs text-secondary">
                  Security management is being refactored for the v1.17 release.
                </div>
             </section>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
