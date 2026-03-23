-- Migration: Phase 7.1 - Multi-Link Reconciliation
-- Current Date: 2026-03-23

-- 1. Many-to-Many Join Table
CREATE TABLE IF NOT EXISTS transaction_links (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    source_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    amount_cents INTEGER, -- Partial mapping support
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (household_id) REFERENCES households(id),
    FOREIGN KEY (source_id) REFERENCES transactions(id),
    FOREIGN KEY (target_id) REFERENCES transactions(id)
);

-- 2. Add Progress Column to Transactions
ALTER TABLE transactions ADD COLUMN reconciliation_progress_cents INTEGER DEFAULT 0;

-- 3. Indices
CREATE INDEX IF NOT EXISTS idx_link_source ON transaction_links(source_id);
CREATE INDEX IF NOT EXISTS idx_link_target ON transaction_links(target_id);
