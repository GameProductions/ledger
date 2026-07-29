-- Migration: Add dedicated merchants table for BNPL merchant entity separation

CREATE TABLE IF NOT EXISTS merchants (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_merchants_household ON merchants(household_id);
