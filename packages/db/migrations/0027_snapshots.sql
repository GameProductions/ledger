-- Migration: 0027_snapshots.sql
-- Support for secure, read-only shareable financial snapshots.

CREATE TABLE data_snapshots (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    snapshot_name TEXT NOT NULL,
    data_json TEXT NOT NULL, -- Compressed or raw JSON of the report state
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (household_id) REFERENCES households(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_snapshots_household ON data_snapshots(household_id);
