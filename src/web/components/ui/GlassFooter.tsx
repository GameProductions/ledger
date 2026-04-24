import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Code, Cpu, Globe } from 'lucide-react';

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
            <div>
              <h4 className="font-black text-white tracking-tighter text-lg leading-tight">LEDGER</h4>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500/60">GameProductions Platform</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 border border-white/5 rounded-full w-fit">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500/80">System Operational</span>
            <div className="w-px h-3 bg-white/10 mx-1"></div>
            <span className="text-[9px] font-black uppercase tracking-widest text-secondary">v{import.meta.env.VITE_APP_VERSION || '1.0.0'}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:flex md:items-center gap-x-12 gap-y-6">
          <div className="space-y-3">
            <h5 className="text-[10px] font-black uppercase tracking-widest text-white/40">Resources</h5>
            <ul className="space-y-2">
              <li><a href="#/docs" className="text-xs font-bold text-secondary hover:text-orange-500 transition-colors">Documentation</a></li>
              <li><a href="#/updates" className="text-xs font-bold text-secondary hover:text-orange-500 transition-colors">Changelog</a></li>
            </ul>
          </div>
          
          <div className="space-y-3">
            <h5 className="text-[10px] font-black uppercase tracking-widest text-white/40">Legal</h5>
            <ul className="space-y-2">
              <li><a href="#/privacy" className="text-xs font-bold text-secondary hover:text-orange-500 transition-colors">Privacy Policy</a></li>
              <li><a href="#/terms" className="text-xs font-bold text-secondary hover:text-orange-500 transition-colors">Terms of Service</a></li>
            </ul>
          </div>

          <div className="flex items-center gap-4 pt-4 md:pt-0 md:border-l md:border-white/5 md:pl-8">
            <a href="https://github.com/GameProductions" target="_blank" rel="noreferrer" className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all hover:-translate-y-1">
              <Code size={18} className="text-white" />
            </a>
            <a href="https://gpnet.dev" target="_blank" rel="noreferrer" className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all hover:-translate-y-1">
              <Globe size={18} className="text-white" />
            </a>
          </div>
        </div>
      </div>

      <div className="mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
          © {new Date().getFullYear()} GameProductions™ Systems. All protocols active.
        </p>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-lg border border-white/5">
          <ShieldCheck size={12} className="text-orange-500/50" />
          <span className="text-[9px] font-black uppercase tracking-widest text-white/30">End-to-End Encrypted Ledger</span>
        </div>
      </div>
    </motion.footer>
  );
};
