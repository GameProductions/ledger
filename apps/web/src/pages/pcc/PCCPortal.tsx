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

  if (!user || user.global_role !== 'super_admin') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white p-6 text-center">
        <div>
          <h1 className="text-4xl font-bold text-red-500 mb-4 tracking-tighter shadow-glow-red">403: ACCESS DENIED</h1>
          <p className="text-slate-400 font-medium">This section is restricted to administrators. Your unauthorized attempt has been logged.</p>
          <a href="#/" className="mt-8 inline-block px-8 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 rounded-full transition-all font-bold">Return to Dashboard</a>
        </div>
      </div>
    );
  }

  const navItems = [
    { name: 'Dashboard', path: '#/admin/dashboard', icon: LayoutDashboard },
    { name: 'Users', path: '#/admin/users', icon: Users },
    { name: 'Providers', path: '#/admin/providers', icon: Globe },
    { name: 'Processors', path: '#/admin/processors', icon: Zap },
    { name: 'Activity History', path: '#/admin/audit', icon: Activity },
    { name: 'Data Management', path: '#/admin/registry', icon: Database },
    { name: 'Global Search', path: '#/admin/search', icon: Search },
    { name: 'System Settings', path: '#/admin/config', icon: Settings },
    { name: 'Help Guide', path: '#/admin/guide', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-[#070707] text-slate-100 font-sans selection:bg-emerald-500/30">
      {/* Universal Command Header */}
      <header className="fixed top-0 left-0 right-0 z-[1000] border-b border-white/5 bg-black/80 backdrop-blur-2xl px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center text-black font-black text-2xl shadow-[0_0_30px_rgba(16,185,129,0.3)] border border-white/10">
               L
             </div>
             <div>
               <div className="flex items-center gap-2">
                 <h1 className="text-xl font-black tracking-tight uppercase italic">LEDGER <span className="text-emerald-500">ADMIN</span></h1>
                 <span className="px-2 py-0.5 rounded text-[8px] bg-emerald-500 text-black font-black tracking-[0.2em] uppercase animate-pulse">Online</span>
               </div>
               <p className="text-[9px] text-slate-500 uppercase tracking-[0.4em] font-black">System Administration</p>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="hidden lg:flex items-center gap-3 px-5 py-2.5 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
            <Shield size={16} className="text-emerald-500" />
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Secure Connection Active</span>
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
                     <span className="text-xs uppercase tracking-widest">{item.name}</span>
                   </a>
                 );
               })}
            </div>
            
            <div className="p-6 border-t border-white/5">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-3">
                   <Lock size={16} className="text-blue-500" />
                   <div className="flex flex-col">
                      <span className="text-[8px] font-black uppercase text-slate-600">Access Mode</span>
                      <span className="text-[10px] font-black text-blue-500 uppercase italic">ADMIN_ACCESS</span>
                   </div>
                 </div>
             </div>
          </div>
       </aside>

       {/* Main Content Area */}
       <main className="pt-32 pb-20 px-8 xl:pl-[320px] xl:pr-12 max-w-[1700px] mx-auto min-h-screen">
         <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
           {children}
         </div>
       </main>

       {/* Status Footer */}
       <footer className="fixed bottom-0 left-0 right-0 py-2 px-12 z-[500] pointer-events-none">
         <div className="flex items-center justify-between opacity-30">
           <div className="text-[8px] text-slate-600 font-mono uppercase tracking-[0.3em]">
             Session ID: {user.id.slice(0, 24)}... | Security Verified
           </div>
           <div className="text-[8px] text-emerald-500 font-mono uppercase tracking-[0.3em]">
             System: {window.location.hostname}
           </div>
         </div>
       </footer>
    </div>
  );
};

export default PCCPortal;
