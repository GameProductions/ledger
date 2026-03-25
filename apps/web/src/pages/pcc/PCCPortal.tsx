import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

// Mock/Simple Icon Components (Substitute with Lucide-React if available)
const IconDashboard = () => <span className="mr-2">📊</span>;
const IconConfig = () => <span className="mr-2">⚙️</span>;
const IconRegistry = () => <span className="mr-2">📋</span>;
const IconUsers = () => <span className="mr-2">👥</span>;
const IconAudit = () => <span className="mr-2">🔍</span>;
const IconArrow = () => <span className="ml-auto opacity-50">→</span>;

interface PCCPortalProps {
  children: React.ReactNode;
  activePath: string;
}

const PCCPortal: React.FC<PCCPortalProps> = ({ children, activePath }) => {
  const { user } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  if (!user || user.global_role !== 'super_admin') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white p-6 text-center">
        <div>
          <h1 className="text-4xl font-bold text-red-500 mb-4">403: ACCESS DENIED</h1>
          <p className="text-gray-400">This sector is restricted to Platinum Command. Your attempt has been logged.</p>
          <a href="#/" className="mt-8 inline-block px-6 py-3 bg-white/10 hover:bg-white/20 rounded-full transition-all">Return to Dashboard</a>
        </div>
      </div>
    );
  }

  const navItems = [
    { name: 'Command Hub', path: '#/system-pcc/dashboard', icon: <IconDashboard /> },
    { name: 'System Switchboard', path: '#/system-pcc/config', icon: <IconConfig /> },
    { name: 'Universal Registry', path: '#/system-pcc/registry', icon: <IconRegistry /> },
    { name: 'User Management', path: '#/system-pcc/users', icon: <IconUsers /> },
    { name: 'Global Search', path: '#/system-pcc/search', icon: <IconAudit /> },
    { name: 'Audit Vault', path: '#/system-pcc/audit', icon: <IconAudit /> },
  ];

  return (
    <div className="flex min-h-screen bg-[#0a0a0a] text-gray-100 font-sans selection:bg-emerald-500/30">
      {/* PCC Sidebar */}
      <aside className={`fixed lg:relative z-40 h-screen transition-all duration-300 border-r border-white/5 bg-black/40 backdrop-blur-xl ${isSidebarOpen ? 'w-72' : 'w-20'}`}>
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-black font-bold text-xl shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              L
            </div>
            {isSidebarOpen && (
              <div>
                <h2 className="font-bold tracking-tight text-lg">PCC</h2>
                <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-500 font-black">God Mode Active</p>
              </div>
            )}
          </div>

          <nav className="flex-1 space-y-2">
            {navItems.map((item) => (
              <a
                key={item.path}
                href={item.path}
                className={`flex items-center p-3 rounded-xl transition-all group ${
                  activePath === item.path 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
                }`}
              >
                {item.icon}
                {isSidebarOpen && <span className="font-medium">{item.name}</span>}
                {isSidebarOpen && <IconArrow />}
              </a>
            ))}
          </nav>

          <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="mt-auto p-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all flex items-center justify-center"
          >
            {isSidebarOpen ? 'Collapse Menu' : '»'}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-y-auto">
        <header className="sticky top-0 z-30 w-full border-b border-white/5 bg-black/60 backdrop-blur-md px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Platform Command Center</h1>
            <p className="text-xs text-gray-500 italic">Universal System Authority</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Elevated Pulse</span>
            </div>
            <a href="#/" className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-all">Exit Portal</a>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default PCCPortal;
