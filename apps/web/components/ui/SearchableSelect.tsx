import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, Check, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '../../hooks/useReducedMotion';

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
  onCreate?: (search: string) => Promise<string | void> | string | void;
}

// ─────────────────────────────────────────────────────────
// Portal-based dropdown — renders into document.body so it
// cannot be clipped or stacked-under by any ancestor transform,
// overflow:hidden, or stacking context.
// ─────────────────────────────────────────────────────────

interface DropdownPortalProps {
  triggerRef: React.RefObject<HTMLDivElement | null>;
  portalRef: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}

const DropdownPortal: React.FC<DropdownPortalProps> = ({ triggerRef, portalRef, children }) => {
  const [style, setStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    const position = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownHeight = 380; // approximate max-height
      const above = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

      setStyle({
        position: 'fixed',
        zIndex: 9999,
        left: rect.left,
        width: rect.width,
        ...(above
          ? { bottom: window.innerHeight - rect.top + 4 }
          : { top: rect.bottom + 4 }),
      });
    };

    position();
    window.addEventListener('scroll', position, true);
    window.addEventListener('resize', position);
    return () => {
      window.removeEventListener('scroll', position, true);
      window.removeEventListener('resize', position);
    };
  }, [triggerRef]);

  return createPortal(
    // Attach the portalRef so the parent can detect clicks inside the portal
    <div style={style} ref={portalRef}>{children}</div>,
    document.body
  );
};

// ─────────────────────────────────────────────────────────
// Shared dropdown content (used in both animated/reduced branches)
// ─────────────────────────────────────────────────────────

interface DropdownContentProps {
  inputRef: React.RefObject<HTMLInputElement | null>;
  search: string;
  setSearch: (v: string) => void;
  filteredOptions: SearchableOption[];
  showCreateOption: boolean;
  activeIndex: number;
  setActiveIndex: (i: number) => void;
  value: string;
  onChange: (v: string) => void;
  setIsOpen: (v: boolean) => void;
  onCreate?: SearchableSelectProps['onCreate'];
}

const DropdownContent: React.FC<DropdownContentProps> = ({
  inputRef, search, setSearch, filteredOptions, showCreateOption,
  activeIndex, setActiveIndex, value, onChange, setIsOpen, onCreate,
}) => (
  <>
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
          className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-amber-500/30 transition-all"
          // prevent the input click from bubbling up to the trigger toggle
          onClick={(e) => e.stopPropagation()}
          // prevent mousedown from triggering the outside-click handler
          onMouseDown={(e) => e.stopPropagation()}
        />
      </div>
    </div>

    {/* Options List */}
    <div className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10" role="listbox">
      {showCreateOption && (
        <div
          role="option"
          onMouseDown={(e) => e.preventDefault()} // keep focus on input, prevent outside-click
          onClick={async (e) => {
            e.stopPropagation();
            const newId = await onCreate!(search.trim());
            if (newId) onChange(newId);
            setSearch('');
            setIsOpen(false);
          }}
          className="flex items-center gap-4 px-5 py-4 cursor-pointer transition-all hover:bg-white/5 text-amber-500 font-bold"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 overflow-hidden">
            <Plus size={16} className="text-amber-500" />
          </div>
          <div className="flex-1 flex flex-col">
            <span className="text-sm font-bold tracking-tight">Create "{search.trim()}"</span>
          </div>
        </div>
      )}

      {filteredOptions.length === 0 && !search ? (
        <div className="p-8 text-center text-slate-400">
          <p className="text-xs font-black uppercase tracking-widest text-amber-500/80 mb-1.5">No options created yet</p>
          <p className="text-[11px] text-slate-500 font-bold leading-normal">Type a name in the search box above to create one dynamically!</p>
        </div>
      ) : filteredOptions.length > 0 ? (
        filteredOptions.map((option, idx) => {
          const isActive = idx === activeIndex;
          const isSelected = option.value === value;
          return (
            <div
              key={option.value}
              role="option"
              aria-selected={isSelected}
              // Use onMouseDown + preventDefault to register the selection
              // BEFORE the document mousedown outside-click handler fires,
              // without losing focus or closing the dropdown prematurely.
              onMouseDown={(e) => {
                e.preventDefault(); // prevents focus loss & outside-click
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
                  <span className="text-xs text-slate-500 font-medium">{option.metadata.email}</span>
                )}
              </div>
              {isSelected && <Check size={16} className="text-amber-500" />}
            </div>
          );
        })
      ) : (
        <div className="p-12 text-center">
          <p className="text-sm text-slate-600 font-black uppercase tracking-[0.2em] italic">No Matches Found</p>
        </div>
      )}
    </div>
  </>
);

// ─────────────────────────────────────────────────────────
// Main SearchableSelect component
// ─────────────────────────────────────────────────────────

const DROPDOWN_CLASSES = 'bg-bg-dark border border-white/10 rounded-[1.5rem] shadow-2xl overflow-hidden';

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  className = '',
  icon: LeadingIcon,
  onCreate,
}) => {
  const reduced = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const triggerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Ref to the portal wrapper div — used to detect clicks inside the portal
  const portalRef = useRef<HTMLDivElement>(null);

  const sortedOptions = useMemo(() => [...options].sort((a, b) => a.label.localeCompare(b.label)), [options]);
  const selectedOption = useMemo(() => sortedOptions.find(o => o.value === value), [sortedOptions, value]);

  const showCreateOption = useMemo(() => {
    if (!onCreate || !search.trim()) return false;
    return !sortedOptions.some(opt => opt.label.toLowerCase() === search.trim().toLowerCase());
  }, [sortedOptions, search, onCreate]);

  const filteredOptions = useMemo(() => {
    if (!search) return sortedOptions;
    return sortedOptions.filter(opt =>
      opt.label.toLowerCase().includes(search.toLowerCase()) ||
      (opt.metadata?.email && opt.metadata.email.toLowerCase().includes(search.toLowerCase()))
    );
  }, [sortedOptions, search]);

  useEffect(() => { setActiveIndex(0); }, [search]);

  // Close on outside click — correctly excludes clicks inside the portal
  const handleClickOutside = useCallback((e: MouseEvent) => {
    const target = e.target as Node;
    // If click is inside the trigger or inside the portal dropdown, ignore
    if (triggerRef.current?.contains(target)) return;
    if (portalRef.current?.contains(target)) return;
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, handleClickOutside]);

  // Clear search when closed
  useEffect(() => {
    if (!isOpen) setSearch('');
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') setIsOpen(true);
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

  const contentProps: DropdownContentProps = {
    inputRef, search, setSearch, filteredOptions, showCreateOption,
    activeIndex, setActiveIndex, value, onChange, setIsOpen, onCreate,
  };

  return (
    <div className={`relative ${className}`} ref={triggerRef} onKeyDown={handleKeyDown}>
      {/* Trigger button */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
          if (!isOpen) setTimeout(() => inputRef.current?.focus(), 50);
        }}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
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
              <span className="text-[12px] text-slate-500 font-black uppercase tracking-widest truncate">
                {selectedOption.metadata.subtext}
              </span>
            )}
          </div>
        </div>
        <ChevronDown size={16} className={`text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* Portal dropdown — escapes all ancestor stacking contexts */}
      {isOpen && (
        <DropdownPortal triggerRef={triggerRef} portalRef={portalRef}>
          {reduced ? (
            <div
              className={DROPDOWN_CLASSES}
              style={{ backfaceVisibility: 'hidden' }}
            >
              <DropdownContent {...contentProps} />
            </div>
          ) : (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className={DROPDOWN_CLASSES}
                style={{ backfaceVisibility: 'hidden' }}
              >
                <DropdownContent {...contentProps} />
              </motion.div>
            </AnimatePresence>
          )}
        </DropdownPortal>
      )}
    </div>
  );
};
