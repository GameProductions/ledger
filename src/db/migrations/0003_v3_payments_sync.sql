-- LEDGER v3.14.0 Synchronization Migration
-- Aligning legacy payment tables with modular v3 architecture

PRAGMA defer_foreign_keys=TRUE;

-- 1. Hardening user_payment_methods
-- We are transitioning from 'last4'/'provider_name' to 'last_four'/'name' and adding household tracking.
DROP TABLE IF EXISTS user_payment_methods_new;
CREATE TABLE user_payment_methods_new (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    household_id TEXT, -- Nullable if not yet assigned
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'credit_card', 'debit_card', 'bank_account', 'paypal', 'apple_pay', 'google_pay', 'other'
    last_four TEXT,
    branding_url TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (household_id) REFERENCES households(id)
);

-- Migrate existing data if any (mapping legacy provider_name -> name, last4 -> last_four)
INSERT INTO user_payment_methods_new (id, user_id, name, type, last_four, created_at)
SELECT id, user_id, IFNULL(provider_name, 'Unknown'), type, last4, created_at FROM user_payment_methods;

DROP TABLE user_payment_methods;
ALTER TABLE user_payment_methods_new RENAME TO user_payment_methods;

-- 2. Hardening user_linked_accounts
-- Syncing with UserLinkedAccountSchema: email_attached, status, membership dates
DROP TABLE IF EXISTS user_linked_accounts_new;
CREATE TABLE user_linked_accounts_new (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    household_id TEXT,
    provider_id TEXT NOT NULL,
    payment_method_id TEXT,
    email_attached TEXT,
    membership_start_date DATE,
    membership_end_date DATE,
    subscription_id TEXT,
    notes TEXT,
    status TEXT DEFAULT 'active', -- 'active', 'cancelled', 'expired', 'pending'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (household_id) REFERENCES households(id),
    FOREIGN KEY (provider_id) REFERENCES service_providers(id),
    FOREIGN KEY (payment_method_id) REFERENCES user_payment_methods(id),
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id)
);

-- Migrate existing data (email -> email_attached, member_since -> membership_start_date, etc.)
INSERT INTO user_linked_accounts_new (id, user_id, provider_id, email_attached, membership_start_date, membership_end_date, payment_method_id, subscription_id, created_at)
SELECT id, user_id, provider_id, email, member_since, member_until, payment_method_id, subscription_id, created_at FROM user_linked_accounts;

DROP TABLE user_linked_accounts;
ALTER TABLE user_linked_accounts_new RENAME TO user_linked_accounts;

-- 3. Cleanup service_providers (Sync legacy 'url' with v3 'website_url')
-- Ensure website_url exists and is populated
DROP TABLE IF EXISTS service_providers_new;
CREATE TABLE service_providers_new (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    website_url TEXT,
    branding_url TEXT,
    icon_url TEXT,
    category_id TEXT,
    metadata TEXT,
    visibility TEXT DEFAULT 'public',
    billing_processor_id TEXT,
    created_by TEXT,
    household_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (billing_processor_id) REFERENCES billing_processors(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (household_id) REFERENCES households(id)
);

INSERT INTO service_providers_new (id, name, website_url, branding_url, icon_url, category_id, metadata, visibility, billing_processor_id, created_by, household_id, created_at)
SELECT id, name, IFNULL(website_url, url), branding_url, icon_url, category_id, metadata, visibility, billing_processor_id, created_by, household_id, created_at FROM service_providers;

DROP TABLE service_providers;
ALTER TABLE service_providers_new RENAME TO service_providers;

PRAGMA foreign_key_check;
