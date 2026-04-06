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
  email: text('email').unique(), // changed to notNull false for social-only
  displayName: text('display_name'),
  username: text('username').unique(),
  passwordHash: text('password_hash'),
  avatarUrl: text('avatar_url'),
  totpSecret: text('totp_secret'),
  totpEnabled: integer('totp_enabled').default(0),
  globalRole: text('global_role').default('user'),
  status: text('status').default('active'),
  lastActiveAt: text('last_active_at'),
  settingsJson: text('settings_json'),
  lastViewedVersion: text('last_viewed_version'),
  forcePasswordChange: integer('force_password_change').default(0),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const userIdentities = sqliteTable('user_identities', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  provider: text('provider').notNull(),
  providerUserId: text('provider_user_id').notNull(),
  email: text('email'),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  tokenExpiresAt: text('token_expires_at'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  uniqueIdentity: uniqueIndex('idx_user_identities_unique').on(table.provider, table.providerUserId),
}));

export const passwordResets = sqliteTable('password_resets', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  token: text('token').notNull(),
  isUsed: integer('is_used').default(0),
  expiresAt: text('expires_at').notNull(),
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
  ownerId: text('owner_id').references(() => users.id),
  confirmationNumber: text('confirmation_number'),
  linkedTransactionId: text('linked_transaction_id'),
  reconciliationStatus: text('reconciliation_status').default('unreconciled'),
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
  accountId: text('account_id').references(() => accounts.id),
  paymentMode: text('payment_mode').default('manual'),
  ownerId: text('owner_id').references(() => users.id),
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
  counter: integer('counter').default(0),
  transports: text('transports'),
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

export const personalAccessTokens = sqliteTable('personal_access_tokens', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id),
  name: text('name'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  lastUsedAt: text('last_used_at'),
});

export const creditCards = sqliteTable('credit_cards', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id),
  accountId: text('account_id').notNull().references(() => accounts.id),
  creditLimitCents: integer('credit_limit_cents').notNull(),
  interestRateApy: integer('interest_rate_apy'),
  statementClosingDay: integer('statement_closing_day'),
  paymentDueDay: integer('payment_due_day'),
  nextStatementDate: text('next_statement_date'),
});

export const savingsBuckets = sqliteTable('savings_buckets', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id),
  name: text('name').notNull(),
  targetCents: integer('target_cents').notNull(),
  currentCents: integer('current_cents').default(0),
  targetDate: text('target_date'),
  categoryId: text('category_id').references(() => categories.id),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const transactionTimeline = sqliteTable('transaction_timeline', {
  id: text('id').primaryKey(),
  transactionId: text('transaction_id').notNull().references(() => transactions.id),
  type: text('type').notNull(),
  content: text('content'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const installmentPlans = sqliteTable('installment_plans', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id),
  name: text('name').notNull(),
  totalAmountCents: integer('total_amount_cents').notNull(),
  installmentAmountCents: integer('installment_amount_cents').notNull(),
  totalInstallments: integer('total_installments').notNull(),
  remainingInstallments: integer('remaining_installments').notNull(),
  frequency: text('frequency').notNull(), // weekly, biweekly, monthly, quarterly, yearly
  nextPaymentDate: text('next_payment_date').notNull(),
  accountId: text('account_id').references(() => accounts.id),
  paymentMode: text('payment_mode').default('manual'), // manual or autopay
  status: text('status').default('active'),
});

export const personalLoans = sqliteTable('personal_loans', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id),
  lenderUserId: text('lender_user_id').notNull().references(() => users.id),
  borrowerName: text('borrower_name').notNull(),
  borrowerContact: text('borrower_contact'),
  totalAmountCents: integer('total_amount_cents').notNull(),
  remainingBalanceCents: integer('remaining_balance_cents').notNull(),
  interestRateApy: integer('interest_rate_apy').default(0),
  termMonths: integer('term_months'),
  originationDate: text('origination_date').notNull(),
});
export const reports = sqliteTable('reports', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id),
  type: text('type').notNull(),
  periodStart: text('period_start'),
  periodEnd: text('period_end'),
  dataJson: text('data_json'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const serviceProviders = sqliteTable('service_providers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  visibility: text('visibility').default('public'), // public, household, private
  householdId: text('household_id').references(() => households.id),
  createdBy: text('created_by'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});
export const loanPayments = sqliteTable('loan_payments', {
  id: text('id').primaryKey(),
  loanId: text('loan_id').notNull().references(() => personalLoans.id),
  amountCents: integer('amount_cents').notNull(),
  platform: text('platform'),
  externalId: text('external_id'),
  method: text('method'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});
