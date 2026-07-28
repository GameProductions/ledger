-- Migration: Add external contacts, shared access, and visibility columns

-- External Contacts Registry
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

-- Shared Access (share links for external parties)
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

-- Add visibility and external contact columns to bills
ALTER TABLE bills ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'household';
ALTER TABLE bills ADD COLUMN IF NOT EXISTS public_scope TEXT DEFAULT 'name_only';
ALTER TABLE bills ADD COLUMN IF NOT EXISTS external_contact_id TEXT REFERENCES external_contacts(id) ON DELETE SET NULL;

-- Add visibility and external contact columns to subscriptions
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'household';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS public_scope TEXT DEFAULT 'name_only';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS external_contact_id TEXT REFERENCES external_contacts(id) ON DELETE SET NULL;
