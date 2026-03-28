import React, { useState, useEffect } from 'react';
import PCCPortal from './PCCPortal';
import { MoreHorizontal, Shield, Trash2, GitMerge, Info, Activity, Lock, Globe, ExternalLink, X, Search, Fingerprint, RefreshCw, Edit3, Terminal, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- SUB-COMPONENT: Forensic Details Modal ---
const UserDetailsModal: React.FC<{ userId: string; onClose: () => void }> = ({ userId, onClose }) => {
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [manualPass, setManualPass] = useState('');
  const [isTemp, setIsTemp] = useState(true);
  const [showPass, setShowPass] = useState(false);

  const fetchDetails = async () => {
    try {
      const token = localStorage.getItem('ledger_token');
      const apiUrl = import.meta.env.VITE_API_URL;
      const res = await fetch(`${apiUrl}/api/pcc/users/${userId}/details`, {
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
      await fetch(`${apiUrl}/api/pcc/users/${userId}/password/reset`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: manualPass, isTemporary: isTemp })
      });
      alert('Password reset successfully');
      setManualPass('');
      fetchDetails();
    } finally {
      setResetting(false);
    }
  };

  const handleAdminRenamePasskey = async (id: string, oldName: string) => {
    const name = prompt('New Passkey Name:', oldName);
    if (!name) return;
    const token = localStorage.getItem('ledger_token');
    const apiUrl = import.meta.env.VITE_API_URL;
    await fetch(`${apiUrl}/api/pcc/users/${userId}/passkeys/${id}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    fetchDetails();
  };

  const handleAdminRemovePasskey = async (id: string) => {
    if (!confirm('Remove this Passkey?')) return;
    const token = localStorage.getItem('ledger_token');
    const apiUrl = import.meta.env.VITE_API_URL;
    await fetch(`${apiUrl}/api/pcc/users/${userId}/passkeys/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    fetchDetails();
  };

  if (loading) return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="animate-pulse text-emerald-500 font-black tracking-widest text-sm uppercase">Accessing Secure Records...</div>
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
                 src={details.profile.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${details.profile.id}`} 
                 className="w-24 h-24 rounded-[1.5rem] border-4 border-white/5 shadow-2xl" 
                 alt="User"
               />
               <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-black border-4 border-[#0d0d0d]">
                  <Shield size={16} />
               </div>
            </div>
            <div>
              <div className="flex items-center gap-4">
                <h2 className="text-3xl font-black tracking-tighter uppercase italic">{details.profile.display_name || 'Anonymous Intelligence'}</h2>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${details.profile.status === 'active' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                   {details.profile.status}
                </span>
              </div>
              <p className="text-slate-500 font-mono text-xs mt-1 opacity-60 tracking-tight">{details.profile.email} • ID: {userId}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-12 h-12 flex items-center justify-center hover:bg-white/5 rounded-2xl transition-all text-slate-500 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-0 border-b border-white/5">
          {/* Identity Pulse */}
          <div className="p-8 border-r border-white/5 space-y-8">
            <div>
              <div className="flex items-center gap-2 text-emerald-500 mb-6">
                <Activity size={16} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Telemetry</span>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] text-slate-600 uppercase font-black tracking-widest block mb-1">Registration</label>
                  <div className="text-sm text-slate-300 font-bold">
                    {new Date(details.profile.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-600 uppercase font-black tracking-widest block mb-1">Last Interaction</label>
                  <div className="text-sm text-slate-300 font-bold">
                    {details.profile.last_active_at ? new Date(details.profile.last_active_at).toLocaleString() : 'No History'}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-600 uppercase font-black tracking-widest block mb-1">Authority Clearance</label>
                  <div className="px-3 py-1 bg-white/5 border border-white/5 rounded-lg text-[10px] font-black text-white uppercase tracking-widest inline-block mt-2">
                    {details.profile.global_role}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-white/5">
                <label className="text-[10px] text-slate-600 uppercase font-black tracking-widest block mb-4">Linked Identites</label>
                <div className="flex flex-wrap gap-2">
                   {details.social_links.length > 0 ? details.social_links.map((link: any) => (
                      <div key={link.provider} title={link.provider} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-blue-400">
                         <Globe size={18} />
                      </div>
                   )) : <span className="text-[10px] text-slate-700 italic font-bold">Isolated Node</span>}
                </div>
            </div>
          </div>

          {/* Biometric Registry */}
          <div className="p-8 border-r border-white/5 bg-black/40 lg:col-span-2 space-y-8">
              <div className="flex items-center justify-between mb-2">
                 <div className="flex items-center gap-2 text-primary">
                   <Fingerprint size={18} />
                   <span className="text-[10px] font-black uppercase tracking-[0.2em]">Biometric Registry</span>
                 </div>
                 <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-black">{details.security.passkeys?.length || 0} Registered</span>
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
                             <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">{pk.aaguid || 'Unknown Provider'}</p>
                          </div>
                       </div>
                       <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleAdminRenamePasskey(pk.id, pk.name)}
                            className="p-2 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-all"
                          >
                             <Edit3 size={14} />
                          </button>
                          <button 
                            onClick={() => handleAdminRemovePasskey(pk.id)}
                            className="p-2 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-500 transition-all"
                          >
                             <Trash2 size={14} />
                          </button>
                       </div>
                    </div>
                 )) : (
                    <div className="h-40 flex flex-col items-center justify-center text-slate-700 border-2 border-dashed border-white/5 rounded-3xl space-y-3">
                       <ShieldAlert size={32} className="opacity-20" />
                       <span className="text-[10px] font-black uppercase tracking-widest">No Passkeys Detected</span>
                    </div>
                 )}
              </div>

              {/* Forensic Overrides */}
              <div className="pt-8 border-t border-white/5 space-y-6">
                 <div className="flex items-center gap-2 text-orange-500">
                    <ShieldAlert size={18} />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Forensic Overrides</span>
                 </div>
                 
                 <div className="space-y-4">
                    <div className="relative">
                       <input 
                        type={showPass ? "text" : "password"}
                        placeholder="Manual Password Injection..."
                        value={manualPass}
                        onChange={(e) => setManualPass(e.target.value)}
                        autoComplete="new-password"
                        className="w-full bg-white/5 border border-white/5 p-4 rounded-xl text-xs font-bold outline-none focus:border-orange-500/50 transition-all pr-12"
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
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-300 transition-colors">Temporary Credential</span>
                       </label>
                       
                       <button 
                        onClick={handleAdminResetPassword}
                        disabled={resetting || !manualPass}
                        className="px-6 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-30 text-black font-black uppercase tracking-widest text-[10px] rounded-xl transition-all"
                       >
                         Execute Reset
                       </button>
                    </div>
                 </div>
              </div>
          </div>

          {/* Forensic Audit Log */}
          <div className="p-8 space-y-6 bg-deep-slate-90/50">
            <div className="flex items-center gap-2 text-slate-500 mb-6">
              <Terminal size={18} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">System Chronicle</span>
            </div>
            
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {details.history.length > 0 ? details.history.map((log: any, idx: number) => (
                <div key={idx} className="relative pl-5 border-l border-white/10 py-1 hover:border-emerald-500 transition-colors">
                  <div className="absolute left-[-5px] top-2 w-2 h-2 rounded-full bg-white/10" />
                  <div className="text-[10px] font-black uppercase text-slate-300 tracking-tight">{log.action.replace(/_/g, ' ')}</div>
                  <div className="text-[9px] text-slate-600 font-mono mt-1">{new Date(log.created_at).toLocaleString()}</div>
                </div>
              )) : (
                <div className="text-center py-12 opacity-10 italic text-[10px] font-black uppercase tracking-widest">Pristine Audit Trail</div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-8 bg-black/60 flex items-center justify-between border-t border-white/5">
          <div className="flex items-center gap-6">
             <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-600">Secure Protocol</span>
                <span className="text-[10px] font-black text-slate-400 font-mono">PCC_DIRECTORY_V2.4</span>
             </div>
             <div className="h-8 w-px bg-white/5" />
             <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-600">Access Key</span>
                <span className="text-[10px] font-black text-emerald-500/60 font-mono">AUTHORIZED_ADMIN</span>
             </div>
          </div>
          
          <div className="flex gap-4">
             <button className="flex items-center gap-3 px-6 py-4 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                <RefreshCw size={14} />
                Full Resync
             </button>
             <button className="flex items-center gap-3 px-8 py-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                <ExternalLink size={16} />
                Generate Forensic Dossier
             </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const PCCUsers: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('ledger_token');
      const apiUrl = import.meta.env.VITE_API_URL;
      const res = await fetch(`${apiUrl}/api/pcc/users`, {
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
    await fetch(`${apiUrl}/api/pcc/users/${id}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    setActiveMenu(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('CRITICAL ACTION: Are you sure you want to permanently purge this user? This will remove all directory associations and credentials.')) return;
    const token = localStorage.getItem('ledger_token');
    const apiUrl = import.meta.env.VITE_API_URL;
    await fetch(`${apiUrl}/api/pcc/users/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    setUsers(prev => prev.filter(u => u.id !== id));
    setActiveMenu(null);
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
        <div className="text-[10px] font-black uppercase tracking-[0.3em]">Accessing Directory Layer...</div>
      </div>
    </PCCPortal>
  );

  return (
    <PCCPortal activePath="#/system-pcc/users">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-12 gap-6">
        <div>
          <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-none">
            Directory <span className="text-emerald-500">Node</span>
          </h2>
          <p className="text-xs text-slate-500 mt-2 uppercase tracking-widest font-bold">Universal User Intelligence & Lifecycle Control</p>
        </div>
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search Intelligence Files..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-emerald-500 transition-all text-sm w-full lg:w-96 shadow-2xl backdrop-blur-sm"
          />
          <Search className="absolute left-4 top-4.5 opacity-30 text-emerald-500" size={18} />
        </div>
      </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-white/5">
              <th className="px-8 py-6">Intelligence Profile</th>
              <th className="px-8 py-6">Authority Level</th>
              <th className="px-8 py-6">Secure Status</th>
              <th className="px-8 py-6 text-right">System Actions</th>
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
                      <div className="font-black text-slate-100 group-hover:text-emerald-400 transition-colors uppercase tracking-tight">{u.display_name || 'Anonymous Intelligence'}</div>
                      <div className="text-[10px] text-slate-500 font-mono tracking-tighter">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${u.global_role === 'super_admin' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-white/5 text-slate-400 border border-white/10'}`}>
                    {u.global_role}
                  </span>
                </td>
                <td className="px-8 py-6">
                   <div className="flex items-center gap-2">
                     <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'}`} />
                     <span className={`text-[10px] font-black uppercase tracking-widest ${u.status === 'active' ? 'text-emerald-500' : 'text-red-500'}`}>
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
                            className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-slate-300 hover:bg-emerald-500 hover:text-black rounded-xl transition-all"
                          >
                            <Info size={16} />
                            <span>Detailed Intel</span>
                          </button>
                          
                          <div className="h-px bg-white/5 my-1" />
                          
                          <button 
                            onClick={() => handleUpdate(u.id, { global_role: u.global_role === 'user' ? 'super_admin' : 'user' })}
                            className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-slate-300 hover:bg-white/5 rounded-xl transition-all"
                          >
                            <Shield size={16} className="text-primary" />
                            <span>Toggle Authority</span>
                          </button>

                          <button 
                            onClick={() => handleUpdate(u.id, { status: u.status === 'active' ? 'suspended' : 'active' })}
                            className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-slate-300 hover:bg-white/5 rounded-xl transition-all"
                          >
                            <Lock size={16} className="text-secondary" />
                            <span>{u.status === 'active' ? 'Suspend Access' : 'Restore Access'}</span>
                          </button>

                          <button 
                            onClick={() => { /* Merge Logic */ }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-slate-300 hover:bg-white/5 rounded-xl transition-all"
                          >
                            <GitMerge size={16} className="text-orange-400" />
                            <span>Merge Intelligence</span>
                          </button>

                          <div className="h-px bg-white/5 my-1" />

                          <button 
                            onClick={() => handleDelete(u.id)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                          >
                            <Trash2 size={16} />
                            <span>Purge Node</span>
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

      {/* Detail Modal Overlay */}
      <AnimatePresence>
        {selectedUser && (
          <UserDetailsModal userId={selectedUser} onClose={() => setSelectedUser(null)} />
        )}
      </AnimatePresence>
    </PCCPortal>
  );
};

export default PCCUsers;
