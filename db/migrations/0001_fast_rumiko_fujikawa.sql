CREATE TABLE `vault` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`secretType` text NOT NULL,
	`keyIdentifier` text,
	`encryptedData` text NOT NULL,
	`iv` text NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	`lastAccessedAt` text,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_vault_user_id` ON `vault` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_vault_type` ON `vault` (`secretType`);