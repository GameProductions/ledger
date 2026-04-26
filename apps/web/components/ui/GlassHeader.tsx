import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import HouseholdSwitcher from '../HouseholdSwitcher';
import UserMenu from '../UserMenu';
import SeasonalAssets from '../SeasonalAssets';

interface GlassHeaderProps {
  view?: 'list' | 'calendar';
  setView?: (v: 'list' | 'calendar') => void;
}

export const GlassHeader: React.FC<GlassHeaderProps> = ({ view, setView }) => {
  const { theme } = useTheme();

  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-2 sm:p-4">
      <div className="max-w-7xl mx-auto">
        <header className="card flex justify-between items-center h-14 sm:h-20 px-4 sm:px-6 bg-[#0f172a]/80 backdrop-blur-2xl border border-glass-border rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] reveal overflow-visible">
          <SeasonalAssets />
          <div className="flex items-center gap-3 sm:gap-6">
            <a href="#/" className="flex items-center gap-2 sm:gap-3 no-underline group">
              <img src={theme.logoUrl} alt="Logo" className="h-6 sm:h-8 group-hover:scale-110 transition-transform" />
              <h1 className="text-lg sm:text-xl font-black tracking-tighter bg-gradient-to-br from-primary to-secondary bg-clip-text text-transparent m-0 hidden md:block">
                LEDGER
              </h1>
            </a>
            <div className="h-6 w-px bg-glass-border hidden sm:block" />
            <div className="hidden sm:block">
              <HouseholdSwitcher />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
             <button className="p-2 hover:bg-white/5 rounded-xl text-secondary hover:text-white transition-all text-lg border border-transparent hover:border-glass-border hidden xs:block">
               🔍
             </button>
             <UserMenu view={view} setView={setView} />
          </div>
        </header>
        {/* Mobile Household Switcher (visible only on small screens) */}
        <div className="mt-2 sm:hidden flex justify-center">
          <div className="bg-[#0f172a]/80 backdrop-blur-2xl border border-glass-border rounded-xl px-4 py-1 shadow-lg reveal">
            <HouseholdSwitcher />
          </div>
        </div>
      </div>
    </div>
  );
};
