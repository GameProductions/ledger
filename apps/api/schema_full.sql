PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE households (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    currency TEXT DEFAULT 'USD',
    country_code TEXT DEFAULT 'US'
, unallocated_balance_cents INTEGER DEFAULT 0);
INSERT INTO "households" ("id","name","created_at","currency","country_code","unallocated_balance_cents") VALUES('household-xyz','Business Expense','2026-03-22 22:19:09','USD','US',0);
INSERT INTO "households" ("id","name","created_at","currency","country_code","unallocated_balance_cents") VALUES('ledger-main-001','LEDGER Primary','2026-03-24 19:54:52','USD','US',0);
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    password_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
, totp_secret TEXT, totp_enabled INTEGER DEFAULT 0, avatar_url TEXT, global_role TEXT DEFAULT 'user', status TEXT DEFAULT 'active', username TEXT, last_active_at DATETIME, settings_json TEXT);
INSERT INTO "users" ("id","email","display_name","password_hash","created_at","totp_secret","totp_enabled","avatar_url","global_role","status","username","last_active_at","settings_json") VALUES('user-123','yolo@example.com','Administrator',NULL,'2026-03-22 22:19:09',NULL,0,NULL,'user','active','yolo',NULL,NULL);
INSERT INTO "users" ("id","email","display_name","password_hash","created_at","totp_secret","totp_enabled","avatar_url","global_role","status","username","last_active_at","settings_json") VALUES('admin-001','user@example.com','Admin User','100000.iRMQvBSFzYiD3dP/Pv+qEg==.mdZr4+wB46/uZwLB5KmE/zhImQJP3qcEGA07rAYIYts=','2026-03-24 17:50:43',NULL,0,NULL,'user','suspended','admin',NULL,NULL);
INSERT INTO "users" ("id","email","display_name","password_hash","created_at","totp_secret","totp_enabled","avatar_url","global_role","status","username","last_active_at","settings_json") VALUES('c388400c-26a9-4b0e-b7d7-cdeb7aea18f4','ledger@gameproductions.net','Devon','100000.LeB4A1VHDbeyHXEGJ8BFpw==.RVvp89y3W3trOEISj5LxGJlStXisVP7uQmQO0DUwqeI=','2026-03-24 19:32:31',NULL,0,NULL,'super_admin','active','morenicano','2026-03-26 22:28:11','{"theme":"emerald","ui_style":"default","dashboard_layout":{"smartInsights":true,"savingsBuckets":true,"calendar":true,"recentTransactions":true,"healthScore":true}}');
CREATE TABLE user_households (
    user_id TEXT NOT NULL,
    household_id TEXT NOT NULL,
    role TEXT DEFAULT 'member', -- admin, member, readonly
    PRIMARY KEY (user_id, household_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (household_id) REFERENCES households(id)
);
INSERT INTO "user_households" ("user_id","household_id","role") VALUES('user-123','household-xyz','member');
INSERT INTO "user_households" ("user_id","household_id","role") VALUES('admin-001','ledger-main-001','admin');
INSERT INTO "user_households" ("user_id","household_id","role") VALUES('c388400c-26a9-4b0e-b7d7-cdeb7aea18f4','ledger-main-001','admin');
CREATE TABLE accounts (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- e.g., 'checking', 'savings', 'credit', 'cash'
    balance_cents INTEGER DEFAULT 0,
    currency TEXT DEFAULT 'USD', currency_code TEXT DEFAULT 'USD',
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
    emergency_fund BOOLEAN DEFAULT FALSE, envelope_balance_cents INTEGER DEFAULT 0, is_envelope BOOLEAN DEFAULT 0,
    FOREIGN KEY (household_id) REFERENCES households(id)
);
INSERT INTO "categories" ("id","household_id","name","icon","color","monthly_budget_cents","rollover_enabled","emergency_fund","envelope_balance_cents","is_envelope") VALUES('cat-4','household-xyz','Cloud Hosting','☁️','#3b82f6',50000,0,0,0,0);
CREATE TABLE pay_schedules (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    name TEXT NOT NULL,
    frequency TEXT NOT NULL, -- e.g., 'weekly', 'biweekly', 'monthly'
    next_pay_date DATE,
    estimated_amount_cents INTEGER,
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
    status TEXT DEFAULT 'pending', -- 'pending', 'accounted_for', 'reconciled'
    is_recurring BOOLEAN DEFAULT FALSE,
    receipt_r2_key TEXT, linked_to_id TEXT, satisfaction_date DATETIME, reconciliation_status TEXT DEFAULT 'unreconciled', reconciliation_progress_cents INTEGER DEFAULT 0, owner_id TEXT REFERENCES users(id),
    FOREIGN KEY (household_id) REFERENCES households(id),
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);
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
CREATE TABLE subscriptions (
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
INSERT INTO "audit_logs" ("id","household_id","actor_id","table_name","record_id","action","old_values_json","new_values_json","created_at") VALUES('53e3bc07-129a-4720-b335-310d29e7fb3b','ledger-main-001','system','users','admin-001','login',NULL,'{"strategy":"password"}','2026-03-24 20:03:49');
INSERT INTO "audit_logs" ("id","household_id","actor_id","table_name","record_id","action","old_values_json","new_values_json","created_at") VALUES('b3ae7a1f-99b8-4ce0-ba73-ad2bd86c4c12','ledger-main-001','system','users','c388400c-26a9-4b0e-b7d7-cdeb7aea18f4','login',NULL,'{"strategy":"password"}','2026-03-24 20:13:20');
INSERT INTO "audit_logs" ("id","household_id","actor_id","table_name","record_id","action","old_values_json","new_values_json","created_at") VALUES('46a853da-6019-4c0d-aca6-7eefea172440','ledger-main-001','system','users','c388400c-26a9-4b0e-b7d7-cdeb7aea18f4','login',NULL,'{"strategy":"password"}','2026-03-24 20:25:12');
INSERT INTO "audit_logs" ("id","household_id","actor_id","table_name","record_id","action","old_values_json","new_values_json","created_at") VALUES('0b890d06-f804-4ae9-8f56-ffc64b537a2b','ledger-main-001','system','users','c388400c-26a9-4b0e-b7d7-cdeb7aea18f4','login',NULL,'{"strategy":"password"}','2026-03-24 21:38:41');
INSERT INTO "audit_logs" ("id","household_id","actor_id","table_name","record_id","action","old_values_json","new_values_json","created_at") VALUES('7a872c5d-9313-491a-92da-c75eca95cafd','ledger-main-001','c388400c-26a9-4b0e-b7d7-cdeb7aea18f4','users','admin-001','admin_update','{}','{"global_role":"user","status":"active"}','2026-03-24 22:16:20');
INSERT INTO "audit_logs" ("id","household_id","actor_id","table_name","record_id","action","old_values_json","new_values_json","created_at") VALUES('14f8b50c-eb70-4908-8553-e222ae96c801','ledger-main-001','c388400c-26a9-4b0e-b7d7-cdeb7aea18f4','users','admin-001','admin_update','{}','{"global_role":"user","status":"suspended"}','2026-03-24 22:16:24');
INSERT INTO "audit_logs" ("id","household_id","actor_id","table_name","record_id","action","old_values_json","new_values_json","created_at") VALUES('67ff3c4b-0eab-432e-adba-06daaee506e8','ledger-main-001','system','users','c388400c-26a9-4b0e-b7d7-cdeb7aea18f4','login',NULL,'{"strategy":"password"}','2026-03-24 23:46:56');
INSERT INTO "audit_logs" ("id","household_id","actor_id","table_name","record_id","action","old_values_json","new_values_json","created_at") VALUES('fe4e1043-e9cb-414f-9fc8-821a15d660ff','ledger-main-001','system','users','c388400c-26a9-4b0e-b7d7-cdeb7aea18f4','login',NULL,'{"strategy":"password"}','2026-03-24 23:52:14');
INSERT INTO "audit_logs" ("id","household_id","actor_id","table_name","record_id","action","old_values_json","new_values_json","created_at") VALUES('07b99d93-59ca-4c2c-b17b-3b9edc8ba1b0','ledger-main-001','system','users','c388400c-26a9-4b0e-b7d7-cdeb7aea18f4','login',NULL,'{"strategy":"password"}','2026-03-25 01:43:22');
INSERT INTO "audit_logs" ("id","household_id","actor_id","table_name","record_id","action","old_values_json","new_values_json","created_at") VALUES('cf5bce83-ba74-4397-9c29-af5462f968ff','ledger-main-001','system','users','c388400c-26a9-4b0e-b7d7-cdeb7aea18f4','login',NULL,'{"strategy":"password"}','2026-03-26 08:58:45');
INSERT INTO "audit_logs" ("id","household_id","actor_id","table_name","record_id","action","old_values_json","new_values_json","created_at") VALUES('49df0c89-48f3-4dc3-9288-4f6f8ab418f9','ledger-main-001','system','users','c388400c-26a9-4b0e-b7d7-cdeb7aea18f4','login',NULL,'{"strategy":"password"}','2026-03-26 19:10:15');
INSERT INTO "audit_logs" ("id","household_id","actor_id","table_name","record_id","action","old_values_json","new_values_json","created_at") VALUES('1c7f7bb6-3656-4627-af80-9524cb81bea5','ledger-main-001','system','users','c388400c-26a9-4b0e-b7d7-cdeb7aea18f4','login',NULL,'{"strategy":"password"}','2026-03-26 22:26:49');
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
    secret TEXT,
    events TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (household_id) REFERENCES households(id)
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
CREATE TABLE d1_migrations(
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		name       TEXT UNIQUE,
		applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(1,'0001_initial.sql','2026-03-24 17:48:01');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(2,'0002_financial_models.sql','2026-03-24 17:48:01');
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
    status TEXT DEFAULT 'active', payment_mode TEXT DEFAULT 'manual', 
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
CREATE TABLE system_audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL, 
    target TEXT NOT NULL, 
    details_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE admin_invitations (
    token TEXT PRIMARY KEY,
    role TEXT NOT NULL DEFAULT 'super_admin',
    is_claimed INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);
INSERT INTO "admin_invitations" ("token","role","is_claimed","created_at","expires_at") VALUES('WZFqgmU3oqi9KMz8jQN9oceAdAGvjaoR','super_admin',1,'2026-03-24 19:04:53','2026-03-25T19:04:43.027Z');
CREATE TABLE user_onboarding (
    user_id TEXT PRIMARY KEY,
    completed_steps_json TEXT DEFAULT '[]',
    is_completed BOOLEAN DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, last_viewed_version TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
INSERT INTO "user_onboarding" ("user_id","completed_steps_json","is_completed","updated_at","last_viewed_version") VALUES('c388400c-26a9-4b0e-b7d7-cdeb7aea18f4','["welcome","security","vault","accounts","budget","subscriptions"]',1,'2026-03-24 22:07:03','v1.5.8');
INSERT INTO "user_onboarding" ("user_id","completed_steps_json","is_completed","updated_at","last_viewed_version") VALUES('user-123','["skip"]',1,'2026-03-25 01:10:32','v1.5.7');
CREATE TABLE system_configs (
    id TEXT PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value_json TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE user_preferences (
    user_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (user_id, key),
    FOREIGN KEY (user_id) REFERENCES users(id)
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
CREATE TABLE service_providers (
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
DELETE FROM sqlite_sequence;
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('d1_migrations',2);
CREATE UNIQUE INDEX idx_users_username ON users(username);
CREATE INDEX idx_admin_invitations_expires_at ON admin_invitations(expires_at);
CREATE INDEX idx_service_providers_name ON service_providers(name);
CREATE INDEX idx_audit_logs_household ON audit_logs(household_id);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_transactions_description ON transactions(description);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_linked ON transactions(linked_to_id);
CREATE INDEX idx_link_source ON transaction_links(source_id);
CREATE INDEX idx_link_target ON transaction_links(target_id);
CREATE INDEX idx_webhooks_household ON webhooks(household_id);
