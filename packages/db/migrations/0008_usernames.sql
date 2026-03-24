-- Add username column to users table
ALTER TABLE users ADD COLUMN username TEXT UNIQUE;

-- Set initial usernames for existing users (using local part of email)
UPDATE users SET username = SUBSTR(email, 1, INSTR(email, '@') - 1) WHERE username IS NULL;

-- Ensure admin has specific username
UPDATE users SET username = 'admin' WHERE id = 'admin-001';
