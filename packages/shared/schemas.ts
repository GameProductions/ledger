import { z } from 'zod'

// --- COMMON SCHEMAS ---
export const PaginationSchema = z.object({
  limit: z.string().optional().transform(v => Math.min(parseInt(v || '50'), 100)),
  offset: z.string().optional().transform(v => parseInt(v || '0'))
})

export const CategorySchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().max(20).optional().nullable(),
  color: z.string().max(20).optional().nullable(),
  monthlyBudgetCents: z.number().int().nonnegative().optional().default(0),
  rolloverEnabled: z.boolean().optional().default(false),
  emergencyFund: z.boolean().optional().default(false)
})

export const AccountSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['checking', 'savings', 'credit', 'investment', 'cash', 'other']),
  balanceCents: z.number().int().optional().default(0),
  currency: z.string().length(3).optional().default('USD'),
  status: z.enum(['active', 'closed', 'frozen']).optional().default('active')
})

// --- FINANCIAL SCHEMAS ---
export const TransactionSchema = z.object({
  amountCents: z.number().int(),
  description: z.string().min(1).max(1000),
  accountId: z.string().uuid().or(z.string().regex(/^(acc-|plaid-|privacy-|retirement-|method-)/)).or(z.literal('')).transform(v => v === '' ? null : v).optional().nullable(),
  categoryId: z.string().uuid().or(z.string().regex(/^(cat-|plaid-|privacy-)/)).or(z.literal('')).transform(v => v === '' ? null : v).optional().nullable(),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ownerId: z.string().optional(),
  status: z.string().optional().default('unpaid'),
  confirmationNumber: z.string().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  rawDescription: z.string().optional().nullable(),
  parentId: z.string().uuid().or(z.literal('')).transform(v => v === '' ? null : v).optional().nullable(),
  providerId: z.string().uuid().or(z.literal('')).transform(v => v === '' ? null : v).optional().nullable(),
  billId: z.string().uuid().or(z.literal('')).transform(v => v === '' ? null : v).optional().nullable(),
  attentionRequired: z.boolean().optional().default(false),
  needsBalanceTransfer: z.boolean().optional().default(false),
  transferReconciled: z.boolean().optional().default(false),
  transferTiming: z.string().optional().nullable(),
  isBorrowed: z.boolean().optional().default(false),
  borrowSource: z.string().optional().nullable(),
  accountedFor: z.boolean().optional().default(false),
  source: z.string().optional().default('manual'),
  payScheduleId: z.string().optional().nullable(),
  paycheckDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
})

export const TransactionOutputSchema = z.object({
  id: z.string(),
  amountCents: z.number().int(),
  description: z.string(),
  accountId: z.string().nullable(),
  categoryId: z.string().nullable(),
  transactionDate: z.string(),
  ownerId: z.string().nullable(),
  status: z.string(),
  confirmationNumber: z.string().nullable(),
  notes: z.string().nullable(),
  rawDescription: z.string().nullable(),
  parentId: z.string().nullable(),
  providerId: z.string().nullable(),
  billId: z.string().nullable(),
  reconciliationStatus: z.string().nullable(),
  linkedTransactionId: z.string().nullable(),
  receiptR2Key: z.string().nullable(),
  attentionRequired: z.boolean().nullable().optional(),
  needsBalanceTransfer: z.boolean().nullable().optional(),
  transferReconciled: z.boolean().nullable().optional(),
  transferTiming: z.string().nullable().optional(),
  isBorrowed: z.boolean().nullable().optional(),
  borrowSource: z.string().nullable().optional(),
  accountedFor: z.boolean().nullable().optional(),
  source: z.string().optional().default('manual'),
  updatedAt: z.string().optional(),
  createdAt: z.string().optional()
})

export const TransactionPairingRuleSchema = z.object({
  pattern: z.string().min(1),
  targetProviderId: z.string().uuid().optional().nullable(),
  targetCategoryId: z.string().uuid().optional().nullable(),
  autoConfirm: z.boolean().optional().default(false),
  ownerId: z.string().optional().nullable(),
  visibility: z.enum(['private', 'household', 'public']).optional().default('private'),
  ruleType: z.enum(['manual', 'smart_biller', 'auto_learned']).optional().default('manual'),
  metadataJson: z.string().optional().nullable()
})

export const TimelineEntrySchema = z.object({
  type: z.enum(['note', 'confirmation', 'status_change']),
  content: z.string().min(1)
})

export const TransferSchema = z.object({
  fromAccountId: z.string(),
  toAccountId: z.string(),
  amountCents: z.number().int().positive(),
  description: z.string().min(1)
})

export const BucketSchema = z.object({
  name: z.string().min(1).max(50),
  targetCents: z.number().int().positive(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
})

export const InstallmentPlanSchema = z.object({
  name: z.string().min(1).max(100),
  totalAmountCents: z.number().int().positive(),
  installmentAmountCents: z.number().int().positive(),
  totalInstallments: z.number().int().positive(),
  remainingInstallments: z.number().int().nonnegative().optional(),
  frequency: z.enum(['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']),
  nextPaymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  accountId: z.string().optional(),
  paymentMode: z.enum(['manual', 'autopay']).optional(),
  status: z.enum(['active', 'completed', 'cancelled']).optional(),
  upcomingAmountCents: z.number().int().positive().optional(),
  upcomingEffectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export const TrackedExpenseSchema = z.object({
  amountCents: z.number().int(),
  description: z.string().min(1).max(1000),
  notes: z.preprocess(val => val === '' ? null : val, z.string().max(1000).optional().nullable()),
  confirmationNumber: z.preprocess(val => val === '' ? null : val, z.string().max(100).optional().nullable()),
  attentionRequired: z.boolean().optional().default(false),
  needsBalanceTransfer: z.boolean().optional().default(false),
  transferTiming: z.preprocess(val => val === '' ? null : val, z.string().optional().nullable()),
  isBorrowed: z.boolean().optional().default(false),
  borrowSource: z.preprocess(val => val === '' ? null : val, z.string().optional().nullable()),
  createdAt: z.string().optional(),
})

export const SubscriptionSchema = z.object({
  name: z.string().min(1).max(100),
  amountCents: z.number().int().positive(),
  billingCycle: z.enum(['weekly', 'biweekly', 'monthly', 'quarterly', 'annually', 'yearly']),
  nextBillingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  maxOccurrences: z.number().int().positive().optional().nullable(),
  accountId: z.string().optional(),
  paymentMode: z.enum(['manual', 'autopay']).optional(),
  ownerId: z.string().optional(),
  upcomingAmountCents: z.number().int().positive().optional(),
  upcomingEffectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  payScheduleId: z.string().optional().nullable(),
  paycheckDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
})

export const PayScheduleSchema = z.object({
  name: z.string().min(1).max(100),
  amountCents: z.number().int().positive(),
  frequency: z.string(), // SINGLE, RECURRING, CRON
  nextPayDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  estimatedAmountCents: z.number().int().positive().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  semiMonthlyDay1: z.number().int().min(1).max(31).optional().nullable(),
  semiMonthlyDay2: z.number().int().min(1).max(31).optional().nullable(),
  userId: z.string().optional().nullable(),
  upcomingAmountCents: z.number().int().positive().optional(),
  upcomingEffectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export const BillSchema = z.object({
  name: z.string().min(1).max(100),
  amountCents: z.number().int().positive(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['unpaid', 'paid', 'pending']).optional().default('unpaid'),
  notes: z.string().max(1000).optional().nullable(),
  categoryId: z.string().optional().nullable(),
  accountId: z.string().optional().nullable(),
  isRecurring: z.boolean().optional().default(false),
  frequency: z.string().optional().nullable(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  maxOccurrences: z.number().int().positive().optional().nullable(),
  ownerId: z.string().optional(),
  upcomingAmountCents: z.number().int().positive().optional(),
  upcomingEffectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  payScheduleId: z.string().optional().nullable(),
  paycheckDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
})

export const LiabilitySplitSchema = z.object({
  targetId: z.string(),
  targetType: z.enum(['bill', 'subscription', 'installment']),
  assignedUserId: z.string(),
  splitType: z.enum(['percentage', 'fixed']),
  splitValue: z.number().int().positive(),
  calculatedAmountCents: z.number().int().positive(),
  overrideDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  overrideFrequency: z.string().optional().nullable(),
  status: z.enum(['pending', 'paid', 'overdue']).optional().default('pending'),
  isMasterLedgerPublic: z.boolean().optional().default(false),
})

export const PayExceptionSchema = z.object({
  payScheduleId: z.string(),
  originalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  overrideDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  overrideAmountCents: z.number().int().optional().nullable(),
  note: z.string().max(1000).optional().nullable()
})

export const CreditCardSchema = z.object({
  accountId: z.string(),
  creditLimitCents: z.number().int().positive().optional().default(0),
  interestRateApy: z.number().optional(),
  statementClosingDay: z.number().int().min(1).max(31),
  paymentDueDay: z.number().int().min(1).max(31)
})

export const LoanSchema = z.object({
  name: z.string().min(1).max(200),
  lender: z.string().optional().nullable(),
  totalPrincipalCents: z.number().int().positive(),
  remainingPrincipalCents: z.number().int().min(0),
  interestRateApy: z.number().optional().nullable(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  status: z.enum(['active', 'closed', 'defaulted']).optional().default('active')
})

export const BillerSchema = z.object({
  name: z.string().min(1).max(200),
  logoUrl: z.string().url().optional().nullable(),
  website: z.string().url().optional().nullable(),
  industry: z.string().optional().nullable()
})

export const ReconciliationProposalSchema = z.object({
  primaryTransactionId: z.string(),
  suggestedTransactionId: z.string(),
  confidenceScore: z.number().int().min(0).max(100),
  matchReason: z.string().optional().nullable(),
  status: z.enum(['pending', 'approved', 'rejected']).optional().default('pending')
})

// --- USER & HOUSEHOLD SCHEMAS ---
export const ProfileSchema = z.object({
  displayName: z.string().max(100).optional(),
  username: z.string().min(3).max(50).optional(),
  email: z.string().email().optional(),
  avatarUrl: z.string().url().or(z.string().length(0)).nullable().optional(),
  timezone: z.string().min(1).max(50).optional(),
  locale: z.string().min(2).max(10).optional(),
  theme: z.enum(['light', 'dark', 'system']).optional()
})

export const JoinHouseholdSchema = z.object({
  token: z.string()
})

export const CreateHouseholdSchema = z.object({
  name: z.string().min(1).max(100),
  currency: z.string().length(3).optional().default('USD')
})

export const UpdateHouseholdSchema = z.object({
  name: z.string().min(1).max(100)
})

export const OwnershipTransferSchema = z.object({
  newOwnerId: z.string(),
  transferHistory: z.boolean().optional().default(false)
})

// --- INTEROP & EXTERNAL SCHEMAS ---
export const BillingProcessorSchema = z.object({
  name: z.string().min(1),
  websiteUrl: z.string().url().optional().nullable(),
  brandingUrl: z.string().url().optional().nullable(),
  supportUrl: z.string().url().optional().nullable(),
  subscriptionIdNotes: z.string().optional().nullable(),
})

export const ProviderSchema = z.object({
  name: z.string().min(1),
  websiteUrl: z.string().url().optional().nullable(),
  brandingUrl: z.string().url().optional().nullable(),
  billingProcessorId: z.string().optional().nullable(),
  is3rdPartyCapable: z.boolean().optional().default(false),
})

export const UserPaymentMethodSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['credit_card', 'debit_card', 'bank_account', 'paypal', 'apple_pay', 'google_pay', 'other']),
  lastFour: z.string().length(4).optional().nullable(),
  brandingUrl: z.string().url().or(z.string().length(0)).nullable().optional()
})

export const UserLinkedAccountSchema = z.object({
  providerId: z.string().uuid(),
  paymentMethodId: z.string().uuid().nullable().optional(),
  emailAttached: z.string().email().or(z.string().length(0)).nullable().optional(),
  membershipStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  membershipEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  subscriptionId: z.string().uuid().nullable().optional(),
  notes: z.string().max(1000).optional(),
  status: z.enum(['active', 'cancelled', 'expired', 'pending']).optional().default('active')
})

export const WebhookSchema = z.object({
  url: z.string().url(),
  events: z.string() // Comma-separated or JSON
})

// --- ADMIN SCHEMAS ---
export const UpdateUserAdminSchema = z.object({
  globalRole: z.enum(['user', 'admin', 'owner', 'operator']).optional(),
  status: z.enum(['active', 'suspended', 'invited']).optional(),
  displayName: z.string().optional(),
  email: z.string().email().optional(),
})

export const CreateUserAdminSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1),
  globalRole: z.enum(['user', 'admin', 'owner', 'operator']).default('user'),
  forcePasswordChange: z.boolean().optional().default(true),
})

export const SystemRegistrySchema = z.object({
  itemType: z.enum(['subscription', 'bank', 'provider', 'utility', 'category']),
  name: z.string().min(1),
  logoUrl: z.string().url().optional().nullable(),
  websiteUrl: z.string().url().optional().nullable(),
  metadataJson: z.record(z.string(), z.any()).optional().nullable(),
})

export const UpdateSystemConfigSchema = z.object({
  configValue: z.string()
})

export const UpdateSystemFeatureSchema = z.object({
  enabledGlobally: z.boolean(),
  targetUserIds: z.string().nullable().optional()
})

// --- ENVELOPES ---
export const EnvelopeSchema = z.object({
  success: z.boolean(),
  data: z.any(),
  error: z.string().optional(),
  meta: z.object({
    total: z.number().optional(),
    limit: z.number().optional(),
    offset: z.number().optional()
  }).optional()
})

// --- OUTPUT DTOs ---
export const CategoryOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string().nullish(),
  envelopeBalanceCents: z.number().int(),
  color: z.string().nullable(),
  icon: z.string().nullable(),
  householdId: z.string()
})

export const AccountOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  balanceCents: z.number().int(),
  currency: z.string()
})

export const UserOutputSchema = z.object({
  id: z.string(),
  username: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  displayName: z.string().nullable().optional(),
  globalRole: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  totpEnabled: z.number().nullable().optional(),
  forcePasswordChange: z.union([z.boolean(), z.number()]).nullable().optional(),
  locale: z.string().nullable().optional(),
  theme: z.string().nullable().optional(),
  timezone: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  householdId: z.string().nullable().optional()
})
