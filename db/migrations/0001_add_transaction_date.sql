ALTER TABLE "tracked_expenses" ADD COLUMN "transaction_date" text;
--> statement-breakpoint
UPDATE "tracked_expenses" SET "transaction_date" = "created_at" WHERE "transaction_date" IS NULL;
