-- Migration: Admin Invitations
CREATE TABLE IF NOT EXISTS admin_invitations (
    token TEXT PRIMARY KEY,
    role TEXT NOT NULL DEFAULT 'super_admin',
    is_claimed INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

-- Index for expiration checks
CREATE INDEX IF NOT EXISTS idx_admin_invitations_expires_at ON admin_invitations(expires_at);
