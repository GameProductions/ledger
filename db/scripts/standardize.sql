-- LEDGER DATABASE STANDARDIZATION
-- Rename legacy snake_case tables to camelCase
-- Rename legacy snake_case columns to camelCase
-- This aligns the production D1 database with the new Drizzle schema

PRAGMA foreign_keys = OFF;

-- 1. Rename Tables
ALTER TABLE admin_invitations RENAME TO adminInvitations;
ALTER TABLE admin_audit_logs RENAME TO adminAuditLogs;
ALTER TABLE audit_logs RENAME TO auditLogs;
ALTER TABLE billing_processors RENAME TO billingProcessors;
ALTER TABLE credit_cards RENAME TO creditCards;
ALTER TABLE external_connections RENAME TO externalConnections;
ALTER TABLE household_invites RENAME TO householdInvites;
ALTER TABLE installment_plans RENAME TO installmentPlans;
ALTER TABLE investment_holdings RENAME TO investmentHoldings;
ALTER TABLE linked_providers RENAME TO linkedProviders;
ALTER TABLE loan_payments RENAME TO loanPayments;
ALTER TABLE notification_settings RENAME TO notificationSettings;
ALTER TABLE password_resets RENAME TO passwordResets;
ALTER TABLE pay_schedules RENAME TO paySchedules;
ALTER TABLE personal_access_tokens RENAME TO personalAccessTokens;
ALTER TABLE personal_loans RENAME TO personalLoans;
ALTER TABLE privacy_cards RENAME TO privacyCards;
ALTER TABLE savings_buckets RENAME TO savingsBuckets;
ALTER TABLE schedule_history RENAME TO scheduleHistory;
ALTER TABLE service_providers RENAME TO serviceProviders;
ALTER TABLE shared_balances RENAME TO sharedBalances;
ALTER TABLE support_issues RENAME TO supportIssues;
ALTER TABLE system_announcements RENAME TO systemAnnouncements;
ALTER TABLE system_audit_logs RENAME TO systemAuditLogs;
ALTER TABLE system_config RENAME TO systemConfig;
ALTER TABLE system_feature_flags RENAME TO systemFeatureFlags;
ALTER TABLE system_registry RENAME TO systemRegistry;
ALTER TABLE system_walkthroughs RENAME TO systemWalkthroughs;
ALTER TABLE transaction_timeline RENAME TO transactionTimeline;
ALTER TABLE user_households RENAME TO userHouseholds;
ALTER TABLE user_identities RENAME TO userIdentities;
ALTER TABLE user_linked_accounts RENAME TO userLinkedAccounts;
ALTER TABLE user_onboarding RENAME TO userOnboarding;
ALTER TABLE user_payment_methods RENAME TO userPaymentMethods;
ALTER TABLE user_preferences RENAME TO userPreferences;
ALTER TABLE webhook_delivery_logs RENAME TO webhookDeliveryLogs;
ALTER TABLE totp_credentials RENAME TO totpCredentials;
ALTER TABLE liability_splits RENAME TO liabilitySplits;
ALTER TABLE pay_exceptions RENAME TO payExceptions;
ALTER TABLE transaction_pairing_rules RENAME TO transactionPairingRules;
ALTER TABLE tracked_expenses RENAME TO trackedExpenses;

-- 2. Rename Columns (SQLite 3.25.0+ supports RENAME COLUMN)
-- users
ALTER TABLE users RENAME COLUMN display_name TO displayName;
ALTER TABLE users RENAME COLUMN password_hash TO passwordHash;
ALTER TABLE users RENAME COLUMN avatar_url TO avatarUrl;
ALTER TABLE users RENAME COLUMN global_role TO globalRole;
ALTER TABLE users RENAME COLUMN last_active_at TO lastActiveAt;
ALTER TABLE users RENAME COLUMN force_password_change TO forcePasswordChange;
ALTER TABLE users RENAME COLUMN passkey_verified_at TO passkeyVerifiedAt;
ALTER TABLE users RENAME COLUMN totp_secret TO totpSecret;
ALTER TABLE users RENAME COLUMN totp_enabled TO totpEnabled;
ALTER TABLE users RENAME COLUMN last_login TO lastLogin;
ALTER TABLE users RENAME COLUMN last_seen_version TO lastSeenVersion;
ALTER TABLE users RENAME COLUMN onboarding_completed TO onboardingCompleted;
ALTER TABLE users RENAME COLUMN failed_login_attempts TO failedLoginAttempts;
ALTER TABLE users RENAME COLUMN lockout_until TO lockoutUntil;
ALTER TABLE users RENAME COLUMN backup_codes_json TO backupCodesJson;
ALTER TABLE users RENAME COLUMN password_changed_at TO passwordChangedAt;
ALTER TABLE users RENAME COLUMN preferred_mfa_type TO preferredMfaType;
ALTER TABLE users RENAME COLUMN created_at TO createdAt;
ALTER TABLE users RENAME COLUMN theme_preference TO themePreference;

-- households
ALTER TABLE households RENAME COLUMN created_at TO createdAt;
ALTER TABLE households RENAME COLUMN country_code TO countryCode;
ALTER TABLE households RENAME COLUMN unallocated_balance_cents TO unallocatedBalanceCents;

-- userIdentities
ALTER TABLE userIdentities RENAME COLUMN user_id TO userId;
ALTER TABLE userIdentities RENAME COLUMN provider_user_id TO providerUserId;
ALTER TABLE userIdentities RENAME COLUMN avatar_url TO avatarUrl;
ALTER TABLE userIdentities RENAME COLUMN access_token TO accessToken;
ALTER TABLE userIdentities RENAME COLUMN refresh_token TO refreshToken;
ALTER TABLE userIdentities RENAME COLUMN token_expires_at TO tokenExpiresAt;
ALTER TABLE userIdentities RENAME COLUMN created_at TO createdAt;
ALTER TABLE userIdentities RENAME COLUMN updated_at TO updatedAt;

-- userHouseholds
ALTER TABLE userHouseholds RENAME COLUMN user_id TO userId;
ALTER TABLE userHouseholds RENAME COLUMN household_id TO householdId;

-- accounts
ALTER TABLE accounts RENAME COLUMN household_id TO householdId;
ALTER TABLE accounts RENAME COLUMN balance_cents TO balanceCents;

-- categories
ALTER TABLE categories RENAME COLUMN household_id TO householdId;
ALTER TABLE categories RENAME COLUMN monthly_budget_cents TO monthlyBudgetCents;
ALTER TABLE categories RENAME COLUMN envelope_balance_cents TO envelopeBalanceCents;
ALTER TABLE categories RENAME COLUMN rollover_enabled TO rolloverEnabled;
ALTER TABLE categories RENAME COLUMN rollover_cents TO rolloverCents;
ALTER TABLE categories RENAME COLUMN emergency_fund TO emergencyFund;

-- paySchedules
ALTER TABLE paySchedules RENAME COLUMN household_id TO householdId;
ALTER TABLE paySchedules RENAME COLUMN user_id TO userId;
ALTER TABLE paySchedules RENAME COLUMN next_pay_date TO nextPayDate;
ALTER TABLE paySchedules RENAME COLUMN estimated_amount_cents TO estimatedAmountCents;
ALTER TABLE paySchedules RENAME COLUMN upcoming_amount_cents TO upcomingAmountCents;
ALTER TABLE paySchedules RENAME COLUMN upcoming_effective_date TO upcomingEffectiveDate;
ALTER TABLE paySchedules RENAME COLUMN semi_monthly_day1 TO semiMonthlyDay1;
ALTER TABLE paySchedules RENAME COLUMN semi_monthly_day2 TO semiMonthlyDay2;

-- transactions
ALTER TABLE transactions RENAME COLUMN household_id TO householdId;
ALTER TABLE transactions RENAME COLUMN account_id TO accountId;
ALTER TABLE transactions RENAME COLUMN category_id TO categoryId;
ALTER TABLE transactions RENAME COLUMN amount_cents TO amountCents;
ALTER TABLE transactions RENAME COLUMN transaction_date TO transactionDate;
ALTER TABLE transactions RENAME COLUMN is_recurring TO isRecurring;
ALTER TABLE transactions RENAME COLUMN receipt_r2_key TO receiptR2Key;
ALTER TABLE transactions RENAME COLUMN owner_id TO ownerId;
ALTER TABLE transactions RENAME COLUMN confirmation_number TO confirmationNumber;
ALTER TABLE transactions RENAME COLUMN linked_transaction_id TO linkedTransactionId;
ALTER TABLE transactions RENAME COLUMN reconciliation_status TO reconciliationStatus;
ALTER TABLE transactions RENAME COLUMN raw_description TO rawDescription;
ALTER TABLE transactions RENAME COLUMN parent_id TO parentId;
ALTER TABLE transactions RENAME COLUMN provider_id TO providerId;
ALTER TABLE transactions RENAME COLUMN bill_id TO billId;
ALTER TABLE transactions RENAME COLUMN attention_required TO attentionRequired;
ALTER TABLE transactions RENAME COLUMN needs_balance_transfer TO needsBalanceTransfer;
ALTER TABLE transactions RENAME COLUMN transfer_timing TO transferTiming;
ALTER TABLE transactions RENAME COLUMN is_borrowed TO isBorrowed;
ALTER TABLE transactions RENAME COLUMN borrow_source TO borrowSource;
ALTER TABLE transactions RENAME COLUMN accounted_for TO accountedFor;

-- 3. Clear Migration Log to re-baseline
DELETE FROM d1_migrations;

PRAGMA foreign_keys = ON;
