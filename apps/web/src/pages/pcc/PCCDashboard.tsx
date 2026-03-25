import React, { useState, useEffect } from 'react';
import PCCPortal from './PCCPortal';

const PCCDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [systemLogs, setSystemLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('ledger_token');
        const apiUrl = import.meta.env.VITE_API_URL;
        const [statsRes, logsRes] = await Promise.all([
          fetch(`${apiUrl}/api/pcc/stats`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${apiUrl}/api/pcc/audit/system`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        const statsData = await statsRes.json();
        const logsData = await logsRes.json();
        setStats(statsData);
        setSystemLogs(logsData);
      } catch (err) {
        console.error('Failed to fetch PCC data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <PCCPortal activePath="#/system-pcc/dashboard"><div className="animate-pulse">Loading Command Hub...</div></PCCPortal>;

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
          <h3 className="text-lg font-bold mb-6">System Event Chronicle</h3>
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
                      <p className="text-[10px] text-gray-500 uppercase tracking-tight">{log.target} • {new Date(log.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded-full border ${
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
          <h3 className="text-lg font-bold mb-4 relative">God Mode Quick Actions</h3>
          <div className="space-y-3 relative">
            <button className="w-full text-left p-3 rounded-xl bg-emerald-500 text-black font-bold text-sm hover:scale-[1.02] transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              Push v1.18.1 Emergency Patch
            </button>
            <button className="w-full text-left p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all border border-white/10">
              Broadcast System Message
            </button>
            <button className="w-full text-left p-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-500 font-bold text-sm transition-all border border-red-500/20">
              Trigger Global Maintenance Mode
            </button>
          </div>
        </div>
      </div>
    </PCCPortal>
  );
};

export default PCCDashboard;
