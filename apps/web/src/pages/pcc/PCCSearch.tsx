import React, { useState } from 'react';
import PCCPortal from './PCCPortal';

const PCCSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (query.length < 2) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('ledger_token');
      const apiUrl = import.meta.env.VITE_API_URL;
      const res = await fetch(`${apiUrl}/api/pcc/search/global?q=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error('PCC Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PCCPortal activePath="#/system-pcc/search">
      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSearch} className="relative mb-12">
          <input 
            type="text" 
            value={query} 
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search transactions across ALL households..."
            className="w-full bg-white/5 border border-white/10 rounded-3xl px-16 py-6 text-xl focus:outline-none focus:border-emerald-500/50 shadow-2xl transition-all"
            autoFocus
          />
          <span className="absolute left-6 top-6 text-2xl opacity-40">🔍</span>
          {loading && <div className="absolute right-6 top-7 animate-spin">🌀</div>}
        </form>

        {results && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Transaction Results - NEW */}
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 mb-6 flex items-center gap-4">
                Global Transaction Ledger <div className="h-[1px] flex-1 bg-blue-500/20" />
              </h3>
              <div className="space-y-2">
                {results.transactions?.map((tx: any) => (
                  <div key={tx.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-blue-500/30 transition-all flex justify-between items-center group">
                    <div>
                       <div className="flex items-center gap-2">
                         <p className="font-bold">{tx.description}</p>
                         <span className="text-[8px] bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full uppercase font-black">{tx.household_name}</span>
                       </div>
                       <p className="text-[10px] text-gray-500 font-medium uppercase tracking-tighter">{tx.id} • {tx.transaction_date}</p>
                    </div>
                    <div className="text-right">
                       <p className="font-black text-lg">${(tx.amount_cents / 100).toFixed(2)}</p>
                       <p className="text-[8px] text-gray-600 uppercase font-black">{tx.reconciliation_status}</p>
                    </div>
                  </div>
                ))}
                {results.transactions?.length === 0 && <p className="text-gray-600 italic text-sm">No transactions found across system.</p>}
              </div>
            </section>

            {/* User Results */}
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 mb-6 flex items-center gap-4">
                System Identities <div className="h-[1px] flex-1 bg-emerald-500/20" />
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.users?.map((u: any) => (
                  <div key={u.id} className="p-6 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/[0.08] transition-all group">
                    <p className="font-bold text-lg mb-1 group-hover:text-emerald-400 transition-colors">{u.display_name || 'Anonymous'}</p>
                    <p className="text-sm text-gray-500 font-mono mb-4">{u.email}</p>
                    <div className="flex gap-2">
                       <a href={`#/system-pcc/users?id=${u.id}`} className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-bold uppercase hover:bg-emerald-500 hover:text-black transition-all">Inspect Identity</a>
                    </div>
                  </div>
                ))}
                {results.users.length === 0 && <p className="text-gray-600 italic text-sm">No user identity found matching query.</p>}
              </div>
            </section>

            {/* Registry Results */}
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 mb-6 flex items-center gap-4">
                Registry Entities <div className="h-[1px] flex-1 bg-blue-500/20" />
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.registry.map((r: any) => (
                  <div key={r.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-black/40 flex items-center justify-center">📦</div>
                    <div>
                      <p className="font-bold text-sm">{r.name}</p>
                      <p className="text-[10px] font-black uppercase text-blue-500 tracking-widest">{r.item_type}</p>
                    </div>
                  </div>
                ))}
                {results.registry.length === 0 && <p className="text-gray-600 italic text-sm">No registry items found matching query.</p>}
              </div>
            </section>
          </div>
        )}
      </div>
    </PCCPortal>
  );
};

export default PCCSearch;
