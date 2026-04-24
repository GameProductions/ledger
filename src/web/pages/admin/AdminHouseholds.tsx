import React, { useState, useEffect } from 'react';
import AdminPortal from './AdminPortal';
import { Shield, Trash2, Edit3, Search, Users, Activity, Globe, X } from 'lucide-react';
import { getApiUrl } from '../../utils/api';
import { motion } from 'framer-motion';

const AdminHouseholds: React.FC = () => {
  const [households, setHouseholds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const fetchHouseholds = async () => {
    try {
      const token = localStorage.getItem('ledger_token');
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/admin/households`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setHouseholds(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch households:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHouseholds();
  }, []);

  const handleRename = async (id: string) => {
    if (!newName) return;
    try {
      const token = localStorage.getItem('ledger_token');
      const apiUrl = getApiUrl();
      await fetch(`${apiUrl}/api/admin/households/${id}`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newName })
      });
      setHouseholds(prev => prev.map(h => h.id === id ? { ...h, name: newName } : h));
      setEditingId(null);
      setNewName('');
    } catch (err) {
      console.error('Rename failed:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Warning: Are you sure you want to delete this household? This will remove all memberships and associated financial records.')) return;
    try {
      const token = localStorage.getItem('ledger_token');
      const apiUrl = getApiUrl();
      await fetch(`${apiUrl}/api/admin/households/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setHouseholds(prev => prev.filter(h => h.id !== id));
    } catch (err) {
      console.error('Deletion failed:', err);
    }
  };

  const filtered = households.filter(h => 
    h.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <AdminPortal activePath="#/admin/households">
      <div className="flex flex-col items-center justify-center min-h-[400px] text-emerald-500">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
        <div className="text-xs font-black uppercase tracking-[0.3em]">Loading household registry...</div>
      </div>
    </AdminPortal>
  );

  return (
    <AdminPortal activePath="#/admin/households">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-12 gap-6">
        <div>
          <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-none">
            Household <span className="text-emerald-500">Registry</span>
          </h2>
          <p className="text-sm text-slate-500 mt-2 uppercase tracking-widest font-bold">Manage households and memberships</p>
        </div>
        <div className="relative">
          <input 
            type="text" 
            placeholder="Filter by ID or Name..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-emerald-500 transition-all text-sm w-full lg:w-96 shadow-2xl backdrop-blur-sm"
          />
          <Search className="absolute left-4 top-4.5 opacity-30 text-emerald-500" size={18} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(filtered || []).map(h => (
          <motion.div 
            key={h.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 border border-white/10 rounded-[2rem] p-8 hover:border-emerald-500/30 transition-all group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-6 flex gap-2">
               <button 
                 onClick={() => { setEditingId(h.id); setNewName(h.name); }}
                 className="p-2 bg-white/5 hover:bg-emerald-500 hover:text-black rounded-lg transition-all text-slate-500"
               >
                 <Edit3 size={16} />
               </button>
               <button 
                 onClick={() => handleDelete(h.id)}
                 className="p-2 bg-white/5 hover:bg-red-500 hover:text-white rounded-lg transition-all text-slate-500"
               >
                 <Trash2 size={16} />
               </button>
            </div>

            <div className="flex items-center gap-4 mb-6">
               <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                  <Shield size={24} />
               </div>
               <div>
                  {editingId === h.id ? (
                    <div className="flex items-center gap-2">
                      <input 
                        type="text"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        className="bg-black border border-emerald-500/50 p-1 rounded text-sm text-white font-black"
                        autoFocus
                      />
                      <button onClick={() => handleRename(h.id)} className="text-emerald-500"><Activity size={16} /></button>
                      <button onClick={() => setEditingId(null)} className="text-red-500"><X size={16} /></button>
                    </div>
                  ) : (
                    <h3 className="text-xl font-black uppercase tracking-tight group-hover:text-emerald-400 transition-colors">{h.name}</h3>
                  )}
                  <p className="text-xs text-slate-600 font-mono tracking-tighter uppercase">{h.id}</p>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/5">
               <div>
                   <div className="text-[10px] text-slate-600 font-black uppercase tracking-widest mb-1">Members</div>
                   <div className="flex items-center gap-2">
                      <Users size={14} className="text-emerald-500" />
                      <span className="text-sm font-bold text-slate-300">{h.memberCount} Members</span>
                   </div>
               </div>
               <div>
                  <div className="text-[10px] text-slate-600 font-black uppercase tracking-widest mb-1">Currency</div>
                  <div className="flex items-center gap-2">
                     <Globe size={14} className="text-blue-500" />
                     <span className="text-sm font-bold text-slate-300">{h.currency}</span>
                  </div>
               </div>
            </div>

            <div className="mt-6">
               <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
                  <div className="bg-emerald-500 h-full" style={{ width: '65%' }} />
               </div>
                <div className="flex justify-between items-center mt-2">
                   <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Resource Usage</span>
                   <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Optimal</span>
                </div>
            </div>
          </motion.div>
        ))}
      </div>
    </AdminPortal>
  );
};

export default AdminHouseholds;
