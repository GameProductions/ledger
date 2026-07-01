import React, { useState, useMemo } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { Price } from './Price'
import { Modal } from './ui/Modal'
import { 
  Filter, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Settings2, 
  Clock, 
  CreditCard, 
  ArrowRight,
  List as ListIcon,
  Grid as GridIcon
} from 'lucide-react'
import { 
  startOfMonth, 
  endOfMonth, 
  addDays, 
  isSameDay, 
  format, 
  parseISO, 
  addMonths, 
  startOfDay, 
  endOfDay,
  eachDayOfInterval,
  isToday as isDateToday,
  differenceInDays
} from 'date-fns'
import { getPayPeriodRange } from '../utils/payCycleUtils'

interface CalendarProps {
  transactions: any[];
  subscriptions?: any[];
  bills?: any[];
  installments?: any[];
  recurringProjections?: any[];
  paySchedules?: any[]; // These are projected instances
  payScheduleDefinitions?: any[]; // Raw definitions for schedule selection
  onDayClick: (date: Date) => void;
  onItemClick: (item: any) => void;
}

const Calendar: React.FC<CalendarProps> = ({ 
  transactions, 
  subscriptions = [], 
  bills = [], 
  installments = [], 
  recurringProjections = [],
  paySchedules = [], 
  payScheduleDefinitions = [],
  onDayClick, 
  onItemClick 
}) => {
  const reduced = useReducedMotion();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoverItem, setHoverItem] = useState<any>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  const [displayMode, setDisplayMode] = useState<'calendar' | 'list'>('calendar');
  const [filterType, setFilterType] = useState<'all' | 'transaction' | 'bill' | 'pay_schedule'>('all');
  const [sortBy, setSortBy] = useState<'date_asc' | 'date_desc' | 'amount_asc' | 'amount_desc'>('date_asc');
  
  // Range State
  const [rangeType, setRangeType] = useState<'month' | 'relative' | 'pay_period' | 'custom'>('month');
  const [rangeValue, setRangeValue] = useState<number>(30); // for relative
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');
  const [payPeriodType, setPayPeriodType] = useState<'previous' | 'current' | 'next'>('current');
  const [customRange, setCustomRange] = useState({ start: format(new Date(), 'yyyy-MM-dd'), end: format(addDays(new Date(), 30), 'yyyy-MM-dd') });
  const [isRangeModalOpen, setIsRangeModalOpen] = useState(false);

  // Totals Panel States
  const [showTotalsPanel, setShowTotalsPanel] = useState(false);
  const [includeProjected, setIncludeProjected] = useState(true);
  const [totalsScope, setTotalsScope] = useState<'all' | 'debits' | 'deposits' | 'category' | 'account' | 'search'>('all');
  const [totalsCategoryId, setTotalsCategoryId] = useState('');
  const [totalsAccountId, setTotalsAccountId] = useState('');
  const [totalsSearch, setTotalsSearch] = useState('');

  const [alignBillerName, setAlignBillerName] = useState('');
  const [isAligning, setIsAligning] = useState(false);

  const handleReevaluate = async (scope: 'all' | 'biller', biller?: string) => {
    setIsAligning(true);
    try {
      const response = await fetch('/api/planning/re-evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope,
          billerName: biller || null,
          rangeStart: format(resolvedRange.start, 'yyyy-MM-dd'),
          rangeEnd: format(resolvedRange.end, 'yyyy-MM-dd')
        })
      });
      const data = (await response.json() as any);
      if (data.success) {
        alert(`Successfully aligned ${data.updatedCount} occurrences to the paycheck dates!`);
        window.location.reload();
      } else {
        alert(data.error || 'Failed to align pay schedule');
      }
    } catch (e: any) {
      alert(e.message || 'Error aligning pay schedule');
    } finally {
      setIsAligning(false);
    }
  };

  const getAssignedPaycheckName = (item: any) => {
    if (!item.payScheduleId) return null;
    const ps = (payScheduleDefinitions || []).find(p => p.id === item.payScheduleId);
    return ps ? ps.name : null;
  };

  const resolvedRange = useMemo(() => {
    const today = startOfDay(new Date());
    if (rangeType === 'month') {
        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);
        return { start, end, isMonthMode: true };
    } else if (rangeType === 'relative') {
        return { start: today, end: endOfDay(addDays(today, rangeValue - 1)), isMonthMode: false };
    } else if (rangeType === 'pay_period') {
        const range = getPayPeriodRange(paySchedules, selectedScheduleId, payPeriodType, today);
        if (range) return { start: range.start, end: range.end, isMonthMode: false };
        return { start: startOfMonth(today), end: endOfMonth(today), isMonthMode: true };
    } else {
        return { start: parseISO(customRange.start), end: parseISO(customRange.end), isMonthMode: false };
    }
  }, [rangeType, currentDate, rangeValue, selectedScheduleId, payPeriodType, customRange, paySchedules]);

  const datesToRender = useMemo(() => {
    try {
        const firstDay = resolvedRange.start.getDay();
        const daysInRange = eachDayOfInterval({ start: resolvedRange.start, end: resolvedRange.end });
        const padding = Array.from({ length: firstDay }, (_, i) => addDays(resolvedRange.start, -(firstDay - i)));
        return [...padding.map(d => ({ date: d, isPadding: true })), ...daysInRange.map(d => ({ date: d, isPadding: false }))];
    } catch(e: any) {
        return [];
    }
  }, [resolvedRange]);

  // Consolidate all items for the range
  const getAllRangeItems = () => {
    let all: any[] = [];
    datesToRender.forEach(d => {
        if (!d.isPadding) {
            all = [...all, ...getItemsForDate(d.date)];
        }
    });
    return all;
  };

  const getItemsForDate = (dateToCheck: Date) => {
    const dateStr = format(dateToCheck, 'yyyy-MM-dd');
    const dayTxs = (Array.isArray(transactions) ? transactions : []).filter(tx => {
      return tx.transactionDate === dateStr;
    }).map(tx => ({ ...tx, type: 'transaction' }));

    const dayRecurringProj = (Array.isArray(recurringProjections) ? recurringProjections : [])
      .filter(rp => rp.date === dateStr)
      .map(rp => ({
          ...rp.originalData,
          id: rp.id,
          type: rp.type,
          description: rp.description,
          amountCents: rp.amountCents,
          _date: parseISO(rp.date),
      }));

    const dayBills = (Array.isArray(subscriptions) ? subscriptions : [])
      .concat(Array.isArray(bills) ? bills : [])
      .concat(Array.isArray(installments) ? installments : [])
      .filter(sub => {
        if (sub.frequency || sub.billingCycle) return false;
        const subDateStr = sub.nextBillingDate || sub.dueDate || sub.nextPayDate;
        return subDateStr === dateStr;
    }).map(sub => ({ 
        ...sub, 
        type: sub.dueDate ? 'bill' : sub.nextPayDate ? 'installment' : 'subscription', 
        description: sub.name, 
        amountCents: sub.amountCents || sub.installmentAmountCents,
        _date: parseISO(sub.nextBillingDate || sub.dueDate || sub.nextPayDate)
    }));

    const dayPays = (Array.isArray(paySchedules) ? paySchedules : []).filter(pay => {
      const payDateStr = pay.date || pay.nextPayDate;
      return payDateStr === dateStr;
    }).map(pay => ({ 
        ...pay, 
        type: 'pay_schedule', 
        description: `${pay.name}`, 
        amountCents: pay.amountCents || pay.estimatedAmountCents || 0,
        _date: parseISO(pay.date || pay.nextPayDate)
    }));

    // Backfill _date for sorting uniformly
    dayTxs.forEach(t => t._date = parseISO(t.transactionDate));

    return [...dayPays, ...dayRecurringProj, ...dayBills, ...dayTxs];
  };

  const uniqueCategories = useMemo(() => {
    const catsMap = new Map<string, string>();
    transactions.forEach(t => {
      if (t.categoryId && t.categoryName) catsMap.set(t.categoryId, t.categoryName);
      else if (t.category?.id && t.category?.name) catsMap.set(t.category.id, t.category.name);
    });
    bills.forEach(b => {
      if (b.categoryId && b.categoryName) catsMap.set(b.categoryId, b.categoryName);
      else if (b.category?.id && b.category?.name) catsMap.set(b.category.id, b.category.name);
    });
    subscriptions.forEach(s => {
      if (s.categoryId && s.categoryName) catsMap.set(s.categoryId, s.categoryName);
      else if (s.category?.id && s.category?.name) catsMap.set(s.category.id, s.category.name);
    });
    return Array.from(catsMap.entries()).map(([id, name]) => ({ id, name }));
  }, [transactions, bills, subscriptions]);

  const uniqueAccounts = useMemo(() => {
    const acctsMap = new Map<string, string>();
    transactions.forEach(t => {
      if (t.accountId && t.accountName) acctsMap.set(t.accountId, t.accountName);
      else if (t.account?.id && t.account?.name) acctsMap.set(t.account.id, t.account.name);
    });
    bills.forEach(b => {
      if (b.accountId && b.accountName) acctsMap.set(b.accountId, b.accountName);
      else if (b.account?.id && b.account?.name) acctsMap.set(b.account.id, b.account.name);
    });
    subscriptions.forEach(s => {
      if (s.accountId && s.accountName) acctsMap.set(s.accountId, s.accountName);
      else if (s.account?.id && s.account?.name) acctsMap.set(s.account.id, s.account.name);
    });
    return Array.from(acctsMap.entries()).map(([id, name]) => ({ id, name }));
  }, [transactions, bills, subscriptions]);

  const rangeTotals = useMemo(() => {
    let items = getAllRangeItems();
    if (!includeProjected) {
      items = items.filter(item => item.type === 'transaction');
    }

    let depositSum = 0;
    let debitSum = 0;
    let matchedSum = 0;
    let matchCount = 0;

    items.forEach(item => {
      const amount = item.amountCents || 0;
      const isDeposit = item.type === 'pay_schedule' || (item.type === 'transaction' && amount > 0);
      
      if (isDeposit) {
        depositSum += Math.abs(amount);
      } else {
        debitSum += Math.abs(amount);
      }

      let matches = false;
      if (totalsScope === 'all') {
        matches = true;
      } else if (totalsScope === 'debits') {
        matches = !isDeposit;
      } else if (totalsScope === 'deposits') {
        matches = isDeposit;
      } else if (totalsScope === 'category') {
        matches = (item.categoryId === totalsCategoryId || item.category?.id === totalsCategoryId);
      } else if (totalsScope === 'account') {
        matches = (item.accountId === totalsAccountId || item.account?.id === totalsAccountId);
      } else if (totalsScope === 'search') {
        matches = item.description?.toLowerCase().includes(totalsSearch.toLowerCase()) ||
                  item.notes?.toLowerCase().includes(totalsSearch.toLowerCase());
      }

      if (matches) {
        matchedSum += amount;
        matchCount++;
      }
    });

    return {
      depositSum,
      debitSum,
      netFlow: depositSum - debitSum,
      matchedSum,
      matchCount
    };
  }, [datesToRender, transactions, subscriptions, bills, installments, recurringProjections, paySchedules, includeProjected, totalsScope, totalsCategoryId, totalsAccountId, totalsSearch]);

  const monthName = format(currentDate, 'MMMM');
  const year = format(currentDate, 'yyyy');

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(addMonths(currentDate, -1));

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      if (rangeType === 'month') {
        nextMonth();
      } else if (rangeType === 'pay_period') {
        if (payPeriodType === 'current') setPayPeriodType('next');
        else if (payPeriodType === 'previous') setPayPeriodType('current');
      }
    } else if (isRightSwipe) {
      if (rangeType === 'month') {
        prevMonth();
      } else if (rangeType === 'pay_period') {
        if (payPeriodType === 'current') setPayPeriodType('previous');
        else if (payPeriodType === 'next') setPayPeriodType('current');
      }
    }
  };

  const allItems = getAllRangeItems().filter(i => {
      if (filterType === 'all') return true;
      if (filterType === 'bill') return i.type === 'bill' || i.type === 'subscription' || i.type === 'installment';
      return i.type === filterType;
  }).sort((a, b) => {
      if (sortBy === 'date_asc') return a._date.getTime() - b._date.getTime();
      if (sortBy === 'date_desc') return b._date.getTime() - a._date.getTime();
      if (sortBy === 'amount_asc') return Math.abs(a.amountCents) - Math.abs(b.amountCents);
      if (sortBy === 'amount_desc') return Math.abs(b.amountCents) - Math.abs(a.amountCents);
      return 0;
  });

  return (
    <div 
      className="calendar-container bg-black/40 rounded-[2.5rem] border border-white/5 p-6 animate-in fade-in zoom-in duration-500 relative"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="calendar-header flex flex-col gap-6 mb-8 px-4 relative z-10">
        <div className="flex flex-col">
          <h2 className="text-3xl font-black italic tracking-tighter uppercase whitespace-nowrap">
            {rangeType === 'month' ? (
                <>{monthName} <span className="text-primary">{year}</span></>
            ) : rangeType === 'relative' ? (
                <>Next <span className="text-primary">{rangeValue}</span> Days</>
            ) : rangeType === 'pay_period' ? (
                <>Pay <span className="text-primary">Cycle</span></>
            ) : (
                <>Custom <span className="text-primary">Range</span></>
            )}
          </h2>
          <p className="text-[10px] font-black tracking-[0.2em] uppercase text-secondary opacity-60 mt-1">
              {format(resolvedRange.start, 'MMM d')} — {format(resolvedRange.end, 'MMM d, yyyy')}
          </p>
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full pt-4 border-t border-white/5">
          <div className="flex flex-wrap gap-2 items-center">
            {rangeType === 'month' && (
                <>
                    <button onClick={() => setCurrentDate(new Date())} aria-label="Go to today" className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-primary/10 text-primary font-bold hover:bg-primary/20 transition-all text-xs tracking-widest uppercase"><CalendarIcon size={12} /> Today</button>
                    <button onClick={prevMonth} aria-label="Previous month" className="flex items-center gap-1 px-3 h-8 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-xs"><ChevronLeft size={12} /> Prev</button>
                    <button onClick={nextMonth} aria-label="Next month" className="flex items-center gap-1 px-3 h-8 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-xs">Next <ChevronRight size={12} /></button>
                </>
            )}
            {rangeType === 'pay_period' && (
                <>
                    <button 
                        onClick={() => {
                            if (payPeriodType === 'current') setPayPeriodType('previous');
                            else if (payPeriodType === 'next') setPayPeriodType('current');
                        }} 
                        disabled={payPeriodType === 'previous'}
                        aria-label="Previous pay cycle" 
                        className="flex items-center gap-1 px-3 h-8 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 disabled:opacity-40 disabled:hover:bg-white/5 transition-all text-xs"
                    >
                        <ChevronLeft size={12} /> Prev
                    </button>
                    <button 
                        onClick={() => setPayPeriodType('current')} 
                        disabled={payPeriodType === 'current'}
                        aria-label="Current pay cycle" 
                        className="px-3 h-8 flex items-center gap-1.5 rounded-lg bg-primary/10 text-primary font-bold hover:bg-primary/20 disabled:opacity-40 transition-all text-xs tracking-widest uppercase"
                    >
                        <Clock size={12} /> Current
                    </button>
                    <button 
                        onClick={() => {
                            if (payPeriodType === 'current') setPayPeriodType('next');
                            else if (payPeriodType === 'previous') setPayPeriodType('current');
                        }} 
                        disabled={payPeriodType === 'next'}
                        aria-label="Next pay cycle" 
                        className="flex items-center gap-1 px-3 h-8 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 disabled:opacity-40 disabled:hover:bg-white/5 transition-all text-xs"
                    >
                        Next <ChevronRight size={12} />
                    </button>
                </>
            )}
            <button 
                onClick={() => setIsRangeModalOpen(true)}
                className="px-4 h-8 flex items-center gap-2 rounded-lg bg-white/10 text-white font-bold hover:bg-white/20 transition-all text-[10px] tracking-widest uppercase border border-white/5 shadow-xl"
            >
                <Settings2 size={12} className="text-primary" /> Range
            </button>
            <button 
                onClick={() => setShowTotalsPanel(!showTotalsPanel)}
                className={`px-4 h-8 flex items-center gap-2 rounded-lg font-bold transition-all text-[10px] tracking-widest uppercase border border-white/5 shadow-xl ${showTotalsPanel ? 'bg-primary/20 text-primary border-primary/30' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
                📊 Totals
            </button>
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-end">
            <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
                <button onClick={() => setDisplayMode('calendar')} className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${displayMode === 'calendar' ? 'bg-primary text-white shadow-xl' : 'text-secondary hover:text-white'}`}><GridIcon size={12} /> Grid</button>
                <button onClick={() => setDisplayMode('list')} className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${displayMode === 'list' ? 'bg-primary text-white shadow-xl' : 'text-secondary hover:text-white'}`}><ListIcon size={12} /> List</button>
            </div>
            
            <div className="flex gap-2">
              <select 
                value={filterType} 
                onChange={(e: any) => setFilterType(e.target.value)}
                className="bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg text-secondary focus:text-white outline-none"
              >
                 <option value="all">All Items</option>
                 <option value="pay_schedule">Paydays</option>
                 <option value="bill">Bills & Subs</option>
                 <option value="transaction">Transfers</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {showTotalsPanel && (
        <div className="mb-8 p-6 bg-white/[0.02] border border-white/5 rounded-3xl animate-in slide-in-from-top-4 duration-300 relative z-10 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Deposits / Income</span>
              <div className="text-2xl font-black text-emerald-400 mt-1">
                <Price amountCents={rangeTotals.depositSum} />
              </div>
            </div>
            <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Debits / Expenses</span>
              <div className="text-2xl font-black text-rose-400 mt-1">
                <Price amountCents={rangeTotals.debitSum} />
              </div>
            </div>
            <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Net Flow</span>
              <div className={`text-2xl font-black mt-1 ${rangeTotals.netFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                <Price amountCents={rangeTotals.netFlow} />
              </div>
            </div>
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Matched Filter Total</span>
                <div className="text-2xl font-black text-white mt-1">
                  <Price amountCents={rangeTotals.matchedSum} />
                </div>
              </div>
              <span className="text-[9px] font-bold text-slate-400 mt-2">
                {rangeTotals.matchCount} matching items in range
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/5">
            <div className="flex items-center gap-3">
              <input 
                type="checkbox"
                id="includeProjected"
                checked={includeProjected}
                onChange={(e) => setIncludeProjected(e.target.checked)}
                className="w-4 h-4 accent-primary rounded"
              />
              <label htmlFor="includeProjected" className="text-xs font-black uppercase tracking-widest text-secondary cursor-pointer">
                Include Projected Items
              </label>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Totals Filter Scope</label>
              <select
                value={totalsScope}
                onChange={(e: any) => setTotalsScope(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-xs font-bold px-3 py-2 rounded-xl text-white outline-none focus:border-primary"
              >
                <option value="all">All Items</option>
                <option value="debits">Debits / Expenses</option>
                <option value="deposits">Deposits / Income</option>
                <option value="category">Specific Category</option>
                <option value="account">Specific Account</option>
                <option value="search">Keyword Search</option>
              </select>
            </div>

            {totalsScope === 'category' && (
              <div className="space-y-1 animate-in fade-in duration-300">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Select Category</label>
                <select
                  value={totalsCategoryId}
                  onChange={(e: any) => setTotalsCategoryId(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-xs font-bold px-3 py-2 rounded-xl text-white outline-none focus:border-primary font-bold"
                >
                  <option value="">Choose category...</option>
                  {uniqueCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            )}

            {totalsScope === 'account' && (
              <div className="space-y-1 animate-in fade-in duration-300">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Select Account</label>
                <select
                  value={totalsAccountId}
                  onChange={(e: any) => setTotalsAccountId(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-xs font-bold px-3 py-2 rounded-xl text-white outline-none focus:border-primary font-bold"
                >
                  <option value="">Choose account...</option>
                  {uniqueAccounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            )}

            {totalsScope === 'search' && (
              <div className="space-y-1 animate-in fade-in duration-300">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Search Keyword</label>
                <input
                  type="text"
                  placeholder="Filter by description..."
                  value={totalsSearch}
                  onChange={(e) => setTotalsSearch(e.target.value)}
                  className="w-full p-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-bold outline-none focus:border-primary font-bold"
                />
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-white/5 space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">📅 Paycheck Alignment Controls</h4>
            <div className="flex flex-wrap items-center gap-4">
              <button
                disabled={isAligning}
                onClick={() => handleReevaluate('all')}
                className="px-4 py-2.5 bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
              >
                {isAligning ? 'Aligning...' : '⚡ Align All Range Bills to Paychecks'}
              </button>

              <div className="flex items-center gap-2 bg-white/5 border border-white/5 p-1 rounded-xl">
                <input
                  type="text"
                  placeholder="Biller name (e.g. Netflix)"
                  value={alignBillerName}
                  onChange={(e) => setAlignBillerName(e.target.value)}
                  className="bg-transparent text-xs font-bold px-3 py-1.5 text-white outline-none placeholder:text-slate-600"
                />
                <button
                  disabled={isAligning || !alignBillerName}
                  onClick={() => handleReevaluate('biller', alignBillerName)}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                >
                  Align Biller
                </button>
              </div>
            </div>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
              Note: This aligns the due dates of future occurrences to match the closest paycheck date before the due date.
            </p>
          </div>
        </div>
      )}

      {displayMode === 'calendar' ? (
      <div className="grid grid-cols-7 gap-3" role="grid" aria-label="Calendar">
        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
          <div key={d} role="columnheader" className="text-center text-xs font-black text-slate-600 tracking-[0.3em] py-2">{d}</div>
        ))}
        
        {datesToRender.map((dObj, idx) => {
          const { date, isPadding } = dObj;
          const dayItems = getItemsForDate(date).filter(i => {
              if (filterType === 'all') return true;
              if (filterType === 'bill') return i.type === 'bill' || i.type === 'subscription' || i.type === 'installment';
              return i.type === filterType;
          });
          const isToday = isDateToday(date);
          
          return (
            <div 
              key={`${date.toISOString()}-${idx}`} 
              role="gridcell"
              aria-label={isPadding ? '' : `${format(date, 'MMMM d, yyyy')}${dayItems.length > 0 ? `, ${dayItems.length} items` : ''}`}
              onClick={() => !isPadding && onDayClick(date)}
              className={`min-h-[120px] p-3 rounded-3xl border transition-all cursor-pointer group hover:scale-[1.02] active:scale-[0.98] ${
                isPadding ? 'opacity-20 cursor-default' :
                dayItems.length > 0 
                  ? 'bg-white/[0.03] border-white/10' 
                  : 'bg-transparent border-white/5 hover:border-white/20'
              } ${isToday ? 'border-primary/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : ''}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`text-sm font-black ${isToday ? 'text-primary' : 'text-slate-500 group-hover:text-white'}`}>
                  {format(date, 'd') === '1' ? (
                    <span className="flex flex-col items-start leading-none">
                      <span className="text-[8px] opacity-60 uppercase tracking-tighter">{format(date, 'MMM')}</span>
                      <span>{format(date, 'd')}</span>
                    </span>
                  ) : format(date, 'd')}
                </span>
                {!isPadding && (dayItems.length > 0 ? (
                   <div className="flex gap-1">
                     {dayItems.some(i => i.type === 'pay_schedule') && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>}
                     {(dayItems.some(i => i.type === 'subscription') || dayItems.some(i => i.type === 'installment') || dayItems.some(i => i.type === 'bill')) && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>}
                     {dayItems.some(i => i.type === 'transaction') && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>}
                   </div>
                ) : (
                   <div 
                     className="opacity-0 group-hover:opacity-100 transition-opacity"
                     onClick={(e) => { e.stopPropagation(); onDayClick(date); }}
                   >
                     <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 hover:text-white block px-2 py-1 rounded border border-white/5 bg-white/5">+ ADD</span>
                   </div>
                ))}
              </div>

              <div className="space-y-1.5">
                {!isPadding && dayItems.slice(0, 3).map((item: any) => (
                  <div 
                    key={`${item.type}-${item.id || Math.random()}`} 
                    onClick={(e) => { e.stopPropagation(); onItemClick(item); }}
                    onMouseEnter={(e) => {
                       if (item.notes || item.note) {
                           setHoverItem(item);
                           setHoverPos({ x: e.clientX, y: e.clientY });
                       }
                    }}
                    onMouseLeave={() => setHoverItem(null)}
                    className={`text-[10px] p-1.5 rounded-lg truncate font-bold border transition-all hover:brightness-125 flex items-center justify-between gap-1 ${
                      item.type === 'pay_schedule'
                        ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                        : (item.type === 'subscription' || item.type === 'bill' || item.type === 'installment')
                          ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                          : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                    }`}
                  >
                    <span className="truncate flex items-center gap-1">
                        <Price amountCents={item.amountCents} options={{ minimumFractionDigits: 0 }} /> {item.description}
                    </span>
                    {(item.notes || item.note) && <span className="text-[8px] animate-pulse">📝</span>}
                  </div>
                ))}
                {!isPadding && dayItems.length > 3 && (
                  <div className="text-[10px] text-center font-black text-slate-600 uppercase tracking-widest">
                    + {dayItems.length - 3} MORE
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar relative">
           <div className="flex justify-end mb-4 sticky top-0 bg-black/40 backdrop-blur-xl py-2 z-10">
             <button 
               onClick={() => onDayClick(new Date())}
               className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
             >
               <span>+ Add Entry</span>
             </button>
           </div>
           {allItems.length === 0 ? (
               <div className="text-center py-12 text-secondary opacity-50 text-sm font-bold border border-dashed border-white/10 rounded-2xl">
                   No scheduled items match your filters for the selected range.
               </div>
           ) : (
               allItems.map((item: any, i) => (
                    <div 
                        key={`${item.type}-${item.id || i}`}
                        onClick={() => onItemClick(item)}
                        className={`flex items-center justify-between p-4 rounded-xl border transition-all hover:scale-[1.01] cursor-pointer ${
                            item.type === 'pay_schedule'
                              ? 'bg-blue-500/5 hover:bg-blue-500/10 border-blue-500/20'
                              : (item.type === 'subscription' || item.type === 'bill' || item.type === 'installment')
                                ? 'bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/20' 
                                : 'bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/20'
                          }`}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                               item.type === 'pay_schedule' ? 'bg-blue-500/20 text-blue-500' :
                               (item.type === 'subscription' || item.type === 'bill' || item.type === 'installment') ? 'bg-amber-500/20 text-amber-500' :
                               'bg-emerald-500/20 text-emerald-500'
                            }`}>
                                {format(item._date, 'd')}
                            </div>
                            <div>
                                <h4 className="font-bold text-sm">{item.description}</h4>
                                <p className="text-[10px] uppercase tracking-widest font-black opacity-50 mt-1 flex flex-wrap items-center gap-1">
                                    <span>{item.type.replace('_', ' ')} • {format(item._date, 'MMM d, yyyy')}</span>
                                    {getAssignedPaycheckName(item) && (
                                      <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-black text-[8px] uppercase tracking-widest ml-1 border border-blue-500/10">
                                        💸 {getAssignedPaycheckName(item)}
                                      </span>
                                    )}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                           <Price amountCents={item.amountCents} className="text-lg font-black tracking-tighter" />
                        </div>
                    </div>
               ))
           )}
        </div>
      )}

      {/* Range Filter Modal */}
      <Modal 
        isOpen={isRangeModalOpen} 
        onClose={() => setIsRangeModalOpen(false)} 
        title="Calendar Range Settings"
      >
        <div className="space-y-8">
            {/* Standard Options */}
            <div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary mb-4 flex items-center gap-2">
                    <CalendarIcon size={12} className="text-primary" /> Standard Views
                </h4>
                <div className="grid grid-cols-2 gap-2">
                    <button 
                        onClick={() => { setRangeType('month'); setIsRangeModalOpen(false); }}
                        className={`p-4 rounded-2xl border transition-all text-left flex items-center gap-3 ${rangeType === 'month' ? 'bg-primary/10 border-primary text-white' : 'bg-white/5 border-white/5 text-secondary hover:bg-white/10'}`}
                    >
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center"><CalendarIcon size={14} /></div>
                        <div>
                            <div className="text-xs font-black uppercase">Month View</div>
                            <div className="text-[10px] opacity-60">Full calendar grid</div>
                        </div>
                    </button>
                    <button 
                        onClick={() => { setRangeType('relative'); setRangeValue(30); setIsRangeModalOpen(false); }}
                        className={`p-4 rounded-2xl border transition-all text-left flex items-center gap-3 ${rangeType === 'relative' && rangeValue === 30 ? 'bg-primary/10 border-primary text-white' : 'bg-white/5 border-white/5 text-secondary hover:bg-white/10'}`}
                    >
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center"><Clock size={14} /></div>
                        <div>
                            <div className="text-xs font-black uppercase">Next 30 Days</div>
                            <div className="text-[10px] opacity-60">Continuous flow</div>
                        </div>
                    </button>
                </div>
            </div>

            {/* Pay Cycle Options */}
            <div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary mb-4 flex items-center gap-2">
                    <CreditCard size={12} className="text-primary" /> Financial Cycles
                </h4>
                <div className="space-y-4">
                    {payScheduleDefinitions.length > 1 && (
                        <select 
                            value={selectedScheduleId}
                            onChange={(e) => setSelectedScheduleId(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-xs font-bold text-white outline-none focus:border-primary transition-all"
                        >
                            <option value="">Combined Payday Timeline</option>
                            {payScheduleDefinitions.map((s: any) => (
                                <option key={s.id} value={s.id}>{s.name} cycle</option>
                            ))}
                        </select>
                    )}
                    <div className="grid grid-cols-3 gap-2">
                        {['previous', 'current', 'next'].map((type: any) => (
                            <button 
                                key={type}
                                onClick={() => { setRangeType('pay_period'); setPayPeriodType(type); setIsRangeModalOpen(false); }}
                                className={`p-4 rounded-2xl border transition-all text-center flex flex-col items-center gap-2 ${rangeType === 'pay_period' && payPeriodType === type ? 'bg-primary/10 border-primary text-white' : 'bg-white/5 border-white/5 text-secondary hover:bg-white/10'}`}
                            >
                                <div className="text-[10px] font-black uppercase tracking-widest">{type}</div>
                                <div className="text-[8px] opacity-40">Period</div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Relative Ranges */}
            <div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary mb-4 flex items-center gap-2">
                    <ArrowRight size={12} className="text-emerald-500" /> Rolling Windows
                </h4>
                <div className="grid grid-cols-4 gap-2">
                    {[7, 14, 30, 90].map(v => (
                        <button 
                            key={v}
                            onClick={() => { setRangeType('relative'); setRangeValue(v); setIsRangeModalOpen(false); }}
                            className={`p-4 rounded-xl border transition-all text-center ${rangeType === 'relative' && rangeValue === v ? 'bg-emerald-500/10 border-emerald-500/50 text-white' : 'bg-white/5 border-white/5 text-secondary hover:bg-white/10'}`}
                        >
                            <div className="text-xs font-black uppercase">{v} Days</div>
                            <div className="text-[10px] opacity-60"></div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Custom Range */}
            <div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary mb-4 flex items-center gap-2">
                    <Settings2 size={12} className="text-secondary" /> Custom Range
                </h4>
                <div className="flex gap-2">
                    <input 
                        type="date" 
                        value={customRange.start}
                        onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })}
                        className="flex-1 bg-white/5 border border-white/10 p-3 rounded-xl text-xs font-bold text-white"
                    />
                    <input 
                        type="date" 
                        value={customRange.end}
                        onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })}
                        className="flex-1 bg-white/5 border border-white/10 p-3 rounded-xl text-xs font-bold text-white"
                    />
                    <button 
                        onClick={() => { setRangeType('custom'); setIsRangeModalOpen(false); }}
                        className="px-4 bg-primary text-white rounded-xl font-black uppercase tracking-widest text-[10px]"
                    >
                        Set
                    </button>
                </div>
            </div>
        </div>
      </Modal>

      {hoverItem && displayMode === 'calendar' && (
        <div 
          className="fixed z-[9999] pointer-events-none p-4 rounded-2xl bg-black/60 backdrop-blur-2xl border border-white/10 shadow-2xl transition-all animate-in fade-in zoom-in duration-200"
          style={{ 
            left: `${hoverPos.x + 10}px`, 
            top: `${hoverPos.y + 10}px`,
            maxWidth: '240px'
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-2 h-2 rounded-full ${hoverItem.type === 'pay_schedule' ? 'bg-blue-500' : 'bg-amber-500'}`} />
            <h4 className="text-[10px] font-black uppercase tracking-widest text-white/50">{hoverItem.description}</h4>
          </div>
          <p className="text-[11px] font-bold text-white leading-relaxed italic border-l-2 border-primary/40 pl-3">
            "{hoverItem.notes || hoverItem.note}"
          </p>
        </div>
      )}
    </div>
  );
};

export default Calendar
