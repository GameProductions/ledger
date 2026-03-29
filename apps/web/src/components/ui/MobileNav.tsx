import React from 'react';

interface MobileNavProps {
  activeView?: string;
  onViewChange?: (view: string) => void;
}

const MobileNav: React.FC<MobileNavProps> = ({ activeView, onViewChange }) => {
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: '🏠' },
    { id: 'reports', label: 'Reports', icon: '📊' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
    { id: 'help', label: 'Help', icon: '❓' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:hidden">
      <nav className="card flex items-center justify-around py-3 px-6 bg-[#0f172a]/90 backdrop-blur-2xl border border-glass-border rounded-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.4)]">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange?.(item.id)}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeView === item.id 
                ? 'text-primary scale-110' 
                : 'text-secondary opacity-60 hover:opacity-100'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-xs font-bold uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default MobileNav;
