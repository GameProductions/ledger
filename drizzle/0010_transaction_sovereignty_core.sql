-- Migration 0010: Transaction Sovereignty Core
-- Add confirmation_number to transactions (status already exists)
ALTER TABLE transactions ADD COLUMN confirmation_number TEXT;

-- Create transaction_timeline for historical auditing
CREATE TABLE IF NOT EXISTS transaction_timeline (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
  transaction_id TEXT NOT NULL,
  type TEXT NOT NULL, -- 'note', 'confirmation', 'status_change'
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_timeline_tx ON transaction_timeline(transaction_id);
