import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Cpu, Globe } from 'lucide-react';

export const GlassFooter: React.FC = () => {
  return (
    <motion.footer 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.5 }}
      className="mt-24 pb-12 px-8"
    >
      <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-12"></div>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-12">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-xl border border-orange-500/20">
              <Cpu size={20} className="text-orange-500" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <h4 className="font-black text-white tracking-tighter text-lg leading-tight">LEDGER</h4>
                <div className="w-px h-3 bg-white/10"></div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-secondary">v{import.meta.env.VITE_APP_VERSION || '1.0.0'}</span>
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-500/60">Live Evaluation of Daily /n Gains & Expense Records</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 border border-white/5 rounded-full w-fit">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-500/80">System Operational</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:flex md:items-center gap-x-12 gap-y-6">
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-widest text-white/40">Resources</h5>
            <ul className="space-y-2">
              <li><a href="#/docs" className="text-xs font-bold text-secondary hover:text-orange-500 transition-colors">Documentation</a></li>
              <li><a href="#/updates" className="text-xs font-bold text-secondary hover:text-orange-500 transition-colors">Changelog</a></li>
            </ul>
          </div>
          
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-widest text-white/40">Legal</h5>
            <ul className="space-y-2">
              <li><a href="#/privacy" className="text-xs font-bold text-secondary hover:text-orange-500 transition-colors">Privacy Policy</a></li>
              <li><a href="#/terms" className="text-xs font-bold text-secondary hover:text-orange-500 transition-colors">Terms of Service</a></li>
            </ul>
          </div>

          <div className="flex items-center gap-4 pt-4 md:pt-0 md:border-l md:border-white/5 md:pl-8">
            <a href="https://github.com/GameProductions" target="_blank" rel="noreferrer" className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all hover:-translate-y-1">
              <svg 
                viewBox="0 0 24 24" 
                width="18" 
                height="18" 
                stroke="currentColor" 
                strokeWidth="2" 
                fill="none" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="text-white"
              >
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
              </svg>
            </a>
            <a href="https://gpnet.dev" target="_blank" rel="noreferrer" className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all hover:-translate-y-1">
              <Globe size={18} className="text-white" />
            </a>
          </div>
        </div>
      </div>

      <div className="mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/20">
          © {new Date().getFullYear()} GameProductions™. All protocols active.
        </p>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-lg border border-white/5">
          <ShieldCheck size={12} className="text-orange-500/50" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-white/30">End-to-End Encrypted Ledger</span>
        </div>
      </div>
    </motion.footer>
  );
};
