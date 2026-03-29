import React from 'react';
import { useAuth } from '../../context/AuthContext';
import UserMenu from '../../components/UserMenu';
import { LayoutDashboard, Users, Shield, Settings, Database, Search, FileText, Activity, Lock, Globe, Zap } from 'lucide-react';

interface PCCPortalProps {
  children: React.ReactNode;
  activePath: string;
}

const PCCPortal: React.FC<PCCPortalProps> = ({ children, activePath }) => {
  const { user } = useAuth();

  React.useEffect(() => {
    const originalTitle = document.title;
    document.title = "God Mode | COMMAND CENTER";
    return () => { document.title = originalTitle; };
  }, []);

  if (!user || user.global_role !== 'super_admin') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white p-6 text-center shadow-[inset_0_0_100px_rgba(239,68,68,0.1)]">
        <div className="animate-in zoom-in duration-500">
          <h1 className="text-6xl font-black text-red-500 mb-6 tracking-tighter shadow-glow-red italic">403: ACCESS DENIED</h1>
          <p className="text-slate-400 font-bold max-w-md mx-auto leading-relaxed">This sector of the Ledger Architecture is restricted to God Level administrators. Your unauthorized attempt has been archived for forensic review.</p>
          <a href="#/" className="mt-12 inline-block px-10 py-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-2xl transition-all font-black uppercase tracking-widest text-xs">Return to Surface</a>
        </div>
      </div>
    );
  }

  const navItems = [
    { name: 'God Dashboard', path: '#/system-pcc/dashboard', icon: LayoutDashboard },
    { name: 'User Directory', path: '#/system-pcc/users', icon: Users },
    { name: 'Household Registry', path: '#/system-pcc/households', icon: Shield },
    { name: 'Service Providers', path: '#/system-pcc/providers', icon: Globe },
    { name: 'Payment Networks', path: '#/system-pcc/processors', icon: Zap },
    { name: 'Safety Vault', path: '#/system-pcc/audit', icon: Activity },
    { name: 'Master Records', path: '#/system-pcc/registry', icon: Database },
    { name: 'Global Search', path: '#/system-pcc/search', icon: Search },
    { name: 'Platform Settings', path: '#/system-pcc/config', icon: Settings },
    { name: 'God Guide', path: '#/system-pcc/guide', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-[#070707] text-slate-100 font-sans selection:bg-emerald-500/30">
      {/* Universal Command Header */}
      <header className="fixed top-0 left-0 right-0 z-[1000] border-b border-white/5 bg-black/80 backdrop-blur-2xl px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center text-black font-black text-2xl shadow-[0_0_30px_rgba(16,185,129,0.3)] border border-white/10">
               G
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight uppercase italic">GOD <span className="text-emerald-500">MODE</span></h1>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500 text-black font-black tracking-[0.2em] uppercase animate-pulse">Omnipotent</span>
              </div>
              <p className="text-[10px] text-slate-500 uppercase tracking-[0.4em] font-black">Universal Override</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="hidden lg:flex items-center gap-3 px-5 py-2.5 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
            <Shield size={16} className="text-emerald-500" />
            <span className="text-xs font-black text-emerald-500 uppercase tracking-widest">Secure Connection Active</span>
          </div>
          <UserMenu isPcc={true} />
        </div>
      </header>

      {/* Sidebar Navigation */}
      <aside className="fixed top-[88px] left-8 bottom-8 w-64 bg-black/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-4 hidden xl:block overflow-hidden">
         <div className="flex flex-col h-full">
            <div className="flex-1 space-y-1">
               {navItems.map((item) => {
                 const isActive = activePath === item.path;
                 return (
                   <a 
                    key={item.name}
                    href={item.path}
                    className={`flex items-center gap-4 px-6 py-4 rounded-3xl transition-all group ${
                      isActive 
                        ? 'bg-emerald-500 text-black font-black shadow-[0_0_20px_rgba(16,185,129,0.2)]' 
                        : 'text-slate-500 hover:bg-white/5 hover:text-slate-200'
                    }`}
                   >
                     <item.icon size={18} className={isActive ? 'text-black' : 'group-hover:text-emerald-500 transition-colors'} />
                     <span className="text-sm uppercase tracking-widest">{item.name}</span>
                   </a>
                 );
               })}
            </div>
            
            <div className="p-6 border-t border-white/5">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-3">
                   <Lock size={16} className="text-blue-500" />
                   <div className="flex flex-col">
                      <span className="text-sm font-black uppercase text-slate-600">Level</span>
                      <span className="text-sm font-black text-blue-500 uppercase italic">GOD_LEVEL_OVERRIDE</span>
                   </div>
                 </div>
             </div>
          </div>
       </aside>

       {/* Main Content Area */}
       <main className="pt-32 pb-20 px-8 xl:pl-[320px] xl:pr-12 max-w-[1700px] mx-auto min-h-screen text-[18px]">
         <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
           {children}
         </div>
       </main>

       {/* Status Footer */}
       <footer className="fixed bottom-0 left-0 right-0 py-2 px-12 z-[500] pointer-events-none">
         <div className="flex items-center justify-between opacity-30">
           <div className="text-sm text-slate-600 font-mono uppercase tracking-[0.3em]">
             Session ID: {user.id.slice(0, 24)}... | Security Verified
           </div>
           <div className="text-sm text-emerald-500 font-mono uppercase tracking-[0.3em]">
             System: {window.location.hostname}
           </div>
         </div>
       </footer>
    </div>
  );
};

export default PCCPortal;
