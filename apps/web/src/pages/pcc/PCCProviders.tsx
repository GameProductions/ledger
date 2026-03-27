import React, { useState, useEffect } from 'react';
import PCCPortal from './PCCPortal';
import { Shield, Globe, Plus, Trash2, Edit2, Zap, Server, Building } from 'lucide-react';
import { SearchableSelect } from '../../components/ui/SearchableSelect';

const PCCProviders: React.FC = () => {
  const [providers, setProviders] = useState<any[]>([]);
  const [processors, setProcessors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    website_url: '',
    branding_url: '',
    billing_processor_id: '',
    is_3rd_party_capable: false
  });

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('ledger_token');
      const apiUrl = import.meta.env.VITE_API_URL;
      
      const [provRes, procRes] = await Promise.all([
        fetch(`${apiUrl}/api/pcc/providers`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${apiUrl}/api/pcc/processors`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      const provData = await provRes.json();
      const procData = await procRes.json();
      
      setProviders(provData);
      setProcessors(procData);
    } catch (err) {
      console.error('Failed to fetch provider data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('ledger_token');
    const apiUrl = import.meta.env.VITE_API_URL;
    const res = await fetch(`${apiUrl}/api/pcc/providers`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem)
    });
    if (res.ok) {
      setShowAdd(false);
      setNewItem({ name: '', website_url: '', branding_url: '', billing_processor_id: '', is_3rd_party_capable: false });
      fetchData();
    }
  };

  if (loading) return <PCCPortal activePath="#/system-pcc/providers"><div className="animate-pulse">Connecting to Provider Registry...</div></PCCPortal>;

  return (
    <PCCPortal activePath="#/system-pcc/providers">
      <div className="flex items-center justify-between mb-12">
        <div>
          <h2 className="text-3xl font-black italic tracking-tighter uppercase underline decoration-emerald-500/50 underline-offset-8">Provider Management</h2>
          <p className="text-[10px] text-slate-500 uppercase tracking-[0.4em] font-black mt-2">God Mode - Universal Biller Registry</p>
        </div>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="px-6 py-3 bg-emerald-500 text-black font-black uppercase text-xs rounded-xl hover:scale-[1.05] transition-all flex items-center gap-2"
        >
          {showAdd ? 'Cancel' : <><Plus size={16} /> Register Provider</>}
        </button>
      </div>

      {showAdd && (
        <div className="mb-12 p-8 rounded-3xl bg-white/5 border border-white/5 animate-in fade-in slide-in-from-top-4 duration-500">
          <h3 className="text-xl font-bold mb-6">Provider Configuration</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Provider Name</label>
                <input 
                  type="text" 
                  value={newItem.name} 
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="e.g. Netflix, Verizon, Rent Management"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Website URL</label>
                <input 
                  type="url" 
                  value={newItem.website_url} 
                  onChange={(e) => setNewItem({ ...newItem, website_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Logo URL</label>
                <input 
                  type="url" 
                  value={newItem.branding_url} 
                  onChange={(e) => setNewItem({ ...newItem, branding_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm"
                />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Billing Processor</label>
                <SearchableSelect 
                  options={processors.map(proc => ({ 
                    value: proc.id, 
                    label: proc.name,
                    icon: proc.branding_url ? <img src={proc.branding_url} className="w-5 h-5" alt="" /> : null
                  }))}
                  value={newItem.billing_processor_id}
                  onChange={(val) => setNewItem({ ...newItem, billing_processor_id: val })}
                  placeholder="Select Processor..."
                />
              </div>
              <div className="flex items-center gap-3 py-4">
                <input 
                  type="checkbox" 
                  id="3rd_party"
                  checked={newItem.is_3rd_party_capable} 
                  onChange={(e) => setNewItem({ ...newItem, is_3rd_party_capable: e.target.checked })}
                  className="w-5 h-5 rounded bg-black/40 border border-white/10 text-emerald-500"
                />
                <label htmlFor="3rd_party" className="text-xs font-bold uppercase tracking-widest text-slate-400">Allows 3rd Party Linking</label>
              </div>
              <button type="submit" className="w-full py-4 bg-emerald-500 text-black font-black uppercase text-xs rounded-xl hover:scale-[1.02] transition-all mt-2">Publish Provider</button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {providers.map(provider => (
          <div key={provider.id} className="p-6 rounded-3xl bg-white/5 border border-white/5 flex items-center gap-6 group hover:border-emerald-500/20 transition-all">
            <div className="w-16 h-16 rounded-2xl bg-black/40 flex items-center justify-center overflow-hidden border border-white/5">
              {provider.branding_url ? (
                <img src={provider.branding_url} alt="" className="w-10 h-10 object-contain" />
              ) : (
                <Building size={32} className="text-emerald-500/40" />
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="font-black text-xl tracking-tight">{provider.name}</h3>
                {provider.is_3rd_party_capable && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-black text-[8px] uppercase tracking-widest border border-blue-500/20">3rd Party Ready</span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-1 text-slate-500 text-xs">
                {provider.website_url && (
                    <a href={provider.website_url} target="_blank" rel="noreferrer" className="hover:text-emerald-400 flex items-center gap-1"><Globe size={12} /> {new URL(provider.website_url).hostname}</a>
                )}
                {provider.billing_processor_id && (
                    <span className="flex items-center gap-1 opacity-60">< Zap size={12} /> Powered by {provider.billing_processor_name}</span>
                )}
              </div>
            </div>

            <div className="hidden md:flex items-center gap-8">
               <div className="text-right">
                  <p className="text-[8px] font-black text-slate-600 uppercase mb-1">Infrastructure</p>
                  <p className="text-[10px] font-black text-slate-300 uppercase flex items-center gap-1.5 justify-end">
                    <Server size={10} className="text-emerald-500" /> Cloud Sync Active
                  </p>
               </div>
               <div className="flex gap-2">
                 <button className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-500 hover:text-white hover:border-white/20 transition-all"><Edit2 size={16} /></button>
                 <button className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-500 hover:text-red-500 hover:border-red-500/20 transition-all"><Trash2 size={16} /></button>
               </div>
            </div>
          </div>
        ))}

        {providers.length === 0 && (
          <div className="py-32 text-center rounded-[3rem] border border-dashed border-white/10 bg-white/2 overflow-hidden">
             <Shield size={48} className="mx-auto text-slate-800 mb-4" />
            <h4 className="text-xl font-black text-slate-500 uppercase tracking-widest">No Providers Registered</h4>
            <p className="text-xs text-slate-600 mt-2">Initialize the universal registry to empower users with forensic bill tracking.</p>
          </div>
        )}
      </div>
    </PCCPortal>
  );
};

export default PCCProviders;
