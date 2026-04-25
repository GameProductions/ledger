import React, { useState, useMemo } from 'react';
import { Shield, Edit3, Plus, Send, Copy, Check, Users, UserMinus, ShieldAlert, Trash2, ChevronDown, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { formatHumanError } from '../utils/error-handler';
import { getApiUrl } from '../utils/api';

const API_URL = getApiUrl();

const HouseholdRegistry: React.FC = () => {
  const { householdId } = useAuth();
  const { data: profile } = useApi('/api/user/profile');
  const { data: households } = useApi('/api/user/households');
  const { data: members, mutate: mutateMembers } = useApi(householdId ? `/api/user/households/${householdId}/members` : null);
  
  const currentHousehold = useMemo(() => {
    if (Array.isArray(households) && householdId) {
      return households.find((h: any) => h.id === householdId)
    }
    return null
  }, [households, householdId]);

  const userRole = useMemo(() => {
    if (Array.isArray(members) && profile?.id) {
      const member = members.find((m: any) => m.id === profile.id);
      return member?.role || 'member';
    }
    return 'member';
  }, [members, profile]);

  const isAdmin = userRole === 'admin' || userRole === 'owner';
  const isOwner = userRole === 'owner';

  const { showToast } = useToast();
  const [isRenaming, setIsRenaming] = useState(false);
  const [householdName, setHouseholdName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newHouseholdName, setNewHouseholdName] = useState('');
  const [creating, setCreating] = useState(false);
  
  // Member Management State
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);

  React.useEffect(() => {
    if (currentHousehold?.name) {
      setHouseholdName(currentHousehold.name);
    }
  }, [currentHousehold]);

  const handleRename = async () => {
    const token = localStorage.getItem('ledger_token');
    try {
      const res = await fetch(`${API_URL}/api/user/households/${householdId}`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: householdName })
      });
      if (res.ok) {
        showToast('Household renamed successfully', 'success');
        window.location.reload();
        setIsRenaming(false);
      } else {
        const err = await res.json();
        showToast(formatHumanError(err, 'Failed to rename household'), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(formatHumanError(err, 'Failed to connect to servers'), 'error');
    }
  };

  const updateMemberRole = async (memberId: string, role: string) => {
    setUpdatingRole(memberId);
    const token = localStorage.getItem('ledger_token');
    try {
      const res = await fetch(`${API_URL}/api/user/households/${householdId}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role })
      });
      if (res.ok) {
        showToast('Member role updated', 'success');
        mutateMembers();
      } else {
        const err = await res.json();
        showToast(formatHumanError(err, 'Failed to update role'), 'error');
      }
    } finally {
      setUpdatingRole(null);
    }
  };

  const removeMember = async (memberId: string) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    setRemovingMember(memberId);
    const token = localStorage.getItem('ledger_token');
    try {
      const res = await fetch(`${API_URL}/api/user/households/${householdId}/members/${memberId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Member removed', 'success');
        mutateMembers();
      } else {
        const err = await res.json();
        showToast(formatHumanError(err, 'Failed to remove member'), 'error');
      }
    } finally {
      setRemovingMember(null);
    }
  };

  const archiveHousehold = async () => {
    setArchiving(true);
    const token = localStorage.getItem('ledger_token');
    try {
      const res = await fetch(`${API_URL}/api/user/households/${householdId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Household archived successfully', 'success');
        window.location.href = '/#/';
        window.location.reload();
      } else {
        const err = await res.json();
        showToast(formatHumanError(err, 'Failed to archive household'), 'error');
      }
    } finally {
      setArchiving(false);
      setIsArchiveModalOpen(false);
    }
  };

  const confirmCreate = async () => {
    if (!newHouseholdName) return;
    const token = localStorage.getItem('ledger_token');
    setCreating(true);
    try {
      const res = await fetch(`${API_URL}/api/user/households`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newHouseholdName })
      });
      if (res.ok) {
        showToast('New household created', 'success');
        window.location.reload(); // Switch context
      } else {
        const err = await res.json();
        showToast(formatHumanError(err, 'Failed to create household'), 'error');
      }
    } catch (err) {
      showToast(formatHumanError(err, 'Network error while creating household'), 'error');
    } finally {
      setCreating(false);
      setIsCreateModalOpen(false);
      setNewHouseholdName('');
    }
  };

  const generateInvite = async () => {
    setLoading(true);
    const token = localStorage.getItem('ledger_token');
    try {
      const res = await fetch(`${API_URL}/api/user/households/invite`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-household-id': householdId || ''
        },
        body: JSON.stringify({ email: inviteEmail || undefined })
      });
      const data = await res.json();
      if (res.ok) {
        setInviteUrl(`${window.location.origin}/${data.url}`);
        if (inviteEmail) {
           showToast(`Invitation sent to ${inviteEmail}`, 'success');
        } else {
           showToast('Invite link created', 'success');
        }
      } else {
        showToast(formatHumanError(data, 'Invite generation failed'), 'error');
      }
    } catch (err) {
      showToast(formatHumanError(err, 'Network error while generating invite'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Household Settings */}
      <div className="card p-8 bg-gradient-to-br from-emerald-500/5 to-transparent border-l-4 border-emerald-500">
        <div className="flex items-center justify-between mb-8">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                 <Shield size={24} />
              </div>
              <div>
                 <div className="flex items-center gap-3">
                    {isRenaming ? (
                      <div className="flex items-center gap-2">
                        <input 
                          className="bg-black border border-emerald-500/30 rounded px-2 py-1 text-lg font-black italic tracking-tight outline-none"
                          value={householdName}
                          onChange={e => setHouseholdName(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleRename()}
                          autoFocus
                        />
                        <button onClick={handleRename} className="px-3 py-1 bg-emerald-500 text-black text-xs font-black uppercase rounded hover:scale-105 transition-all">Save</button>
                        <button onClick={() => {
                          setHouseholdName(currentHousehold?.name || '');
                          setIsRenaming(false);
                        }} className="px-3 py-1 bg-white/10 text-white text-xs font-black uppercase rounded hover:bg-white/20 transition-all">Cancel</button>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-2xl font-black italic tracking-tight uppercase leading-none">{currentHousehold?.name || 'Personal Account'}</h3>
                        {isAdmin && (
                          <button onClick={() => setIsRenaming(true)} className="text-slate-500 hover:text-emerald-500">
                            <Edit3 size={16} />
                          </button>
                        )}
                      </>
                    )}
                 </div>
                 <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500/60 mt-1">Current Household</p>
              </div>
           </div>
           <button 
             onClick={() => setIsCreateModalOpen(true)}
             className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-black uppercase tracking-widest text-secondary transition-all"
           >
              <Plus size={14} />
              New Household
           </button>
        </div>

        {/* Members List */}
        <div className="space-y-4 pt-6 border-t border-white/5 mb-8">
           <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                   <Users size={14} className="text-emerald-500" />
                   Household Members
                </h4>
                <p className="text-xs text-secondary opacity-40 font-bold tracking-tight">Active participants in this context</p>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(members || []).map((m: any) => (
                 <div key={m.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between group hover:border-emerald-500/20 transition-all">
                    <div className="flex items-center gap-3">
                       <img 
                         src={m.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${m.id}`} 
                         className="w-10 h-10 rounded-xl border border-white/10" 
                         alt={m.display_name} 
                       />
                       <div>
                          <div className="flex items-center gap-2">
                             <p className="text-sm font-black uppercase tracking-tight">{m.display_name || 'System User'}</p>
                             <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest ${
                               m.role === 'owner' ? 'bg-emerald-500 text-black' :
                               m.role === 'admin' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                               'bg-white/5 text-slate-400'
                             }`}>
                                {m.role}
                             </span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-mono italic opacity-60 truncate max-w-[120px]">{m.email}</p>
                       </div>
                    </div>

                    {isAdmin && m.id !== profile?.id && m.role !== 'owner' && (
                       <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <select 
                            className="bg-black border border-white/10 rounded-lg text-[10px] font-black uppercase py-1 px-2 outline-none hover:border-emerald-500/30 transition-all"
                            value={m.role}
                            onChange={(e) => updateMemberRole(m.id, e.target.value)}
                            disabled={updatingRole === m.id}
                          >
                             <option value="member">Member</option>
                             <option value="admin">Admin</option>
                             <option value="observer">Observer</option>
                          </select>
                          <button 
                            onClick={() => removeMember(m.id)}
                            disabled={removingMember === m.id}
                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                            title="Remove from Household"
                          >
                             <UserMinus size={14} />
                          </button>
                       </div>
                    )}
                 </div>
              ))}
           </div>
        </div>

        {/* Invitation Control */}
        <div className="space-y-4 pt-6 border-t border-white/5">
           <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                   <UserCheck size={14} className="text-emerald-500" />
                   Invite New Member
                </h4>
                <p className="text-xs text-secondary opacity-40 font-bold tracking-tight">Expand your household's collaborative access</p>
              </div>
           </div>

           <div className="flex gap-3">
              <input 
                type="email"
                placeholder="Member's email address (optional)..."
                className="flex-1 bg-black/40 border border-white/5 p-4 rounded-2xl text-sm font-bold focus:border-emerald-500/30 transition-all outline-none"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
              />
              <button 
                onClick={generateInvite}
                disabled={loading || !isAdmin}
                className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:grayscale text-black font-black uppercase tracking-widest text-xs rounded-2xl transition-all flex items-center gap-3 shadow-lg shadow-emerald-500/20"
              >
                {loading ? <Plus className="animate-spin" /> : <Send size={16} />}
                {inviteEmail ? 'Send Invite' : 'Generate Link'}
              </button>
           </div>

           {inviteUrl && (
             <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-center justify-between gap-4"
             >
                <div className="flex-1 overflow-hidden">
                   <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest mb-1">Invite Link Active (24h)</p>
                   <code className="text-xs text-slate-300 font-mono break-all">{inviteUrl}</code>
                </div>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(inviteUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className={`p-3 rounded-xl transition-all ${copied ? 'bg-emerald-500 text-black' : 'bg-white/5 text-emerald-500 hover:bg-white/10'}`}
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                </button>
             </motion.div>
           )}
        </div>
      </div>

      {/* Danger Zone */}
      {isOwner && (
        <div className="p-8 border-2 border-dashed border-red-500/20 rounded-[2rem] bg-red-500/[0.02] flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
                 <ShieldAlert size={24} />
              </div>
              <div>
                 <h3 className="text-xl font-black italic tracking-tight uppercase">Danger Zone</h3>
                 <p className="text-xs font-bold text-red-500/60 uppercase tracking-widest">Permanent household deactivation</p>
              </div>
           </div>
           <button 
             onClick={() => setIsArchiveModalOpen(true)}
             className="px-6 py-3 border border-red-500/30 hover:bg-red-500 text-red-500 hover:text-black font-black uppercase tracking-widest text-[10px] rounded-xl transition-all"
           >
              Archive Household
           </button>
        </div>
      )}

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Household"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={confirmCreate} disabled={creating || !newHouseholdName}>
              {creating ? 'Creating...' : 'Create Household'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-secondary text-sm font-medium">Enter a name for your new household. You can invite members after creation.</p>
          <Input 
            label="Household Name"
            placeholder="e.g. Smith Residence, Vacation Fund"
            value={newHouseholdName}
            onChange={(e) => setNewHouseholdName(e.target.value)}
            autoFocus
          />
        </div>
      </Modal>

      <Modal
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        title="Archive Household?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsArchiveModalOpen(false)}>Nevermind</Button>
            <Button variant="danger" onClick={archiveHousehold} disabled={archiving}>
              {archiving ? 'Archiving...' : 'Confirm Archival'}
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-center py-4">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500 mb-4 animate-pulse">
             <ShieldAlert size={40} />
          </div>
          <p className="text-white font-bold text-lg">Are you absolutely sure?</p>
          <p className="text-slate-400 text-sm">
            Archiving this household will restrict access for all members. All historical data will be moved to the <strong>Archival Vault</strong> and can only be restored by the owner.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default HouseholdRegistry;
