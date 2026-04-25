import React, { useState, useEffect } from 'react';
import AdminPortal from './AdminPortal';

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
  const { secureFetch } = useAuth();
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [loadingMaintenance, setLoadingMaintenance] = useState(false);
  const [announcement, setAnnouncement] = useState({ title: '', content: '', priority: 'info' });
  const [sending, setSending] = useState(false);
  const [migratingSecrets, setMigratingSecrets] = useState(false);
  const [syncingGithub, setSyncingGithub] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, logsRes, configRes] = await Promise.all([
          secureFetch(`/api/admin/stats`),
          secureFetch(`/api/admin/audit/system`),
          secureFetch(`/api/admin/config`)
        ]);
        
        const statsData = await statsRes.json();
        const logsData = await logsRes.json();
        const configData = await configRes.json();
        
        if (statsData.success) setStats(statsData.data);
        if (logsData.success) setSystemLogs(logsData.data);

        if (configData.success) {
          const maintenance = configData.data.find((c: any) => c.configKey === 'MAINTENANCE_MODE');
          setMaintenanceEnabled(maintenance?.configValue === 'true');
        }
      } catch (err) {
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
      const res = await secureFetch(`/api/admin/maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !maintenanceEnabled })
      });
      const data = await res.json();
      if (data.success) {
        setMaintenanceEnabled(!maintenanceEnabled);
        showToast(`Maintenance mode ${!maintenanceEnabled ? 'enabled' : 'disabled'}`, 'info');
      }
    } catch (err) {
      showToast('Action failed', 'error');
    } finally {
      setLoadingMaintenance(false);
    }
  };

  const handleSendAnnouncement = async () => {
    if (!announcement.title || !announcement.content) return;
    setSending(true);
    try {
      const res = await secureFetch(`/api/admin/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: announcement.title, 
          content_md: announcement.content, 
          priority: announcement.priority 
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Announcement broadcasted', 'success');
        setIsAnnouncementModalOpen(false);
        setAnnouncement({ title: '', content: '', priority: 'info' });
      }
    } catch (err) {
      showToast('Broadcast failed', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleMigrateSecrets = async () => {
    setMigratingSecrets(true);
    try {
      const res = await secureFetch(`/api/admin/maintenance/migrate-secrets`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Secret migration complete: ${data.count} secrets encrypted`, 'success');
      } else {
        showToast(data.error || 'Migration failed', 'error');
      }
    } catch (err) {
      showToast('Secret migration failed', 'error');
    } finally {
      setMigratingSecrets(false);
    }
  };

  const handleGithubSync = async () => {
    setSyncingGithub(true);
    try {
      const res = await secureFetch(`/api/support/webhook/github`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync' })
      });
      if (res.ok) {
        showToast('GitHub sync triggered successfully', 'success');
      } else {
        showToast('GitHub sync failed', 'error');
      }
    } catch (err) {
      showToast('GitHub sync request failed', 'error');
    } finally {
      setSyncingGithub(false);
    }
  };

  if (loading) return <AdminPortal activePath="#/admin/dashboard"><div className="animate-pulse text-sm">Loading Platform Command Center...</div></AdminPortal>;

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers || 0, color: 'emerald' },
    { label: 'Active Today', value: stats?.activeToday || 0, color: 'blue' },
    { label: 'Households', value: stats?.totalHouseholds || 0, color: 'purple' },
    { label: 'Platform Version', value: stats?.version || '0.0.0', color: 'orange' },
  ];

  return (
    <AdminPortal activePath="#/admin/dashboard">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {statCards.map((stat) => (
          <div key={stat.label} className="p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-emerald-500/20 transition-all group overflow-hidden relative">
            <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-${stat.color}-500/10 blur-3xl`} />
            <p className="text-gray-400 text-sm font-medium mb-1 uppercase tracking-widest">{stat.label}</p>
            <p className="text-3xl font-black">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 p-8 rounded-3xl bg-white/5 border border-white/5">
          <h3 className="text-lg font-bold mb-6">System Activity History</h3>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {(systemLogs || []).length > 0 ? (
              (systemLogs || []).map((log) => (
                <div key={log.id} className="flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/5">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                      log.action.includes('SUCCESS') ? 'bg-emerald-500/10 text-emerald-500' : 
                      log.action.includes('FAILURE') ? 'bg-red-500/10 text-red-500' : 
                      'bg-blue-500/10 text-blue-500'
                    }`}>
                      {log.action.includes('SYNC') ? '🔄' : '🔔'}
                    </div>
                    <div>
                      <p className="text-sm font-bold">{log.action.replace(/_/g, ' ')}</p>
                      <p className="text-sm text-gray-500 uppercase tracking-tight">{log.target} • {new Date(log.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 text-sm font-black uppercase rounded-full border ${
                    log.action.includes('SUCCESS') ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                    log.action.includes('FAILURE') ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                    'bg-blue-500/10 text-blue-500 border-blue-500/20'
                  }`}>
                    Processed
                  </span>
                </div>
              ))
            ) : (
              <div className="py-20 text-center text-gray-500 text-sm italic">No system events recorded.</div>
            )}
          </div>
        </div>

        <div className="p-8 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 blur-3xl rounded-full" />
          <h3 className="text-lg font-bold mb-4 relative">Super Admin Access</h3>
          <div className="space-y-3 relative">
            <button 
              onClick={() => showToast('System update started...', 'info')}
              className="w-full text-left p-3 rounded-xl bg-emerald-500 text-black font-bold text-sm hover:scale-[1.02] transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
            >
              Apply System Update
            </button>
            <button 
              onClick={() => setIsAnnouncementModalOpen(true)}
              className="w-full text-left p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all border border-white/10"
            >
              Send System Message
            </button>
            <button 
              onClick={handleToggleMaintenance}
              disabled={loadingMaintenance}
              className={`w-full text-left p-3 rounded-xl font-bold text-sm transition-all border relative overflow-hidden ${
                maintenanceEnabled 
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' 
                : 'bg-red-500/20 hover:bg-red-500/30 text-red-500 border-red-500/20'
              }`}
            >
              {loadingMaintenance && (
                <div className="absolute inset-0 bg-inherit flex items-center px-3 gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current/20 border-t-current" />
                  <span>Updating System...</span>
                </div>
              )}
              <span className={loadingMaintenance ? 'opacity-0' : ''}>
                {maintenanceEnabled ? 'Enable Public Access' : 'Disable Public Access'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Maintenance Operations */}
      <div className="mt-8 p-8 rounded-3xl bg-orange-500/5 border border-orange-500/10">
        <h3 className="text-lg font-bold mb-2 text-orange-400">Maintenance Operations</h3>
        <p className="text-xs text-slate-500 mb-6 uppercase tracking-widest font-bold">Critical system operations that affect encrypted data and external integrations.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-black/40 border border-white/5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 text-lg">🔐</div>
              <div>
                <p className="text-sm font-bold text-white">Secret Migration</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Encrypt plaintext secrets stored in the database</p>
              </div>
            </div>
            <button 
              onClick={handleMigrateSecrets}
              disabled={migratingSecrets}
              className="w-full p-3 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/20 font-bold text-sm transition-all disabled:opacity-50"
            >
              {migratingSecrets ? 'Migrating...' : 'Run Secret Migration'}
            </button>
          </div>
          <div className="p-5 rounded-2xl bg-black/40 border border-white/5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 text-lg">🔄</div>
              <div>
                <p className="text-sm font-bold text-white">GitHub Sync</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Force sync support issues with GitHub</p>
              </div>
            </div>
            <button 
              onClick={handleGithubSync}
              disabled={syncingGithub}
              className="w-full p-3 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/20 font-bold text-sm transition-all disabled:opacity-50"
            >
              {syncingGithub ? 'Syncing...' : 'Trigger Manual Sync'}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isAnnouncementModalOpen && (
          <Modal
            isOpen={isAnnouncementModalOpen}
            onClose={() => setIsAnnouncementModalOpen(false)}
            title="Send System Message"
            footer={
              <>
                <Button variant="secondary" onClick={() => setIsAnnouncementModalOpen(false)}>Cancel</Button>
                <Button variant="primary" onClick={handleSendAnnouncement} disabled={sending}>
                  {sending ? 'Sending...' : 'Send Message'}
                </Button>
              </>
            }
          >
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block">Announcement Title</label>
                <input 
                  type="text" 
                  value={announcement.title}
                  onChange={(e) => setAnnouncement({...announcement, title: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-sm font-bold outline-none focus:border-emerald-500/50 transition-all"
                  placeholder="e.g., Scheduled Maintenance"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block">Broadcast Content (Markdown)</label>
                <textarea 
                  value={announcement.content}
                  onChange={(e) => setAnnouncement({...announcement, content: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-sm font-medium h-32 outline-none focus:border-emerald-500/50 transition-all"
                  placeholder="Describe the update or alert..."
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block">Priority Level</label>
                <div className="flex gap-2">
                  {['info', 'warning', 'critical'].map((p) => (
                    <button
                      key={p}
                      onClick={() => setAnnouncement({...announcement, priority: p})}
                      className={`flex-1 p-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${
                        announcement.priority === p 
                        ? 'bg-emerald-500 text-black border-emerald-500' 
                        : 'bg-white/5 text-slate-400 border-white/10'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </AdminPortal>
  );
};

export default AdminDashboard;
