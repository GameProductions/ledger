-- Migration: Add payment method support to subscriptions
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS payment_method_id text;
