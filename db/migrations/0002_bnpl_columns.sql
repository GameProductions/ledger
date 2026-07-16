ALTER TABLE "installment_plans" ADD COLUMN "plan_type" text DEFAULT 'user';--> statement-breakpoint
ALTER TABLE "installment_plans" ADD COLUMN "bnpl_provider_id" text;--> statement-breakpoint
ALTER TABLE "installment_plans" ADD COLUMN "original_transaction_id" text;--> statement-breakpoint
CREATE INDEX "idx_installments_provider" ON "installment_plans" USING btree ("bnpl_provider_id");--> statement-breakpoint
CREATE INDEX "idx_installments_type" ON "installment_plans" USING btree ("plan_type");
