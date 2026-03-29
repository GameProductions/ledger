-- Catch-up Migration for missing v3 tables
CREATE TABLE IF NOT EXISTS households (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    currency TEXT DEFAULT 'USD',
    country_code TEXT DEFAULT 'US'
, unallocated_balance_cents INTEGER DEFAULT 0);
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
    username TEXT,
    last_active_at DATETIME,
    settings_json TEXT,
    last_viewed_version TEXT
);
CREATE TABLE IF NOT EXISTS user_households (
    user_id TEXT NOT NULL,
    household_id TEXT NOT NULL,
    PRIMARY KEY (user_id, household_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (household_id) REFERENCES households(id)
);
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    name TEXT NOT NULL,
    balance_cents INTEGER DEFAULT 0,
    currency TEXT DEFAULT 'USD', currency_code TEXT DEFAULT 'USD',
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
    emergency_fund BOOLEAN DEFAULT FALSE, envelope_balance_cents INTEGER DEFAULT 0, is_envelope BOOLEAN DEFAULT 0,
    FOREIGN KEY (household_id) REFERENCES households(id)
);
CREATE TABLE IF NOT EXISTS pay_schedules (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    name TEXT NOT NULL,
    next_pay_date DATE,
    estimated_amount_cents INTEGER,
    FOREIGN KEY (household_id) REFERENCES households(id)
);
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    category_id TEXT,
    amount_cents INTEGER NOT NULL,
    description TEXT,
    transaction_date DATE DEFAULT (DATE('now')),
    is_recurring BOOLEAN DEFAULT FALSE,
    receipt_r2_key TEXT, linked_to_id TEXT, satisfaction_date DATETIME, reconciliation_status TEXT DEFAULT 'unreconciled', reconciliation_progress_cents INTEGER DEFAULT 0, owner_id TEXT REFERENCES users(id),
    FOREIGN KEY (household_id) REFERENCES households(id),
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);
CREATE TABLE IF NOT EXISTS shared_balances (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    from_user_id TEXT NOT NULL,
    to_user_id TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    transaction_id TEXT,
    FOREIGN KEY (household_id) REFERENCES households(id),
    FOREIGN KEY (transaction_id) REFERENCES transactions(id)
);
CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    name TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    billing_cycle TEXT NOT NULL,
    next_billing_date DATE,
    trial_end_date DATE,
    category_id TEXT, account_id TEXT REFERENCES accounts(id), payment_mode TEXT DEFAULT 'manual', owner_id TEXT REFERENCES users(id),
    FOREIGN KEY (household_id) REFERENCES households(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);
CREATE TABLE IF NOT EXISTS holidays (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    name TEXT NOT NULL,
    country_code TEXT DEFAULT 'US'
);
CREATE TABLE IF NOT EXISTS templates (
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
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    old_values_json TEXT,
    new_values_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (household_id) REFERENCES households(id)
);
CREATE TABLE IF NOT EXISTS personal_access_tokens (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used_at DATETIME,
    FOREIGN KEY (household_id) REFERENCES households(id)
);
CREATE TABLE IF NOT EXISTS webhooks (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    url TEXT NOT NULL,
    secret TEXT,
    events TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (household_id) REFERENCES households(id)
);
CREATE TABLE IF NOT EXISTS savings_buckets (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  name TEXT NOT NULL,
  target_cents INTEGER NOT NULL,
  current_cents INTEGER DEFAULT 0,
  target_date DATETIME,
  category_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (household_id) REFERENCES households(id)
);

CREATE TABLE IF NOT EXISTS user_payment_methods (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    household_id TEXT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    last_four TEXT,
    branding_url TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (household_id) REFERENCES households(id)
);

CREATE TABLE IF NOT EXISTS user_linked_accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    household_id TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    payment_method_id TEXT,
    email_attached TEXT,
    membership_start_date DATE,
    membership_end_date DATE,
    subscription_id TEXT,
    notes TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (household_id) REFERENCES households(id),
    FOREIGN KEY (provider_id) REFERENCES service_providers(id),
    FOREIGN KEY (payment_method_id) REFERENCES user_payment_methods(id)
);
CREATE TABLE IF NOT EXISTS passkeys (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    public_key TEXT NOT NULL,
    credential_id TEXT NOT NULL,
    name TEXT,
    aaguid TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
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
CREATE TABLE IF NOT EXISTS d1_migrations(
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		name       TEXT UNIQUE,
		applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE IF NOT EXISTS installment_plans (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    name TEXT NOT NULL,
    total_amount_cents INTEGER NOT NULL,
    installment_amount_cents INTEGER NOT NULL,
    total_installments INTEGER NOT NULL,
    remaining_installments INTEGER NOT NULL,
    frequency TEXT NOT NULL, 
    next_payment_date DATE NOT NULL,
    category_id TEXT,
    account_id TEXT,
    status TEXT DEFAULT 'active', payment_mode TEXT DEFAULT 'manual', 
    FOREIGN KEY (household_id) REFERENCES households(id),
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (account_id) REFERENCES accounts(id)
);
CREATE TABLE IF NOT EXISTS credit_cards (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    account_id TEXT NOT NULL, 
    credit_limit_cents INTEGER NOT NULL,
    interest_rate_apy REAL,
    statement_closing_day INTEGER, 
    payment_due_day INTEGER, 
    next_statement_date DATE,
    FOREIGN KEY (household_id) REFERENCES households(id),
    FOREIGN KEY (account_id) REFERENCES accounts(id)
);
CREATE TABLE IF NOT EXISTS variable_schedules (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    name TEXT NOT NULL,
    avg_amount_cents INTEGER NOT NULL,
    buffer_cents INTEGER DEFAULT 0,
    due_day INTEGER NOT NULL, 
    category_id TEXT,
    FOREIGN KEY (household_id) REFERENCES households(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);
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
    name TEXT NOT NULL, 
    amount_cents INTEGER NOT NULL,
    due_date DATE,
    status TEXT DEFAULT 'pending', 
    FOREIGN KEY (plan_id) REFERENCES milestone_plans(id)
);
CREATE TABLE IF NOT EXISTS external_connections (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    provider TEXT NOT NULL, 
    provider_account_id TEXT,
    access_token TEXT, 
    status TEXT DEFAULT 'active', 
    last_sync_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (household_id) REFERENCES households(id)
);
CREATE TABLE IF NOT EXISTS privacy_cards (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    connection_id TEXT NOT NULL,
    last4 TEXT NOT NULL,
    hostname TEXT,
    spend_limit_cents INTEGER,
    spend_limit_duration TEXT, 
    state TEXT, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (household_id) REFERENCES households(id),
    FOREIGN KEY (connection_id) REFERENCES external_connections(id)
);
CREATE TABLE IF NOT EXISTS investment_holdings (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    security_id TEXT, 
    name TEXT NOT NULL,
    quantity REAL NOT NULL,
    cost_basis_cents INTEGER,
    current_price_cents INTEGER,
    value_cents INTEGER NOT NULL,
    last_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (household_id) REFERENCES households(id),
    FOREIGN KEY (account_id) REFERENCES accounts(id)
);
CREATE TABLE IF NOT EXISTS credit_scores (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    score INTEGER NOT NULL,
    score_type TEXT DEFAULT 'FICO', 
    provider TEXT NOT NULL, 
    report_summary_json TEXT, 
    last_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (household_id) REFERENCES households(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS personal_loans (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    lender_user_id TEXT NOT NULL,
    borrower_name TEXT NOT NULL,
    borrower_contact TEXT, 
    total_amount_cents INTEGER NOT NULL,
    remaining_balance_cents INTEGER NOT NULL,
    interest_rate_apy REAL DEFAULT 0,
    term_months INTEGER,
    origination_date DATE,
    status TEXT DEFAULT 'active', 
    FOREIGN KEY (household_id) REFERENCES households(id),
    FOREIGN KEY (lender_user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS loan_payments (
    id TEXT PRIMARY KEY,
    loan_id TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    platform TEXT, 
    external_id TEXT, 
    method TEXT, 
    receipt_sent_at DATETIME,
    FOREIGN KEY (loan_id) REFERENCES personal_loans(id)
);
CREATE TABLE IF NOT EXISTS system_audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL, 
    target TEXT NOT NULL, 
    details_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS admin_invitations (
    token TEXT PRIMARY KEY,
    role TEXT NOT NULL DEFAULT 'super_admin',
    is_claimed INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);
CREATE TABLE IF NOT EXISTS user_onboarding (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    step_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    completed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS system_configs (
    id TEXT PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value_json TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (user_id, key),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS notification_settings (
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    event TEXT NOT NULL,
    enabled BOOLEAN DEFAULT 1,
    offset_days INTEGER DEFAULT 3,
    PRIMARY KEY (user_id, type, event),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS service_providers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    url TEXT,
    icon_url TEXT,
    category_id TEXT,
    metadata TEXT,
    visibility TEXT DEFAULT 'public',
    created_by TEXT REFERENCES users(id),
    household_id TEXT REFERENCES households(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);
CREATE TABLE IF NOT EXISTS linked_providers (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    service_provider_id TEXT NOT NULL,
    account_reference TEXT,
    custom_label TEXT,
    metadata TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (service_provider_id) REFERENCES service_providers(id)
);
CREATE TABLE IF NOT EXISTS transaction_links (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    source_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    amount_cents INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (household_id) REFERENCES households(id),
    FOREIGN KEY (source_id) REFERENCES transactions(id),
    FOREIGN KEY (target_id) REFERENCES transactions(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_admin_invitations_expires_at ON admin_invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_service_providers_name ON service_providers(name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_household ON audit_logs(household_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_description ON transactions(description);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
