-- Migration 0006: Real WebAuthn Modernization
-- Adds counter and transports for production-grade passkey security

-- 1. Add counter and transports to passkeys
ALTER TABLE passkeys ADD COLUMN counter INTEGER DEFAULT 0;
ALTER TABLE passkeys ADD COLUMN transports TEXT; -- JSON string of transports (usb, nfc, ble, internal)

-- 2. Schema Upgrade Note
-- The passkeys table is now prepared for Real WebAuthn (v3)
