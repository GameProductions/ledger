import React, { useState, useEffect } from 'react';
import OwnerPortal from './OwnerPortal';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { InlineToast } from '../../components/ui/InlineToast';
import { Megaphone, Ticket, Plus, Trash2, Send, Clock, ShieldCheck, Lock, Unlock, FlaskConical } from 'lucide-react';

import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';
import { getApiUrl } from '../../utils/api';
import { AnimatePresence } from 'framer-motion';

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [systemLogs, setSystemLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const { secureFetch, token } = useAuth();
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [loadingMaintenance, setLoadingMaintenance] = useState(false);

  // Communications State
  const { data: announcements = [], mutate: mutateAnnouncements } = (useApi('/api/admin/communications/announcements') as any);
  const { data: invitations = [], mutate: mutateInvitations } = (useApi('/api/admin/communications/invitations') as any);
  
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', contentMd: '', priority: 'info' });
  const [inviteRole, setInviteRole] = useState<'owner' | 'operator'>('owner');
  const [confirmDeleteAnnouncementId, setConfirmDeleteAnnouncementId] = useState<string | null>(null);
  const [confirmDeleteInviteToken, setConfirmDeleteInviteToken] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'system' | 'security' | 'household' | 'user'>('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, logsRes, configRes] = (await Promise.all([
                  secureFetch(`/api/admin/stats`),
                  secureFetch(`/api/admin/audit`),
                  secureFetch(`/api/admin/system/config`)
                ]) as any);
        
        const statsData = (await statsRes.json() as any);
        const logsData = (await logsRes.json() as any);
        const configData = (await configRes.json() as any);
        
        if (statsData.success) setStats(statsData.data);
        if (logsData.success) setSystemLogs(logsData.data);

        if (configData.success) {
          const maintenance = configData.data.find((c: any) => c.configKey === 'MAINTENANCE_MODE');
          setMaintenanceEnabled(maintenance?.configValue === 'true');
        }
      } catch (err: any) {
        console.error('Failed to fetch PCC data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleToggleMaintenance = async () => {
    setLoadingMaintenance(true);
    try {
      const res = (await secureFetch(`/api/admin/system/maintenance`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ enabled: !maintenanceEnabled })
            }) as any);
      const data = (await res.json() as any);
      if (data.success) {
        setMaintenanceEnabled(!maintenanceEnabled);
        showToast(`Maintenance mode ${!maintenanceEnabled ? 'enabled' : 'disabled'}`, 'info');
      }
    } catch (err: any) {
      showToast('Action failed', 'error');
    } finally {
      setLoadingMaintenance(false);
    }
  };

  const createAnnouncement = async () => {
    if (!newAnnouncement.title || !newAnnouncement.contentMd) return;
    try {
      const res = (await fetch(`${getApiUrl()}/api/admin/communications/announcements`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(newAnnouncement)
            }) as any);
      const data = (await res.json() as any);
      if (data.success) {
        showToast('Message Sent', 'success');
        setNewAnnouncement({ title: '', contentMd: '', priority: 'info' });
        mutateAnnouncements();
      }
    } catch (err: any) {
      showToast('Failed to send', 'error');
    }
  };

  const deleteAnnouncement = async (id: string) => {
    const res = (await fetch(`${getApiUrl()}/api/admin/communications/announcements/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        }) as any);
    const data = (await res.json() as any);
    if (data.success) {
      setConfirmDeleteAnnouncementId(null);
      mutateAnnouncements();
    }
  };

  const createInvite = async () => {
    try {
      const res = (await fetch(`${getApiUrl()}/api/admin/communications/invitations`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ role: inviteRole, expires_in_hours: 24 })
            }) as any);
      const data = (await res.json() as any);
      if (data.success && data.token) {
        navigator.clipboard.writeText(`${window.location.origin}/#/claim?token=${data.token}`);
        showToast('Invite copied to clipboard', 'success');
        mutateInvitations();
      }
    } catch (err: any) {
      showToast('failed to create invite', 'error');
    }
  };

  const deleteInvite = async (tokenStr: string) => {
    const res = (await fetch(`${getApiUrl()}/api/admin/communications/invitations/${tokenStr}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        }) as any);
    const data = (await res.json() as any);
    if (data.success) {
      setConfirmDeleteInviteToken(null);
      mutateInvitations();
    }
  };

  const [seedingDemo, setSeedingDemo] = useState(false);
  const [demoCredentials, setDemoCredentials] = useState<any>(null);

  const handleSeedDemo = async () => {
    setSeedingDemo(true);
    setDemoCredentials(null);
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/demo/seed`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data: any = await res.json();
      if (data.success) {
        if (data.credentials) setDemoCredentials(data.credentials);
        showToast(data.message, 'success');
      }
    } catch {
      showToast('Failed to seed demo data', 'error');
    }
    setSeedingDemo(false);
  };

  if (loading) return <OwnerPortal activePath="#/admin/dashboard"><div className="animate-pulse text-sm">Loading Platform Command Center...</div></OwnerPortal>;

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers || 0, color: 'emerald' },
    { label: 'Active Today', value: stats?.activeToday || 0, color: 'blue' },
    { label: 'Households', value: stats?.totalHouseholds || 0, color: 'purple' },
    { label: 'Platform Version', value: stats?.version || '0.0.0', color: 'orange' },
  ];

  return (
    <OwnerPortal activePath="#/admin/dashboard">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {statCards.map((stat) => (
          <div key={stat.label} className="p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-emerald-500/20 transition-all group overflow-hidden relative">
            <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-${stat.color}-500/10 blur-3xl`} />
            <p className="text-gray-400 text-sm font-medium mb-1 uppercase tracking-widest">{stat.label}</p>
            <p className="text-3xl font-black">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-12">
        <button
          onClick={handleSeedDemo}
          disabled={seedingDemo}
          className="p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-emerald-500/20 transition-all group overflow-hidden relative w-full text-left"
        >
          <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="flex items-center gap-4">
            <FlaskConical size={24} className="text-emerald-500" />
            <div>
              <p className="text-gray-400 text-sm font-medium uppercase tracking-widest">Demo Sandbox</p>
              <p className="text-lg font-black mt-1">
                {seedingDemo ? 'Seeding...' : 'Create Demo Environment'}
              </p>
            </div>
          </div>
        </button>
        {demoCredentials && (
          <div className="mt-4 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
            <p className="text-xs font-black uppercase tracking-widest text-emerald-500">Demo Credentials</p>
            <p className="text-sm font-mono">Username: <span className="text-white font-bold">{demoCredentials.username}</span></p>
            <p className="text-sm font-mono">Password: <span className="text-white font-bold">{demoCredentials.password}</span></p>
            <p className="text-sm font-mono">Household: <span className="text-white font-bold">{demoCredentials.householdId}</span></p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 p-8 rounded-3xl bg-white/5 border border-white/5 flex flex-col h-[600px]">
          <h3 className="text-lg font-bold mb-4">Activity & Safety Vault Logs</h3>
          
          <div className="space-y-3 mb-6">
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search logs by action, actor, IP, location..."
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold focus:border-emerald-500 transition-all outline-none"
            />
            
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'All Events' },
                { value: 'system', label: 'System & Config' },
                { value: 'security', label: 'Security & Auth' },
                { value: 'household', label: 'Households' },
                { value: 'user', label: 'Other/User' }
              ].map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setSelectedCategory(cat.value as any)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${
                    selectedCategory === cat.value 
                    ? 'bg-emerald-500 text-black border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                    : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {(() => {
              const filteredLogs = (systemLogs || []).filter(log => {
                const details = typeof log.detailsJson === 'string' ? JSON.parse(log.detailsJson) : (log.detailsJson || {});
                
                let description = '';
                switch(log.action) {
                  case 'TOGGLE_FEATURE':
                    description = `Changed visibility of ${log.targetName || 'feature'} to ${details.enabled ? 'Enabled' : 'Disabled'}`;
                    break;
                  case 'UPDATE_CONFIG':
                    description = `Updated system configuration ${details.key} to value "${details.value}"`;
                    break;
                  case 'PASSKEY_REGISTRATION':
                    description = `Registered new biometric passkey: ${details.credentialName || 'Unnamed'}`;
                    break;
                  case 'TOTP_ENABLED':
                    description = `Activated multi-factor authentication (Legacy TOTP - Decommissioned)`;
                    break;
                  case 'HOUSEHOLD_INVITE':
                    description = `Sent household invitation to ${details.email}`;
                    break;
                  case 'ADMIN_LOGIN':
                    description = `Administrative session established`;
                    break;
                  case 'USER_LOGIN':
                    description = `User session established`;
                    break;
                  default:
                    description = log.description || `Performed action: ${log.action}`;
                }
                
                const searchLower = searchQuery.toLowerCase();
                const matchesSearch = 
                  log.action.toLowerCase().includes(searchLower) ||
                  (log.actorName || 'System').toLowerCase().includes(searchLower) ||
                  description.toLowerCase().includes(searchLower) ||
                  (log.ipV4 || '').includes(searchLower) ||
                  (log.ipV6 || '').includes(searchLower) ||
                  (log.location || '').toLowerCase().includes(searchLower);

                if (!matchesSearch) return false;

                const isSystemAction = ['TOGGLE_FEATURE', 'UPDATE_CONFIG', 'TOGGLE_MAINTENANCE', 'SELF_HEAL', 'RUN_SECRET_MIGRATION', 'ADD_REGISTRY_ENTRY', 'DELETE_REGISTRY_ENTRY'].includes(log.action);
                const isSecurityAction = ['PASSKEY_REGISTRATION', 'TOTP_ENABLED', 'ADMIN_LOGIN', 'USER_LOGIN', 'ADMIN_BYPASS_ROOT'].includes(log.action);
                const isHouseholdAction = ['HOUSEHOLD_INVITE', 'JOIN_HOUSEHOLD', 'LEAVE_HOUSEHOLD'].includes(log.action);
                
                if (selectedCategory === 'system') return isSystemAction;
                if (selectedCategory === 'security') return isSecurityAction;
                if (selectedCategory === 'household') return isHouseholdAction;
                if (selectedCategory === 'user') return !isSystemAction && !isSecurityAction && !isHouseholdAction;
                
                return true;
              });

              if (filteredLogs.length > 0) {
                return filteredLogs.map((log) => {
                  const details = typeof log.detailsJson === 'string' ? JSON.parse(log.detailsJson) : (log.detailsJson || {});
                  
                  const renderDescription = () => {
                    switch(log.action) {
                      case 'TOGGLE_FEATURE':
                        return `Changed visibility of ${log.targetName || 'feature'} to ${details.enabled ? 'Enabled' : 'Disabled'}`;
                      case 'UPDATE_CONFIG':
                        return `Updated system configuration ${details.key} to value "${details.value}"`;
                      case 'PASSKEY_REGISTRATION':
                        return `Registered new biometric passkey: ${details.credentialName || 'Unnamed'}`;
                      case 'TOTP_ENABLED':
                        return `Activated multi-factor authentication (Legacy TOTP - Decommissioned)`;
                      case 'HOUSEHOLD_INVITE':
                        return `Sent household invitation to ${details.email}`;
                      case 'ADMIN_LOGIN':
                        return `Administrative session established`;
                      case 'USER_LOGIN':
                        return `User session established`;
                      default:
                        return log.description || `Performed action: ${log.action}`;
                    }
                  };

                  return (
                    <div key={log.id} className="p-4 bg-black/40 border border-white/5 rounded-2xl space-y-2.5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 text-sm ${
                            log.action.includes('LOGIN') ? 'bg-emerald-500/10 text-emerald-400' : 
                            log.action.includes('ADMIN') ? 'bg-orange-500/10 text-orange-400' : 'bg-cyan-500/10 text-cyan-400'
                          }`}>
                            {log.action.includes('LOGIN') ? '🔐' : log.action.includes('ADMIN') ? '⚡' : '📝'}
                          </div>
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">{log.action}</span>
                            <h4 className="text-xs font-bold text-slate-200 mt-0.5">{renderDescription()}</h4>
                          </div>
                        </div>
                        <span className="text-[9px] text-slate-500 font-mono uppercase">{new Date(log.createdAt).toLocaleString()}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] border-t border-white/5 pt-2">
                        <div>
                          <span className="text-slate-500 font-bold uppercase tracking-wider text-[8px] mr-1">Actor:</span>
                          <span className="font-bold text-emerald-400">{log.actorName || 'System'}</span>
                        </div>
                        {(log.ipV4 || log.ipV6) && (
                          <div>
                            <span className="text-slate-500 font-bold uppercase tracking-wider text-[8px] mr-1">IP:</span>
                            <span className="font-mono text-slate-400">{log.ipV4 || log.ipV6}</span>
                          </div>
                        )}
                        {log.location && (
                          <div>
                            <span className="text-slate-500 font-bold uppercase tracking-wider text-[8px] mr-1">Location:</span>
                            <span className="font-bold text-blue-400">{log.location}</span>
                          </div>
                        )}
                      </div>

                      <details className="text-[10px]">
                        <summary className="text-[9px] font-black uppercase tracking-widest text-slate-600 cursor-pointer hover:text-white transition-colors outline-none list-none flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                          Telemetry Payload
                        </summary>
                        <pre className="mt-2 p-3 rounded-lg bg-black/80 border border-white/5 font-mono text-[9px] text-slate-500 overflow-x-auto">
                          {JSON.stringify(details, null, 2)}
                        </pre>
                      </details>
                    </div>
                  );
                });
              } else {
                return <div className="py-20 text-center text-gray-500 text-sm italic">No matching activity logs found.</div>;
              }
            })()}
          </div>
        </div>

        <div className="p-8 rounded-3xl bg-white/5 border border-white/5 space-y-6">
          <h3 className="text-lg font-bold flex items-center gap-3 border-b border-white/5 pb-4 uppercase tracking-tighter">
            <Megaphone size={22} className="text-primary" />
            System Broadcast Messages
          </h3>
          
          <div className="space-y-4">
            <input 
              value={newAnnouncement.title}
              onChange={e => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
              placeholder="Message Title"
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-sm font-bold focus:border-primary transition-all"
            />
            <textarea 
              value={newAnnouncement.contentMd}
              onChange={e => setNewAnnouncement({...newAnnouncement, contentMd: e.target.value})}
              placeholder="Markdown content..."
              rows={4}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-sm font-bold focus:border-primary transition-all resize-none"
            />
            <div className="space-y-4">
              <div className="space-y-1">
                {[
                  { value: 'info', label: 'Standard Info', desc: 'General system notification', dot: 'bg-blue-500' },
                  { value: 'warning', label: 'System Warning', desc: 'Upcoming changes or downtime', dot: 'bg-amber-500' },
                  { value: 'critical', label: 'Critical/Maintenance', desc: 'Active outage or maintenance', dot: 'bg-red-500' }
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setNewAnnouncement({...newAnnouncement, priority: item.value})}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      newAnnouncement.priority === item.value 
                      ? 'bg-primary/10 border-primary/30 border-l-4 border-l-primary text-white' 
                      : 'bg-black/40 border-white/5 text-slate-400 hover:bg-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        newAnnouncement.priority === item.value ? item.dot : 'bg-slate-600'
                      }`} />
                      <div>
                        <div className={`text-[11px] font-black uppercase tracking-widest ${
                          newAnnouncement.priority === item.value ? 'text-primary' : 'text-slate-300'
                        }`}>{item.label}</div>
                        <div className="text-[10px] opacity-60 mt-0.5">{item.desc}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={createAnnouncement} className="w-full bg-primary text-white font-black uppercase tracking-widest py-3.5 rounded-xl hover:bg-secondary transition-all flex items-center justify-center gap-2">
                <Send size={14} /> Send Announcement
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-2">Active Messages</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              {announcements?.length > 0 ? (announcements || []).map((a: any) => (
                <div key={a.id} className="p-4 bg-black/40 border border-white/5 border-l-4 border-l-primary rounded-xl flex justify-between items-center group">
                  <div>
                    <div className="font-bold text-sm text-slate-200">{a.title}</div>
                    <div className="text-[10px] uppercase font-black tracking-widest opacity-40 mt-1">
                      {a.priority} • {new Date(a.createdAt).toLocaleString()}
                    </div>
                  </div>
                  {confirmDeleteAnnouncementId === a.id ? (
                    <InlineToast 
                      message="Delete?" 
                      type="confirm" 
                      onConfirm={() => deleteAnnouncement(a.id)} 
                      onCancel={() => setConfirmDeleteAnnouncementId(null)} 
                    />
                  ) : (
                    <button onClick={() => setConfirmDeleteAnnouncementId(a.id)} className="p-2 text-red-500/40 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              )) : <p className="text-center text-xs text-slate-600 italic py-4">No active messages</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <div className={`p-8 rounded-3xl border transition-all relative overflow-hidden group ${
          maintenanceEnabled 
            ? 'bg-amber-500/10 border-amber-500/30' 
            : 'bg-emerald-500/10 border-emerald-500/20'
        }`}>
          <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full ${
            maintenanceEnabled ? 'bg-amber-500/20' : 'bg-emerald-500/20'
          }`} />
          <h3 className="text-lg font-bold mb-4 relative flex items-center gap-2">
            {maintenanceEnabled ? <Lock className="text-amber-500 animate-pulse" size={20} /> : <Unlock className="text-emerald-500" size={20} />}
            Maintenance Mode
          </h3>
          <div className="space-y-4 relative">
            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">System Status</div>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${maintenanceEnabled ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                <span className="text-sm font-black uppercase tracking-wider">
                  {maintenanceEnabled ? 'Maintenance Mode Active' : 'Public Access Allowed'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                {maintenanceEnabled 
                  ? 'All non-owner users are locked out of the platform. A maintenance message is shown globally.' 
                  : 'The platform is open to all users. Standard authentication and ledger features are fully active.'}
              </p>
            </div>

            <button 
              onClick={handleToggleMaintenance}
              disabled={loadingMaintenance}
              className={`w-full p-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all border relative overflow-hidden ${
                maintenanceEnabled 
                ? 'bg-emerald-500 text-black hover:bg-emerald-400 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]' 
                : 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/20'
              }`}
            >
              {loadingMaintenance && (
                <div className="absolute inset-0 bg-inherit flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current/20 border-t-current" />
                  <span>Updating status...</span>
                </div>
              )}
              <span className={loadingMaintenance ? 'opacity-0' : ''}>
                {maintenanceEnabled ? 'Deactivate Maintenance Mode' : 'Activate Maintenance Mode'}
              </span>
            </button>
          </div>
        </div>

        {/* Invitations Section */}
        <div className="p-8 rounded-3xl bg-white/5 border border-white/5 space-y-6">
          <h3 className="text-lg font-bold flex items-center gap-3 border-b border-white/5 pb-4 uppercase tracking-tighter">
            <Ticket size={22} className="text-secondary" />
            Owner Invitations
          </h3>
          
          <p className="text-xs text-slate-400 font-medium leading-relaxed">
            Create invitation links for onboarding new owners or system operators. Links expire automatically after 24 hours.
          </p>

          <div className="flex gap-4">
            <select 
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as any)}
              className="flex-1 bg-black/40 border border-white/10 rounded-xl p-3.5 text-sm font-black uppercase tracking-widest appearance-none"
            >
              <option value="owner">Full Owner Access</option>
              <option value="operator">System Operator</option>
            </select>
            <button onClick={createInvite} className="flex-1 bg-secondary text-white font-black uppercase tracking-widest rounded-xl hover:bg-primary transition-all flex items-center justify-center gap-2 px-4">
              <Plus size={14} /> Generate & Copy
            </button>
          </div>

          <div className="space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-2">Pending Invitations</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              {invitations?.length > 0 ? (invitations || []).map((i: any) => (
                <div key={i.token} className="p-4 bg-black/40 border border-white/5 border-l-4 border-l-secondary rounded-xl flex justify-between items-center group">
                  <div>
                    <div className="font-mono text-xs text-primary">{i.token.substring(0, 16)}...</div>
                    <div className="text-[10px] uppercase font-black tracking-widest opacity-40 mt-1 flex items-center gap-2">
                      <Clock size={10} />
                      Expires {new Date(i.expiresAt).toLocaleTimeString()}
                      <span className="text-secondary">•</span>
                      {i.role}
                    </div>
                  </div>
                  {confirmDeleteInviteToken === i.token ? (
                    <InlineToast 
                      message="Revoke?" 
                      type="confirm" 
                      onConfirm={() => deleteInvite(i.token)} 
                      onCancel={() => setConfirmDeleteInviteToken(null)} 
                    />
                  ) : (
                    <button onClick={() => setConfirmDeleteInviteToken(i.token)} className="p-2 text-red-500/40 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              )) : <p className="text-center text-xs text-slate-600 italic py-4">No active invitations</p>}
            </div>
          </div>
        </div>
      </div>
    </OwnerPortal>
  );
};

export default AdminDashboard;
