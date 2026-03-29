import React, { useState } from 'react';
import { Shield, Edit3, Plus, Send, Copy, Check, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { useApi } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';

const HouseholdRegistry: React.FC = () => {
  const { data: profile, mutate: mutateProfile } = useApi('/api/user/profile');
  const { showToast } = useToast();
  const [isRenaming, setIsRenaming] = useState(false);
  const [householdName, setHouseholdName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (profile?.household_name) {
      setHouseholdName(profile.household_name);
    }
  }, [profile]);

  const handleRename = async () => {
    const token = localStorage.getItem('ledger_token');
    const householdId = localStorage.getItem('ledger_household_id');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/user/households/${householdId}`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: householdName })
      });
      if (res.ok) {
        showToast('Household renamed successfully', 'success');
        mutateProfile();
        setIsRenaming(false);
      }
    } catch (err) {
      showToast('Failed to rename household', 'error');
    }
  };

  const handleCreate = async () => {
    const name = prompt('Enter new household name:');
    if (!name) return;
    const token = localStorage.getItem('ledger_token');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/user/households`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        showToast('New household created', 'success');
        window.location.reload(); // Switch context
      }
    } catch (err) {
      showToast('Failed to create household', 'error');
    }
  };

  const generateInvite = async () => {
    setLoading(true);
    const token = localStorage.getItem('ledger_token');
    const householdId = localStorage.getItem('ledger_household_id');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/user/households/invite`, {
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
      }
    } catch (err) {
      showToast('Invite generation failed', 'error');
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
                      <input 
                        className="bg-black border border-emerald-500/30 rounded px-2 py-1 text-lg font-black italic tracking-tight outline-none"
                        value={householdName}
                        onChange={e => setHouseholdName(e.target.value)}
                        onBlur={handleRename}
                        onKeyDown={e => e.key === 'Enter' && handleRename()}
                        autoFocus
                      />
                    ) : (
                      <h3 className="text-2xl font-black italic tracking-tight uppercase leading-none">{profile?.household_name || 'Personal Account'}</h3>
                    )}
                    <button onClick={() => setIsRenaming(!isRenaming)} className="text-slate-500 hover:text-emerald-500">
                       <Edit3 size={16} />
                    </button>
                 </div>
                 <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500/60 mt-1">Current Household</p>
              </div>
           </div>
           <button 
             onClick={handleCreate}
             className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-black uppercase tracking-widest text-secondary transition-all"
           >
              <Plus size={14} />
              New Household
           </button>
        </div>

        {/* Invitation Control */}
        <div className="space-y-4 pt-6 border-t border-white/5">
           <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                   <Users size={14} className="text-emerald-500" />
                   Member Invites
                </h4>
                <p className="text-xs text-secondary opacity-40 font-bold tracking-tight">Invite others to join your household</p>
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
                disabled={loading}
                className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-black font-black uppercase tracking-widest text-xs rounded-2xl transition-all flex items-center gap-3 shadow-lg shadow-emerald-500/20"
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
    </div>
  );
};

export default HouseholdRegistry;
