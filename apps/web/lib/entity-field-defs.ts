export type FieldType = 'text' | 'number' | 'cents' | 'boolean' | 'select' | 'date' | 'textarea'

export interface FieldDef {
  key: string
  label: string
  type: FieldType
  options?: { value: string; label: string }[]
  locked?: boolean
  placeholder?: string
}

export type EntityType =
  | 'accounts'
  | 'bills'
  | 'categories'
  | 'charge-descriptors'
  | 'credit-cards'
  | 'installment-plans'
  | 'linked-accounts'
  | 'pairing-rules'
  | 'pay-schedules'
  | 'payment-methods'
  | 'subscriptions'
  | 'lenders'

export const FIELD_DEFS: Record<EntityType, FieldDef[]> = {
  accounts: [
    { key: 'householdId', label: 'Household ID', type: 'text', locked: true },
    { key: 'name', label: 'Name', type: 'text', placeholder: 'e.g. Chase Checking' },
    { key: 'type', label: 'Type', type: 'select', options: [
      { value: 'checking', label: 'Checking' },
      { value: 'savings', label: 'Savings' },
      { value: 'credit', label: 'Credit' },
      { value: 'investment', label: 'Investment' },
      { value: 'cash', label: 'Cash' },
      { value: 'other', label: 'Other' },
    ]},
    { key: 'balanceCents', label: 'Balance', type: 'cents', placeholder: '0.00' },
    { key: 'currency', label: 'Currency', type: 'text', placeholder: 'USD' },
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'active', label: 'Active' },
      { value: 'closed', label: 'Closed' },
    ]},
  ],

  bills: [
    { key: 'householdId', label: 'Household ID', type: 'text', locked: true },
    { key: 'name', label: 'Name', type: 'text', placeholder: 'e.g. Rent' },
    { key: 'amountCents', label: 'Amount', type: 'cents', placeholder: '1500.00' },
    { key: 'dueDate', label: 'Due Date', type: 'date' },
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'unpaid', label: 'Unpaid' },
      { value: 'paid', label: 'Paid' },
      { value: 'cancelled', label: 'Cancelled' },
    ]},
    { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Optional notes...' },
    { key: 'categoryId', label: 'Category ID', type: 'text', placeholder: 'UUID (optional)' },
    { key: 'accountId', label: 'Account ID', type: 'text', placeholder: 'UUID (optional)' },
    { key: 'isRecurring', label: 'Recurring', type: 'boolean' },
    { key: 'frequency', label: 'Frequency', type: 'select', options: [
      { value: 'weekly', label: 'Weekly' },
      { value: 'biweekly', label: 'Biweekly' },
      { value: 'monthly', label: 'Monthly' },
      { value: 'quarterly', label: 'Quarterly' },
      { value: 'yearly', label: 'Yearly' },
    ]},
    { key: 'endDate', label: 'End Date', type: 'date' },
    { key: 'maxOccurrences', label: 'Max Occurrences', type: 'number', placeholder: '12' },
    { key: 'payScheduleId', label: 'Pay Schedule ID', type: 'text', placeholder: 'UUID (optional)' },
    { key: 'paycheckDate', label: 'Paycheck Date', type: 'date' },
    { key: 'ownerId', label: 'Owner ID', type: 'text', locked: true },
  ],

  categories: [
    { key: 'householdId', label: 'Household ID', type: 'text', locked: true },
    { key: 'name', label: 'Name', type: 'text', placeholder: 'e.g. Groceries' },
    { key: 'icon', label: 'Icon', type: 'text', placeholder: '🛒' },
    { key: 'color', label: 'Color', type: 'text', placeholder: '#4ade80' },
    { key: 'monthlyBudgetCents', label: 'Monthly Budget', type: 'cents', placeholder: '500.00' },
    { key: 'rolloverEnabled', label: 'Rollover Unused Budget', type: 'boolean' },
    { key: 'emergencyFund', label: 'Emergency Fund', type: 'boolean' },
  ],

  'charge-descriptors': [
    { key: 'householdId', label: 'Household ID', type: 'text', locked: true },
    { key: 'name', label: 'Name', type: 'text', placeholder: 'e.g. Grocery Run' },
    { key: 'description', label: 'Description', type: 'text', placeholder: 'Optional details...' },
    { key: 'defaultCategoryId', label: 'Default Category ID', type: 'text', placeholder: 'UUID (optional)' },
    { key: 'isActive', label: 'Active', type: 'boolean' },
  ],

  'credit-cards': [
    { key: 'householdId', label: 'Household ID', type: 'text', locked: true },
    { key: 'accountId', label: 'Account ID', type: 'text', placeholder: 'UUID' },
    { key: 'creditLimitCents', label: 'Credit Limit', type: 'cents', placeholder: '5000.00' },
    { key: 'interestRateApy', label: 'Interest Rate (APY)', type: 'cents', placeholder: '24.99' },
    { key: 'statementClosingDay', label: 'Statement Closing Day', type: 'number', placeholder: '15' },
    { key: 'paymentDueDay', label: 'Payment Due Day', type: 'number', placeholder: '5' },
    { key: 'nextStatementDate', label: 'Next Statement Date', type: 'date' },
  ],

  'installment-plans': [
    { key: 'householdId', label: 'Household ID', type: 'text', locked: true },
    { key: 'name', label: 'Name', type: 'text', placeholder: 'e.g. Furniture Payment' },
    { key: 'planType', label: 'Plan Type', type: 'select', options: [
      { value: 'user', label: 'User Created' },
      { value: 'bnpl', label: 'BNPL (Buy Now Pay Later)' },
    ]},
    { key: 'bnplProviderId', label: 'BNPL Provider ID', type: 'text', placeholder: 'UUID from Lenders (Affirm, Klarna, etc.)' },
    { key: 'originalTransactionId', label: 'Original Transaction ID', type: 'text', placeholder: 'UUID of the purchase transaction' },
    { key: 'totalAmountCents', label: 'Total Amount', type: 'cents', placeholder: '2400.00' },
    { key: 'installmentAmountCents', label: 'Per Installment', type: 'cents', placeholder: '200.00' },
    { key: 'totalInstallments', label: 'Total Installments', type: 'number', placeholder: '12' },
    { key: 'remainingInstallments', label: 'Remaining Installments', type: 'number', placeholder: '10' },
    { key: 'frequency', label: 'Frequency', type: 'select', options: [
      { value: 'weekly', label: 'Weekly' },
      { value: 'biweekly', label: 'Biweekly' },
      { value: 'monthly', label: 'Monthly' },
      { value: 'quarterly', label: 'Quarterly' },
      { value: 'yearly', label: 'Yearly' },
    ]},
    { key: 'nextPaymentDate', label: 'Next Payment Date', type: 'date' },
    { key: 'accountId', label: 'Account ID', type: 'text', placeholder: 'UUID (optional)' },
    { key: 'paymentMode', label: 'Payment Mode', type: 'select', options: [
      { value: 'manual', label: 'Manual' },
      { value: 'autopay', label: 'Autopay' },
    ]},
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'active', label: 'Active' },
      { value: 'completed', label: 'Completed' },
      { value: 'cancelled', label: 'Cancelled' },
    ]},
  ],

  'linked-accounts': [
    { key: 'userId', label: 'User ID', type: 'text', locked: true },
    { key: 'householdId', label: 'Household ID', type: 'text', locked: true },
    { key: 'providerId', label: 'Provider ID', type: 'text' },
    { key: 'paymentMethodId', label: 'Payment Method ID', type: 'text', placeholder: 'UUID (optional)' },
    { key: 'emailAttached', label: 'Email', type: 'text', placeholder: 'account@email.com' },
    { key: 'membershipStartDate', label: 'Membership Start Date', type: 'date' },
    { key: 'membershipEndDate', label: 'Membership End Date', type: 'date' },
    { key: 'subscriptionId', label: 'Subscription ID', type: 'text', placeholder: 'UUID (optional)' },
    { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Additional notes...' },
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'active', label: 'Active' },
      { value: 'cancelled', label: 'Cancelled' },
      { value: 'expired', label: 'Expired' },
      { value: 'pending', label: 'Pending' },
    ]},
  ],

  'pairing-rules': [
    { key: 'householdId', label: 'Household ID', type: 'text', locked: true },
    { key: 'pattern', label: 'Pattern (match description)', type: 'text', placeholder: 'e.g. AMAZON*' },
    { key: 'targetProviderId', label: 'Target Provider ID', type: 'text', placeholder: 'UUID (optional)' },
    { key: 'targetCategoryId', label: 'Target Category ID', type: 'text', placeholder: 'UUID (optional)' },
    { key: 'autoConfirm', label: 'Auto Confirm', type: 'boolean' },
    { key: 'ownerId', label: 'Owner ID', type: 'text', locked: true },
    { key: 'visibility', label: 'Visibility', type: 'select', options: [
      { value: 'private', label: 'Private' },
      { value: 'household', label: 'Household' },
      { value: 'public', label: 'Public' },
    ]},
    { key: 'ruleType', label: 'Rule Type', type: 'select', options: [
      { value: 'manual', label: 'Manual' },
      { value: 'smart_biller', label: 'Smart Biller' },
      { value: 'auto_learned', label: 'Auto Learned' },
    ]},
  ],

  'pay-schedules': [
    { key: 'householdId', label: 'Household ID', type: 'text', locked: true },
    { key: 'userId', label: 'User ID', type: 'text', locked: true },
    { key: 'name', label: 'Name', type: 'text', placeholder: 'e.g. Biweekly Paycheck' },
    { key: 'frequency', label: 'Frequency', type: 'select', options: [
      { value: 'weekly', label: 'Weekly' },
      { value: 'biweekly', label: 'Biweekly' },
      { value: 'semi_monthly', label: 'Semi-Monthly' },
      { value: 'monthly', label: 'Monthly' },
    ]},
    { key: 'nextPayDate', label: 'Next Pay Date', type: 'date' },
    { key: 'estimatedAmountCents', label: 'Estimated Amount', type: 'cents', placeholder: '2500.00' },
    { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Optional notes...' },
    { key: 'semiMonthlyDay1', label: 'Semi-Monthly Day 1', type: 'number', placeholder: '15' },
    { key: 'semiMonthlyDay2', label: 'Semi-Monthly Day 2', type: 'number', placeholder: '30' },
  ],

  'payment-methods': [
    { key: 'userId', label: 'User ID', type: 'text', locked: true },
    { key: 'householdId', label: 'Household ID', type: 'text', locked: true },
    { key: 'name', label: 'Name', type: 'text', placeholder: 'e.g. Visa ****1234' },
    { key: 'type', label: 'Type', type: 'select', options: [
      { value: 'credit_card', label: 'Credit Card' },
      { value: 'debit_card', label: 'Debit Card' },
      { value: 'bank_account', label: 'Bank Account' },
      { value: 'paypal', label: 'PayPal' },
      { value: 'apple_pay', label: 'Apple Pay' },
      { value: 'google_pay', label: 'Google Pay' },
      { value: 'other', label: 'Other' },
    ]},
    { key: 'lastFour', label: 'Last 4 Digits', type: 'text', placeholder: '1234' },
    { key: 'brandingUrl', label: 'Branding URL', type: 'text', placeholder: 'https://...' },
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
    ]},
  ],

  subscriptions: [
    { key: 'householdId', label: 'Household ID', type: 'text', locked: true },
    { key: 'name', label: 'Name', type: 'text', placeholder: 'e.g. Netflix' },
    { key: 'amountCents', label: 'Amount', type: 'cents', placeholder: '15.99' },
    { key: 'billingCycle', label: 'Billing Cycle', type: 'select', options: [
      { value: 'weekly', label: 'Weekly' },
      { value: 'monthly', label: 'Monthly' },
      { value: 'quarterly', label: 'Quarterly' },
      { value: 'semi_annual', label: 'Semi-Annual' },
      { value: 'yearly', label: 'Yearly' },
    ]},
    { key: 'nextBillingDate', label: 'Next Billing Date', type: 'date' },
    { key: 'endDate', label: 'End Date', type: 'date' },
    { key: 'maxOccurrences', label: 'Max Occurrences', type: 'number', placeholder: '12' },
    { key: 'trialEndDate', label: 'Trial End Date', type: 'date' },
    { key: 'isTrial', label: 'Is Trial', type: 'boolean' },
    { key: 'categoryId', label: 'Category ID', type: 'text', placeholder: 'UUID (optional)' },
    { key: 'accountId', label: 'Account ID', type: 'text', placeholder: 'UUID (optional)' },
    { key: 'paymentMode', label: 'Payment Mode', type: 'select', options: [
      { value: 'manual', label: 'Manual' },
      { value: 'autopay', label: 'Autopay' },
    ]},
    { key: 'ownerId', label: 'Owner ID', type: 'text', locked: true },
    { key: 'payScheduleId', label: 'Pay Schedule ID', type: 'text', placeholder: 'UUID (optional)' },
    { key: 'paycheckDate', label: 'Paycheck Date', type: 'date' },
  ],

  lenders: [
    { key: 'name', label: 'Name', type: 'text', placeholder: 'e.g. Netflix' },
    { key: 'visibility', label: 'Visibility', type: 'select', options: [
      { value: 'private', label: 'Private' },
      { value: 'household', label: 'Household' },
      { value: 'public', label: 'Public' },
    ]},
    { key: 'householdId', label: 'Household ID', type: 'text', locked: true },
    { key: 'billingProcessorId', label: 'Billing Processor ID', type: 'text', placeholder: 'UUID (optional)' },
    { key: 'billerId', label: 'Biller ID', type: 'text', placeholder: 'UUID (optional)' },
    { key: 'createdBy', label: 'Created By', type: 'text', locked: true },
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
    ]},
    { key: 'iconUrl', label: 'Icon URL', type: 'text', placeholder: 'https://...' },
    { key: 'defaultCategoryId', label: 'Default Category ID', type: 'text', placeholder: 'UUID (optional)' },
    { key: 'defaultDueDate', label: 'Default Due Date', type: 'date' },
  ],
}

export function getFieldDefs(type: string): FieldDef[] {
  return FIELD_DEFS[type as EntityType] || []
}
