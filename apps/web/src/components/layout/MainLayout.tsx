import React from 'react';
import { GlassHeader } from '../ui/GlassHeader';
import MobileNav from '../ui/MobileNav';
import { useTheme } from '../../context/ThemeContext';

interface MainLayoutProps {
  children: React.ReactNode;
  view?: 'list' | 'calendar';
  setView?: (v: 'list' | 'calendar') => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, view, setView }) => {
  const { theme } = useTheme();
  const isLuxury = theme.layoutVariant === 'luxury';
  const isBusiness = theme.layoutVariant === 'business';

  return (
    <div className={`min-h-screen flex flex-col transition-all duration-700 ${isLuxury ? 'bg-luxury-grid' : ''}`}>
      <GlassHeader view={view} setView={setView} />
      
      <main className={`flex-1 w-full transition-all duration-700 ${
        isLuxury ? 'max-w-5xl mx-auto px-4 sm:px-8 pt-28 sm:pt-40 pb-24' : 
        isBusiness ? 'max-w-[100vw] px-3 sm:px-6 pt-24 sm:pt-28 pb-12 flex flex-col sm:flex-row sm:space-x-8' : 
        'max-w-7xl mx-auto px-3 sm:px-4 pt-24 sm:pt-32 pb-16'
      }`}>
        {isBusiness && (
          <aside className="hidden lg:block w-64 flex-shrink-0 card p-4 h-[calc(100vh-8rem)] sticky top-28 bg-deep/40 backdrop-blur-xl border-glass-border">
            <nav className="space-y-2">
              <div className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-4 opacity-50 px-2">Focus Navigation</div>
              <div className="p-3 bg-primary/10 rounded-xl text-primary font-bold text-sm border border-primary/20">Executive Overview</div>
              <div className="p-3 hover:bg-white/5 rounded-xl text-sm transition-colors cursor-pointer">Cash Flow Analysis</div>
              <div className="p-3 hover:bg-white/5 rounded-xl text-sm transition-colors cursor-pointer">Asset Ledger</div>
              <div className="p-3 hover:bg-white/5 rounded-xl text-sm transition-colors cursor-pointer">Security Audit</div>
            </nav>
          </aside>
        )}
        
        <div className="flex-1">
          {children}
        </div>
      </main>

      <MobileNav activeView={view} onViewChange={setView} />
    </div>
  );
};
