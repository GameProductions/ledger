import PCCPortal from './PCCPortal';
import { Send, ShieldAlert, Monitor, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';

const PCCDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [systemLogs, setSystemLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  const { showToast } = useToast();
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [loadingMaintenance, setLoadingMaintenance] = useState(false);
  const [announcement, setAnnouncement] = useState({ title: '', content: '', priority: 'info' });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('ledger_token');
        const apiUrl = import.meta.env.VITE_API_URL;
        const [statsRes, logsRes, configRes] = await Promise.all([
          fetch(`${apiUrl}/api/pcc/stats`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${apiUrl}/api/pcc/audit/system`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${apiUrl}/api/pcc/config`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        const statsData = await statsRes.json();
        const logsData = await logsRes.json();
        const configData = await configRes.json();
        
        setStats(statsData);
        setSystemLogs(logsData);

        const maintenance = configData.find((c: any) => c.config_key === 'MAINTENANCE_MODE');
        setMaintenanceEnabled(maintenance?.config_value === 'true');
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
      const token = localStorage.getItem('ledger_token');
      const apiUrl = import.meta.env.VITE_API_URL;
      const res = await fetch(`${apiUrl}/api/pcc/admin/maintenance`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !maintenanceEnabled })
      });
      if (res.ok) {
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
      const token = localStorage.getItem('ledger_token');
      const apiUrl = import.meta.env.VITE_API_URL;
      const res = await fetch(`${apiUrl}/api/pcc/announcements`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: announcement.title, 
          content_md: announcement.content, 
          priority: announcement.priority 
        })
      });
      if (res.ok) {
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

  if (loading) return <PCCPortal activePath="#/system-pcc/dashboard"><div className="animate-pulse text-sm">Loading Platform Command Center...</div></PCCPortal>;

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers || 0, color: 'emerald' },
    { label: 'Active Today', value: stats?.activeToday || 0, color: 'blue' },
    { label: 'Households', value: stats?.totalHouseholds || 0, color: 'purple' },
    { label: 'Platform Version', value: stats?.version || '0.0.0', color: 'orange' },
  ];

  return (
    <PCCPortal activePath="#/system-pcc/dashboard">
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
            {systemLogs.length > 0 ? (
              systemLogs.map((log) => (
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
                      <p className="text-sm text-gray-500 uppercase tracking-tight">{log.target} • {new Date(log.created_at).toLocaleString()}</p>
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
          <h3 className="text-lg font-bold mb-4 relative">God Mode</h3>
          <div className="space-y-3 relative">
            <button 
              onClick={() => showToast('Protocol execution initiated...', 'info')}
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
              className={`w-full text-left p-3 rounded-xl font-bold text-sm transition-all border ${
                maintenanceEnabled 
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' 
                : 'bg-red-500/20 hover:bg-red-500/30 text-red-500 border-red-500/20'
              }`}
            >
              {loadingMaintenance ? 'Processing...' : maintenanceEnabled ? 'Resume Site Access' : 'Turn Off Site Access'}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isAnnouncementModalOpen && (
          <Modal
            isOpen={isAnnouncementModalOpen}
            onClose={() => setIsAnnouncementModalOpen(false)}
            title="Broadcast System Announcement"
            footer={
              <>
                <Button variant="secondary" onClick={() => setIsAnnouncementModalOpen(false)}>Cancel</Button>
                <Button variant="primary" onClick={handleSendAnnouncement} disabled={sending}>
                  {sending ? 'Broadcasting...' : 'Execute Broadcast'}
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
    </PCCPortal>
  );
};

export default PCCDashboard;
