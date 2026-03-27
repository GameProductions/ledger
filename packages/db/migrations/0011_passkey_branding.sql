-- Migration: Expand Passkey Metadata & Password Lifecycle (v2.4.0)
ALTER TABLE passkeys ADD COLUMN name TEXT;
ALTER TABLE passkeys ADD COLUMN aaguid TEXT;

-- Password Lifecycle
ALTER TABLE users ADD COLUMN force_password_change INTEGER DEFAULT 0;

CREATE TABLE password_resets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    is_used INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
