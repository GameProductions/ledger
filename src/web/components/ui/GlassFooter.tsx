import React from 'react';

export const GlassFooter: React.FC = () => {
  return (
    <footer className="mt-16 p-8 border-t border-glass-border opacity-60 text-sm reveal">
      <div className="flex justify-between items-center gap-4 mb-4">
        <div className="flex gap-4 items-center">
          <span className="font-black text-primary tracking-tighter">LEDGER</span>
          <span className="text-xs font-black tracking-widest text-slate-500 uppercase">
            v{import.meta.env.VITE_APP_VERSION}
          </span>
        </div>
        <div className="flex gap-8 font-bold tracking-widest text-xs">
          <a href="#/privacy" className="text-white no-underline hover:text-primary transition-colors">Privacy Policy</a>
           | 
          <a href="#/terms" className="text-white no-underline hover:text-primary transition-colors">Terms of Service</a>
        </div>
      </div>
      <div className="text-center opacity-40 border-t border-white/5 pt-4 font-bold uppercase tracking-[0.2em] text-[12px]">
        © {new Date().getFullYear()} GameProductions
      </div>
    </footer>
  );
};
