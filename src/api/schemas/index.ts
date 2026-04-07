import { z } from 'zod'

// --- COMMON SCHEMAS ---
export const PaginationSchema = z.object({
  limit: z.string().optional().transform(v => Math.min(parseInt(v || '50'), 100)),
  offset: z.string().optional().transform(v => parseInt(v || '0'))
})

// --- FINANCIAL SCHEMAS ---
export const TransactionSchema = z.object({
  amount_cents: z.number().int(),
  description: z.string().min(1).max(255),
  account_id: z.string().uuid().or(z.string().regex(/^(acc-|plaid-|privacy-|retirement-|method-)/)),
  category_id: z.string().uuid().or(z.string().regex(/^(cat-|plaid-|privacy-)/)),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  owner_id: z.string().optional(),
  status: z.string().optional().default('unpaid'),
  confirmation_number: z.string().optional().nullable()
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
  status: z.enum(['active', 'completed', 'cancelled']).optional()
})

export const SubscriptionSchema = z.object({
  name: z.string().min(1).max(100),
  amount_cents: z.number().int().positive(),
  billing_cycle: z.enum(['weekly', 'monthly', 'yearly']),
  next_billing_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  account_id: z.string().optional(),
  payment_mode: z.enum(['manual', 'autopay']).optional(),
  owner_id: z.string().optional()
})

export const PayScheduleSchema = z.object({
  name: z.string().min(1).max(100),
  frequency: z.enum(['weekly', 'biweekly', 'semi-monthly', 'monthly']),
  next_pay_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  estimated_amount_cents: z.number().int().positive().optional().nullable(),
  notes: z.string().max(1000).optional().nullable()
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
  website_url: z.string().url().or(z.string().length(0)).nullable().optional(),
  branding_url: z.string().url().or(z.string().length(0)).nullable().optional(),
  support_url: z.string().url().or(z.string().length(0)).nullable().optional(),
  subscription_id_notes: z.string().max(500).optional()
})

export const ProviderSchema = z.object({
  name: z.string().min(1).max(100),
  website_url: z.string().url().or(z.string().length(0)).nullable().optional(),
  branding_url: z.string().url().or(z.string().length(0)).nullable().optional(),
  billing_processor_id: z.string().uuid().or(z.string().length(0)).nullable().optional(),
  is_3rd_party_capable: z.boolean().optional().default(false)
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
  global_role: z.enum(['user', 'super_admin']).optional(),
  status: z.enum(['active', 'suspended', 'deactivated', 'pending']).optional(),
  display_name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional()
})

export const CreateUserAdminSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8),
  display_name: z.string().min(1).max(100),
  global_role: z.enum(['user', 'super_admin']).default('user'),
  force_password_change: z.boolean().optional().default(true)
})

export const SystemRegistrySchema = z.object({
  item_type: z.string(),
  name: z.string().min(1).max(100),
  logo_url: z.string().url().or(z.string().length(0)).nullable().optional(),
  website_url: z.string().url().or(z.string().length(0)).nullable().optional(),
  metadata_json: z.any().optional()
})

export const UpdateSystemConfigSchema = z.object({
  config_value: z.string()
})

export const UpdateSystemFeatureSchema = z.object({
  enabled_globally: z.boolean(),
  target_user_ids: z.string().nullable().optional()
})
