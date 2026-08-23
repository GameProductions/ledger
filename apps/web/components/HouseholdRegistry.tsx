import React, { useState, useMemo } from 'react';
import { Shield, Edit3, Plus, Send, Copy, Check, Users, UserMinus, ShieldAlert, Trash2, ChevronDown, UserCheck, KeyRound, Power } from 'lucide-react';
import { AddressPanel } from './AddressPanel';
import { AddressVisibilitySettings } from './AddressVisibilitySettings';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { formatHumanError } from '../utils/error-handler';
import { getApiUrl } from '../utils/api';
import { InlineToast } from './ui/InlineToast';
import { sanitizeImageUrl } from '../utils/security';

const API_URL = getApiUrl();

const formatJoinedAt = (joinedAt?: string | null) => {
  if (!joinedAt) return '—';
  const joined = new Date(joinedAt);
  if (isNaN(joined.getTime())) return '—';
  const diff = Date.now() - joined.getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
};

const joinMethodLabel = (method?: string | null) => {
  if (!method) return '—';
  const map: Record<string, string> = {
    create: 'Founder',
    invite: 'Invite link',
    code: 'Invite code',
    system: 'Seeded'
  };
  return map[method] || method;
};

const HouseholdRegistry: React.FC = () => {
  const { householdId } = useAuth();
  const { data: profile } = (useApi('/api/user/profile') as any);
  const { data: households } = (useApi('/api/user/households') as any);
  const { data: members, mutate: mutateMembers } = (useApi(householdId ? `/api/user/households/${householdId}/members` : null) as any);
  const { data: invites, mutate: mutateInvites } = (useApi(householdId ? `/api/user/households/${householdId}/invites` : null) as any);
  
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
  const [inviteCode, setInviteCode] = useState('');
  const [inviteMethod, setInviteMethod] = useState<'link' | 'code' | 'both'>('link');
  const [inviteCodeLength, setInviteCodeLength] = useState<6 | 8>(6);
  const [inviteLifetimeHours, setInviteLifetimeHours] = useState<24 | 168>(24);
  const [inviteReusable, setInviteReusable] = useState(true);
  const [showInviteOptions, setShowInviteOptions] = useState(false);
  const [revokingInviteId, setRevokingInviteId] = useState<string | null>(null);
  const [togglingInvites, setTogglingInvites] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newHouseholdName, setNewHouseholdName] = useState('');
  const [creating, setCreating] = useState(false);
  
  // Member Management State
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);

  React.useEffect(() => {
    if (currentHousehold?.name) {
      setHouseholdName(currentHousehold.name);
    }
  }, [currentHousehold]);

  const handleRename = async () => {
    const token = localStorage.getItem('ledger_token');
    try {
      const res = (await fetch(`${API_URL}/api/user/households/${householdId}`, {
              method: 'PATCH',
              headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ name: householdName })
            }) as any);
      if (res.ok) {
        showToast('Household renamed successfully', 'success');
        window.location.reload();
        setIsRenaming(false);
      } else {
        const err = (await res.json() as any);
        showToast(formatHumanError(err, 'Failed to rename household'), 'error');
      }
    } catch (err: any) {
      console.error(err);
      showToast(formatHumanError(err, 'Failed to connect to servers'), 'error');
    }
  };

  const updateMemberRole = async (memberId: string, role: string) => {
    setUpdatingRole(memberId);
    const token = localStorage.getItem('ledger_token');
    try {
      const res = (await fetch(`${API_URL}/api/user/households/${householdId}/members/${memberId}`, {
              method: 'PATCH',
              headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ role })
            }) as any);
      if (res.ok) {
        showToast('Member role updated', 'success');
        mutateMembers();
      } else {
        const err = (await res.json() as any);
        showToast(formatHumanError(err, 'Failed to update role'), 'error');
      }
    } finally {
      setUpdatingRole(null);
    }
  };

  const removeMember = async (memberId: string) => {
    setRemovingMember(memberId);
    const token = localStorage.getItem('ledger_token');
    try {
      const res = (await fetch(`${API_URL}/api/user/households/${householdId}/members/${memberId}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            }) as any);
      if (res.ok) {
        showToast('Member removed', 'success');
        setConfirmRemoveId(null);
        mutateMembers();
      } else {
        const err = (await res.json() as any);
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
      const res = (await fetch(`${API_URL}/api/user/households/${householdId}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            }) as any);
      if (res.ok) {
        showToast('Household archived successfully', 'success');
        window.location.href = '/#/';
        window.location.reload();
      } else {
        const err = (await res.json() as any);
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
      const res = (await fetch(`${API_URL}/api/user/households`, {
              method: 'POST',
              headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ name: newHouseholdName })
            }) as any);
      if (res.ok) {
        showToast('New household created', 'success');
        window.location.reload(); // Switch context
      } else {
        const err = (await res.json() as any);
        showToast(formatHumanError(err, 'Failed to create household'), 'error');
      }
    } catch (err: any) {
      showToast(formatHumanError(err, 'Network error while creating household'), 'error');
    } finally {
      setCreating(false);
      setIsCreateModalOpen(false);
      setNewHouseholdName('');
    }
  };

  const generateInvite = async () => {
    setLoading(true);
    setInviteUrl('');
    setInviteCode('');
    const token = localStorage.getItem('ledger_token');
    try {
      const res = (await fetch(`${API_URL}/api/user/households/invite`, {
              method: 'POST',
              headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'x-household-id': householdId || ''
              },
              body: JSON.stringify({
                email: inviteEmail || undefined,
                method: inviteMethod,
                codeLength: inviteMethod === 'link' ? undefined : inviteCodeLength,
                codeLifetimeHours: inviteLifetimeHours,
                reusable: inviteReusable
              })
            }) as any);
      const data = (await res.json() as any);
      if (res.ok) {
        if (inviteMethod !== 'code') {
          setInviteUrl(`${window.location.origin}/${data.url}`);
        }
        if (inviteMethod !== 'link' && data.code) {
          setInviteCode(data.code);
        }
        if (inviteEmail) {
           showToast(`Invitation sent to ${inviteEmail}`, 'success');
        } else if (inviteMethod !== 'link' && data.code) {
           showToast('Invite code generated', 'success');
        } else {
           showToast('Invite link created', 'success');
        }
        mutateInvites();
      } else {
        showToast(formatHumanError(data, 'Invite generation failed'), 'error');
      }
    } catch (err: any) {
      showToast(formatHumanError(err, 'Network error while generating invite'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const revokeInvite = async (inviteId: string) => {
    setRevokingInviteId(inviteId);
    const token = localStorage.getItem('ledger_token');
    try {
      const res = (await fetch(`${API_URL}/api/user/households/${householdId}/invites/${inviteId}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            }) as any);
      if (res.ok) {
        showToast('Invitation revoked', 'success');
        mutateInvites();
      } else {
        const err = (await res.json() as any);
        showToast(formatHumanError(err, 'Failed to revoke invite'), 'error');
      }
    } catch (err: any) {
      showToast(formatHumanError(err, 'Network error while revoking invite'), 'error');
    } finally {
      setRevokingInviteId(null);
    }
  };

  const toggleInvitesEnabled = async () => {
    setTogglingInvites(true);
    const token = localStorage.getItem('ledger_token');
    const next = !(currentHousehold?.invitesEnabled ?? true);
    try {
      const res = (await fetch(`${API_URL}/api/user/households/${householdId}`, {
              method: 'PATCH',
              headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ invitesEnabled: next })
            }) as any);
      if (res.ok) {
        showToast(next ? 'Invites enabled for this household' : 'Invites disabled for this household', 'success');
        window.location.reload();
      } else {
        const err = (await res.json() as any);
        showToast(formatHumanError(err, 'Failed to toggle invites'), 'error');
      }
    } catch (err: any) {
      showToast(formatHumanError(err, 'Network error while toggling invites'), 'error');
    } finally {
      setTogglingInvites(false);
    }
  };

  const copyInviteValue = (value: string) => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
                        <button onClick={handleRename} className="px-3 py-1 bg-emerald-500 text-black text-xs font-black rounded hover:scale-105 transition-all">Save</button>
                        <button onClick={() => {
                          setHouseholdName(currentHousehold?.name || '');
                          setIsRenaming(false);
                        }} className="px-3 py-1 bg-white/10 text-white text-xs font-black rounded hover:bg-white/20 transition-all">Cancel</button>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-2xl font-black italic tracking-tight leading-none">{currentHousehold?.name || 'Personal Account'}</h3>
                        {isAdmin && (
                          <button onClick={() => setIsRenaming(true)} className="text-slate-500 hover:text-emerald-500">
                            <Edit3 size={16} />
                          </button>
                        )}
                      </>
                    )}
                 </div>
                 <p className="text-[10px] font-black tracking-[0.3em] text-emerald-500/60 mt-1">Current Household</p>
              </div>
           </div>
           <button 
             onClick={() => setIsCreateModalOpen(true)}
             className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-black tracking-widest text-secondary transition-all"
           >
              <Plus size={14} />
              New Household
           </button>
        </div>

        {/* Address Section */}
        <div className="pt-4 pb-2 border-t border-white/5 space-y-4">
          <AddressPanel householdId={householdId!} userRole={userRole} />
          {isOwner && householdId && (
            <AddressVisibilitySettings householdId={householdId} />
          )}
        </div>

        {/* Members List */}
        <div className="space-y-4 pt-6 border-t border-white/5 mb-8">
           <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-black tracking-widest flex items-center gap-2">
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
                         src={sanitizeImageUrl(m.avatarUrl) || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(m.id)}`} 
                         className="w-10 h-10 rounded-xl border border-white/10" 
                         alt={m.displayName || ''} 
                       />
                       <div>
                          <div className="flex items-center gap-2">
                             <p className="text-sm font-black tracking-tight">{m.displayName || 'System User'}</p>
                             <span className={`text-[10px] px-1.5 py-0.5 rounded font-black tracking-widest ${ m.role === 'owner' ? 'bg-emerald-500 text-black' : m.role === 'admin' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-white/5 text-slate-400' }`}>
                                {m.role}
                             </span>
                          </div>
                           <p className="text-[10px] text-slate-500 font-mono italic opacity-60 truncate max-w-[120px]">{m.email}</p>
                           <p className="text-[10px] text-slate-600 font-bold tracking-wide">
                              Joined {formatJoinedAt(m.joinedAt)} · {joinMethodLabel(m.joinMethod)}
                           </p>
                       </div>
                    </div>

                    {isAdmin && m.id !== profile?.id && m.role !== 'owner' && (
                       <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <select 
                            className="bg-black border border-white/10 rounded-lg text-[10px] font-black py-1 px-2 outline-none hover:border-emerald-500/30 transition-all"
                            value={m.role}
                            onChange={(e) => updateMemberRole(m.id, e.target.value)}
                            disabled={updatingRole === m.id}
                          >
                             <option value="member">Member</option>
                             <option value="admin">Admin</option>
                             <option value="observer">Observer</option>
                          </select>
                          
                          {confirmRemoveId === m.id ? (
                            <InlineToast 
                              message="Remove member?" 
                              type="confirm" 
                              onConfirm={() => removeMember(m.id)} 
                              onCancel={() => setConfirmRemoveId(null)} 
                            />
                          ) : (
                            <button 
                              onClick={() => setConfirmRemoveId(m.id)}
                              disabled={removingMember === m.id}
                              className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                              title="Remove from Household"
                            >
                               <UserMinus size={14} />
                            </button>
                          )}
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
                <h4 className="text-sm font-black tracking-widest flex items-center gap-2">
                   <UserCheck size={14} className="text-emerald-500" />
                   Invite New Member
                </h4>
                <p className="text-xs text-secondary opacity-40 font-bold tracking-tight">Expand your household's collaborative access</p>
              </div>
              {isAdmin && (
                <button
                  onClick={toggleInvitesEnabled}
                  disabled={togglingInvites}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest transition-all border ${currentHousehold?.invitesEnabled === false ? 'border-red-500/30 text-red-500 bg-red-500/5' : 'border-emerald-500/30 text-emerald-500 bg-emerald-500/5'}`}
                  title="Toggle household-wide invites"
                >
                  <Power size={12} />
                  {currentHousehold?.invitesEnabled === false ? 'Invites Off' : 'Invites On'}
                </button>
              )}
           </div>

           {currentHousehold?.invitesEnabled === false && (
             <div className="p-3 rounded-2xl border border-red-500/20 bg-red-500/5 text-xs font-bold text-red-400/80 tracking-wide">
                Invites are currently disabled for this household. Turn them on to generate new invites.
             </div>
           )}

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
                className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:grayscale text-black font-black tracking-widest text-xs rounded-2xl transition-all flex items-center gap-3 shadow-lg shadow-emerald-500/20"
              >
                {loading ? <Plus className="animate-spin" /> : <Send size={16} />}
                {inviteEmail ? 'Send Invite' : 'Generate Link'}
              </button>
           </div>

           {isAdmin && (
             <>
              <button
                onClick={() => setShowInviteOptions(!showInviteOptions)}
                className="flex items-center gap-2 text-[10px] font-black tracking-widest text-slate-500 hover:text-emerald-500 transition-all"
              >
                <ChevronDown size={12} className={`transition-transform ${showInviteOptions ? 'rotate-180' : ''}`} />
                Invite Options
              </button>

              {showInviteOptions && (
                <div className="p-4 bg-black/40 border border-white/5 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <label className="block">
                     <span className="text-[10px] font-black tracking-widest text-secondary block mb-1">DELIVERY METHOD</span>
                     <select
                       className="w-full bg-black border border-white/10 rounded-lg text-xs font-black py-2 px-2 outline-none hover:border-emerald-500/30 transition-all"
                       value={inviteMethod}
                       onChange={e => setInviteMethod(e.target.value as any)}
                     >
                        <option value="link">Invite link</option>
                        <option value="code">Join code</option>
                        <option value="both">Link + code</option>
                     </select>
                   </label>
                   <label className="block">
                     <span className="text-[10px] font-black tracking-widest text-secondary block mb-1">CODE LENGTH</span>
                     <select
                       className="w-full bg-black border border-white/10 rounded-lg text-xs font-black py-2 px-2 outline-none hover:border-emerald-500/30 transition-all disabled:opacity-40"
                       value={inviteCodeLength}
                       onChange={e => setInviteCodeLength(Number(e.target.value) as any)}
                       disabled={inviteMethod === 'link'}
                     >
                        <option value={6}>6 characters</option>
                        <option value={8}>8 characters</option>
                     </select>
                   </label>
                   <label className="block">
                     <span className="text-[10px] font-black tracking-widest text-secondary block mb-1">EXPIRY</span>
                     <select
                       className="w-full bg-black border border-white/10 rounded-lg text-xs font-black py-2 px-2 outline-none hover:border-emerald-500/30 transition-all"
                       value={inviteLifetimeHours}
                       onChange={e => setInviteLifetimeHours(Number(e.target.value) as any)}
                     >
                        <option value={24}>24 hours</option>
                        <option value={168}>7 days</option>
                     </select>
                   </label>
                   <label className="flex items-center gap-3 pt-5 cursor-pointer select-none">
                     <input
                       type="checkbox"
                       checked={inviteReusable}
                       onChange={e => setInviteReusable(e.target.checked)}
                       className="w-4 h-4 accent-emerald-500"
                     />
                     <span className="text-[10px] font-black tracking-widest text-secondary">REUSABLE INVITE</span>
                   </label>
                </div>
              )}
             </>
            )}

            {inviteUrl && (
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-center justify-between gap-4">
                 <div className="flex-1 overflow-hidden">
                    <p className="text-[10px] text-emerald-500 font-black tracking-widest mb-1">Invite Link Active ({inviteLifetimeHours}h)</p>
                    <code className="text-xs text-slate-300 font-mono break-all">{inviteUrl}</code>
                 </div>
                 <button 
                   onClick={() => copyInviteValue(inviteUrl)}
                   className={`p-3 rounded-xl transition-all ${copied ? 'bg-emerald-500 text-black' : 'bg-white/5 text-emerald-500 hover:bg-white/10'}`}
                 >
                   {copied ? <Check size={18} /> : <Copy size={18} />}
                 </button>
              </div>
            )}

            {inviteCode && (
              <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl flex items-center justify-between gap-4">
                 <div className="flex-1">
                    <p className="text-[10px] text-blue-400 font-black tracking-widest mb-1">Join Code Active ({inviteLifetimeHours}h{inviteReusable ? ' · Reusable' : ''})</p>
                    <code className="text-2xl font-mono font-black tracking-[0.4em] text-blue-300">{inviteCode}</code>
                 </div>
                 <button 
                   onClick={() => copyInviteValue(inviteCode)}
                   className={`p-3 rounded-xl transition-all ${copied ? 'bg-emerald-500 text-black' : 'bg-white/5 text-blue-400 hover:bg-white/10'}`}
                 >
                   {copied ? <Check size={18} /> : <Copy size={18} />}
                 </button>
              </div>
            )}

            {isAdmin && Array.isArray(invites) && invites.length > 0 && (
              <div className="space-y-2 pt-2">
                 <p className="text-[10px] font-black tracking-widest text-slate-500 flex items-center gap-2">
                    <KeyRound size={12} /> ACTIVE INVITES ({invites.length})
                 </p>
                 {(invites as any[]).map((inv: any) => {
                    const isExpired = inv.expiresAt && new Date(inv.expiresAt) < new Date();
                    return (
                      <div key={inv.id} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between gap-3">
                         <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {inv.joinCode && (
                                <code className="font-mono font-black tracking-[0.25em] text-blue-300 text-sm">{inv.joinCode}</code>
                              )}
                              {inv.joinCode ? (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-black tracking-widest">CODE</span>
                              ) : (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-black tracking-widest">LINK</span>
                              )}
                              {inv.disabledAt && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 font-black tracking-widest">REVOKED</span>
                              )}
                              {isExpired && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400 font-black tracking-widest">EXPIRED</span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 font-bold tracking-wide mt-1">
                              {inv.reusable ? 'Reusable' : 'Single-use'} · {inv.joinCount || 0} joined
                              {inv.expiresAt ? ` · Expires ${new Date(inv.expiresAt).toLocaleString()}` : ''}
                            </p>
                         </div>
                         <button
                           onClick={() => revokeInvite(inv.id)}
                           disabled={revokingInviteId === inv.id}
                           className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50"
                           title="Revoke invite"
                         >
                            <Trash2 size={14} />
                         </button>
                      </div>
                    )
                 })}
              </div>
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
                 <h3 className="text-xl font-black italic tracking-tight">Danger Zone</h3>
                 <p className="text-xs font-bold text-red-500/60 tracking-widest">Permanent household deactivation</p>
              </div>
           </div>
           <button 
             onClick={() => setIsArchiveModalOpen(true)}
             className="px-6 py-3 border border-red-500/30 hover:bg-red-500 text-red-500 hover:text-black font-black tracking-widest text-[10px] rounded-xl transition-all"
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
