ALTER TABLE `passkeys` ADD `backed_up` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `passkeys` ADD `last_used_at` text;--> statement-breakpoint
ALTER TABLE `sessions` ADD `passkey_verified_at` text;--> statement-breakpoint
ALTER TABLE `sessions` DROP COLUMN `current_challenge`;