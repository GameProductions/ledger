import React from 'react';
import { GlassHeader } from '../ui/GlassHeader';
import { GlassFooter } from '../ui/GlassFooter';

interface MainLayoutProps {
  children: React.ReactNode;
  view?: 'list' | 'calendar';
  setView?: (v: 'list' | 'calendar') => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, view, setView }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <GlassHeader view={view} setView={setView} />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 pt-32 pb-16">
        {children}
      </main>
      <div className="max-w-7xl mx-auto w-full px-4">
        <GlassFooter />
      </div>
    </div>
  );
};
