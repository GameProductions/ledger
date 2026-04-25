import React, { useState } from 'react';
import { 
  ExternalLink,
  ChevronRight,
  Loader2,
  Lock
} from 'lucide-react';

interface CloudHubProps {
  onFileSelect: (fileData: any) => void;
}

const CloudHub: React.FC<CloudHubProps> = ({ onFileSelect }) => {
  const [connecting, setConnecting] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<string | null>(null);

  const providers = [
    { 
      id: 'google', 
      name: 'Google Drive', 
      desc: 'Access your spreadsheets and statements', 
      icon: '📂', 
      color: 'bg-blue-500',
      textColor: 'text-blue-400'
    },
    { 
      id: 'dropbox', 
      name: 'Dropbox', 
      desc: 'Import from your shared folders', 
      icon: '📦', 
      color: 'bg-indigo-500',
      textColor: 'text-indigo-400'
    },
    { 
      id: 'onedrive', 
      name: 'OneDrive', 
      desc: 'Sync with Microsoft business accounts', 
      icon: '☁️', 
      color: 'bg-sky-500',
      textColor: 'text-sky-400'
    }
  ];

  const handleConnect = (id: string) => {
    setConnecting(id);
    // Simulate OAuth / Picker setup
    setTimeout(() => {
      setConnecting(null);
      setActiveProvider(id);
      // In a real implementation, this would trigger the respective picker SDK
    }, 1500);
  };

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-700">
      {!activeProvider ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {providers.map((p) => (
            <button 
              key={p.id}
              onClick={() => handleConnect(p.id)}
              disabled={!!connecting}
              className="flex flex-col items-center justify-center p-8 rounded-[2.5rem] bg-white/5 border border-white/5 hover:border-white/20 transition-all group relative overflow-hidden"
            >
              <div className={`absolute inset-0 bg-gradient-to-b from-transparent to-black/40 opacity-0 group-hover:opacity-100 transition-opacity`} />
              
              <div className={`w-16 h-16 rounded-2xl ${p.color}/20 flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform`}>
                {connecting === p.id ? <Loader2 size={32} className="animate-spin text-white" /> : p.icon}
              </div>
              
              <h4 className="font-black italic uppercase tracking-tighter text-white mb-2">{p.name}</h4>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{p.desc}</p>
              
              <div className="mt-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity">
                 Connect <ChevronRight size={12} />
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="p-12 rounded-[3rem] bg-emerald-500/5 border border-emerald-500/10 text-center animate-in zoom-in-95 duration-500">
           <div className="w-20 h-20 rounded-3xl bg-black/40 border border-emerald-500/20 flex items-center justify-center text-3xl mx-auto mb-8 shadow-2xl">
              {providers.find(p => p.id === activeProvider)?.icon}
           </div>
           
           <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-4">
             Connected to {providers.find(p => p.id === activeProvider)?.name}
           </h3>
           <p className="text-slate-500 max-w-sm mx-auto mb-10 font-medium">Your cloud storage is now updated and ready. Select a file to move into the Review Area.</p>
           
           <div className="flex flex-wrap justify-center gap-4">
              <button 
                className="px-8 py-4 bg-emerald-500 text-black font-black uppercase text-xs rounded-2xl hover:scale-105 transition-all shadow-xl shadow-emerald-500/20"
                onClick={() => {
                   // Simulate file selection
                   onFileSelect({ name: 'ledger_backup.csv', size: '25KB', type: 'text/csv' });
                }}
              >
                Pick File from {activeProvider.toUpperCase()}
              </button>
              <button 
                onClick={() => setActiveProvider(null)}
                className="px-8 py-4 bg-white/5 text-slate-400 font-black uppercase text-xs rounded-2xl hover:bg-white/10 transition-all border border-white/5"
              >
                Disconnect
              </button>
           </div>

           <div className="mt-12 pt-8 border-t border-white/5 flex items-center justify-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                 <Lock size={12} className="text-emerald-500" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">OAuth 2.0 Secure Connection</span>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">No tokens stored on-device</p>
           </div>
        </div>
      )}

      {/* Security Context */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
         <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/5">
            <h5 className="font-black italic uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
               <ShieldCheck className="text-blue-400" size={16} /> Privacy Policy
            </h5>
            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">We only request read-only access to specific files you select. Your account credentials never touch our servers.</p>
         </div>
         <div className="p-8 rounded-[2.5rem] bg-indigo-500/5 border border-indigo-500/10">
            <h5 className="font-black italic uppercase tracking-widest text-xs mb-4 flex items-center gap-2 text-indigo-400">
               <ExternalLink size={16} /> Multi-Cloud Hub
            </h5>
            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Switch between providers at any time. Your import history tracks the source of every record for future audit clarity.</p>
         </div>
      </div>
    </div>
  );
};

const ShieldCheck = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export default CloudHub;
