import { sqliteTable, text, integer, primaryKey, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const households = sqliteTable('households', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  currency: text('currency').default('USD'),
  countryCode: text('country_code').default('US'),
  unallocatedBalanceCents: integer('unallocated_balance_cents').default(0),
  status: text('status').default('active'),
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
  passkeyVerifiedAt: text('passkey_verified_at'),
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
  status: text('status').default('active'),
}, (table) => ({
  householdIdx: index('idx_accounts_household').on(table.householdId),
}));

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
}, (table) => ({
  householdIdx: index('idx_categories_household').on(table.householdId),
}));

export const paySchedules = sqliteTable('pay_schedules', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id),
  userId: text('user_id').references(() => users.id), // Added Ownership
  name: text('name').notNull(),
  frequency: text('frequency', { enum: ['weekly', 'biweekly', 'semi-monthly', 'monthly', 'quarterly', 'annually', 'manual'] }).notNull(),
  nextPayDate: text('next_pay_date'),
  estimatedAmountCents: integer('estimated_amount_cents'),
  notes: text('notes'),
  semiMonthlyDay1: integer('semi_monthly_day_1'),
  semiMonthlyDay2: integer('semi_monthly_day_2'),
});

export const payExceptions = sqliteTable('pay_exceptions', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id),
  userId: text('user_id').notNull().references(() => users.id), // Forced privacy
  payScheduleId: text('pay_schedule_id').notNull().references(() => paySchedules.id),
  originalDate: text('original_date').notNull(), // The projected date this exception targets
  overrideDate: text('override_date'),
  overrideAmountCents: integer('override_amount_cents'),
  note: text('note'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  householdIdx: index('idx_pay_exceptions_household').on(table.householdId),
  userIdx: index('idx_pay_exceptions_user').on(table.userId),
  scheduleIdx: index('idx_pay_exceptions_schedule').on(table.payScheduleId),
}));

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
  notes: text('notes'),
  rawDescription: text('raw_description'),
  parentId: text('parent_id'),
  providerId: text('provider_id').references(() => serviceProviders.id),
  billId: text('bill_id').references(() => bills.id),
}, (table) => ({
  householdIdx: index('idx_transactions_household').on(table.householdId),
  accountIdx: index('idx_transactions_account').on(table.accountId),
  categoryIdx: index('idx_transactions_category').on(table.categoryId),
  parentIdx: index('idx_transactions_parent').on(table.parentId),
  providerIdx: index('idx_transactions_provider').on(table.providerId),
}));

export const transactionPairingRules = sqliteTable('transaction_pairing_rules', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id),
  pattern: text('pattern').notNull(),
  targetProviderId: text('target_provider_id').references(() => serviceProviders.id),
  targetCategoryId: text('target_category_id').references(() => categories.id),
  autoConfirm: integer('auto_confirm', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
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
}, (table) => ({
  householdIdx: index('idx_subscriptions_household').on(table.householdId),
}));

export const bills = sqliteTable('bills', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id),
  name: text('name').notNull(),
  amountCents: integer('amount_cents').notNull(),
  dueDate: text('due_date').notNull(),
  status: text('status').default('unpaid'), // unpaid, paid, pending
  notes: text('notes'),
  categoryId: text('category_id').references(() => categories.id),
  accountId: text('account_id').references(() => accounts.id),
  isRecurring: integer('is_recurring', { mode: 'boolean' }).default(false),
  frequency: text('frequency'), // weekly, monthly, etc
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  householdIdx: index('idx_bills_household').on(table.householdId),
}));

export const liabilitySplits = sqliteTable('liability_splits', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id),
  targetId: text('target_id').notNull(),
  targetType: text('target_type').notNull(), // 'bill', 'subscription', 'installment'
  originatorUserId: text('originator_user_id').notNull().references(() => users.id),
  assignedUserId: text('assigned_user_id').notNull().references(() => users.id),
  splitType: text('split_type').notNull(), // 'percentage', 'fixed'
  splitValue: integer('split_value').notNull(), // percentage amount or exact cents depending on splitType
  calculatedAmountCents: integer('calculated_amount_cents').notNull(),
  overrideDate: text('override_date'),
  overrideFrequency: text('override_frequency'),
  status: text('status').default('pending'), // 'pending', 'paid', 'overdue'
  isMasterLedgerPublic: integer('is_master_ledger_public', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  targetIdx: index('idx_liability_splits_target').on(table.targetType, table.targetId),
  assignedUserIdx: index('idx_liability_splits_assigned').on(table.assignedUserId),
}));

export const reminders = sqliteTable('reminders', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id),
  userId: text('user_id').notNull().references(() => users.id),
  targetId: text('target_id').notNull(),
  targetType: text('target_type').notNull(), // 'subscription', 'installment_plan', 'pay_schedule', 'credit_card_statement'
  deliveryType: text('delivery_type').notNull(), // 'discord_dm', 'discord_webhook', 'email', 'in_app'
  deliveryTarget: text('delivery_target'), // contains webhook URL or Discord User ID 
  frequencyDays: integer('frequency_days').notNull(), // exact days before the bill date (e.g., 3)
  timeOfDay: text('time_of_day').default('09:00'), // Customizable time of day (UTC/Local)
  note: text('note'), 
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  lastSentAt: text('last_sent_at'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  targetIdx: index('idx_reminders_target').on(table.targetType, table.targetId),
  userIdx: index('idx_reminders_user').on(table.userId)
}));

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

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  passkeyVerifiedAt: text('passkey_verified_at'),
  deviceName: text('device_name'),
  os: text('os'),
  browser: text('browser'),
  ipAddress: text('ip_address'),
  lastActiveAt: text('last_active_at'),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const totps = sqliteTable('totps', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  secret: text('secret').notNull(),
  name: text('name').default('Authenticator App'),
  lastUsedAt: text('last_used_at'),
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
  backedUp: integer('backed_up', { mode: 'boolean' }).default(false),
  lastUsedAt: text('last_used_at'),
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
}, (table) => ({
  householdIdx: index('idx_savings_household').on(table.householdId),
}));

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
}, (table) => ({
  householdIdx: index('idx_installments_household').on(table.householdId),
}));

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
  status: text('status').default('active'),
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

export const systemConfig = sqliteTable('system_config', {
  id: text('id').primaryKey(),
  configKey: text('config_key').notNull().unique(),
  configValue: text('config_value'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const systemRegistry = sqliteTable('system_registry', {
  id: text('id').primaryKey(),
  itemType: text('item_type').notNull(),
  name: text('name').notNull(),
  logoUrl: text('logo_url'),
  websiteUrl: text('website_url'),
  metadataJson: text('metadata_json'),
});

export const systemAuditLogs = sqliteTable('system_audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  action: text('action').notNull(),
  target: text('target').notNull(),
  detailsJson: text('details_json'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const billingProcessors = sqliteTable('billing_processors', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  websiteUrl: text('website_url'),
  brandingUrl: text('branding_url'),
  supportUrl: text('support_url'),
  subscriptionIdNotes: text('subscription_id_notes'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const systemWalkthroughs = sqliteTable('system_walkthroughs', {
  id: text('id').primaryKey(),
  version: text('version').notNull(),
  title: text('title').notNull(),
  contentMd: text('content_md').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const systemAnnouncements = sqliteTable('system_announcements', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  contentMd: text('content_md').notNull(),
  priority: text('priority').default('info'),
  actorId: text('actor_id'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  expiresAt: text('expires_at'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const externalConnections = sqliteTable('external_connections', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id),
  provider: text('provider').notNull(),
  accessToken: text('access_token').notNull(),
  status: text('status').default('active'),
  lastSyncAt: text('last_sync_at'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const privacyCards = sqliteTable('privacy_cards', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id),
  connectionId: text('connection_id').notNull(),
  last4: text('last4').notNull(),
  hostname: text('hostname'),
  spendLimitCents: integer('spend_limit_cents'),
  state: text('state'),
});

export const investmentHoldings = sqliteTable('investment_holdings', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id),
  accountId: text('account_id').notNull(),
  name: text('name').notNull(),
  quantity: integer('quantity').notNull(),
  valueCents: integer('value_cents').notNull(),
});

export const schedules = sqliteTable('schedules', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id),
  targetId: text('target_id').notNull(),
  targetType: text('target_type').notNull(),
  frequency: text('frequency').notNull(),
  nextRunAt: text('next_run_at').notNull(),
  lastRunAt: text('last_run_at'),
  executedCount: integer('executed_count').default(0),
  status: text('status').default('active'),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const scheduleHistory = sqliteTable('schedule_history', {
  id: text('id').primaryKey(),
  scheduleId: text('schedule_id').notNull().references(() => schedules.id),
  householdId: text('household_id').notNull().references(() => households.id),
  occurrenceAt: text('occurrence_at').notNull(),
  actionStatus: text('action_status').notNull(),
  detailsJson: text('details_json'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const webhooks = sqliteTable('webhooks', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id),
  url: text('url').notNull(),
  secret: text('secret').notNull(),
  eventList: text('event_list').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
});

export const webhookDeliveryLogs = sqliteTable('webhook_delivery_logs', {
  id: text('id').primaryKey(),
  webhookId: text('webhook_id').notNull().references(() => webhooks.id),
  event: text('event').notNull(),
  statusCode: integer('status_code').default(0),
  error: text('error'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const pccAuditLogs = sqliteTable('pcc_audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  action: text('action').notNull(),
  target: text('target').notNull(),
  targetId: text('target_id'),
  detailsJson: text('details_json'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const userPaymentMethods = sqliteTable('user_payment_methods', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  provider: text('provider').notNull(),
  token: text('token').notNull(),
  status: text('status').default('active'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const userLinkedAccounts = sqliteTable('user_linked_accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  provider: text('provider').notNull(),
  accountId: text('account_id').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const supportIssues = sqliteTable('support_issues', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  category: text('category'),
  priority: text('priority').default('medium'),
  status: text('status').default('open'),
  githubIssueUrl: text('github_issue_url'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const userOnboarding = sqliteTable('user_onboarding', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  stepId: text('step_id').notNull(),
  status: text('status').default('pending'),
  completedAt: text('completed_at'),
});

export const userPreferences = sqliteTable('user_preferences', {
  userId: text('user_id').notNull().references(() => users.id),
  key: text('key').notNull(),
  value: text('value'),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.key] }),
}));

export const notificationSettings = sqliteTable('notification_settings', {
  userId: text('user_id').notNull().references(() => users.id),
  type: text('type').notNull(),
  event: text('event').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).default(false),
  offsetDays: integer('offset_days').default(3),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.type, table.event] }),
}));

export const householdInvites = sqliteTable('household_invites', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id),
  createdBy: text('created_by').notNull().references(() => users.id),
  status: text('status').default('pending'),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const linkedProviders = sqliteTable('linked_providers', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  serviceProviderId: text('service_provider_id').notNull().references(() => serviceProviders.id),
  accountReference: text('account_reference'),
  customLabel: text('custom_label'),
  metadata: text('metadata'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});


