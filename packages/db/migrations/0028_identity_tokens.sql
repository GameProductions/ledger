-- Migration: 0028_identity_tokens.sql
-- Store OAuth tokens for provider-specific API interactions (e.g. Google Sheets).

ALTER TABLE user_identities ADD COLUMN access_token TEXT;
ALTER TABLE user_identities ADD COLUMN refresh_token TEXT;
ALTER TABLE user_identities ADD COLUMN token_expires_at DATETIME;
