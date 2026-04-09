import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApi } from '../hooks/useApi'
import { ArrowLeft, Settings, Save, Fingerprint, Key, RefreshCw, Edit3, Trash2, ShieldCheck, Lock, Palette, Layout } from 'lucide-react'
import { MainLayout } from '../components/layout/MainLayout'
import { useToast } from '../context/ToastContext'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { PasswordChecklist } from '../components/PasswordChecklist'
import { Price } from '../components/Price'
import HouseholdRegistry from '../components/HouseholdRegistry'
import { PasskeyModule } from '../components/PasskeyModule'
import { TotpModule } from '../components/TotpModule'
import ThemeSwitcher from '../components/ThemeSwitcher'
import { formatHumanError } from '../utils/error-handler'

const rawApiUrl = import.meta.env.VITE_API_URL;
const API_URL = rawApiUrl === 'undefined' || !rawApiUrl ? '' : rawApiUrl;

const SettingsPage: React.FC = () => {
  const { user, token } = useAuth()
  const { data: profile, mutate } = useApi('/api/user/profile')
  const { data: accounts } = useApi('/api/financials/accounts')
  const { data: identities, mutate: mutateIdentities } = useApi('/api/user/identities')

  const [activeTab, setActiveTab] = useState<'security' | 'social' | 'display' | 'data'>('security')

  // Profile Identity State
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [avatar, setAvatar] = useState('')
  const [saving, setSaving] = useState(false)
  
  // UI Display Settings State
  const [timezone, setTimezone] = useState('UTC')
  const settingsJson = JSON.parse(profile?.settings_json || '{}')

  // Modals / Edit Trackers
  const [isEditingAlias, setIsEditingAlias] = useState(false)
  const [isEditingUsername, setIsEditingUsername] = useState(false)
  const [isEditingEmail, setIsEditingEmail] = useState(false)
  const [confirmUnlink, setConfirmUnlink] = useState<any | null>(null)
  const [keepSettingsOnUnlink, setKeepSettingsOnUnlink] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)
  const { showToast } = useToast()
  
  // Password State
  const [newPassword, setNewPassword] = useState('')
  const [changingPass, setChangingPass] = useState(false)

  // Initialization
  useEffect(() => {
    if (profile) {
      setName(profile.display_name || profile.displayName || '')
      setUsername(profile.username || '')
      setEmail(profile.email || '')
      setAvatar(profile.avatar_url || profile.avatarUrl || '')
      setTimezone(profile.timezone || 'UTC')
    }
  }, [profile])

  const avatarUrl = profile?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${profile?.id || user?.id || 'default'}`

  // -------------- HANDLERS --------------

  const updateProfile = async () => {
    if (!token) return
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/api/user/profile`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-household-id': localStorage.getItem('ledger_household_id') || ''
        },
        body: JSON.stringify({ 
          display_name: name,
          username: username,
          email: email,
          avatar_url: avatar || null,
          timezone: timezone
        })
      })
      if (!res.ok) {
        const err = await res.json()
        showToast(formatHumanError(err, 'Update Failed'), 'error')
        return
      }
      if (mutate) mutate()
      showToast('Profile Updated Successfully', 'success')
    } catch (e) {
      console.error('[SettingsPage] Update Error:', e)
      showToast(formatHumanError(e, 'Network error preventing profile save'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const updateSettingsJson = async (newSettings: any) => {
    if (!token) return
    await fetch(`${API_URL}/api/user/profile`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ settings_json: JSON.stringify(newSettings) })
    })
    window.location.reload()
  }

  const handleUpdatePassword = async () => {
    setChangingPass(true)
    try {
      // Fix: Prepend /api to the endpoint path
      const res = await fetch(`${API_URL}/auth/password/change`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}`,
          'x-household-id': localStorage.getItem('ledger_household_id') || ''
        },
        body: JSON.stringify({ newPassword })
      })
      if (res.ok) {
        showToast('Password updated successfuly', 'success')
        
        if ((window as any).PasswordCredential) {
          try {
            const cred = new (window as any).PasswordCredential({
              id: profile?.email || user?.email || '',
              password: newPassword,
              name: profile?.display_name || user?.display_name
            });
            navigator.credentials.store(cred);
          } catch (e) {
            console.warn('[Credential Manager] Update failed:', e);
          }
        }
        setNewPassword('')
      } else {
        const err = await res.json();
        showToast(err.message || 'Failed to update password', 'error');
      }
    } catch (e) {
      showToast('Network error updating password', 'error')
    } finally {
      setChangingPass(false)
    }
  }

  const handleUnlinkIdentity = async () => {
    if (!confirmUnlink) return
    try {
      const res = await fetch(`${API_URL}/api/user/identities/${confirmUnlink.id}?keep_settings=${keepSettingsOnUnlink}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-household-id': localStorage.getItem('ledger_household_id') || ''
        }
      });
      if (res.ok) {
        showToast(`${confirmUnlink.provider} unlinked successfully`, 'success');
        mutateIdentities();
        mutate();
      } else {
        const err = await res.json();
        showToast(formatHumanError(err, 'Failed to unlink account'), 'error');
      }
    } catch (e) {
      console.error(e)
      showToast(formatHumanError(e, 'Network error during unlink'), 'error');
    } finally {
      setConfirmUnlink(null);
    }
  };

  const handleSyncProfile = async (provider: string, identityId: string) => {
    setSyncing(provider)
    try {
      const res = await fetch(`${API_URL}/api/user/profile/sync`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-household-id': localStorage.getItem('ledger_household_id') || ''
        },
        body: JSON.stringify({ provider, identityId })
      })
      if (res.ok) {
        showToast(`Synced with ${provider}`, 'success')
        mutate()
      }
    } finally {
      setSyncing(null)
    }
  }

  // Display Settings Helpers
  const toggleWidget = (widgetId: string) => {
    const layout = settingsJson.dashboard_layout || {}
    const newSettings = {
      ...settingsJson,
      dashboard_layout: {
        ...layout,
        [widgetId]: !layout[widgetId]
      }
    }
    updateSettingsJson(newSettings)
  }

  const setUiStyle = (style: string) => {
    updateSettingsJson({ ...settingsJson, ui_style: style })
  }

  const widgets = [
    { id: 'healthScore', name: 'Financial Insights', desc: 'Health score and spending trends' },
    { id: 'recentTransactions', name: 'Recent Transactions', desc: 'Live feed of your latest activity' },
    { id: 'calendar', name: 'Financial Calendar', desc: 'Monthly view of upcoming bills and income' },
    { id: 'savingsBuckets', name: 'Savings Buckets', desc: 'Progress towards your financial goals' },
    { id: 'smartInsights', name: 'AI Smart Insights', desc: 'Personalized advice from the AI Coach' }
  ]

  // -------------- RENDERERS --------------

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto py-12 pb-32">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => window.location.hash = '#/'}
              className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-secondary hover:text-white hover:bg-white/10 transition-all"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-4xl font-black tracking-tighter italic flex items-center gap-4">
                <Settings className="text-primary" size={36} />
                Identity & Platform Settings
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs font-black uppercase tracking-[0.3em] text-secondary opacity-40">User Configuration Center</span>
              </div>
            </div>
          </div>
        </div>

        {/* 1. Centered Horizontal Identity Card */}
        <div className="card p-8 flex flex-col md:flex-row items-center justify-center md:justify-start text-center md:text-left space-y-6 md:space-y-0 md:space-x-12 overflow-hidden reveal mb-8">
          <div className="relative group shrink-0">
            <div className="absolute -inset-6 bg-gradient-to-tr from-primary/20 to-blue-500/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-all duration-700"></div>
            <img 
              src={avatar || avatarUrl} 
              alt="Profile" 
              className="w-32 h-32 rounded-full border-4 border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.5)] group-hover:border-primary transition-all duration-500 relative z-10"
            />
          </div>
          
          <div className="space-y-4 group min-w-[250px]">
            {isEditingAlias ? (
              <div className="flex gap-2">
                <input 
                  autoFocus
                  className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm font-bold outline-none focus:border-primary w-full"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => { updateProfile(); setIsEditingAlias(false) }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { updateProfile(); setIsEditingAlias(false) } }}
                />
              </div>
            ) : (
              <h2 
                onClick={() => setIsEditingAlias(true)}
                className="text-3xl font-black tracking-tight cursor-pointer hover:text-primary transition-colors flex items-center justify-center md:justify-start gap-2"
              >
                {name || 'User'}
                <Edit3 size={16} className="opacity-0 group-hover:opacity-40" />
              </h2>
            )}
            
            {isEditingUsername ? (
              <input 
                autoFocus
                className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs font-bold outline-none focus:border-primary w-full"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onBlur={() => { updateProfile(); setIsEditingUsername(false); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { updateProfile(); setIsEditingUsername(false); } }}
                placeholder="Username"
              />
            ) : (
              <div className="text-sm font-bold uppercase tracking-widest text-secondary opacity-60 flex items-center justify-center md:justify-start gap-2 cursor-pointer hover:text-primary transition-colors" onClick={() => setIsEditingUsername(true)}>
                 <ShieldCheck size={14} className="text-primary" />
                 {username || profile?.username || '@username'}
              </div>
            )}
            
            {isEditingEmail ? (
              <input 
                className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs font-bold outline-none focus:border-primary w-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => { updateProfile(); setIsEditingEmail(false); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { updateProfile(); setIsEditingEmail(false); } }}
                placeholder="Primary Email"
              />
            ) : (
              <div className="text-sm font-black uppercase tracking-widest text-secondary opacity-60 flex items-center justify-center md:justify-start gap-2 cursor-pointer hover:text-primary transition-colors" onClick={() => setIsEditingEmail(true)}>
                 <Key size={14} className="text-primary" />
                 {email || profile?.email || user?.email}
              </div>
            )}
          </div>
          
          <div className="w-full md:w-auto flex-1 md:border-l border-t md:border-t-0 border-white/5 pt-6 md:pt-0 md:pl-12 flex flex-col justify-center space-y-4 text-left">
             <div className="flex flex-col">
               <span className="text-secondary opacity-40 italic text-[10px] font-black uppercase tracking-[0.2em] mb-1">Account Role</span>
               <span className="text-primary font-black uppercase tracking-widest text-sm">
                 {profile?.globalRole === 'super_admin' ? 'Super Admin' : (profile?.globalRole || 'Standard User')}
               </span>
             </div>
             <div className="flex flex-col mt-4">
                <span className="text-secondary opacity-40 italic text-[10px] font-black uppercase tracking-[0.2em] mb-1">Account Status</span>
                <span className="text-emerald-400 font-bold text-sm tracking-widest uppercase">Verified</span>
             </div>
          </div>
        </div>

        {/* 2. Tabs Navigation */}
        <div className="flex items-center space-x-2 border-b border-white/5 mb-8 pb-4 overflow-x-auto hide-scrollbar">
          {[
            { id: 'security', label: 'Security' },
            { id: 'social', label: 'Social Accounts' },
            { id: 'display', label: 'Display Settings' },
            { id: 'data', label: 'Household & Data' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-primary/10 text-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]' 
                  : 'text-secondary hover:bg-white/5 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 3. Tab Content Rendering */}
        <div className="space-y-12">
          
          {/* TAB: SECURITY */}
          {activeTab === 'security' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 reveal">
              <div className="card p-8 space-y-6 border-l-4 border-blue-500/50">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-500">
                      <Lock size={16} />
                    </div>
                    <h3 className="font-bold tracking-tight">Set Password</h3>
                 </div>
                 
                 <div className="space-y-4">
                    <div className="space-y-2">
                      <Input 
                          label="New Password"
                          type="password" 
                          value={newPassword}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                            if (e.key === 'Enter' && newPassword.length >= 8) handleUpdatePassword()
                          }}
                          autoComplete="new-password"
                          showReveal
                          className="bg-white/5 border-white/5 font-mono text-sm"
                          placeholder="••••••••••••"
                      />
                    </div>
                    
                    {newPassword && <PasswordChecklist password={newPassword} />}

                    <button 
                      onClick={handleUpdatePassword}
                      disabled={changingPass || newPassword.length < 8}
                      className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-30 text-white font-black uppercase tracking-[0.2em] text-xs py-4 rounded-xl transition-all shadow-lg shadow-blue-500/20"
                    >
                      {changingPass ? 'Updating...' : 'Update Password'}
                    </button>
                 </div>
              </div>

              <div>
                <PasskeyModule />
                <TotpModule />
              </div>
            </div>
          )}

          {/* TAB: SOCIAL ACCOUNTS */}
          {activeTab === 'social' && (
             <section className="space-y-6 reveal">
                <div className="flex items-center justify-between px-2">
                   <div>
                     <h3 className="text-xl font-black italic tracking-tight">Social Accounts</h3>
                     <p className="text-xs font-bold text-secondary uppercase tracking-widest opacity-60">Connect and manage your social logins</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {[
                      { id: 'google', name: 'Google', icon: 'https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png', color: 'bg-white' },
                      { id: 'discord', name: 'Discord', icon: 'https://cdn-icons-png.flaticon.com/512/2111/2111370.png', color: 'bg-[#5865F2]' },
                      { id: 'dropbox', name: 'Dropbox', icon: 'https://cdn-icons-png.flaticon.com/512/2111/2111381.png', color: 'bg-white' },
                      { id: 'onedrive', name: 'Onedrive', icon: 'https://cdn-icons-png.flaticon.com/512/873/873136.png', color: 'bg-white' }
                    ].map(provider => {
                      const linked = (identities || []).find((i: any) => i.provider === provider.id);
                      return (
                        <div key={provider.id} className="card p-6 flex flex-col justify-between space-y-6 group hover:border-primary/40 transition-all">
                           <div className="flex items-start justify-between">
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl p-2 bg-white/5 border border-white/5 flex items-center justify-center`}>
                                   <img src={provider.icon} className="w-full h-full object-contain" alt={provider.name} />
                                </div>
                                <div>
                                   <p className="font-bold text-sm tracking-tight">{provider.name}</p>
                                   <div className="flex items-center gap-2">
                                      <span className={`w-1.5 h-1.5 rounded-full ${linked ? 'bg-primary' : 'bg-slate-500'}`}></span>
                                      <span className="text-xs font-black uppercase tracking-widest text-secondary opacity-60">
                                        {linked ? `Connected` : 'Offline'}
                                      </span>
                                   </div>
                                </div>
                              </div>
                           </div>
                           
                           <div className="flex gap-2">
                              {linked ? (
                                <>
                                  <button 
                                    onClick={() => handleSyncProfile(provider.id, linked.id)}
                                    disabled={syncing === provider.id}
                                    className="flex-1 flex items-center justify-center gap-2 p-3 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-black uppercase tracking-widest transition-all"
                                  >
                                    <RefreshCw size={12} className={syncing === provider.id ? 'animate-spin' : ''} />
                                    {syncing === provider.id ? 'Syncing...' : 'Sync Profile'}
                                  </button>
                                  <button 
                                    onClick={() => setConfirmUnlink(linked)}
                                    className="p-3 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 transition-all"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              ) : (
                                <button 
                                  onClick={() => {
                                    const baseApi = import.meta.env.VITE_API_URL.replace(/\/$/, '');
                                    window.location.href = `${baseApi}/auth/login/${provider.id}?auth_token=${token}`;
                                  }}
                                  className="w-full p-3 rounded-lg bg-primary hover:bg-emerald-400 text-black font-black uppercase tracking-widest text-xs transition-all"
                                >
                                  Link Account
                                </button>
                              )}
                           </div>
                        </div>
                      );
                   })}
                </div>
             </section>
          )}

          {/* TAB: DISPLAY SETTINGS */}
          {activeTab === 'display' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 reveal">
              <div className="space-y-8">
                <section className="card p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <Palette size={20} className="text-primary" />
                    <h3 className="text-lg font-bold">Theme & Branding</h3>
                  </div>
                  <p className="text-sm text-secondary mb-6">Select a color palette that suits your style. This synchronizes across all your devices.</p>
                  <ThemeSwitcher />
                </section>

                <section className="card p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <Layout size={20} className="text-primary" />
                    <h3 className="text-lg font-bold">Interface Style</h3>
                  </div>
                  <p className="text-sm text-secondary mb-6">Choose the visual aesthetic of the platform's components.</p>
                  <div className="grid grid-cols-3 gap-3">
                    {['default', 'glass', 'minimal'].map(style => (
                      <button 
                        key={style}
                        onClick={() => setUiStyle(style)}
                        className={`p-3 rounded-xl border-2 transition-all text-xs font-black uppercase tracking-widest ${settingsJson.ui_style === style ? 'border-primary bg-primary/10 text-primary' : 'border-glass-border bg-white/5 text-secondary hover:border-white/20'}`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </section>

                <section className="card p-8">
                   <div className="space-y-4">
                      <label className="flex items-center gap-3 text-lg font-bold">Timezone Display</label>
                      <p className="text-sm text-secondary mb-4">Set your primary organizational timezone.</p>
                      <select 
                        value={timezone}
                        onChange={(e) => {
                          setTimezone(e.target.value)
                          // Optionally autosave timezone locally or wait for universal save button
                        }}
                        onBlur={updateProfile}
                        className="w-full p-4 bg-black border border-white/5 rounded-2xl font-bold text-sm outline-none focus:border-primary transition-all appearance-none cursor-pointer"
                      >
                        {Intl.supportedValuesOf('timeZone').map(tz => (
                          <option key={tz} value={tz}>{tz}</option>
                        ))}
                      </select>
                   </div>
                </section>
              </div>

              <div className="space-y-8">
                <section className="card p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <Palette size={20} className="text-primary" />
                    <h3 className="text-lg font-bold">Currency Configuration</h3>
                  </div>
                  <p className="text-sm text-secondary mb-6">Choose your primary display currency.</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'USD', name: 'US Dollar ($)' },
                      { id: 'EUR', name: 'Euro (€)' },
                      { id: 'GBP', name: 'British Pound (£)' }
                    ].map(c => (
                      <button 
                        key={c.id}
                        onClick={() => updateSettingsJson({ ...settingsJson, currency: c.id })}
                        className={`p-3 rounded-xl border-2 transition-all text-xs font-black uppercase tracking-widest ${settingsJson.currency === c.id || (!settingsJson.currency && c.id === 'USD') ? 'border-primary bg-primary/10 text-primary' : 'border-glass-border bg-white/5 text-secondary hover:border-white/20'}`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </section>

                <section className="card p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <Layout size={20} className="text-secondary" />
                    <h3 className="text-lg font-bold">Dashboard Layout</h3>
                  </div>
                  <p className="text-sm text-secondary mb-6">Toggle which features are visible on your command center.</p>
                  <div className="space-y-3">
                    {widgets.map(w => (
                      <div 
                        key={w.id} 
                        onClick={() => toggleWidget(w.id)}
                        className="flex items-center justify-between p-4 bg-white/5 border border-glass-border rounded-2xl cursor-pointer hover:bg-white/10 transition-all"
                      >
                        <div>
                          <div className="text-sm font-bold">{w.name}</div>
                          <div className="text-xs text-secondary">{w.desc}</div>
                        </div>
                        <div className={`w-10 h-6 rounded-full transition-all relative ${settingsJson.dashboard_layout?.[w.id] !== false ? 'bg-primary' : 'bg-white/10'}`}>
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settingsJson.dashboard_layout?.[w.id] !== false ? 'right-1' : 'left-1'}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* TAB: DATA & HOUSEHOLD */}
          {activeTab === 'data' && (
            <div className="space-y-12 reveal">
              <section className="space-y-6">
                  <div className="px-2">
                    <h3 className="text-xl font-black italic tracking-tight">Financial Links</h3>
                    <p className="text-xs font-bold text-secondary uppercase tracking-[0.2em] opacity-60">Connected data sources and accounts</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Array.isArray(accounts) ? accounts.map((acc: any) => (
                        <div key={acc.id} className="card p-6 flex justify-between items-center border-l-4 border-emerald-500/30">
                          <div className="flex items-center gap-4">
                              <div className="text-xl">💳</div>
                              <div>
                                <p className="font-bold text-sm tracking-tight">{acc.name}</p>
                                <p className="text-xs font-black uppercase tracking-widest text-secondary opacity-40">Active Account</p>
                              </div>
                          </div>
                          <Price amountCents={acc.balance_cents} className="text-lg font-black tracking-tighter" />
                        </div>
                    )) : (
                        <div className="col-span-full p-10 border-2 border-dashed border-white/5 rounded-3xl text-center opacity-30 grayscale italic">
                          <p className="text-sm font-bold uppercase tracking-widest">No active financial links detected</p>
                        </div>
                    )}
                  </div>
              </section>
              
              <section className="space-y-6">
                  <div className="px-2">
                    <h3 className="text-xl font-black italic tracking-tight">Household Management</h3>
                    <p className="text-xs font-bold text-secondary uppercase tracking-[0.2em] opacity-60">Manage household members and access</p>
                  </div>
                  <HouseholdRegistry />
              </section>
            </div>
          )}
        </div>

        {/* MODALS */}
        <Modal 
          isOpen={!!confirmUnlink} 
          onClose={() => setConfirmUnlink(null)}
          title={`Unlink ${confirmUnlink?.provider}?`}
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirmUnlink(null)}>Cancel</Button>
              <Button variant="primary" onClick={handleUnlinkIdentity}>Confirm Disconnect</Button>
            </>
          }
        >
          <div className="space-y-6">
            <p className="text-secondary font-medium tracking-tight">Are you sure you want to disconnect this account? Syncing for this account will be terminated.</p>
            
            <label className="flex items-start gap-4 p-4 bg-white/5 border border-white/5 rounded-2xl cursor-pointer hover:bg-white/10 transition-all">
               <input 
                type="checkbox" 
                checked={keepSettingsOnUnlink}
                onChange={(e) => setKeepSettingsOnUnlink(e.target.checked)}
                className="mt-1 accent-primary"
               />
               <div className="space-y-1">
                  <p className="text-sm font-bold tracking-tight text-white">Retain Profile Assets</p>
                  <p className="text-xs text-secondary uppercase font-black tracking-widest opacity-60 leading-relaxed">Keep current display name and avatar even after this identity is removed.</p>
               </div>
            </label>
          </div>
        </Modal>

      </div>
    </MainLayout>
  )
}

export default SettingsPage
