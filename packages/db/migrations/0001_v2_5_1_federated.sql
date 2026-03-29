-- LEDGER Unified v2.5.1 Initialization Migration
-- Consolidated from 0001-0031

PRAGMA defer_foreign_keys=TRUE;

-- -- CORE: Households & Users
CREATE TABLE IF NOT EXISTS households (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    currency TEXT DEFAULT 'USD',
    country_code TEXT DEFAULT 'US',
    unallocated_balance_cents INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    password_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    totp_secret TEXT,
    totp_enabled INTEGER DEFAULT 0,
    avatar_url TEXT,
    global_role TEXT DEFAULT 'user',
    status TEXT DEFAULT 'active',
    username TEXT UNIQUE,
    last_active_at DATETIME,
    settings_json TEXT
);

CREATE TABLE IF NOT EXISTS user_households (
    user_id TEXT NOT NULL,
    household_id TEXT NOT NULL,
    role TEXT DEFAULT 'member',
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (household_id) REFERENCES households(id)
);

CREATE TABLE IF NOT EXISTS user_identities (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    provider_user_id TEXT NOT NULL,
    email TEXT,
    name TEXT,
    avatar_url TEXT,
    access_token TEXT,
    refresh_token TEXT,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, provider_user_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    is_revoked INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ACCOUNTS & CATEGORIES
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    balance_cents INTEGER DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    currency_code TEXT DEFAULT 'USD',
    FOREIGN KEY (household_id) REFERENCES households(id)
);

CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    monthly_budget_cents INTEGER DEFAULT 0,
    rollover_enabled BOOLEAN DEFAULT FALSE,
    emergency_fund BOOLEAN DEFAULT FALSE,
    envelope_balance_cents INTEGER DEFAULT 0,
    is_envelope BOOLEAN DEFAULT 0,
    FOREIGN KEY (household_id) REFERENCES households(id)
);

-- TRANSACTIONS & SCHEDULING
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    category_id TEXT,
    amount_cents INTEGER NOT NULL,
    description TEXT,
    transaction_date DATE DEFAULT (DATE('now')),
    status TEXT DEFAULT 'pending',
    is_recurring BOOLEAN DEFAULT FALSE,
    receipt_r2_key TEXT,
    linked_to_id TEXT,
    satisfaction_date DATETIME,
    reconciliation_status TEXT DEFAULT 'unreconciled',
    reconciliation_progress_cents INTEGER DEFAULT 0,
    owner_id TEXT REFERENCES users(id),
    FOREIGN KEY (household_id) REFERENCES households(id),
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    name TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    billing_cycle TEXT NOT NULL,
    next_billing_date DATE,
    trial_end_date DATE,
    category_id TEXT,
    account_id TEXT REFERENCES accounts(id),
    payment_mode TEXT DEFAULT 'manual',
    owner_id TEXT REFERENCES users(id),
    FOREIGN KEY (household_id) REFERENCES households(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- BILLING & PROVIDERS (v2.5.0)
CREATE TABLE IF NOT EXISTS billing_processors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    website_url TEXT,
    branding_url TEXT,
    support_url TEXT,
    subscription_id_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS service_providers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    url TEXT,
    website_url TEXT, -- Sync with newer structure
    branding_url TEXT,
    icon_url TEXT,
    category_id TEXT,
    metadata TEXT,
    visibility TEXT DEFAULT 'public',
    billing_processor_id TEXT REFERENCES billing_processors(id),
    created_by TEXT REFERENCES users(id),
    household_id TEXT REFERENCES households(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS user_payment_methods (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL, -- card, bank, paypal, crypto, cash
    provider_name TEXT, -- Visa, Chase, Venmo
    last4 TEXT,
    exp_month INTEGER,
    exp_year INTEGER,
    is_default BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS user_linked_accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    email TEXT,
    member_since DATE,
    member_until DATE,
    payment_method_id TEXT REFERENCES user_payment_methods(id),
    subscription_id TEXT REFERENCES subscriptions(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (provider_id) REFERENCES service_providers(id)
);

-- SYSTEM WALKTHROUGHS (v2.5.1)
CREATE TABLE IF NOT EXISTS system_walkthroughs (
    id TEXT PRIMARY KEY,
    version TEXT NOT NULL,
    title TEXT NOT NULL,
    content_md TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- AUDIT & INFRASTRUCTURE
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL,
    old_values_json TEXT,
    new_values_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (household_id) REFERENCES households(id)
);

CREATE TABLE IF NOT EXISTS system_configs (
    id TEXT PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value_json TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- SEED DATA (CORE)
INSERT OR IGNORE INTO "households" ("id","name","created_at","currency","country_code","unallocated_balance_cents") VALUES('household-xyz','Business Expense','2026-03-22 22:19:09','USD','US',0);
INSERT OR IGNORE INTO "households" ("id","name","created_at","currency","country_code","unallocated_balance_cents") VALUES('ledger-main-001','LEDGER Primary','2026-03-24 19:54:52','USD','US',0);
INSERT OR IGNORE INTO "users" ("id","email","display_name","password_hash","created_at","global_role","status","username","settings_json") VALUES('c388400c-26a9-4b0e-b7d7-cdeb7aea18f4','ledger@gameproductions.net','Devon','100000.LeB4A1VHDbeyHXEGJ8BFpw==.RVvp89y3W3trOEISj5LxGJlStXisVP7uQmQO0DUwqeI=','2026-03-24 19:32:31','super_admin','active','morenicano','{"theme":"emerald","ui_style":"default","dashboard_layout":{"smartInsights":true,"savingsBuckets":true,"calendar":true,"recentTransactions":true,"healthScore":true}}');
INSERT OR IGNORE INTO "user_households" ("user_id","household_id","role") VALUES('c388400c-26a9-4b0e-b7d7-cdeb7aea18f4','ledger-main-001','admin');

-- SEED DATA (WALKTHROUGHS)
INSERT OR IGNORE INTO system_walkthroughs (id, version, title, content_md, created_at) VALUES 
('9f23e1-gen-001', 'v1.0.0', 'The CASH Genesis', '# Era 1: CASH Genesis (March 4-15, 2026)\n\nThe platform was initialized as **CASH** (Live Evaluation of Daily Gains & Expense Records), focusing on privacy-first financial tracking.\n\n### Key Accomplishments\n- **R2 Storage Optimization**: Implemented WebP compression for 10GB free tier sustainability.\n- **Automated Maintenance**: Implemented self-cleaning logic for audit logs and sessions.\n- **Security Hardening**: Initial rate limiting and IP-based anti-spam measures.', '2026-03-11 14:00:00'),
('9f23e1-reb-002', 'v1.10.x', 'The Rebranding Era', '# Era 2: The Rebranding (March 24, 2026)\n\nThe project underwent a strategic shift to **LEDGER**, a multi-era financial forensic platform.\n\n### Key Accomplishments\n- **Identity Shift**: Comprehensive rebranding of the entire monorepo.\n- **Dockerization**: Full support for self-hosting via Docker Compose.\n- **Authentication Hardening**: Resolved early JWT and session persistence issues.', '2026-03-24 10:00:00'),
('9f23e1-sov-003', 'v1.30.0', 'The Sovereignty Era', '# Era 3: Sovereignty (March 24-26, 2026)\n\nA core push towards feature parity with historical financial systems.\n\n### Key Accomplishments\n- **Universal Scheduling**: TZ-aware recurring transaction engine.\n- **Feature Parity**: Budget rollovers, subscription trial tracking, and Discord visualizations.\n- **Mobile/Biometric**: v2.4.1 established the initial passkey baseline.', '2026-03-26 12:00:00');

-- INDICES
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_audit_logs_household ON audit_logs(household_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_service_providers_name ON service_providers(name);
