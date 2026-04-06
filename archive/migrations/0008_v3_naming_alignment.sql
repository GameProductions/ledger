-- Migration 0008: v3 Naming Alignment & Production Convergence
-- Author: Antigravity
-- Status: Draft

-- 1. System Config Alignment (Plural -> Singular)
CREATE TABLE IF NOT EXISTS system_config (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
    config_key TEXT NOT NULL UNIQUE,
    config_value TEXT,
    value_type TEXT DEFAULT 'string',
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Migrate data from legacy system_configs
INSERT OR IGNORE INTO system_config (config_key, config_value, created_at, updated_at)
SELECT key, value_json, updated_at, updated_at FROM system_configs;

-- 2. Audit Trail Standardization
-- Transition from pcc_audit_logs to audit_logs (Canonical)
CREATE TABLE IF NOT EXISTS system_audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL, 
    target TEXT NOT NULL, 
    details_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 3. Production Missing Tables (Catch-up from schema_full)
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

CREATE TABLE IF NOT EXISTS admin_invitations (
    token TEXT PRIMARY KEY,
    role TEXT NOT NULL DEFAULT 'super_admin',
    is_claimed INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

-- 4. Cleanup (Optional, commented out for safety)
-- DROP TABLE system_configs;
