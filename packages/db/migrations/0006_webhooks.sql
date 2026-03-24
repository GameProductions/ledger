-- Migration 0006_webhooks.sql
CREATE TABLE IF NOT EXISTS webhooks (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  event_list TEXT NOT NULL, -- JSON array or comma-separated
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (household_id) REFERENCES households(id)
);

CREATE INDEX IF NOT EXISTS idx_webhooks_household ON webhooks(household_id);
