ALTER TABLE `passkeys` ADD `backed_up` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `passkeys` ADD `last_used_at` text;