import React from 'react';
import { GlassFooter } from '../ui/GlassFooter';

export const GlobalLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col w-full">
      <div className="flex-1 flex flex-col w-full">
        {children}
      </div>
      <div className="w-full">
        <GlassFooter />
      </div>
    </div>
  );
};
