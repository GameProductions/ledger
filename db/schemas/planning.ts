import { boolean, pgTable, text, integer, index, json, serial, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { households } from './financials';

import { users } from './auth';

export const paySchedules = pgTable('pay_schedules', {
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

export const payExceptions = pgTable('pay_exceptions', {
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

export const trackedExpenses = pgTable('tracked_expenses', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  amountCents: integer('amount_cents').notNull(),
  status: text('status').default('pending'), // pending, committed, ignored
  notes: text('notes'),
  confirmationNumber: text('confirmation_number'), // Legacy single confirmation number
  confirmationNumbers: json('confirmation_numbers').$type<ConfirmationNumber[]>().default([]), // New multi-instance
  attentionRequired: boolean('attention_required').default(false),
  needsBalanceTransfer: boolean('needs_balance_transfer').default(false),
  transferReconciled: boolean('transfer_reconciled').default(false),
  transferTiming: text('transfer_timing'),
  isBorrowed: boolean('is_borrowed').default(false),
  borrowSource: text('borrow_source'),
  chargeDescriptorId: text('charge_descriptor_id'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  householdIdx: index('idx_tracked_expenses_household').on(table.householdId),
}));

export interface ConfirmationNumber {
  id: string;
  category: string;
  customCategoryLabel?: string;
  value: string;
  isPrimary?: boolean;
  sortOrder?: number;
}

export const trackedExpenseConfirmationNumbers = pgTable('tracked_expense_confirmation_numbers', {
  id: text('id').primaryKey(),
  trackedExpenseId: text('tracked_expense_id').notNull().references(() => trackedExpenses.id, { onDelete: 'cascade' }),
  category: text('category').notNull(),
  customCategoryLabel: text('custom_category_label'),
  value: text('value').notNull(),
  isPrimary: boolean('is_primary').default(false),
  sortOrder: integer('sort_order').default(0),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  trackedExpenseIdx: index('idx_tecn_tracked_expense').on(table.trackedExpenseId),
}));

export const confirmationNumberCategories = pgTable('confirmation_number_categories', {
  id: text('id').primaryKey(),
  householdId: text('household_id').references(() => households.id, { onDelete: 'cascade' }),
  key: text('key').notNull(),
  label: text('label').notNull(),
  icon: text('icon').default('🔖'),
  sortOrder: integer('sort_order').default(0),
  isSystem: boolean('is_system').default(false),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  householdIdx: index('idx_cnc_household').on(table.householdId),
  householdKeyIdx: uniqueIndex('idx_cnc_household_key').on(table.householdId, table.key),
}));

export const trackedExpenseLifecycleLogs = pgTable('tracked_expense_lifecycle_logs', {
  id: serial('id').primaryKey(),
  trackedExpenseId: text('tracked_expense_id').notNull().references(() => trackedExpenses.id, { onDelete: 'cascade' }),
  actorId: text('actor_id').notNull(),
  action: text('action').notNull(),
  fieldChanged: text('field_changed'),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  diffJson: json('diff_json'),
  metadataJson: json('metadata_json').default({}),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  trackedExpenseIdx: index('idx_tell_tracked_expense').on(table.trackedExpenseId),
  actorIdx: index('idx_tell_actor').on(table.actorId),
}));
