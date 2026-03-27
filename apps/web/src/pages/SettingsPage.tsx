import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApi } from '../hooks/useApi'
import { ArrowLeft, Settings, Save, Fingerprint, Key, RefreshCw, Edit3, Trash2, ShieldCheck, Lock } from 'lucide-react'
import { MainLayout } from '../components/layout/MainLayout'
import { PrivacySettings } from '../components/PrivacySettings'
import { useToast } from '../context/ToastContext'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { PasswordChecklist } from '../components/PasswordChecklist'

const SettingsPage: React.FC = () => {
  const { user, token } = useAuth()
  const { data: profile, mutate } = useApi('/api/user/profile')
  const { data: accounts } = useApi<any[]>('/api/accounts')
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState('')
  const [timezone, setTimezone] = useState('UTC')
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState<string | null>(null)
  const { showToast } = useToast()
  
  // Password State
  const [newPassword, setNewPassword] = useState('')
  const [changingPass, setChangingPass] = useState(false)

  // Passkey State
  const { data: passkeys, mutate: mutatePasskeys } = useApi<any[]>('/api/admin/passkeys') // Need a user-facing passkey list too
  const [editingPasskey, setEditingPasskey] = useState<any | null>(null)
  const [confirmDeletePasskey, setConfirmDeletePasskey] = useState<any | null>(null)

  useEffect(() => {
    if (profile) {
      setName(profile.display_name || '')
      setAvatar(profile.avatar_url || '')
      setTimezone(profile.timezone || 'UTC')
    }
  }, [profile])

  const { data: identities, mutate: mutateIdentities } = useApi('/api/user/identities')
  const [confirmUnlink, setConfirmUnlink] = useState<any | null>(null)
  const [keepSettingsOnUnlink, setKeepSettingsOnUnlink] = useState(true)

  const handleUnlinkIdentity = async () => {
    if (!confirmUnlink) return
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/user/identities/${confirmUnlink.id}?keep_settings=${keepSettingsOnUnlink}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showToast(`${confirmUnlink.provider} unlinked successfully`, 'success');
        mutateIdentities();
        mutate();
      } else {
        const err = await res.json();
        showToast(err.message || 'Failed to unlink account', 'error');
      }
    } catch (e) {
      showToast('Network error during unlink', 'error');
    } finally {
      setConfirmUnlink(null);
    }
  };

  const handleSyncProfile = async (provider: string, identityId: string) => {
    setSyncing(provider)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/user/profile/sync`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
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

  const handleRegisterPasskey = async () => {
    try {
      // 1. Get Options
      const optRes = await fetch(`${import.meta.env.VITE_API_URL}/ledger/auth/passkeys/register-options`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const options = await optRes.json()
      
      // 2. Client-side WebAuthn (Simplified mock for now as we don't have the library here)
      // In real app, use @simplewebauthn/browser
      const name = prompt('Name this Passkey (e.g. Work Laptop, iPhone):')
      if (!name) return

      const verifyRes = await fetch(`${import.meta.env.VITE_API_URL}/ledger/auth/passkeys/register-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          attestation: { id: 'mock-id', publicKey: 'mock-key', aaguid: '00000000-0000-0000-0000-000000000000' }, 
          challenge: options.challenge, 
          userId: user?.id,
          name 
        })
      })
      
      if (verifyRes.ok) {
        showToast('Passkey registered successfully', 'success')
        mutatePasskeys()
      }
    } catch (e) {
      showToast('Passkey registration failed', 'error')
    }
  }

  const handleRenamePasskey = async () => {
    if (!editingPasskey) return
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/ledger/auth/passkeys/${editingPasskey.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: editingPasskey.newName })
      })
      if (res.ok) {
        showToast('Passkey renamed', 'success')
        mutatePasskeys()
      }
    } finally {
      setEditingPasskey(null)
    }
  }

  const handleRemovePasskey = async () => {
    if (!confirmDeletePasskey) return
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/ledger/auth/passkeys/${confirmDeletePasskey.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        showToast('Passkey removed', 'success')
        mutatePasskeys()
      }
    } finally {
      setConfirmDeletePasskey(null)
    }
  }

  const handleUpdatePassword = async () => {
    setChangingPass(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/ledger/auth/password/change`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ newPassword })
      })
      if (res.ok) {
        showToast('Password updated successfuly', 'success')
        setNewPassword('')
      }
    } finally {
      setChangingPass(false)
    }
  }

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
        showToast(`Update Failed: ${err.error || 'Unknown error'}`, 'error')
        return
      }
      if (mutate) mutate()
      showToast('Profile Updated Successfully', 'success')
    } catch (e) {
      console.error('[SettingsPage] Update Error:', e)
    } finally {
      setSaving(false)
    }
  }

  const avatarUrl = profile?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${profile?.id || user?.id || 'default'}`

  const getProviderIcon = (aaguid: string) => {
    // Simplified mapping
    if (aaguid.includes('icloud')) return <span title="iCloud Keychain">🍏</span>
    if (aaguid.includes('1password')) return <span title="1Password">🗝️</span>
    if (aaguid.includes('google')) return <span title="Google Password Manager">📁</span>
    return <Key size={14} className="text-secondary" />
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto py-12 pb-32">
        <div className="flex items-center justify-between mb-12">
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
                Identity & Security
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary bg-primary/10 px-3 py-1 rounded-full">v2.4.0 Release</span>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-secondary opacity-40">Command Center Alpha</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Profile Control Deck */}
          <div className="lg:col-span-4 space-y-8">
            <div className="card p-8 flex flex-col items-center text-center space-y-6 overflow-hidden reveal">
              <div className="relative group">
                <div className="absolute -inset-4 bg-gradient-to-tr from-primary/20 to-blue-500/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-all duration-700"></div>
                <img 
                  src={avatar || avatarUrl} 
                  alt="Profile" 
                  className="w-40 h-40 rounded-full border-4 border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.5)] group-hover:border-primary transition-all duration-500 relative z-10"
                />
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-black tracking-tight">{name || 'Operative'}</h2>
                <div className="text-[10px] font-black uppercase tracking-widest text-secondary opacity-60 flex items-center justify-center gap-2">
                   <ShieldCheck size={12} className="text-primary" />
                   {profile?.email || user?.email}
                </div>
              </div>
              
              <div className="w-full pt-6 border-t border-white/5 space-y-4">
                 <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                   <span className="text-secondary opacity-40 italic">System Role</span>
                   <span className="text-primary">{profile?.global_role || 'Standard User'}</span>
                 </div>
                 <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="text-secondary opacity-40 italic">Account Status</span>
                    <span className="text-emerald-400">Verified</span>
                 </div>
              </div>
            </div>

            {/* Password Management */}
            <div className="card p-8 space-y-6 border-l-4 border-blue-500/50 reveal delay-100">
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-500">
                    <Lock size={16} />
                  </div>
                  <h3 className="font-bold tracking-tight">Access Control</h3>
               </div>
               
               <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-secondary block">New Secure Password</label>
                    <input 
                      type="password" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/5 p-4 rounded-xl outline-none focus:border-blue-500 transition-all font-mono text-sm"
                      placeholder="••••••••••••"
                    />
                  </div>
                  
                  {newPassword && <PasswordChecklist password={newPassword} />}

                  <button 
                    onClick={handleUpdatePassword}
                    disabled={changingPass || newPassword.length < 8}
                    className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-30 text-white font-black uppercase tracking-[0.2em] text-[10px] py-4 rounded-xl transition-all shadow-lg shadow-blue-500/20"
                  >
                    {changingPass ? 'Updating Hub...' : 'Update Password'}
                  </button>
               </div>
            </div>
          </div>

          {/* Configuration Grid */}
          <div className="lg:col-span-8 space-y-12">
             {/* Identity Ecosystem */}
             <section className="space-y-6">
                <div className="flex items-center justify-between px-2">
                   <div>
                     <h3 className="text-xl font-black italic tracking-tight">Identity Ecosystem</h3>
                     <p className="text-[10px] font-bold text-secondary uppercase tracking-widest opacity-60">Synchronize profile assets and social linking</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {[
                      { id: 'google', name: 'Google Workspace', icon: 'https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png', color: 'bg-white' },
                      { id: 'discord', name: 'Discord Platform', icon: 'https://cdn-icons-png.flaticon.com/512/2111/2111370.png', color: 'bg-[#5865F2]' },
                      { id: 'dropbox', name: 'Dropbox Cloud', icon: 'https://cdn-icons-png.flaticon.com/512/2111/2111381.png', color: 'bg-white' },
                      { id: 'onedrive', name: 'Microsoft 365', icon: 'https://cdn-icons-png.flaticon.com/512/888/888874.png', color: 'bg-white' }
                    ].map(provider => {
                      const linked = (identities || []).find((i: any) => i.provider === provider.id);
                      return (
                        <div key={provider.id} className="card p-6 flex flex-col justify-between space-y-6 group hover:border-primary/40 transition-all reveal">
                           <div className="flex items-start justify-between">
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl p-2 bg-white/5 border border-white/5 flex items-center justify-center`}>
                                   <img src={provider.icon} className="w-full h-full object-contain" alt={provider.name} />
                                </div>
                                <div>
                                   <p className="font-bold text-sm tracking-tight">{provider.name}</p>
                                   <div className="flex items-center gap-2">
                                      <span className={`w-1.5 h-1.5 rounded-full ${linked ? 'bg-primary' : 'bg-slate-500'}`}></span>
                                      <span className="text-[10px] font-black uppercase tracking-widest text-secondary opacity-60">
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
                                    className="flex-1 flex items-center justify-center gap-2 p-3 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest transition-all"
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
                                    const baseApi = import.meta.env.VITE_API_URL.replace(/\/ledger\/?$/, '').replace(/\/$/, '');
                                    window.location.href = `${baseApi}/ledger/auth/login/${provider.id}`;
                                  }}
                                  className="w-full p-3 rounded-lg bg-primary hover:bg-emerald-400 text-black font-black uppercase tracking-widest text-[10px] transition-all"
                                >
                                  Integrate Account
                                </button>
                              )}
                           </div>
                        </div>
                      );
                   })}
                </div>
             </section>

             {/* Biometric Hub */}
             <section className="card p-10 space-y-8 bg-gradient-to-br from-white/5 to-transparent border-t-4 border-primary">
                <div className="flex items-center justify-between">
                   <div className="space-y-1">
                      <h3 className="text-2xl font-black italic tracking-tight">Biometric Vault</h3>
                      <p className="text-[10px] font-bold text-secondary uppercase tracking-[0.2em] opacity-60">Register hardware keys and native auth</p>
                   </div>
                   <button 
                    onClick={handleRegisterPasskey}
                    className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-primary hover:bg-emerald-400 text-black font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-primary/20"
                   >
                     <Fingerprint size={18} />
                     Enroll Passkey
                   </button>
                </div>

                <div className="space-y-3">
                   {passkeys && passkeys.length > 0 ? (
                      passkeys.map((pk: any) => (
                        <div key={pk.id} className="flex items-center justify-between p-6 bg-white/5 border border-white/5 rounded-2xl group hover:border-primary/20 transition-all">
                           <div className="flex items-center gap-5">
                              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-primary border border-white/5">
                                 <Fingerprint size={24} />
                              </div>
                              <div>
                                 <div className="flex items-center gap-3">
                                   <p className="font-bold tracking-tight">{pk.name || 'Unnamed Sentinel'}</p>
                                   <div className="px-2 py-0.5 rounded bg-white/5 border border-white/5 flex items-center gap-1.5 grayscale group-hover:grayscale-0 transition-grayscale">
                                      {getProviderIcon(pk.aaguid)}
                                   </div>
                                 </div>
                                 <p className="text-[10px] font-black uppercase tracking-widest text-secondary opacity-40">Registered {new Date(pk.created_at).toLocaleDateString()}</p>
                              </div>
                           </div>
                           <div className="flex gap-2">
                              <button 
                                onClick={() => setEditingPasskey({ ...pk, newName: pk.name })}
                                className="p-3 rounded-xl hover:bg-white/10 text-secondary hover:text-white transition-all"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button 
                                onClick={() => setConfirmDeletePasskey(pk)}
                                className="p-3 rounded-xl hover:bg-red-500/10 text-secondary hover:text-red-500 transition-all"
                              >
                                <Trash2 size={16} />
                              </button>
                           </div>
                        </div>
                      ))
                   ) : (
                      <div className="p-10 border-2 border-dashed border-white/5 rounded-[3rem] text-center space-y-4 opacity-30 grayscale italic">
                         <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
                            <Fingerprint size={32} />
                         </div>
                         <p className="text-sm font-bold opacity-60 uppercase tracking-[0.2em]">No hardware keys detected in vault</p>
                      </div>
                   )}
                </div>
             </section>

             {/* Profile Preferences */}
             <section className="card p-10 space-y-10 reveal">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                   <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-secondary">Operating Alias</label>
                      <input 
                         type="text" 
                         value={name} 
                         onChange={(e) => setName(e.target.value)}
                         className="w-full p-5 bg-white/5 border border-white/5 rounded-2xl text-xl font-black italic tracking-tighter outline-none focus:border-primary transition-all"
                         placeholder="Alias"
                      />
                   </div>
                   <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-secondary">Timezone Protocol</label>
                      <select 
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full p-5 bg-black border border-white/5 rounded-2xl font-bold text-sm outline-none focus:border-primary transition-all appearance-none"
                      >
                        {Intl.supportedValuesOf('timeZone').map(tz => (
                          <option key={tz} value={tz}>{tz}</option>
                        ))}
                      </select>
                   </div>
                </div>

                <div className="pt-8 border-t border-white/5 flex justify-end">
                   <button 
                    onClick={updateProfile}
                    disabled={saving}
                    className="px-10 py-5 bg-white text-black font-black uppercase tracking-widest text-xs rounded-2xl hover:scale-105 transition-all flex items-center gap-3 shadow-2xl shadow-white/10"
                   >
                     {saving ? <RefreshCw className="animate-spin" /> : <Save size={18} />}
                     {saving ? 'Transmitting...' : 'Commit Preferences'}
                   </button>
                </div>
             </section>
          </div>
        </div>

        {/* MODALS */}
        <Modal 
          isOpen={!!confirmUnlink} 
          onClose={() => setConfirmUnlink(null)}
          title={`Unlink ${confirmUnlink?.provider}?`}
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirmUnlink(null)}>Abort</Button>
              <Button variant="primary" onClick={handleUnlinkIdentity}>Confirm Severance</Button>
            </>
          }
        >
          <div className="space-y-6">
            <p className="text-secondary font-medium tracking-tight">Are you sure you want to decouple this identity provider? Asset synchronization for this account will be terminated.</p>
            
            <label className="flex items-start gap-4 p-4 bg-white/5 border border-white/5 rounded-2xl cursor-pointer hover:bg-white/10 transition-all">
               <input 
                type="checkbox" 
                checked={keepSettingsOnUnlink}
                onChange={(e) => setKeepSettingsOnUnlink(e.target.checked)}
                className="mt-1 accent-primary"
               />
               <div className="space-y-1">
                  <p className="text-sm font-bold tracking-tight text-white">Retain Profile Assets</p>
                  <p className="text-[10px] text-secondary uppercase font-black tracking-widest opacity-60 leading-relaxed">Keep current display name and avatar even after this identity is removed.</p>
               </div>
            </label>
          </div>
        </Modal>

        {/* Rename Passkey Modal */}
        <Modal
          isOpen={!!editingPasskey}
          onClose={() => setEditingPasskey(null)}
          title="Rename Passkey"
          footer={
            <>
              <Button variant="secondary" onClick={() => setEditingPasskey(null)}>Cancel</Button>
              <Button variant="primary" onClick={handleRenamePasskey}>Save Name</Button>
            </>
          }
        >
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-secondary block">New Sentinel Name</label>
            <input 
              type="text" 
              value={editingPasskey?.newName || ''}
              onChange={(e) => setEditingPasskey({ ...editingPasskey, newName: e.target.value })}
              className="w-full bg-white/5 border border-white/5 p-4 rounded-xl outline-none focus:border-primary transition-all font-bold"
              autoFocus
            />
          </div>
        </Modal>

        {/* Delete Passkey Modal */}
        <Modal
          isOpen={!!confirmDeletePasskey}
          onClose={() => setConfirmDeletePasskey(null)}
          title="Remove Passkey?"
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirmDeletePasskey(null)}>Cancel</Button>
              <Button variant="primary" onClick={handleRemovePasskey}>Confirm Removal</Button>
            </>
          }
        >
          <p className="text-secondary font-medium">This will permanently revoke biometric access for <strong>{confirmDeletePasskey?.name}</strong>. You must have another sign-in method active.</p>
        </Modal>

      </div>
    </MainLayout>
  )
}

export default SettingsPage
