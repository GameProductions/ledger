-- LEDGER v3.15.0 Identity Modulation Migration
-- Aligning user_identities with the new modular v3 naming conventions

PRAGMA defer_foreign_keys=TRUE;

-- 1. Create the new modulated user_identities table
CREATE TABLE IF NOT EXISTS user_identities_new (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    provider_user_id TEXT NOT NULL,
    email TEXT,
    name TEXT,
    avatar_url TEXT,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at DATETIME, -- Modulated Name
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, provider_user_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 2. Migrate existing data (expires_at -> token_expires_at)
INSERT INTO user_identities_new (
    id, user_id, provider, provider_user_id, email, name, avatar_url, access_token, refresh_token, token_expires_at, created_at, updated_at
)
SELECT 
    id, user_id, provider, provider_user_id, email, name, avatar_url, access_token, refresh_token, expires_at, created_at, updated_at 
FROM user_identities;

-- 3. Swap tables
DROP TABLE user_identities;
ALTER TABLE user_identities_new RENAME TO user_identities;

PRAGMA foreign_key_check;
