import React, { useState, useEffect } from 'react';
import AdminPortal from './AdminPortal';
import { getApiUrl } from '../../utils/api';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { useToast } from '../../context/ToastContext';
import { Plus, Trash2, Zap, Building2, Search, ShieldAlert, ExternalLink } from 'lucide-react';
import { InlineToast } from '../../components/ui/InlineToast';
import { useAuth } from '../../context/AuthContext';

const AdminData: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const { showToast, showConfirm } = useToast();
  const { secureFetch } = useAuth();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  const [newItem, setNewItem] = useState({ 
    itemType: 'processor', 
    name: '', 
    logoUrl: '', 
    websiteUrl: '',
    metadataJson: {} 
  });

  const fetchItems = async () => {
    try {
      const res = await secureFetch(`/api/admin/system/registry`);
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
    
    // Ensure metadataJson is a valid object if empty
    const submissionData = {
      ...newItem,
      metadataJson: newItem.metadataJson || {}
    };

    const res = await secureFetch(`/api/admin/system/registry`, {
      method: 'POST',
      body: JSON.stringify(submissionData)
    });
    
    if (res.ok) {
      showToast('System item added successfully', 'success');
      setShowAdd(false);
      setNewItem({ itemType: 'processor', name: '', websiteUrl: '', logoUrl: '', metadataJson: {} });
      fetchItems();
    } else {
      const err = await res.json();
      showToast(err.message || 'Submission Failed', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const res = await secureFetch(`/api/admin/system/registry/${id}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      showToast('Item removed from system', 'success');
      setConfirmDeleteId(null);
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
                   value={newItem.itemType}
                   onChange={(val) => setNewItem({ ...newItem, itemType: val as any })}
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
                  value={newItem.websiteUrl} 
                  onChange={(e) => setNewItem({ ...newItem, websiteUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-primary transition-all outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2 block">Logo Asset URL</label>
                <input 
                  type="url" 
                  value={newItem.logoUrl} 
                  onChange={(e) => setNewItem({ ...newItem, logoUrl: e.target.value })}
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
                  {item.itemType === 'processor' ? <Zap size={24} /> : item.itemType === 'provider' ? <Building2 size={24} /> : <Search size={24} />}
               </div>
               <div>
                  <h3 className="font-black text-xl tracking-tighter italic uppercase">{item.name}</h3>
                  <div className="flex items-center gap-2 mt-2">
                     <span className="text-[12px] font-black uppercase text-slate-500 tracking-[0.2em]">{item.itemType}</span>
                     <span className="w-1 h-1 rounded-full bg-white/10"></span>
                     <span className="text-[12px] font-black uppercase text-emerald-500/60 tracking-widest italic flex items-center gap-1.5 opacity-60">Verified <ExternalLink size={8} /></span>
                  </div>
               </div>
            </div>
            {confirmDeleteId === item.id ? (
              <InlineToast 
                message="Delete entry?" 
                type="confirm" 
                onConfirm={() => handleDelete(item.id)} 
                onCancel={() => setConfirmDeleteId(null)} 
              />
            ) : (
              <button 
                onClick={() => setConfirmDeleteId(item.id)}
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-600 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 shadow-xl"
              >
                 <Trash2 size={16} />
              </button>
            )}
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
