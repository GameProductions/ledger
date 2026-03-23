-- Migration: Phase 7 - Advanced Reconciliation & Discovery
-- Current Date: 2026-03-23

-- 1. Add linking Columns to transactions
ALTER TABLE transactions ADD COLUMN linked_to_id TEXT;
ALTER TABLE transactions ADD COLUMN satisfaction_date DATETIME;
ALTER TABLE transactions ADD COLUMN reconciliation_status TEXT DEFAULT 'unreconciled'; -- 'unreconciled', 'partial', 'reconciled'

-- 2. Add Search Index for performance
CREATE INDEX IF NOT EXISTS idx_transactions_description ON transactions(description);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_linked ON transactions(linked_to_id);

-- 3. Theming System (Phase 8 preparation)
CREATE TABLE IF NOT EXISTS system_configs (
    id TEXT PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value_json TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users ADD COLUMN settings_json TEXT;
