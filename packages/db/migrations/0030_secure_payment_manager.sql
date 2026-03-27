-- Migration: 0030_secure_payment_manager.sql
-- Description: Foundation for the Secure Payment Method Manager and enhanced Provider/Processor tracking.

-- 1. Billing Processors (Strictly for payment processing services like Stripe, PayPal, etc.)
CREATE TABLE IF NOT EXISTS billing_processors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    website_url TEXT,
    branding_url TEXT,
    support_url TEXT,
    subscription_id_notes TEXT, -- How to find the subscription ID (e.g. "Look for 'sub_' in your email")
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Service Providers (Enhanced version of the previous service_providers)
CREATE TABLE IF NOT EXISTS providers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    website_url TEXT,
    branding_url TEXT,
    billing_processor_id TEXT,
    is_3rd_party_capable BOOLEAN DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (billing_processor_id) REFERENCES billing_processors(id)
);

-- 3. Personal Payment Methods (User's own cards, accounts, etc.)
CREATE TABLE IF NOT EXISTS user_payment_methods (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    household_id TEXT NOT NULL,
    name TEXT NOT NULL, -- e.g. "Joint Amex Platinum"
    type TEXT NOT NULL, -- credit_card, debit_card, bank_account, paypal, etc.
    last_four TEXT,
    branding_url TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (household_id) REFERENCES households(id)
);

-- 4. User Linked Provider Accounts (Tracks a user's relationship with a provider)
CREATE TABLE IF NOT EXISTS user_linked_accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    household_id TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    payment_method_id TEXT,
    email_attached TEXT,
    membership_start_date DATE,
    membership_end_date DATE,
    subscription_id TEXT, -- Links to a record in the 'subscriptions' table
    notes TEXT,
    status TEXT DEFAULT 'active', -- active, cancelled, expired, pending
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (household_id) REFERENCES households(id),
    FOREIGN KEY (provider_id) REFERENCES providers(id),
    FOREIGN KEY (payment_method_id) REFERENCES user_payment_methods(id),
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id)
);

-- 5. Data Migration (Optional: Populating from legacy tables)
INSERT OR IGNORE INTO providers (id, name, website_url, branding_url)
SELECT id, name, url, icon_url FROM service_providers;

-- Note: We don't automatically migrate linked_providers because the household_id context is critical here and hard to guess without join.
-- Users will be encouraged to re-link or manually update.

-- 6. Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_providers_name ON providers(name);
CREATE INDEX IF NOT EXISTS idx_user_payment_methods_user ON user_payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_user_linked_accounts_user ON user_linked_accounts(user_id, provider_id);

-- 7. Subscriptions Enhancement
ALTER TABLE subscriptions ADD COLUMN provider_account_id TEXT REFERENCES user_linked_accounts(id);

