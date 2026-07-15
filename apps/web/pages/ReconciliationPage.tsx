import React, { useState, useEffect } from 'react';
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
  History,
  ShieldCheck
} from 'lucide-react';
import { Price } from '../components/Price';
import { Button } from '../components/ui/Button';

const ReconciliationPage: React.FC = () => {
  const { token, householdId } = useAuth();
  const { showToast } = useToast();
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fetchProposals = async () => {
    try {
      const res = (await fetch(`${getApiUrl()}/api/financials/reconciliation/proposals`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'x-household-id': householdId || ''
              }
            }) as any);
      const data = (await res.json() as any);
      if (data.success) {
        setProposals(data.data || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch proposals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = (await fetch(`${getApiUrl()}/api/financials/reconciliation/sync`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'x-household-id': householdId || ''
              }
            }) as any);
      const data = (await res.json() as any);
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

    try {
      const res = (await fetch(`${getApiUrl()}/api/financials/reconciliation/proposals/bulk-action`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'x-household-id': householdId || ''
              },
              body: JSON.stringify({ proposalIds: ids, action })
            }) as any);
      if (res.ok) {
        showToast(`${ids.length} proposals ${action === 'approve' ? 'approved' : 'rejected'}`, 'success');
        setSelected(new Set());
        fetchProposals();
      }
    } catch (err: any) {
      showToast('Action failed', 'error');
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

  return (
    <MainLayout title="Smart Reconciliation" subtitle="Engine-powered transaction pairing">
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Stats & Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-[2rem] bg-white/[0.03] border border-white/5 flex items-center justify-between group overflow-hidden relative">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all"></div>
            <div>
              <p className="text-[10px] font-black tracking-widest text-white/40 mb-1">Pending Suggestions</p>
              <h4 className="text-3xl font-black italic">{proposals.length}</h4>
            </div>
            <GitMerge className="text-primary/40 group-hover:text-primary transition-colors" size={32} />
          </div>

          <div className="md:col-span-2 flex items-center justify-end gap-4">
             <Button 
               variant="glass" 
               className="h-14 px-8 rounded-2xl border-white/10 hover:bg-white/5"
               onClick={handleSync}
               disabled={syncing}
             >
               <RefreshCw size={18} className={`mr-3 ${syncing ? 'animate-spin' : ''}`} />
               {syncing ? 'Analyzing...' : 'Scan for Matches'}
             </Button>
             
             {selected.size > 0 && (
               <div className="flex gap-2 animate-in slide-in-from-right-4">
                  <Button 
                    variant="danger" 
                    className="h-14 px-8 rounded-2xl text-red-400 hover:bg-red-500/10"
                    onClick={() => handleBulkAction('reject')}
                  >
                    <XCircle size={18} className="mr-3" /> Reject ({selected.size})
                  </Button>
                  <Button 
                    className="h-14 px-8 rounded-2xl bg-emerald-500 text-black hover:bg-emerald-400"
                    onClick={() => handleBulkAction('approve')}
                  >
                    <CheckCircle2 size={18} className="mr-3" /> Approve ({selected.size})
                  </Button>
               </div>
             )}
          </div>
        </div>

        {/* Proposals List */}
        <div className="space-y-4">
           <div className="flex items-center justify-between px-6 py-2">
              <div className="flex items-center gap-4">
                <button onClick={toggleAll} className="w-5 h-5 rounded border border-white/20 flex items-center justify-center transition-colors hover:border-primary">
                   {selected.size === proposals.length && proposals.length > 0 && <div className="w-3 h-3 bg-primary rounded-sm" />}
                </button>
                <span className="text-[10px] font-black tracking-widest text-white/30">Select All</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black tracking-widest text-white/30">
                <Zap size={12} className="text-amber-500" /> AI Confidence Score
              </div>
           </div>

           {loading ? (
             <div className="py-32 text-center animate-pulse text-white/20">Scanning Ledger...</div>
           ) : proposals.length === 0 ? (
             <div className="py-40 text-center rounded-[3rem] border border-dashed border-white/5 bg-white/[0.02]">
                <ShieldCheck className="mx-auto text-white/10 mb-6" size={64} />
                <h4 className="text-xl font-black tracking-widest text-white/40">Ledger Balanced</h4>
                <p className="text-sm text-white/20 mt-2">No pending reconciliation proposals found.</p>
             </div>
           ) : (
             <div className="space-y-3">
                {proposals.map(p => (
                  <div 
                    key={p.id} 
                    onClick={() => toggleSelect(p.id)}
                    className={`group p-1 rounded-[2.5rem] transition-all cursor-pointer ${selected.has(p.id) ? 'bg-primary/20 ring-1 ring-primary/30' : 'bg-white/[0.03] border border-white/5 hover:border-white/20'}`}
                  >
                    <div className="bg-black/40 rounded-[2.2rem] p-6 flex flex-col md:flex-row items-center gap-8">
                       
                       {/* Transaction 1 */}
                       <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black tracking-widest text-white/20">Primary</span>
                            <span className="text-[10px] font-medium text-white/40">{p.primaryDate}</span>
                          </div>
                          <h5 className="font-bold text-lg leading-tight truncate">{p.primaryDescription}</h5>
                          <Price amountCents={p.primaryAmount} className="text-sm font-black" />
                       </div>

                       {/* Match Icon */}
                       <div className="flex flex-col items-center gap-2">
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
                       <div className="flex-1 space-y-1 text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <span className="text-[10px] font-medium text-white/40">{p.suggestedDate}</span>
                            <span className="text-[10px] font-black tracking-widest text-white/20">Suggested Match</span>
                          </div>
                          <h5 className="font-bold text-lg leading-tight truncate">{p.suggestedDescription}</h5>
                          <Price amountCents={p.suggestedAmount} className="text-sm font-black" />
                       </div>

                       {/* Reason Tooltip Style */}
                       <div className="hidden lg:block w-48 p-3 rounded-2xl bg-white/5 border border-white/5 text-[10px] font-medium text-white/40 italic">
                          <Info size={12} className="inline mr-1 mb-0.5 text-primary" />
                          {p.matchReason}
                       </div>
                    </div>
                  </div>
                ))}
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
                The smart engine automatically pairs transactions of opposite amounts occurring within 7 days of each other. 
                Approved pairings will link the transactions permanently for accurate balance reporting and debt tracking.
              </p>
           </div>
        </div>

      </div>
    </MainLayout>
  );
};

export default ReconciliationPage;
