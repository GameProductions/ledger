-- LEDGER v3.0.1 Evolutionary Leap Migration
-- Finalizing Modular Architecture Tables & Generic Seeding

PRAGMA defer_foreign_keys=TRUE;

-- 1. Create missing v3 modular tables
CREATE TABLE IF NOT EXISTS system_feature_flags (
    id TEXT PRIMARY KEY,
    feature_key TEXT UNIQUE NOT NULL,
    enabled_globally INTEGER DEFAULT 0,
    target_user_ids TEXT, -- JSON array of user IDs
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_registry (
    id TEXT PRIMARY KEY,
    item_type TEXT NOT NULL, -- 'service_provider', 'billing_processor', 'brand'
    name TEXT NOT NULL,
    logo_url TEXT,
    website_url TEXT,
    metadata_json TEXT, -- JSON blob for flexible data
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_onboarding (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    step_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'skipped'
    completed_at DATETIME,
    UNIQUE(user_id, step_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- This table is used in the modular v3 /providers route
CREATE TABLE IF NOT EXISTS linked_providers (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    service_provider_id TEXT NOT NULL,
    account_reference TEXT,
    custom_label TEXT,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (service_provider_id) REFERENCES service_providers(id)
);

-- 2. Generic Seed Data
-- Service Providers
INSERT OR IGNORE INTO service_providers (id, name, website_url, icon_url, visibility) VALUES
('sp-netflix', 'Netflix', 'https://netflix.com', 'https://logo.clearbit.com/netflix.com', 'public'),
('sp-spotify', 'Spotify', 'https://spotify.com', 'https://logo.clearbit.com/spotify.com', 'public'),
('sp-disney', 'Disney+', 'https://disneyplus.com', 'https://logo.clearbit.com/disneyplus.com', 'public'),
('sp-youtube', 'YouTube Premium', 'https://youtube.com', 'https://logo.clearbit.com/youtube.com', 'public'),
('sp-aws', 'Amazon Web Services', 'https://aws.amazon.com', 'https://logo.clearbit.com/aws.amazon.com', 'public'),
('sp-gcp', 'Google Cloud', 'https://cloud.google.com', 'https://logo.clearbit.com/cloud.google.com', 'public'),
('sp-m365', 'Microsoft 365', 'https://microsoft.com', 'https://logo.clearbit.com/microsoft.com', 'public');

-- Billing Processors
INSERT OR IGNORE INTO billing_processors (id, name, website_url) VALUES
('bp-stripe', 'Stripe', 'https://stripe.com'),
('bp-paypal', 'PayPal', 'https://paypal.com'),
('bp-apple', 'Apple App Store', 'https://apple.com'),
('bp-google', 'Google Play', 'https://play.google.com');

-- System Feature Flags
INSERT OR IGNORE INTO system_feature_flags (id, feature_key, enabled_globally) VALUES
('ff-onboarding', 'v3_onboarding', 1),
('ff-pcc-v3', 'pcc_v3', 1);

-- System Configs (Generic)
INSERT OR IGNORE INTO system_configs (id, key, value_json) VALUES
('cfg-app-name', 'app_name', '"GPNet Ledger"'),
('cfg-maint-mode', 'maintenance_mode', 'false'),
('cfg-default-cur', 'default_currency', '"USD"');
