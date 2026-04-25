ALTER TABLE `bills` ADD `upcoming_amount_cents` integer;--> statement-breakpoint
ALTER TABLE `bills` ADD `upcoming_effective_date` text;--> statement-breakpoint
ALTER TABLE `bills` ADD `owner_id` text REFERENCES users(id);--> statement-breakpoint
CREATE INDEX `idx_bills_owner` ON `bills` (`owner_id`);--> statement-breakpoint
ALTER TABLE `installment_plans` ADD `upcoming_amount_cents` integer;--> statement-breakpoint
ALTER TABLE `installment_plans` ADD `upcoming_effective_date` text;--> statement-breakpoint
ALTER TABLE `pay_schedules` ADD `upcoming_amount_cents` integer;--> statement-breakpoint
ALTER TABLE `pay_schedules` ADD `upcoming_effective_date` text;--> statement-breakpoint
CREATE INDEX `idx_pay_schedules_household` ON `pay_schedules` (`household_id`);--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `upcoming_amount_cents` integer;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `upcoming_effective_date` text;