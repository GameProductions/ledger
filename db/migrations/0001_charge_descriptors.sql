CREATE TABLE "charge_descriptors" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"default_category_id" text,
	"is_active" boolean DEFAULT true,
	"created_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE "charge_descriptors" ADD CONSTRAINT "charge_descriptors_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_charge_descriptors_household" ON "charge_descriptors" USING btree ("household_id");--> statement-breakpoint
ALTER TABLE "tracked_expenses" ADD COLUMN "charge_descriptor_id" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "charge_descriptor_id" text;
