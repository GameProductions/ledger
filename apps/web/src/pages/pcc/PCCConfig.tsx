import React, { useState, useEffect } from 'react';
import PCCPortal from './PCCPortal';

const PCCConfig: React.FC = () => {
  const [configs, setConfigs] = useState<any[]>([]);
  const [features, setFeatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('ledger_token');
        const apiUrl = import.meta.env.VITE_API_URL;
        const [configRes, featureRes] = await Promise.all([
          fetch(`${apiUrl}/api/pcc/config`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${apiUrl}/api/pcc/features`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        setConfigs(await configRes.json());
        setFeatures(await featureRes.json());
      } catch (err) {
        console.error('Failed to fetch PCC config:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleUpdateConfig = async (id: string, value: string) => {
    const token = localStorage.getItem('ledger_token');
    await fetch(`/ledger/api/pcc/config/${id}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ config_value: value })
    });
    setConfigs(prev => prev.map(c => c.id === id ? { ...c, config_value: value } : c));
  };

  const handleToggleFeature = async (id: string, enabled: boolean) => {
    const token = localStorage.getItem('ledger_token');
    await fetch(`/ledger/api/pcc/features/${id}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled_globally: enabled ? 1 : 0 })
    });
    setFeatures(prev => prev.map(f => f.id === id ? { ...f, enabled_globally: enabled ? 1 : 0 } : f));
  };

  if (loading) return <PCCPortal activePath="#/system-pcc/config"><div className="animate-pulse">Accessing Switchboard...</div></PCCPortal>;

  return (
    <PCCPortal activePath="#/system-pcc/config">
      <div className="space-y-12">
        {/* System Overrides */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black italic tracking-tighter uppercase underline decoration-emerald-500/50 underline-offset-8">Universal Switchboard</h2>
            <span className="text-[10px] bg-white/10 px-2 py-1 rounded text-gray-500 font-bold uppercase tracking-widest leading-none">Global Key/Value Overrides</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {configs.map(cfg => (
              <div key={cfg.id} className="p-6 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/[0.07] transition-all flex flex-col justify-between">
                <div className="mb-4">
                  <p className="font-bold text-emerald-400 mb-1 leading-none">{cfg.config_key}</p>
                  <p className="text-xs text-gray-500">{cfg.description || 'No description provided.'}</p>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <input 
                    type="text" 
                    value={cfg.config_value} 
                    onChange={(e) => handleUpdateConfig(cfg.id, e.target.value)}
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-emerald-500/50 transition-all font-mono"
                  />
                  <span className="text-[10px] text-gray-600 uppercase font-black">{cfg.value_type}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Feature Flags */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black italic tracking-tighter uppercase underline decoration-blue-500/50 underline-offset-8">Feature Flags</h2>
            <span className="text-[10px] bg-white/10 px-2 py-1 rounded text-gray-500 font-bold uppercase tracking-widest leading-none">Tiered Component Access</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map(feat => (
              <div key={feat.id} className="p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-blue-500/20 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all ${feat.enabled_globally ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-gray-600 grayscale'}`}>
                    🚀
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={!!feat.enabled_globally}
                      onChange={(e) => handleToggleFeature(feat.id, e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 cursor-pointer"></div>
                  </label>
                </div>
                <h4 className="font-bold text-sm mb-1">{feat.feature_key}</h4>
                <p className="text-xs text-gray-500 line-clamp-2">{feat.description}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PCCPortal>
  );
};

export default PCCConfig;
