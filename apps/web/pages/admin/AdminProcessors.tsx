import React, { useState, useEffect } from 'react';
import AdminPortal from './AdminPortal';
import { CreditCard, Globe, LifeBuoy, Plus, Trash2, Edit2, ExternalLink, ShieldAlert } from 'lucide-react';
import { getApiUrl } from '../../utils/api';
import { useToast } from '../../context/ToastContext';

const AdminProcessors: React.FC = () => {
  const [processors, setProcessors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { showToast, showConfirm } = useToast();
  
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
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/admin/networks`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setProcessors(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch processors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcessors();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('ledger_token');
    const apiUrl = getApiUrl();
    
    const url = editingId 
      ? `${apiUrl}/api/admin/networks/${editingId}`
      : `${apiUrl}/api/admin/networks`;
    
    const method = editingId ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem)
    });

    if (res.ok) {
      showToast(editingId ? 'Processor updated' : 'New processor added', 'success');
      setShowAdd(false);
      setEditingId(null);
      setNewItem({ name: '', website_url: '', branding_url: '', support_url: '', subscription_id_notes: '' });
      fetchProcessors();
    } else {
      const err = await res.json();
      showToast(err.message || 'Failed to save', 'error');
    }
  };

  const handleEdit = (processor: any) => {
    setEditingId(processor.id);
    setNewItem({
      name: processor.name,
      website_url: processor.website_url || processor.websiteUrl || '',
      branding_url: processor.branding_url || processor.brandingUrl || '',
      support_url: processor.support_url || processor.supportUrl || '',
      subscription_id_notes: processor.subscription_id_notes || processor.subscriptionIdNotes || ''
    });
    setShowAdd(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm('Warning: Are you sure you want to delete this processor? This action will be logged.', 'Delete Processor');
    if (!confirmed) return;
    
    const token = localStorage.getItem('ledger_token');
    const apiUrl = getApiUrl();
    const res = await fetch(`${apiUrl}/api/admin/networks/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      showToast('Processor deleted', 'success');
      fetchProcessors();
    } else {
      const err = await res.json();
      showToast(err.message || 'Deletion failed', 'error');
    }
  };

  if (loading) return <AdminPortal activePath="#/admin/processors"><div className="animate-pulse p-12 text-center text-slate-500 font-black uppercase tracking-widest italic">Loading processors...</div></AdminPortal>;

  return (
    <AdminPortal activePath="#/admin/processors">
      <div className="flex items-center justify-between mb-12">
        <div>
          <h2 className="text-3xl font-black italic tracking-tighter uppercase underline decoration-blue-500/50 underline-offset-8">Billing Processors</h2>
          <p className="text-xs text-slate-500 uppercase tracking-[0.4em] font-black mt-2">Super Admin Mode - Billing Infrastructure</p>
        </div>
        <button 
          onClick={() => {
            if (showAdd) {
                setEditingId(null);
                setNewItem({ name: '', website_url: '', branding_url: '', support_url: '', subscription_id_notes: '' });
            }
            setShowAdd(!showAdd);
          }}
          className={`px-6 py-3 ${showAdd ? 'bg-white/5 text-white' : 'bg-blue-500 text-black'} font-black uppercase text-sm rounded-xl hover:scale-[1.05] transition-all flex items-center gap-2`}
        >
          {showAdd ? 'Cancel' : <><Plus size={16} /> Add Processor</>}
        </button>
      </div>

      {showAdd && (
        <div className="mb-12 p-10 rounded-[2.5rem] bg-white/5 border border-white/5 animate-in fade-in slide-in-from-top-4 duration-500 shadow-2xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
               <ShieldAlert size={20} />
            </div>
            <h3 className="text-xl font-black italic uppercase tracking-tight">{editingId ? 'Edit Processor' : 'Add Processor'}</h3>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2 block">Processor Name</label>
                <input 
                  type="text" 
                  value={newItem.name} 
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="e.g. Stripe, PayPal, Recurly"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500/50 transition-all outline-none"
                  required
                />
              </div>
               <div>
                <label className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2 block">Corporate Website</label>
                <input 
                  type="url" 
                  value={newItem.website_url} 
                  onChange={(e) => setNewItem({ ...newItem, website_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500/50 transition-all outline-none"
                />
              </div>
               <div>
                <label className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2 block">Branding Assets (Logo URL)</label>
                <input 
                  type="url" 
                  value={newItem.branding_url} 
                  onChange={(e) => setNewItem({ ...newItem, branding_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500/50 transition-all outline-none"
                />
              </div>
            </div>
            <div className="space-y-6">
               <div>
                <label className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2 block">Support URL</label>
                <input 
                  type="url" 
                  value={newItem.support_url} 
                  onChange={(e) => setNewItem({ ...newItem, support_url: e.target.value })}
                  placeholder="https://support.stripe.com"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500/50 transition-all outline-none"
                />
              </div>
               <div>
                <label className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2 block">Subscription ID Notes</label>
                <textarea 
                  value={newItem.subscription_id_notes} 
                  onChange={(e) => setNewItem({ ...newItem, subscription_id_notes: e.target.value })}
                  placeholder="e.g. Look for keys starting with 'sub_' in the metadata."
                  rows={3}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500/50 transition-all outline-none"
                />
              </div>
              <button type="submit" className="w-full py-4 bg-blue-500 text-black font-black uppercase text-sm rounded-xl hover:scale-[1.02] transition-all shadow-xl shadow-blue-500/20">
                {editingId ? 'Save Changes' : 'Add Processor'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(processors || []).map(processor => (
          <div key={processor.id} className="p-8 rounded-[2.5rem] bg-white/5 border border-white/5 hover:border-blue-500/20 transition-all group relative overflow-visible shadow-lg">
            <div className="absolute top-0 right-0 p-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 duration-300">
                <button 
                  onClick={() => handleEdit(processor)}
                  className="w-10 h-10 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-blue-500/20 transition-all shadow-xl"
                >
                    <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => handleDelete(processor.id)}
                  className="w-10 h-10 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-500/20 transition-all shadow-xl"
                >
                    <Trash2 size={16} />
                </button>
            </div>
            
            <div className="flex items-center gap-5 mb-8">
              <div className="w-20 h-20 rounded-3xl bg-black/40 flex items-center justify-center overflow-hidden border border-white/5 p-4 shadow-inner">
                {processor.brandingUrl ? (
                  <img src={processor.brandingUrl} alt="" className="w-full h-full object-contain" />
                ) : (
                  <CreditCard size={32} className="text-blue-500/40" />
                )}
              </div>
              <div>
                <h3 className="font-black text-xl tracking-tighter italic uppercase">{processor.name}</h3>
                <div className="flex gap-3 mt-2">
                  {processor.websiteUrl && (
                    <a href={processor.websiteUrl} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-500 hover:text-blue-400 border border-white/5 transition-all"><Globe size={14} /></a>
                  )}
                  {processor.supportUrl && (
                    <a href={processor.supportUrl} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-500 hover:text-emerald-400 border border-white/5 transition-all"><LifeBuoy size={14} /></a>
                  )}
                </div>
              </div>
            </div>
            
            {processor.subscriptionIdNotes && (
              <div className="mt-4 p-5 rounded-2xl bg-black/20 border border-white/5 shadow-inner">
                <p className="text-[10px] font-black uppercase text-slate-600 tracking-widest mb-2 opacity-60 italic">Identification Logic</p>
                <p className="text-xs text-slate-400 leading-relaxed italic">{processor.subscriptionIdNotes}</p>
              </div>
            )}
            
            <div className="mt-10 flex items-center justify-between border-t border-white/5 pt-6">
               <div>
                  <p className="text-[10px] font-black text-slate-600 uppercase mb-1">System Status</p>
                  <p className="text-xs font-black text-emerald-500 uppercase flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> System Active
                  </p>
               </div>
               <button className="text-xs font-black text-slate-500 uppercase hover:text-white flex items-center gap-1.5 transition-all hover:translate-x-1">Coverage <ExternalLink size={10} /></button>
            </div>
          </div>
        ))}

        {processors.length === 0 && (
          <div className="col-span-full py-32 text-center rounded-[3rem] border border-dashed border-white/10 bg-white/2 overflow-hidden reveal">
            <h4 className="text-xl font-black text-slate-500 uppercase tracking-widest">No Processors Added</h4>
            <p className="text-sm text-slate-600 mt-2">Setup your first billing processor to begin coverage mapping.</p>
          </div>
        )}
      </div>
    </AdminPortal>
  );
};

export default AdminProcessors;
