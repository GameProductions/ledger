import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { households } from './financials';

import { users } from './auth';

export const paySchedules = sqliteTable('paySchedules', {
  id: text('id').primaryKey(),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  userId: text('userId').references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  frequency: text('frequency').notNull(),
  nextPayDate: text('nextPayDate'),
  estimatedAmountCents: integer('estimatedAmountCents'),
}, (table) => ({
  householdIdx: index('idx_pay_schedules_household').on(table.householdId),
}));

export const payExceptions = sqliteTable('payExceptions', {
  id: text('id').primaryKey(),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  originalDate: text('originalDate').notNull(),
  overrideDate: text('overrideDate'),
  overrideAmountCents: integer('overrideAmountCents'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  householdIdx: index('idx_pay_exceptions_household').on(table.householdId),
  userIdx: index('idx_pay_exceptions_user').on(table.userId),
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
