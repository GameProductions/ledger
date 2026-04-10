import React from 'react'
import { Price } from './Price'

interface CalendarProps {
  transactions: any[];
  subscriptions?: any[];
  paySchedules?: any[];
  onDayClick: (date: Date) => void;
  onItemClick: (item: any) => void;
}

const Calendar: React.FC<CalendarProps> = ({ transactions, subscriptions = [], paySchedules = [], onDayClick, onItemClick }) => {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  
  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const paddingDays = Array.from({ length: firstDayOfMonth }, (_, i) => i);
  
  const getItemsForDay = (day: number) => {
    const dayTxs = (Array.isArray(transactions) ? transactions : []).filter(tx => {
      const d = new Date(tx.transaction_date);
      return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
    }).map(tx => ({ ...tx, type: 'transaction' }));

    const dayBills = (Array.isArray(subscriptions) ? subscriptions : []).filter(sub => {
      const d = new Date(sub.next_billing_date);
      return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
    }).map(sub => ({ ...sub, type: 'subscription', description: sub.name }));

    const dayPays = (Array.isArray(paySchedules) ? paySchedules : []).filter(pay => {
      const d = pay.next_pay_date ? new Date(pay.next_pay_date) : null;
      return d && d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
    }).map(pay => ({ ...pay, type: 'pay_schedule', description: `${pay.name}`, amount_cents: pay.estimated_amount_cents || 0 }));

    return [...dayPays, ...dayBills, ...dayTxs];
  };

  return (
    <div className="calendar-container bg-black/40 rounded-[2.5rem] border border-white/5 p-6 animate-in fade-in zoom-in duration-500">
      <div className="calendar-header flex items-center justify-between mb-8 px-4">
        <div className="flex items-center gap-6">
          <div 
            className="relative"
            onClick={(e) => {
              try { e.currentTarget.querySelector('input')?.showPicker(); } catch(err) {}
            }}
          >
            <h2 className="text-3xl font-black italic tracking-tighter uppercase whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity">
              {monthName} <span className="text-primary">{year}</span>
            </h2>
            <input 
              type="month" 
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full pointer-events-none" 
              value={`${year}-${String(month + 1).padStart(2, '0')}`}
              onChange={(e) => {
                if (e.target.value) {
                  const [y, m] = e.target.value.split('-');
                  setCurrentDate(new Date(parseInt(y), parseInt(m) - 1, 1));
                }
              }}
            />
          </div>
          <div className="flex gap-2 items-center">
            <button onClick={() => setCurrentDate(new Date())} className="px-3 h-8 flex items-center justify-center rounded-lg bg-primary/10 text-primary font-bold hover:bg-primary/20 transition-all text-xs tracking-widest uppercase">Today</button>
            <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-xs">◀</button>
            <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-xs">▶</button>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-500/50">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span> Paydays
          </div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-500/50">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span> Bills
          </div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-500/50">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Charges
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-3">
        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
          <div key={d} className="text-center text-xs font-black text-slate-600 tracking-[0.3em] py-2">{d}</div>
        ))}
        
        {paddingDays.map(p => (
          <div key={`pad-${p}`} className="aspect-square opacity-0"></div>
        ))}

        {days.map(day => {
          const dayItems = getItemsForDay(day);
          const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
          
          return (
            <div 
              key={day} 
              onClick={() => onDayClick(new Date(year, month, day))}
              className={`min-h-[120px] p-3 rounded-3xl border transition-all cursor-pointer group hover:scale-[1.02] active:scale-[0.98] ${
                dayItems.length > 0 
                  ? 'bg-white/[0.03] border-white/10' 
                  : 'bg-transparent border-white/5 hover:border-white/20'
              } ${isToday ? 'border-primary/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : ''}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`text-sm font-black ${isToday ? 'text-primary' : 'text-slate-500 group-hover:text-white'}`}>{day}</span>
                {dayItems.length > 0 ? (
                   <div className="flex gap-1">
                     {dayItems.some(i => i.type === 'pay_schedule') && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>}
                     {dayItems.some(i => i.type === 'subscription') && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>}
                     {dayItems.some(i => i.type === 'transaction') && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>}
                   </div>
                ) : (
                   <div 
                     className="opacity-0 group-hover:opacity-100 transition-opacity"
                     onClick={(e) => { e.stopPropagation(); onDayClick(new Date(year, month, day)); }}
                   >
                     <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 hover:text-white block px-2 py-1 rounded border border-white/5 bg-white/5">+ ADD</span>
                   </div>
                )}
              </div>

              <div className="space-y-1.5">
                {dayItems.slice(0, 3).map((item: any) => (
                  <div 
                    key={`${item.type}-${item.id}`} 
                    onClick={(e) => { e.stopPropagation(); onItemClick(item); }}
                    className={`text-xs p-2 rounded-xl truncate font-bold border transition-all hover:brightness-125 ${
                      item.type === 'pay_schedule'
                        ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                        : item.type === 'subscription' 
                          ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                          : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                    }`}
                  >
                    <Price amountCents={item.amount_cents} options={{ minimumFractionDigits: 0 }} /> {item.description}
                  </div>
                ))}
                {dayItems.length > 3 && (
                  <div className="text-[10px] text-center font-black text-slate-600 uppercase tracking-widest">
                    + {dayItems.length - 3} MORE
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Calendar
