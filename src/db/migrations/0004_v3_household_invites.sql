-- LEDGER v3.14.1 Household Invitation System
-- Adding support for secure, token-based household invites

PRAGMA defer_foreign_keys=TRUE;

CREATE TABLE IF NOT EXISTS household_invites (
    id TEXT PRIMARY KEY, -- Token (UUID)
    household_id TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'expired'
    FOREIGN KEY (household_id) REFERENCES households(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_household_invites_status ON household_invites(status);
CREATE INDEX IF NOT EXISTS idx_household_invites_expiry ON household_invites(expires_at);
