CREATE TABLE `admin_invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text,
	`token_hash` text NOT NULL,
	`role` text NOT NULL,
	`is_claimed` integer DEFAULT 0,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_invitations_token_hash_unique` ON `admin_invitations` (`token_hash`);--> statement-breakpoint
CREATE TABLE `backup_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`code_hash` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`used_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_backup_codes_user` ON `backup_codes` (`user_id`);--> statement-breakpoint
CREATE TABLE `passkey_challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`challenge` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`expires_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `passkeys` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`credential_id_hash` text NOT NULL,
	`counter` integer DEFAULT 0 NOT NULL,
	`device_type` text,
	`backed_up` integer DEFAULT 0,
	`attestation_format` text,
	`user_verified` integer DEFAULT 0,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`last_used_at` text,
	`name` text,
	`aaguid` text,
	`provider_name` text,
	`icon` text,
	`security_level` text,
	`manufacturer` text,
	`logo` text,
	`transports` text,
	`registration_ip` text,
	`registration_ipv4` text,
	`registration_ipv6` text,
	`registration_city` text,
	`registration_country` text,
	`registration_region` text,
	`registration_latitude` text,
	`registration_longitude` text,
	`registration_location` text,
	`registration_ua` text,
	`last_used_ip` text,
	`last_used_ip_v4` text,
	`last_used_ip_v6` text,
	`last_used_city` text,
	`last_used_country` text,
	`last_used_region` text,
	`last_used_latitude` text,
	`last_used_longitude` text,
	`last_used_location` text,
	`last_used_ua` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `passkeys_credential_id_hash_unique` ON `passkeys` (`credential_id_hash`);--> statement-breakpoint
CREATE INDEX `idx_passkeys_user` ON `passkeys` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_passkeys_hash` ON `passkeys` (`credential_id_hash`);--> statement-breakpoint
CREATE TABLE `password_resets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`is_used` integer DEFAULT 0,
	`expires_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_pass_resets_user` ON `password_resets` (`user_id`);--> statement-breakpoint
CREATE TABLE `personal_access_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`name` text,
	`token_hash` text NOT NULL,
	`scopes` text DEFAULT 'READ,WRITE',
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`last_used_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `personal_access_tokens_token_hash_unique` ON `personal_access_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_pat_household` ON `personal_access_tokens` (`household_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`expires_at` text NOT NULL,
	`passkey_verified_at` text,
	`challenge` text,
	`user_agent` text,
	`ip_address` text,
	`ip_v4` text,
	`ip_v6` text,
	`last_active_at` text DEFAULT CURRENT_TIMESTAMP,
	`device_name` text,
	`os` text,
	`browser` text,
	`cf_ray` text,
	`is_persistent` integer DEFAULT 0,
	`location` text,
	`city` text,
	`country` text,
	`region` text,
	`continent` text,
	`latitude` text,
	`longitude` text,
	`cf_ip` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_sessions_user` ON `sessions` (`user_id`);--> statement-breakpoint
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
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_user_identities_user` ON `user_identities` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_user_identities_unique` ON `user_identities` (`provider`,`provider_user_id`);--> statement-breakpoint
CREATE TABLE `user_onboarding` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`step_id` text NOT NULL,
	`status` text DEFAULT 'pending',
	`completed_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_onboarding_user` ON `user_onboarding` (`user_id`);--> statement-breakpoint
CREATE TABLE `user_preferences` (
	`user_id` text NOT NULL,
	`key` text NOT NULL,
	`value` text,
	PRIMARY KEY(`user_id`, `key`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text,
	`display_name` text,
	`username` text NOT NULL,
	`password_hash` text,
	`avatar_url` text,
	`global_role` text DEFAULT 'user',
	`status` text DEFAULT 'active',
	`last_active_at` text,
	`force_password_change` integer DEFAULT 0,
	`passkey_verified_at` text,
	`last_login` text DEFAULT CURRENT_TIMESTAMP,
	`last_seen_version` text DEFAULT '0.0.0',
	`onboarding_completed` integer DEFAULT 0,
	`failed_login_attempts` integer DEFAULT 0,
	`lockout_until` text,
	`password_changed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`timezone` text DEFAULT 'UTC',
	`locale` text DEFAULT 'en-US',
	`theme` text DEFAULT 'system'
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`balance_cents` integer DEFAULT 0,
	`currency` text DEFAULT 'USD',
	`status` text DEFAULT 'active',
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_accounts_household` ON `accounts` (`household_id`);--> statement-breakpoint
CREATE TABLE `billers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`logo_url` text,
	`website` text,
	`industry` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
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
	`upcoming_amount_cents` integer,
	`upcoming_effective_date` text,
	`owner_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_bills_household` ON `bills` (`household_id`);--> statement-breakpoint
CREATE INDEX `idx_bills_owner` ON `bills` (`owner_id`);--> statement-breakpoint
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
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade
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
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_credit_cards_household` ON `credit_cards` (`household_id`);--> statement-breakpoint
CREATE INDEX `idx_credit_cards_account` ON `credit_cards` (`account_id`);--> statement-breakpoint
CREATE TABLE `households` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`currency` text DEFAULT 'USD',
	`country_code` text DEFAULT 'US',
	`unallocated_balance_cents` integer DEFAULT 0,
	`status` text DEFAULT 'active'
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
	`upcoming_amount_cents` integer,
	`upcoming_effective_date` text,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_installments_household` ON `installment_plans` (`household_id`);--> statement-breakpoint
CREATE TABLE `investment_holdings` (
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
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_invest_holdings_household` ON `investment_holdings` (`household_id`);--> statement-breakpoint
CREATE INDEX `idx_invest_holdings_account` ON `investment_holdings` (`account_id`);--> statement-breakpoint
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
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`originator_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assigned_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `reconciliation_proposals` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`primary_transaction_id` text NOT NULL,
	`suggested_transaction_id` text NOT NULL,
	`confidence_score` integer DEFAULT 0,
	`match_reason` text,
	`status` text DEFAULT 'pending',
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`primary_transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`suggested_transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_recon_proposals_household` ON `reconciliation_proposals` (`household_id`);--> statement-breakpoint
CREATE INDEX `idx_recon_proposals_primary` ON `reconciliation_proposals` (`primary_transaction_id`);--> statement-breakpoint
CREATE INDEX `idx_recon_proposals_suggested` ON `reconciliation_proposals` (`suggested_transaction_id`);--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`type` text NOT NULL,
	`period_start` text,
	`period_end` text,
	`data_json` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_reports_household` ON `reports` (`household_id`);--> statement-breakpoint
CREATE TABLE `savings_buckets` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`name` text NOT NULL,
	`target_cents` integer NOT NULL,
	`current_cents` integer DEFAULT 0,
	`target_date` text,
	`category_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_savings_household` ON `savings_buckets` (`household_id`);--> statement-breakpoint
CREATE TABLE `shared_balances` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`from_user_id` text NOT NULL,
	`to_user_id` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`transaction_id` text,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`from_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`to_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_shared_balances_household` ON `shared_balances` (`household_id`);--> statement-breakpoint
CREATE INDEX `idx_shared_balances_transaction` ON `shared_balances` (`transaction_id`);--> statement-breakpoint
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
	`upcoming_amount_cents` integer,
	`upcoming_effective_date` text,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_subscriptions_household` ON `subscriptions` (`household_id`);--> statement-breakpoint
CREATE TABLE `transaction_pairing_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`pattern` text NOT NULL,
	`target_provider_id` text,
	`target_category_id` text,
	`auto_confirm` integer DEFAULT false,
	`owner_id` text,
	`visibility` text DEFAULT 'private',
	`rule_type` text DEFAULT 'manual',
	`metadata_json` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_pairing_rules_household` ON `transaction_pairing_rules` (`household_id`);--> statement-breakpoint
CREATE INDEX `idx_pairing_rules_category` ON `transaction_pairing_rules` (`target_category_id`);--> statement-breakpoint
CREATE TABLE `transaction_timeline` (
	`id` text PRIMARY KEY NOT NULL,
	`transaction_id` text NOT NULL,
	`type` text NOT NULL,
	`content` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_timeline_transaction` ON `transaction_timeline` (`transaction_id`);--> statement-breakpoint
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
	`notes` text,
	`raw_description` text,
	`parent_id` text,
	`provider_id` text,
	`bill_id` text,
	`attention_required` integer DEFAULT false,
	`needs_balance_transfer` integer DEFAULT false,
	`transfer_timing` text,
	`is_borrowed` integer DEFAULT false,
	`borrow_source` text,
	`accounted_for` integer DEFAULT false,
	`source` text DEFAULT 'manual',
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`linked_transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`parent_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_transactions_household` ON `transactions` (`household_id`);--> statement-breakpoint
CREATE INDEX `idx_transactions_account` ON `transactions` (`account_id`);--> statement-breakpoint
CREATE INDEX `idx_transactions_category` ON `transactions` (`category_id`);--> statement-breakpoint
CREATE INDEX `idx_transactions_parent` ON `transactions` (`parent_id`);--> statement-breakpoint
CREATE INDEX `idx_transactions_date` ON `transactions` (`transaction_date`);--> statement-breakpoint
CREATE TABLE `user_households` (
	`user_id` text NOT NULL,
	`household_id` text NOT NULL,
	`role` text DEFAULT 'member',
	PRIMARY KEY(`user_id`, `household_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_linked_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`household_id` text,
	`provider_id` text NOT NULL,
	`payment_method_id` text,
	`email_attached` text,
	`membership_start_date` text,
	`membership_end_date` text,
	`subscription_id` text,
	`notes` text,
	`status` text DEFAULT 'active',
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`payment_method_id`) REFERENCES `user_payment_methods`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_linked_accounts_user` ON `user_linked_accounts` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_linked_accounts_household` ON `user_linked_accounts` (`household_id`);--> statement-breakpoint
CREATE TABLE `user_payment_methods` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`household_id` text,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`last_four` text,
	`branding_url` text,
	`status` text DEFAULT 'active',
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_payment_methods_user` ON `user_payment_methods` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_payment_methods_household` ON `user_payment_methods` (`household_id`);--> statement-breakpoint
CREATE TABLE `pay_exceptions` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`user_id` text NOT NULL,
	`original_date` text NOT NULL,
	`override_date` text,
	`override_amount_cents` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_pay_exceptions_household` ON `pay_exceptions` (`household_id`);--> statement-breakpoint
CREATE INDEX `idx_pay_exceptions_user` ON `pay_exceptions` (`user_id`);--> statement-breakpoint
CREATE TABLE `pay_schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`user_id` text,
	`name` text NOT NULL,
	`frequency` text NOT NULL,
	`next_pay_date` text,
	`estimated_amount_cents` integer,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_pay_schedules_household` ON `pay_schedules` (`household_id`);--> statement-breakpoint
CREATE TABLE `tracked_expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`description` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`status` text DEFAULT 'pending',
	`notes` text,
	`attention_required` integer DEFAULT false,
	`needs_balance_transfer` integer DEFAULT false,
	`transfer_timing` text,
	`is_borrowed` integer DEFAULT false,
	`borrow_source` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_tracked_expenses_household` ON `tracked_expenses` (`household_id`);--> statement-breakpoint
CREATE TABLE `loan_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`loan_id` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`payment_date` text NOT NULL,
	`notes` text,
	`status` text DEFAULT 'completed',
	FOREIGN KEY (`loan_id`) REFERENCES `personal_loans`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_loan_payments_loan` ON `loan_payments` (`loan_id`);--> statement-breakpoint
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
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lender_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_personal_loans_household` ON `personal_loans` (`household_id`);--> statement-breakpoint
CREATE INDEX `idx_personal_loans_lender` ON `personal_loans` (`lender_user_id`);--> statement-breakpoint
CREATE TABLE `activity_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`household_id` text,
	`actor_id` text NOT NULL,
	`actor_type` text DEFAULT 'USER' NOT NULL,
	`action` text NOT NULL,
	`severity` text DEFAULT 'INFO',
	`target_type` text,
	`target_id` text,
	`details_json` text DEFAULT '{}',
	`old_values_json` text DEFAULT '{}',
	`new_values_json` text DEFAULT '{}',
	`ip_address` text,
	`user_agent` text,
	`cf_ray` text,
	`location` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_activity_logs_household` ON `activity_logs` (`household_id`);--> statement-breakpoint
CREATE INDEX `idx_activity_logs_actor` ON `activity_logs` (`actor_id`);--> statement-breakpoint
CREATE INDEX `idx_activity_logs_action` ON `activity_logs` (`action`);--> statement-breakpoint
CREATE TABLE `admin_audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`action` text NOT NULL,
	`target` text NOT NULL,
	`target_id` text,
	`details_json` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`household_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`action` text NOT NULL,
	`severity` text DEFAULT 'INFO',
	`target_type` text,
	`target_id` text,
	`record_id` text,
	`old_values_json` text DEFAULT '{}',
	`new_values_json` text DEFAULT '{}',
	`metadata_json` text DEFAULT '{}',
	`cf_ray` text,
	`location` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade
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
CREATE TABLE `external_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`provider` text NOT NULL,
	`access_token` text NOT NULL,
	`status` text DEFAULT 'active',
	`last_sync_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_ext_conn_household` ON `external_connections` (`household_id`);--> statement-breakpoint
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
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
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
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`service_provider_id`) REFERENCES `service_providers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `notification_settings` (
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`event` text NOT NULL,
	`enabled` integer DEFAULT false,
	`offset_days` integer DEFAULT 3,
	PRIMARY KEY(`user_id`, `type`, `event`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `notification_sounds` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`name` text NOT NULL,
	`r2_key` text NOT NULL,
	`file_size` integer,
	`mime_type` text DEFAULT 'audio/mpeg',
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `privacy_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`connection_id` text NOT NULL,
	`last_4` text NOT NULL,
	`hostname` text,
	`spend_limit_cents` integer,
	`state` text,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`connection_id`) REFERENCES `external_connections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_privacy_cards_household` ON `privacy_cards` (`household_id`);--> statement-breakpoint
CREATE TABLE `reminder_activity` (
	`id` text PRIMARY KEY NOT NULL,
	`reminder_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`details_json` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`reminder_id`) REFERENCES `reminders_v2`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `reminder_channels` (
	`id` text PRIMARY KEY NOT NULL,
	`schedule_id` text NOT NULL,
	`channel_type` text NOT NULL,
	`target` text,
	`sound_id` text,
	`is_enabled` integer DEFAULT true,
	FOREIGN KEY (`schedule_id`) REFERENCES `reminder_schedules`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `reminder_members` (
	`id` text PRIMARY KEY NOT NULL,
	`reminder_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'MEMBER' NOT NULL,
	`joined_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`reminder_id`) REFERENCES `reminders_v2`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `reminder_schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`reminder_id` text NOT NULL,
	`schedule_type` text NOT NULL,
	`cron_string` text,
	`next_run_at` text NOT NULL,
	`last_run_at` text,
	`is_active` integer DEFAULT true,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`reminder_id`) REFERENCES `reminders_v2`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `reminder_shares` (
	`id` text PRIMARY KEY NOT NULL,
	`reminder_id` text NOT NULL,
	`share_token` text NOT NULL,
	`expires_at` text,
	`max_uses` integer DEFAULT 0,
	`used_count` integer DEFAULT 0,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`reminder_id`) REFERENCES `reminders_v2`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reminder_shares_share_token_unique` ON `reminder_shares` (`share_token`);--> statement-breakpoint
CREATE TABLE `reminders` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`user_id` text NOT NULL,
	`target_id` text NOT NULL,
	`target_type` text NOT NULL,
	`delivery_type` text NOT NULL,
	`delivery_target` text,
	`priority` text DEFAULT 'medium' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`due_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_reminders_target` ON `reminders` (`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `idx_reminders_user` ON `reminders` (`user_id`);--> statement-breakpoint
CREATE TABLE `reminders_v2` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`target_id` text,
	`target_type` text,
	`priority` text DEFAULT 'MEDIUM' NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `schedule_history` (
	`id` text PRIMARY KEY NOT NULL,
	`schedule_id` text NOT NULL,
	`household_id` text NOT NULL,
	`occurrence_at` text NOT NULL,
	`action_status` text NOT NULL,
	`details_json` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_sched_history_schedule` ON `schedule_history` (`schedule_id`);--> statement-breakpoint
CREATE INDEX `idx_sched_history_household` ON `schedule_history` (`household_id`);--> statement-breakpoint
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
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `service_providers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`visibility` text DEFAULT 'public',
	`household_id` text,
	`billing_processor_id` text,
	`biller_id` text,
	`created_by` text,
	`status` text DEFAULT 'active',
	`icon_url` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`billing_processor_id`) REFERENCES `billing_processors`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`biller_id`) REFERENCES `billers`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_providers_household` ON `service_providers` (`household_id`);--> statement-breakpoint
CREATE TABLE `support_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`issue_id` text NOT NULL,
	`user_id` text,
	`author_name` text,
	`body` text NOT NULL,
	`github_comment_id` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`issue_id`) REFERENCES `support_issues`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `support_issues` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`category` text,
	`priority` text DEFAULT 'medium',
	`status` text DEFAULT 'open',
	`github_issue_url` text,
	`github_issue_number` integer,
	`github_issue_id` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
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
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
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
	`metadata_json` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `system_walkthroughs` (
	`id` text PRIMARY KEY NOT NULL,
	`version` text NOT NULL,
	`title` text NOT NULL,
	`content_md` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
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
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_notification_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`dnd_enabled` integer DEFAULT false,
	`dnd_start` text DEFAULT '22:00',
	`dnd_end` text DEFAULT '08:00',
	`allow_high_priority_in_dnd` integer DEFAULT true,
	`default_sound_id` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `vault` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`secret_type` text NOT NULL,
	`key_identifier` text NOT NULL,
	`encrypted_data` text NOT NULL,
	`last_accessed_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_vault_user_id` ON `vault` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_vault_type` ON `vault` (`secret_type`);--> statement-breakpoint
CREATE TABLE `vault_v2` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`key_name` text NOT NULL,
	`scope` text NOT NULL,
	`encrypted_value` text NOT NULL,
	`iv` text NOT NULL,
	`version` integer DEFAULT 1,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `webhook_delivery_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`webhook_id` text NOT NULL,
	`event` text NOT NULL,
	`status_code` integer DEFAULT 0,
	`error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`webhook_id`) REFERENCES `webhooks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_webhook_logs_webhook` ON `webhook_delivery_logs` (`webhook_id`);--> statement-breakpoint
CREATE TABLE `webhooks` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`url` text NOT NULL,
	`secret` text NOT NULL,
	`event_list` text NOT NULL,
	`is_active` integer DEFAULT true,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_webhooks_household` ON `webhooks` (`household_id`);