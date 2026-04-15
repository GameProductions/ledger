import React, { useEffect, useState } from 'react';
import { Lock, RefreshCw, ShieldAlert, BarChart3, TrendingUp, DollarSign } from 'lucide-react';

interface MaintenanceViewProps {
  onRestore?: () => void;
}

export const MaintenanceView: React.FC<MaintenanceViewProps> = ({ onRestore }) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    
    // Auto-check for restoration every 30 seconds
    const checkInterval = setInterval(() => {
      fetch('/api/health')
        .then(res => res.json())
        .then(data => {
          if (data.status === 'online' && !data.maintenance) {
            window.location.reload();
          }
        })
        .catch(() => {});
    }, 30000);

    return () => {
      clearInterval(interval);
      clearInterval(checkInterval);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-[#0a0a0c] font-sans text-slate-200">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 h-64 w-64 animate-pulse rounded-full bg-blue-500/20 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 h-64 w-64 animate-pulse rounded-full bg-emerald-500/10 blur-[120px]" />
      </div>

      {/* Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]" 
        style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
      />

      {/* Content Card */}
      <div className="relative z-10 flex w-full max-w-md flex-col items-center px-6 text-center">
        {/* Animated Icon Cluster */}
        <div className="relative mb-8 flex h-24 w-24 items-center justify-center">
            <div className="absolute inset-0 animate-spin-slow rounded-full border-t-2 border-r-2 border-blue-500/40" />
            <div className="absolute inset-2 animate-spin-reverse rounded-full border-b-2 border-l-2 border-emerald-500/30" />
            <ShieldAlert className="h-10 w-10 text-blue-400" />
        </div>

        <h1 className="mb-2 text-3xl font-bold tracking-tight text-white uppercase">
          Forensic Hardening
        </h1>
        <p className="mb-8 text-lg font-medium text-slate-400">
          Standardization in progress{dots}
        </p>

        {/* Status Box */}
        <div className="mb-8 w-full rounded-2xl border border-white/5 bg-white/[0.03] p-6 backdrop-blur-xl">
          <div className="mb-4 flex items-center gap-3">
             <div className="h-2 w-2 animate-pulse rounded-full bg-blue-400" />
             <span className="text-sm font-semibold text-slate-300 uppercase tracking-wider">System Status</span>
          </div>
          <div className="space-y-4">
             <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Infrastructure Layer</span>
                <span className="font-mono text-emerald-400">ENCRYPTED</span>
             </div>
             <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Security Protocols</span>
                <span className="font-mono text-blue-400">RE-INDEXING</span>
             </div>
             <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Access Control</span>
                <span className="font-mono text-amber-400">LOCKED</span>
             </div>
          </div>
        </div>

        <p className="mb-10 text-sm leading-relaxed text-slate-500">
          The Ledger platform is currently undergoing scheduled forensic updates to ensure 
          the integrity of your financial privacy. All data remains secure and encrypted.
        </p>

        <button 
          onClick={() => window.location.reload()}
          className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-3 px-8 text-sm font-medium transition-all hover:bg-white/10 hover:border-white/20 active:scale-95"
        >
          <RefreshCw className="h-4 w-4 transition-transform group-hover:rotate-180" />
          Check Connectivity
        </button>

        <div className="mt-12 flex gap-8 opacity-20">
            <BarChart3 className="h-5 w-5" />
            <TrendingUp className="h-5 w-5" />
            <Lock className="h-5 w-5" />
            <DollarSign className="h-5 w-5" />
        </div>
      </div>

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
        .animate-spin-reverse {
          animation: spin-reverse 6s linear infinite;
        }
      `}</style>
    </div>
  );
};
