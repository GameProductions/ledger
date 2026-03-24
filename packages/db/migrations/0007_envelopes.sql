-- Migration: Envelope Budgeting
-- Add unallocated_balance_cents to households
ALTER TABLE households ADD COLUMN unallocated_balance_cents INTEGER DEFAULT 0;

-- Add envelope_balance_cents and is_envelope to categories
ALTER TABLE categories ADD COLUMN envelope_balance_cents INTEGER DEFAULT 0;
ALTER TABLE categories ADD COLUMN is_envelope BOOLEAN DEFAULT 0;
