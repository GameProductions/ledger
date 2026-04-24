import { z } from 'zod'

// --- COMMON SCHEMAS ---
export const PaginationSchema = z.object({
  limit: z.string().optional().transform(v => Math.min(parseInt(v || '50'), 100)),
  offset: z.string().optional().transform(v => parseInt(v || '0'))
})

// --- FINANCIAL SCHEMAS ---
export const TransactionSchema = z.object({
  amount_cents: z.number().int(),
  description: z.string().min(1).max(1000),
  account_id: z.string().uuid().or(z.string().regex(/^(acc-|plaid-|privacy-|retirement-|method-)/)).optional(),
  category_id: z.string().uuid().or(z.string().regex(/^(cat-|plaid-|privacy-)/)).optional(),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  owner_id: z.string().optional(),
  status: z.string().optional().default('unpaid'),
  confirmation_number: z.string().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  raw_description: z.string().optional().nullable(),
  parent_id: z.string().uuid().optional().nullable(),
  provider_id: z.string().uuid().optional().nullable(),
  bill_id: z.string().uuid().optional().nullable(),
  attention_required: z.boolean().optional().default(false),
  needs_balance_transfer: z.boolean().optional().default(false),
  transfer_timing: z.string().optional().nullable(),
  is_borrowed: z.boolean().optional().default(false),
  borrow_source: z.string().optional().nullable(),
  accounted_for: z.boolean().optional().default(false),
})

export const TransactionOutputSchema = z.object({
  id: z.string(),
  amountCents: z.number().int(),
  description: z.string(),
  accountId: z.string(),
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
  transferTiming: z.string().nullable().optional(),
  isBorrowed: z.boolean().nullable().optional(),
  borrowSource: z.string().nullable().optional(),
  accountedFor: z.boolean().nullable().optional(),
  updatedAt: z.string().optional(),
  createdAt: z.string().optional()
})

export const TransactionPairingRuleSchema = z.object({
  pattern: z.string().min(1),
  target_provider_id: z.string().uuid().optional().nullable(),
  target_category_id: z.string().uuid().optional().nullable(),
  auto_confirm: z.boolean().optional().default(false)
})

export const TimelineEntrySchema = z.object({
  type: z.enum(['note', 'confirmation', 'status_change']),
  content: z.string().min(1)
})

export const TransferSchema = z.object({
  from_account_id: z.string(),
  to_account_id: z.string(),
  amount_cents: z.number().int().positive(),
  description: z.string().min(1)
})

export const BucketSchema = z.object({
  name: z.string().min(1).max(50),
  target_cents: z.number().int().positive(),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
})

export const InstallmentPlanSchema = z.object({
  name: z.string().min(1).max(100),
  total_amount_cents: z.number().int().positive(),
  installment_amount_cents: z.number().int().positive(),
  total_installments: z.number().int().positive(),
  remaining_installments: z.number().int().nonnegative().optional(),
  frequency: z.enum(['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']),
  next_payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  account_id: z.string().optional(),
  payment_mode: z.enum(['manual', 'autopay']).optional(),
  status: z.enum(['active', 'completed', 'cancelled']).optional(),
  upcoming_amount_cents: z.number().int().positive().optional(),
  upcoming_effective_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export const SubscriptionSchema = z.object({
  name: z.string().min(1).max(100),
  amount_cents: z.number().int().positive(),
  billing_cycle: z.enum(['weekly', 'monthly', 'yearly']),
  next_billing_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  account_id: z.string().optional(),
  payment_mode: z.enum(['manual', 'autopay']).optional(),
  owner_id: z.string().optional(),
  upcoming_amount_cents: z.number().int().positive().optional(),
  upcoming_effective_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export const PayScheduleSchema = z.object({
  name: z.string().min(1).max(100),
  frequency: z.enum(['weekly', 'biweekly', 'semi-monthly', 'monthly', 'quarterly', 'annually', 'manual']),
  next_pay_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  estimated_amount_cents: z.number().int().positive().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  semi_monthly_day_1: z.number().int().min(1).max(31).optional().nullable(),
  semi_monthly_day_2: z.number().int().min(1).max(31).optional().nullable(),
  user_id: z.string().optional().nullable(),
  upcoming_amount_cents: z.number().int().positive().optional(),
  upcoming_effective_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export const BillSchema = z.object({
  name: z.string().min(1).max(100),
  amount_cents: z.number().int().positive(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['unpaid', 'paid', 'pending']).optional().default('unpaid'),
  notes: z.string().max(1000).optional().nullable(),
  category_id: z.string().optional().nullable(),
  account_id: z.string().optional().nullable(),
  is_recurring: z.boolean().optional().default(false),
  frequency: z.string().optional().nullable(),
  owner_id: z.string().optional(),
  upcoming_amount_cents: z.number().int().positive().optional(),
  upcoming_effective_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export const LiabilitySplitSchema = z.object({
  target_id: z.string(),
  target_type: z.enum(['bill', 'subscription', 'installment']),
  assigned_user_id: z.string(),
  split_type: z.enum(['percentage', 'fixed']),
  split_value: z.number().int().positive(),
  calculated_amount_cents: z.number().int().positive(),
  override_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  override_frequency: z.string().optional().nullable(),
  status: z.enum(['pending', 'paid', 'overdue']).optional().default('pending'),
  is_master_ledger_public: z.boolean().optional().default(false),
})

export const PayExceptionSchema = z.object({
  pay_schedule_id: z.string(),
  original_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  override_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  override_amount_cents: z.number().int().optional().nullable(),
  note: z.string().max(1000).optional().nullable()
})

export const CreditCardSchema = z.object({
  account_id: z.string(),
  credit_limit_cents: z.number().int().positive(),
  interest_rate_apy: z.number().optional(),
  statement_closing_day: z.number().int().min(1).max(31),
  payment_due_day: z.number().int().min(1).max(31)
})

export const LoanSchema = z.object({
  borrower_name: z.string().min(1),
  borrower_contact: z.string().optional(),
  total_amount_cents: z.number().int().positive(),
  interest_rate_apy: z.number().optional(),
  term_months: z.number().int().positive().optional(),
  origination_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
})

// --- USER & HOUSEHOLD SCHEMAS ---
export const ProfileSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  username: z.string().min(3).max(50).optional(),
  email: z.string().email().optional(),
  settings_json: z.string().optional(),
  avatar_url: z.string().url().or(z.string().length(0)).nullable().optional(),
  timezone: z.string().min(1).max(50).optional()
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
  new_owner_id: z.string(),
  transfer_history: z.boolean().optional().default(false)
})

// --- INTEROP & EXTERNAL SCHEMAS ---
export const BillingProcessorSchema = z.object({
  name: z.string().min(1).max(100),
  websiteUrl: z.string().url().or(z.string().length(0)).nullable().optional(),
  brandingUrl: z.string().url().or(z.string().length(0)).nullable().optional(),
  supportUrl: z.string().url().or(z.string().length(0)).nullable().optional(),
  subscriptionIdNotes: z.string().max(500).optional()
})

export const ProviderSchema = z.object({
  name: z.string().min(1).max(100),
  websiteUrl: z.string().url().or(z.string().length(0)).nullable().optional(),
  brandingUrl: z.string().url().or(z.string().length(0)).nullable().optional(),
  billingProcessorId: z.string().uuid().or(z.string().length(0)).nullable().optional(),
  is3rdPartyCapable: z.boolean().optional().default(false)
})

export const UserPaymentMethodSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['credit_card', 'debit_card', 'bank_account', 'paypal', 'apple_pay', 'google_pay', 'other']),
  last_four: z.string().length(4).optional().nullable(),
  branding_url: z.string().url().or(z.string().length(0)).nullable().optional()
})

export const UserLinkedAccountSchema = z.object({
  provider_id: z.string().uuid(),
  payment_method_id: z.string().uuid().nullable().optional(),
  email_attached: z.string().email().or(z.string().length(0)).nullable().optional(),
  membership_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  membership_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  subscription_id: z.string().uuid().nullable().optional(),
  notes: z.string().max(1000).optional(),
  status: z.enum(['active', 'cancelled', 'expired', 'pending']).optional().default('active')
})

export const WebhookSchema = z.object({
  url: z.string().url(),
  events: z.string() // Comma-separated or JSON
})

// --- ADMIN SCHEMAS ---
export const UpdateUserAdminSchema = z.object({
  globalRole: z.enum(['user', 'super_admin']).optional(),
  status: z.enum(['active', 'suspended', 'deactivated', 'pending']).optional(),
  displayName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional()
})

export const CreateUserAdminSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(100),
  globalRole: z.enum(['user', 'super_admin']).default('user'),
  forcePasswordChange: z.boolean().optional().default(true)
})

export const SystemRegistrySchema = z.object({
  itemType: z.string(),
  name: z.string().min(1).max(100),
  logoUrl: z.string().url().or(z.string().length(0)).nullable().optional(),
  websiteUrl: z.string().url().or(z.string().length(0)).nullable().optional(),
  metadataJson: z.any().optional()
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
  type: z.string(),
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
  settingsJson: z.string().nullable().optional(),
  totpEnabled: z.number().nullable().optional(),
  forcePasswordChange: z.union([z.boolean(), z.number()]).nullable().optional(),
  createdAt: z.string().nullable().optional(),
  householdId: z.string().nullable().optional()
})
