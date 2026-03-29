import React, { useState, useEffect } from 'react';
import PCCPortal from './PCCPortal';
import { Building2, Globe, Plus, Trash2, Edit2, Zap, Server, ShieldAlert } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { SearchableSelect } from '../../components/ui/SearchableSelect';

const PCCProviders: React.FC = () => {
  const [providers, setProviders] = useState<any[]>([]);
  const [processors, setProcessors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { showToast } = useToast();

  const [newItem, setNewItem] = useState({
    name: '',
    billing_processor_id: '',
    website_url: '',
    branding_url: '',
    logo_url: '',
    support_email: '',
    privacy_policy_url: '',
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
      
      setProviders(Array.isArray(provData) ? provData : []);
      setProcessors(Array.isArray(procData) ? procData : []);
    } catch (err) {
      console.error('Data acquisition failure:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('ledger_token');
    const apiUrl = import.meta.env.VITE_API_URL;
    
    const url = editingId 
      ? `${apiUrl}/api/pcc/providers/${editingId}`
      : `${apiUrl}/api/pcc/providers`;
    
    const method = editingId ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem)
    });

    if (res.ok) {
      showToast(editingId ? 'Provider configuration synchronized' : 'New service provider authorized', 'success');
      setShowAdd(false);
      setEditingId(null);
      setNewItem({ name: '', billing_processor_id: '', website_url: '', branding_url: '', logo_url: '', support_email: '', privacy_policy_url: '', is_3rd_party_capable: false });
      fetchData();
    } else {
      const err = await res.json();
      showToast(err.message || 'Transmission failed', 'error');
    }
  };

  const handleEdit = (provider: any) => {
    setEditingId(provider.id);
    setNewItem({
      name: provider.name,
      billing_processor_id: provider.billing_processor_id || '',
      website_url: provider.website_url || '',
      branding_url: provider.branding_url || '',
      logo_url: provider.logo_url || provider.branding_url || '',
      support_email: provider.support_email || '',
      privacy_policy_url: provider.privacy_policy_url || '',
      is_3rd_party_capable: !!provider.is_3rd_party_capable
    });
    setShowAdd(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('EXTERMINATION PROTOCOL: Purge this service provider? Links to active subscriptions will be orphaned.')) return;
    
    const token = localStorage.getItem('ledger_token');
    const apiUrl = import.meta.env.VITE_API_URL;
    const res = await fetch(`${apiUrl}/api/pcc/providers/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      showToast('Provider purged from global registry', 'success');
      fetchData();
    } else {
      const err = await res.json();
      showToast(err.message || 'Purge failed', 'error');
    }
  };

  if (loading) return <PCCPortal activePath="#/admin/providers"><div className="animate-pulse p-12 text-center text-slate-500 font-black uppercase tracking-widest italic">Loading providers...</div></PCCPortal>;

  return (
    <PCCPortal activePath="#/admin/providers">
      <div className="flex items-center justify-between mb-12">
        <div>
          <h2 className="text-3xl font-black italic tracking-tighter uppercase underline decoration-emerald-500/50 underline-offset-8">Service Providers</h2>
          <p className="text-[10px] text-slate-500 uppercase tracking-[0.4em] font-black mt-2">God Mode - Universal Biller Registry</p>
        </div>
        <button 
          onClick={() => {
            if (showAdd) {
                setEditingId(null);
                setNewItem({ name: '', billing_processor_id: '', website_url: '', branding_url: '', logo_url: '', support_email: '', privacy_policy_url: '', is_3rd_party_capable: false });
            }
            setShowAdd(!showAdd);
          }}
          className={`px-6 py-3 ${showAdd ? 'bg-white/5 text-white' : 'bg-emerald-500 text-black'} font-black uppercase text-xs rounded-xl hover:scale-[1.05] transition-all flex items-center gap-2`}
        >
          {showAdd ? 'Abort Action' : <><Plus size={16} /> Register Provider</>}
        </button>
      </div>

      {showAdd && (
        <div className="mb-12 p-10 rounded-[2.5rem] bg-white/5 border border-white/5 animate-in fade-in slide-in-from-top-4 duration-500 shadow-2xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
               <ShieldAlert size={20} />
            </div>
            <h3 className="text-xl font-black italic uppercase tracking-tight">{editingId ? 'Modify Strategy' : 'Initialize Provider'}</h3>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Provider Name</label>
                <input 
                  type="text" 
                  value={newItem.name} 
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="e.g. Netflix, Spotify, DigitalOcean"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-emerald-500/50 transition-all outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Billing Nexus (Processor)</label>
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
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Logo URL</label>
                    <input 
                      type="url" 
                      value={newItem.logo_url} 
                      onChange={(e) => setNewItem({ ...newItem, logo_url: e.target.value, branding_url: e.target.value })}
                      placeholder="https://..."
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-emerald-500/50 transition-all outline-none"
                    />
                 </div>
                 <div className="flex items-center gap-3 pt-6">
                    <input 
                      type="checkbox" 
                      id="3rd_party_capable"
                      checked={newItem.is_3rd_party_capable} 
                      onChange={(e) => setNewItem({ ...newItem, is_3rd_party_capable: e.target.checked })}
                      className="w-5 h-5 rounded bg-black/40 border border-white/10 text-emerald-500 accent-emerald-500"
                    />
                    <label htmlFor="3rd_party_capable" className="text-[10px] font-black uppercase tracking-widest text-slate-400">3rd Party Ready</label>
                 </div>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Corporate HQ (Website)</label>
                <input 
                  type="url" 
                  value={newItem.website_url} 
                  onChange={(e) => setNewItem({ ...newItem, website_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-emerald-500/50 transition-all outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Support Intel (Email)</label>
                <input 
                  type="email" 
                  value={newItem.support_email} 
                  onChange={(e) => setNewItem({ ...newItem, support_email: e.target.value })}
                  placeholder="support@..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-emerald-500/50 transition-all outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Sovereignty Docs (Privacy Policy)</label>
                <input 
                  type="url" 
                  value={newItem.privacy_policy_url} 
                  onChange={(e) => setNewItem({ ...newItem, privacy_policy_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-emerald-500/50 transition-all outline-none"
                />
              </div>
              <button type="submit" className="w-full py-4 bg-emerald-500 text-black font-black uppercase text-xs rounded-xl hover:scale-[1.02] transition-all shadow-xl shadow-emerald-500/20">
                {editingId ? 'Push Updates to Registry' : 'Authorize Infrastructure'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {providers.map(provider => (
          <div key={provider.id} className="p-8 rounded-[3rem] bg-white/5 border border-white/5 flex items-center gap-8 group hover:border-emerald-500/20 transition-all relative overflow-visible shadow-lg bg-gradient-to-br from-white/2 to-transparent">
            <div className="w-20 h-20 rounded-3xl bg-black/40 flex items-center justify-center border border-white/5 overflow-hidden p-3 shadow-inner group-hover:border-emerald-500/30 transition-all">
                {provider.logo_url || provider.branding_url ? (
                  <img src={provider.logo_url || provider.branding_url} alt="" className="w-full h-full object-contain" />
                ) : (
                  <Building2 size={32} className="text-emerald-500/30" />
                )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-4">
                <h3 className="font-black text-2xl tracking-tighter italic uppercase underline underline-offset-4 decoration-white/10">{provider.name}</h3>
                {provider.is_3rd_party_capable && (
                  <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 font-black text-[9px] uppercase tracking-[0.2em] border border-blue-500/20">3rd Party SDK Ready</span>
                )}
              </div>
              <div className="flex items-center gap-6 mt-3 text-slate-500 text-xs">
                {provider.website_url && (
                    <a href={provider.website_url} target="_blank" rel="noreferrer" className="hover:text-blue-400 flex items-center gap-2 transition-all font-bold tracking-tight italic">
                        <Globe size={14} className="text-secondary" /> {new URL(provider.website_url).hostname}
                    </a>
                )}
                {provider.processor_name && (
                    <span className="flex items-center gap-2 opacity-60 font-black uppercase text-[10px] tracking-widest text-emerald-500">
                        <Zap size={14} /> Powered by {provider.processor_name}
                    </span>
                )}
              </div>
            </div>

            <div className="hidden md:flex items-center gap-12">
               <div className="text-right space-y-1">
                  <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Operational Protocol</p>
                  <p className="text-[10px] font-black text-slate-300 uppercase flex items-center gap-2 justify-end">
                    <Server size={12} className="text-emerald-500" /> Identity Verified
                  </p>
               </div>
               <div className="flex gap-3">
                 <button 
                  onClick={() => handleEdit(provider)}
                  className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-500 hover:text-white hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all shadow-xl"
                 >
                    <Edit2 size={18} />
                 </button>
                 <button 
                  onClick={() => handleDelete(provider.id)}
                  className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-500 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/30 transition-all shadow-xl"
                 >
                    <Trash2 size={18} />
                 </button>
               </div>
            </div>
          </div>
        ))}

        {providers.length === 0 && (
          <div className="py-32 text-center rounded-[4rem] border border-dashed border-white/10 bg-white/2 overflow-hidden reveal">
            <h4 className="text-xl font-black text-slate-500 uppercase tracking-widest">No Providers Registered</h4>
            <p className="text-xs text-slate-600 mt-2">Initialize the universal registry to empower users with forensic bill tracking.</p>
          </div>
        )}
      </div>
    </PCCPortal>
  );
};

export default PCCProviders;
