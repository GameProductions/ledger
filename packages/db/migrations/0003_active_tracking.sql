-- Migration: Add last_active_at to users
-- Current Date: 2026-03-23

ALTER TABLE users ADD COLUMN last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP;

-- Index for performance in active user counts
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active_at);
