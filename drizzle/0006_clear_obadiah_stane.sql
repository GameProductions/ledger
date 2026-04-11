CREATE TABLE `reminders` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`user_id` text NOT NULL,
	`target_id` text NOT NULL,
	`target_type` text NOT NULL,
	`delivery_type` text NOT NULL,
	`delivery_target` text,
	`frequency_days` integer NOT NULL,
	`time_of_day` text DEFAULT '09:00',
	`note` text,
	`is_active` integer DEFAULT true,
	`last_sent_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_reminders_target` ON `reminders` (`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `idx_reminders_user` ON `reminders` (`user_id`);