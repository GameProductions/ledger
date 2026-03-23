-- Migration: Add Financial Models (BNPL, Revolving, Variable, Milestone)
-- Current Date: 2026-03-23

-- 1. Installment Plans (Affirm, Klarna, etc.)
CREATE TABLE IF NOT EXISTS installment_plans (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    name TEXT NOT NULL,
    total_amount_cents INTEGER NOT NULL,
    installment_amount_cents INTEGER NOT NULL,
    total_installments INTEGER NOT NULL,
    remaining_installments INTEGER NOT NULL,
    frequency TEXT NOT NULL, -- weekly, bi-weekly, monthly
    next_payment_date DATE NOT NULL,
    category_id TEXT,
    account_id TEXT,
    status TEXT DEFAULT 'active', -- active, completed, paid_off
    FOREIGN KEY (household_id) REFERENCES households(id),
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- 2. Credit Cards (Revolving Credit)
CREATE TABLE IF NOT EXISTS credit_cards (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    account_id TEXT NOT NULL, -- Links to an account of type 'credit'
    credit_limit_cents INTEGER NOT NULL,
    interest_rate_apy REAL,
    statement_closing_day INTEGER, -- Day of month (1-31)
    payment_due_day INTEGER, -- Day of month (1-31)
    next_statement_date DATE,
    FOREIGN KEY (household_id) REFERENCES households(id),
    FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- 3. Variable Recurring Schedules (Utilities)
CREATE TABLE IF NOT EXISTS variable_schedules (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    name TEXT NOT NULL,
    avg_amount_cents INTEGER NOT NULL,
    buffer_cents INTEGER DEFAULT 0,
    due_day INTEGER NOT NULL, -- Day of month
    category_id TEXT,
    FOREIGN KEY (household_id) REFERENCES households(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- 4. Milestone Payments (Project-based)
CREATE TABLE IF NOT EXISTS milestone_plans (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    name TEXT NOT NULL,
    total_amount_cents INTEGER NOT NULL,
    status TEXT DEFAULT 'active',
    FOREIGN KEY (household_id) REFERENCES households(id)
);

CREATE TABLE IF NOT EXISTS milestone_installments (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    name TEXT NOT NULL, -- e.g., 'Deposit', 'Delivery'
    amount_cents INTEGER NOT NULL,
    due_date DATE,
    status TEXT DEFAULT 'pending', -- pending, paid
    FOREIGN KEY (plan_id) REFERENCES milestone_plans(id)
);

-- 6. External Connections (Method, Arcadia, Plaid, Privacy, Akoya)
CREATE TABLE IF NOT EXISTS external_connections (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    provider TEXT NOT NULL, -- 'method', 'arcadia', 'plaid', 'privacy', 'akoya'
    provider_account_id TEXT,
    access_token TEXT, -- Encrypted or sensitive
    status TEXT DEFAULT 'active', -- active, expired, pending
    last_sync_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (household_id) REFERENCES households(id)
);

-- 7. Privacy.com Virtual Cards
CREATE TABLE IF NOT EXISTS privacy_cards (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    connection_id TEXT NOT NULL,
    last4 TEXT NOT NULL,
    hostname TEXT,
    spend_limit_cents INTEGER,
    spend_limit_duration TEXT, -- 'TRANSACTION', 'MONTHLY', 'ANNUAL', 'FOREVER'
    state TEXT, -- 'OPEN', 'PAUSED', 'CLOSED'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (household_id) REFERENCES households(id),
    FOREIGN KEY (connection_id) REFERENCES external_connections(id)
);

-- 8. Investment Holdings (401k, Individual)
CREATE TABLE IF NOT EXISTS investment_holdings (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    security_id TEXT, -- Isin, Cusip, or Ticker
    name TEXT NOT NULL,
    quantity REAL NOT NULL,
    cost_basis_cents INTEGER,
    current_price_cents INTEGER,
    value_cents INTEGER NOT NULL,
    last_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (household_id) REFERENCES households(id),
    FOREIGN KEY (account_id) REFERENCES accounts(id)
);


-- 11. Credit Monitoring
CREATE TABLE IF NOT EXISTS credit_scores (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    score INTEGER NOT NULL,
    score_type TEXT DEFAULT 'FICO', -- FICO, VantageScore, LendScore
    provider TEXT NOT NULL, -- Array, Plaid, TransUnion
    report_summary_json TEXT, -- Store key attributes (utilization, etc.)
    last_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (household_id) REFERENCES households(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 12. P2P Lending (Money Lent to Others)
CREATE TABLE IF NOT EXISTS personal_loans (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    lender_user_id TEXT NOT NULL,
    borrower_name TEXT NOT NULL,
    borrower_contact TEXT, -- Email or Phone for receipts
    total_amount_cents INTEGER NOT NULL,
    remaining_balance_cents INTEGER NOT NULL,
    interest_rate_apy REAL DEFAULT 0,
    term_months INTEGER,
    origination_date DATE,
    status TEXT DEFAULT 'active', -- active, paid_off, defaulted
    FOREIGN KEY (household_id) REFERENCES households(id),
    FOREIGN KEY (lender_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS loan_payments (
    id TEXT PRIMARY KEY,
    loan_id TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    platform TEXT, -- Venmo, CashApp, PayPal, Zelle
    external_id TEXT, -- Transaction ID from platform
    method TEXT, -- Transfer, Cash, etc.
    receipt_sent_at DATETIME,
    FOREIGN KEY (loan_id) REFERENCES personal_loans(id)
);

-- 13. Sinking Funds Evolution

-- 14. Audit Logs (Security)
CREATE TABLE IF NOT EXISTS system_audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL, -- 'ADD_TOKEN', 'MODIFY_TOKEN', 'DELETE_TOKEN', 'ROLE_CHANGE', 'USER_SUSPEND'
    target TEXT NOT NULL, -- Provider name, Account ID, or User ID
    details_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 15. Global RBAC Evolution
ALTER TABLE users ADD COLUMN global_role TEXT DEFAULT 'user'; -- 'user', 'super_admin'
ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'; -- 'active', 'suspended', 'deactivated'
