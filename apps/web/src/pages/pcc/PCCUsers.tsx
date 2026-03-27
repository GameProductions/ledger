import React, { useState, useEffect } from 'react';
import PCCPortal from './PCCPortal';
import { MoreHorizontal, User, Shield, Trash2, GitMerge, Info, Mail, Calendar, Activity, Lock, Globe, ExternalLink, X, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- SUB-COMPONENT: Forensic Details Modal ---
const UserDetailsModal: React.FC<{ userId: string; onClose: () => void }> = ({ userId, onClose }) => {
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const token = localStorage.getItem('ledger_token');
        const apiUrl = import.meta.env.VITE_API_URL;
        const res = await fetch(`${apiUrl}/api/admin/users/${userId}/details`, {
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
    fetchDetails();
  }, [userId]);

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
        className="relative w-full max-w-4xl bg-[#0d0d0d] border border-white/10 rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
      >
        {/* Header */}
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-emerald-500/5 to-transparent">
          <div className="flex items-center gap-6">
            <img 
              src={details.profile.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${details.profile.id}`} 
              className="w-20 h-20 rounded-2xl border-2 border-emerald-500/30 shadow-2xl" 
              alt="User"
            />
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black tracking-tight">{details.profile.display_name || 'Anonymous'}</h2>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${details.profile.status === 'active' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                  {details.profile.status}
                </span>
              </div>
              <p className="text-slate-500 font-mono text-xs mt-1">{details.profile.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-full transition-colors text-slate-500 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border-b border-white/5">
          {/* Identity Pulse */}
          <div className="p-8 border-r border-white/5 space-y-6">
            <div className="flex items-center gap-2 text-emerald-500 mb-2">
              <Activity size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Identity Pulse</span>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-600 uppercase font-black tracking-wide">Join Date</label>
                <div className="text-sm text-slate-300 flex items-center gap-2 mt-1">
                  <Calendar size={14} className="opacity-40" />
                  {new Date(details.profile.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-600 uppercase font-black tracking-wide">Last Active</label>
                <div className="text-sm text-slate-300 flex items-center gap-2 mt-1">
                  <Activity size={14} className="opacity-40" />
                  {details.profile.last_active_at ? new Date(details.profile.last_active_at).toLocaleString() : 'Never'}
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-600 uppercase font-black tracking-wide">Global Authority</label>
                <div className="text-xs font-black text-white mt-1 uppercase tracking-widest px-2 py-1 bg-white/5 rounded inline-block border border-white/5">
                  {details.profile.global_role}
                </div>
              </div>
            </div>
          </div>

          {/* Security Posture */}
          <div className="p-8 border-r border-white/5 space-y-6 bg-black/20">
            <div className="flex items-center gap-2 text-primary mb-2">
              <Lock size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Security Posture</span>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  <Shield size={16} className={details.security.mfa_enabled ? 'text-emerald-500' : 'text-slate-600'} />
                  <span className="text-xs font-bold text-slate-300">MFA (TOTP)</span>
                </div>
                {details.security.mfa_enabled ? <CheckCircle2 size={16} className="text-emerald-500" /> : <AlertCircle size={16} className="text-orange-500/50" />}
              </div>
              
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 opacity-50">
                <div className="flex items-center gap-3">
                  <Lock size={16} className="text-slate-600" />
                  <span className="text-xs font-bold text-slate-300">Biometric Passkeys</span>
                </div>
                <div className="text-[10px] font-black text-slate-600">INACTIVE</div>
              </div>

              <div>
                <label className="text-[10px] text-slate-600 uppercase font-black tracking-wide">Linked Ecosystems</label>
                <div className="flex gap-2 mt-2">
                  {details.social_links.length > 0 ? details.social_links.map((link: any) => (
                    <div key={link.provider} className="p-2 bg-white/5 rounded-lg border border-white/10 hover:border-white/20 transition-all cursor-pointer">
                      <Globe size={14} className="text-blue-400" />
                    </div>
                  )) : <span className="text-[10px] text-slate-700 font-bold italic">No External Links</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Forensic History */}
          <div className="p-8 space-y-6">
            <div className="flex items-center gap-2 text-secondary mb-2">
              <Terminal size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Forensic Activity Log</span>
            </div>
            
            <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
              {details.history.length > 0 ? details.history.map((log: any, idx: number) => (
                <div key={idx} className="text-[10px] border-l-2 border-emerald-500/20 pl-3 py-1">
                  <div className="text-slate-400 font-bold">{log.action.replace(/_/g, ' ')}</div>
                  <div className="text-slate-600 mt-0.5">{new Date(log.created_at).toLocaleString()}</div>
                </div>
              )) : (
                <div className="text-center py-8 opacity-20 italic text-xs">No Recent Audit Trail</div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-black/40 flex items-center justify-between">
          <div className="text-[10px] text-slate-600 font-mono tracking-tighter uppercase">
            Platform Forensic Record | ID: {userId}
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 rounded-lg text-xs font-black transition-all">
            <ExternalLink size={14} />
            GENERATE FULL AUDIT Dossier
          </button>
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
      const res = await fetch(`${apiUrl}/api/admin/users`, {
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
    await fetch(`${apiUrl}/api/admin/users/${id}`, {
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
    await fetch(`${apiUrl}/api/admin/users/${id}`, {
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

      <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 backdrop-blur-3xl shadow-2xl">
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
      </div>

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

export default PCCUsers;
