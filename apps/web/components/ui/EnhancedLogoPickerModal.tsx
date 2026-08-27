import React, { useState, useEffect } from 'react';
import { Search, Globe, Sparkles, X } from 'lucide-react';
import { LogoSearchResult, foundationLogoClient } from '@shared/logo';

interface EnhancedLogoPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLogo: (logoUrl: string, brandColors?: string[]) => void;
  initialQuery?: string;
  projectId?: string;
}

export const EnhancedLogoPickerModal: React.FC<EnhancedLogoPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectLogo,
  initialQuery = '',
  projectId = 'ledger',
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [allowNsfw, setAllowNsfw] = useState(false);
  const [results, setResults] = useState<LogoSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && initialQuery) {
      setQuery(initialQuery);
      handleSearch(initialQuery, allowNsfw);
    }
  }, [isOpen, initialQuery]);

  const handleSearch = async (searchQuery: string, nsfwFlag: boolean) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const logos = await foundationLogoClient.search(searchQuery, {
        projectId,
        allowNsfw: nsfwFlag,
      });
      setResults(logos);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">Select Brand & Service Logo</h2>
              <p className="text-xs text-slate-400">Universal Foundation Logo Gateway Search</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & Options */}
        <div className="p-6 space-y-4 border-b border-slate-800/40 bg-slate-950/40">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(query, allowNsfw)}
              placeholder="Search company, brand, or domain (e.g. netflix.com, github)..."
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-11 pr-24 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors font-medium"
            />
            <button
              onClick={() => handleSearch(query, allowNsfw)}
              disabled={loading}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-black font-black text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-500">Active Sources:</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] text-slate-300 font-mono">Logo.dev</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] text-slate-300 font-mono">Brandfetch</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] text-slate-300 font-mono">geticon.dev</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] text-slate-300 font-mono">DOM Scraper</span>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allowNsfw}
                onChange={(e) => {
                  setAllowNsfw(e.target.checked);
                  handleSearch(query, e.target.checked);
                }}
                className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-0"
              />
              <span className="text-slate-400 text-xs">Allow NSFW / Adult logos</span>
            </label>
          </div>
        </div>

        {/* Gallery Results Grid */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
              <p className="text-xs font-mono text-slate-500">Querying central gateway...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Globe className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-400">No logos found</p>
              <p className="text-xs text-slate-500">Try searching for a domain like <span className="font-mono text-emerald-400">apple.com</span> or company name.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {results.map((logo, idx) => {
                const isSelected = selectedUrl === logo.url;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedUrl(logo.url);
                      onSelectLogo(logo.url, logo.brandColors);
                      onClose();
                    }}
                    className={`group relative p-4 rounded-2xl border transition-all flex flex-col items-center justify-between text-center gap-3 cursor-pointer bg-slate-950/60 hover:border-emerald-500/50 ${
                      isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/30' : 'border-slate-800/80'
                    }`}
                  >
                    <div className="w-16 h-16 rounded-xl bg-slate-900/80 p-2 flex items-center justify-center border border-white/5 group-hover:scale-105 transition-transform overflow-hidden">
                      <img
                        src={logo.url}
                        alt={logo.label || 'Logo variant'}
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>

                    <div className="space-y-0.5 w-full">
                      <div className="text-xs font-bold text-white truncate capitalize">{logo.label || logo.type || 'Icon'}</div>
                      <div className="flex items-center justify-center gap-1.5 text-[9px] text-slate-500 font-mono uppercase">
                        <span>{logo.format}</span>
                        <span>•</span>
                        <span>{logo.source}</span>
                      </div>
                    </div>

                    {logo.isNsfw && (
                      <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[8px] font-black rounded-md uppercase">
                        NSFW
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
