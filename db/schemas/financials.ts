import { sqliteTable, text, integer, primaryKey, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { users } from './auth';

export const households = sqliteTable('households', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
  currency: text('currency').default('USD'),
  countryCode: text('countryCode').default('US'),
  unallocatedBalanceCents: integer('unallocatedBalanceCents').default(0),
  status: text('status').default('active'),
});

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

export const billers = sqliteTable('billers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  logoUrl: text('logoUrl'),
  website: text('website'),
  industry: text('industry'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
});

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  accountId: text('accountId').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  categoryId: text('categoryId').references(() => categories.id, { onDelete: 'set null' }),
  amountCents: integer('amountCents').notNull(),
  description: text('description'),
  transactionDate: text('transactionDate').default(sql`(DATE('now'))`),
  status: text('status').default('pending'),
  isRecurring: integer('isRecurring', { mode: 'boolean' }).default(false),
  receiptR2Key: text('receiptR2Key'),
  ownerId: text('ownerId').references(() => users.id, { onDelete: 'set null' }),
  confirmationNumber: text('confirmationNumber'),
  linkedTransactionId: text('linkedTransactionId').references(() => transactions.id, { onDelete: 'set null' }),
  reconciliationStatus: text('reconciliationStatus').default('unreconciled'),
  notes: text('notes'),
  rawDescription: text('rawDescription'),
  parentId: text('parentId').references(() => transactions.id, { onDelete: 'cascade' }),
  providerId: text('providerId'), // Loosely coupled to system.serviceProviders
  billId: text('billId'), // Loosely coupled to bills
  attentionRequired: integer('attentionRequired', { mode: 'boolean' }).default(false),
  needsBalanceTransfer: integer('needsBalanceTransfer', { mode: 'boolean' }).default(false),
  transferTiming: text('transferTiming'),
  isBorrowed: integer('isBorrowed', { mode: 'boolean' }).default(false),
  borrowSource: text('borrowSource'),
  accountedFor: integer('accountedFor', { mode: 'boolean' }).default(false),
  source: text('source').default('manual'),
}, (table) => ({
  householdIdx: index('idx_transactions_household').on(table.householdId),
  accountIdx: index('idx_transactions_account').on(table.accountId),
  categoryIdx: index('idx_transactions_category').on(table.categoryId),
  parentIdx: index('idx_transactions_parent').on(table.parentId),
  dateIdx: index('idx_transactions_date').on(table.transactionDate),
}));

export const transactionPairingRules = sqliteTable('transactionPairingRules', {
  id: text('id').primaryKey(),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  pattern: text('pattern').notNull(),
  targetProviderId: text('targetProviderId'),
  targetCategoryId: text('targetCategoryId').references(() => categories.id, { onDelete: 'cascade' }),
  autoConfirm: integer('autoConfirm', { mode: 'boolean' }).default(false),
  ownerId: text('ownerId').references(() => users.id, { onDelete: 'set null' }),
  visibility: text('visibility').default('private'), 
  ruleType: text('ruleType').default('manual'),
  metadataJson: text('metadataJson'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  householdIdx: index('idx_pairing_rules_household').on(table.householdId),
  categoryIdx: index('idx_pairing_rules_category').on(table.targetCategoryId),
}));

export const bills = sqliteTable('bills', {
  id: text('id').primaryKey(),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  amountCents: integer('amountCents').notNull(),
  dueDate: text('dueDate').notNull(),
  status: text('status').default('unpaid'),
  notes: text('notes'),
  categoryId: text('categoryId').references(() => categories.id, { onDelete: 'set null' }),
  accountId: text('accountId').references(() => accounts.id, { onDelete: 'set null' }),
  isRecurring: integer('isRecurring', { mode: 'boolean' }).default(false),
  frequency: text('frequency'),
  upcomingAmountCents: integer('upcomingAmountCents'),
  upcomingEffectiveDate: text('upcomingEffectiveDate'),
  ownerId: text('ownerId').references(() => users.id, { onDelete: 'set null' }),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  householdIdx: index('idx_bills_household').on(table.householdId),
  ownerIdx: index('idx_bills_owner').on(table.ownerId),
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
  categoryId: text('categoryId').references(() => categories.id, { onDelete: 'set null' }),
  accountId: text('accountId').references(() => accounts.id, { onDelete: 'set null' }),
  paymentMode: text('paymentMode').default('manual'),
  ownerId: text('ownerId').references(() => users.id, { onDelete: 'set null' }),
  upcomingAmountCents: integer('upcomingAmountCents'),
  upcomingEffectiveDate: text('upcomingEffectiveDate'),
}, (table) => ({
  householdIdx: index('idx_subscriptions_household').on(table.householdId),
}));

export const reconciliationProposals = sqliteTable('reconciliationProposals', {
  id: text('id').primaryKey(),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  primaryTransactionId: text('primaryTransactionId').notNull().references(() => transactions.id, { onDelete: 'cascade' }),
  suggestedTransactionId: text('suggestedTransactionId').notNull().references(() => transactions.id, { onDelete: 'cascade' }),
  confidenceScore: integer('confidenceScore').default(0),
  matchReason: text('matchReason'),
  status: text('status').default('pending'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  householdIdx: index('idx_recon_proposals_household').on(table.householdId),
  primaryTxIdx: index('idx_recon_proposals_primary').on(table.primaryTransactionId),
  suggestedTxIdx: index('idx_recon_proposals_suggested').on(table.suggestedTransactionId),
}));

export const sharedBalances = sqliteTable('sharedBalances', {
  id: text('id').primaryKey(),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  fromUserId: text('fromUserId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  toUserId: text('toUserId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  amountCents: integer('amountCents').notNull(),
  transactionId: text('transactionId').references(() => transactions.id, { onDelete: 'cascade' }),
}, (table) => ({
  householdIdx: index('idx_shared_balances_household').on(table.householdId),
  transactionIdx: index('idx_shared_balances_transaction').on(table.transactionId),
}));

export const liabilitySplits = sqliteTable('liabilitySplits', {
  id: text('id').primaryKey(),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  targetId: text('targetId').notNull(),
  targetType: text('targetType').notNull(), 
  originatorUserId: text('originatorUserId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  assignedUserId: text('assignedUserId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  splitType: text('splitType').notNull(),
  splitValue: integer('splitValue').notNull(),
  calculatedAmountCents: integer('calculatedAmountCents').notNull(),
  overrideDate: text('overrideDate'),
  overrideFrequency: text('overrideFrequency'),
  status: text('status').default('pending'),
  isMasterLedgerPublic: integer('isMasterLedgerPublic', { mode: 'boolean' }).default(false),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updatedAt').default(sql`CURRENT_TIMESTAMP`),
});

export const creditCards = sqliteTable('creditCards', {
  id: text('id').primaryKey(),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  accountId: text('accountId').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
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
  categoryId: text('categoryId').references(() => categories.id, { onDelete: 'set null' }),
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
  frequency: text('frequency').notNull(), 
  nextPaymentDate: text('nextPaymentDate').notNull(),
  accountId: text('accountId').references(() => accounts.id, { onDelete: 'set null' }),
  paymentMode: text('paymentMode').default('manual'),
  status: text('status').default('active'),
  upcomingAmountCents: integer('upcomingAmountCents'),
  upcomingEffectiveDate: text('upcomingEffectiveDate'),
}, (table) => ({
  householdIdx: index('idx_installments_household').on(table.householdId),
}));

export const investmentHoldings = sqliteTable('investmentHoldings', {
  id: text('id').primaryKey(),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  accountId: text('accountId').references(() => accounts.id, { onDelete: 'set null' }),
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

export const userPaymentMethods = sqliteTable('userPaymentMethods', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  householdId: text('householdId').references(() => households.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type').notNull(), 
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
  providerId: text('providerId').notNull(),
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
