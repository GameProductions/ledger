-- 0011: Household onboarding — join codes, invites toggle, join metadata
ALTER TABLE household_invites ADD COLUMN IF NOT EXISTS join_code text;
ALTER TABLE household_invites ADD COLUMN IF NOT EXISTS code_length integer;
ALTER TABLE household_invites ADD COLUMN IF NOT EXISTS reusable boolean DEFAULT true;
ALTER TABLE household_invites ADD COLUMN IF NOT EXISTS disabled_at text;
ALTER TABLE household_invites ADD COLUMN IF NOT EXISTS join_count integer DEFAULT 0;

ALTER TABLE households ADD COLUMN IF NOT EXISTS invites_enabled boolean DEFAULT true NOT NULL;

ALTER TABLE user_households ADD COLUMN IF NOT EXISTS joined_at text;
ALTER TABLE user_households ADD COLUMN IF NOT EXISTS join_method text;

CREATE INDEX IF NOT EXISTS idx_household_invites_join_code ON household_invites (join_code);
CREATE INDEX IF NOT EXISTS idx_user_households_user ON user_households (user_id);

UPDATE user_households SET join_method = 'system' WHERE join_method IS NULL;
UPDATE user_households SET joined_at = COALESCE(joined_at, CURRENT_TIMESTAMP::text) WHERE joined_at IS NULL;
