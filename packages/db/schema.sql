-- CASH Database Schema (Cloudflare D1)

-- Households: Multi-tenant containers
CREATE TABLE households (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    currency TEXT DEFAULT 'USD',
    country_code TEXT DEFAULT 'US'
);

-- Users: Core identity
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    password_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User-Household Mapping: Multi-tenancy join
CREATE TABLE user_households (
    user_id TEXT NOT NULL,
    household_id TEXT NOT NULL,
    role TEXT DEFAULT 'member', -- admin, member, readonly
    PRIMARY KEY (user_id, household_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (household_id) REFERENCES households(id)
);

-- Accounts: Financial accounts (Bank, Cash, etc.)
CREATE TABLE accounts (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- e.g., 'checking', 'savings', 'credit', 'cash'
    balance_cents INTEGER DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    FOREIGN KEY (household_id) REFERENCES households(id)
);

-- Categories: Categorization with rollover and budget logic
CREATE TABLE categories (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    monthly_budget_cents INTEGER DEFAULT 0,
    rollover_enabled BOOLEAN DEFAULT FALSE,
    emergency_fund BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (household_id) REFERENCES households(id)
);

-- Pay Schedules: Frequency and next-date logic
CREATE TABLE pay_schedules (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    name TEXT NOT NULL,
    frequency TEXT NOT NULL, -- e.g., 'weekly', 'biweekly', 'monthly'
    next_pay_date DATE,
    estimated_amount_cents INTEGER,
    FOREIGN KEY (household_id) REFERENCES households(id)
);

-- Transactions: The primary ledger
CREATE TABLE transactions (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    category_id TEXT,
    amount_cents INTEGER NOT NULL,
    description TEXT,
    transaction_date DATE DEFAULT (DATE('now')),
    status TEXT DEFAULT 'pending', -- 'pending', 'accounted_for', 'reconciled'
    is_recurring BOOLEAN DEFAULT FALSE,
    receipt_r2_key TEXT,
    FOREIGN KEY (household_id) REFERENCES households(id),
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Shared Balances: Split expense tracking
CREATE TABLE shared_balances (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    from_user_id TEXT NOT NULL,
    to_user_id TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    transaction_id TEXT,
    FOREIGN KEY (household_id) REFERENCES households(id),
    FOREIGN KEY (transaction_id) REFERENCES transactions(id)
);

-- Subscriptions: Trial and recurring service tracking
CREATE TABLE subscriptions (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    name TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    billing_cycle TEXT NOT NULL,
    next_billing_date DATE,
    trial_end_date DATE,
    category_id TEXT,
    FOREIGN KEY (household_id) REFERENCES households(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Holidays: Banking reference
CREATE TABLE holidays (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    name TEXT NOT NULL,
    country_code TEXT DEFAULT 'US'
);

-- Templates: Quick-entry presets
CREATE TABLE templates (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    amount_cents INTEGER,
    category_id TEXT,
    account_id TEXT,
    FOREIGN KEY (household_id) REFERENCES households(id),
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- Audit Logs: Immutable history
CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL, -- 'create', 'update', 'delete'
    old_values_json TEXT,
    new_values_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (household_id) REFERENCES households(id)
);
