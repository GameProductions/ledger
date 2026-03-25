import React from 'react';

export const GlassFooter: React.FC = () => {
  return (
    <footer className="mt-16 p-8 border-t border-glass-border opacity-60 text-xs reveal">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
        <div className="flex gap-6 items-center">
          <span className="font-black text-primary tracking-tighter">LEDGER</span>
          <span className="opacity-70 font-bold">V{import.meta.env.VITE_APP_VERSION}</span>
        </div>
        <div className="flex gap-8 font-bold uppercase tracking-widest text-[10px]">
          <a href="#/privacy" className="text-white no-underline hover:text-primary transition-colors">Privacy Policy</a>
          <a href="#/terms" className="text-white no-underline hover:text-primary transition-colors">Terms of Service</a>
        </div>
      </div>
      <div className="text-center opacity-40 border-t border-white/5 pt-4 font-bold uppercase tracking-[0.2em] text-[9px]">
        © {new Date().getFullYear()} GameProductions — Unified Financial Command
      </div>
    </footer>
  );
};
