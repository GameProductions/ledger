import React, { useState, useEffect } from 'react';
import AdminPortal from './AdminPortal';
import { Shield, Trash2, Edit3, Search, Users, Activity, Globe, X, ArrowRightLeft, ShieldAlert, ChevronDown } from 'lucide-react';
import { getApiUrl } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { InlineToast } from '../../components/ui/InlineToast';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Checkbox } from '../../components/ui/Checkbox';

const MOVE_CATEGORIES: { key: string; label: string; hint: string }[] = [
  { key: 'membership', label: 'Membership', hint: 'Move the member into the destination household' },
  { key: 'transactions', label: 'Transactions', hint: 'Transactions where this member is the owner' },
  { key: 'bills', label: 'Bills', hint: 'Bills owned by this member' },
  { key: 'subscriptions', label: 'Subscriptions', hint: 'Subscriptions owned by this member' },
  { key: 'pairingRules', label: 'Pairing Rules', hint: 'Transaction pairing rules owned by this member' },
  { key: 'paySchedules', label: 'Pay Schedules', hint: 'Pay schedules & exceptions assigned to this member' },
  { key: 'paymentMethods', label: 'Payment Methods', hint: 'User payment methods & linked accounts' },
  { key: 'externalContacts', label: 'External Contacts', hint: 'Contacts created by this member' },
  { key: 'reminders', label: 'Reminders', hint: 'Reminders assigned to this member' },
  { key: 'loans', label: 'Personal Loans', hint: 'Loans where this member is the lender' },
  { key: 'liabilitySplits', label: 'Liability Splits', hint: 'Splits involving this member' },
  { key: 'sharedBalances', label: 'Shared Balances', hint: 'Balances shared to/from this member' },
];

// --- SUB-COMPONENT: Move Member Modal ---
const MoveMemberModal: React.FC<{
  sourceHousehold: any;
  households: any[];
  onClose: () => void;
  onSuccess: () => void;
}> = ({ sourceHousehold, households, onClose, onSuccess }) => {
  const { showToast } = useToast();
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [memberId, setMemberId] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [options, setOptions] = useState<Record<string, boolean>>(
    Object.fromEntries(MOVE_CATEGORIES.map(c => [c.key, true]))
  );
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    if (!sourceHousehold) return;
    let cancelled = false;
    const fetchMembers = async () => {
      try {
        const token = localStorage.getItem('ledger_token');
        const apiUrl = getApiUrl();
        const res = (await fetch(`${apiUrl}/api/admin/households/${sourceHousehold.id}/members`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }) as any);
        const data = (await res.json() as any);
        if (!cancelled && data.success) {
          setMembers(data.data || []);
        }
      } catch (err: any) {
        console.error('Failed to fetch members:', err);
      } finally {
        if (!cancelled) setLoadingMembers(false);
      }
    };
    fetchMembers();
    return () => { cancelled = true; };
  }, [sourceHousehold]);

  const handleConfirm = async () => {
    if (!memberId || !destinationId) return;
    setMoving(true);
    try {
      const token = localStorage.getItem('ledger_token');
      const apiUrl = getApiUrl();
      const res = (await fetch(`${apiUrl}/api/admin/households/${sourceHousehold.id}/move-member`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, destinationHouseholdId: destinationId, options })
      }) as any);
      const data = (await res.json() as any);
      if (data.success) {
        const movedTotal = Object.values(data.moved || {}).reduce((a: number, b: any) => a + Number(b || 0), 0);
        showToast(`Moved ${movedTotal} record(s) to destination household`, 'success');
        onSuccess();
        onClose();
      } else {
        showToast(data.error || 'Move failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Move failed', 'error');
    } finally {
      setMoving(false);
    }
  };

  const selectedMember = members.find(m => m.id === memberId);

  return (
    <Modal
      isOpen={!!sourceHousehold}
      onClose={onClose}
      title="Move Member Data"
      maxWidth="max-w-2xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            className="bg-emerald-500 hover:bg-emerald-600 text-black"
            disabled={!memberId || !destinationId || moving}
            loading={moving}
            onClick={handleConfirm}
          >
            <ArrowRightLeft size={14} />
            Move Data
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="flex items-start gap-3 p-4 bg-orange-500/5 border border-orange-500/10 rounded-2xl">
          <ShieldAlert size={16} className="text-orange-500 mt-0.5 shrink-0" />
          <p className="text-[10px] text-orange-500/80 font-bold tracking-widest leading-relaxed">
            OWNER ONLY: This moves a member and selected data from <strong className="text-orange-400">{sourceHousehold?.name}</strong> to another household. Choose exactly which data should follow them.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] text-slate-600 font-black tracking-widest ml-1">Member</label>
          {loadingMembers ? (
            <div className="p-4 bg-white/5 border border-white/5 rounded-2xl text-xs text-slate-500 font-bold animate-pulse">Loading members...</div>
          ) : (
            <div className="relative">
              <select
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                className="w-full appearance-none bg-white/5 border border-white/10 p-4 pr-12 rounded-2xl text-sm font-bold text-white outline-none focus:border-emerald-500/50 transition-all"
              >
                <option value="">Select member...</option>
                {members.map((m: any) => (
                  <option key={m.userId} value={m.userId} className="bg-[#0d0d0d] text-white">
                    {m.displayName || m.username || m.email} ({m.role})
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-[10px] text-slate-600 font-black tracking-widest ml-1">Destination Household</label>
          <div className="relative">
            <select
              value={destinationId}
              onChange={(e) => setDestinationId(e.target.value)}
              className="w-full appearance-none bg-white/5 border border-white/10 p-4 pr-12 rounded-2xl text-sm font-bold text-white outline-none focus:border-emerald-500/50 transition-all"
            >
              <option value="">Select destination...</option>
              {households
                .filter((h: any) => h.id !== sourceHousehold?.id)
                .map((h: any) => (
                  <option key={h.id} value={h.id} className="bg-[#0d0d0d] text-white">{h.name}</option>
                ))}
            </select>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] text-slate-600 font-black tracking-widest ml-1">Data to Move</label>
            <button
              onClick={() => {
                const allOn = Object.values(options).every(Boolean);
                setOptions(Object.fromEntries(MOVE_CATEGORIES.map(c => [c.key, !allOn])));
              }}
              className="text-[10px] font-black text-emerald-500 tracking-widest hover:text-emerald-400 transition-colors"
            >
              {Object.values(options).every(Boolean) ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
            {MOVE_CATEGORIES.map((cat) => (
              <div
                key={cat.key}
                onClick={() => setOptions(prev => ({ ...prev, [cat.key]: !prev[cat.key] }))}
                className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${options[cat.key] ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/5 border-white/5 opacity-60'}`}
              >
                <Checkbox checked={!!options[cat.key]} onChange={(checked) => setOptions(prev => ({ ...prev, [cat.key]: checked }))} />
                <div>
                  <p className="text-xs font-black text-white tracking-tight">{cat.label}</p>
                  <p className="text-[10px] text-slate-600 font-bold leading-relaxed">{cat.hint}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedMember && destinationId && (
          <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-600 font-black tracking-widest">Moving</p>
              <p className="text-xs font-black text-white">{selectedMember.displayName || selectedMember.username || selectedMember.email}</p>
            </div>
            <ArrowRightLeft size={18} className="text-emerald-500" />
            <div className="text-right">
              <p className="text-[10px] text-slate-600 font-black tracking-widest">To</p>
              <p className="text-xs font-black text-emerald-400">{households.find((h: any) => h.id === destinationId)?.name}</p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};


const AdminHouseholds: React.FC = () => {
  const { showConfirm } = useToast();
  const [households, setHouseholds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [moveHousehold, setMoveHousehold] = useState<any | null>(null);

  const fetchHouseholds = async () => {
    try {
      const token = localStorage.getItem('ledger_token');
      const apiUrl = getApiUrl();
      const res = (await fetch(`${apiUrl}/api/admin/households`, {
              headers: { 'Authorization': `Bearer ${token}` }
            }) as any);
      const data = (await res.json() as any);
      if (data.success) {
        setHouseholds(data.data || []);
      }
    } catch (err: any) {
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
    } catch (err: any) {
      console.error('Rename failed:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const token = localStorage.getItem('ledger_token');
      const apiUrl = getApiUrl();
      await fetch(`${apiUrl}/api/admin/households/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setHouseholds(prev => prev.filter(h => h.id !== id));
      setConfirmDeleteId(null);
    } catch (err: any) {
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
        <div className="text-xs font-black tracking-[0.3em]">Loading household registry...</div>
      </div>
    </AdminPortal>
  );

  return (
    <AdminPortal activePath="#/admin/households">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-12 gap-6">
        <div>
          <h2 className="text-4xl font-black italic tracking-tighter leading-none">
            Household <span className="text-emerald-500">Registry</span>
          </h2>
          <p className="text-sm text-slate-500 mt-2 tracking-widest font-bold">Manage households and memberships</p>
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
            className="bg-white/5 border border-white/10 rounded-[2rem] p-6 hover:border-emerald-500/30 transition-all group flex flex-col justify-between"
          >
            <div>
              {/* Header: Title + Inline Action Controls */}
              <div className="flex items-start justify-between gap-3 mb-6">
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0 shadow-lg">
                    <Shield size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    {editingId === h.id ? (
                      <div className="flex items-center gap-1.5">
                        <input 
                          type="text"
                          value={newName}
                          onChange={e => setNewName(e.target.value)}
                          className="bg-black/80 border border-emerald-500/50 px-2 py-1 rounded-xl text-sm text-white font-black w-full outline-none focus:border-emerald-500"
                          autoFocus
                        />
                        <button onClick={() => handleRename(h.id)} title="Save name" className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500 hover:text-black text-emerald-400 rounded-lg transition-all shrink-0"><Activity size={14} /></button>
                        <button onClick={() => setEditingId(null)} title="Cancel" className="p-1.5 bg-white/5 hover:bg-red-500/20 text-red-400 rounded-lg transition-all shrink-0"><X size={14} /></button>
                      </div>
                    ) : (
                      <h3 className="text-lg font-black tracking-tight text-white group-hover:text-emerald-400 transition-colors truncate" title={h.name}>{h.name}</h3>
                    )}
                    <p className="text-[11px] text-slate-500 font-mono tracking-tight truncate mt-0.5" title={h.id}>{h.id}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 pt-0.5">
                   <button 
                     onClick={() => { setMoveHousehold(h); }}
                     title="Move member data to another household"
                     className="p-2 bg-white/5 hover:bg-emerald-500 hover:text-black rounded-xl transition-all text-slate-400 hover:scale-105"
                   >
                     <ArrowRightLeft size={15} />
                   </button>
                   <button 
                     onClick={() => { setEditingId(h.id); setNewName(h.name); }}
                     title="Edit household name"
                     className="p-2 bg-white/5 hover:bg-emerald-500 hover:text-black rounded-xl transition-all text-slate-400 hover:scale-105"
                   >
                     <Edit3 size={15} />
                   </button>
                   
                   <button 
                     onClick={() => setConfirmDeleteId(h.id)}
                     title="Delete household"
                     className="p-2 bg-white/5 hover:bg-red-500 hover:text-white rounded-xl transition-all text-slate-400 hover:scale-105"
                   >
                     <Trash2 size={15} />
                   </button>
                </div>
              </div>

              {confirmDeleteId === h.id && (
                <div className="mb-4">
                  <InlineToast 
                    message="Delete household?" 
                    type="confirm" 
                    onConfirm={() => handleDelete(h.id)} 
                    onCancel={() => setConfirmDeleteId(null)} 
                  />
                </div>
              )}

              {/* Household Metadata Stats Grid */}
              <div className="grid grid-cols-2 gap-4 pt-5 border-t border-white/5">
                 <div className="bg-white/[0.02] border border-white/5 p-3 rounded-2xl">
                     <div className="text-[10px] text-slate-500 font-black tracking-widest uppercase mb-1">Members</div>
                     <div className="flex items-center gap-2">
                        <Users size={14} className="text-emerald-500 shrink-0" />
                        <span className="text-xs font-bold text-slate-200">{h.memberCount} Member{h.memberCount === 1 ? '' : 's'}</span>
                     </div>
                 </div>
                 <div className="bg-white/[0.02] border border-white/5 p-3 rounded-2xl">
                    <div className="text-[10px] text-slate-500 font-black tracking-widest uppercase mb-1">Currency</div>
                    <div className="flex items-center gap-2">
                       <Globe size={14} className="text-blue-500 shrink-0" />
                       <span className="text-xs font-bold text-slate-200">{h.currency || 'USD'}</span>
                    </div>
                 </div>
              </div>
            </div>

            {/* Bottom Progress Bar */}
            <div className="mt-5 pt-3 border-t border-white/5">
               <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-full rounded-full" style={{ width: '65%' }} />
               </div>
               <div className="flex justify-between items-center mt-2.5">
                  <span className="text-[10px] text-slate-500 font-black tracking-widest uppercase">Resource Usage</span>
                  <span className="text-[10px] text-emerald-400 font-black tracking-widest uppercase">Optimal</span>
               </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {moveHousehold && (
          <MoveMemberModal
            sourceHousehold={moveHousehold}
            households={households}
            onClose={() => setMoveHousehold(null)}
            onSuccess={fetchHouseholds}
          />
        )}
      </AnimatePresence>
    </AdminPortal>
  );
};

export default AdminHouseholds;
