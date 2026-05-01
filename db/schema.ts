import { sqliteTable, text, integer, primaryKey, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const households = sqliteTable('households', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
  currency: text('currency').default('USD'),
  countryCode: text('countryCode').default('US'),
  unallocatedBalanceCents: integer('unallocatedBalanceCents').default(0),
  status: text('status').default('active'),
});

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique(), 
  displayName: text('displayName'),
  username: text('username').notNull().unique(),
  passwordHash: text('passwordHash'),
  avatarUrl: text('avatarUrl'),
  globalRole: text('globalRole').default('user'),
  status: text('status').default('active'),
  lastActiveAt: text('lastActiveAt'),
  forcePasswordChange: integer('forcePasswordChange').default(0),
  passkeyVerifiedAt: text('passkeyVerifiedAt'),
  totpSecret: text('totpSecret'), // [LEGACY] Use 'totps' table for modern identity security
  totpEnabled: integer('totpEnabled').default(0),
  lastLogin: text('lastLogin').default(sql`CURRENT_TIMESTAMP`),
  lastSeenVersion: text('lastSeenVersion').default('0.0.0'),
  onboardingCompleted: integer('onboardingCompleted').default(0),
  failedLoginAttempts: integer('failedLoginAttempts').default(0),
  lockoutUntil: text('lockoutUntil'),
  backupCodesJson: text('backupCodesJson').default('[]'), // [LEGACY] Use 'vault' table
  passwordChangedAt: text('passwordChangedAt'),
  preferredMfaType: text('preferredMfaType'), // PASSKEY, TOTP, NONE
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
  timezone: text('timezone').default('UTC'),
  locale: text('locale').default('en-US'),
  themePreference: text('themePreference').default('system'),
});

export const userIdentities = sqliteTable('userIdentities', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  providerUserId: text('providerUserId').notNull(),
  email: text('email'),
  name: text('name'),
  avatarUrl: text('avatarUrl'),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  tokenExpiresAt: text('tokenExpiresAt'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updatedAt').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  userIdx: index('idx_user_identities_user').on(table.userId),
  uniqueIdentity: uniqueIndex('idx_user_identities_unique').on(table.provider, table.providerUserId),
}));

export const passwordResets = sqliteTable('passwordResets', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull(),
  isUsed: integer('isUsed').default(0),
  expiresAt: text('expiresAt').notNull(),
}, (table) => ({
  userIdx: index('idx_pass_resets_user').on(table.userId),
}));

export const userHouseholds = sqliteTable('userHouseholds', {
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  role: text('role').default('member'),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.householdId] }),
}));

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type').notNull(),
  balanceCents: integer('balanceCents').default(0),
  currency: text('currency').default('USD'),
  status: text('status').default('active'),
}, (table) => ({
  householdIdx: index('idx_accounts_household').on(table.householdId),
}));

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  icon: text('icon'),
  color: text('color'),
  monthlyBudgetCents: integer('monthlyBudgetCents').default(0),
  envelopeBalanceCents: integer('envelopeBalanceCents').default(0),
  rolloverEnabled: integer('rolloverEnabled', { mode: 'boolean' }).default(false),
  rolloverCents: integer('rolloverCents').default(0),
  emergencyFund: integer('emergencyFund', { mode: 'boolean' }).default(false),
}, (table) => ({
  householdIdx: index('idx_categories_household').on(table.householdId),
}));

export const paySchedules = sqliteTable('paySchedules', {
  id: text('id').primaryKey(),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  userId: text('userId').references(() => users.id, { onDelete: 'cascade' }), // Added Ownership
  name: text('name').notNull(),
  frequency: text('frequency', { enum: ['weekly', 'biweekly', 'semi-monthly', 'monthly', 'quarterly', 'annually', 'manual'] }).notNull(),
  nextPayDate: text('nextPayDate'),
  estimatedAmountCents: integer('estimatedAmountCents'),
  upcomingAmountCents: integer('upcomingAmountCents'),
  upcomingEffectiveDate: text('upcomingEffectiveDate'),
  notes: text('notes'),
  semiMonthlyDay1: integer('semiMonthlyDay1'),
  semiMonthlyDay2: integer('semiMonthlyDay2'),
}, (table) => ({
  householdIdx: index('idx_pay_schedules_household').on(table.householdId),
}));

export const payExceptions = sqliteTable('payExceptions', {
  id: text('id').primaryKey(),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }), // Forced privacy
  payScheduleId: text('payScheduleId').notNull().references(() => paySchedules.id, { onDelete: 'cascade' }),
  originalDate: text('originalDate').notNull(), // The projected date this exception targets
  overrideDate: text('overrideDate'),
  overrideAmountCents: integer('overrideAmountCents'),
  note: text('note'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  householdIdx: index('idx_pay_exceptions_household').on(table.householdId),
  userIdx: index('idx_pay_exceptions_user').on(table.userId),
  scheduleIdx: index('idx_pay_exceptions_schedule').on(table.payScheduleId),
}));

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  accountId: text('accountId').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  categoryId: text('categoryId').references(() => categories.id, { onDelete: 'cascade' }),
  amountCents: integer('amountCents').notNull(),
  description: text('description'),
  transactionDate: text('transactionDate').default(sql`(DATE('now'))`),
  status: text('status').default('pending'),
  isRecurring: integer('isRecurring', { mode: 'boolean' }).default(false),
  receiptR2Key: text('receiptR2Key'),
  ownerId: text('ownerId').references(() => users.id, { onDelete: 'cascade' }),
  confirmationNumber: text('confirmationNumber'),
  linkedTransactionId: text('linkedTransactionId'),
  reconciliationStatus: text('reconciliationStatus').default('unreconciled'),
  notes: text('notes'),
  rawDescription: text('rawDescription'),
  parentId: text('parentId'),
  providerId: text('providerId').references(() => serviceProviders.id, { onDelete: 'cascade' }),
  billId: text('billId').references(() => bills.id, { onDelete: 'cascade' }),
  attentionRequired: integer('attentionRequired', { mode: 'boolean' }).default(false),
  needsBalanceTransfer: integer('needsBalanceTransfer', { mode: 'boolean' }).default(false),
  transferTiming: text('transferTiming'),
  isBorrowed: integer('isBorrowed', { mode: 'boolean' }).default(false),
  borrowSource: text('borrowSource'),
  accountedFor: integer('accountedFor', { mode: 'boolean' }).default(false),
}, (table) => ({
  householdIdx: index('idx_transactions_household').on(table.householdId),
  accountIdx: index('idx_transactions_account').on(table.accountId),
  categoryIdx: index('idx_transactions_category').on(table.categoryId),
  parentIdx: index('idx_transactions_parent').on(table.parentId),
  providerIdx: index('idx_transactions_provider').on(table.providerId),
  dateIdx: index('idx_transactions_date').on(table.transactionDate),
}));

export const trackedExpenses = sqliteTable('trackedExpenses', {
  id: text('id').primaryKey(),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  amountCents: integer('amountCents').notNull(),
  description: text('description').notNull(),
  notes: text('notes'),
  status: text('status').default('pending'), // pending, committed
  attentionRequired: integer('attentionRequired', { mode: 'boolean' }).default(false),
  needsBalanceTransfer: integer('needsBalanceTransfer', { mode: 'boolean' }).default(false),
  transferTiming: text('transferTiming'),
  isBorrowed: integer('isBorrowed', { mode: 'boolean' }).default(false),
  borrowSource: text('borrowSource'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  householdIdx: index('idx_tracked_expenses_household').on(table.householdId),
}));

export const transactionPairingRules = sqliteTable('transactionPairingRules', {
  id: text('id').primaryKey(),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  pattern: text('pattern').notNull(),
  targetProviderId: text('targetProviderId').references(() => serviceProviders.id, { onDelete: 'cascade' }),
  targetCategoryId: text('targetCategoryId').references(() => categories.id, { onDelete: 'cascade' }),
  autoConfirm: integer('autoConfirm', { mode: 'boolean' }).default(false),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  householdIdx: index('idx_pairing_rules_household').on(table.householdId),
  providerIdx: index('idx_pairing_rules_provider').on(table.targetProviderId),
  categoryIdx: index('idx_pairing_rules_category').on(table.targetCategoryId),
}));

export const sharedBalances = sqliteTable('sharedBalances', {
  id: text('id').primaryKey(),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  fromUserId: text('fromUserId').notNull(),
  toUserId: text('toUserId').notNull(),
  amountCents: integer('amountCents').notNull(),
  transactionId: text('transactionId').references(() => transactions.id, { onDelete: 'cascade' }),
}, (table) => ({
  householdIdx: index('idx_shared_balances_household').on(table.householdId),
  transactionIdx: index('idx_shared_balances_transaction').on(table.transactionId),
}));

export const subscriptions = sqliteTable('subscriptions', {
  id: text('id').primaryKey(),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  amountCents: integer('amountCents').notNull(),
  billingCycle: text('billingCycle').notNull(),
  nextBillingDate: text('nextBillingDate'),
  trialEndDate: text('trialEndDate'),
  isTrial: integer('isTrial', { mode: 'boolean' }).default(false),
  categoryId: text('categoryId').references(() => categories.id, { onDelete: 'cascade' }),
  accountId: text('accountId').references(() => accounts.id, { onDelete: 'cascade' }),
  paymentMode: text('paymentMode').default('manual'),
  ownerId: text('ownerId').references(() => users.id, { onDelete: 'cascade' }),
  upcomingAmountCents: integer('upcomingAmountCents'),
  upcomingEffectiveDate: text('upcomingEffectiveDate'),
}, (table) => ({
  householdIdx: index('idx_subscriptions_household').on(table.householdId),
}));

export const bills = sqliteTable('bills', {
  id: text('id').primaryKey(),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  amountCents: integer('amountCents').notNull(),
  dueDate: text('dueDate').notNull(),
  status: text('status').default('unpaid'), // unpaid, paid, pending
  notes: text('notes'),
  categoryId: text('categoryId').references(() => categories.id, { onDelete: 'cascade' }),
  accountId: text('accountId').references(() => accounts.id, { onDelete: 'cascade' }),
  isRecurring: integer('isRecurring', { mode: 'boolean' }).default(false),
  frequency: text('frequency'), // weekly, monthly, etc
  upcomingAmountCents: integer('upcomingAmountCents'),
  upcomingEffectiveDate: text('upcomingEffectiveDate'),
  ownerId: text('ownerId').references(() => users.id, { onDelete: 'cascade' }),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  householdIdx: index('idx_bills_household').on(table.householdId),
  ownerIdx: index('idx_bills_owner').on(table.ownerId),
}));

export const liabilitySplits = sqliteTable('liabilitySplits', {
  id: text('id').primaryKey(),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  targetId: text('targetId').notNull(),
  targetType: text('targetType').notNull(), // 'bill', 'subscription', 'installment'
  originatorUserId: text('originatorUserId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  assignedUserId: text('assignedUserId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  splitType: text('splitType').notNull(), // 'percentage', 'fixed'
  splitValue: integer('splitValue').notNull(), // percentage amount or exact cents depending on splitType
  calculatedAmountCents: integer('calculatedAmountCents').notNull(),
  overrideDate: text('overrideDate'),
  overrideFrequency: text('overrideFrequency'),
  status: text('status').default('pending'), // 'pending', 'paid', 'overdue'
  isMasterLedgerPublic: integer('isMasterLedgerPublic', { mode: 'boolean' }).default(false),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updatedAt').default(sql`CURRENT_TIMESTAMP`),
});

export const reminders = sqliteTable('reminders', {
  id: text('id').primaryKey(),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  targetId: text('targetId').notNull(),
  targetType: text('targetType').notNull(), // 'subscription', 'installment_plan', 'pay_schedule', 'credit_card_statement'
  deliveryType: text('deliveryType').notNull(), // 'discord_dm', 'discord_webhook', 'email', 'in_app'
  deliveryTarget: text('deliveryTarget'), // contains webhook URL or Discord User ID 
  frequencyDays: integer('frequencyDays').notNull(), // exact days before the bill date (e.g., 3)
  timeOfDay: text('timeOfDay').default('09:00'), // Customizable time of day (UTC/Local)
  note: text('note'), 
  isActive: integer('isActive', { mode: 'boolean' }).default(true),
  lastSentAt: text('lastSentAt'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  targetIdx: index('idx_reminders_target').on(table.targetType, table.targetId),
  userIdx: index('idx_reminders_user').on(table.userId)
}));

export const holidays = sqliteTable('holidays', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),
  name: text('name').notNull(),
  countryCode: text('countryCode').default('US'),
});

export const templates = sqliteTable('templates', {
  id: text('id').primaryKey(),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  amountCents: integer('amountCents'),
  categoryId: text('categoryId').references(() => categories.id, { onDelete: 'cascade' }),
  accountId: text('accountId').references(() => accounts.id, { onDelete: 'cascade' }),
});

export const auditLogs = sqliteTable('auditLogs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  actorId: text('actorId').notNull(),
  ipAddress: text('ipAddress'),
  ipV4: text('ipV4'),
  ipV6: text('ipV6'),
  userAgent: text('userAgent'),
  action: text('action').notNull(),
  severity: text('severity').default('INFO'), // INFO, WARN, CRITICAL
  targetType: text('targetType'),
  targetId: text('targetId'),
  recordId: text('recordId'), // For table row identifiers
  oldValuesJson: text('oldValuesJson').default('{}'),
  newValuesJson: text('newValuesJson').default('{}'),
  metadataJson: text('metadataJson').default('{}'),
  cfRay: text('cfRay'),
  location: text('location'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  householdIdx: index('idx_audit_logs_household').on(table.householdId),
  actorIdx: index('idx_audit_logs_actor').on(table.actorId),
  actionIdx: index('idx_audit_logs_action').on(table.action),
  createdIdx: index('idx_audit_logs_created').on(table.createdAt),
}));

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
  expiresAt: text('expiresAt').notNull(),
  passkeyVerifiedAt: text('passkeyVerifiedAt'),
  challenge: text('challenge'),
  userAgent: text('userAgent'),
  ipAddress: text('ipAddress'),
  ipV4: text('ipV4'),
  ipV6: text('ipV6'),
  lastActiveAt: text('lastActiveAt').default(sql`CURRENT_TIMESTAMP`),
  deviceName: text('deviceName'),
  os: text('os'),
  browser: text('browser'),
  cfRay: text('cfRay'),
  isPersistent: integer('isPersistent').default(0),
  city: text('city'),
  country: text('country'),
  region: text('region'),
  continent: text('continent'),
  latitude: text('latitude'),
  longitude: text('longitude'),
  cfIp: text('cfIp'),
}, (table) => ({
  userIdx: index('idx_sessions_user').on(table.userId),
}));

export const totpCredentials = sqliteTable('totpCredentials', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  secret: text('secret').notNull(),
  name: text('name').default('Authenticator App'),
  verified: integer('verified').default(0),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
  lastUsedAt: text('lastUsedAt'),
  lastUsedIp: text('lastUsedIp'),
  lastUsedIpV4: text('lastUsedIpV4'),
  lastUsedIpV6: text('lastUsedIpV6'),
  lastUsedLocation: text('lastUsedLocation'),
  lastUsedUa: text('lastUsedUa'),
}, (table) => ({
  userIdx: index('idx_totp_credentials_user').on(table.userId),
}));

export const passkeys = sqliteTable('passkeys', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  credentialId: text('credentialId').notNull(),
  publicKey: text('publicKey').notNull(),
  counter: integer('counter').notNull(),
  deviceType: text('deviceType'),
  backedUp: integer('backedUp').default(0), // 0 or 1
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
  lastUsedAt: text('lastUsedAt'),
  name: text('name'),
  aaguid: text('aaguid'),
  transports: text('transports'),
  providerName: text('providerName'),
  icon: text('icon'),
  lastUsedIp: text('lastUsedIp'),
  lastUsedIpV4: text('lastUsedIpV4'),
  lastUsedIpV6: text('lastUsedIpV6'),
  lastUsedLocation: text('lastUsedLocation'),
  lastUsedUa: text('lastUsedUa'),
}, (table) => ({
  userIdx: index('idx_passkeys_user').on(table.userId),
}));

export const systemFeatureFlags = sqliteTable('systemFeatureFlags', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6))))`),
  featureKey: text('featureKey').notNull().unique(),
  enabledGlobally: integer('enabledGlobally').default(0),
  description: text('description'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updatedAt').default(sql`CURRENT_TIMESTAMP`),
});

export const adminInvitations = sqliteTable('adminInvitations', {
  id: text('id').primaryKey(),
  email: text('email'),
  token: text('token').notNull().unique(),
  role: text('role').notNull(),
  isClaimed: integer('isClaimed').default(0),
  expiresAt: text('expiresAt').notNull(),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
});

export const personalAccessTokens = sqliteTable('personalAccessTokens', {
  id: text('id').primaryKey(),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  name: text('name'),
  scopes: text('scopes').default('READ,WRITE'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
  lastUsedAt: text('lastUsedAt'),
}, (table) => ({
  householdIdx: index('idx_pat_household').on(table.householdId),
}));

export const creditCards = sqliteTable('creditCards', {
  id: text('id').primaryKey(),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  accountId: text('accountId').notNull().references(() => accounts.id),
  creditLimitCents: integer('creditLimitCents').notNull(),
  interestRateApy: integer('interestRateApy'),
  statementClosingDay: integer('statementClosingDay'),
  paymentDueDay: integer('paymentDueDay'),
  nextStatementDate: text('nextStatementDate'),
}, (table) => ({
  householdIdx: index('idx_credit_cards_household').on(table.householdId),
  accountIdx: index('idx_credit_cards_account').on(table.accountId),
}));

export const savingsBuckets = sqliteTable('savingsBuckets', {
  id: text('id').primaryKey(),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  targetCents: integer('targetCents').notNull(),
  currentCents: integer('currentCents').default(0),
  targetDate: text('targetDate'),
  categoryId: text('categoryId').references(() => categories.id, { onDelete: 'cascade' }),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  householdIdx: index('idx_savings_household').on(table.householdId),
}));

export const transactionTimeline = sqliteTable('transactionTimeline', {
  id: text('id').primaryKey(),
  transactionId: text('transactionId').notNull().references(() => transactions.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  content: text('content'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  transactionIdx: index('idx_timeline_transaction').on(table.transactionId),
}));

export const installmentPlans = sqliteTable('installmentPlans', {
  id: text('id').primaryKey(),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  totalAmountCents: integer('totalAmountCents').notNull(),
  installmentAmountCents: integer('installmentAmountCents').notNull(),
  totalInstallments: integer('totalInstallments').notNull(),
  remainingInstallments: integer('remainingInstallments').notNull(),
  frequency: text('frequency').notNull(), // weekly, biweekly, monthly, quarterly, yearly
  nextPaymentDate: text('nextPaymentDate').notNull(),
  accountId: text('accountId').references(() => accounts.id, { onDelete: 'cascade' }),
  paymentMode: text('paymentMode').default('manual'), // manual or autopay
  status: text('status').default('active'),
  upcomingAmountCents: integer('upcomingAmountCents'),
  upcomingEffectiveDate: text('upcomingEffectiveDate'),
}, (table) => ({
  householdIdx: index('idx_installments_household').on(table.householdId),
}));

export const personalLoans = sqliteTable('personalLoans', {
  id: text('id').primaryKey(),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  lenderUserId: text('lenderUserId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  borrowerName: text('borrowerName').notNull(),
  borrowerContact: text('borrowerContact'),
  totalAmountCents: integer('totalAmountCents').notNull(),
  remainingBalanceCents: integer('remainingBalanceCents').notNull(),
  interestRateApy: integer('interestRateApy').default(0),
  termMonths: integer('termMonths'),
  originationDate: text('originationDate').notNull(),
}, (table) => ({
  householdIdx: index('idx_personal_loans_household').on(table.householdId),
  lenderIdx: index('idx_personal_loans_lender').on(table.lenderUserId),
}));

export const reports = sqliteTable('reports', {
  id: text('id').primaryKey(),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  periodStart: text('periodStart'),
  periodEnd: text('periodEnd'),
  dataJson: text('dataJson'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  householdIdx: index('idx_reports_household').on(table.householdId),
}));

export const serviceProviders = sqliteTable('serviceProviders', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  visibility: text('visibility').default('public'), // public, household, private
  householdId: text('householdId').references(() => households.id, { onDelete: 'cascade' }),
  billingProcessorId: text('billingProcessorId'),
  createdBy: text('createdBy'),
  status: text('status').default('active'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  householdIdx: index('idx_providers_household').on(table.householdId),
}));

export const loanPayments = sqliteTable('loanPayments', {
  id: text('id').primaryKey(),
  loanId: text('loanId').notNull().references(() => personalLoans.id, { onDelete: 'cascade' }),
  amountCents: integer('amountCents').notNull(),
  platform: text('platform'),
  externalId: text('externalId'),
  method: text('method'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  loanIdx: index('idx_loan_payments_loan').on(table.loanId),
}));

export const systemConfig = sqliteTable('systemConfig', {
  id: text('id').primaryKey(),
  configKey: text('configKey').notNull().unique(),
  configValue: text('configValue'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updatedAt').default(sql`CURRENT_TIMESTAMP`),
});

export const systemRegistry = sqliteTable('systemRegistry', {
  id: text('id').primaryKey(),
  itemType: text('itemType').notNull(),
  name: text('name').notNull(),
  logoUrl: text('logoUrl'),
  websiteUrl: text('websiteUrl'),
  metadataJson: text('metadataJson'),
});

export const systemAuditLogs = sqliteTable('systemAuditLogs', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  action: text('action').notNull(),
  target: text('target').notNull(),
  detailsJson: text('detailsJson'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
});

export const billingProcessors = sqliteTable('billingProcessors', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  websiteUrl: text('websiteUrl'),
  brandingUrl: text('brandingUrl'),
  supportUrl: text('supportUrl'),
  subscriptionIdNotes: text('subscriptionIdNotes'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updatedAt').default(sql`CURRENT_TIMESTAMP`),
});

export const systemWalkthroughs = sqliteTable('systemWalkthroughs', {
  id: text('id').primaryKey(),
  version: text('version').notNull(),
  title: text('title').notNull(),
  contentMd: text('contentMd').notNull(),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
});

export const systemAnnouncements = sqliteTable('systemAnnouncements', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  contentMd: text('contentMd').notNull(),
  priority: text('priority').default('info'),
  actorId: text('actorId'),
  isActive: integer('isActive', { mode: 'boolean' }).default(true),
  expiresAt: text('expiresAt'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
});

export const externalConnections = sqliteTable('externalConnections', {
  id: text('id').primaryKey(),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  accessToken: text('accessToken').notNull(),
  status: text('status').default('active'),
  lastSyncAt: text('lastSyncAt'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  householdIdx: index('idx_ext_conn_household').on(table.householdId),
}));

export const privacyCards = sqliteTable('privacyCards', {
  id: text('id').primaryKey(),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  connectionId: text('connectionId').notNull(),
  last4: text('last4').notNull(),
  hostname: text('hostname'),
  spendLimitCents: integer('spendLimitCents'),
  state: text('state'),
}, (table) => ({
  householdIdx: index('idx_privacy_cards_household').on(table.householdId),
}));

export const investmentHoldings = sqliteTable('investmentHoldings', {
  id: text('id').primaryKey(),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  accountId: text('accountId'),
  name: text('name').notNull(),
  assetType: text('assetType').notNull().default('misc'),
  quantity: integer('quantity').notNull(),
  costBasisCents: integer('costBasisCents'),
  valueCents: integer('valueCents').notNull(),
  currency: text('currency').default('USD'),
  institutionId: text('institutionId'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  householdIdx: index('idx_invest_holdings_household').on(table.householdId),
  accountIdx: index('idx_invest_holdings_account').on(table.accountId),
}));

export const schedules = sqliteTable('schedules', {
  id: text('id').primaryKey(),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  targetId: text('targetId').notNull(),
  targetType: text('targetType').notNull(),
  frequency: text('frequency').notNull(),
  nextRunAt: text('nextRunAt').notNull(),
  lastRunAt: text('lastRunAt'),
  executedCount: integer('executedCount').default(0),
  status: text('status').default('active'),
  updatedAt: text('updatedAt').default(sql`CURRENT_TIMESTAMP`),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
});

export const scheduleHistory = sqliteTable('scheduleHistory', {
  id: text('id').primaryKey(),
  scheduleId: text('scheduleId').notNull().references(() => schedules.id, { onDelete: 'cascade' }),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  occurrenceAt: text('occurrenceAt').notNull(),
  actionStatus: text('actionStatus').notNull(),
  detailsJson: text('detailsJson'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  scheduleIdx: index('idx_sched_history_schedule').on(table.scheduleId),
  householdIdx: index('idx_sched_history_household').on(table.householdId),
}));

export const webhooks = sqliteTable('webhooks', {
  id: text('id').primaryKey(),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  secret: text('secret').notNull(),
  eventList: text('eventList').notNull(),
  isActive: integer('isActive', { mode: 'boolean' }).default(true),
}, (table) => ({
  householdIdx: index('idx_webhooks_household').on(table.householdId),
}));

export const webhookDeliveryLogs = sqliteTable('webhookDeliveryLogs', {
  id: text('id').primaryKey(),
  webhookId: text('webhookId').notNull().references(() => webhooks.id, { onDelete: 'cascade' }),
  event: text('event').notNull(),
  statusCode: integer('statusCode').default(0),
  error: text('error'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  webhookIdx: index('idx_webhook_logs_webhook').on(table.webhookId),
}));

export const adminAuditLogs = sqliteTable('adminAuditLogs', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  action: text('action').notNull(),
  target: text('target').notNull(),
  targetId: text('targetId'),
  detailsJson: text('detailsJson'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  userIdx: index('idx_admin_audit_user').on(table.userId),
  actionIdx: index('idx_admin_audit_action').on(table.action),
  createdIdx: index('idx_admin_audit_created').on(table.createdAt),
}));

export const userPaymentMethods = sqliteTable('userPaymentMethods', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  householdId: text('householdId').references(() => households.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type').notNull(), // card, bank, crypto, etc
  lastFour: text('lastFour'),
  brandingUrl: text('brandingUrl'),
  status: text('status').default('active'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  userIdx: index('idx_payment_methods_user').on(table.userId),
  householdIdx: index('idx_payment_methods_household').on(table.householdId),
}));

export const userLinkedAccounts = sqliteTable('userLinkedAccounts', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  householdId: text('householdId').references(() => households.id, { onDelete: 'cascade' }),
  providerId: text('providerId').notNull().references(() => serviceProviders.id, { onDelete: 'cascade' }),
  paymentMethodId: text('paymentMethodId').references(() => userPaymentMethods.id, { onDelete: 'cascade' }),
  emailAttached: text('emailAttached'),
  membershipStartDate: text('membershipStartDate'),
  membershipEndDate: text('membershipEndDate'),
  subscriptionId: text('subscriptionId'),
  notes: text('notes'),
  status: text('status').default('active'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  userIdx: index('idx_linked_accounts_user').on(table.userId),
  householdIdx: index('idx_linked_accounts_household').on(table.householdId),
}));

export const supportIssues = sqliteTable('supportIssues', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  category: text('category'),
  priority: text('priority').default('medium'),
  status: text('status').default('open'),
  githubIssueUrl: text('githubIssueUrl'),
  githubIssueNumber: integer('githubIssueNumber'),
  githubIssueId: integer('githubIssueId'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updatedAt').default(sql`CURRENT_TIMESTAMP`),
});

export const supportComments = sqliteTable('supportComments', {
  id: text('id').primaryKey(),
  issueId: text('issueId').notNull().references(() => supportIssues.id, { onDelete: 'cascade' }),
  userId: text('userId'), // Local user or null for GitHub sync
  authorName: text('authorName'), // e.g. "github-user"
  body: text('body').notNull(),
  githubCommentId: integer('githubCommentId'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
});

export const userOnboarding = sqliteTable('userOnboarding', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  stepId: text('stepId').notNull(),
  status: text('status').default('pending'),
  completedAt: text('completedAt'),
}, (table) => ({
  userIdx: index('idx_onboarding_user').on(table.userId),
}));

export const userPreferences = sqliteTable('userPreferences', {
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  key: text('key').notNull(),
  value: text('value'),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.key] }),
}));

export const notificationSettings = sqliteTable('notificationSettings', {
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  event: text('event').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).default(false),
  offsetDays: integer('offsetDays').default(3),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.type, table.event] }),
}));

export const householdInvites = sqliteTable('householdInvites', {
  id: text('id').primaryKey(),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  createdBy: text('createdBy').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: text('status').default('pending'),
  expiresAt: text('expiresAt').notNull(),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  householdIdx: index('idx_household_invites_household').on(table.householdId),
  createdByIdx: index('idx_household_invites_creator').on(table.createdBy),
}));

export const passkeyChallenges = sqliteTable('passkeyChallenges', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  challenge: text('challenge').notNull(),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
  expiresAt: text('expiresAt').notNull(),
});

export const linkedProviders = sqliteTable('linkedProviders', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  serviceProviderId: text('serviceProviderId').notNull().references(() => serviceProviders.id, { onDelete: 'cascade' }),
  accountReference: text('accountReference'),
  customLabel: text('customLabel'),
  metadata: text('metadata'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  userIdx: index('idx_linked_providers_user').on(table.userId),
  providerIdx: index('idx_linked_providers_provider').on(table.serviceProviderId),
}));
export const vault = sqliteTable('vault', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  keyName: text('key_name').notNull(),
  scope: text('scope').notNull(),
  encryptedValue: text('encrypted_value').notNull(),
  iv: text('iv').notNull(),
  version: integer('version').default(1),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  ownerKeyIdx: index('idx_vault_owner_key').on(table.ownerId, table.keyName, table.scope),
}));

export const backupCodes = sqliteTable('backupCodes', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  codeHash: text('codeHash').notNull(),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
  usedAt: text('usedAt'),
}, (table) => ({
  userIdx: index('idx_backup_codes_user').on(table.userId),
}));
