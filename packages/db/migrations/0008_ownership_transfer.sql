-- Migration: 0008_ownership_transfer.sql
ALTER TABLE subscriptions ADD COLUMN owner_id TEXT REFERENCES users(id);
ALTER TABLE transactions ADD COLUMN owner_id TEXT REFERENCES users(id);
