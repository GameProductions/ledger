import { addDays, addMonths, addYears, format, parseISO, startOfDay, setDate } from 'date-fns';
import { formatInTimeZone, toDate, toZonedTime, fromZonedTime } from 'date-fns-tz';

export type FrequencyType = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export interface Schedule {
  id: string;
  start_date: string;
  end_date?: string;
  total_installments?: number;
  frequency_type: FrequencyType;
  frequency_interval: number;
  day_of_month?: number;
  days_of_week?: string; // Comma-separated '0-6'
  timezone: string;
  last_run_at?: string;
  next_run_at: string;
  executed_count?: number; 
}

export class SchedulingService {
  /**
   * Calculates the next UTC occurrence timestamp for a given schedule.
   * Returns null if the schedule has reached its terminal state (end_date or total_installments).
   */
  static calculateNextOccurrence(schedule: Schedule, fromDate: Date = new Date(), currentExecutionCount: number = 0): Date | null {
    const tz = schedule.timezone || 'UTC';
    
    // 1. Terminal Check: Installments
    if (schedule.total_installments && currentExecutionCount >= schedule.total_installments) {
      return null;
    }

    // 2. Determine the "Base Date" for calculation.
    const baseDateUtc = schedule.last_run_at ? parseISO(schedule.last_run_at) : parseISO(schedule.start_date);
    let localDate = toZonedTime(baseDateUtc, tz);

    // 3. Perform the arithmetic based on frequency
    const interval = schedule.frequency_interval || 1;
    let nextLocalDate = localDate;

    const increment = (date: Date): Date => {
      switch (schedule.frequency_type) {
        case 'daily':
          return addDays(date, interval);
        case 'weekly':
          return addDays(date, 7 * interval);
        case 'biweekly':
          return addDays(date, 14 * interval);
        case 'monthly':
          let nextMonth = addMonths(date, interval);
          if (schedule.day_of_month) {
            nextMonth = setDate(nextMonth, Math.min(schedule.day_of_month, 28));
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
    while (fromZonedTime(nextLocalDate, tz) <= fromDate) {
      nextLocalDate = increment(nextLocalDate);
    }

    const nextUtc = fromZonedTime(nextLocalDate, tz);

    // 5. Terminal Check: End Date
    if (schedule.end_date && nextUtc > parseISO(schedule.end_date)) {
      return null;
    }

    return nextUtc;
  }

  /**
   * Checks if a schedule should be executed now.
   */
  static shouldExecute(schedule: Schedule & { status: string }, now: Date = new Date()): boolean {
    const nextRun = parseISO(schedule.next_run_at);
    return nextRun <= now && schedule.status === 'active';
  }
}
