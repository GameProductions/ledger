import { addDays, getDaysInMonth, setDate, isAfter, isBefore, parseISO, format } from 'date-fns';

export interface PaydayInstance {
  id?: string;
  payScheduleId: string;
  date: string;
  originalDate: string;
  name: string;
  amountCents: number;
  notes?: string;
  type: 'pay_schedule';
  isOverride?: boolean;
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
    if (!schedule.nextPayDate) return;
    
    let current = parseISO(schedule.nextPayDate);
    const amount = schedule.estimatedAmountCents || 0;
    const notes = schedule.notes || '';
    const frequency = schedule.frequency;

    // Parse end date and skipped dates from notes if present
    let endDateStr: string | null = null;
    const endDateMatch = notes.match(/__END_DATE__:([\d-]+)/);
    if (endDateMatch) {
      endDateStr = endDateMatch[1];
    }

    const isPaydayDateSkipped = (dateStr: string): boolean => {
      const match = notes.match(/__SKIPPED__:([\d,-]+)/);
      if (!match) return false;
      return match[1].split(',').includes(dateStr);
    };

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
            else if (frequency === 'quarterly') {
                const day = current.getDate();
                current = addMonths(current, -3);
                current = setDate(current, Math.min(day, getDaysInMonth(current)));
            }
            else if (frequency === 'biannual') {
                const day = current.getDate();
                current = addMonths(current, -6);
                current = setDate(current, Math.min(day, getDaysInMonth(current)));
            }
            else if (frequency === 'annually') {
                const day = current.getDate();
                current = addMonths(current, -12);
                current = setDate(current, Math.min(day, getDaysInMonth(current)));
            }
            else if (frequency === 'biennial') {
                const day = current.getDate();
                current = addMonths(current, -24);
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
        
        if (endDateStr && dateStr > endDateStr) {
          break;
        }

        const exception = safeExceptions.find(ex => ex.payScheduleId === schedule.id && ex.originalDate === dateStr);
        const isDeleted = exception?.overrideAmountCents === -1 || isPaydayDateSkipped(dateStr);

        if (!isDeleted) {
          instances.push({
            id: exception?.id,
            payScheduleId: schedule.id,
            date: exception?.overrideDate || dateStr,
            originalDate: dateStr,
            name: schedule.name,
            amountCents: exception?.overrideAmountCents ?? amount,
            notes: exception?.note || notes,
            type: 'pay_schedule',
            isOverride: !!exception
          });
        }
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
      else if (frequency === 'biannual') {
          const day = current.getDate();
          current = addMonths(current, 6);
          current = setDate(current, Math.min(day, getDaysInMonth(current)));
      }
      else if (frequency === 'annually') {
          const day = current.getDate();
          current = addMonths(current, 12);
          current = setDate(current, Math.min(day, getDaysInMonth(current)));
      }
      else if (frequency === 'biennial') {
          const day = current.getDate();
          current = addMonths(current, 24);
          current = setDate(current, Math.min(day, getDaysInMonth(current)));
      }
      else if (frequency === 'manual') {
          break; // Don't repeat
      }
      else if (frequency === 'semi-monthly') {
          // Handle semi-monthly logic
          const d1 = schedule.semiMonthlyDay1 || 1;
          const d2 = schedule.semiMonthlyDay2 || 15;
          
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

export interface RecurringProjection {
  id: string;
  originalId: string;
  date: string;
  originalDate: string;
  description: string;
  amountCents: number;
  type: 'subscription' | 'bill' | 'installment';
  originalData: any;
  notes?: string;
}

export const projectRecurringItems = (
  subscriptions: any[],
  bills: any[],
  installments: any[],
  viewStart: Date,
  viewEnd: Date,
): RecurringProjection[] => {
  const instances: RecurringProjection[] = [];

  const projectDates = (startDateStr: string, frequency: string, maxCount: number = Infinity, endDateStr?: string | null): string[] => {
    const dates: string[] = [];
    let current = parseISO(startDateStr);
    let iterations = 0;
    const maxIterations = 200;

    while (isAfter(current, viewStart) && iterations < maxIterations) {
      if (frequency === 'weekly') current = addDays(current, -7);
      else if (frequency === 'biweekly') current = addDays(current, -14);
      else if (frequency === 'monthly') {
        const day = current.getDate();
        current = addMonths(current, -1);
        current = setDate(current, Math.min(day, getDaysInMonth(current)));
      }
      else if (frequency === 'quarterly') {
        const day = current.getDate();
        current = addMonths(current, -3);
        current = setDate(current, Math.min(day, getDaysInMonth(current)));
      }
      else if (frequency === 'biannual') {
        const day = current.getDate();
        current = addMonths(current, -6);
        current = setDate(current, Math.min(day, getDaysInMonth(current)));
      }
      else if (frequency === 'annually' || frequency === 'yearly') {
        const day = current.getDate();
        current = addMonths(current, -12);
        current = setDate(current, Math.min(day, getDaysInMonth(current)));
      }
      else if (frequency === 'biennial') {
        const day = current.getDate();
        current = addMonths(current, -24);
        current = setDate(current, Math.min(day, getDaysInMonth(current)));
      }
      else break;
      iterations++;
    }

    iterations = 0;
    while (isBefore(current, viewEnd) && iterations < maxIterations && dates.length < maxCount) {
      const curDateStr = format(current, 'yyyy-MM-dd');
      if (endDateStr && curDateStr > endDateStr) {
        break;
      }
      if (!isBefore(current, viewStart)) {
        dates.push(curDateStr);
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
      else if (frequency === 'biannual') {
        const day = current.getDate();
        current = addMonths(current, 6);
        current = setDate(current, Math.min(day, getDaysInMonth(current)));
      }
      else if (frequency === 'annually' || frequency === 'yearly') {
        const day = current.getDate();
        current = addMonths(current, 12);
        current = setDate(current, Math.min(day, getDaysInMonth(current)));
      }
      else if (frequency === 'biennial') {
        const day = current.getDate();
        current = addMonths(current, 24);
        current = setDate(current, Math.min(day, getDaysInMonth(current)));
      }
      else break;
      iterations++;
    }

    return dates;
  };

  const isDateSkipped = (notes: string | null | undefined, dateStr: string): boolean => {
    if (!notes) return false;
    const match = notes.match(/__SKIPPED__:([\d,-]+)/);
    if (!match) return false;
    const skipped = match[1].split(',');
    return skipped.includes(dateStr);
  };

  subscriptions.forEach(sub => {
    if (!sub.nextBillingDate || !sub.billingCycle || sub.billingCycle === 'manual' || sub.billingCycle === 'one-time') return;
    const maxCount = sub.maxOccurrences || Infinity;
    const dates = projectDates(sub.nextBillingDate, sub.billingCycle, maxCount, sub.endDate);
    dates.forEach(date => {
      if (isDateSkipped(sub.notes, date)) return;
      instances.push({
        id: `sub-proj-${sub.id}-${date}`,
        originalId: sub.id,
        date,
        originalDate: sub.nextBillingDate,
        description: sub.name || sub.description || '',
        amountCents: sub.amountCents || 0,
        type: 'subscription',
        originalData: sub,
        notes: sub.notes,
      });
    });
  });

  bills.forEach(bill => {
    if (!bill.dueDate || !bill.frequency || bill.frequency === 'manual' || bill.frequency === 'one-time') return;
    const maxCount = bill.maxOccurrences || Infinity;
    const dates = projectDates(bill.dueDate, bill.frequency, maxCount, bill.endDate);
    dates.forEach(date => {
      if (isDateSkipped(bill.notes, date)) return;
      instances.push({
        id: `bill-proj-${bill.id}-${date}`,
        originalId: bill.id,
        date,
        originalDate: bill.dueDate,
        description: bill.name || bill.description || '',
        amountCents: bill.amountCents || 0,
        type: 'bill',
        originalData: bill,
        notes: bill.notes,
      });
    });
  });

  installments.forEach(inst => {
    if (!inst.nextPaymentDate || !inst.frequency || inst.frequency === 'manual' || inst.frequency === 'one-time') return;
    const amount = inst.installmentAmountCents || inst.amountCents || 0;
    const maxCount = inst.remainingInstallments || 100;
    const dates = projectDates(inst.nextPaymentDate, inst.frequency, maxCount);
    dates.forEach(date => {
      instances.push({
        id: `inst-proj-${inst.id}-${date}`,
        originalId: inst.id,
        date,
        originalDate: inst.nextPaymentDate,
        description: inst.name || inst.description || '',
        amountCents: amount,
        type: 'installment',
        originalData: inst,
        notes: inst.notes,
      });
    });
  });

  return instances;
};

export const groupLiabilitiesByCycle = (liabilities: any[] = [], paydays: PaydayInstance[] = []) => {
    const safeLiabilities = Array.isArray(liabilities) ? liabilities : [];
    const safePaydays = Array.isArray(paydays) ? paydays : [];
    const sortedPaydays = [...safePaydays].sort((a, b) => a.date.localeCompare(b.date));
    const cycles: { payday: PaydayInstance, items: any[], totalCents: number }[] = [];

    sortedPaydays.forEach((payday, idx) => {
        const nextPayday = sortedPaydays[idx + 1];
        const items = safeLiabilities.filter(item => {
            const date = item.dueDate || item.nextBillingDate || item.nextPaymentDate || item.transactionDate;
            if (!date) return false;
            
            const isAtOrAfterPayday = date >= payday.date;
            const isBeforeNextPayday = nextPayday ? date < nextPayday.date : true;
            return isAtOrAfterPayday && isBeforeNextPayday;
        });

        cycles.push({
            payday,
            items,
            totalCents: items.reduce((acc, curr) => acc + (curr.amountCents || curr.installmentAmountCents || 0), 0)
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
    .filter(p => !scheduleId || p.payScheduleId === scheduleId)
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
