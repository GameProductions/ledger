-- Migration: Catch-up schema drift — columns added to Drizzle schema but never migrated

-- BNPL columns for installment_plans (0002)
ALTER TABLE installment_plans ADD COLUMN IF NOT EXISTS plan_type text DEFAULT 'user';
ALTER TABLE installment_plans ADD COLUMN IF NOT EXISTS bnpl_provider_id text;
ALTER TABLE installment_plans ADD COLUMN IF NOT EXISTS original_transaction_id text;

-- External Contacts & Shared Access (0005)
CREATE TABLE IF NOT EXISTS external_contacts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  scope TEXT DEFAULT 'private',
  household_id TEXT REFERENCES households(id) ON DELETE CASCADE,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ext_contacts_household ON external_contacts(household_id);
CREATE INDEX IF NOT EXISTS idx_ext_contacts_creator ON external_contacts(created_by);

CREATE TABLE IF NOT EXISTS shared_access (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  contact_label TEXT NOT NULL,
  visibility_scope TEXT DEFAULT 'name_only',
  permission TEXT DEFAULT 'view',
  expires_at TEXT,
  last_accessed_at TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_shared_access_token ON shared_access(token);
CREATE INDEX IF NOT EXISTS idx_shared_access_target ON shared_access(target_type, target_id);

-- Bills missing columns
ALTER TABLE bills ADD COLUMN IF NOT EXISTS end_date text;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS max_occurrences integer;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'household';
ALTER TABLE bills ADD COLUMN IF NOT EXISTS public_scope text DEFAULT 'name_only';
ALTER TABLE bills ADD COLUMN IF NOT EXISTS external_contact_id text REFERENCES external_contacts(id) ON DELETE SET NULL;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS pay_schedule_id text;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS paycheck_date text;

-- Subscriptions missing columns
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS end_date text;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS max_occurrences integer;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'household';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS public_scope text DEFAULT 'name_only';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS external_contact_id text REFERENCES external_contacts(id) ON DELETE SET NULL;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS pay_schedule_id text;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS paycheck_date text;
