-- Migration: 0026_import_sandbox.sql
-- Adds support for bulk staging and verification of external data.

CREATE TABLE import_sandbox (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    source_filename TEXT,
    raw_data_json TEXT NOT NULL, -- The original row data
    mapped_data_json TEXT,       -- The mapped transaction structure
    status TEXT DEFAULT 'pending', -- 'pending', 'mapping', 'error', 'committed'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (household_id) REFERENCES households(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_sandbox_household_status ON import_sandbox(household_id, status);
