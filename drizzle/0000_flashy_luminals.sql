CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`balance_cents` integer DEFAULT 0,
	`currency` text DEFAULT 'USD',
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_accounts_household` ON `accounts` (`household_id`);--> statement-breakpoint
CREATE TABLE `admin_invitations` (
	`token` text PRIMARY KEY NOT NULL,
	`role` text DEFAULT 'super_admin' NOT NULL,
	`is_claimed` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`table_name` text NOT NULL,
	`record_id` text NOT NULL,
	`action` text NOT NULL,
	`old_values_json` text,
	`new_values_json` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `billing_processors` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`website_url` text,
	`branding_url` text,
	`support_url` text,
	`subscription_id_notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`name` text NOT NULL,
	`icon` text,
	`color` text,
	`monthly_budget_cents` integer DEFAULT 0,
	`envelope_balance_cents` integer DEFAULT 0,
	`rollover_enabled` integer DEFAULT false,
	`rollover_cents` integer DEFAULT 0,
	`emergency_fund` integer DEFAULT false,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_categories_household` ON `categories` (`household_id`);--> statement-breakpoint
CREATE TABLE `credit_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`account_id` text NOT NULL,
	`credit_limit_cents` integer NOT NULL,
	`interest_rate_apy` integer,
	`statement_closing_day` integer,
	`payment_due_day` integer,
	`next_statement_date` text,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `external_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`provider` text NOT NULL,
	`access_token` text NOT NULL,
	`status` text DEFAULT 'active',
	`last_sync_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `holidays` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`name` text NOT NULL,
	`country_code` text DEFAULT 'US'
);
--> statement-breakpoint
CREATE TABLE `household_invites` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`created_by` text NOT NULL,
	`status` text DEFAULT 'pending',
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `households` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`currency` text DEFAULT 'USD',
	`country_code` text DEFAULT 'US',
	`unallocated_balance_cents` integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `installment_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`name` text NOT NULL,
	`total_amount_cents` integer NOT NULL,
	`installment_amount_cents` integer NOT NULL,
	`total_installments` integer NOT NULL,
	`remaining_installments` integer NOT NULL,
	`frequency` text NOT NULL,
	`next_payment_date` text NOT NULL,
	`account_id` text,
	`payment_mode` text DEFAULT 'manual',
	`status` text DEFAULT 'active',
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_installments_household` ON `installment_plans` (`household_id`);--> statement-breakpoint
CREATE TABLE `investment_holdings` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`account_id` text NOT NULL,
	`name` text NOT NULL,
	`quantity` integer NOT NULL,
	`value_cents` integer NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `linked_providers` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`service_provider_id` text NOT NULL,
	`account_reference` text,
	`custom_label` text,
	`metadata` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`service_provider_id`) REFERENCES `service_providers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `loan_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`loan_id` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`platform` text,
	`external_id` text,
	`method` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`loan_id`) REFERENCES `personal_loans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `notification_settings` (
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`event` text NOT NULL,
	`enabled` integer DEFAULT false,
	`offset_days` integer DEFAULT 3,
	PRIMARY KEY(`user_id`, `type`, `event`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `passkeys` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`public_key` text NOT NULL,
	`credential_id` text NOT NULL,
	`name` text,
	`aaguid` text,
	`counter` integer DEFAULT 0,
	`transports` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `password_resets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token` text NOT NULL,
	`is_used` integer DEFAULT 0,
	`expires_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pay_schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`name` text NOT NULL,
	`frequency` text NOT NULL,
	`next_pay_date` text,
	`estimated_amount_cents` integer,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pcc_audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`action` text NOT NULL,
	`target` text NOT NULL,
	`target_id` text,
	`details_json` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `personal_access_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`name` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`last_used_at` text,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `personal_loans` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`lender_user_id` text NOT NULL,
	`borrower_name` text NOT NULL,
	`borrower_contact` text,
	`total_amount_cents` integer NOT NULL,
	`remaining_balance_cents` integer NOT NULL,
	`interest_rate_apy` integer DEFAULT 0,
	`term_months` integer,
	`origination_date` text NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lender_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `privacy_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`connection_id` text NOT NULL,
	`last4` text NOT NULL,
	`hostname` text,
	`spend_limit_cents` integer,
	`state` text,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`type` text NOT NULL,
	`period_start` text,
	`period_end` text,
	`data_json` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `savings_buckets` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`name` text NOT NULL,
	`target_cents` integer NOT NULL,
	`current_cents` integer DEFAULT 0,
	`target_date` text,
	`category_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_savings_household` ON `savings_buckets` (`household_id`);--> statement-breakpoint
CREATE TABLE `schedule_history` (
	`id` text PRIMARY KEY NOT NULL,
	`schedule_id` text NOT NULL,
	`household_id` text NOT NULL,
	`occurrence_at` text NOT NULL,
	`action_status` text NOT NULL,
	`details_json` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`target_id` text NOT NULL,
	`target_type` text NOT NULL,
	`frequency` text NOT NULL,
	`next_run_at` text NOT NULL,
	`last_run_at` text,
	`executed_count` integer DEFAULT 0,
	`status` text DEFAULT 'active',
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `service_providers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`visibility` text DEFAULT 'public',
	`household_id` text,
	`created_by` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `shared_balances` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`from_user_id` text NOT NULL,
	`to_user_id` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`transaction_id` text,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`name` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`billing_cycle` text NOT NULL,
	`next_billing_date` text,
	`trial_end_date` text,
	`is_trial` integer DEFAULT false,
	`category_id` text,
	`account_id` text,
	`payment_mode` text DEFAULT 'manual',
	`owner_id` text,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_subscriptions_household` ON `subscriptions` (`household_id`);--> statement-breakpoint
CREATE TABLE `support_issues` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`category` text,
	`priority` text DEFAULT 'medium',
	`status` text DEFAULT 'open',
	`github_issue_url` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `system_announcements` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`content_md` text NOT NULL,
	`priority` text DEFAULT 'info',
	`actor_id` text,
	`is_active` integer DEFAULT true,
	`expires_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `system_audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`action` text NOT NULL,
	`target` text NOT NULL,
	`details_json` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `system_config` (
	`id` text PRIMARY KEY NOT NULL,
	`config_key` text NOT NULL,
	`config_value` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `system_config_config_key_unique` ON `system_config` (`config_key`);--> statement-breakpoint
CREATE TABLE `system_feature_flags` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	`feature_key` text NOT NULL,
	`enabled_globally` integer DEFAULT 0,
	`description` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `system_feature_flags_feature_key_unique` ON `system_feature_flags` (`feature_key`);--> statement-breakpoint
CREATE TABLE `system_registry` (
	`id` text PRIMARY KEY NOT NULL,
	`item_type` text NOT NULL,
	`name` text NOT NULL,
	`logo_url` text,
	`website_url` text,
	`metadata_json` text
);
--> statement-breakpoint
CREATE TABLE `system_walkthroughs` (
	`id` text PRIMARY KEY NOT NULL,
	`version` text NOT NULL,
	`title` text NOT NULL,
	`content_md` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `templates` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`amount_cents` integer,
	`category_id` text,
	`account_id` text,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `transaction_timeline` (
	`id` text PRIMARY KEY NOT NULL,
	`transaction_id` text NOT NULL,
	`type` text NOT NULL,
	`content` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`account_id` text NOT NULL,
	`category_id` text,
	`amount_cents` integer NOT NULL,
	`description` text,
	`transaction_date` text DEFAULT (DATE('now')),
	`status` text DEFAULT 'pending',
	`is_recurring` integer DEFAULT false,
	`receipt_r2_key` text,
	`owner_id` text,
	`confirmation_number` text,
	`linked_transaction_id` text,
	`reconciliation_status` text DEFAULT 'unreconciled',
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_transactions_household` ON `transactions` (`household_id`);--> statement-breakpoint
CREATE INDEX `idx_transactions_account` ON `transactions` (`account_id`);--> statement-breakpoint
CREATE INDEX `idx_transactions_category` ON `transactions` (`category_id`);--> statement-breakpoint
CREATE TABLE `user_households` (
	`user_id` text NOT NULL,
	`household_id` text NOT NULL,
	`role` text DEFAULT 'member',
	PRIMARY KEY(`user_id`, `household_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user_identities` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_user_id` text NOT NULL,
	`email` text,
	`name` text,
	`avatar_url` text,
	`access_token` text,
	`refresh_token` text,
	`token_expires_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_user_identities_unique` ON `user_identities` (`provider`,`provider_user_id`);--> statement-breakpoint
CREATE TABLE `user_linked_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`account_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user_onboarding` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`step_id` text NOT NULL,
	`status` text DEFAULT 'pending',
	`completed_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user_payment_methods` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`token` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user_preferences` (
	`user_id` text NOT NULL,
	`key` text NOT NULL,
	`value` text,
	PRIMARY KEY(`user_id`, `key`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text,
	`display_name` text,
	`username` text,
	`password_hash` text,
	`avatar_url` text,
	`totp_secret` text,
	`totp_enabled` integer DEFAULT 0,
	`global_role` text DEFAULT 'user',
	`status` text DEFAULT 'active',
	`last_active_at` text,
	`settings_json` text,
	`last_viewed_version` text,
	`force_password_change` integer DEFAULT 0,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE TABLE `webhook_delivery_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`webhook_id` text NOT NULL,
	`event` text NOT NULL,
	`status_code` integer DEFAULT 0,
	`error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`webhook_id`) REFERENCES `webhooks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `webhooks` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`url` text NOT NULL,
	`secret` text NOT NULL,
	`event_list` text NOT NULL,
	`is_active` integer DEFAULT true,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action
);
