-- Migration 0009: Add Transaction Notes for Spreadsheet Metadata
-- Author: Antigravity
-- Status: Draft

-- 1. Add notes column to transactions
ALTER TABLE transactions ADD COLUMN notes TEXT;

-- 2. Add notes column to installments (for consistency)
ALTER TABLE installment_plans ADD COLUMN notes TEXT;

-- 3. Add notes column to variable_schedules
ALTER TABLE variable_schedules ADD COLUMN notes TEXT;
