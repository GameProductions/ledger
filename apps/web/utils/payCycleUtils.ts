import { addWeeks, addDays, getDaysInMonth, setDate, isAfter, isBefore, startOfMonth, endOfMonth, parseISO, format } from 'date-fns';

export interface PaydayInstance {
  id?: string;
  pay_schedule_id: string;
  date: string;
  original_date: string;
  name: string;
  amount_cents: number;
  notes?: string;
  type: 'pay_schedule';
  is_override?: boolean;
}

export const projectPaydays = (
  schedules: any[] = [],
  viewStart: Date,
  viewEnd: Date,
  exceptions: any[] = []
): PaydayInstance[] => {
  const instances: PaydayInstance[] = [];
  if (!Array.isArray(schedules)) return [];
  const safeExceptions = Array.isArray(exceptions) ? exceptions : [];

  schedules.forEach(schedule => {
    if (!schedule.next_pay_date) return;
    
    let current = parseISO(schedule.next_pay_date);
    const amount = schedule.estimated_amount_cents || 0;
    const notes = schedule.notes || '';
    const frequency = schedule.frequency;

    // Backtrack to find occurrences that might fall in the current view
    // (Simple logic: backtrack 3 months to be safe)
    if (isAfter(current, viewStart)) {
        while (isAfter(current, viewStart)) {
            if (frequency === 'weekly') current = addDays(current, -7);
            else if (frequency === 'biweekly') current = addDays(current, -14);
            else if (frequency === 'monthly') {
                const day = current.getDate();
                current = addMonths(current, -1);
                current = setDate(current, Math.min(day, getDaysInMonth(current)));
            }
            else break; // semi-monthly is harder to backtrack accurately without anchor
        }
    }

    // Forward track to fill the view
    let iteration = 0;
    const maxIterations = 100; // Safety
    
    while (isBefore(current, viewEnd) && iteration < maxIterations) {
      if (!isBefore(current, viewStart)) {
        const dateStr = format(current, 'yyyy-MM-dd');
        const exception = safeExceptions.find(ex => ex.pay_schedule_id === schedule.id && ex.original_date === dateStr);
        
        instances.push({
          id: exception?.id,
          pay_schedule_id: schedule.id,
          date: exception?.override_date || dateStr,
          original_date: dateStr,
          name: schedule.name,
          amount_cents: exception?.override_amount_cents ?? amount,
          notes: exception?.note || notes,
          type: 'pay_schedule',
          is_override: !!exception
        });
      }

      if (frequency === 'weekly') current = addDays(current, 7);
      else if (frequency === 'biweekly') current = addDays(current, 14);
      else if (frequency === 'monthly') {
          const day = current.getDate();
          current = addMonths(current, 1);
          current = setDate(current, Math.min(day, getDaysInMonth(current)));
      }
      else if (frequency === 'quarterly') {
          const day = current.getDate();
          current = addMonths(current, 3);
          current = setDate(current, Math.min(day, getDaysInMonth(current)));
      }
      else if (frequency === 'annually') {
          const day = current.getDate();
          current = addMonths(current, 12);
          current = setDate(current, Math.min(day, getDaysInMonth(current)));
      }
      else if (frequency === 'manual') {
          break; // Don't repeat
      }
      else if (frequency === 'semi-monthly') {
          // Handle semi-monthly logic
          const d1 = schedule.semi_monthly_day_1 || 1;
          const d2 = schedule.semi_monthly_day_2 || 15;
          
          if (current.getDate() === d1) {
              current = setDate(current, d2);
          } else {
              current = addMonths(current, 1);
              current = setDate(current, d1);
          }
      } else {
          break;
      }
      iteration++;
    }
  });

  return instances;
};

// Simple helper to avoid date-fns import error if addMonths is missing
function addMonths(date: Date, amount: number) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + amount);
    return d;
}

export const groupLiabilitiesByCycle = (liabilities: any[] = [], paydays: PaydayInstance[] = []) => {
    const safeLiabilities = Array.isArray(liabilities) ? liabilities : [];
    const safePaydays = Array.isArray(paydays) ? paydays : [];
    const sortedPaydays = [...safePaydays].sort((a, b) => a.date.localeCompare(b.date));
    const cycles: { payday: PaydayInstance, items: any[], total_cents: number }[] = [];

    sortedPaydays.forEach((payday, idx) => {
        const nextPayday = sortedPaydays[idx + 1];
        const items = liabilities.filter(item => {
            const date = item.due_date || item.next_billing_date || item.next_payment_date || item.transaction_date;
            if (!date) return false;
            
            const isAtOrAfterPayday = date >= payday.date;
            const isBeforeNextPayday = nextPayday ? date < nextPayday.date : true;
            return isAtOrAfterPayday && isBeforeNextPayday;
        });

        cycles.push({
            payday,
            items,
            total_cents: items.reduce((acc, curr) => acc + (curr.amount_cents || curr.installment_amount_cents || 0), 0)
        });
    });

    return cycles;
};

export const getPayPeriodRange = (
  paydays: PaydayInstance[] | null | undefined,
  scheduleId: string,
  type: 'previous' | 'current' | 'next',
  anchorDate: Date = new Date()
) => {
  const safePaydays = Array.isArray(paydays) ? paydays : [];
  const schedulePaydays = [...safePaydays]
    .filter(p => !scheduleId || p.pay_schedule_id === scheduleId)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (schedulePaydays.length < 2) return null;

  const anchorStr = format(anchorDate, 'yyyy-MM-dd');
  
  // Find the index of the payday that is <= anchorDate
  let currentIdx = -1;
  for (let i = 0; i < schedulePaydays.length; i++) {
    if (schedulePaydays[i].date <= anchorStr) {
      currentIdx = i;
    } else {
      break;
    }
  }

  if (type === 'current') {
    if (currentIdx === -1 || currentIdx >= schedulePaydays.length - 1) return null;
    return { 
        start: parseISO(schedulePaydays[currentIdx].date), 
        end: addDays(parseISO(schedulePaydays[currentIdx + 1].date), -1) 
    };
  } else if (type === 'next') {
    const nextIdx = currentIdx + 1;
    if (nextIdx >= schedulePaydays.length - 1) return null;
    return { 
        start: parseISO(schedulePaydays[nextIdx].date), 
        end: addDays(parseISO(schedulePaydays[nextIdx + 1].date), -1) 
    };
  } else if (type === 'previous') {
    const prevIdx = currentIdx - 1;
    if (prevIdx < 0) return null;
    return { 
        start: parseISO(schedulePaydays[prevIdx].date), 
        end: addDays(parseISO(schedulePaydays[currentIdx].date), -1) 
    };
  }

  return null;
};
