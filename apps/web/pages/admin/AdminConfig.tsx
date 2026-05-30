import React, { useState, useEffect } from 'react';
import AdminPortal from './AdminPortal';
import { getApiUrl } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { InlineToast } from '../../components/ui/InlineToast';

const timezones = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'US Eastern Time (EST/EDT)' },
  { value: 'America/Chicago', label: 'US Central Time (CST/CDT)' },
  { value: 'America/Denver', label: 'US Mountain Time (MST/MDT)' },
  { value: 'America/Los_Angeles', label: 'US Pacific Time (PST/PDT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Kolkata', label: 'Kolkata (IST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
  { value: 'America/Sao_Paulo', label: 'São Paulo (BRT/BRST)' },
  { value: 'Africa/Cairo', label: 'Cairo (EET)' }
];

const locales = [
  { value: 'en-US', label: 'English (United States)' },
  { value: 'en-GB', label: 'English (United Kingdom)' },
  { value: 'es-ES', label: 'Español (España)' },
  { value: 'fr-FR', label: 'Français (France)' },
  { value: 'de-DE', label: 'Deutsch (Deutschland)' },
  { value: 'it-IT', label: 'Italiano (Italia)' },
  { value: 'ja-JP', label: '日本語 (日本)' },
  { value: 'zh-CN', label: '简体中文 (中国)' },
  { value: 'pt-BR', label: 'Português (Brasil)' },
  { value: 'ru-RU', label: 'Русский (Россия)' }
];

const AdminConfig: React.FC = () => {
  const { showConfirm } = useToast();
  const [configs, setConfigs] = useState<any[]>([]);
  const [features, setFeatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [healing, setHealing] = useState(false);
  const [healResult, setHealResult] = useState<{ success: boolean; message: string } | null>(null);
  const [confirmHeal, setConfirmHeal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('ledger_token');
        const apiUrl = getApiUrl();
        const [configRes, featureRes] = (await Promise.all([
                  fetch(`${apiUrl}/api/admin/system/config`, { headers: { 'Authorization': `Bearer ${token}` } }),
                  fetch(`${apiUrl}/api/admin/system/features`, { headers: { 'Authorization': `Bearer ${token}` } })
                ]) as any);
        
        const configData = (await configRes.json() as any);
        const featureData = (await featureRes.json() as any);
        
        setConfigs(configData.data || []);
        setFeatures(featureData.data || []);
      } catch (err: any) {
        console.error('Failed to fetch PCC config:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleUpdateConfig = async (id: string, value: string) => {
    const token = localStorage.getItem('ledger_token');
    const apiUrl = getApiUrl();
    await fetch(`${apiUrl}/api/admin/system/config/${id}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ configValue: value })
    });
    setConfigs(prev => prev.map(c => c.id === id ? { ...c, configValue: value } : c));
  };

  const handleToggleFeature = async (id: string, enabled: boolean) => {
    const token = localStorage.getItem('ledger_token');
    const apiUrl = getApiUrl();
    await fetch(`${apiUrl}/api/admin/system/features/${id}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabledGlobally: enabled })
    });
    setFeatures(prev => prev.map(f => f.id === id ? { ...f, enabledGlobally: enabled ? 1 : 0 } : f));
  };

  const handleSelfHeal = async () => {
    
    setHealing(true);
    setHealResult(null);
    try {
      const token = localStorage.getItem('ledger_token');
      const apiUrl = getApiUrl();
      const res = (await fetch(`${apiUrl}/api/admin/system/self-heal`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` }
            }) as any);
      const data = (await res.json() as any);
      setHealResult({ success: data.success, message: data.message || (data.success ? "System tables healed successfully." : "Heal failed.") });
      setConfirmHeal(false);
      
      // Refresh config if successful
      if (data.success) {
        const configRes = (await fetch(`${apiUrl}/api/admin/system/config`, { headers: { 'Authorization': `Bearer ${token}` } }) as any);
        const configData = (await configRes.json() as any);
        setConfigs(configData.data || []);
      }
    } catch (err: any) {
      setHealResult({ success: false, message: "Network error during self-heal." });
    } finally {
      setHealing(false);
    }
  };

  if (loading) return <AdminPortal activePath="#/admin/config"><div className="animate-pulse">Loading settings...</div></AdminPortal>;

  const defaultTimezoneCfg = configs.find(c => c.configKey === 'DEFAULT_TIMEZONE');
  const defaultLocaleCfg = configs.find(c => c.configKey === 'DEFAULT_LOCALE');

  return (
    <AdminPortal activePath="#/admin/config">
      <div className="space-y-12">
        {/* Maintenance / Self-Heal */}
        <section className="p-8 rounded-3xl bg-amber-500/10 border border-amber-500/20 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-xl">🛠️</div>
              <div>
                <h3 className="font-black uppercase italic tracking-tight text-amber-400">System Self-Healing</h3>
                <p className="text-xs text-amber-500/60 font-bold uppercase tracking-widest">Maintenance Operations</p>
              </div>
            </div>
            <p className="text-sm text-gray-400 mb-6 max-w-2xl">
              If the platform is experiencing 500 errors or missing configuration keys, run self-healing to re-verify the database schema and restore missing system tables.
            </p>
            {confirmHeal ? (
              <InlineToast 
                message="Run system self-heal?" 
                type="confirm" 
                onConfirm={handleSelfHeal} 
                onCancel={() => setConfirmHeal(false)} 
              />
            ) : (
              <button 
                onClick={() => setConfirmHeal(true)}
                disabled={healing}
                className={`px-8 py-3 rounded-2xl font-black uppercase tracking-tighter italic transition-all ${healing ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed' : 'bg-amber-500 text-black hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.3)]'}`}
              >
                {healing ? "Healing System..." : "Run Self-Heal"}
              </button>
            )}
            
            {healResult && (
              <div className={`mt-6 p-4 rounded-xl text-sm font-bold ${healResult.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                {healResult.success ? "✅ " : "❌ "} {healResult.message}
              </div>
            )}
          </div>
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none transform rotate-12">
            <div className="text-8xl font-black italic tracking-tighter uppercase leading-none">REPAIR</div>
          </div>
        </section>

        {/* System Overrides */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black italic tracking-tighter uppercase underline decoration-emerald-500/50 underline-offset-8">Platform Settings</h2>
            <span className="text-xs bg-white/10 px-2 py-1 rounded text-gray-500 font-bold uppercase tracking-widest leading-none">Global Settings</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(configs || []).filter(cfg => cfg.configKey !== 'DEFAULT_TIMEZONE' && cfg.configKey !== 'DEFAULT_LOCALE').map(cfg => (
              <div key={cfg.id} className="p-6 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/[0.07] transition-all flex flex-col justify-between">
                <div className="mb-4">
                  <p className="font-bold text-emerald-400 mb-1 leading-none">{cfg.configKey || cfg.configKey}</p>
                  <p className="text-sm text-gray-500">{cfg.description || 'No description provided.'}</p>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <input 
                    type="text" 
                    value={cfg.configValue ?? cfg.configValue ?? ''} 
                    onChange={(e) => handleUpdateConfig(cfg.id, e.target.value)}
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-emerald-500/50 transition-all font-mono"
                  />
                  <span className="text-xs text-gray-600 uppercase font-black">{cfg.valueType || cfg.value_type}</span>
                </div>
              </div>
            ))}

            {/* Custom Timezone Selector */}
            {defaultTimezoneCfg && (
              <div className="p-6 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/[0.07] transition-all flex flex-col justify-between">
                <div className="mb-4">
                  <p className="font-bold text-emerald-400 mb-1 leading-none">DEFAULT_TIMEZONE</p>
                  <p className="text-sm text-gray-500">The default fallback timezone for users and transaction schedules.</p>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <select 
                    value={defaultTimezoneCfg.configValue ?? 'UTC'} 
                    onChange={(e) => handleUpdateConfig(defaultTimezoneCfg.id, e.target.value)}
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-emerald-500/50 transition-all text-white"
                  >
                    {timezones.map(tz => (
                      <option key={tz.value} value={tz.value}>{tz.label}</option>
                    ))}
                  </select>
                  <span className="text-xs text-gray-600 uppercase font-black">Dropdown</span>
                </div>
              </div>
            )}

            {/* Custom Locale Selector */}
            {defaultLocaleCfg && (
              <div className="p-6 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/[0.07] transition-all flex flex-col justify-between">
                <div className="mb-4">
                  <p className="font-bold text-emerald-400 mb-1 leading-none">DEFAULT_LOCALE</p>
                  <p className="text-sm text-gray-500">The default fallback language and regional display format.</p>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <select 
                    value={defaultLocaleCfg.configValue ?? 'en-US'} 
                    onChange={(e) => handleUpdateConfig(defaultLocaleCfg.id, e.target.value)}
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-emerald-500/50 transition-all text-white"
                  >
                    {locales.map(loc => (
                      <option key={loc.value} value={loc.value}>{loc.label}</option>
                    ))}
                  </select>
                  <span className="text-xs text-gray-600 uppercase font-black">Dropdown</span>
                </div>
              </div>
            )}
            
            {/* Rule 231: Session Persistence Toggle */}
            <div className="p-6 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/[0.07] transition-all flex flex-col justify-between">
              <div className="mb-4">
                <p className="font-bold text-blue-400 mb-1 leading-none">GLOBAL_SESSION_PERSISTENCE</p>
                <p className="text-sm text-gray-500">Default persistence behavior for all platform sessions.</p>
              </div>
              <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-gray-600 uppercase font-black">Boolean</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={configs.find(c => c.configKey === 'DEFAULT_STAY_SIGNED_IN')?.configValue === 'true'}
                    onChange={(e) => {
                      const cfg = configs.find(c => c.configKey === 'DEFAULT_STAY_SIGNED_IN');
                      if (cfg) handleUpdateConfig(cfg.id, e.target.checked ? 'true' : 'false');
                    }}
                  />
                  <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 cursor-pointer"></div>
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Flags */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black italic tracking-tighter uppercase underline decoration-blue-500/50 underline-offset-8">Feature Flags</h2>
            <span className="text-xs bg-white/10 px-2 py-1 rounded text-gray-500 font-bold uppercase tracking-widest leading-none">Component Visibility</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(features || []).map(feat => (
              <div key={feat.id} className="p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-blue-500/20 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all ${feat.enabledGlobally || feat.enabledGlobally ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-gray-600 grayscale'}`}>
                    🚀
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={!!(feat.enabledGlobally || feat.enabledGlobally)}
                      onChange={(e) => handleToggleFeature(feat.id, e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 cursor-pointer"></div>
                  </label>
                </div>
                <h4 className="font-bold text-sm mb-1">{feat.featureKey || feat.featureKey}</h4>
                <p className="text-sm text-gray-500 line-clamp-2">{feat.description}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AdminPortal>
  );
};

export default AdminConfig;
