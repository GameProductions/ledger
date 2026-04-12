import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { Megaphone, Ticket, Plus, Trash2, Send, Clock, ShieldCheck, Mail } from 'lucide-react';

export const AdminCommandCenter: React.FC = () => {
  const { token } = useAuth();
  const { showToast } = useToast();
  const { data: announcements, mutate: mutateAnnouncements } = useApi('/api/system-pcc/announcements');
  const { data: invitations, mutate: mutateInvitations } = useApi('/api/system-pcc/invitations');
  
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content_md: '', priority: 'info' });
  const [inviteRole, setInviteRole] = useState<'super_admin' | 'operator'>('super_admin');

  const createAnnouncement = async () => {
    if (!newAnnouncement.title || !newAnnouncement.content_md) return;
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/system-pcc/announcements`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newAnnouncement)
      });
      showToast('Announcement Broadcasted', 'success');
      setNewAnnouncement({ title: '', content_md: '', priority: 'info' });
      mutateAnnouncements();
    } catch (err) {
      showToast('Failed to broadcast', 'error');
    }
  };

  const deleteAnnouncement = async (id: string) => {
    if (!confirm('Permanent delete?')) return;
    await fetch(`${import.meta.env.VITE_API_URL}/api/system-pcc/announcements/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    mutateAnnouncements();
  };

  const createInvite = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/system-pcc/invitations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: inviteRole, expires_in_hours: 24 })
      });
      const data = await res.json();
      if (data.token) {
        navigator.clipboard.writeText(`${window.location.origin}/#/claim?token=${data.token}`);
        showToast('Invite copied to clipboard', 'success');
        mutateInvitations();
      }
    } catch (err) {
      showToast('failed to create invite', 'error');
    }
  };

  const deleteInvite = async (tokenStr: string) => {
    await fetch(`${import.meta.env.VITE_API_URL}/api/system-pcc/invitations/${tokenStr}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    mutateInvitations();
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-1000">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black italic tracking-tighter uppercase text-white mb-2">Command Center</h2>
          <p className="text-secondary text-sm uppercase tracking-widest font-bold opacity-60">System-wide orchestrator & broadcasts</p>
        </div>
        <div className="px-6 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-3">
           <ShieldCheck size={20} className="text-emerald-500" />
           <span className="text-xs font-black uppercase tracking-widest text-emerald-500">Global Admin Root</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Announcements Section */}
        <section className="space-y-8">
          <div className="card p-8 bg-deep/40 backdrop-blur-3xl border-glass-border">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-3 border-b border-glass-border pb-4 uppercase tracking-tighter">
              <Megaphone size={24} className="text-primary" />
              Emergency Broadcast
            </h3>
            
            <div className="space-y-4">
              <input 
                value={newAnnouncement.title}
                onChange={e => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                placeholder="Broadcast Headline"
                className="w-full bg-black/40 border border-glass-border rounded-xl p-4 text-sm font-bold focus:border-primary transition-all"
              />
              <textarea 
                value={newAnnouncement.content_md}
                onChange={e => setNewAnnouncement({...newAnnouncement, content_md: e.target.value})}
                placeholder="Markdown content..."
                rows={4}
                className="w-full bg-black/40 border border-glass-border rounded-xl p-4 text-sm font-bold focus:border-primary transition-all resize-none"
              />
              <div className="flex gap-4">
                <select 
                  value={newAnnouncement.priority}
                  onChange={e => setNewAnnouncement({...newAnnouncement, priority: e.target.value as any})}
                  className="flex-1 bg-black/40 border border-glass-border rounded-xl p-4 text-sm font-black uppercase tracking-widest appearance-none"
                >
                  <option value="info">Standard Info</option>
                  <option value="warning">System Warning</option>
                  <option value="critical">Critical/Maintenance</option>
                </select>
                <button onClick={createAnnouncement} className="flex-1 bg-primary text-white font-black uppercase tracking-widest rounded-xl hover:bg-secondary transition-all flex items-center justify-center gap-2">
                  <Send size={16} /> Broadcast
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-secondary ml-2">Active Signals</h4>
            {announcements?.length > 0 ? announcements.map((a: any) => (
              <div key={a.id} className="card p-4 border-l-4 border-l-primary flex justify-between items-center group">
                <div>
                  <div className="font-bold text-sm">{a.title}</div>
                  <div className="text-[10px] uppercase font-black tracking-widest opacity-40 mt-1">
                    {a.priority} • {new Date(a.created_at).toLocaleString()}
                  </div>
                </div>
                <button onClick={() => deleteAnnouncement(a.id)} className="p-2 text-red-500/40 hover:text-red-500 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            )) : <p className="text-center text-xs text-secondary italic opacity-20">No active broadcasts</p>}
          </div>
        </section>

        {/* Invitations Section */}
        <section className="space-y-8">
           <div className="card p-8 bg-deep/40 backdrop-blur-3xl border-glass-border">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-3 border-b border-glass-border pb-4 uppercase tracking-tighter">
              <Ticket size={24} className="text-secondary" />
              Administrative Invites
            </h3>
            
            <p className="text-xs text-secondary mb-6 font-medium leading-relaxed">
              Generate volatile access tokens for administrative onboarding. Tokens expire strictly after 24 hours.
            </p>

            <div className="flex gap-4">
              <select 
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as any)}
                className="flex-1 bg-black/40 border border-glass-border rounded-xl p-4 text-sm font-black uppercase tracking-widest appearance-none"
              >
                <option value="super_admin">God Mode Access</option>
                <option value="operator">System Operator</option>
              </select>
              <button onClick={createInvite} className="flex-1 bg-secondary text-white font-black uppercase tracking-widest rounded-xl hover:bg-primary transition-all flex items-center justify-center gap-2">
                <Plus size={16} /> Generate & Copy
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-secondary ml-2">Open Channels</h4>
            {invitations?.length > 0 ? invitations.map((i: any) => (
              <div key={i.token} className="card p-4 border-l-4 border-l-secondary flex justify-between items-center group">
                <div>
                  <div className="font-mono text-xs text-primary">{i.token.substring(0, 16)}...</div>
                  <div className="text-[10px] uppercase font-black tracking-widest opacity-40 mt-1 flex items-center gap-2">
                    <Clock size={10} />
                    Expires {new Date(i.expires_at).toLocaleTimeString()}
                    <span className="text-secondary">•</span>
                    {i.role}
                  </div>
                </div>
                <button onClick={() => deleteInvite(i.token)} className="p-2 text-red-500/40 hover:text-red-500 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            )) : <p className="text-center text-xs text-secondary italic opacity-20">No active invitations</p>}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminCommandCenter;
