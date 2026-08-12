ALTER TABLE user_households ADD COLUMN IF NOT EXISTS joined_at text DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE user_households ADD COLUMN IF NOT EXISTS join_method text;
