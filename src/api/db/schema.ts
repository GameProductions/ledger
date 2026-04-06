import { sqliteTable, text, integer, primaryKey, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const households = sqliteTable('households', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  currency: text('currency').default('USD'),
  countryCode: text('country_code').default('US'),
  unallocatedBalanceCents: integer('unallocated_balance_cents').default(0),
});

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  displayName: text('display_name'),
  passwordHash: text('password_hash'),
  avatarUrl: text('avatar_url'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const userHouseholds = sqliteTable('user_households', {
  userId: text('user_id').notNull().references(() => users.id),
  householdId: text('household_id').notNull().references(() => households.id),
  role: text('role').default('member'),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.householdId] }),
}));

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id),
  name: text('name').notNull(),
  type: text('type').notNull(),
  balanceCents: integer('balance_cents').default(0),
  currency: text('currency').default('USD'),
});

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id),
  name: text('name').notNull(),
  icon: text('icon'),
  color: text('color'),
  monthlyBudgetCents: integer('monthly_budget_cents').default(0),
  envelopeBalanceCents: integer('envelope_balance_cents').default(0),
  rolloverEnabled: integer('rollover_enabled', { mode: 'boolean' }).default(false),
  rolloverCents: integer('rollover_cents').default(0),
  emergencyFund: integer('emergency_fund', { mode: 'boolean' }).default(false),
});

export const paySchedules = sqliteTable('pay_schedules', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id),
  name: text('name').notNull(),
  frequency: text('frequency').notNull(),
  nextPayDate: text('next_pay_date'),
  estimatedAmountCents: integer('estimated_amount_cents'),
});

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id),
  accountId: text('account_id').notNull().references(() => accounts.id),
  categoryId: text('category_id').references(() => categories.id),
  amountCents: integer('amount_cents').notNull(),
  description: text('description'),
  transactionDate: text('transaction_date').default(sql`(DATE('now'))`),
  status: text('status').default('pending'),
  isRecurring: integer('is_recurring', { mode: 'boolean' }).default(false),
  receiptR2Key: text('receipt_r2_key'),
});

export const sharedBalances = sqliteTable('shared_balances', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id),
  fromUserId: text('from_user_id').notNull(),
  toUserId: text('to_user_id').notNull(),
  amountCents: integer('amount_cents').notNull(),
  transactionId: text('transaction_id').references(() => transactions.id),
});

export const subscriptions = sqliteTable('subscriptions', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id),
  name: text('name').notNull(),
  amountCents: integer('amount_cents').notNull(),
  billingCycle: text('billing_cycle').notNull(),
  nextBillingDate: text('next_billing_date'),
  trialEndDate: text('trial_end_date'),
  isTrial: integer('is_trial', { mode: 'boolean' }).default(false),
  categoryId: text('category_id').references(() => categories.id),
});

export const holidays = sqliteTable('holidays', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),
  name: text('name').notNull(),
  countryCode: text('country_code').default('US'),
});

export const templates = sqliteTable('templates', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id),
  name: text('name').notNull(),
  description: text('description'),
  amountCents: integer('amount_cents'),
  categoryId: text('category_id').references(() => categories.id),
  accountId: text('account_id').references(() => accounts.id),
});

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id),
  actorId: text('actor_id').notNull(),
  tableName: text('table_name').notNull(),
  recordId: text('record_id').notNull(),
  action: text('action').notNull(),
  oldValuesJson: text('old_values_json'),
  newValuesJson: text('new_values_json'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const passkeys = sqliteTable('passkeys', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  publicKey: text('public_key').notNull(),
  credentialId: text('credential_id').notNull(),
  name: text('name'),
  aaguid: text('aaguid'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const systemFeatureFlags = sqliteTable('system_feature_flags', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6))))`),
  featureKey: text('feature_key').notNull().unique(),
  enabledGlobally: integer('enabled_globally').default(0),
  description: text('description'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const adminInvitations = sqliteTable('admin_invitations', {
  token: text('token').primaryKey(),
  role: text('role').notNull().default('super_admin'),
  isClaimed: integer('is_claimed').notNull().default(0),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  expiresAt: text('expires_at').notNull(),
});
