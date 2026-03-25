import React, { useState, useEffect } from 'react';
import PCCPortal from './PCCPortal';

const PCCRegistry: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState({ item_type: 'biller', name: '', logo_url: '', website_url: '' });

  useEffect(() => {
    const fetchRegistry = async () => {
      try {
        const token = localStorage.getItem('ledger_token');
        const apiUrl = import.meta.env.VITE_API_URL;
        const res = await fetch(`${apiUrl}/api/pcc/registry`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setItems(data);
      } catch (err) {
        console.error('Failed to fetch registry:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRegistry();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('ledger_token');
    const apiUrl = import.meta.env.VITE_API_URL;
    const res = await fetch(`${apiUrl}/api/pcc/registry`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem)
    });
    if (res.ok) {
      const { id } = await res.json();
      setItems([{ ...newItem, id, created_at: new Date().toISOString() }, ...items]);
      setNewItem({ item_type: 'biller', name: '', logo_url: '', website_url: '' });
    }
  };

  if (loading) return <PCCPortal activePath="#/system-pcc/registry"><div className="animate-pulse">Loading Universal Registry...</div></PCCPortal>;

  return (
    <PCCPortal activePath="#/system-pcc/registry">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Creation Form */}
        <div className="lg:col-span-1">
          <div className="sticky top-32 p-8 rounded-3xl bg-white/5 border border-white/5">
            <h3 className="text-xl font-bold mb-6">Register New Utility</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Item Type</label>
                <select 
                  value={newItem.item_type} 
                  onChange={(e) => setNewItem({ ...newItem, item_type: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm"
                >
                  <option value="biller">Biller / Service</option>
                  <option value="category">Global Category</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Display Name</label>
                <input 
                  type="text" 
                  value={newItem.name} 
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="e.g. Netflix"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Logo URL</label>
                <input 
                  type="text" 
                  value={newItem.logo_url} 
                  onChange={(e) => setNewItem({ ...newItem, logo_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm"
                />
              </div>
              <button type="submit" className="w-full py-3 bg-emerald-500 text-black font-black uppercase text-xs rounded-xl hover:scale-[1.02] transition-all mt-4">Add to Registry</button>
            </form>
          </div>
        </div>

        {/* Registry List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black italic tracking-tighter uppercase underline decoration-emerald-500/50 underline-offset-8">Universal Registry</h2>
            <div className="flex gap-2">
               <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none flex items-center">{items.filter(i => i.item_type === 'biller').length} Billers</span>
               <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none flex items-center">{items.filter(i => i.item_type === 'category').length} Categories</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map(item => (
              <div key={item.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-4 group hover:border-emerald-500/20 transition-all">
                <div className="w-12 h-12 rounded-xl bg-black/40 flex items-center justify-center overflow-hidden border border-white/5">
                  {item.logo_url ? <img src={item.logo_url} alt="" className="w-8 h-8 object-contain" /> : <span className="text-lg">📦</span>}
                </div>
                <div>
                  <p className="font-bold text-sm tracking-tight">{item.name}</p>
                  <p className="text-[10px] uppercase font-black text-emerald-500/60 tracking-widest">{item.item_type}</p>
                </div>
                <button className="ml-auto opacity-0 group-hover:opacity-100 p-2 text-gray-500 hover:text-red-500 transition-all">✕</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PCCPortal>
  );
};

export default PCCRegistry;
