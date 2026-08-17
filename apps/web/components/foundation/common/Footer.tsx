/** @jsxImportSource react */
import React from 'react';

interface FooterProps {
  appName: string;
  version: string;
  isGloson?: boolean;
}

/**
 * Universal Footer 
 * Standardized branding and legal disclosure for all GameProductions apps.
 */
export const Footer: React.FC<FooterProps> = ({ appName, version, isGloson = false }) => {
  const currentYear = new Date().getFullYear();
  const formattedVersion = version?.startsWith('v') ? version : `v${version || '1.0.0'}`;

  return (
    <footer className="mt-auto pt-16 pb-12 px-6 border-t border-slate-900/80 bg-slate-950/60 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Row: Context & Navigation */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-sm font-bold tracking-tight">
          <div className="flex items-center space-x-3">
            <span className="font-extrabold tracking-wide text-xs uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400">
              {appName}
            </span>
            <span className="font-mono text-[11px] px-2.5 py-0.5 rounded-full bg-slate-900/80 border border-cyan-500/30 text-cyan-400 font-semibold tracking-wider shadow-sm">
              {formattedVersion}
            </span>
          </div>

          <div className="flex items-center space-x-6 text-slate-500 font-semibold tracking-wider text-[11px] uppercase">
            <a href="/legal/privacy" className="hover:text-cyan-400 transition-colors">Privacy</a>
            <a href="/legal/security" className="hover:text-cyan-400 transition-colors">Security</a>
            <a href="/legal/safety" className="hover:text-cyan-400 transition-colors">Safety</a>
          </div>
        </div>

        {/* Bottom Row: Ownership */}
        <div className="pt-8 border-t border-slate-900/50 flex justify-center">
          <p className="text-slate-500 text-[11px] font-bold tracking-[0.2em] uppercase">
            {currentYear} GameProductions™{isGloson ? ' & Gloson Production™' : ''}. All rights reserved.
          </p>
        </div>

      </div>
    </footer>
  );
};
