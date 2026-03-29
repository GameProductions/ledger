import React, { useState, useEffect } from 'react';
import PCCPortal from './PCCPortal';
import { MoreHorizontal, Shield, Trash2, GitMerge, Info, Activity, Lock, Globe, ExternalLink, X, Search, Fingerprint, RefreshCw, Edit3, Terminal, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../context/ToastContext';

// --- SUB-COMPONENT: User Details Modal ---
const UserDetailsModal: React.FC<{ userId: string; onClose: () => void; onMerge: (id: string) => void }> = ({ userId, onClose, onMerge }) => {
  const { showToast } = useToast();
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [manualPass, setManualPass] = useState('');
  const [isTemp, setIsTemp] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [editingPk, setEditingPk] = useState<any | null>(null);
  const [removingPk, setRemovingPk] = useState<any | null>(null);

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let password = "";
    for (let i = 0; i < 16; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setManualPass(password);
    setShowPass(true);
  };

  const fetchDetails = async () => {
    try {
      const token = localStorage.getItem('ledger_token');
      const apiUrl = import.meta.env.VITE_API_URL;
      const res = await fetch(`${apiUrl}/api/pcc/admin/users/${userId}/details`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setDetails(data);
    } catch (err) {
      console.error('Failed to fetch user details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [userId]);

  const handleAdminResetPassword = async () => {
    if (!manualPass) return;
    setResetting(true);
    try {
      const token = localStorage.getItem('ledger_token');
      const apiUrl = import.meta.env.VITE_API_URL;
      await fetch(`${apiUrl}/api/pcc/admin/users/${userId}/password/reset`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: manualPass, isTemporary: isTemp })
      });
      showToast('Password reset successfully', 'success');
      setManualPass('');
      fetchDetails();
    } finally {
      setResetting(false);
    }
  };

  const handleAdminRenamePasskey = async () => {
    if (!editingPk) return;
    const { id, newName } = editingPk;
    const token = localStorage.getItem('ledger_token');
    const apiUrl = import.meta.env.VITE_API_URL;
    try {
      await fetch(`${apiUrl}/api/pcc/admin/users/${userId}/passkeys/${id}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });
      showToast('Passkey renamed', 'success');
      fetchDetails();
    } finally {
      setEditingPk(null);
    }
  };

  const handleAdminRemovePasskey = async () => {
    if (!removingPk) return;
    const token = localStorage.getItem('ledger_token');
    const apiUrl = import.meta.env.VITE_API_URL;
    try {
      await fetch(`${apiUrl}/api/pcc/admin/users/${userId}/passkeys/${removingPk.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      showToast('Passkey removed', 'success');
      fetchDetails();
    } finally {
      setRemovingPk(null);
    }
  };

  if (loading) return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="animate-pulse text-emerald-500 font-black tracking-widest text-sm uppercase">Loading User Details...</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 lg:p-12 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-5xl bg-[#0d0d0d] border border-white/10 rounded-[2rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden"
      >
        {/* Header */}
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 via-transparent to-blue-500/10">
          <div className="flex items-center gap-6">
            <div className="relative">
               <img 
                 src={details?.profile?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${details?.profile?.id || userId}`} 
                 className="w-24 h-24 rounded-[1.5rem] border-4 border-white/5 shadow-2xl" 
                 alt="User"
               />
               <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-black border-4 border-[#0d0d0d]">
                  <Shield size={16} />
               </div>
            </div>
            <div>
              <div className="flex items-center gap-4">
                <h2 className="text-3xl font-black tracking-tighter uppercase italic">{details?.profile?.display_name || details?.profile?.username || details?.profile?.email || 'System User'}</h2>
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ${details?.profile?.status === 'active' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                   {details?.profile?.status || 'Unknown'}
                </span>
              </div>
              <p className="text-slate-500 font-mono text-sm mt-1 opacity-60 tracking-tight">{details?.profile?.email || 'No Email'} • ID: {userId}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-2xl transition-all text-white shadow-xl border border-white/20">
            <X size={24} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-0 border-b border-white/5">
          {/* Identity Pulse */}
          <div className="p-8 border-r border-white/5 space-y-8">
            <div>
              <div className="flex items-center gap-2 text-emerald-500 mb-6">
                <Activity size={16} />
                <span className="text-xs font-black uppercase tracking-[0.2em]">User Activity Summary</span>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="text-xs text-slate-600 uppercase font-black tracking-widest block mb-1">Registration</label>
                  <div className="text-sm text-slate-300 font-bold">
                    {details?.profile?.created_at ? new Date(details.profile.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown'}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-600 uppercase font-black tracking-widest block mb-1">Last Interaction</label>
                  <div className="text-sm text-slate-300 font-bold">
                    {details?.profile?.last_active_at ? new Date(details.profile.last_active_at).toLocaleString() : 'No History'}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-600 uppercase font-black tracking-widest block mb-1">Access Role</label>
                  <div className="px-3 py-1 bg-white/5 border border-white/5 rounded-lg text-xs font-black text-white uppercase tracking-widest inline-block mt-2">
                    {details?.profile?.global_role || 'Unknown'}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-white/5">
                <label className="text-xs text-slate-600 uppercase font-black tracking-widest block mb-4">Linked Accounts</label>
                <div className="flex flex-wrap gap-2">
                   {details?.social_links?.length > 0 ? details.social_links.map((link: any) => (
                      <div key={link.provider} title={link.provider} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-blue-400">
                         <Globe size={18} />
                      </div>
                   )) : <span className="text-xs text-slate-700 italic font-bold">No Linked Accounts</span>}
                </div>
            </div>
          </div>

          {/* Biometric Registry */}
          <div className="p-8 border-r border-white/5 bg-black/40 lg:col-span-2 space-y-8">
              <div className="flex items-center justify-between mb-2">
                 <div className="flex items-center gap-2 text-primary">
                   <Fingerprint size={18} />
                   <span className="text-xs font-black uppercase tracking-[0.2em]">Security Keys & Passkeys</span>
                 </div>
                 <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-black">{details?.security?.passkeys?.length || 0} Registered</span>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                 {details.security.passkeys?.length > 0 ? details.security.passkeys.map((pk: any) => (
                    <div key={pk.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between group hover:border-primary/30 transition-all">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-primary">
                             <Fingerprint size={20} />
                          </div>
                          <div>
                             <p className="text-sm font-bold tracking-tight text-white">{pk.name}</p>
                             <p className="text-xs text-slate-600 font-black uppercase tracking-widest">{pk.aaguid || 'Unknown Provider'}</p>
                          </div>
                       </div>
                       <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => setEditingPk({ id: pk.id, newName: pk.name })}
                            className="p-2 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-all"
                          >
                             <Edit3 size={14} />
                          </button>
                          <button 
                            onClick={() => setRemovingPk({ id: pk.id, name: pk.name })}
                            className="p-2 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-500 transition-all"
                          >
                             <Trash2 size={14} />
                          </button>
                       </div>
                    </div>
                 )) : (
                    <div className="h-40 flex flex-col items-center justify-center text-slate-700 border-2 border-dashed border-white/5 rounded-3xl space-y-3">
                       <ShieldAlert size={32} className="opacity-20" />
                       <span className="text-xs font-black uppercase tracking-widest">No Passkeys Detected</span>
                    </div>
                 )}
              </div>

              {/* Forensic Overrides */}
              <div className="pt-8 border-t border-white/5 space-y-6">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2 text-orange-500">
                        <ShieldAlert size={18} />
                        <span className="text-xs font-black uppercase tracking-[0.2em]">Account Recovery Tools</span>
                     </div>
                     <button 
                       onClick={generatePassword}
                       className="flex items-center gap-2 text-[10px] font-black text-orange-500 uppercase tracking-widest hover:text-orange-400 transition-colors"
                     >
                       <RefreshCw size={12} />
                       Generate
                     </button>
                  </div>
                 
                 <div className="space-y-4">
                    <div className="relative">
                       <input 
                        type={showPass ? "text" : "password"}
                        placeholder="Enter New Password..."
                        value={manualPass}
                        onChange={(e) => setManualPass(e.target.value)}
                        autoComplete="new-password"
                        className="w-full bg-white/5 border border-white/5 p-4 rounded-xl text-sm font-bold outline-none focus:border-orange-500/50 transition-all pr-12"
                       />
                       <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary hover:text-white transition-colors"
                       >
                        {showPass ? <RefreshCw size={14} /> : <Fingerprint size={14} />}
                       </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                       <label className="flex items-center gap-2 cursor-pointer group">
                          <input 
                            type="checkbox" 
                            checked={isTemp} 
                            onChange={(e) => setIsTemp(e.target.checked)}
                            className="accent-orange-500"
                          />
                          <span className="text-xs font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-300 transition-colors">Temporary Credential</span>
                       </label>
                       
                       <button 
                        onClick={handleAdminResetPassword}
                        disabled={resetting || !manualPass}
                        className="px-6 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-30 text-black font-black uppercase tracking-widest text-xs rounded-xl transition-all"
                       >
                         Execute Secure Reset
                       </button>
                    </div>
                 </div>
              </div>
          </div>

          {/* System Security History */}
          <div className="p-8 space-y-6 bg-deep-slate-90/50">
            <div className="flex items-center gap-2 text-slate-500 mb-6">
              <Terminal size={18} />
              <span className="text-xs font-black uppercase tracking-[0.2em]">Activity History</span>
            </div>
            
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {details?.history?.length > 0 ? details.history.map((log: any, idx: number) => (
                <div key={idx} className="relative pl-5 border-l border-white/10 py-1 hover:border-emerald-500 transition-colors">
                  <div className="absolute left-[-5px] top-2 w-2 h-2 rounded-full bg-white/10" />
                  <div className="text-xs font-black uppercase text-slate-300 tracking-tight">{log.action?.replace(/_/g, ' ')?.replace('ADMIN ', '') || 'OPERATION'}</div>
                  <div className="text-[12px] text-slate-600 font-mono mt-1">{new Date(log.created_at).toLocaleString()}</div>
                </div>
              )) : (
                <div className="text-center py-12 opacity-10 italic text-xs font-black uppercase tracking-widest">Pristine Audit Trail</div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-8 bg-black/60 flex items-center justify-between border-t border-white/5">
          <div className="flex items-center gap-6">
             <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Secure Protocol</span>
                <span className="text-xs font-black text-slate-400 font-mono">USER_DIRECTORY_V2.4</span>
             </div>
             <div className="h-8 w-px bg-white/5" />
             <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Access Key</span>
                <span className="text-xs font-black text-emerald-500/60 font-mono">AUTHORIZED_ADMIN</span>
             </div>
          </div>
          
          <div className="flex gap-4">
             <button className="flex items-center gap-3 px-6 py-4 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 rounded-2xl text-xs font-black uppercase tracking-widest transition-all">
                <RefreshCw size={14} />
                Full Resync
             </button>
             <button 
                onClick={() => {
                  onMerge(userId);
                  onClose();
                }}
                className="flex items-center gap-3 px-6 py-4 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 border border-orange-500/20 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
              >
                <GitMerge size={14} />
                Merge Account
              </button>
             <button className="flex items-center gap-3 px-8 py-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 rounded-2xl text-xs font-black uppercase tracking-widest transition-all">
                <ExternalLink size={16} />
                Download Record Summary
             </button>
          </div>
        </div>
      </motion.div>

      {/* Passkey Admin Modals */}
      <Modal
        isOpen={!!editingPk}
        onClose={() => setEditingPk(null)}
        title="Rename Passkey (Admin)"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditingPk(null)}>Cancel</Button>
            <Button variant="primary" onClick={handleAdminRenamePasskey}>Save Name</Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-secondary text-sm">Update the friendly name for this passkey.</p>
          <Input 
            label="New Passkey Name"
            value={editingPk?.newName || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingPk({ ...editingPk, newName: e.target.value })}
            autoFocus
          />
        </div>
      </Modal>

      <Modal
        isOpen={!!removingPk}
        onClose={() => setRemovingPk(null)}
        title="Remove Passkey?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemovingPk(null)}>Cancel</Button>
            <Button variant="primary" className="bg-red-500 hover:bg-red-600 text-white" onClick={handleAdminRemovePasskey}>Remove</Button>
          </>
        }
      >
        <p className="text-secondary font-medium tracking-tight">Are you sure you want to remove the passkey <strong>{removingPk?.name}</strong>? The user will need an alternative sign-in method.</p>
      </Modal>
    </div>
  );
};

// --- SUB-COMPONENT: Create User Modal ---
const CreateUserModal: React.FC<{ isOpen: boolean; onClose: () => void; onSuccess: () => void }> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    display_name: '',
    global_role: 'user',
    force_password_change: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let password = "";
    for (let i = 0; i < 16; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, password });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('ledger_token');
      const apiUrl = import.meta.env.VITE_API_URL;
      const res = await fetch(`${apiUrl}/api/pcc/admin/users`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Provisioning failed');
      
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-xl bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] shadow-[0_0_150px_rgba(16,185,129,0.1)] overflow-hidden"
      >
        <div className="p-10 space-y-8">
           <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black italic tracking-tighter uppercase text-white">Create <span className="text-emerald-500">User</span></h3>
                <p className="text-xs text-slate-500 uppercase font-black tracking-widest mt-1">Create a new manual user record</p>
              </div>
              <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded-full transition-all text-slate-500 hover:text-white">
                <X size={20} />
              </button>
           </div>

           <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-slate-600 uppercase font-black tracking-widest ml-1">System Handle</label>
                  <input 
                    required
                    type="text"
                    placeholder="e.g. j.wick"
                    className="w-full bg-white/5 border border-white/5 p-4 rounded-2xl text-sm font-bold focus:border-emerald-500/50 outline-none transition-all"
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-600 uppercase font-black tracking-widest ml-1">Display Alias</label>
                  <input 
                    required
                    type="text"
                    placeholder="e.g. John Wick"
                    className="w-full bg-white/5 border border-white/5 p-4 rounded-2xl text-sm font-bold focus:border-emerald-500/50 outline-none transition-all"
                    value={formData.display_name}
                    onChange={e => setFormData({ ...formData, display_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-slate-600 uppercase font-black tracking-widest ml-1">Identity Email</label>
                <input 
                  required
                  type="email"
                  placeholder="contact@gpnet.dev"
                  className="w-full bg-white/5 border border-white/5 p-4 rounded-2xl text-sm font-bold focus:border-emerald-500/50 outline-none transition-all"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-600 uppercase font-black tracking-widest ml-1">Initial Password</label>
                  <button 
                    type="button"
                    onClick={generatePassword}
                    className="flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest hover:text-emerald-400 transition-colors"
                  >
                    <RefreshCw size={12} />
                    Generate
                  </button>
                </div>
                <input 
                  required
                  type="text"
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/5 p-4 rounded-2xl text-sm font-bold focus:border-emerald-500/50 outline-none transition-all font-mono"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl">
                 <div className="space-y-1">
                    <p className="text-xs font-black uppercase text-white tracking-widest">Access Role</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Set the default permissions for this user</p>
                 </div>
                 <select 
                   className="bg-black border border-white/10 p-2 rounded-lg text-xs font-black uppercase text-emerald-500 outline-none"
                   value={formData.global_role}
                   onChange={e => setFormData({ ...formData, global_role: e.target.value })}
                 >
                   <option value="user">USER</option>
                   <option value="super_admin">SUPER_ADMIN</option>
                 </select>
              </div>

              <div className="flex items-center gap-3 ml-1">
                <input 
                  type="checkbox" 
                  checked={formData.force_password_change}
                  onChange={e => setFormData({ ...formData, force_password_change: e.target.checked })}
                  className="accent-emerald-500"
                />
                <label className="text-xs text-slate-500 font-bold uppercase tracking-widest cursor-pointer">Enforce Forensic Reset on First Login</label>
              </div>

              {error && <p className="text-red-500 text-xs font-black text-center uppercase tracking-widest">{error}</p>}

              <div className="pt-4 flex gap-4">
                 <button 
                  type="button" 
                  onClick={onClose}
                  className="flex-1 py-4 px-6 border border-white/10 rounded-2xl text-xs font-black uppercase tracking-[0.2em] text-slate-500 hover:bg-white/5 transition-all"
                 >
                   Abort
                 </button>
                 <button 
                  type="submit" 
                  disabled={loading}
                  className="flex-[2] py-4 px-6 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-3"
                 >
                   {loading ? <RefreshCw className="animate-spin" size={16} /> : <Shield size={16} />}
                   Commit Provisioning
                 </button>
              </div>
           </form>
        </div>
      </motion.div>
    </div>
  );
};

const PCCUsers: React.FC = () => {
  const { showToast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);
  const [mergeSource, setMergeSource] = useState<string | null>(null);
  const [mergeTarget, setMergeTarget] = useState<string | null>(null);
  const [mergeSearchTerm, setMergeSearchTerm] = useState('');
  const [merging, setMerging] = useState(false);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('ledger_token');
      const apiUrl = import.meta.env.VITE_API_URL;
      const res = await fetch(`${apiUrl}/api/pcc/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdate = async (id: string, updates: any) => {
    const token = localStorage.getItem('ledger_token');
    const apiUrl = import.meta.env.VITE_API_URL;
    await fetch(`${apiUrl}/api/pcc/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    setActiveMenu(null);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setDeletingUser(true);
    try {
      const token = localStorage.getItem('ledger_token');
      const apiUrl = import.meta.env.VITE_API_URL;
      const res = await fetch(`${apiUrl}/api/pcc/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('User account successfully deleted', 'success');
        setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
        setActiveMenu(null);
      }
    } finally {
      setDeletingUser(false);
      setUserToDelete(null);
    }
  };


  const handleMerge = async () => {
    if (!mergeSource || !mergeTarget) return;
    setMerging(true);
    try {
      const token = localStorage.getItem('ledger_token');
      const apiUrl = import.meta.env.VITE_API_URL;
      const res = await fetch(`${apiUrl}/api/pcc/admin/users/merge`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: mergeSource, targetId: mergeTarget })
      });
      if (res.ok) {
        showToast('Accounts successfully merged', 'success');
        fetchUsers();
        setMergeSource(null);
        setMergeTarget(null);
      } else {
        const err = await res.json();
        showToast(err.error || 'Merge failed', 'error');
      }
    } finally {
      setMerging(false);
    }
  };


  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <PCCPortal activePath="#/system-pcc/users">
      <div className="flex flex-col items-center justify-center min-h-[400px] text-emerald-500">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
        <div className="text-xs font-black uppercase tracking-[0.3em]">Loading users...</div>
      </div>
    </PCCPortal>
  );

  return (
    <PCCPortal activePath="#/system-pcc/users">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-12 gap-6">
        <div>
          <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-none">
            User <span className="text-emerald-500">Directory</span>
          </h2>
          <p className="text-sm text-slate-500 mt-2 uppercase tracking-widest font-bold">Manage user accounts and permissions</p>
        </div>
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search users..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-emerald-500 transition-all text-sm w-full lg:w-96 shadow-2xl backdrop-blur-sm"
          />
          <Search className="absolute left-4 top-4.5 opacity-30 text-emerald-500" size={18} />
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-3 px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-black rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 transition-all"
        >
          <Shield size={16} />
          Create New User
        </button>
      </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5 text-xs font-black uppercase tracking-[0.2em] text-slate-500 border-b border-white/5">
              <th className="px-8 py-6">User Profile</th>
              <th className="px-8 py-6">Access Role</th>
              <th className="px-8 py-6">Account Status</th>
              <th className="px-8 py-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredUsers.map(u => (
              <tr key={u.id} className="hover:bg-white/[0.03] transition-colors group relative">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <img 
                      src={u.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.id}`} 
                      className="w-10 h-10 rounded-xl border border-white/10 group-hover:border-emerald-500/50 transition-all" 
                      alt="Avatar"
                    />
                    <div>
                      <div className="font-black text-slate-100 group-hover:text-emerald-400 transition-colors uppercase tracking-tight">{u.display_name || u.username || u.email || 'System User'}</div>
                      <div className="text-xs text-slate-500 font-mono tracking-tighter">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className={`px-2 py-1 rounded text-xs font-black uppercase tracking-widest ${u.global_role === 'super_admin' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-white/5 text-slate-400 border border-white/10'}`}>
                    {u.global_role}
                  </span>
                </td>
                <td className="px-8 py-6">
                   <div className="flex items-center gap-2">
                     <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'}`} />
                     <span className={`text-xs font-black uppercase tracking-widest ${u.status === 'active' ? 'text-emerald-500' : 'text-red-500'}`}>
                       {u.status}
                     </span>
                   </div>
                </td>
                <td className="px-8 py-6 text-right relative">
                  <button 
                    onClick={() => setActiveMenu(activeMenu === u.id ? null : u.id)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-all text-slate-500 hover:text-white"
                  >
                    <MoreHorizontal size={20} />
                  </button>

                  <AnimatePresence>
                    {activeMenu === u.id && (
                      <>
                        <div className="fixed inset-0 z-[100]" onClick={() => setActiveMenu(null)} />
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9, x: 20 }}
                          animate={{ opacity: 1, scale: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.9, x: 20 }}
                          className="absolute right-8 top-16 w-56 bg-[#0d0d0d] border border-white/10 rounded-2xl shadow-2xl z-[110] overflow-hidden p-1 backdrop-blur-xl"
                        >
                          <button 
                            onClick={() => { setSelectedUser(u.id); setActiveMenu(null); }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-300 hover:bg-emerald-500 hover:text-black rounded-xl transition-all"
                          >
                            <Info size={16} />
                            <span>View Profile</span>
                          </button>
                          
                          <div className="h-px bg-white/5 my-1" />
                          
                          <button 
                            onClick={() => handleUpdate(u.id, { global_role: u.global_role === 'user' ? 'super_admin' : 'user' })}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-300 hover:bg-white/5 rounded-xl transition-all"
                          >
                            <Shield size={16} className="text-primary" />
                            <span>Toggle Authority</span>
                          </button>

                          <button 
                            onClick={() => handleUpdate(u.id, { status: u.status === 'active' ? 'suspended' : 'active' })}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-300 hover:bg-white/5 rounded-xl transition-all"
                          >
                            <Lock size={16} className="text-secondary" />
                            <span>{u.status === 'active' ? 'Suspend Access' : 'Restore Access'}</span>
                          </button>

                           <button 
                              onClick={() => { 
                                 setMergeSource(u.id);
                                 setActiveMenu(null);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-300 hover:bg-white/5 rounded-xl transition-all"
                           >
                             <GitMerge size={16} className="text-orange-400" />
                             <span>Merge Account</span>
                           </button>

                          <div className="h-px bg-white/5 my-1" />

                          <button 
                            onClick={() => { setUserToDelete(u); setActiveMenu(null); }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                          >
                            <Trash2 size={16} />
                            <span>Delete User</span>
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

      {/* Modals Overlay */}
      <AnimatePresence>
        {selectedUser && (
          <UserDetailsModal userId={selectedUser} onClose={() => setSelectedUser(null)} onMerge={(id) => setMergeSource(id)} />
        )}
        <CreateUserModal 
          isOpen={isCreateModalOpen} 
          onClose={() => setIsCreateModalOpen(false)} 
          onSuccess={fetchUsers} 
        />

        {/* Merge Selection Modal */}
        <Modal
          isOpen={!!mergeSource}
          onClose={() => { setMergeSource(null); setMergeSearchTerm(''); setMergeTarget(null); }}
          title="Select Destination Account"
          footer={
            <>
              <Button variant="secondary" onClick={() => setMergeSource(null)}>Cancel</Button>
              <Button 
                variant="primary" 
                className="bg-orange-500 hover:bg-orange-600 text-black" 
                disabled={!mergeTarget || merging}
                onClick={handleMerge}
              >
                {merging ? 'Merging...' : 'Execute Merge'}
              </Button>
            </>
          }
        >
          <div className="space-y-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input 
                type="text"
                placeholder="Search destination accounts..."
                value={mergeSearchTerm}
                onChange={(e) => setMergeSearchTerm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 p-4 pl-12 rounded-2xl text-sm font-bold focus:border-orange-500/50 outline-none transition-all"
              />
            </div>

            <p className="text-xs text-slate-500 uppercase font-black tracking-widest pr-4">
              Select the account that will <span className="text-white">REMAIN active</span>. Data from the source account will be migrated.
            </p>
            
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {users.filter(u => 
                u.id !== mergeSource && 
                (u.display_name?.toLowerCase().includes(mergeSearchTerm.toLowerCase()) || 
                 u.email?.toLowerCase().includes(mergeSearchTerm.toLowerCase()))
              ).map(u => (
                <div 
                  key={u.id}
                  onClick={() => setMergeTarget(u.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${mergeTarget === u.id ? 'bg-orange-500/10 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.1)]' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
                >
                  <div className="flex items-center gap-3">
                    <img src={u.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.id}`} className="w-8 h-8 rounded-lg" />
                    <div>
                      <p className="text-sm font-black uppercase text-white tracking-tight">{u.display_name || u.username}</p>
                      <p className="text-[10px] font-mono text-slate-500">{u.email}</p>
                    </div>
                  </div>
                  {mergeTarget === u.id && <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_10px_#f97316]" />}
                </div>
              ))}
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={!!userToDelete}
          onClose={() => setUserToDelete(null)}
          title="Confirm User Deletion"
          footer={
            <>
              <Button variant="secondary" onClick={() => setUserToDelete(null)}>Cancel</Button>
              <Button variant="primary" className="bg-red-500 hover:bg-red-600 text-white" onClick={confirmDeleteUser} disabled={deletingUser}>
                {deletingUser ? 'Deleting...' : 'Delete User'}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-secondary font-medium">Are you sure you want to permanently delete <strong>{userToDelete?.display_name || userToDelete?.username}</strong>?</p>
            <p className="text-red-500 text-xs font-black uppercase tracking-widest">CRITICAL ACTION: This will remove all associated data and credentials. This cannot be undone.</p>
          </div>
        </Modal>
      </AnimatePresence>
    </PCCPortal>
  );
};

export default PCCUsers;
