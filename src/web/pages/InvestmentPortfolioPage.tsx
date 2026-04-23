import React, { useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { Briefcase, Plus, Trash2, LineChart, TrendingUp, Landmark, Coins, Diamond } from 'lucide-react';
import { Price } from '../components/Price';

const InvestmentPortfolioPage: React.FC = () => {
  const { token, householdId } = useAuth();
  const { showToast } = useToast();
  const { data: investments = [], mutate } = useApi('/api/financials/investments');
  
  const [isAdding, setIsAdding] = useState(false);
  const [newInv, setNewInv] = useState({
    name: '',
    asset_type: 'Stock',
    quantity: 1,
    cost_basis_cents: 0,
    current_valuation_cents: 0,
    currency: 'USD'
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/financials/investments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-household-id': householdId || ''
        },
        body: JSON.stringify(newInv)
      });
      if (res.ok) {
        showToast('Asset Recorded', 'success');
        setIsAdding(false);
        mutate();
      }
    } catch (err) {
      showToast('Record failed', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this asset from your portfolio?')) return;
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/financials/investments/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-household-id': householdId || ''
        }
      });
      showToast('Asset Removed', 'success');
      mutate();
    } catch (err) {
      showToast('Deletion failed', 'error');
    }
  };

  const totalValue = investments?.reduce((acc: number, curr: any) => acc + curr.current_valuation_cents, 0) || 0;
  const totalCost = investments?.reduce((acc: number, curr: any) => acc + curr.cost_basis_cents, 0) || 0;
  const totalGain = totalValue - totalCost;

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto py-12 px-4 space-y-12 animate-in fade-in duration-1000">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
               <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                  <Briefcase size={20} />
               </div>
               <p className="text-xs font-black uppercase tracking-[0.4em] text-secondary">Asset Registry</p>
            </div>
            <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter text-white uppercase underline decoration-emerald-500/50 underline-offset-8">Investment Portfolio</h1>
            <p className="mt-4 text-slate-400 font-medium max-w-xl">Track your non-liquid holdings, stocks, and crypto assets in one secure vault.</p>
          </div>

          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="px-8 py-4 bg-emerald-500 text-black font-black uppercase text-sm rounded-2xl hover:scale-105 transition-all shadow-xl shadow-emerald-500/20 flex items-center gap-2"
          >
            <Plus size={18} /> {isAdding ? 'Cancel' : 'Register Holding'}
          </button>
        </header>

        {/* Portfolio Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           <div className="card p-8 bg-black/40 border-glass-border">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-secondary mb-2">Net Worth Contribution</p>
              <Price amountCents={totalValue} className="text-4xl font-black italic tracking-tighter" />
           </div>
           <div className="card p-8 bg-black/40 border-glass-border">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-secondary mb-2">Total Unrealized Gain</p>
              <div className="flex items-center gap-3">
                <Price amountCents={totalGain} className={`text-4xl font-black italic tracking-tighter ${totalGain >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
                {totalGain !== 0 && (
                  <div className={`p-1 rounded-full ${totalGain > 0 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                    <TrendingUp size={16} className={totalGain < 0 ? 'rotate-180' : ''} />
                  </div>
                )}
              </div>
           </div>
           <div className="card p-8 bg-black/40 border-glass-border flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-secondary mb-2">Portfolio Allocation</p>
                <p className="text-xl font-bold uppercase tracking-widest">{investments?.length || 0} Assets</p>
              </div>
              <LineChart size={40} className="text-secondary opacity-20" />
           </div>
        </div>

        {isAdding && (
          <form onSubmit={handleCreate} className="card p-8 bg-deep/40 backdrop-blur-3xl border-emerald-500/20 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-4">
             <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-secondary opacity-60 ml-1">Asset Name</label>
              <input 
                required
                value={newInv.name}
                onChange={e => setNewInv({...newInv, name: e.target.value})}
                className="w-full bg-black/40 border border-glass-border rounded-xl p-4 text-sm font-bold focus:border-emerald-500 transition-all shadow-inner"
                placeholder="e.g. Apple Inc, Bitcoin, Gold Bar"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-secondary opacity-60 ml-1">Classification</label>
              <select 
                value={newInv.asset_type}
                onChange={e => setNewInv({...newInv, asset_type: e.target.value})}
                className="w-full bg-black/40 border border-glass-border rounded-xl p-4 text-sm font-bold focus:border-emerald-500 transition-all appearance-none outline-none"
              >
                <option value="Stock">Stock / Equities</option>
                <option value="Crypto">Cryptocurrency</option>
                <option value="Metal">Precious Metals</option>
                <option value="Real Estate">Real Estate</option>
                <option value="Cash">Cash Equivalents</option>
                <option value="Other">Other Private Asset</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-secondary opacity-60 ml-1">Quantity / Units</label>
              <input 
                type="number"
                step="0.0001"
                required
                value={newInv.quantity}
                onChange={e => setNewInv({...newInv, quantity: parseFloat(e.target.value)})}
                className="w-full bg-black/40 border border-glass-border rounded-xl p-4 text-sm font-bold focus:border-emerald-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-secondary opacity-60 ml-1">Total Cost Basis (Cents)</label>
               <input 
                  type="number"
                  required
                  value={newInv.cost_basis_cents}
                  onChange={e => setNewInv({...newInv, cost_basis_cents: parseInt(e.target.value)})}
                  className="w-full bg-black/40 border border-glass-border rounded-xl p-4 text-sm font-bold focus:border-emerald-500 transition-all"
                />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-secondary opacity-60 ml-1">Current Evaluation (Cents)</label>
               <input 
                  type="number"
                  required
                  value={newInv.current_valuation_cents}
                  onChange={e => setNewInv({...newInv, current_valuation_cents: parseInt(e.target.value)})}
                  className="w-full bg-black/40 border border-glass-border rounded-xl p-4 text-sm font-bold focus:border-emerald-500 transition-all"
                />
            </div>
            <div className="flex items-end">
              <button type="submit" className="w-full py-4 bg-white text-black font-black uppercase text-xs rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-xl">Secure Asset</button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           {investments && investments.length > 0 ? investments.map((inv: any) => {
             const gain = inv.current_valuation_cents - inv.cost_basis_cents;
             const gainPct = (gain / inv.cost_basis_cents) * 100;
             
             const getIcon = (type: string) => {
               if (type === 'Stock') return <LineChart size={20} className="text-secondary" />;
               if (type === 'Crypto') return <Coins size={20} className="text-amber-500" />;
               if (type === 'Metal') return <Diamond size={20} className="text-blue-400" />;
               return <Landmark size={20} className="text-secondary" />;
             };

             return (
              <div key={inv.id} className="card p-6 bg-deep/40 border-glass-border hover:border-emerald-500/30 transition-all group overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-5 text-4xl group-hover:scale-110 transition-transform">{getIcon(inv.asset_type)}</div>
                
                <div className="flex justify-between items-start mb-6">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                        {getIcon(inv.asset_type)}
                      </div>
                      <div>
                        <h4 className="font-bold text-white">{inv.name}</h4>
                        <p className="text-[10px] font-black uppercase tracking-widest text-secondary opacity-40">{inv.asset_type}</p>
                      </div>
                   </div>
                   <button onClick={() => handleDelete(inv.id)} className="p-2 text-red-500/20 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                   </button>
                </div>

                <div className="space-y-4">
                   <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-secondary/40">Market Value</span>
                      <Price amountCents={inv.current_valuation_cents} className="text-2xl font-black italic text-white" />
                   </div>
                   
                   <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-3">
                      <div className="flex justify-between text-xs">
                         <span className="text-secondary opacity-60">P/L Performance</span>
                         <span className={`font-black ${gain >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                           {gain >= 0 ? '+' : ''}{gainPct.toFixed(2)}%
                         </span>
                      </div>
                      <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                         <div className={`h-full transition-all duration-1000 ${gain >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: '100%' }} />
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4 pt-2">
                       <div>
                         <p className="text-[8px] font-black uppercase tracking-widest text-secondary opacity-40 mb-1">Quantity</p>
                         <p className="text-sm font-bold">{inv.quantity} Units</p>
                       </div>
                       <div className="text-right">
                         <p className="text-[8px] font-black uppercase tracking-widest text-secondary opacity-40 mb-1">Cost Basis</p>
                         <Price amountCents={inv.cost_basis_cents} className="text-sm font-bold opacity-60" />
                       </div>
                   </div>
                </div>
              </div>
             );
           }) : (
             <div className="col-span-full py-24 text-center card bg-white/5 border-dashed border-white/10">
                <Briefcase size={48} className="mx-auto text-secondary opacity-20 mb-4" />
                <h3 className="text-xl font-black uppercase italic tracking-tighter opacity-40 italic">Asset Registry Empty</h3>
                <p className="text-sm text-secondary font-medium opacity-60">Begin cataloging your physical and digital investments.</p>
             </div>
           )}
        </div>
      </div>
    </MainLayout>
  );
};

export default InvestmentPortfolioPage;
