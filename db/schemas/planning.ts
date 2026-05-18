import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { households } from './financials';

import { users } from './auth';

export const paySchedules = sqliteTable('pay_schedules', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  frequency: text('frequency').notNull(),
  nextPayDate: text('next_pay_date'),
  estimatedAmountCents: integer('estimated_amount_cents'),
  notes: text('notes'),
  semiMonthlyDay1: integer('semi_monthly_day_1'),
  semiMonthlyDay2: integer('semi_monthly_day_2'),
  upcomingAmountCents: integer('upcoming_amount_cents'),
  upcomingEffectiveDate: text('upcoming_effective_date'),
}, (table) => ({
  householdIdx: index('idx_pay_schedules_household').on(table.householdId),
}));

export const payExceptions = sqliteTable('pay_exceptions', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  payScheduleId: text('pay_schedule_id').notNull().references(() => paySchedules.id, { onDelete: 'cascade' }),
  originalDate: text('original_date').notNull(),
  overrideDate: text('override_date'),
  overrideAmountCents: integer('override_amount_cents'),
  note: text('note'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  householdIdx: index('idx_pay_exceptions_household').on(table.householdId),
  userIdx: index('idx_pay_exceptions_user').on(table.userId),
}));

export const trackedExpenses = sqliteTable('tracked_expenses', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  amountCents: integer('amount_cents').notNull(),
  status: text('status').default('pending'), // pending, committed, ignored
  notes: text('notes'),
  attentionRequired: integer('attention_required', { mode: 'boolean' }).default(false),
  needsBalanceTransfer: integer('needs_balance_transfer', { mode: 'boolean' }).default(false),
  transferTiming: text('transfer_timing'),
  isBorrowed: integer('is_borrowed', { mode: 'boolean' }).default(false),
  borrowSource: text('borrow_source'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  householdIdx: index('idx_tracked_expenses_household').on(table.householdId),
}));
