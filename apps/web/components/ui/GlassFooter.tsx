import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Cpu, Globe } from 'lucide-react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

export const GlassFooter: React.FC = () => {
  const reduced = useReducedMotion();
  const currentYear = new Date().getFullYear();
  const rawVersion = import.meta.env.PACKAGE_VERSION || import.meta.env.VITE_APP_VERSION || '3.160.3';
  const formattedVersion = rawVersion.startsWith('v') ? rawVersion : `v${rawVersion}`;

  const openCookiePreferences = (e: React.MouseEvent) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('gp-open-cookie-preferences'));
  };

  const footerContent = (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Top Row: Context & Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-sm font-bold tracking-tight">
        <div className="flex items-center space-x-3">
          <span className="font-extrabold tracking-wide text-xs uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400">
            Ledger
          </span>
          <span className="font-mono text-[11px] px-2.5 py-0.5 rounded-full bg-slate-900/80 border border-cyan-500/30 text-cyan-400 font-semibold tracking-wider shadow-sm">
            {formattedVersion}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-slate-500 font-semibold tracking-wider text-[11px] uppercase">
          <a href="/legal/terms" className="hover:text-cyan-400 transition-colors">Terms</a>
          <a href="/legal/privacy" className="hover:text-cyan-400 transition-colors">Privacy</a>
          <a href="/legal/security" className="hover:text-cyan-400 transition-colors">Security</a>
          <a href="/legal/safety" className="hover:text-cyan-400 transition-colors">Safety</a>
          <a href="/legal/cookies" className="hover:text-cyan-400 transition-colors">Cookies</a>
          <button 
            onClick={openCookiePreferences} 
            className="hover:text-cyan-400 transition-colors uppercase cursor-pointer"
          >
            Preferences
          </button>
        </div>
      </div>

      {/* Bottom Row: Ownership */}
      <div className="pt-8 border-t border-slate-900/50 flex justify-center">
        <p className="text-slate-500 text-[11px] font-bold tracking-[0.2em] uppercase text-center">
          {currentYear} GameProductions™. All rights reserved.
        </p>
      </div>
    </div>
  );

  return reduced ? (
    <footer className="mt-auto pt-16 pb-12 px-6 border-t border-slate-900/80 bg-slate-950/60 backdrop-blur-xl">
      {footerContent}
    </footer>
  ) : (
    <motion.footer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.5 }}
      className="mt-auto pt-16 pb-12 px-6 border-t border-slate-900/80 bg-slate-950/60 backdrop-blur-xl"
    >
      {footerContent}
    </motion.footer>
  );
};


