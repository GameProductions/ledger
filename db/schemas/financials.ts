import { boolean, pgTable, text, integer, primaryKey, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './auth';

export const households = pgTable('households', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  currency: text('currency').default('USD'),
  countryCode: text('country_code').default('US'),
  unallocatedBalanceCents: integer('unallocated_balance_cents').default(0),
  status: text('status').default('active'),
});

export const userHouseholds = pgTable('user_households', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  role: text('role').default('member'),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.householdId] }),
}));

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type').notNull(),
  balanceCents: integer('balance_cents').default(0),
  currency: text('currency').default('USD'),
  status: text('status').default('active'),
}, (table) => ({
  householdIdx: index('idx_accounts_household').on(table.householdId),
}));

export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  icon: text('icon'),
  color: text('color'),
  monthlyBudgetCents: integer('monthly_budget_cents').default(0),
  envelopeBalanceCents: integer('envelope_balance_cents').default(0),
  rolloverEnabled: boolean('rollover_enabled').default(false),
  rolloverCents: integer('rollover_cents').default(0),
  emergencyFund: boolean('emergency_fund').default(false),
}, (table) => ({
  householdIdx: index('idx_categories_household').on(table.householdId),
}));

export const chargeDescriptors = pgTable('charge_descriptors', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  defaultCategoryId: text('default_category_id'),
  isActive: boolean('is_active').default(true),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  householdIdx: index('idx_charge_descriptors_household').on(table.householdId),
}));

export const billers = pgTable('billers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  logoUrl: text('logo_url'),
  website: text('website'),
  industry: text('industry'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const transactions = pgTable('transactions', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  accountId: text('account_id').references(() => accounts.id, { onDelete: 'set null' }),
  categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
  amountCents: integer('amount_cents').notNull(),
  description: text('description'),
  transactionDate: text('transaction_date').default(sql`CURRENT_DATE::text`),
  status: text('status').default('pending'),
  isRecurring: boolean('is_recurring').default(false),
  receiptR2Key: text('receipt_r2_key'),
  ownerId: text('owner_id').references(() => users.id, { onDelete: 'set null' }),
  confirmationNumber: text('confirmation_number'),
  linkedTransactionId: text('linked_transaction_id').references((): any => transactions.id, { onDelete: 'set null' }),
  reconciliationStatus: text('reconciliation_status').default('unreconciled'),
  notes: text('notes'),
  rawDescription: text('raw_description'),
  parentId: text('parent_id').references((): any => transactions.id, { onDelete: 'cascade' }),
  providerId: text('provider_id'), // Loosely coupled to system.serviceProviders
  billId: text('bill_id'), // Loosely coupled to bills
  attentionRequired: boolean('attention_required').default(false),
  needsBalanceTransfer: boolean('needs_balance_transfer').default(false),
  transferReconciled: boolean('transfer_reconciled').default(false),
  transferTiming: text('transfer_timing'),
  isBorrowed: boolean('is_borrowed').default(false),
  borrowSource: text('borrow_source'),
  accountedFor: boolean('accounted_for').default(false),
  source: text('source').default('manual'),
  payScheduleId: text('pay_schedule_id'),
  paycheckDate: text('paycheck_date'),
  chargeDescriptorId: text('charge_descriptor_id'),
}, (table) => ({
  householdIdx: index('idx_transactions_household').on(table.householdId),
  accountIdx: index('idx_transactions_account').on(table.accountId),
  categoryIdx: index('idx_transactions_category').on(table.categoryId),
  parentIdx: index('idx_transactions_parent').on(table.parentId),
  dateIdx: index('idx_transactions_date').on(table.transactionDate),
}));

export const transactionPairingRules = pgTable('transaction_pairing_rules', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  pattern: text('pattern').notNull(),
  targetProviderId: text('target_provider_id'),
  targetCategoryId: text('target_category_id').references(() => categories.id, { onDelete: 'cascade' }),
  autoConfirm: boolean('auto_confirm').default(false),
  ownerId: text('owner_id').references(() => users.id, { onDelete: 'set null' }),
  visibility: text('visibility').default('private'), 
  ruleType: text('rule_type').default('manual'),
  metadataJson: text('metadata_json'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  householdIdx: index('idx_pairing_rules_household').on(table.householdId),
  categoryIdx: index('idx_pairing_rules_category').on(table.targetCategoryId),
}));

export const bills = pgTable('bills', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  amountCents: integer('amount_cents').notNull(),
  dueDate: text('due_date').notNull(),
  status: text('status').default('unpaid'),
  notes: text('notes'),
  categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
  accountId: text('account_id').references(() => accounts.id, { onDelete: 'set null' }),
  isRecurring: boolean('is_recurring').default(false),
  frequency: text('frequency'),
  endDate: text('end_date'),
  maxOccurrences: integer('max_occurrences'),
  upcomingAmountCents: integer('upcoming_amount_cents'),
  upcomingEffectiveDate: text('upcoming_effective_date'),
  payScheduleId: text('pay_schedule_id'),
  paycheckDate: text('paycheck_date'),
  ownerId: text('owner_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  householdIdx: index('idx_bills_household').on(table.householdId),
  ownerIdx: index('idx_bills_owner').on(table.ownerId),
}));

export const subscriptions = pgTable('subscriptions', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  amountCents: integer('amount_cents').notNull(),
  billingCycle: text('billing_cycle').notNull(),
  nextBillingDate: text('next_billing_date'),
  endDate: text('end_date'),
  maxOccurrences: integer('max_occurrences'),
  trialEndDate: text('trial_end_date'),
  isTrial: boolean('is_trial').default(false),
  categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
  accountId: text('account_id').references(() => accounts.id, { onDelete: 'set null' }),
  paymentMode: text('payment_mode').default('manual'),
  ownerId: text('owner_id').references(() => users.id, { onDelete: 'set null' }),
  upcomingAmountCents: integer('upcoming_amount_cents'),
  upcomingEffectiveDate: text('upcoming_effective_date'),
  payScheduleId: text('pay_schedule_id'),
  paycheckDate: text('paycheck_date'),
}, (table) => ({
  householdIdx: index('idx_subscriptions_household').on(table.householdId),
}));

export const reconciliationProposals = pgTable('reconciliation_proposals', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  primaryTransactionId: text('primary_transaction_id').notNull().references(() => transactions.id, { onDelete: 'cascade' }),
  suggestedTransactionId: text('suggested_transaction_id').notNull().references(() => transactions.id, { onDelete: 'cascade' }),
  confidenceScore: integer('confidence_score').default(0),
  matchReason: text('match_reason'),
  status: text('status').default('pending'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  householdIdx: index('idx_recon_proposals_household').on(table.householdId),
  primaryTxIdx: index('idx_recon_proposals_primary').on(table.primaryTransactionId),
  suggestedTxIdx: index('idx_recon_proposals_suggested').on(table.suggestedTransactionId),
}));

export const sharedBalances = pgTable('shared_balances', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  fromUserId: text('from_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  toUserId: text('to_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  amountCents: integer('amount_cents').notNull(),
  transactionId: text('transaction_id').references(() => transactions.id, { onDelete: 'cascade' }),
}, (table) => ({
  householdIdx: index('idx_shared_balances_household').on(table.householdId),
  transactionIdx: index('idx_shared_balances_transaction').on(table.transactionId),
}));

export const liabilitySplits = pgTable('liability_splits', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  targetId: text('target_id').notNull(),
  targetType: text('target_type').notNull(), 
  originatorUserId: text('originator_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  assignedUserId: text('assigned_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  splitType: text('split_type').notNull(),
  splitValue: integer('split_value').notNull(),
  calculatedAmountCents: integer('calculated_amount_cents').notNull(),
  overrideDate: text('override_date'),
  overrideFrequency: text('override_frequency'),
  status: text('status').default('pending'),
  isMasterLedgerPublic: boolean('is_master_ledger_public').default(false),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const creditCards = pgTable('credit_cards', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  creditLimitCents: integer('credit_limit_cents').notNull(),
  interestRateApy: integer('interest_rate_apy'),
  statementClosingDay: integer('statement_closing_day'),
  paymentDueDay: integer('payment_due_day'),
  nextStatementDate: text('next_statement_date'),
}, (table) => ({
  householdIdx: index('idx_credit_cards_household').on(table.householdId),
  accountIdx: index('idx_credit_cards_account').on(table.accountId),
}));

export const savingsBuckets = pgTable('savings_buckets', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  targetCents: integer('target_cents').notNull(),
  currentCents: integer('current_cents').default(0),
  targetDate: text('target_date'),
  categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  householdIdx: index('idx_savings_household').on(table.householdId),
}));

export const transactionTimeline = pgTable('transaction_timeline', {
  id: text('id').primaryKey(),
  transactionId: text('transaction_id').notNull().references(() => transactions.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  content: text('content'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  transactionIdx: index('idx_timeline_transaction').on(table.transactionId),
}));

export const installmentPlans = pgTable('installment_plans', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  totalAmountCents: integer('total_amount_cents').notNull(),
  installmentAmountCents: integer('installment_amount_cents').notNull(),
  totalInstallments: integer('total_installments').notNull(),
  remainingInstallments: integer('remaining_installments').notNull(),
  frequency: text('frequency').notNull(), 
  nextPaymentDate: text('next_payment_date').notNull(),
  accountId: text('account_id').references(() => accounts.id, { onDelete: 'set null' }),
  paymentMode: text('payment_mode').default('manual'),
  status: text('status').default('active'),
  upcomingAmountCents: integer('upcoming_amount_cents'),
  upcomingEffectiveDate: text('upcoming_effective_date'),
}, (table) => ({
  householdIdx: index('idx_installments_household').on(table.householdId),
}));

export const investmentHoldings = pgTable('investment_holdings', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  accountId: text('account_id').references(() => accounts.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  assetType: text('asset_type').notNull().default('misc'),
  quantity: integer('quantity').notNull(),
  costBasisCents: integer('cost_basis_cents'),
  valueCents: integer('value_cents').notNull(),
  currency: text('currency').default('USD'),
  institutionId: text('institution_id'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  householdIdx: index('idx_invest_holdings_household').on(table.householdId),
  accountIdx: index('idx_invest_holdings_account').on(table.accountId),
}));

export const reports = pgTable('reports', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  periodStart: text('period_start'),
  periodEnd: text('period_end'),
  dataJson: text('data_json'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  householdIdx: index('idx_reports_household').on(table.householdId),
}));

export const userPaymentMethods = pgTable('user_payment_methods', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  householdId: text('household_id').references(() => households.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type').notNull(), 
  lastFour: text('last_four'),
  brandingUrl: text('branding_url'),
  status: text('status').default('active'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  userIdx: index('idx_payment_methods_user').on(table.userId),
  householdIdx: index('idx_payment_methods_household').on(table.householdId),
}));

export const userLinkedAccounts = pgTable('user_linked_accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  householdId: text('household_id').references(() => households.id, { onDelete: 'cascade' }),
  providerId: text('provider_id').notNull(),
  paymentMethodId: text('payment_method_id').references(() => userPaymentMethods.id, { onDelete: 'cascade' }),
  emailAttached: text('email_attached'),
  membershipStartDate: text('membership_start_date'),
  membershipEndDate: text('membership_end_date'),
  subscriptionId: text('subscription_id'),
  notes: text('notes'),
  status: text('status').default('active'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  userIdx: index('idx_linked_accounts_user').on(table.userId),
  householdIdx: index('idx_linked_accounts_household').on(table.householdId),
}));
