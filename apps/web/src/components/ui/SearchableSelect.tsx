import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface SearchableOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  metadata?: any;
}

interface SearchableSelectProps {
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  icon?: React.ReactNode;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({ 
  options, 
  value, 
  onChange, 
  placeholder = "Select option...", 
  className = "",
  icon: LeadingIcon
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = useMemo(() => options.find(o => o.value === value), [options, value]);

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    return options.filter(opt => 
      opt.label.toLowerCase().includes(search.toLowerCase()) || 
      (opt.metadata?.email && opt.metadata.email.toLowerCase().includes(search.toLowerCase()))
    );
  }, [options, search]);

  useEffect(() => {
    setActiveIndex(0);
  }, [search]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(prev => (prev + 1) % filteredOptions.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => (prev - 1 + filteredOptions.length) % filteredOptions.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[activeIndex]) {
          onChange(filteredOptions[activeIndex].value);
          setIsOpen(false);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef} onKeyDown={handleKeyDown}>
      {/* Trigger */}
      <div 
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className={`flex items-center gap-3 px-4 py-3 bg-black/40 border rounded-xl cursor-pointer transition-all duration-300 group ${
          isOpen ? 'border-amber-500/50 ring-1 ring-amber-500/20' : 'border-white/10 hover:border-white/20'
        }`}
      >
        <div className="flex-1 flex items-center gap-3 overflow-hidden">
           {selectedOption?.icon || LeadingIcon || <Search size={16} className="text-slate-500 group-hover:text-amber-500/50 transition-colors" />}
           <div className="flex flex-col overflow-hidden">
              <span className={`text-sm tracking-tight truncate ${selectedOption ? 'text-white font-medium' : 'text-slate-500'}`}>
                {selectedOption ? selectedOption.label : placeholder}
              </span>
              {selectedOption?.metadata?.subtext && (
                 <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest truncate">{selectedOption.metadata.subtext}</span>
              )}
           </div>
        </div>
        <ChevronDown size={16} className={`text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute z-[3000] left-0 right-0 mt-2 bg-[#121212]/95 backdrop-blur-2xl border border-white/10 rounded-[1.5rem] shadow-2xl overflow-hidden"
          >
            {/* Search Input */}
            <div className="p-3 border-b border-white/5 bg-white/2">
              <div className="relative flex items-center">
                <Search size={14} className="absolute left-3 text-slate-500" />
                <input 
                  ref={inputRef}
                  type="text" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Typing to suggest..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:border-amber-500/30 transition-all"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            {/* Options List */}
            <div className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option, idx) => {
                  const isActive = idx === activeIndex;
                  const isSelected = option.value === value;
                  
                  return (
                    <div
                      key={option.value}
                      onClick={(e) => {
                        e.stopPropagation();
                        onChange(option.value);
                        setIsOpen(false);
                      }}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={`flex items-center gap-4 px-5 py-4 cursor-pointer transition-all ${
                        isActive ? 'bg-white/5' : ''
                      } ${isSelected ? 'text-amber-500' : 'text-slate-300'}`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center border border-white/5 overflow-hidden">
                        {option.icon || <div className="text-sm font-black italic">{option.label.charAt(0)}</div>}
                      </div>
                      <div className="flex-1 flex flex-col">
                        <span className="text-sm font-bold tracking-tight">{option.label}</span>
                        {option.metadata?.email && (
                          <span className="text-[10px] text-slate-500 font-medium">{option.metadata.email}</span>
                        )}
                      </div>
                      {isSelected && <Check size={16} className="text-amber-500" />}
                    </div>
                  );
                })
              ) : (
                <div className="p-12 text-center">
                   <p className="text-xs text-slate-600 font-black uppercase tracking-[0.2em] italic">No Matches Found</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
