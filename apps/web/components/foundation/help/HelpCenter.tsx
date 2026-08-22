import React, { useState, useRef, useEffect } from 'react';
import { Search, Tag, BookOpen, CheckCircle2, ChevronRight, ChevronLeft, X } from 'lucide-react';

export interface HelpItem {
  id: string;
  category: string;
  title: string;
  content: string;
}

/**
 * Modern, high-fidelity Universal Search & Knowledge Base component.
 * Features full-width search and horizontally scrollable topic tabs with navigation indicators.
 */
export const HelpCenter: React.FC<{ items: HelpItem[] }> = ({ items }) => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const categories = ['all', ...Array.from(new Set(items.map((i: HelpItem) => i.category)))];

  const checkScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [categories]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const amount = direction === 'left' ? -200 : 200;
    scrollContainerRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    setTimeout(checkScroll, 250);
  };

  const filteredItems = items.filter((i: HelpItem) => {
    const query = search.toLowerCase().trim();
    const matchesSearch = !query || i.title.toLowerCase().includes(query) || i.content.toLowerCase().includes(query) || i.category.toLowerCase().includes(query);
    const matchesCategory = activeCategory === 'all' || i.category.toLowerCase() === activeCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const getCategoryBadge = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'basics':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'planning':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'automation':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'security':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'lifecycle':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'admin':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'system':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Search Header Container with Dedicated Full-Width Search Row & Scrollable Topic Tabs */}
      <div className="bg-slate-950/60 p-5 rounded-3xl border border-white/5 backdrop-blur-xl space-y-4 shadow-xl">
        {/* Row 1: Full-Width Search Input */}
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search guides, tutorials, features, security topics, transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-10 py-3 bg-slate-900/80 border border-white/10 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-colors shadow-inner"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Row 2: Dedicated Scrollable Topic Tabs with Navigation Arrows & Edge Gradients */}
        <div className="relative flex items-center pt-1 border-t border-white/5">
          {/* Scroll Left Button */}
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => handleScroll('left')}
              className="absolute left-0 z-10 p-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 rounded-xl shadow-lg backdrop-blur-md transition-all cursor-pointer -translate-x-2"
              title="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {/* Left Shadow Fade */}
          {canScrollLeft && (
            <div className="absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-slate-950/90 to-transparent pointer-events-none z-[5]" />
          )}

          {/* Scrollable Pills Container */}
          <div
            ref={scrollContainerRef}
            onScroll={checkScroll}
            className="flex items-center gap-2 overflow-x-auto custom-scrollbar py-1 px-1 w-full scroll-smooth no-scrollbar"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {categories.map((cat) => {
              const count = items.filter(i => cat === 'all' || i.category.toLowerCase() === cat.toLowerCase()).length;
              const isActive = activeCategory.toLowerCase() === cat.toLowerCase();
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer whitespace-nowrap border flex items-center gap-2 shrink-0 ${
                    isActive
                      ? 'bg-primary text-slate-950 border-primary shadow-lg shadow-primary/20 scale-[1.02]'
                      : 'bg-slate-900/60 text-slate-400 border-white/5 hover:text-white hover:border-white/10 hover:bg-slate-900/90'
                  }`}
                >
                  <span>{cat === 'all' ? 'All Topics' : cat}</span>
                  <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                    isActive ? 'bg-slate-950/30 text-slate-950 font-black' : 'bg-white/5 text-slate-400'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Shadow Fade */}
          {canScrollRight && (
            <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-slate-950/90 to-transparent pointer-events-none z-[5]" />
          )}

          {/* Scroll Right Button */}
          {canScrollRight && (
            <button
              type="button"
              onClick={() => handleScroll('right')}
              className="absolute right-0 z-10 p-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 rounded-xl shadow-lg backdrop-blur-md transition-all cursor-pointer translate-x-2"
              title="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Grid of Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredItems.length === 0 ? (
          <div className="col-span-full text-center py-16 bg-slate-950/40 rounded-3xl border border-white/5">
            <BookOpen className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
            <h4 className="text-sm font-bold text-slate-300">No matching help articles found</h4>
            <p className="text-xs text-slate-500 mt-1">Try searching for a different keyword or select another topic filter</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className="p-6 bg-slate-950/50 hover:bg-slate-900/80 border border-white/5 hover:border-white/15 rounded-3xl transition-all duration-300 flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${getCategoryBadge(item.category)}`}>
                    {item.category}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed font-normal">
                  {item.content}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1 text-slate-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Verified Guide
                </span>
                <span className="text-primary font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                  Learn more <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
