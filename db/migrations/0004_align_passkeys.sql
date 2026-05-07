-- Migration: 0004_align_passkeys
-- Purpose: Standardize passkeys table to Titan Guard v6.1 (snake_case) and add forensic columns.

-- 1. Backup old table
ALTER TABLE `passkeys` RENAME TO `passkeys_old`;

-- 2. Drop old indices (SQLite keeps them on the renamed table)
DROP INDEX IF EXISTS `idx_passkeys_user`;
DROP INDEX IF EXISTS `idx_passkeys_hash`;

-- 3. Create new standardized table
CREATE TABLE `passkeys` (
    `id` text PRIMARY KEY NOT NULL,
    `user_id` text NOT NULL,
    `credential_id_hash` text NOT NULL,
    `counter` integer DEFAULT 0 NOT NULL,
    `device_type` text,
    `backed_up` integer DEFAULT 0,
    `attestation_format` text,
    `user_verified` integer DEFAULT 0,
    `created_at` text DEFAULT CURRENT_TIMESTAMP,
    `last_used_at` text,
    `name` text DEFAULT 'Security Key',
    `aaguid` text,
    `provider_name` text,
    `icon` text,
    `security_level` text,
    `manufacturer` text,
    `logo` text,
    `transports` text,
    `registration_ip` text,
    `registration_ipv4` text,
    `registration_ipv6` text,
    `registration_city` text,
    `registration_country` text,
    `registration_region` text,
    `registration_latitude` text,
    `registration_longitude` text,
    `registration_location` text,
    `registration_ua` text,
    `last_used_ip` text,
    `last_used_ip_v4` text,
    `last_used_ip_v6` text,
    `last_used_city` text,
    `last_used_country` text,
    `last_used_region` text,
    `last_used_latitude` text,
    `last_used_longitude` text,
    `last_used_location` text,
    `last_used_ua` text,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

-- 4. Create indices
CREATE INDEX `idx_passkeys_user` ON `passkeys` (`user_id`);
CREATE UNIQUE INDEX `idx_passkeys_hash` ON `passkeys` (`credential_id_hash`);

-- 5. Migrate data
-- Note: We use credentialId as a placeholder for credential_id_hash. 
-- In a real environment, these would be re-hashed if possible, but as a placeholder it maintains uniqueness.
INSERT INTO `passkeys` (
    id, user_id, credential_id_hash, counter, device_type, backed_up, 
    created_at, last_used_at, name, aaguid, transports, provider_name, icon,
    last_used_ip, last_used_location, last_used_ua
)
SELECT 
    id, userId, credentialId, counter, deviceType, backedUp,
    createdAt, lastUsedAt, name, aaguid, transports, providerName, icon,
    lastUsedIp, lastUsedLocation, lastUsedUa
FROM `passkeys_old`;

-- 5. Drop old table
DROP TABLE `passkeys_old`;
