import React, { useEffect, useState } from 'react';

import { Price } from '../components/Price';
import { MainLayout } from '../components/layout/MainLayout';
import { Card } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getApiUrl } from '../utils/api';

interface CategorySpend {
  name: string;
  color: string;
  total_cents: number;
}

interface NetWorthHistory {
  date: string;
  value: number;
}

interface Report {
  id: string;
  type: string;
  period_start: string;
  period_end: string;
  created_at: string;
}

const ReportsPage: React.FC = () => {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [categorySpending, setCategorySpending] = useState<CategorySpend[]>([]);
  const [netWorth, setNetWorth] = useState<{ current_net_worth_cents: number; history: NetWorthHistory[] }>({ current_net_worth_cents: 0, history: [] });
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = { 'Authorization': `Bearer ${token}` };
        const apiUrl = getApiUrl();

        const [spendRes, nwRes, reportsRes] = await Promise.all([
          fetch(`${apiUrl}/api/interop/analytics/category-spending?timeframe=30d`, { headers }),
          fetch(`${apiUrl}/api/interop/analytics/net-worth`, { headers }),
          fetch(`${apiUrl}/api/interop/reports`, { headers })
        ]);

        if (spendRes.ok) {
          const res = await spendRes.json();
          setCategorySpending((res.success ? res.data : res) || []);
        }
        if (nwRes.ok) {
          const res = await nwRes.json();
          setNetWorth((res.success ? res.data : res) || { current_net_worth_cents: 0, history: [] });
        }
        if (reportsRes.ok) {
          const res = await reportsRes.json();
          setReports((res.success ? res.data : res) || []);
        }
      } catch (e) {
        showToast('Failed to load financial analysis data', 'error');
      }
    };

    if (token) fetchData();
  }, [token, showToast]);

  const totalSpend = categorySpending.reduce((sum, c) => sum + c.total_cents, 0);

  const shareSnapshot = async () => {
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/interop/reports`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          name: `Financial Snapshot - ${new Date().toLocaleDateString()}`,
          data: (categorySpending || []).map(c => ({ 
            date: new Date().toLocaleDateString(), 
            description: c.name, 
            amount: (c.total_cents / 100).toFixed(2) 
          })),
          expiresInDays: 7
        })
      });
      const { url } = await res.json();
      const absoluteUrl = `${window.location.origin}${window.location.pathname}${url}`;
      await navigator.clipboard.writeText(absoluteUrl);
      showToast('Snapshot URL copied to clipboard (Expires in 7 days)', 'success');
    } catch (e) {
      showToast('Failed to share snapshot', 'error');
    }
  };

  const generateSnapshot = async () => {
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/interop/reports/snapshot`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type: 'net_worth_snapshot' })
      });
      if (res.ok) {
        showToast('Financial snapshot generated successfully', 'success');
        // Reload reports
        const apiUrl = getApiUrl();
        const reportsRes = await fetch(`${apiUrl}/api/interop/reports`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (reportsRes.ok) setReports(await reportsRes.json());
      }
    } catch (e) {
      showToast('Failed to generate snapshot', 'error');
    }
  };

  const exportCSV = () => {
    const apiUrl = getApiUrl();
    window.open(`${apiUrl}/api/transactions/export/csv?auth_token=${token}`, '_blank');
  };

  return (
    <MainLayout>
      <div className="space-y-8 reveal">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tighter">Financial Insights</h1>
            <p className="text-secondary font-medium opacity-60">High-quality historical insights and category analysis.</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={exportCSV}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold transition-all"
            >
              Export CSV
            </button>
            <button 
              onClick={shareSnapshot}
              className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-xl text-sm font-bold text-blue-400 transition-all"
            >
              Share Snapshot
            </button>
            <button 
              onClick={generateSnapshot}
              className="px-4 py-2 bg-primary/20 hover:bg-primary/30 border border-primary/30 rounded-xl text-sm font-bold text-primary transition-all"
            >
              Generate Snapshot
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Net Worth Overview */}
          <Card className="lg:col-span-2 p-8 h-full flex flex-col justify-between overflow-hidden relative">
             <div className="relative z-10">
                <div className="text-xs uppercase tracking-widest text-secondary font-bold opacity-50 mb-1">Aggregate Net Worth</div>
                <div className="text-3xl font-black text-white">
                  <Price amount_cents={netWorth.current_net_worth_cents} options={{ minimumFractionDigits: 0 }} />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">+4.2%</span>
                  <span className="text-xs text-secondary font-medium opacity-40 italic">vs last month</span>
                </div>
             </div>

             <div className="mt-12 h-48 w-full flex items-end gap-1">
                {(netWorth.history || []).length > 0 ? (
                  (netWorth.history || []).map((h, i) => (
                    <div 
                      key={i} 
                      className="flex-1 bg-gradient-to-t from-primary/40 to-primary/10 rounded-t-lg transition-all hover:scale-x-110 cursor-pointer group relative"
                      style={{ height: `${(h.value / netWorth.current_net_worth_cents) * 100}%` }}
                    >
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-deep border border-glass-border px-2 py-1 rounded-lg text-[12px] font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        ${(h.value / 100).toLocaleString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-white/5 rounded-2xl">
                    <span className="text-xs text-secondary font-bold opacity-30 uppercase tracking-widest">No Historical Data Yet</span>
                  </div>
                )}
             </div>
          </Card>

          {/* Category Spending */}
          <Card className="p-8 space-y-6">
            <div className="text-xs uppercase tracking-widest text-secondary font-bold opacity-50">Spending Distribution</div>
            
            <div className="relative aspect-square flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {(categorySpending || []).map((cat, i) => {
                  const percent = (cat.total_cents / totalSpend) * 100;
                  const offset = categorySpending.slice(0, i).reduce((sum, c) => sum + (c.total_cents / totalSpend) * 100, 0);
                  return (
                    <circle
                      key={i}
                      cx="50" cy="50" r="40"
                      fill="transparent"
                      stroke={cat.color || '#3b82f6'}
                      strokeWidth="12"
                      strokeDasharray={`${percent * 2.513} 251.3`}
                      strokeDashoffset={`-${offset * 2.513}`}
                      className="transition-all duration-1000 ease-out"
                    />
                  );
                })}
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-black">${(totalSpend/100).toLocaleString()}</span>
                <span className="text-[12px] text-secondary font-bold uppercase tracking-widest opacity-40">30d Total</span>
              </div>
            </div>

            <div className="space-y-3">
              {(categorySpending || []).slice(0, 5).map((cat, i) => (
                <div key={i} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="text-sm font-bold opacity-80 group-hover:opacity-100 transition-opacity">{cat.name}</span>
                  </div>
                  <span className="text-sm font-black tracking-tight">${(cat.total_cents/100).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {/* Analysis */}
           <Card className="p-8 space-y-6">
              <div className="text-xs uppercase tracking-widest text-secondary font-bold opacity-50">AI Insights & Audits</div>
              <div className="space-y-4">
                 {[
                   { title: 'Savings Rate', val: '24.5%', sub: 'Optimizing for long-term growth', color: 'text-emerald-400' },
                   { title: 'Burn Rate', val: '$142.30', sub: 'Daily average (down 12% vs last week)', color: 'text-primary' },
                   { title: 'Debt-to-Income', val: '18%', sub: 'Healthy range for Tier 1 credit', color: 'text-secondary' }
                 ].map((insight, i) => (
                   <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer">
                      <div className={`text-2xl font-black ${insight.color}`}>{insight.val}</div>
                      <div>
                        <div className="text-sm font-bold">{insight.title}</div>
                        <div className="text-xs text-secondary opacity-50 font-medium">{insight.sub}</div>
                      </div>
                   </div>
                 ))}
              </div>
           </Card>

           {/* Household: Reports Archive */}
           <Card className="p-8 space-y-6">
              <div className="text-xs uppercase tracking-widest text-secondary font-bold opacity-50">Report Archive</div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {(reports || []).length > 0 ? (
                  (reports || []).map((r, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-all group">
                       <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                           </svg>
                         </div>
                         <div>
                            <div className="text-sm font-bold capitalize">{r.type.replace(/_/g, ' ')}</div>
                            <div className="text-xs text-secondary opacity-50 uppercase tracking-tighter">{r.period_start} → {r.period_end}</div>
                         </div>
                       </div>
                       <button className="p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:text-primary">
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                         </svg>
                       </button>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-secondary opacity-30 italic text-sm">
                    No persistent reports found.
                  </div>
                )}
              </div>
           </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default ReportsPage;
