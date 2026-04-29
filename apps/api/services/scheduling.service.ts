import { addDays, addMonths, addYears, format, parseISO, startOfDay, setDate } from 'date-fns';
import { formatInTimeZone, toDate, toZonedTime, fromZonedTime } from 'date-fns-tz';

export type FrequencyType = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export interface Schedule {
  id: string;
  startDate: string;
  endDate?: string;
  totalInstallments?: number;
  frequencyType: FrequencyType;
  frequencyInterval: number;
  dayOfMonth?: number;
  daysOfWeek?: string; // Comma-separated '0-6'
  timezone: string;
  lastRunAt?: string;
  nextRunAt: string;
  executedCount?: number; 
}

export class SchedulingService {
  /**
   * Calculates the next UTC occurrence timestamp for a given schedule.
   * Returns null if the schedule has reached its terminal state (endDate or totalInstallments).
   */
  static calculateNextOccurrence(schedule: Schedule, fromDate: Date = new Date(), currentExecutionCount: number = 0): Date | null {
    const tz = schedule.timezone || 'UTC';
    
    // 1. Terminal Check: Installments
    if (schedule.totalInstallments && currentExecutionCount >= schedule.totalInstallments) {
      return null;
    }

    // 2. Determine the "Base Date" for calculation.
    const baseDateUtc = schedule.lastRunAt ? parseISO(schedule.lastRunAt) : parseISO(schedule.startDate);
    let localDate = toZonedTime(baseDateUtc, tz);

    // 3. Perform the arithmetic based on frequency
    const interval = schedule.frequencyInterval || 1;
    let nextLocalDate = localDate;

    const increment = (date: Date): Date => {
      switch (schedule.frequencyType) {
        case 'daily':
          return addDays(date, interval);
        case 'weekly':
          return addDays(date, 7 * interval);
        case 'biweekly':
          return addDays(date, 14 * interval);
        case 'monthly':
          let nextMonth = addMonths(date, interval);
          if (schedule.dayOfMonth) {
            nextMonth = setDate(nextMonth, Math.min(schedule.dayOfMonth, 28));
          }
          return nextMonth;
        case 'yearly':
          return addYears(date, interval);
        default:
          return addDays(date, interval);
      }
    };

    nextLocalDate = increment(nextLocalDate);

    // 4. Catch-up logic (if fromDate is specified and next occurrence is in the past)
    let iterations = 0;
    const MAX_LOOKAHEAD_ITERATIONS = 500;
    
    while (fromZonedTime(nextLocalDate, tz) <= fromDate) {
      nextLocalDate = increment(nextLocalDate);
      iterations++;
      
      // FORENSIC STABILITY: Prevent infinite loops on misconfigured short intervals
      if (iterations >= MAX_LOOKAHEAD_ITERATIONS) {
        console.error('[SchedulingService] Max lookahead iterations exceeded for schedule:', schedule.id);
        return null;
      }
    }

    const nextUtc = fromZonedTime(nextLocalDate, tz);


    // 5. Terminal Check: End Date
    if (schedule.endDate && nextUtc > parseISO(schedule.endDate)) {
      return null;
    }

    return nextUtc;
  }

  /**
   * Checks if a schedule should be executed now.
   */
  static shouldExecute(schedule: Schedule & { status: string }, now: Date = new Date()): boolean {
    const nextRun = parseISO(schedule.nextRunAt);
    return nextRun <= now && schedule.status === 'active';
  }
}
