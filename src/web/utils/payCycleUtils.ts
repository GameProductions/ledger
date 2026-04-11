import { addWeeks, addDays, getDaysInMonth, setDate, isAfter, isBefore, startOfMonth, endOfMonth, parseISO, format } from 'date-fns';

export interface PaydayInstance {
  date: string;
  name: string;
  amount_cents: number;
  notes?: string;
  type: 'pay_schedule';
}

export const projectPaydays = (
  schedules: any[],
  viewStart: Date,
  viewEnd: Date
): PaydayInstance[] => {
  const instances: PaydayInstance[] = [];

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
        instances.push({
          date: format(current, 'yyyy-MM-dd'),
          name: schedule.name,
          amount_cents: amount,
          notes: notes,
          type: 'pay_schedule'
        });
      }

      if (frequency === 'weekly') current = addDays(current, 7);
      else if (frequency === 'biweekly') current = addDays(current, 14);
      else if (frequency === 'monthly') {
          const day = current.getDate();
          current = addMonths(current, 1);
          current = setDate(current, Math.min(day, getDaysInMonth(current)));
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

export const groupLiabilitiesByCycle = (liabilities: any[], paydays: PaydayInstance[]) => {
    const sortedPaydays = [...paydays].sort((a, b) => a.date.localeCompare(b.date));
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
