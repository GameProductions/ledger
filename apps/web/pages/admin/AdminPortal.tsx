import React from 'react';
import { useAuth } from '../../context/AuthContext';
import UserMenu from '../../components/UserMenu';
import { LayoutDashboard, Users, Shield, Settings, Database, Search, FileText, Activity, Lock, Globe, Zap, Menu, X } from 'lucide-react';

interface AdminPortalProps {
  children: React.ReactNode;
  activePath: string;
}

const AdminPortal: React.FC<AdminPortalProps> = ({ children, activePath }) => {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    const originalTitle = document.title;
    document.title = "Owner | COMMAND CENTER";
    return () => { document.title = originalTitle; };
  }, []);

  if (!user || user.globalRole !== 'owner') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white p-6 text-center shadow-[inset_0_0_100px_rgba(239,68,68,0.1)]">
        <div className="animate-in zoom-in duration-500">
          <h1 className="text-6xl font-black text-red-500 mb-6 tracking-tighter shadow-glow-red italic">403: ACCESS DENIED</h1>
          <p className="text-slate-400 font-bold max-w-md mx-auto leading-relaxed">This sector of the Ledger Architecture is restricted to Owner authorized personnel. Your unauthorized attempt has been recorded for security review.</p>
          <a href="#/" className="mt-12 inline-block px-10 py-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-2xl transition-all font-black uppercase tracking-widest text-xs">Return to Home</a>
        </div>
      </div>
    );
  }

  const navItems = [
    { name: 'Owner Dashboard', path: '#/admin/dashboard', icon: LayoutDashboard },
    { name: 'User Directory', path: '#/admin/users', icon: Users },
    { name: 'Household Registry', path: '#/admin/households', icon: Shield },
    { name: 'Entity Manager', path: '#/admin/entity-manager', icon: Database },
    { name: 'Service Providers', path: '#/admin/providers', icon: Globe },
    { name: 'Payment Networks', path: '#/admin/processors', icon: Zap },
    { name: 'Master Records', path: '#/admin/registry', icon: FileText },
    { name: 'Global Search', path: '#/admin/search', icon: Search },
    { name: 'Platform Settings', path: '#/admin/config', icon: Settings },
    { name: 'Owner Guide', path: '#/admin/guide', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-[#070707] text-slate-100 font-sans selection:bg-emerald-500/30 text-sm">
      {/* Universal Command Header */}
      <header className="fixed top-0 left-0 right-0 z-[9999] border-b border-white/10 bg-zinc-950/95 shadow-[0_4px_30px_rgba(0,0,0,0.8)] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Mobile menu toggle */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center text-black font-black text-xl shadow-[0_0_20px_rgba(16,185,129,0.2)] border border-white/10">
               S
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-black tracking-tight uppercase italic">SUPER <span className="text-emerald-500">ADMIN</span></h1>
                <span className="px-1.5 py-0.5 rounded text-[8px] bg-emerald-500 text-black font-black tracking-widest uppercase animate-pulse">Auth</span>
              </div>
              <p className="text-[8px] text-slate-500 uppercase tracking-widest font-black">Admin Access</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
            <Shield size={14} className="text-emerald-500" />
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-wider">Secure Connection</span>
          </div>
          <UserMenu isAdminPortal={true} />
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-[999] xl:hidden bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setMobileMenuOpen(false)}
        >
          <aside 
            className="absolute top-[64px] left-4 right-4 bg-black/90 backdrop-blur-3xl border border-white/10 rounded-2xl p-3 space-y-1 max-h-[calc(100vh-100px)] overflow-y-auto animate-in slide-in-from-top-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
             {navItems.map((item) => {
               const isActive = activePath === item.path;
               return (
                 <a 
                  key={item.name}
                  href={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all group ${
                    isActive 
                      ? 'bg-emerald-500 text-black font-black' 
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
                 >
                   <item.icon size={16} className={isActive ? 'text-black' : 'group-hover:text-emerald-500 transition-colors'} />
                   <span className="text-xs uppercase tracking-wider">{item.name}</span>
                 </a>
               );
             })}
          </aside>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="fixed top-[72px] left-6 bottom-6 w-56 bg-black/40 backdrop-blur-3xl border border-white/5 rounded-3xl p-3 hidden xl:block overflow-y-auto custom-scrollbar">
         <div className="flex flex-col h-full">
            <div className="flex-1 space-y-1">
               {navItems.map((item) => {
                 const isActive = activePath === item.path;
                 return (
                   <a 
                    key={item.name}
                    href={item.path}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all group ${
                      isActive 
                        ? 'bg-emerald-500 text-black font-black shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                        : 'text-slate-500 hover:bg-white/5 hover:text-slate-200'
                    }`}
                   >
                     <item.icon size={16} className={isActive ? 'text-black' : 'group-hover:text-emerald-500 transition-colors'} />
                     <span className="text-xs uppercase tracking-wider">{item.name}</span>
                   </a>
                 );
               })}
            </div>
            
            <div className="p-3 border-t border-white/5">
                <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center gap-2">
                   <Lock size={14} className="text-blue-500" />
                   <div className="flex flex-col">
                       <span className="text-[10px] font-black uppercase text-slate-600">Level</span>
                       <span className="text-[10px] font-black text-blue-500 uppercase italic">OWNER_ACCESS</span>
                   </div>
                 </div>
              </div>
          </div>
       </aside>

        {/* Main Content Area */}
        <main className="pt-24 pb-12 px-4 sm:px-6 xl:pl-[270px] xl:pr-8 max-w-[1500px] mx-auto h-[calc(100vh-72px)] overflow-y-auto custom-scrollbar">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
            {children}
          </div>
        </main>

        {/* Status Footer */}
        <footer className="fixed bottom-0 left-0 right-0 py-1.5 px-8 z-[500] pointer-events-none">
          <div className="flex items-center justify-between opacity-25">
            <div className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">
              Session: {user.id.slice(0, 16)}... | Secure
            </div>
            <div className="text-[10px] text-emerald-500 font-mono uppercase tracking-widest">
              Host: {window.location.hostname}
            </div>
          </div>
        </footer>
    </div>
  );
};

export default AdminPortal;
