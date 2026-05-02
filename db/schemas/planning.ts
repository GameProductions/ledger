import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { households } from './financials';

export const paySchedules = sqliteTable('paySchedules', {
  id: text('id').primaryKey(),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  frequency: text('frequency').notNull(), // weekly, biweekly, monthly
  baseAmountCents: integer('baseAmountCents').notNull(),
  nextPayDate: text('nextPayDate').notNull(),
  status: text('status').default('active'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  householdIdx: index('idx_pay_schedules_household').on(table.householdId),
}));

export const payExceptions = sqliteTable('payExceptions', {
  id: text('id').primaryKey(),
  payScheduleId: text('payScheduleId').notNull().references(() => paySchedules.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  amountOverrideCents: integer('amountOverrideCents').notNull(),
  note: text('note'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  scheduleIdx: index('idx_pay_exceptions_schedule').on(table.payScheduleId),
}));

export const trackedExpenses = sqliteTable('trackedExpenses', {
  id: text('id').primaryKey(),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  amountCents: integer('amountCents').notNull(),
  status: text('status').default('pending'), // pending, committed, ignored
  notes: text('notes'),
  attentionRequired: integer('attentionRequired', { mode: 'boolean' }).default(false),
  needsBalanceTransfer: integer('needsBalanceTransfer', { mode: 'boolean' }).default(false),
  transferTiming: text('transferTiming'),
  isBorrowed: integer('isBorrowed', { mode: 'boolean' }).default(false),
  borrowSource: text('borrowSource'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  householdIdx: index('idx_tracked_expenses_household').on(table.householdId),
}));
