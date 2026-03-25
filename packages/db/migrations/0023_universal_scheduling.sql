-- Migration: Universal Scheduling & Timezones
-- Adds the core tables for the Universal Scheduling Engine and timezone support.

-- 1. Centralized Schedules Table
CREATE TABLE IF NOT EXISTS schedules (
    id TEXT PRIMARY KEY,
    target_type TEXT NOT NULL, -- 'transaction', 'subscription', 'installment_plan', 'budget_reset'
    target_id TEXT NOT NULL,
    household_id TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    total_installments INTEGER, -- If set, used to calculate end_date
    frequency_type TEXT NOT NULL, -- 'daily', 'weekly', 'biweekly', 'monthly', 'yearly'
    frequency_interval INTEGER DEFAULT 1, -- 'Every X weeks/months'
    day_of_month INTEGER, -- 1-31
    days_of_week TEXT, -- Comma-separated '0-6' (0=Sunday)
    timezone TEXT DEFAULT 'UTC',
    last_run_at DATETIME,
    next_run_at DATETIME NOT NULL,
    status TEXT DEFAULT 'active', -- 'active', 'paused', 'completed', 'cancelled'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (household_id) REFERENCES households(id)
);

-- 2. Schedule History (Audit)
CREATE TABLE IF NOT EXISTS schedule_history (
    id TEXT PRIMARY KEY,
    schedule_id TEXT NOT NULL,
    household_id TEXT NOT NULL,
    occurrence_at DATETIME NOT NULL,
    action_status TEXT NOT NULL, -- 'executed', 'skipped', 'failed'
    details_json TEXT, -- Record transaction ID or error message
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (schedule_id) REFERENCES schedules(id),
    FOREIGN KEY (household_id) REFERENCES households(id)
);

-- 3. User & System Timezone Support
ALTER TABLE users ADD COLUMN timezone TEXT DEFAULT 'UTC';

-- Seed Platform Default Timezone (if not present)
INSERT OR IGNORE INTO system_config (id, key, value, type, description)
VALUES ('conf-tz-01', 'DEFAULT_TIMEZONE', 'America/New_York', 'string', 'Platform-wide fallback timezone');

-- 4. Initial Migration of existing Subscriptions to Schedules (Placeholder/Logic)
-- In a real scenario, we would background-sync these, but for this project 
-- we will start fresh or manually migrate active ones in the service layer.
