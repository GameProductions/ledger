-- 0001: Confirmation Numbers Enhancement
-- Adds multi-instance, categorized confirmation numbers with lifecycle tracking

-- 1. Add confirmationNumbers JSON column to tracked_expenses
ALTER TABLE "tracked_expenses" ADD COLUMN IF NOT EXISTS "confirmation_numbers" json DEFAULT '[]'::json;

-- 2. Add confirmationNumbers JSON column to transactions
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "confirmation_numbers" json DEFAULT '[]'::json;

-- 3. Create normalized table for confirmation numbers (for querying/filtering)
CREATE TABLE IF NOT EXISTS "tracked_expense_confirmation_numbers" (
	"id" text PRIMARY KEY NOT NULL,
	"tracked_expense_id" text NOT NULL REFERENCES "tracked_expenses"("id") ON DELETE cascade,
	"category" text NOT NULL,
	"custom_category_label" text,
	"value" text NOT NULL,
	"is_primary" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"created_at" text DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "idx_tecn_tracked_expense" ON "tracked_expense_confirmation_numbers" ("tracked_expense_id");

-- 4. Create table for transaction confirmation numbers (normalized)
CREATE TABLE IF NOT EXISTS "transaction_confirmation_numbers" (
	"id" text PRIMARY KEY NOT NULL,
	"transaction_id" text NOT NULL REFERENCES "transactions"("id") ON DELETE cascade,
	"category" text NOT NULL,
	"custom_category_label" text,
	"value" text NOT NULL,
	"is_primary" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"created_at" text DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "idx_tcn_transaction" ON "transaction_confirmation_numbers" ("transaction_id");

-- 5. Create categories table for confirmation numbers
CREATE TABLE IF NOT EXISTS "confirmation_number_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text REFERENCES "households"("id") ON DELETE cascade,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"icon" text DEFAULT '🔖',
	"sort_order" integer DEFAULT 0,
	"is_system" boolean DEFAULT false,
	"created_at" text DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "confirmation_number_categories_household_key_unique" UNIQUE ("household_id", "key")
);
CREATE INDEX IF NOT EXISTS "idx_cnc_household" ON "confirmation_number_categories" ("household_id");

-- 6. Create transaction lifecycle audit table
CREATE TABLE IF NOT EXISTS "transaction_lifecycle_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"transaction_id" text NOT NULL REFERENCES "transactions"("id") ON DELETE cascade,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"field_changed" text,
	"old_value" text,
	"new_value" text,
	"diff_json" json,
	"metadata_json" json DEFAULT '{}',
	"created_at" text DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "idx_tll_transaction" ON "transaction_lifecycle_logs" ("transaction_id");
CREATE INDEX IF NOT EXISTS "idx_tll_actor" ON "transaction_lifecycle_logs" ("actor_id");

-- 7. Create tracked expense lifecycle audit table
CREATE TABLE IF NOT EXISTS "tracked_expense_lifecycle_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"tracked_expense_id" text NOT NULL REFERENCES "tracked_expenses"("id") ON DELETE cascade,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"field_changed" text,
	"old_value" text,
	"new_value" text,
	"diff_json" json,
	"metadata_json" json DEFAULT '{}',
	"created_at" text DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "idx_tell_tracked_expense" ON "tracked_expense_lifecycle_logs" ("tracked_expense_id");
CREATE INDEX IF NOT EXISTS "idx_tell_actor" ON "tracked_expense_lifecycle_logs" ("actor_id");

-- 8. Insert system default categories (A-Z by label)
INSERT INTO "confirmation_number_categories" ("id", "household_id", "key", "label", "icon", "sort_order", "is_system") VALUES
	(gen_random_uuid(), NULL, 'authorization', 'Auth Code', '🔐', 1, true),
	(gen_random_uuid(), NULL, 'balance_transfer', 'Balance Transfer', '🔄', 2, true),
	(gen_random_uuid(), NULL, 'confirmation', 'Confirmation #', '✅', 3, true),
	(gen_random_uuid(), NULL, 'invoice', 'Invoice #', '🧾', 4, true),
	(gen_random_uuid(), NULL, 'order', 'Order #', '📦', 5, true),
	(gen_random_uuid(), NULL, 'payment', 'Payment #', '💳', 6, true),
	(gen_random_uuid(), NULL, 'po', 'PO #', '📋', 7, true),
	(gen_random_uuid(), NULL, 'receipt', 'Receipt #', '🧾', 8, true),
	(gen_random_uuid(), NULL, 'reference', 'Reference #', '🔗', 9, true),
	(gen_random_uuid(), NULL, 'tracking', 'Tracking #', '📍', 10, true);

-- 9. Add Legacy category for migration (not system, so can be recategorized)
INSERT INTO "confirmation_number_categories" ("id", "household_id", "key", "label", "icon", "sort_order", "is_system")
VALUES (gen_random_uuid(), NULL, 'legacy', 'Legacy (Migrated)', '📦', 0, false);

-- 10. Migrate existing confirmation_number to new structure for tracked_expenses
-- This will be run as a data migration after schema changes
-- Note: This is a template - actual migration should be run via application code for proper ID generation

-- 11. Migrate existing confirmation_number to new structure for transactions
-- Same note as above

-- 12. Add foreign key constraints for the new normalized tables
ALTER TABLE "tracked_expense_confirmation_numbers"
	ADD CONSTRAINT "tracked_expense_confirmation_numbers_tracked_expense_id_fk"
	FOREIGN KEY ("tracked_expense_id") REFERENCES "tracked_expenses"("id") ON DELETE cascade;

ALTER TABLE "transaction_confirmation_numbers"
	ADD CONSTRAINT "transaction_confirmation_numbers_transaction_id_fk"
	FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE cascade;

ALTER TABLE "confirmation_number_categories"
	ADD CONSTRAINT "confirmation_number_categories_household_id_fk"
	FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE cascade;

ALTER TABLE "transaction_lifecycle_logs"
	ADD CONSTRAINT "transaction_lifecycle_logs_transaction_id_fk"
	FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE cascade;

ALTER TABLE "tracked_expense_lifecycle_logs"
	ADD CONSTRAINT "tracked_expense_lifecycle_logs_tracked_expense_id_fk"
	FOREIGN KEY ("tracked_expense_id") REFERENCES "tracked_expenses"("id") ON DELETE cascade;