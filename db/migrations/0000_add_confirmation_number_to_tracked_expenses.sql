CREATE TABLE "admin_invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text,
	"token_hash" text NOT NULL,
	"role" text NOT NULL,
	"is_claimed" boolean DEFAULT false,
	"expires_at" text NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "admin_invitations_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "backup_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"code_hash" text NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP,
	"used_at" text
);
--> statement-breakpoint
CREATE TABLE "cross_device_auth" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"poll_token" text NOT NULL,
	"auth_token" text,
	"status" text DEFAULT 'pending',
	"device_info" text,
	"target_user_id" text,
	"approved_by_user_id" text,
	"expires_at" text NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP,
	"approved_at" text,
	CONSTRAINT "cross_device_auth_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "passkey_challenges" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"challenge" text NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP,
	"expires_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "passkeys" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"credential_id_hash" text NOT NULL,
	"counter" integer DEFAULT 0 NOT NULL,
	"device_type" text,
	"backed_up" boolean DEFAULT false,
	"attestation_format" text,
	"user_verified" boolean DEFAULT false,
	"created_at" text DEFAULT CURRENT_TIMESTAMP,
	"last_used_at" text,
	"name" text,
	"aaguid" text,
	"provider_name" text,
	"icon" text,
	"security_level" text,
	"manufacturer" text,
	"logo" text,
	"transports" text,
	"registration_ip" text,
	"registration_ipv4" text,
	"registration_ipv6" text,
	"registration_city" text,
	"registration_country" text,
	"registration_region" text,
	"registration_latitude" text,
	"registration_longitude" text,
	"registration_location" text,
	"registration_ua" text,
	"last_used_ip" text,
	"last_used_ip_v4" text,
	"last_used_ip_v6" text,
	"last_used_city" text,
	"last_used_country" text,
	"last_used_region" text,
	"last_used_latitude" text,
	"last_used_longitude" text,
	"last_used_location" text,
	"last_used_ua" text,
	CONSTRAINT "passkeys_credential_id_hash_unique" UNIQUE("credential_id_hash")
);
--> statement-breakpoint
CREATE TABLE "password_resets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"is_used" boolean DEFAULT false,
	"expires_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal_access_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"name" text,
	"token_hash" text NOT NULL,
	"scopes" text DEFAULT 'READ,WRITE',
	"created_at" text DEFAULT CURRENT_TIMESTAMP,
	"last_used_at" text,
	CONSTRAINT "personal_access_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP,
	"expires_at" text NOT NULL,
	"passkey_verified_at" text,
	"challenge" text,
	"user_agent" text,
	"ip_address" text,
	"ip_v4" text,
	"ip_v6" text,
	"last_active_at" text DEFAULT CURRENT_TIMESTAMP,
	"device_name" text,
	"os" text,
	"browser" text,
	"cf_ray" text,
	"is_persistent" boolean DEFAULT false,
	"location" text,
	"city" text,
	"country" text,
	"region" text,
	"continent" text,
	"latitude" text,
	"longitude" text,
	"cf_ip" text
);
--> statement-breakpoint
CREATE TABLE "user_identities" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"provider_user_id" text NOT NULL,
	"email" text,
	"name" text,
	"avatar_url" text,
	"access_token" text,
	"refresh_token" text,
	"token_expires_at" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "user_onboarding" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"step_id" text NOT NULL,
	"status" text DEFAULT 'pending',
	"completed_at" text
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"user_id" text NOT NULL,
	"key" text NOT NULL,
	"value" text,
	CONSTRAINT "user_preferences_user_id_key_pk" PRIMARY KEY("user_id","key")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text,
	"display_name" text,
	"username" text NOT NULL,
	"password_hash" text,
	"avatar_url" text,
	"global_role" text DEFAULT 'user',
	"status" text DEFAULT 'active',
	"last_active_at" text,
	"force_password_change" boolean DEFAULT false,
	"passkey_verified_at" text,
	"last_login" text DEFAULT CURRENT_TIMESTAMP,
	"last_seen_version" text DEFAULT '0.0.0',
	"onboarding_completed" boolean DEFAULT false,
	"failed_login_attempts" integer DEFAULT 0,
	"lockout_until" text,
	"password_changed_at" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP,
	"timezone" text DEFAULT 'UTC',
	"locale" text DEFAULT 'en-US',
	"theme" text DEFAULT 'system',
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"balance_cents" integer DEFAULT 0,
	"currency" text DEFAULT 'USD',
	"status" text DEFAULT 'active'
);
--> statement-breakpoint
CREATE TABLE "billers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"logo_url" text,
	"website" text,
	"industry" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "bills" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"name" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"due_date" text NOT NULL,
	"status" text DEFAULT 'unpaid',
	"notes" text,
	"category_id" text,
	"account_id" text,
	"is_recurring" boolean DEFAULT false,
	"frequency" text,
	"upcoming_amount_cents" integer,
	"upcoming_effective_date" text,
	"owner_id" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"name" text NOT NULL,
	"icon" text,
	"color" text,
	"monthly_budget_cents" integer DEFAULT 0,
	"envelope_balance_cents" integer DEFAULT 0,
	"rollover_enabled" boolean DEFAULT false,
	"rollover_cents" integer DEFAULT 0,
	"emergency_fund" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "credit_cards" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"account_id" text NOT NULL,
	"credit_limit_cents" integer NOT NULL,
	"interest_rate_apy" integer,
	"statement_closing_day" integer,
	"payment_due_day" integer,
	"next_statement_date" text
);
--> statement-breakpoint
CREATE TABLE "households" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP,
	"currency" text DEFAULT 'USD',
	"country_code" text DEFAULT 'US',
	"unallocated_balance_cents" integer DEFAULT 0,
	"status" text DEFAULT 'active'
);
--> statement-breakpoint
CREATE TABLE "installment_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"name" text NOT NULL,
	"total_amount_cents" integer NOT NULL,
	"installment_amount_cents" integer NOT NULL,
	"total_installments" integer NOT NULL,
	"remaining_installments" integer NOT NULL,
	"frequency" text NOT NULL,
	"next_payment_date" text NOT NULL,
	"account_id" text,
	"payment_mode" text DEFAULT 'manual',
	"status" text DEFAULT 'active',
	"upcoming_amount_cents" integer,
	"upcoming_effective_date" text
);
--> statement-breakpoint
CREATE TABLE "investment_holdings" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"account_id" text,
	"name" text NOT NULL,
	"asset_type" text DEFAULT 'misc' NOT NULL,
	"quantity" integer NOT NULL,
	"cost_basis_cents" integer,
	"value_cents" integer NOT NULL,
	"currency" text DEFAULT 'USD',
	"institution_id" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "liability_splits" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"target_id" text NOT NULL,
	"target_type" text NOT NULL,
	"originator_user_id" text NOT NULL,
	"assigned_user_id" text NOT NULL,
	"split_type" text NOT NULL,
	"split_value" integer NOT NULL,
	"calculated_amount_cents" integer NOT NULL,
	"override_date" text,
	"override_frequency" text,
	"status" text DEFAULT 'pending',
	"is_master_ledger_public" boolean DEFAULT false,
	"created_at" text DEFAULT CURRENT_TIMESTAMP,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "reconciliation_proposals" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"primary_transaction_id" text NOT NULL,
	"suggested_transaction_id" text NOT NULL,
	"confidence_score" integer DEFAULT 0,
	"match_reason" text,
	"status" text DEFAULT 'pending',
	"created_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"type" text NOT NULL,
	"period_start" text,
	"period_end" text,
	"data_json" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "savings_buckets" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"name" text NOT NULL,
	"target_cents" integer NOT NULL,
	"current_cents" integer DEFAULT 0,
	"target_date" text,
	"category_id" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "shared_balances" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"from_user_id" text NOT NULL,
	"to_user_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"transaction_id" text
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"name" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"billing_cycle" text NOT NULL,
	"next_billing_date" text,
	"trial_end_date" text,
	"is_trial" boolean DEFAULT false,
	"category_id" text,
	"account_id" text,
	"payment_mode" text DEFAULT 'manual',
	"owner_id" text,
	"upcoming_amount_cents" integer,
	"upcoming_effective_date" text
);
--> statement-breakpoint
CREATE TABLE "transaction_pairing_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"pattern" text NOT NULL,
	"target_provider_id" text,
	"target_category_id" text,
	"auto_confirm" boolean DEFAULT false,
	"owner_id" text,
	"visibility" text DEFAULT 'private',
	"rule_type" text DEFAULT 'manual',
	"metadata_json" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "transaction_timeline" (
	"id" text PRIMARY KEY NOT NULL,
	"transaction_id" text NOT NULL,
	"type" text NOT NULL,
	"content" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"account_id" text,
	"category_id" text,
	"amount_cents" integer NOT NULL,
	"description" text,
	"transaction_date" text DEFAULT CURRENT_DATE::text,
	"status" text DEFAULT 'pending',
	"is_recurring" boolean DEFAULT false,
	"receipt_r2_key" text,
	"owner_id" text,
	"confirmation_number" text,
	"linked_transaction_id" text,
	"reconciliation_status" text DEFAULT 'unreconciled',
	"notes" text,
	"raw_description" text,
	"parent_id" text,
	"provider_id" text,
	"bill_id" text,
	"attention_required" boolean DEFAULT false,
	"needs_balance_transfer" boolean DEFAULT false,
	"transfer_timing" text,
	"is_borrowed" boolean DEFAULT false,
	"borrow_source" text,
	"accounted_for" boolean DEFAULT false,
	"source" text DEFAULT 'manual'
);
--> statement-breakpoint
CREATE TABLE "user_households" (
	"user_id" text NOT NULL,
	"household_id" text NOT NULL,
	"role" text DEFAULT 'member',
	CONSTRAINT "user_households_user_id_household_id_pk" PRIMARY KEY("user_id","household_id")
);
--> statement-breakpoint
CREATE TABLE "user_linked_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"household_id" text,
	"provider_id" text NOT NULL,
	"payment_method_id" text,
	"email_attached" text,
	"membership_start_date" text,
	"membership_end_date" text,
	"subscription_id" text,
	"notes" text,
	"status" text DEFAULT 'active',
	"created_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "user_payment_methods" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"household_id" text,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"last_four" text,
	"branding_url" text,
	"status" text DEFAULT 'active',
	"created_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "pay_exceptions" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"user_id" text NOT NULL,
	"pay_schedule_id" text NOT NULL,
	"original_date" text NOT NULL,
	"override_date" text,
	"override_amount_cents" integer,
	"note" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "pay_schedules" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"frequency" text NOT NULL,
	"next_pay_date" text,
	"estimated_amount_cents" integer,
	"notes" text,
	"semi_monthly_day_1" integer,
	"semi_monthly_day_2" integer,
	"upcoming_amount_cents" integer,
	"upcoming_effective_date" text
);
--> statement-breakpoint
CREATE TABLE "tracked_expenses" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"description" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"status" text DEFAULT 'pending',
	"notes" text,
	"confirmation_number" text,
	"attention_required" boolean DEFAULT false,
	"needs_balance_transfer" boolean DEFAULT false,
	"transfer_timing" text,
	"is_borrowed" boolean DEFAULT false,
	"borrow_source" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "loan_payments" (
	"id" text PRIMARY KEY NOT NULL,
	"loan_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"payment_date" text DEFAULT CURRENT_TIMESTAMP,
	"platform" text,
	"external_id" text,
	"method" text,
	"notes" text,
	"status" text DEFAULT 'completed'
);
--> statement-breakpoint
CREATE TABLE "personal_loans" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"lender_user_id" text NOT NULL,
	"borrower_name" text NOT NULL,
	"borrower_contact" text,
	"total_amount_cents" integer NOT NULL,
	"remaining_balance_cents" integer NOT NULL,
	"interest_rate_apy" integer DEFAULT 0,
	"term_months" integer,
	"origination_date" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"household_id" text,
	"actor_id" text NOT NULL,
	"actor_type" text DEFAULT 'USER' NOT NULL,
	"action" text NOT NULL,
	"severity" text DEFAULT 'INFO',
	"target_type" text,
	"target_id" text,
	"details_json" text DEFAULT '{}',
	"old_values_json" text DEFAULT '{}',
	"new_values_json" text DEFAULT '{}',
	"ip_address" text,
	"user_agent" text,
	"cf_ray" text,
	"location" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "admin_audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"target" text NOT NULL,
	"target_id" text,
	"details_json" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"action" text NOT NULL,
	"severity" text DEFAULT 'INFO',
	"target_type" text,
	"target_id" text,
	"record_id" text,
	"old_values_json" text DEFAULT '{}',
	"new_values_json" text DEFAULT '{}',
	"metadata_json" text DEFAULT '{}',
	"cf_ray" text,
	"location" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "billing_processors" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"website_url" text,
	"branding_url" text,
	"support_url" text,
	"subscription_id_notes" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "external_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"provider" text NOT NULL,
	"access_token" text NOT NULL,
	"status" text DEFAULT 'active',
	"last_sync_at" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "holidays" (
	"id" text PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"name" text NOT NULL,
	"country_code" text DEFAULT 'US'
);
--> statement-breakpoint
CREATE TABLE "household_invites" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"created_by" text NOT NULL,
	"status" text DEFAULT 'pending',
	"expires_at" text NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "linked_providers" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"service_provider_id" text NOT NULL,
	"account_reference" text,
	"custom_label" text,
	"metadata" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "notification_settings" (
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"event" text NOT NULL,
	"enabled" boolean DEFAULT false,
	"offset_days" integer DEFAULT 3,
	CONSTRAINT "notification_settings_user_id_type_event_pk" PRIMARY KEY("user_id","type","event")
);
--> statement-breakpoint
CREATE TABLE "notification_sounds" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"r2_key" text NOT NULL,
	"file_size" integer,
	"mime_type" text DEFAULT 'audio/mpeg',
	"created_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "privacy_cards" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"connection_id" text NOT NULL,
	"last_4" text NOT NULL,
	"hostname" text,
	"spend_limit_cents" integer,
	"state" text
);
--> statement-breakpoint
CREATE TABLE "reminder_activity" (
	"id" text PRIMARY KEY NOT NULL,
	"reminder_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"details_json" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "reminder_channels" (
	"id" text PRIMARY KEY NOT NULL,
	"schedule_id" text NOT NULL,
	"channel_type" text NOT NULL,
	"target" text,
	"sound_id" text,
	"is_enabled" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "reminder_members" (
	"id" text PRIMARY KEY NOT NULL,
	"reminder_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'MEMBER' NOT NULL,
	"joined_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "reminder_schedules" (
	"id" text PRIMARY KEY NOT NULL,
	"reminder_id" text NOT NULL,
	"schedule_type" text NOT NULL,
	"cron_string" text,
	"next_run_at" text NOT NULL,
	"last_run_at" text,
	"is_active" boolean DEFAULT true,
	"created_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "reminder_shares" (
	"id" text PRIMARY KEY NOT NULL,
	"reminder_id" text NOT NULL,
	"share_token" text NOT NULL,
	"expires_at" text,
	"max_uses" integer DEFAULT 0,
	"used_count" integer DEFAULT 0,
	"created_at" text DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "reminder_shares_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"user_id" text NOT NULL,
	"target_id" text NOT NULL,
	"target_type" text NOT NULL,
	"delivery_type" text NOT NULL,
	"delivery_target" text,
	"priority" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"due_at" text,
	"frequency_days" integer DEFAULT 0 NOT NULL,
	"time_of_day" text DEFAULT '09:00',
	"note" text,
	"last_sent_at" text,
	"is_active" boolean DEFAULT true,
	"created_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "reminders_v2" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"target_id" text,
	"target_type" text,
	"priority" text DEFAULT 'MEDIUM' NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "schedule_history" (
	"id" text PRIMARY KEY NOT NULL,
	"schedule_id" text NOT NULL,
	"household_id" text NOT NULL,
	"occurrence_at" text NOT NULL,
	"action_status" text NOT NULL,
	"details_json" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "schedules" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"target_id" text NOT NULL,
	"target_type" text NOT NULL,
	"frequency" text NOT NULL,
	"next_run_at" text NOT NULL,
	"last_run_at" text,
	"executed_count" integer DEFAULT 0,
	"status" text DEFAULT 'active',
	"updated_at" text DEFAULT CURRENT_TIMESTAMP,
	"created_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "service_providers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"visibility" text DEFAULT 'public',
	"household_id" text,
	"billing_processor_id" text,
	"biller_id" text,
	"created_by" text,
	"status" text DEFAULT 'active',
	"icon_url" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "support_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"issue_id" text NOT NULL,
	"user_id" text,
	"author_name" text,
	"body" text NOT NULL,
	"github_comment_id" integer,
	"created_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "support_issues" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text,
	"priority" text DEFAULT 'medium',
	"status" text DEFAULT 'open',
	"github_issue_url" text,
	"github_issue_number" integer,
	"github_issue_id" integer,
	"created_at" text DEFAULT CURRENT_TIMESTAMP,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "system_announcements" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"content_md" text NOT NULL,
	"priority" text DEFAULT 'info',
	"actor_id" text,
	"is_active" boolean DEFAULT true,
	"expires_at" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "system_audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"target" text NOT NULL,
	"details_json" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "system_config" (
	"id" text PRIMARY KEY NOT NULL,
	"config_key" text NOT NULL,
	"config_value" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "system_config_config_key_unique" UNIQUE("config_key")
);
--> statement-breakpoint
CREATE TABLE "system_feature_flags" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"feature_key" text NOT NULL,
	"enabled_globally" boolean DEFAULT false,
	"description" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "system_feature_flags_feature_key_unique" UNIQUE("feature_key")
);
--> statement-breakpoint
CREATE TABLE "system_registry" (
	"id" text PRIMARY KEY NOT NULL,
	"item_type" text NOT NULL,
	"name" text NOT NULL,
	"logo_url" text,
	"website_url" text,
	"metadata_json" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "system_walkthroughs" (
	"id" text PRIMARY KEY NOT NULL,
	"version" text NOT NULL,
	"title" text NOT NULL,
	"content_md" text NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"amount_cents" integer,
	"category_id" text,
	"account_id" text
);
--> statement-breakpoint
CREATE TABLE "user_notification_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"dnd_enabled" boolean DEFAULT false,
	"dnd_start" text DEFAULT '22:00',
	"dnd_end" text DEFAULT '08:00',
	"allow_high_priority_in_dnd" boolean DEFAULT true,
	"default_sound_id" text,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "vault" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"secret_type" text NOT NULL,
	"key_identifier" text NOT NULL,
	"encrypted_data" text NOT NULL,
	"last_accessed_at" text
);
--> statement-breakpoint
CREATE TABLE "vault_v2" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"key_name" text NOT NULL,
	"scope" text NOT NULL,
	"encrypted_value" text NOT NULL,
	"iv" text NOT NULL,
	"version" integer DEFAULT 1,
	"created_at" text DEFAULT CURRENT_TIMESTAMP,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "webhook_delivery_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"webhook_id" text NOT NULL,
	"event" text NOT NULL,
	"status_code" integer DEFAULT 0,
	"error" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "webhooks" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"url" text NOT NULL,
	"secret" text NOT NULL,
	"event_list" text NOT NULL,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
ALTER TABLE "backup_codes" ADD CONSTRAINT "backup_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cross_device_auth" ADD CONSTRAINT "cross_device_auth_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cross_device_auth" ADD CONSTRAINT "cross_device_auth_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passkey_challenges" ADD CONSTRAINT "passkey_challenges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passkeys" ADD CONSTRAINT "passkeys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_identities" ADD CONSTRAINT "user_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_onboarding" ADD CONSTRAINT "user_onboarding_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_cards" ADD CONSTRAINT "credit_cards_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_cards" ADD CONSTRAINT "credit_cards_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installment_plans" ADD CONSTRAINT "installment_plans_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installment_plans" ADD CONSTRAINT "installment_plans_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_holdings" ADD CONSTRAINT "investment_holdings_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_holdings" ADD CONSTRAINT "investment_holdings_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "liability_splits" ADD CONSTRAINT "liability_splits_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "liability_splits" ADD CONSTRAINT "liability_splits_originator_user_id_users_id_fk" FOREIGN KEY ("originator_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "liability_splits" ADD CONSTRAINT "liability_splits_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation_proposals" ADD CONSTRAINT "reconciliation_proposals_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation_proposals" ADD CONSTRAINT "reconciliation_proposals_primary_transaction_id_transactions_id_fk" FOREIGN KEY ("primary_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation_proposals" ADD CONSTRAINT "reconciliation_proposals_suggested_transaction_id_transactions_id_fk" FOREIGN KEY ("suggested_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_buckets" ADD CONSTRAINT "savings_buckets_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_buckets" ADD CONSTRAINT "savings_buckets_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_balances" ADD CONSTRAINT "shared_balances_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_balances" ADD CONSTRAINT "shared_balances_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_balances" ADD CONSTRAINT "shared_balances_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_balances" ADD CONSTRAINT "shared_balances_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_pairing_rules" ADD CONSTRAINT "transaction_pairing_rules_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_pairing_rules" ADD CONSTRAINT "transaction_pairing_rules_target_category_id_categories_id_fk" FOREIGN KEY ("target_category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_pairing_rules" ADD CONSTRAINT "transaction_pairing_rules_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_timeline" ADD CONSTRAINT "transaction_timeline_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_linked_transaction_id_transactions_id_fk" FOREIGN KEY ("linked_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_parent_id_transactions_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_households" ADD CONSTRAINT "user_households_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_households" ADD CONSTRAINT "user_households_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_linked_accounts" ADD CONSTRAINT "user_linked_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_linked_accounts" ADD CONSTRAINT "user_linked_accounts_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_linked_accounts" ADD CONSTRAINT "user_linked_accounts_payment_method_id_user_payment_methods_id_fk" FOREIGN KEY ("payment_method_id") REFERENCES "public"."user_payment_methods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_payment_methods" ADD CONSTRAINT "user_payment_methods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_payment_methods" ADD CONSTRAINT "user_payment_methods_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pay_exceptions" ADD CONSTRAINT "pay_exceptions_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pay_exceptions" ADD CONSTRAINT "pay_exceptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pay_exceptions" ADD CONSTRAINT "pay_exceptions_pay_schedule_id_pay_schedules_id_fk" FOREIGN KEY ("pay_schedule_id") REFERENCES "public"."pay_schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pay_schedules" ADD CONSTRAINT "pay_schedules_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pay_schedules" ADD CONSTRAINT "pay_schedules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracked_expenses" ADD CONSTRAINT "tracked_expenses_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_payments" ADD CONSTRAINT "loan_payments_loan_id_personal_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."personal_loans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_loans" ADD CONSTRAINT "personal_loans_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_loans" ADD CONSTRAINT "personal_loans_lender_user_id_users_id_fk" FOREIGN KEY ("lender_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_connections" ADD CONSTRAINT "external_connections_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_invites" ADD CONSTRAINT "household_invites_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_invites" ADD CONSTRAINT "household_invites_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linked_providers" ADD CONSTRAINT "linked_providers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linked_providers" ADD CONSTRAINT "linked_providers_service_provider_id_service_providers_id_fk" FOREIGN KEY ("service_provider_id") REFERENCES "public"."service_providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_sounds" ADD CONSTRAINT "notification_sounds_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "privacy_cards" ADD CONSTRAINT "privacy_cards_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "privacy_cards" ADD CONSTRAINT "privacy_cards_connection_id_external_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."external_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_activity" ADD CONSTRAINT "reminder_activity_reminder_id_reminders_v2_id_fk" FOREIGN KEY ("reminder_id") REFERENCES "public"."reminders_v2"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_activity" ADD CONSTRAINT "reminder_activity_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_channels" ADD CONSTRAINT "reminder_channels_schedule_id_reminder_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."reminder_schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_members" ADD CONSTRAINT "reminder_members_reminder_id_reminders_v2_id_fk" FOREIGN KEY ("reminder_id") REFERENCES "public"."reminders_v2"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_members" ADD CONSTRAINT "reminder_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_schedules" ADD CONSTRAINT "reminder_schedules_reminder_id_reminders_v2_id_fk" FOREIGN KEY ("reminder_id") REFERENCES "public"."reminders_v2"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_shares" ADD CONSTRAINT "reminder_shares_reminder_id_reminders_v2_id_fk" FOREIGN KEY ("reminder_id") REFERENCES "public"."reminders_v2"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders_v2" ADD CONSTRAINT "reminders_v2_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders_v2" ADD CONSTRAINT "reminders_v2_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_history" ADD CONSTRAINT "schedule_history_schedule_id_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_history" ADD CONSTRAINT "schedule_history_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_providers" ADD CONSTRAINT "service_providers_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_providers" ADD CONSTRAINT "service_providers_billing_processor_id_billing_processors_id_fk" FOREIGN KEY ("billing_processor_id") REFERENCES "public"."billing_processors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_providers" ADD CONSTRAINT "service_providers_biller_id_billers_id_fk" FOREIGN KEY ("biller_id") REFERENCES "public"."billers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_providers" ADD CONSTRAINT "service_providers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_comments" ADD CONSTRAINT "support_comments_issue_id_support_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."support_issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_comments" ADD CONSTRAINT "support_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_issues" ADD CONSTRAINT "support_issues_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_announcements" ADD CONSTRAINT "system_announcements_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notification_settings" ADD CONSTRAINT "user_notification_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vault" ADD CONSTRAINT "vault_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_delivery_logs" ADD CONSTRAINT "webhook_delivery_logs_webhook_id_webhooks_id_fk" FOREIGN KEY ("webhook_id") REFERENCES "public"."webhooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_backup_codes_user" ON "backup_codes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_cross_device_code" ON "cross_device_auth" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_cross_device_status" ON "cross_device_auth" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_cross_device_target_user" ON "cross_device_auth" USING btree ("target_user_id");--> statement-breakpoint
CREATE INDEX "idx_passkeys_user" ON "passkeys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_passkeys_hash" ON "passkeys" USING btree ("credential_id_hash");--> statement-breakpoint
CREATE INDEX "idx_pass_resets_user" ON "password_resets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_pat_household" ON "personal_access_tokens" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_user" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_identities_user" ON "user_identities" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_identities_unique" ON "user_identities" USING btree ("provider","provider_user_id");--> statement-breakpoint
CREATE INDEX "idx_onboarding_user" ON "user_onboarding" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_accounts_household" ON "accounts" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "idx_bills_household" ON "bills" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "idx_bills_owner" ON "bills" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_categories_household" ON "categories" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "idx_credit_cards_household" ON "credit_cards" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "idx_credit_cards_account" ON "credit_cards" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_installments_household" ON "installment_plans" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "idx_invest_holdings_household" ON "investment_holdings" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "idx_invest_holdings_account" ON "investment_holdings" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_recon_proposals_household" ON "reconciliation_proposals" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "idx_recon_proposals_primary" ON "reconciliation_proposals" USING btree ("primary_transaction_id");--> statement-breakpoint
CREATE INDEX "idx_recon_proposals_suggested" ON "reconciliation_proposals" USING btree ("suggested_transaction_id");--> statement-breakpoint
CREATE INDEX "idx_reports_household" ON "reports" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "idx_savings_household" ON "savings_buckets" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "idx_shared_balances_household" ON "shared_balances" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "idx_shared_balances_transaction" ON "shared_balances" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_household" ON "subscriptions" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "idx_pairing_rules_household" ON "transaction_pairing_rules" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "idx_pairing_rules_category" ON "transaction_pairing_rules" USING btree ("target_category_id");--> statement-breakpoint
CREATE INDEX "idx_timeline_transaction" ON "transaction_timeline" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_household" ON "transactions" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_account" ON "transactions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_category" ON "transactions" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_parent" ON "transactions" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_date" ON "transactions" USING btree ("transaction_date");--> statement-breakpoint
CREATE INDEX "idx_linked_accounts_user" ON "user_linked_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_linked_accounts_household" ON "user_linked_accounts" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "idx_payment_methods_user" ON "user_payment_methods" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_payment_methods_household" ON "user_payment_methods" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "idx_pay_exceptions_household" ON "pay_exceptions" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "idx_pay_exceptions_user" ON "pay_exceptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_pay_schedules_household" ON "pay_schedules" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "idx_tracked_expenses_household" ON "tracked_expenses" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "idx_loan_payments_loan" ON "loan_payments" USING btree ("loan_id");--> statement-breakpoint
CREATE INDEX "idx_personal_loans_household" ON "personal_loans" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "idx_personal_loans_lender" ON "personal_loans" USING btree ("lender_user_id");--> statement-breakpoint
CREATE INDEX "idx_activity_logs_household" ON "activity_logs" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "idx_activity_logs_actor" ON "activity_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "idx_activity_logs_action" ON "activity_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_ext_conn_household" ON "external_connections" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "idx_privacy_cards_household" ON "privacy_cards" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "idx_reminders_target" ON "reminders" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "idx_reminders_user" ON "reminders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_sched_history_schedule" ON "schedule_history" USING btree ("schedule_id");--> statement-breakpoint
CREATE INDEX "idx_sched_history_household" ON "schedule_history" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "idx_providers_household" ON "service_providers" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "idx_vault_user_id" ON "vault" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_vault_type" ON "vault" USING btree ("secret_type");--> statement-breakpoint
CREATE INDEX "idx_webhook_logs_webhook" ON "webhook_delivery_logs" USING btree ("webhook_id");--> statement-breakpoint
CREATE INDEX "idx_webhooks_household" ON "webhooks" USING btree ("household_id");