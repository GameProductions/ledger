ALTER TABLE `accounts` ADD `status` text DEFAULT 'active';--> statement-breakpoint
ALTER TABLE `households` ADD `status` text DEFAULT 'active';--> statement-breakpoint
ALTER TABLE `service_providers` ADD `status` text DEFAULT 'active';--> statement-breakpoint
ALTER TABLE `sessions` ADD `device_name` text;--> statement-breakpoint
ALTER TABLE `sessions` ADD `os` text;--> statement-breakpoint
ALTER TABLE `sessions` ADD `browser` text;--> statement-breakpoint
ALTER TABLE `sessions` ADD `ip_address` text;--> statement-breakpoint
ALTER TABLE `sessions` ADD `last_active_at` text;--> statement-breakpoint
ALTER TABLE `user_payment_methods` ADD `status` text DEFAULT 'active';