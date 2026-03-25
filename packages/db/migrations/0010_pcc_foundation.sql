-- PCC Foundation Migration: Feature Flags, System Config, and Registry

-- 1. System Feature Flags
CREATE TABLE IF NOT EXISTS system_feature_flags (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
    feature_key TEXT NOT NULL UNIQUE,
    enabled_globally INTEGER DEFAULT 0, -- 0 = False, 1 = True
    target_user_ids TEXT DEFAULT '[]', -- JSON array of specific user IDs
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. System Global Config (Arbitrary Key-Value Overrides)
CREATE TABLE IF NOT EXISTS system_config (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
    config_key TEXT NOT NULL UNIQUE,
    config_value TEXT,
    value_type TEXT DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
    description TEXT,
    is_public INTEGER DEFAULT 0, -- 1 = Exposed to frontend via non-auth endpoint if needed
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. System Registry (Universal Billers & Categories)
CREATE TABLE IF NOT EXISTS system_registry (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
    item_type TEXT NOT NULL, -- 'biller', 'category'
    name TEXT NOT NULL,
    logo_url TEXT,
    website_url TEXT,
    metadata_json TEXT DEFAULT '{}',
    is_enabled INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. PCC Audit Logs (Administrative Actions)
CREATE TABLE IF NOT EXISTS pcc_audit_logs (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
    admin_id TEXT NOT NULL,
    action_key TEXT NOT NULL, -- e.g., 'TOGGLE_FEATURE', 'UPDATE_CONFIG'
    target_type TEXT, -- e.g., 'USER', 'SYSTEM', 'BILLER'
    target_id TEXT,
    details_json TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial "God Mode" and "Theming" flags
INSERT OR IGNORE INTO system_feature_flags (feature_key, description, enabled_globally) VALUES 
('GOD_MODE_UI_ENABLED', 'Enables the discreet God Mode subtitle in PCC', 1),
('ADVANCED_THEMING_ENABLED', 'Enables the Phase 4 theming engine', 0);

-- Insert initial system config
INSERT OR IGNORE INTO system_config (config_key, config_value, description) VALUES 
('PLATFORM_VERSION', '1.18.0', 'Current system version'),
('DEFAULT_TIMEZONE', 'UTC', 'System-wide default timezone');
