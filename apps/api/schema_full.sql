-- LEDGER Database Schema (Cloudflare D1)
-- Consolidated Full Schema v1.5.7

-- --- CORE INFRASTRUCTURE ---

CREATE TABLE households (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    currency TEXT DEFAULT 'USD',
    country_code TEXT DEFAULT 'US',
    unallocated_balance_cents INTEGER DEFAULT 0
);

CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    password_hash TEXT,
    global_role TEXT DEFAULT 'user', -- 'user', 'super_admin'
    status TEXT DEFAULT 'active', -- 'active', 'suspended', 'deactivated'
    totp_secret TEXT,
    totp_enabled INTEGER DEFAULT 0,
    avatar_url TEXT,
    settings_json TEXT,
    last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_households (
    user_id TEXT NOT NULL,
    household_id TEXT NOT NULL,
    role TEXT DEFAULT 'member', -- admin, member, readonly
    PRIMARY KEY (user_id, household_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (household_id) REFERENCES households(id)
);

-- --- IDENTITY & AUTHENTICATION ---

CREATE TABLE passkeys (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    public_key BLOB NOT NULL,
    credential_id TEXT UNIQUE NOT NULL,
    counter INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE user_identities (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL, -- 'discord', 'google'
    provider_user_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, provider_user_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    is_revoked INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE user_onboarding (
    user_id TEXT PRIMARY KEY,
    completed_steps_json TEXT DEFAULT '[]',
    is_completed BOOLEAN DEFAULT 0,
    last_viewed_version TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE user_preferences (
    user_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (user_id, key),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- --- FINANCIAL CORE ---

CREATE TABLE accounts (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL, 
    balance_cents INTEGER DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    FOREIGN KEY (household_id) REFERENCES households(id)
);

CREATE TABLE categories (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    monthly_budget_cents INTEGER DEFAULT 0,
    rollover_enabled BOOLEAN DEFAULT FALSE,
    emergency_fund BOOLEAN DEFAULT FALSE,
    envelope_balance_cents INTEGER DEFAULT 0,
    is_envelope BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (household_id) REFERENCES households(id)
);

CREATE TABLE transactions (
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
    FOREIGN KEY (household_id) REFERENCES households(id),
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE transaction_links (
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

-- --- SPECIALIZED FINANCIAL MODELS ---

CREATE TABLE subscriptions (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    name TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    billing_cycle TEXT NOT NULL,
    next_billing_date DATE,
    trial_end_date DATE,
    category_id TEXT,
    account_id TEXT,
    payment_mode TEXT DEFAULT 'manual', -- 'manual', 'autopay'
    FOREIGN KEY (household_id) REFERENCES households(id),
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (account_id) REFERENCES accounts(id)
);

CREATE TABLE installment_plans (
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
    payment_mode TEXT DEFAULT 'manual',
    status TEXT DEFAULT 'active',
    FOREIGN KEY (household_id) REFERENCES households(id),
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (account_id) REFERENCES accounts(id)
);

CREATE TABLE credit_cards (
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

CREATE TABLE variable_schedules (
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

CREATE TABLE milestone_plans (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    name TEXT NOT NULL,
    total_amount_cents INTEGER NOT NULL,
    status TEXT DEFAULT 'active',
    FOREIGN KEY (household_id) REFERENCES households(id)
);

CREATE TABLE milestone_installments (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    name TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    due_date DATE,
    status TEXT DEFAULT 'pending',
    FOREIGN KEY (plan_id) REFERENCES milestone_plans(id)
);

-- --- EXTERNAL CONNECTIONS & DATA ---

CREATE TABLE external_connections (
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

CREATE TABLE privacy_cards (
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

CREATE TABLE investment_holdings (
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

CREATE TABLE credit_scores (
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

CREATE TABLE personal_loans (
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

CREATE TABLE loan_payments (
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

-- --- SERVICE PROVIDERS ---

CREATE TABLE service_providers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    url TEXT,
    icon_url TEXT,
    category_id TEXT,
    visibility TEXT DEFAULT 'public',
    created_by TEXT REFERENCES users(id),
    household_id TEXT REFERENCES households(id),
    metadata TEXT,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE linked_providers (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    service_provider_id TEXT NOT NULL,
    account_reference TEXT,
    custom_label TEXT,
    metadata TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (service_provider_id) REFERENCES service_providers(id)
);

-- --- SYSTEM & INFRASTRUCTURE ---

CREATE TABLE audit_logs (
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

CREATE TABLE system_audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT NOT NULL,
    details_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE personal_access_tokens (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used_at DATETIME,
    FOREIGN KEY (household_id) REFERENCES households(id)
);

CREATE TABLE webhooks (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  event_list TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (household_id) REFERENCES households(id)
);

CREATE TABLE system_configs (
    id TEXT PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value_json TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notification_settings (
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    event TEXT NOT NULL,
    enabled BOOLEAN DEFAULT 1,
    offset_days INTEGER DEFAULT 3,
    PRIMARY KEY (user_id, type, event),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE savings_buckets (
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

CREATE TABLE holidays (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    name TEXT NOT NULL,
    country_code TEXT DEFAULT 'US'
);

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

-- --- INDICES ---

CREATE INDEX idx_users_last_active ON users(last_active_at);
CREATE INDEX idx_transactions_description ON transactions(description);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_linked ON transactions(linked_to_id);
CREATE INDEX idx_link_source ON transaction_links(source_id);
CREATE INDEX idx_link_target ON transaction_links(target_id);
CREATE INDEX idx_service_providers_name ON service_providers(name);
CREATE INDEX idx_audit_logs_household ON audit_logs(household_id);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_webhooks_household ON webhooks(household_id);

CREATE TABLE reports (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    type TEXT NOT NULL, 
    period_start DATE,
    period_end DATE,
    data_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (household_id) REFERENCES households(id)
);

CREATE INDEX idx_reports_household_period ON reports(household_id, period_start, period_end);
CREATE INDEX idx_reports_type ON reports(type);

-- --- PCC & SYSTEM (Phase 10+) ---

CREATE TABLE IF NOT EXISTS system_feature_flags (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
    feature_key TEXT NOT NULL UNIQUE,
    enabled_globally INTEGER DEFAULT 0,
    target_user_ids TEXT DEFAULT '[]',
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_config (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
    config_key TEXT NOT NULL UNIQUE,
    config_value TEXT,
    value_type TEXT DEFAULT 'string',
    description TEXT,
    is_public INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_registry (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
    item_type TEXT NOT NULL,
    name TEXT NOT NULL,
    logo_url TEXT,
    website_url TEXT,
    metadata_json TEXT DEFAULT '{}',
    is_enabled INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pcc_audit_logs (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
    admin_id TEXT NOT NULL,
    action_key TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    details_json TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS webhook_delivery_logs (
    id TEXT PRIMARY KEY,
    webhook_id TEXT NOT NULL,
    event TEXT NOT NULL,
    status_code INTEGER DEFAULT 0,
    error TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (webhook_id) REFERENCES webhooks(id)
);

-- --- ADVANCED FEATURES (Phase 20+) ---

CREATE TABLE IF NOT EXISTS schedules (
    id TEXT PRIMARY KEY,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    household_id TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    total_installments INTEGER,
    frequency_type TEXT NOT NULL,
    frequency_interval INTEGER DEFAULT 1,
    day_of_month INTEGER,
    days_of_week TEXT,
    timezone TEXT DEFAULT 'UTC',
    last_run_at DATETIME,
    next_run_at DATETIME NOT NULL,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (household_id) REFERENCES households(id)
);

CREATE TABLE IF NOT EXISTS schedule_history (
    id TEXT PRIMARY KEY,
    schedule_id TEXT NOT NULL,
    household_id TEXT NOT NULL,
    occurrence_at DATETIME NOT NULL,
    action_status TEXT NOT NULL,
    details_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (schedule_id) REFERENCES schedules(id),
    FOREIGN KEY (household_id) REFERENCES households(id)
);

CREATE TABLE IF NOT EXISTS data_snapshots (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    type TEXT NOT NULL,
    data_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    FOREIGN KEY (household_id) REFERENCES households(id)
);

CREATE TABLE IF NOT EXISTS import_sandbox (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    source_filename TEXT,
    raw_data_json TEXT NOT NULL,
    mapped_data_json TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (household_id) REFERENCES households(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_schedules_next_run ON schedules(next_run_at);
CREATE INDEX idx_sandbox_household_status ON import_sandbox(household_id, status);