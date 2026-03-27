import React, { useState, useEffect } from 'react';
import PCCPortal from './PCCPortal';
import { CreditCard, Globe, LifeBuoy, Plus, Trash2, Edit2, ExternalLink } from 'lucide-react';

const PCCProcessors: React.FC = () => {
  const [processors, setProcessors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    website_url: '',
    branding_url: '',
    support_url: '',
    subscription_id_notes: ''
  });

  const fetchProcessors = async () => {
    try {
      const token = localStorage.getItem('ledger_token');
      const apiUrl = import.meta.env.VITE_API_URL;
      const res = await fetch(`${apiUrl}/api/pcc/processors`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setProcessors(data);
    } catch (err) {
      console.error('Failed to fetch processors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcessors();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('ledger_token');
    const apiUrl = import.meta.env.VITE_API_URL;
    const res = await fetch(`${apiUrl}/api/pcc/processors`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem)
    });
    if (res.ok) {
      setShowAdd(false);
      setNewItem({ name: '', website_url: '', branding_url: '', support_url: '', subscription_id_notes: '' });
      fetchProcessors();
    }
  };

  if (loading) return <PCCPortal activePath="#/system-pcc/processors"><div className="animate-pulse">Accessing Processor Registry...</div></PCCPortal>;

  return (
    <PCCPortal activePath="#/system-pcc/processors">
      <div className="flex items-center justify-between mb-12">
        <div>
          <h2 className="text-3xl font-black italic tracking-tighter uppercase underline decoration-blue-500/50 underline-offset-8">Billing Processors</h2>
          <p className="text-[10px] text-slate-500 uppercase tracking-[0.4em] font-black mt-2">God Mode - 3rd Party Infrastructure</p>
        </div>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="px-6 py-3 bg-blue-500 text-black font-black uppercase text-xs rounded-xl hover:scale-[1.05] transition-all flex items-center gap-2"
        >
          {showAdd ? 'Cancel' : <><Plus size={16} /> Register Processor</>}
        </button>
      </div>

      {showAdd && (
        <div className="mb-12 p-8 rounded-3xl bg-white/5 border border-white/5 animate-in fade-in slide-in-from-top-4 duration-500">
          <h3 className="text-xl font-bold mb-6">Processor Configuration</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Processor Name</label>
                <input 
                  type="text" 
                  value={newItem.name} 
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="e.g. Stripe, PayPal, Recurly"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Corporate Website</label>
                <input 
                  type="url" 
                  value={newItem.website_url} 
                  onChange={(e) => setNewItem({ ...newItem, website_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Branding Assets (Logo URL)</label>
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
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Support Site URL</label>
                <input 
                  type="url" 
                  value={newItem.support_url} 
                  onChange={(e) => setNewItem({ ...newItem, support_url: e.target.value })}
                  placeholder="https://support.stripe.com"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Subscription ID Notes</label>
                <textarea 
                  value={newItem.subscription_id_notes} 
                  onChange={(e) => setNewItem({ ...newItem, subscription_id_notes: e.target.value })}
                  placeholder="e.g. Look for keys starting with 'sub_' in the metadata."
                  rows={3}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm"
                />
              </div>
              <button type="submit" className="w-full py-4 bg-blue-500 text-black font-black uppercase text-xs rounded-xl hover:scale-[1.02] transition-all mt-2">Initialize Processor</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {processors.map(processor => (
          <div key={processor.id} className="p-6 rounded-[2rem] bg-white/5 border border-white/5 hover:border-blue-500/20 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-all">
                <button className="p-2 text-slate-500 hover:text-white"><Edit2 size={16} /></button>
                <button className="p-2 text-slate-500 hover:text-red-500"><Trash2 size={16} /></button>
            </div>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-black/40 flex items-center justify-center overflow-hidden border border-white/5">
                {processor.branding_url ? (
                  <img src={processor.branding_url} alt="" className="w-10 h-10 object-contain" />
                ) : (
                  <CreditCard size={32} className="text-blue-500/40" />
                )}
              </div>
              <div>
                <h3 className="font-black text-lg tracking-tight">{processor.name}</h3>
                <div className="flex gap-2 mt-1">
                  {processor.website_url && (
                    <a href={processor.website_url} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-blue-400"><Globe size={14} /></a>
                  )}
                  {processor.support_url && (
                    <a href={processor.support_url} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-emerald-400"><LifeBuoy size={14} /></a>
                  )}
                </div>
              </div>
            </div>

            {processor.subscription_id_notes && (
              <div className="mt-4 p-4 rounded-xl bg-black/20 border border-white/5">
                <p className="text-[8px] font-black uppercase text-slate-600 tracking-widest mb-2">ID IDENTIFICATION LOGIC</p>
                <p className="text-[10px] text-slate-400 italic line-clamp-2">{processor.subscription_id_notes}</p>
              </div>
            )}
            
            <div className="mt-8 flex items-center justify-between border-t border-white/5 pt-4">
               <div>
                  <p className="text-[8px] font-black text-slate-600 uppercase">Status</p>
                  <p className="text-[10px] font-black text-emerald-500 uppercase flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                  </p>
               </div>
               <button className="text-[10px] font-black text-slate-500 uppercase hover:text-white flex items-center gap-1">Manage Connections <ExternalLink size={10} /></button>
            </div>
          </div>
        ))}

        {processors.length === 0 && (
          <div className="col-span-full py-20 text-center rounded-[3rem] border border-dashed border-white/10 bg-white/2 overflow-hidden">
            <h4 className="text-xl font-black text-slate-500 uppercase tracking-widest">No Infrastructure Logged</h4>
            <p className="text-xs text-slate-600 mt-2">Initialize your first 3rd party billing processor to begin coverage mapping.</p>
          </div>
        )}
      </div>
    </PCCPortal>
  );
};

export default PCCProcessors;
