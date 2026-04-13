import React, { useEffect, useState } from 'react';
import AdminPortal from './AdminPortal';
import { Shield, Lock, Activity, Zap, Terminal, Key, Calendar, List, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../../context/AuthContext';

interface Walkthrough {
  id: string;
  version: string;
  title: string;
  contentMd: string;
  created_at: string;
}

const AdminGuide: React.FC = () => {
  const { token, householdId } = useAuth();
  const [walkthroughs, setWalkthroughs] = useState<Walkthrough[]>([]);
  const [selectedWalkthrough, setSelectedWalkthrough] = useState<Walkthrough | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWalkthroughs = async () => {
      try {
        const res = await fetch(`/api/admin/walkthroughs`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'x-household-id': householdId || ''
          }
        });
        if (res.ok) {
          const data = await res.json();
          setWalkthroughs(data);
          if (data.length > 0) setSelectedWalkthrough(data[0]);
        }
      } catch (err) {
        console.error('Failed to fetch walkthroughs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchWalkthroughs();
  }, [token]);

  return (
    <AdminPortal activePath="#/admin/guide">
      <div className="max-w-7xl mx-auto space-y-12 pb-20">
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <h2 className="text-5xl font-black italic tracking-tighter uppercase leading-none">
              Forensic <span className="text-emerald-500">Codex</span>
            </h2>
            <div className="flex items-center gap-3">
              <p className="text-sm text-slate-500 uppercase tracking-[0.3em] font-bold">System Documentation</p>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-mono">v2.5.1_DYNAMIC</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
             <Activity size={20} className="text-emerald-500" />
             <div className="flex flex-col">
                <span className="text-xs font-black uppercase text-slate-500">Documentation Count</span>
                <span className="text-sm font-black text-white">{walkthroughs.length} Guides</span>
             </div>
          </div>
        </div>

        {/* Dynamic Codex Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 min-h-[600px]">
           {/* Sidebar Timeline */}
           <div className="lg:col-span-4 space-y-4">
              <div className="flex items-center gap-2 px-1 mb-6">
                 <List size={16} className="text-slate-500" />
                 <span className="text-xs font-black uppercase tracking-widest text-slate-500">Table of Contents</span>
              </div>
              
              {loading ? (
                Array(4).fill(0).map((_, i) => (
                  <div key={i} className="h-24 rounded-3xl bg-white/5 animate-pulse border border-white/5" />
                ))
              ) : (
                <div className="space-y-3">
                  {walkthroughs.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => setSelectedWalkthrough(w)}
                      className={`w-full text-left p-6 rounded-3xl border transition-all relative overflow-hidden group ${
                        selectedWalkthrough?.id === w.id 
                          ? 'bg-emerald-500/10 border-emerald-500/30' 
                          : 'bg-black/20 border-white/5 hover:border-white/10'
                      }`}
                    >
                      {selectedWalkthrough?.id === w.id && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                      )}
                      
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-emerald-500 tracking-tighter">{w.version}</span>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Calendar size={10} />
                            {new Date(w.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="text-lg font-black text-white uppercase italic group-hover:text-emerald-400 transition-colors">
                          {w.title}
                        </h4>
                      </div>
                    </button>
                  ))}
                </div>
              )}
           </div>

           {/* Main Walkthrough Viewer */}
           <div className="lg:col-span-8">
              {selectedWalkthrough ? (
                <div className="p-10 rounded-[2.5rem] bg-white/5 border border-white/5 relative overflow-hidden h-full">
                   <div className="absolute top-0 right-0 p-8 opacity-5">
                      <Terminal size={120} />
                   </div>
                   
                   <div className="prose prose-invert prose-emerald max-w-none prose-p:text-slate-400 prose-headings:italic prose-headings:uppercase prose-headings:font-black prose-headings:tracking-tighter prose-code:text-emerald-400 prose-code:bg-emerald-500/5 prose-code:px-1 prose-code:rounded">
                      <ReactMarkdown>{selectedWalkthrough.contentMd}</ReactMarkdown>
                   </div>
                </div>
              ) : (
                <div className="h-full rounded-[2.5rem] border border-dashed border-white/10 flex flex-col items-center justify-center p-12 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-slate-600">
                    <FileText size={32} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-white uppercase italic">Awaiting Selection</h3>
                    <p className="text-sm text-slate-500 max-w-xs">Select a historical era from the timeline to view its guide walkthrough.</p>
                  </div>
                </div>
              )}
           </div>
        </div>

        {/* System Protocols Footer Layer */}
        <div className="p-10 rounded-[2.5rem] bg-gradient-to-br from-blue-500/10 via-transparent to-emerald-500/10 border border-white/5 space-y-8 relative overflow-hidden">
            <div className="flex items-center gap-4 text-emerald-500">
               <Zap size={24} className="animate-pulse" />
               <h3 className="text-2xl font-black tracking-tighter uppercase italic">Operational Protocols</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               <div className="p-6 bg-black/40 rounded-2xl border border-white/5 space-y-3">
                  <div className="text-xs font-black text-slate-500 uppercase tracking-widest">Auth_01</div>
                  <h4 className="text-sm font-bold text-white uppercase">Passkey Removal</h4>
                  <p className="text-sm text-slate-500 leading-relaxed">Renaming or deleting passkeys within the Directory is audited and logged.</p>
               </div>
               <div className="p-6 bg-black/40 rounded-2xl border border-white/5 space-y-3">
                  <div className="text-xs font-black text-slate-500 uppercase tracking-widest">Cred_02</div>
                  <h4 className="text-sm font-bold text-white uppercase">Temp Baseline</h4>
                  <p className="text-sm text-slate-500 leading-relaxed">Temporary credentials force a mandatory rotation upon session initialization.</p>
               </div>
               <div className="p-6 bg-black/40 rounded-2xl border border-white/5 space-y-3">
                  <div className="text-xs font-black text-slate-500 uppercase tracking-widest">Asset_03</div>
                  <h4 className="text-sm font-bold text-white uppercase">Asset Persistence</h4>
                  <p className="text-sm text-slate-500 leading-relaxed">Determinest if synced avatars are retained after identity decoupling.</p>
               </div>
               <div className="p-6 bg-black/40 rounded-2xl border border-white/5 space-y-3">
                  <div className="text-xs font-black text-slate-500 uppercase tracking-widest">Audit_04</div>
                  <h4 className="text-sm font-bold text-white uppercase">Audit Trail</h4>
                  <p className="text-sm text-slate-500 leading-relaxed">Every Admin interaction generates a audit entry in the Audit Trail.</p>
               </div>
               <div className="p-6 bg-black/40 rounded-2xl border border-white/5 space-y-3 shadow-xl hover:border-purple-500/30 transition-all group/card">
                  <div className="text-xs font-black text-slate-500 uppercase tracking-widest group-hover/card:text-purple-400">Mirror_05</div>
                  <h4 className="text-sm font-bold text-white uppercase">Forensic Mirroring</h4>
                  <p className="text-sm text-slate-500 leading-relaxed">Identity mirroring is recorded with both administrative actor and target user context for absolute accountability.</p>
               </div>
            </div>
        </div>

        <div className="flex items-center justify-center py-12 gap-8 opacity-20 grayscale">
            <Shield size={48} />
            <Terminal size={48} />
            <Key size={48} />
            <Lock size={48} />
        </div>
      </div>
    </AdminPortal>
  );
};

export default AdminGuide;
