import { addDays, addMonths, addYears, format, parseISO, startOfDay, setDate } from 'date-fns';
import { formatInTimeZone, toDate, utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

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
}

export class SchedulingService {
  /**
   * Calculates the next UTC occurrence timestamp for a given schedule.
   * This is "Wall Clock" aware, meaning it respects the user's localized time
   * even across Daylight Saving Time shifts.
   */
  static calculateNextOccurrence(schedule: Schedule, fromDate: Date = new Date()): Date {
    const tz = schedule.timezone || 'UTC';
    
    // 1. Determine the "Base Date" for calculation.
    // If it has never run, start from the start_date.
    // If it has run, start from the last_run_at (which is UTC).
    const baseDateUtc = schedule.last_run_at ? parseISO(schedule.last_run_at) : parseISO(schedule.start_date);
    
    // 2. Convert the Base Date to the local "Wall Clock" time
    let localDate = utcToZonedTime(baseDateUtc, tz);

    // 3. Perform the arithmetic based on frequency
    let nextLocalDate = localDate;
    const interval = schedule.frequency_interval || 1;

    switch (schedule.frequency_type) {
      case 'daily':
        nextLocalDate = addDays(localDate, interval);
        break;
      case 'weekly':
        nextLocalDate = addDays(localDate, 7 * interval);
        break;
      case 'biweekly':
        nextLocalDate = addDays(localDate, 14 * interval);
        break;
      case 'monthly':
        nextLocalDate = addMonths(localDate, interval);
        if (schedule.day_of_month) {
          // Force to specific day if requested (e.g. always 15th)
          nextLocalDate = setDate(nextLocalDate, Math.min(schedule.day_of_month, 28)); // Simple guard
        }
        break;
      case 'yearly':
        nextLocalDate = addYears(localDate, interval);
        break;
    }

    // 4. If the calculated date is STILL in the past relative to fromDate, 
    // keep incrementing (used for catch-up scenarios)
    while (zonedTimeToUtc(nextLocalDate, tz) <= fromDate) {
        switch (schedule.frequency_type) {
            case 'daily': nextLocalDate = addDays(nextLocalDate, interval); break;
            case 'weekly': nextLocalDate = addDays(nextLocalDate, 7 * interval); break;
            case 'biweekly': nextLocalDate = addDays(nextLocalDate, 14 * interval); break;
            case 'monthly': nextLocalDate = addMonths(nextLocalDate, interval); break;
            case 'yearly': nextLocalDate = addYears(nextLocalDate, interval); break;
        }
    }

    // 5. Convert back to UTC for storage
    return zonedTimeToUtc(nextLocalDate, tz);
  }

  /**
   * Checks if a schedule should be executed now.
   */
  static shouldExecute(schedule: Schedule, now: Date = new Date()): boolean {
    const nextRun = parseISO(schedule.next_run_at);
    return nextRun <= now && schedule.status === 'active';
  }
}
