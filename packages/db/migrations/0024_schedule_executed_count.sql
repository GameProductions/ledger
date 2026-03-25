-- Migration: Add executed_count to schedules
-- Tracks how many times a schedule has been successfully processed.

ALTER TABLE schedules ADD COLUMN executed_count INTEGER DEFAULT 0;
