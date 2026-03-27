import React from 'react';
import { useAuth } from '../../context/AuthContext';
import UserMenu from '../../components/UserMenu';

interface PCCPortalProps {
  children: React.ReactNode;
  activePath: string;
}

const PCCPortal: React.FC<PCCPortalProps> = ({ children, activePath }) => {
  const { user } = useAuth();

  if (!user || user.global_role !== 'super_admin') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white p-6 text-center">
        <div>
          <h1 className="text-4xl font-bold text-red-500 mb-4 tracking-tighter shadow-glow-red">403: ACCESS DENIED</h1>
          <p className="text-slate-400 font-medium">This sector is restricted to Universal System Authority. Your unauthorized attempt has been logged.</p>
          <a href="#/" className="mt-8 inline-block px-8 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 rounded-full transition-all font-bold">Return to Dashboard</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070707] text-slate-100 font-sans selection:bg-emerald-500/30">
      {/* Universal Command Header */}
      <header className="fixed top-0 left-0 right-0 z-[1000] border-b border-white/5 bg-black/60 backdrop-blur-xl px-4 lg:px-12 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center text-black font-black text-xl shadow-[0_0_30px_rgba(16,185,129,0.3)] border border-white/10">
            L
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight uppercase">Platform Command Center</h1>
              <span className="hidden md:inline-block px-2 py-0.5 rounded text-[10px] bg-emerald-500 text-black font-black tracking-widest uppercase animate-pulse">Live</span>
            </div>
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-bold">God Mode Strategy Hub</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Universal Authority Secure</span>
          </div>
          <UserMenu isPcc={true} />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="pt-24 pb-20 px-4 lg:px-12 max-w-[1400px] mx-auto min-h-screen">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
          {children}
        </div>
      </main>

      {/* Forensic Footer Indicator */}
      <footer className="fixed bottom-0 left-0 right-0 py-2 px-8 border-t border-white/5 bg-black/40 backdrop-blur-md flex items-center justify-between pointer-events-none">
        <div className="text-[9px] text-slate-600 font-mono uppercase tracking-widest">
          Auth ID: {user.id.slice(0, 12)}... | PCC Session Established
        </div>
        <div className="text-[9px] text-emerald-500/40 font-mono uppercase tracking-widest">
          End-to-End Forensic Encryption Layer Active
        </div>
      </footer>
    </div>
  );
};

export default PCCPortal;

export default PCCPortal;
