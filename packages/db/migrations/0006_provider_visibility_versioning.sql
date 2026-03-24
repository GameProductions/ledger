-- Migration: 0006_provider_visibility_versioning.sql
ALTER TABLE service_providers ADD COLUMN visibility TEXT DEFAULT 'public';
ALTER TABLE service_providers ADD COLUMN created_by TEXT REFERENCES users(id);
ALTER TABLE service_providers ADD COLUMN household_id TEXT REFERENCES households(id);

ALTER TABLE user_onboarding ADD COLUMN last_viewed_version TEXT;
