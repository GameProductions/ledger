-- Migration: 0004_payment_and_audit.sql

-- Add payment fields to Subscriptions
ALTER TABLE subscriptions ADD COLUMN account_id TEXT REFERENCES accounts(id);
ALTER TABLE subscriptions ADD COLUMN payment_mode TEXT DEFAULT 'manual'; -- 'manual', 'autopay'

-- Add payment fields to Installment Plans (account_id already exists in 0002)
ALTER TABLE installment_plans ADD COLUMN payment_mode TEXT DEFAULT 'manual'; -- 'manual', 'autopay'

-- Ensure audit_logs is robust (already exists but adding indexes for performance)
CREATE INDEX IF NOT EXISTS idx_audit_logs_household ON audit_logs(household_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
