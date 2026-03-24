-- Migration: Add TOTP, Passkeys, and OAuth support
ALTER TABLE users ADD COLUMN totp_secret TEXT;
ALTER TABLE users ADD COLUMN totp_enabled INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN avatar_url TEXT;

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

-- For Session Revocation & Access Logs
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
