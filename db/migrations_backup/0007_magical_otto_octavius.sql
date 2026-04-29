CREATE TABLE `bills` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`name` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`due_date` text NOT NULL,
	`status` text DEFAULT 'unpaid',
	`notes` text,
	`category_id` text,
	`account_id` text,
	`is_recurring` integer DEFAULT false,
	`frequency` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_bills_household` ON `bills` (`household_id`);--> statement-breakpoint
CREATE TABLE `liability_splits` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`target_id` text NOT NULL,
	`target_type` text NOT NULL,
	`originator_user_id` text NOT NULL,
	`assigned_user_id` text NOT NULL,
	`split_type` text NOT NULL,
	`split_value` integer NOT NULL,
	`calculated_amount_cents` integer NOT NULL,
	`override_date` text,
	`override_frequency` text,
	`status` text DEFAULT 'pending',
	`is_master_ledger_public` integer DEFAULT false,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`originator_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_liability_splits_target` ON `liability_splits` (`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `idx_liability_splits_assigned` ON `liability_splits` (`assigned_user_id`);--> statement-breakpoint
CREATE TABLE `pay_exceptions` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`user_id` text NOT NULL,
	`pay_schedule_id` text NOT NULL,
	`original_date` text NOT NULL,
	`override_date` text,
	`override_amount_cents` integer,
	`note` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`pay_schedule_id`) REFERENCES `pay_schedules`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_pay_exceptions_household` ON `pay_exceptions` (`household_id`);--> statement-breakpoint
CREATE INDEX `idx_pay_exceptions_user` ON `pay_exceptions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_pay_exceptions_schedule` ON `pay_exceptions` (`pay_schedule_id`);--> statement-breakpoint
CREATE TABLE `transaction_pairing_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`pattern` text NOT NULL,
	`target_provider_id` text,
	`target_category_id` text,
	`auto_confirm` integer DEFAULT false,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`target_provider_id`) REFERENCES `service_providers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`target_category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `pay_schedules` ADD `user_id` text REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `pay_schedules` ADD `semi_monthly_day_1` integer;--> statement-breakpoint
ALTER TABLE `pay_schedules` ADD `semi_monthly_day_2` integer;--> statement-breakpoint
ALTER TABLE `transactions` ADD `notes` text;--> statement-breakpoint
ALTER TABLE `transactions` ADD `raw_description` text;--> statement-breakpoint
ALTER TABLE `transactions` ADD `parent_id` text;--> statement-breakpoint
ALTER TABLE `transactions` ADD `provider_id` text REFERENCES service_providers(id);--> statement-breakpoint
ALTER TABLE `transactions` ADD `bill_id` text REFERENCES bills(id);--> statement-breakpoint
CREATE INDEX `idx_transactions_parent` ON `transactions` (`parent_id`);--> statement-breakpoint
CREATE INDEX `idx_transactions_provider` ON `transactions` (`provider_id`);