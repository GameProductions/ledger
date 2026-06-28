ALTER TABLE "cross_device_auth" ADD COLUMN "target_user_id" text REFERENCES "users"("id") ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cross_device_target_user" ON "cross_device_auth" ("target_user_id");
