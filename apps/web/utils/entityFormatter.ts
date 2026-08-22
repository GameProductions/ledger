/**
 * Resolves technical database entity/table keys into polished, human-readable display names.
 */
export function formatEntityTitle(targetType?: string | null): string {
  if (!targetType) return 'Item';

  const normalized = targetType.toLowerCase().trim();
  
  const entityMap: Record<string, string> = {
    // Financial Entities
    'transactions': 'Transaction',
    'transaction': 'Transaction',
    'accounts': 'Financial Account',
    'account': 'Financial Account',
    'categories': 'Budget Category',
    'category': 'Budget Category',
    'bills': 'Household Bill',
    'bill': 'Household Bill',
    'subscriptions': 'Subscription Renewal',
    'subscription': 'Subscription Renewal',
    'pay_schedules': 'Pay Schedule',
    'pay_schedule': 'Pay Schedule',
    'pay_exceptions': 'Pay Exception',
    'pay_exception': 'Pay Exception',
    'tracked_expenses': 'Tracked Expense',
    'tracked_expense': 'Tracked Expense',
    'installment_plans': 'Installment Plan',
    'installment_plan': 'Installment Plan',
    'budgets': 'Household Budget',
    'budget': 'Household Budget',
    'loans': 'Loan Account',
    'loan': 'Loan Account',
    'external_contacts': 'External Contact',
    'external_contact': 'External Contact',
    'charge_descriptors': 'Merchant Descriptor',
    'charge_descriptor': 'Merchant Descriptor',
    'merchants': 'Merchant Profile',
    'merchant': 'Merchant Profile',
    'service_providers': 'Service Provider',
    'service_provider': 'Service Provider',
    'payment_methods': 'Payment Method',
    'payment_method': 'Payment Method',
    
    // Auth & Identity
    'users': 'User Account',
    'user': 'User Account',
    'households': 'Household Group',
    'household': 'Household Group',
    'passkeys': 'Security Passkey',
    'passkey': 'Security Passkey',
    'sessions': 'User Session',
    'session': 'User Session',
    'system_announcements': 'System Announcement',
    'announcement': 'System Announcement',
    'system': 'System Core'
  };

  if (entityMap[normalized]) {
    return entityMap[normalized];
  }

  // Fallback: capitalize snake_case and strip plural 's'
  return normalized
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

/**
 * Formats a user reference into a clean Display Name with optional username in parentheses.
 * e.g. "Jane Doe (@janedoe)" or "Jane Doe"
 */
export function formatUserDisplayName(
  displayName?: string | null,
  username?: string | null,
  fallback = 'System'
): string {
  if (displayName && displayName.trim()) {
    if (username && username.trim() && !displayName.toLowerCase().includes(username.toLowerCase())) {
      return `${displayName.trim()} (@${username.trim()})`;
    }
    return displayName.trim();
  }
  if (username && username.trim()) {
    return `@${username.trim()}`;
  }
  return fallback;
}
