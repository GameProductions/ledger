CREATE TABLE `tracked_expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`description` text NOT NULL,
	`notes` text,
	`status` text DEFAULT 'pending',
	`attention_required` integer DEFAULT false,
	`needs_balance_transfer` integer DEFAULT false,
	`transfer_timing` text,
	`is_borrowed` integer DEFAULT false,
	`borrow_source` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_tracked_expenses_household` ON `tracked_expenses` (`household_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_investment_holdings` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`account_id` text,
	`name` text NOT NULL,
	`asset_type` text DEFAULT 'misc' NOT NULL,
	`quantity` integer NOT NULL,
	`cost_basis_cents` integer,
	`value_cents` integer NOT NULL,
	`currency` text DEFAULT 'USD',
	`institution_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_investment_holdings`("id", "household_id", "account_id", "name", "asset_type", "quantity", "cost_basis_cents", "value_cents", "currency", "institution_id", "created_at") SELECT "id", "household_id", "account_id", "name", "asset_type", "quantity", "cost_basis_cents", "value_cents", "currency", "institution_id", "created_at" FROM `investment_holdings`;--> statement-breakpoint
DROP TABLE `investment_holdings`;--> statement-breakpoint
ALTER TABLE `__new_investment_holdings` RENAME TO `investment_holdings`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_invest_holdings_household` ON `investment_holdings` (`household_id`);--> statement-breakpoint
CREATE INDEX `idx_invest_holdings_account` ON `investment_holdings` (`account_id`);--> statement-breakpoint
ALTER TABLE `service_providers` ADD `billing_processor_id` text;