import React, { useState, useEffect } from 'react';
import PCCPortal from './PCCPortal';

const PCCDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('ledger_token');
        const apiUrl = import.meta.env.VITE_API_URL;
        const res = await fetch(`${apiUrl}/api/pcc/stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch PCC stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
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
          <h3 className="text-lg font-bold mb-6">System Health Matrix</h3>
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-500">⚡</div>
                <div>
                  <p className="font-bold">API Gateway</p>
                  <p className="text-xs text-gray-500">Responsive - 24ms Average</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase rounded-full">Operational</span>
            </div>
            {/* Additional health indicators */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/5 translate-x-1 opacity-80">
               <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-500">☁️</div>
                <div>
                  <p className="font-bold">Cloudflare Workers</p>
                  <p className="text-xs text-gray-500">Connected - 9 Regions</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-blue-500/20 text-blue-500 text-[10px] font-black uppercase rounded-full">Linked</span>
            </div>
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
