CREATE TABLE "split_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"allocations_json" text NOT NULL,
	"created_by" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "transaction_confirmation_numbers" (
	"id" text PRIMARY KEY NOT NULL,
	"transaction_id" text NOT NULL,
	"category" text NOT NULL,
	"custom_category_label" text,
	"value" text NOT NULL,
	"is_primary" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"created_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "transaction_lifecycle_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"transaction_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"field_changed" text,
	"old_value" text,
	"new_value" text,
	"diff_json" json,
	"metadata_json" json DEFAULT '{}'::json,
	"created_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "confirmation_number_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"icon" text DEFAULT '🔖',
	"sort_order" integer DEFAULT 0,
	"is_system" boolean DEFAULT false,
	"created_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "tracked_expense_confirmation_numbers" (
	"id" text PRIMARY KEY NOT NULL,
	"tracked_expense_id" text NOT NULL,
	"category" text NOT NULL,
	"custom_category_label" text,
	"value" text NOT NULL,
	"is_primary" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"created_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "tracked_expense_lifecycle_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"tracked_expense_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"field_changed" text,
	"old_value" text,
	"new_value" text,
	"diff_json" json,
	"metadata_json" json DEFAULT '{}'::json,
	"created_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE "tracked_expenses" ADD COLUMN "bill_id" text;--> statement-breakpoint
ALTER TABLE "split_templates" ADD CONSTRAINT "split_templates_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_templates" ADD CONSTRAINT "split_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_confirmation_numbers" ADD CONSTRAINT "transaction_confirmation_numbers_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_lifecycle_logs" ADD CONSTRAINT "transaction_lifecycle_logs_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "confirmation_number_categories" ADD CONSTRAINT "confirmation_number_categories_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracked_expense_confirmation_numbers" ADD CONSTRAINT "tracked_expense_confirmation_numbers_tracked_expense_id_tracked_expenses_id_fk" FOREIGN KEY ("tracked_expense_id") REFERENCES "public"."tracked_expenses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracked_expense_lifecycle_logs" ADD CONSTRAINT "tracked_expense_lifecycle_logs_tracked_expense_id_tracked_expenses_id_fk" FOREIGN KEY ("tracked_expense_id") REFERENCES "public"."tracked_expenses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_split_templates_household" ON "split_templates" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "idx_tcn_transaction" ON "transaction_confirmation_numbers" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "idx_tll_transaction" ON "transaction_lifecycle_logs" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "idx_tll_actor" ON "transaction_lifecycle_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "idx_cnc_household" ON "confirmation_number_categories" USING btree ("household_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_cnc_household_key" ON "confirmation_number_categories" USING btree ("household_id","key");--> statement-breakpoint
CREATE INDEX "idx_tecn_tracked_expense" ON "tracked_expense_confirmation_numbers" USING btree ("tracked_expense_id");--> statement-breakpoint
CREATE INDEX "idx_tell_tracked_expense" ON "tracked_expense_lifecycle_logs" USING btree ("tracked_expense_id");--> statement-breakpoint
CREATE INDEX "idx_tell_actor" ON "tracked_expense_lifecycle_logs" USING btree ("actor_id");