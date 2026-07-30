import React, { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getApiUrl } from '../utils/api';
import { 
  GitMerge, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  ArrowRight, 
  Zap,
  Info,
  ShieldCheck,
  Undo2,
  Link2,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { Price } from '../components/Price';
import { Button } from '../components/ui/Button';

const STATUS_TABS = [
  { value: 'pending', label: 'Pending', color: 'text-amber-500' },
  { value: 'approved', label: 'Approved', color: 'text-emerald-500' },
  { value: 'rejected', label: 'Rejected', color: 'text-red-500' },
];

const ReconciliationPage: React.FC = () => {
  const { token, householdId } = useAuth();
  const { showToast } = useToast();
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState('pending');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showManualMatch, setShowManualMatch] = useState(false);
  const [primarySearch, setPrimarySearch] = useState('');
  const [suggestedSearch, setSuggestedSearch] = useState('');
  const [primaryResults, setPrimaryResults] = useState<any[]>([]);
  const [suggestedResults, setSuggestedResults] = useState<any[]>([]);
  const [selectedPrimary, setSelectedPrimary] = useState<any>(null);
  const [selectedSuggested, setSelectedSuggested] = useState<any>(null);
  const [manualMatchReason, setManualMatchReason] = useState('');
  const [searchingPrimary, setSearchingPrimary] = useState(false);
  const [searchingSuggested, setSearchingSuggested] = useState(false);
  const creatingMatch = false;

  const limit = 20;

  const fetchProposals = useCallback(async () => {
    try {
      const res = await fetch(`${getApiUrl()}/api/financials/reconciliation/proposals?status=${statusFilter}&page=${page}&limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-household-id': householdId || ''
        }
      });
      const data: any = await res.json();
      if (data.success) {
        setProposals(data.data || []);
        setTotal(data.total || 0);
      }
    } catch (err: any) {
      console.error('Failed to fetch proposals:', err);
    } finally {
      setLoading(false);
    }
  }, [token, householdId, statusFilter, page]);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    fetchProposals();
  }, [statusFilter]);

  useEffect(() => {
    if (!loading) fetchProposals();
  }, [page]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/financials/reconciliation/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-household-id': householdId || ''
        }
      });
      const data: any = await res.json();
      if (data.success) {
        showToast(`Engine synced. Found ${data.proposalsGenerated} new potential matches.`, 'success');
        fetchProposals();
      }
    } catch (err: any) {
      showToast('Sync failed', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleBulkAction = async (action: 'approve' | 'reject') => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setActionLoading('bulk');
    try {
      const res = await fetch(`${getApiUrl()}/api/financials/reconciliation/proposals/bulk-action`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-household-id': householdId || ''
        },
        body: JSON.stringify({ proposalIds: ids, action })
      });
      if (res.ok) {
        showToast(`${ids.length} proposals ${action === 'approve' ? 'approved' : 'rejected'}`, 'success');
        setSelected(new Set());
        fetchProposals();
      }
    } catch (err: any) {
      showToast('Action failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleIndividualAction = async (id: string, action: 'approve' | 'reject') => {
    setActionLoading(id);
    try {
      const res = await fetch(`${getApiUrl()}/api/financials/reconciliation/proposals/${id}/action`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-household-id': householdId || ''
        },
        body: JSON.stringify({ action })
      });
      const data: any = await res.json();
      if (data.success) {
        showToast(`Proposal ${action === 'approve' ? 'approved' : 'rejected'}`, 'success');
        setSelected(new Set());
        fetchProposals();
      } else {
        showToast(data.error || 'Action failed', 'error');
      }
    } catch (err: any) {
      showToast('Action failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUndo = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`${getApiUrl()}/api/financials/reconciliation/proposals/${id}/undo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-household-id': householdId || ''
        }
      });
      const data: any = await res.json();
      if (data.success) {
        showToast('Approval undone', 'success');
        fetchProposals();
      } else {
        showToast(data.error || 'Undo failed', 'error');
      }
    } catch (err: any) {
      showToast('Undo failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const searchTransactions = async (query: string, type: 'primary' | 'suggested') => {
    if (!query || query.length < 2) return;
    const setter = type === 'primary' ? setPrimaryResults : setSuggestedResults;
    const loadingSetter = type === 'primary' ? setSearchingPrimary : setSearchingSuggested;
    loadingSetter(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/financials/transactions?search=${encodeURIComponent(query)}&limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-household-id': householdId || ''
        }
      });
      const data: any = await res.json();
      if (data.success) setter(data.data || []);
    } catch {
      setter([]);
    } finally {
      loadingSetter(false);
    }
  };

  const handleCreateManualMatch = async () => {
    if (!selectedPrimary || !selectedSuggested) {
      showToast('Select both transactions', 'error');
      return;
    }
    try {
      const res = await fetch(`${getApiUrl()}/api/financials/reconciliation/manual-match`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-household-id': householdId || ''
        },
        body: JSON.stringify({
          primaryTransactionId: selectedPrimary.id,
          suggestedTransactionId: selectedSuggested.id,
          matchReason: manualMatchReason || 'Manual match'
        })
      });
      const data: any = await res.json();
      if (data.success) {
        showToast('Manual match created', 'success');
        setShowManualMatch(false);
        setSelectedPrimary(null);
        setSelectedSuggested(null);
        setManualMatchReason('');
        setPrimarySearch('');
        setSuggestedSearch('');
        setPrimaryResults([]);
        setSuggestedResults([]);
        fetchProposals();
      } else {
        showToast(data.error || 'Failed to create match', 'error');
      }
    } catch {
      showToast('Failed to create match', 'error');
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === proposals.length) setSelected(new Set());
    else setSelected(new Set(proposals.map(p => p.id)));
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <MainLayout title="Smart Reconciliation" subtitle="Engine-powered transaction pairing">
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Stats & Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="p-6 rounded-[2rem] bg-white/[0.03] border border-white/5 flex items-center justify-between group overflow-hidden relative">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all"></div>
            <div>
              <p className="text-[10px] font-black tracking-widest text-white/40 mb-1">Pending</p>
              <h4 className="text-3xl font-black italic">{total}</h4>
            </div>
            <GitMerge className="text-primary/40 group-hover:text-primary transition-colors" size={32} />
          </div>

          <div className="md:col-span-3 flex items-center justify-end gap-4 flex-wrap">
             <Button 
               variant="glass" 
               className="h-14 px-8 rounded-2xl border-white/10 hover:bg-white/5"
               onClick={() => setShowManualMatch(true)}
             >
               <Link2 size={18} className="mr-3" />
               Manual Match
             </Button>

             <Button 
               variant="glass" 
               className="h-14 px-8 rounded-2xl border-white/10 hover:bg-white/5"
               onClick={handleSync}
               disabled={syncing}
             >
               <RefreshCw size={18} className={`mr-3 ${syncing ? 'animate-spin' : ''}`} />
               {syncing ? 'Scanning...' : 'Scan for Matches'}
             </Button>
             
             {selected.size > 0 && statusFilter === 'pending' && (
               <div className="flex gap-2 animate-in slide-in-from-right-4">
                  <Button 
                    variant="danger" 
                    className="h-14 px-8 rounded-2xl text-red-400 hover:bg-red-500/10"
                    onClick={() => handleBulkAction('reject')}
                    disabled={actionLoading === 'bulk'}
                  >
                    {actionLoading === 'bulk' ? <Loader2 size={18} className="mr-3 animate-spin" /> : <XCircle size={18} className="mr-3" />}
                    Reject ({selected.size})
                  </Button>
                  <Button 
                    className="h-14 px-8 rounded-2xl bg-emerald-500 text-black hover:bg-emerald-400"
                    onClick={() => handleBulkAction('approve')}
                    disabled={actionLoading === 'bulk'}
                  >
                    {actionLoading === 'bulk' ? <Loader2 size={18} className="mr-3 animate-spin" /> : <CheckCircle2 size={18} className="mr-3" />}
                    Approve ({selected.size})
                  </Button>
               </div>
             )}
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex gap-2 px-2">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-6 py-3 rounded-2xl text-sm font-bold tracking-widest transition-all ${statusFilter === tab.value ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Manual Match Modal */}
        {showManualMatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowManualMatch(false)}>
            <div className="bg-zinc-900 border border-white/10 p-8 rounded-[2.5rem] max-w-2xl w-full mx-4 space-y-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-black tracking-widest">Manual Match</h3>
              <p className="text-sm text-white/40">Search for two transactions to create a manual pairing proposal.</p>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold tracking-widest text-white/40 block mb-2">Primary Transaction</label>
                  <input
                    type="text"
                    value={primarySearch}
                    onChange={e => { setPrimarySearch(e.target.value); searchTransactions(e.target.value, 'primary'); }}
                    placeholder="Search by description or amount..."
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3 text-sm outline-none focus:border-primary/50 transition-colors"
                  />
                  {searchingPrimary && <div className="mt-2 text-xs text-white/30"><Loader2 size={14} className="inline animate-spin mr-1" />Searching...</div>}
                  {primaryResults.length > 0 && (
                    <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                      {primaryResults.map((t: any) => (
                        <button
                          key={t.id}
                          onClick={() => { setSelectedPrimary(t); setPrimaryResults([]); setPrimarySearch(`${t.description} (${(t.amountCents / 100).toFixed(2)})`); }}
                          className={`w-full text-left p-3 rounded-xl text-xs transition-colors ${selectedPrimary?.id === t.id ? 'bg-primary/20 border border-primary/30' : 'bg-white/5 hover:bg-white/10 border border-transparent'}`}
                        >
                          <span className="font-bold">{t.description}</span>
                          <span className="text-white/40 ml-3">${(t.amountCents / 100).toFixed(2)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-bold tracking-widest text-white/40 block mb-2">Suggested Match</label>
                  <input
                    type="text"
                    value={suggestedSearch}
                    onChange={e => { setSuggestedSearch(e.target.value); searchTransactions(e.target.value, 'suggested'); }}
                    placeholder="Search by description or amount..."
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3 text-sm outline-none focus:border-primary/50 transition-colors"
                  />
                  {searchingSuggested && <div className="mt-2 text-xs text-white/30"><Loader2 size={14} className="inline animate-spin mr-1" />Searching...</div>}
                  {suggestedResults.length > 0 && (
                    <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                      {suggestedResults.map((t: any) => (
                        <button
                          key={t.id}
                          onClick={() => { setSelectedSuggested(t); setSuggestedResults([]); setSuggestedSearch(`${t.description} (${(t.amountCents / 100).toFixed(2)})`); }}
                          className={`w-full text-left p-3 rounded-xl text-xs transition-colors ${selectedSuggested?.id === t.id ? 'bg-primary/20 border border-primary/30' : 'bg-white/5 hover:bg-white/10 border border-transparent'}`}
                        >
                          <span className="font-bold">{t.description}</span>
                          <span className="text-white/40 ml-3">${(t.amountCents / 100).toFixed(2)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-bold tracking-widest text-white/40 block mb-2">Match Reason (optional)</label>
                  <input
                    type="text"
                    value={manualMatchReason}
                    onChange={e => setManualMatchReason(e.target.value)}
                    placeholder="e.g. Manual reconciliation"
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3 text-sm outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <Button variant="glass" className="rounded-2xl" onClick={() => setShowManualMatch(false)}>Cancel</Button>
                <Button className="rounded-2xl bg-primary text-black font-bold" onClick={handleCreateManualMatch} disabled={!selectedPrimary || !selectedSuggested || creatingMatch}>
                  {creatingMatch ? <Loader2 size={16} className="animate-spin mr-2" /> : <Link2 size={16} className="mr-2" />}
                  Create Match
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Proposals List */}
        <div className="space-y-4">
           <div className="flex items-center justify-between px-6 py-2">
              <div className="flex items-center gap-4">
                {statusFilter === 'pending' && (
                  <button onClick={toggleAll} className="w-5 h-5 rounded border border-white/20 flex items-center justify-center transition-colors hover:border-primary">
                     {selected.size === proposals.length && proposals.length > 0 && <div className="w-3 h-3 bg-primary rounded-sm" />}
                  </button>
                )}
                <span className="text-[10px] font-black tracking-widest text-white/30">{statusFilter === 'pending' ? 'Select All' : ''}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black tracking-widest text-white/30">
                <Zap size={12} className="text-amber-500" /> AI Confidence
              </div>
           </div>

           {loading ? (
             <div className="py-32 text-center animate-pulse text-white/20">Scanning Ledger...</div>
           ) : proposals.length === 0 ? (
             <div className="py-40 text-center rounded-[3rem] border border-dashed border-white/5 bg-white/[0.02]">
                <ShieldCheck className="mx-auto text-white/10 mb-6" size={64} />
                <h4 className="text-xl font-black tracking-widest text-white/40">
                  {statusFilter === 'pending' ? 'Ledger Balanced' : statusFilter === 'approved' ? 'No Approved Matches' : 'No Rejected Matches'}
                </h4>
                <p className="text-sm text-white/20 mt-2">
                  {statusFilter === 'pending' ? 'No pending reconciliation proposals found.' : 'No proposals with this status.'}
                </p>
             </div>
           ) : (
             <div className="space-y-3">
                {proposals.map(p => (
                  <div 
                    key={p.id} 
                    className={`group p-1 rounded-[2.5rem] transition-all ${statusFilter === 'pending' ? 'cursor-pointer' : ''} ${selected.has(p.id) && statusFilter === 'pending' ? 'bg-primary/20 ring-1 ring-primary/30' : 'bg-white/[0.03] border border-white/5 hover:border-white/20'}`}
                    onClick={() => statusFilter === 'pending' && toggleSelect(p.id)}
                  >
                    <div className="bg-black/40 rounded-[2.2rem] p-6 flex flex-col md:flex-row items-center gap-8">
                       
                       {/* Transaction 1 */}
                       <div className="flex-1 space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black tracking-widest text-white/20">Primary</span>
                            <span className="text-[10px] font-medium text-white/40">{p.primaryDate}</span>
                          </div>
                          <h5 className="font-bold text-lg leading-tight truncate">{p.primaryDescription}</h5>
                          <Price amountCents={p.primaryAmount} className="text-sm font-black" />
                       </div>

                       {/* Match Icon */}
                       <div className="flex flex-col items-center gap-2 flex-shrink-0">
                          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                             <GitMerge size={20} />
                          </div>
                          <div className="flex flex-col items-center">
                             <div className="text-[10px] font-black text-amber-500 italic">{p.confidenceScore}%</div>
                             <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden mt-1">
                                <div className="h-full bg-amber-500" style={{ width: `${p.confidenceScore}%` }}></div>
                             </div>
                          </div>
                       </div>

                       {/* Transaction 2 */}
                       <div className="flex-1 space-y-1 text-right min-w-0">
                          <div className="flex items-center gap-2 justify-end">
                            <span className="text-[10px] font-medium text-white/40">{p.suggestedDate}</span>
                            <span className="text-[10px] font-black tracking-widest text-white/20">Suggested</span>
                          </div>
                          <h5 className="font-bold text-lg leading-tight truncate">{p.suggestedDescription}</h5>
                          <Price amountCents={p.suggestedAmount} className="text-sm font-black" />
                       </div>

                       {/* Reason & Actions */}
                       <div className="flex flex-col gap-3 items-end flex-shrink-0">
                          <div className="w-48 p-3 rounded-2xl bg-white/5 border border-white/5 text-[10px] font-medium text-white/40 italic">
                             <Info size={12} className="inline mr-1 mb-0.5 text-primary" />
                             {p.matchReason || 'No reason'}
                          </div>

                          <div className="flex gap-2">
                             {statusFilter === 'pending' && (
                               <>
                                 <button
                                   onClick={e => { e.stopPropagation(); handleIndividualAction(p.id, 'reject'); }}
                                   disabled={actionLoading === p.id}
                                   className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center transition-all disabled:opacity-50"
                                   title="Reject"
                                 >
                                   {actionLoading === p.id ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                                 </button>
                                 <button
                                   onClick={e => { e.stopPropagation(); handleIndividualAction(p.id, 'approve'); }}
                                   disabled={actionLoading === p.id}
                                   className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 flex items-center justify-center transition-all disabled:opacity-50"
                                   title="Approve"
                                 >
                                   {actionLoading === p.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                 </button>
                               </>
                             )}
                             {statusFilter === 'approved' && (
                               <button
                                 onClick={() => handleUndo(p.id)}
                                 disabled={actionLoading === p.id}
                                 className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 flex items-center justify-center transition-all disabled:opacity-50"
                                 title="Undo"
                               >
                                 {actionLoading === p.id ? <Loader2 size={16} className="animate-spin" /> : <Undo2 size={16} />}
                               </button>
                             )}
                          </div>
                       </div>
                    </div>
                  </div>
                ))}
             </div>
           )}

           {/* Pagination */}
           {totalPages > 1 && (
             <div className="flex items-center justify-center gap-4 py-6">
               <button
                 onClick={() => setPage(p => Math.max(1, p - 1))}
                 disabled={page === 1}
                 className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
               >
                 <ChevronLeft size={18} />
               </button>
               <div className="flex items-center gap-2">
                 {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                   let pageNum: number;
                   if (totalPages <= 7) {
                     pageNum = i + 1;
                   } else if (page <= 4) {
                     pageNum = i + 1;
                   } else if (page >= totalPages - 3) {
                     pageNum = totalPages - 6 + i;
                   } else {
                     pageNum = page - 3 + i;
                   }
                   return (
                     <button
                       key={pageNum}
                       onClick={() => setPage(pageNum)}
                       className={`w-10 h-10 rounded-xl text-xs font-bold transition-all ${page === pageNum ? 'bg-primary/20 text-primary border border-primary/30' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}
                     >
                       {pageNum}
                     </button>
                   );
                 })}
               </div>
               <button
                 onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                 disabled={page === totalPages}
                 className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
               >
                 <ChevronRight size={18} />
               </button>
             </div>
           )}
        </div>

        {/* Footer Info */}
        <div className="flex items-center gap-6 p-8 rounded-[2.5rem] bg-blue-500/5 border border-blue-500/10">
           <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Zap size={20} />
           </div>
           <div>
              <h5 className="text-sm font-black tracking-widest text-blue-400">Reconciliation Logic</h5>
              <p className="text-xs text-white/40 mt-1 max-w-2xl">
                The smart engine automatically pairs transactions of opposite or matching amounts with similar descriptions or merchants within 7 days. 
                Approved pairings link transactions permanently for accurate balance reporting. Use manual match for custom pairings.
              </p>
           </div>
        </div>

      </div>
    </MainLayout>
  );
};

export default ReconciliationPage;
