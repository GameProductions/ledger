import React from 'react';
import { GlassFooter } from '../ui/GlassFooter';

export const GlobalLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col w-full">
      <main className="flex-grow flex flex-col w-full">
        {children}
      </main>
      <div className="w-full flex justify-center">
        <div className="w-full max-w-7xl">
          <GlassFooter />
        </div>
      </div>
    </div>
  );
};
