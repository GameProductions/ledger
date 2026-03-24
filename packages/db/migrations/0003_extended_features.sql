-- Migration: 0003_extended_features.sql

-- Universal User Preferences
CREATE TABLE user_preferences (
    user_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (user_id, key),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Notification Settings
CREATE TABLE notification_settings (
    user_id TEXT NOT NULL,
    type TEXT NOT NULL, -- 'email', 'discord', 'push'
    event TEXT NOT NULL, -- 'bill_due', 'budget_exceeded', 'low_balance'
    enabled BOOLEAN DEFAULT 1,
    offset_days INTEGER DEFAULT 3,
    PRIMARY KEY (user_id, type, event),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Service Providers
CREATE TABLE service_providers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    url TEXT,
    icon_url TEXT,
    category_id TEXT,
    metadata TEXT, -- JSON blob for additional info
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Linked User Service Providers
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

-- Index for auto-complete search
CREATE INDEX idx_service_providers_name ON service_providers(name);
