import React from 'react';
import { GlassFooter } from '../ui/GlassFooter';

export const GlobalLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col w-full">
      <div className="flex-1 flex flex-col w-full">
        {children}
      </div>
      <div className="w-full mt-auto flex justify-center">
        <div className="w-full max-w-7xl">
          <GlassFooter />
        </div>
      </div>
    </div>
  );
};
