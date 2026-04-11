import React from 'react';
import { Price } from './Price';
import { groupLiabilitiesByCycle } from '../utils/payCycleUtils';
import { Wallet, ArrowRight, Calendar as CalendarIcon, AlertCircle } from 'lucide-react';
import { format, parseISO, isAfter } from 'date-fns';

interface PayCycleTimelineProps {
  paydays: any[];
  liabilities: any[]; // Combined bills & subscriptions
}

export const PayCycleTimeline: React.FC<PayCycleTimelineProps> = ({ paydays, liabilities }) => {
  const cycles = groupLiabilitiesByCycle(liabilities, paydays);
  const now = new Date();

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white/40 flex items-center gap-2">
          <Wallet size={14} className="text-primary" /> Smart Pay Cycle Timeline
        </h3>
        <span className="text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">
          Beta Analysis
        </span>
      </div>

      <div className="relative space-y-8 pl-4 border-l border-dashed border-white/10 ml-2">
        {cycles.map((cycle, idx) => {
          const isCurrent = isAfter(parseISO(cycle.payday.date), now) || idx === 0;
          const remainderCents = (cycle.payday.amount_cents || 0) - cycle.total_cents;
          
          return (
            <div key={cycle.payday.date + cycle.payday.name} className="relative">
              {/* Payday Node */}
              <div className="absolute -left-[21px] top-0 w-10 h-10 rounded-full bg-black border border-white/10 flex items-center justify-center shadow-2xl z-10">
                <div className={`w-3 h-3 rounded-full ${isCurrent ? 'bg-primary animate-pulse' : 'bg-blue-500'}`} />
              </div>

              <div className="ml-8 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-xl">
                  <div>
                    <div className="text-xs font-black uppercase tracking-widest text-blue-500 mb-1">
                      {format(parseISO(cycle.payday.date), 'EEEE, MMM do')}
                    </div>
                    <h4 className="text-lg font-black italic tracking-tighter uppercase">{cycle.payday.name}</h4>
                  </div>
                  <div className="text-right">
                    <Price amountCents={cycle.payday.amount_cents} className="text-2xl font-black tracking-tighter text-white" />
                    <div className="text-[10px] font-black uppercase tracking-widest text-white/30">Estimated Deposit</div>
                  </div>
                </div>

                {/* Bills List for this cycle */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {cycle.items.length > 0 ? cycle.items.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 group hover:bg-white/[0.05] transition-all">
                      <div className="flex items-center gap-3">
                        <div className={`w-1.5 h-1.5 rounded-full ${item.next_payment_date ? 'bg-indigo-500' : item.due_date ? 'bg-amber-500' : 'bg-primary'}`} />
                        <div>
                          <div className="text-[11px] font-bold text-white group-hover:text-primary transition-colors">{item.name || item.description}</div>
                          <div className="text-[9px] font-black uppercase tracking-widest text-white/30 truncate max-w-[120px]">
                            {item.due_date || item.next_billing_date || item.next_payment_date}
                          </div>
                        </div>
                      </div>
                      <Price amountCents={item.amount_cents || item.installment_amount_cents} className="text-xs font-black tracking-widest" />
                    </div>
                  )) : (
                    <div className="col-span-full py-4 text-center border border-dashed border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/20">
                      No liabilities detected in this cycle
                    </div>
                  )}
                </div>

                {/* Summary Footer */}
                <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <ArrowRight size={14} className="text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-[0.1em] text-white/60">Disposable Balance</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <Price 
                        amountCents={remainderCents} 
                        className={`text-lg font-black tracking-tighter ${remainderCents < 0 ? 'text-red-500' : 'text-primary'}`} 
                    />
                    <div className="text-[9px] font-black uppercase tracking-widest opacity-40 italic">After Liabilities</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
