ALTER TABLE `transactions` ADD `attention_required` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `transactions` ADD `needs_balance_transfer` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `transactions` ADD `transfer_timing` text;--> statement-breakpoint
ALTER TABLE `transactions` ADD `is_borrowed` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `transactions` ADD `borrow_source` text;--> statement-breakpoint
ALTER TABLE `transactions` ADD `accounted_for` integer DEFAULT false;