import React, { useState, useEffect } from 'react';
import AdminPortal from './AdminPortal';
import { getApiUrl } from '../../utils/api';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { useToast } from '../../context/ToastContext';
import { Plus, Trash2, Zap, Building2, Search, ShieldAlert, ExternalLink } from 'lucide-react';

const AdminData: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const { showToast } = useToast();
  
  const [newItem, setNewItem] = useState({ 
    item_type: 'processor', 
    name: '', 
    logo_url: '', 
    website_url: '',
    metadata_json: {} 
  });

  const fetchItems = async () => {
    try {
      const token = localStorage.getItem('ledger_token');
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/admin/records`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch system data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('ledger_token');
    const apiUrl = getApiUrl();
    
    // Ensure metadata_json is a valid object if empty
    const submissionData = {
      ...newItem,
      metadata_json: newItem.metadata_json || {}
    };

    const res = await fetch(`${apiUrl}/api/admin/records`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(submissionData)
    });
    
    if (res.ok) {
      showToast('System item added successfully', 'success');
      setShowAdd(false);
      setNewItem({ item_type: 'processor', name: '', website_url: '', logo_url: '', metadata_json: {} });
      fetchItems();
    } else {
      const err = await res.json();
      showToast(err.message || 'Submission Failed', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this item from the system?')) return;
    
    const token = localStorage.getItem('ledger_token');
    const apiUrl = getApiUrl();
    const res = await fetch(`${apiUrl}/api/admin/records/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      showToast('Item removed from system', 'success');
      fetchItems();
    } else {
      showToast('Delete Failed', 'error');
    }
  };

  if (loading) return <AdminPortal activePath="#/admin/registry"><div className="animate-pulse p-12 text-center text-slate-500 font-black uppercase tracking-widest italic">Loading data...</div></AdminPortal>;

  return (
    <AdminPortal activePath="#/admin/registry">
      <div className="flex items-center justify-between mb-12">
        <div>
          <h2 className="text-3xl font-black italic tracking-tighter uppercase underline decoration-primary/50 underline-offset-8">System Data</h2>
          <p className="text-xs text-slate-500 uppercase tracking-[0.4em] font-black mt-2">Central data management</p>
        </div>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="px-6 py-3 bg-white text-black font-black uppercase text-sm rounded-xl hover:scale-[1.05] transition-all flex items-center gap-2"
        >
          {showAdd ? 'Cancel' : <><Plus size={16} /> Add New Entry</>}
        </button>
      </div>

      {showAdd && (
        <div className="mb-12 p-10 rounded-[2.5rem] bg-white/5 border border-white/5 animate-in fade-in slide-in-from-top-4 duration-500 shadow-2xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
               <ShieldAlert size={20} />
            </div>
            <h3 className="text-xl font-black italic uppercase tracking-tight">Add System Item</h3>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2 block">Item Category</label>
                <SearchableSelect 
                   options={[
                     { value: 'processor', label: 'Billing Processor' },
                     { value: 'provider', label: 'Service Provider' },
                     { value: 'merchant', label: 'Merchant / Entity' }
                   ]}
                   value={newItem.item_type}
                   onChange={(val) => setNewItem({ ...newItem, item_type: val as any })}
                   placeholder="Select Type..."
                />
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2 block">Display Name</label>
                <input 
                  type="text" 
                  value={newItem.name} 
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="e.g. Netflix, Stripe, etc."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-primary transition-all outline-none"
                  required
                />
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2 block">Website (Optional)</label>
                <input 
                  type="url" 
                  value={newItem.website_url} 
                  onChange={(e) => setNewItem({ ...newItem, website_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-primary transition-all outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2 block">Logo Asset URL</label>
                <input 
                  type="url" 
                  value={newItem.logo_url} 
                  onChange={(e) => setNewItem({ ...newItem, logo_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-primary transition-all outline-none"
                />
              </div>
              <button type="submit" className="w-full py-4 bg-primary text-black font-black uppercase text-sm rounded-xl hover:scale-[1.02] transition-all shadow-xl shadow-primary/20">Add Item to System</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map(item => (
          <div key={item.id} className="p-8 rounded-[2.5rem] bg-white/5 border border-white/5 flex items-center justify-between group hover:border-primary/20 transition-all shadow-lg bg-gradient-to-br from-white/2 to-transparent">
            <div className="flex items-center gap-5">
               <div className="w-16 h-16 rounded-2xl bg-black/40 flex items-center justify-center border border-white/5 text-primary shadow-inner">
                  {item.item_type === 'processor' ? <Zap size={24} /> : item.item_type === 'provider' ? <Building2 size={24} /> : <Search size={24} />}
               </div>
               <div>
                  <h3 className="font-black text-xl tracking-tighter italic uppercase">{item.name}</h3>
                  <div className="flex items-center gap-2 mt-2">
                     <span className="text-[12px] font-black uppercase text-slate-500 tracking-[0.2em]">{item.item_type}</span>
                     <span className="w-1 h-1 rounded-full bg-white/10"></span>
                     <span className="text-[12px] font-black uppercase text-emerald-500/60 tracking-widest italic flex items-center gap-1.5 opacity-60">Verified <ExternalLink size={8} /></span>
                  </div>
               </div>
            </div>
            <button 
              onClick={() => handleDelete(item.id)}
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-600 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 shadow-xl"
            >
               <Trash2 size={16} />
            </button>
          </div>
        ))}
        
        {items.length === 0 && (
          <div className="col-span-full py-32 text-center rounded-[4rem] border border-dashed border-white/10 bg-white/2 overflow-hidden reveal">
            <h4 className="text-xl font-black text-slate-500 uppercase tracking-widest">No entries found</h4>
            <p className="text-sm text-slate-600 mt-2">Add system-wide entities to enable cross-platform mapping.</p>
          </div>
        )}
      </div>
    </AdminPortal>
  );
};

export default AdminData;
