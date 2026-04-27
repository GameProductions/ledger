PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE d1_migrations(
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		name       TEXT UNIQUE,
		applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(1,'0000_cooing_ultimates.sql','2026-04-06 14:10:28');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(2,'0001_keen_arachne.sql','2026-04-07 00:00:14');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(3,'0002_solid_alex_wilder.sql','2026-04-08 11:16:39');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(4,'0003_blushing_purifiers.sql','2026-04-09 06:28:15');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(5,'0004_dusty_roxanne_simpson.sql','2026-04-09 17:09:42');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(6,'0005_typical_switch.sql','2026-04-10 08:07:45');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(7,'0006_clear_obadiah_stane.sql','2026-04-11 09:09:06');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(8,'0007_magical_otto_octavius.sql','2026-04-12 07:56:48');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(9,'0008_demonic_mimic.sql','2026-04-12 20:37:04');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(10,'0009_superb_captain_marvel.sql','2026-04-12 20:37:18');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(11,'0010_rename_audit_logs.sql','2026-04-12 22:27:11');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(12,'0011_add_attention_fields.sql','2026-04-24 13:39:32');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(13,'0012_sturdy_agent_brand.sql','2026-04-24 13:39:32');
CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`balance_cents` integer DEFAULT 0,
	`currency` text DEFAULT 'USD', `status` text DEFAULT 'active',
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `admin_invitations` (
	`token` text PRIMARY KEY NOT NULL,
	`role` text DEFAULT 'super_admin' NOT NULL,
	`is_claimed` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`expires_at` text NOT NULL
);
CREATE TABLE IF NOT EXISTS "audit_logs_archive_20260413" (
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
INSERT INTO "audit_logs_archive_20260413" ("id","household_id","actor_id","table_name","record_id","action","old_values_json","new_values_json","created_at") VALUES('4916b2b2-3aef-405e-9669-be6141299b04','ledger-main-001','system','users','admin_override_uuid_123','login',NULL,'{"strategy":"password"}','2026-04-07 00:16:40');
INSERT INTO "audit_logs_archive_20260413" ("id","household_id","actor_id","table_name","record_id","action","old_values_json","new_values_json","created_at") VALUES('aeb51c26-3344-4456-8840-7c47c7ec185a','ledger-main-001','system','users','admin_override_uuid_123','login',NULL,'{"strategy":"password"}','2026-04-07 00:18:31');
INSERT INTO "audit_logs_archive_20260413" ("id","household_id","actor_id","table_name","record_id","action","old_values_json","new_values_json","created_at") VALUES('16af4d50-56bd-4bc6-8ec0-bbd83f8baf0d','ledger-main-001','536db205-5fbb-4fa3-963f-04497753e223','users','536db205-5fbb-4fa3-963f-04497753e223','PASSWORD_CHANGE',NULL,NULL,'2026-04-09 04:29:30');
INSERT INTO "audit_logs_archive_20260413" ("id","household_id","actor_id","table_name","record_id","action","old_values_json","new_values_json","created_at") VALUES('b1792094-46a7-4294-94cc-00497426b5bb','ledger-main-001','system','users','536db205-5fbb-4fa3-963f-04497753e223','login',NULL,'{"strategy":"password"}','2026-04-09 06:24:28');
INSERT INTO "audit_logs_archive_20260413" ("id","household_id","actor_id","table_name","record_id","action","old_values_json","new_values_json","created_at") VALUES('b6107443-cb30-4f85-b36b-ab807f0952b3','ledger-main-001','system','users','536db205-5fbb-4fa3-963f-04497753e223','login',NULL,'{"strategy":"password"}','2026-04-09 16:11:01');
INSERT INTO "audit_logs_archive_20260413" ("id","household_id","actor_id","table_name","record_id","action","old_values_json","new_values_json","created_at") VALUES('2f093914-4d38-45ee-9c64-75cd04907102','ledger-main-001','536db205-5fbb-4fa3-963f-04497753e223','households','ledger-main-001','UPDATE','{"name":"Default Household"}','{"name":"Buckingham"}','2026-04-09 16:23:41');
INSERT INTO "audit_logs_archive_20260413" ("id","household_id","actor_id","table_name","record_id","action","old_values_json","new_values_json","created_at") VALUES('b581ff34-8527-4130-b181-76040ffad31f','ledger-main-001','536db205-5fbb-4fa3-963f-04497753e223','households','ledger-main-001','UPDATE','{"name":"Buckingham"}','{"name":"Buckingham"}','2026-04-09 16:24:33');
INSERT INTO "audit_logs_archive_20260413" ("id","household_id","actor_id","table_name","record_id","action","old_values_json","new_values_json","created_at") VALUES('b073df89-1417-422b-b887-cb78b5f0f302','ledger-main-001','536db205-5fbb-4fa3-963f-04497753e223','totps','65c372e6-3f06-4d27-8e70-75613db651dc','UPDATE',NULL,'{"name":"1Password"}','2026-04-09 17:14:36');
INSERT INTO "audit_logs_archive_20260413" ("id","household_id","actor_id","table_name","record_id","action","old_values_json","new_values_json","created_at") VALUES('2f3fe7fc-153f-4418-86ca-9008e8440c6a','ledger-main-001','system','users','536db205-5fbb-4fa3-963f-04497753e223','login',NULL,'{"strategy":"passkey"}','2026-04-10 01:50:47');
INSERT INTO "audit_logs_archive_20260413" ("id","household_id","actor_id","table_name","record_id","action","old_values_json","new_values_json","created_at") VALUES('bd55310e-786f-417a-a9df-7c11b9bbeaf7','ledger-main-001','536db205-5fbb-4fa3-963f-04497753e223','households','h-e45e67c0','CREATE',NULL,'{"name":"Test","currency":"USD"}','2026-04-10 01:51:31');
INSERT INTO "audit_logs_archive_20260413" ("id","household_id","actor_id","table_name","record_id","action","old_values_json","new_values_json","created_at") VALUES('fd7d1d79-d374-482d-ae74-336e9ec41edd','ledger-main-001','536db205-5fbb-4fa3-963f-04497753e223','households','h-94c40895','CREATE',NULL,'{"name":"Buckingham","currency":"USD"}','2026-04-10 01:52:08');
INSERT INTO "audit_logs_archive_20260413" ("id","household_id","actor_id","table_name","record_id","action","old_values_json","new_values_json","created_at") VALUES('ee7ee6b0-0f8c-4334-8f31-90633e93fad2','ledger-main-001','536db205-5fbb-4fa3-963f-04497753e223','households','h-e45e67c0','UPDATE','{"name":"Test"}','{"name":"test2"}','2026-04-10 01:57:46');
INSERT INTO "audit_logs_archive_20260413" ("id","household_id","actor_id","table_name","record_id","action","old_values_json","new_values_json","created_at") VALUES('23f94332-baeb-4a94-8e0f-5d42fef52563','ledger-main-001','system','users','536db205-5fbb-4fa3-963f-04497753e223','login',NULL,'{"strategy":"password"}','2026-04-10 08:42:09');
INSERT INTO "audit_logs_archive_20260413" ("id","household_id","actor_id","table_name","record_id","action","old_values_json","new_values_json","created_at") VALUES('1b9340c1-ef56-4afc-86f9-4ee7c034a785','ledger-main-001','system','users','536db205-5fbb-4fa3-963f-04497753e223','login',NULL,'{"strategy":"passkey"}','2026-04-10 08:42:25');
INSERT INTO "audit_logs_archive_20260413" ("id","household_id","actor_id","table_name","record_id","action","old_values_json","new_values_json","created_at") VALUES('ca622314-961b-4d58-b79b-5d7e55652742','ledger-main-001','system','users','536db205-5fbb-4fa3-963f-04497753e223','login',NULL,'{"strategy":"password"}','2026-04-10 12:44:27');
INSERT INTO "audit_logs_archive_20260413" ("id","household_id","actor_id","table_name","record_id","action","old_values_json","new_values_json","created_at") VALUES('b148c596-3636-4145-8d85-2d892165b11e','ledger-main-001','system','users','536db205-5fbb-4fa3-963f-04497753e223','login',NULL,'{"strategy":"passkey"}','2026-04-10 12:44:55');
INSERT INTO "audit_logs_archive_20260413" ("id","household_id","actor_id","table_name","record_id","action","old_values_json","new_values_json","created_at") VALUES('37168cd4-98a7-465b-9ace-3208314d03a9','ledger-main-001','system','users','536db205-5fbb-4fa3-963f-04497753e223','login',NULL,'{"strategy":"passkey"}','2026-04-10 13:15:35');
INSERT INTO "audit_logs_archive_20260413" ("id","household_id","actor_id","table_name","record_id","action","old_values_json","new_values_json","created_at") VALUES('ee6d8845-5f0b-4b23-9de8-b6a585cd1be1','ledger-main-001','system','users','536db205-5fbb-4fa3-963f-04497753e223','login',NULL,'{"strategy":"password"}','2026-04-10 13:17:59');
INSERT INTO "audit_logs_archive_20260413" ("id","household_id","actor_id","table_name","record_id","action","old_values_json","new_values_json","created_at") VALUES('7cc52087-f0c3-4c14-95de-74bce0babdce','ledger-main-001','536db205-5fbb-4fa3-963f-04497753e223','subscriptions','769bc043-5dd3-40f5-a894-6d6df3c9b872','create',NULL,'{"name":"Test","amount_cents":1000,"billing_cycle":"monthly"}','2026-04-10 16:36:21');
INSERT INTO "audit_logs_archive_20260413" ("id","household_id","actor_id","table_name","record_id","action","old_values_json","new_values_json","created_at") VALUES('0d3a5d1d-d711-4f5c-8056-08ad0519663c','ledger-main-001','system','users','536db205-5fbb-4fa3-963f-04497753e223','login',NULL,'{"strategy":"password"}','2026-04-11 08:14:25');
INSERT INTO "audit_logs_archive_20260413" ("id","household_id","actor_id","table_name","record_id","action","old_values_json","new_values_json","created_at") VALUES('830c8d6d-dbda-43ec-810f-3a75fab672f4','ledger-main-001','536db205-5fbb-4fa3-963f-04497753e223','users','536db205-5fbb-4fa3-963f-04497753e223','UPDATE',NULL,'{"settingsJson":"{\"theme\":\"emerald\"}"}','2026-04-12 00:48:59');
INSERT INTO "audit_logs_archive_20260413" ("id","household_id","actor_id","table_name","record_id","action","old_values_json","new_values_json","created_at") VALUES('9560f899-5b0f-4cbb-bdb1-99ec56678b90','ledger-main-001','536db205-5fbb-4fa3-963f-04497753e223','users','536db205-5fbb-4fa3-963f-04497753e223','UPDATE',NULL,'{"settingsJson":"{\"theme\":\"emerald\"}"}','2026-04-12 04:11:34');
INSERT INTO "audit_logs_archive_20260413" ("id","household_id","actor_id","table_name","record_id","action","old_values_json","new_values_json","created_at") VALUES('14067ee1-eaf6-429b-b015-7f959cedcd2b','ledger-main-001','536db205-5fbb-4fa3-963f-04497753e223','users','536db205-5fbb-4fa3-963f-04497753e223','UPDATE',NULL,'{"settingsJson":"{\"theme\":\"emerald\"}"}','2026-04-12 04:13:15');
INSERT INTO "audit_logs_archive_20260413" ("id","household_id","actor_id","table_name","record_id","action","old_values_json","new_values_json","created_at") VALUES('23c3bec1-aa4c-45ac-8e92-ab6d56755beb','ledger-main-001','536db205-5fbb-4fa3-963f-04497753e223','users','536db205-5fbb-4fa3-963f-04497753e223','UPDATE',NULL,'{"settingsJson":"{\"theme\":\"emerald\"}"}','2026-04-12 04:52:46');
INSERT INTO "audit_logs_archive_20260413" ("id","household_id","actor_id","table_name","record_id","action","old_values_json","new_values_json","created_at") VALUES('d8496216-a07b-41c5-a6b1-b390ebf489a0','ledger-main-001','536db205-5fbb-4fa3-963f-04497753e223','users','536db205-5fbb-4fa3-963f-04497753e223','UPDATE',NULL,'{"settingsJson":"{\"theme\":\"emerald\"}"}','2026-04-12 06:02:22');
INSERT INTO "audit_logs_archive_20260413" ("id","household_id","actor_id","table_name","record_id","action","old_values_json","new_values_json","created_at") VALUES('25831c1e-c568-4d6f-b614-24e52933e749','ledger-main-001','536db205-5fbb-4fa3-963f-04497753e223','users','536db205-5fbb-4fa3-963f-04497753e223','UPDATE',NULL,'{"settingsJson":"{\"theme\":\"emerald\"}"}','2026-04-12 06:17:09');
INSERT INTO "audit_logs_archive_20260413" ("id","household_id","actor_id","table_name","record_id","action","old_values_json","new_values_json","created_at") VALUES('b0de7cc0-cbf4-441b-9af9-954ba0cb85b2','ledger-main-001','536db205-5fbb-4fa3-963f-04497753e223','users','536db205-5fbb-4fa3-963f-04497753e223','UPDATE',NULL,'{"settingsJson":"{\"theme\":\"emerald\"}"}','2026-04-12 07:58:10');
INSERT INTO "audit_logs_archive_20260413" ("id","household_id","actor_id","table_name","record_id","action","old_values_json","new_values_json","created_at") VALUES('71531fbb-2a7c-46bb-be40-3b49eeb3fe4f','ledger-main-001','system','users','536db205-5fbb-4fa3-963f-04497753e223','login',NULL,'{"strategy":"password"}','2026-04-12 11:19:25');
INSERT INTO "audit_logs_archive_20260413" ("id","household_id","actor_id","table_name","record_id","action","old_values_json","new_values_json","created_at") VALUES('88bd233c-c6a8-45ca-b7f8-bb680c39a84a','ledger-main-001','536db205-5fbb-4fa3-963f-04497753e223','users','536db205-5fbb-4fa3-963f-04497753e223','UPDATE',NULL,'{"settingsJson":"{\"theme\":\"emerald\"}"}','2026-04-12 11:19:25');
INSERT INTO "audit_logs_archive_20260413" ("id","household_id","actor_id","table_name","record_id","action","old_values_json","new_values_json","created_at") VALUES('8b0f5d66-ef6f-43de-934b-682311385db9','ledger-main-001','536db205-5fbb-4fa3-963f-04497753e223','users','536db205-5fbb-4fa3-963f-04497753e223','UPDATE',NULL,'{"settingsJson":"{\"theme\":\"emerald\"}"}','2026-04-12 13:53:24');
INSERT INTO "audit_logs_archive_20260413" ("id","household_id","actor_id","table_name","record_id","action","old_values_json","new_values_json","created_at") VALUES('699592dd-9019-46a1-95f3-f028cf50749b','ledger-main-001','536db205-5fbb-4fa3-963f-04497753e223','users','536db205-5fbb-4fa3-963f-04497753e223','UPDATE',NULL,'{"settingsJson":"{\"theme\":\"emerald\"}"}','2026-04-12 17:25:32');
INSERT INTO "audit_logs_archive_20260413" ("id","household_id","actor_id","table_name","record_id","action","old_values_json","new_values_json","created_at") VALUES('4a50dfe0-03f3-445c-ae6c-af6a88725765','ledger-main-001','536db205-5fbb-4fa3-963f-04497753e223','users','536db205-5fbb-4fa3-963f-04497753e223','UPDATE',NULL,'{"settingsJson":"{\"theme\":\"emerald\"}"}','2026-04-12 20:07:38');
INSERT INTO "audit_logs_archive_20260413" ("id","household_id","actor_id","table_name","record_id","action","old_values_json","new_values_json","created_at") VALUES('5205d317-37f4-4fd9-92ae-69eadf88544b','ledger-main-001','536db205-5fbb-4fa3-963f-04497753e223','users','536db205-5fbb-4fa3-963f-04497753e223','UPDATE',NULL,'{"settingsJson":"{\"theme\":\"emerald\"}"}','2026-04-12 20:55:45');
INSERT INTO "audit_logs_archive_20260413" ("id","household_id","actor_id","table_name","record_id","action","old_values_json","new_values_json","created_at") VALUES('ec499bc1-ebd2-469a-8fe8-cd68c796cfde','ledger-main-001','536db205-5fbb-4fa3-963f-04497753e223','users','536db205-5fbb-4fa3-963f-04497753e223','UPDATE',NULL,'{"settingsJson":"{\"theme\":\"emerald\"}"}','2026-04-12 20:55:57');
INSERT INTO "audit_logs_archive_20260413" ("id","household_id","actor_id","table_name","record_id","action","old_values_json","new_values_json","created_at") VALUES('6deef907-d9a5-47d2-862b-80d9e709d5c8','ledger-main-001','536db205-5fbb-4fa3-963f-04497753e223','users','536db205-5fbb-4fa3-963f-04497753e223','UPDATE',NULL,'{"settingsJson":"{\"theme\":\"emerald\"}"}','2026-04-12 20:59:08');
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
CREATE TABLE `holidays` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`name` text NOT NULL,
	`country_code` text DEFAULT 'US'
);
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
CREATE TABLE `households` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`currency` text DEFAULT 'USD',
	`country_code` text DEFAULT 'US',
	`unallocated_balance_cents` integer DEFAULT 0
, `status` text DEFAULT 'active');
INSERT INTO "households" ("id","name","created_at","currency","country_code","unallocated_balance_cents","status") VALUES('ledger-main-001','Buckingham','2026-04-07 00:16:29','USD','US',0,'active');
INSERT INTO "households" ("id","name","created_at","currency","country_code","unallocated_balance_cents","status") VALUES('h-e45e67c0','test2','2026-04-10 01:51:31','USD','US',0,'active');
INSERT INTO "households" ("id","name","created_at","currency","country_code","unallocated_balance_cents","status") VALUES('h-94c40895','Buckingham','2026-04-10 01:52:08','USD','US',0,'active');
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
	`status` text DEFAULT 'active', `upcoming_amount_cents` integer, `upcoming_effective_date` text,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
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
CREATE TABLE `notification_settings` (
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`event` text NOT NULL,
	`enabled` integer DEFAULT false,
	`offset_days` integer DEFAULT 3,
	PRIMARY KEY(`user_id`, `type`, `event`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `passkeys` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`public_key` text NOT NULL,
	`credential_id` text NOT NULL,
	`name` text,
	`aaguid` text,
	`counter` integer DEFAULT 0,
	`transports` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP, `backed_up` integer DEFAULT false, `last_used_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
INSERT INTO "passkeys" ("id","user_id","public_key","credential_id","name","aaguid","counter","transports","created_at","backed_up","last_used_at") VALUES('4b83566a-edc6-4578-b256-99a637c0705e','536db205-5fbb-4fa3-963f-04497753e223','pQECAyYgASFYIDVSMyeRUOU3NZoWPz/1DtqR5Sx5YThmJco2qI3U85MVIlgg09PMxOjzwOwwtlTnYDTjipWjvEV1xxgzdhHNcFBa83w=','og_ToDujf_G9KTvqk--ct4-Y5ut1xeWxrcJUPze4sUG9iHY9sQ','1Password','bada5566-a7aa-401f-bd96-45619a55120d',0,NULL,'2026-04-09 19:41:37',1,'2026-04-09 19:41:37');
INSERT INTO "passkeys" ("id","user_id","public_key","credential_id","name","aaguid","counter","transports","created_at","backed_up","last_used_at") VALUES('5828553b-f37e-4331-83cf-9d4fb10838e6','536db205-5fbb-4fa3-963f-04497753e223','pQECAyYgASFYILgzABlzcV7caZWcce5NCgX7zSqeFKz6Q5OqFHc1DrrGIlggXFj2GzsN2xV35fu9I8CLsO/DkAR7EZpP52V5VGReQGQ=','35YMFL1iKyIKPJmqc_mz-UYFzgRbYBc4jXXTktxkp6w',NULL,'adce0002-35bc-c60a-648b-0b25f1f05503',0,NULL,'2026-04-09 19:48:17',0,'2026-04-09 19:48:17');
CREATE TABLE `password_resets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token` text NOT NULL,
	`is_used` integer DEFAULT 0,
	`expires_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `pay_schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`name` text NOT NULL,
	`frequency` text NOT NULL,
	`next_pay_date` text,
	`estimated_amount_cents` integer, `notes` text, `user_id` text REFERENCES users(id), `semi_monthly_day_1` integer, `semi_monthly_day_2` integer, `upcoming_amount_cents` integer, `upcoming_effective_date` text,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE IF NOT EXISTS "admin_audit_logs" (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`action` text NOT NULL,
	`target` text NOT NULL,
	`target_id` text,
	`details_json` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE `personal_access_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`name` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`last_used_at` text, `scopes` text DEFAULT 'READ,WRITE',
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action
);
INSERT INTO "personal_access_tokens" ("id","household_id","name","created_at","last_used_at","scopes") VALUES('ledger_5b7e4c5b578f4a02a72269fe5ab0c35d','ledger-main-001','test token','2026-04-11 17:01:19',NULL,'READ,WRITE');
INSERT INTO "personal_access_tokens" ("id","household_id","name","created_at","last_used_at","scopes") VALUES('ledger_5ef69364f3ad456d9467d8c77e8ea8ca','ledger-main-001','test token 2','2026-04-11 17:03:18',NULL,'READ,WRITE');
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
INSERT INTO "savings_buckets" ("id","household_id","name","target_cents","current_cents","target_date","category_id","created_at") VALUES('buck-a3b4d53b-d476-4f4a-8017-0d4c826b9e22','ledger-main-001','Test',5000,0,NULL,NULL,'2026-04-10 16:28:22');
INSERT INTO "savings_buckets" ("id","household_id","name","target_cents","current_cents","target_date","category_id","created_at") VALUES('buck-7dd3b911-0606-426b-87db-ba0faa2fdbb3','ledger-main-001','test2',10000,0,NULL,NULL,'2026-04-10 16:28:34');
INSERT INTO "savings_buckets" ("id","household_id","name","target_cents","current_cents","target_date","category_id","created_at") VALUES('buck-f3cc0e1e-f5a4-4e28-ab7c-5b738b15ac40','h-94c40895','Bucket 1',10000,0,NULL,NULL,'2026-04-24 17:34:59');
INSERT INTO "savings_buckets" ("id","household_id","name","target_cents","current_cents","target_date","category_id","created_at") VALUES('buck-75f63758-effd-451d-bc38-2bcbd0eec8df','h-94c40895','bucket 1',10000,0,NULL,NULL,'2026-04-24 20:16:21');
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
CREATE TABLE `service_providers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`visibility` text DEFAULT 'public',
	`household_id` text,
	`created_by` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP, `status` text DEFAULT 'active', `billing_processor_id` text,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action
);
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
	`owner_id` text, `upcoming_amount_cents` integer, `upcoming_effective_date` text,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
INSERT INTO "subscriptions" ("id","household_id","name","amount_cents","billing_cycle","next_billing_date","trial_end_date","is_trial","category_id","account_id","payment_mode","owner_id","upcoming_amount_cents","upcoming_effective_date") VALUES('769bc043-5dd3-40f5-a894-6d6df3c9b872','ledger-main-001','Test',1000,'monthly','2026-04-24',NULL,0,NULL,NULL,'manual','536db205-5fbb-4fa3-963f-04497753e223',NULL,NULL);
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
INSERT INTO "support_issues" ("id","user_id","title","description","category","priority","status","github_issue_url","created_at","updated_at") VALUES('97df9d67-e50a-43ee-a7cf-b03bb9fd01e2','536db205-5fbb-4fa3-963f-04497753e223','Test ticket','Test ticket','General','medium','open','https://github.com/GameProductions/ledger/issues/83','2026-04-24 19:51:46','2026-04-24 19:51:46');
INSERT INTO "support_issues" ("id","user_id","title","description","category","priority","status","github_issue_url","created_at","updated_at") VALUES('a150cea1-aa56-4fe6-b9c3-f4f36518f347','536db205-5fbb-4fa3-963f-04497753e223','Test 2','second test ticket','General','medium','open','https://github.com/GameProductions/ledger/issues/84','2026-04-24 20:05:04','2026-04-24 20:05:04');
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
CREATE TABLE `system_audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`action` text NOT NULL,
	`target` text NOT NULL,
	`details_json` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE `system_config` (
	`id` text PRIMARY KEY NOT NULL,
	`config_key` text NOT NULL,
	`config_value` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE `system_feature_flags` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	`feature_key` text NOT NULL,
	`enabled_globally` integer DEFAULT 0,
	`description` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE `system_registry` (
	`id` text PRIMARY KEY NOT NULL,
	`item_type` text NOT NULL,
	`name` text NOT NULL,
	`logo_url` text,
	`website_url` text,
	`metadata_json` text
);
CREATE TABLE `system_walkthroughs` (
	`id` text PRIMARY KEY NOT NULL,
	`version` text NOT NULL,
	`title` text NOT NULL,
	`content_md` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
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
CREATE TABLE `transaction_timeline` (
	`id` text PRIMARY KEY NOT NULL,
	`transaction_id` text NOT NULL,
	`type` text NOT NULL,
	`content` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE no action
);
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
	`reconciliation_status` text DEFAULT 'unreconciled', `notes` text, `raw_description` text, `parent_id` text, `provider_id` text REFERENCES service_providers(id), `bill_id` text REFERENCES bills(id), `attention_required` integer DEFAULT false, `needs_balance_transfer` integer DEFAULT false, `transfer_timing` text, `is_borrowed` integer DEFAULT false, `borrow_source` text, `accounted_for` integer DEFAULT false,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `user_households` (
	`user_id` text NOT NULL,
	`household_id` text NOT NULL,
	`role` text DEFAULT 'member',
	PRIMARY KEY(`user_id`, `household_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action
);
INSERT INTO "user_households" ("user_id","household_id","role") VALUES('536db205-5fbb-4fa3-963f-04497753e223','h-e45e67c0','admin');
INSERT INTO "user_households" ("user_id","household_id","role") VALUES('536db205-5fbb-4fa3-963f-04497753e223','h-94c40895','admin');
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
INSERT INTO "user_identities" ("id","user_id","provider","provider_user_id","email","name","avatar_url","access_token","refresh_token","token_expires_at","created_at","updated_at") VALUES('97c452ee-c5f7-4f44-a69c-4262dea7a370','536db205-5fbb-4fa3-963f-04497753e223','discord','447814058465296396','discord@gameproductions.net','morenicano','https://cdn.discordapp.com/avatars/447814058465296396/1440137d1076454840612ce358f56972.png','MTQ4NTM5NTYzNjkxNTI3Mzg5MA.891AWrnXpAPjf2avho4UCD1IFldjH9','c1bBqJVNacv9KChyrrS5bLhcFlEDDW','2026-04-16T20:18:40.769Z','2026-04-06 21:23:08','2026-04-09T20:18:40.769Z');
CREATE TABLE `user_linked_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`account_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `user_onboarding` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`step_id` text NOT NULL,
	`status` text DEFAULT 'pending',
	`completed_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
INSERT INTO "user_onboarding" ("id","user_id","step_id","status","completed_at") VALUES('620e4e57-59e6-447e-a145-bfd716acd63a','admin_override_uuid_123','skip','completed',NULL);
INSERT INTO "user_onboarding" ("id","user_id","step_id","status","completed_at") VALUES('757e99e3-93c0-4c66-9133-33491fb9e68f','536db205-5fbb-4fa3-963f-04497753e223','skip','completed',NULL);
INSERT INTO "user_onboarding" ("id","user_id","step_id","status","completed_at") VALUES('77d70b75-3d8e-4165-8a19-9a14a78a86eb','536db205-5fbb-4fa3-963f-04497753e223','welcome','completed',NULL);
INSERT INTO "user_onboarding" ("id","user_id","step_id","status","completed_at") VALUES('bcdd96ac-1680-4650-b57e-2be3fc22b958','536db205-5fbb-4fa3-963f-04497753e223','security','completed',NULL);
INSERT INTO "user_onboarding" ("id","user_id","step_id","status","completed_at") VALUES('b5209dde-8f37-4487-90d7-67023cd37dc9','536db205-5fbb-4fa3-963f-04497753e223','dashboard','completed',NULL);
INSERT INTO "user_onboarding" ("id","user_id","step_id","status","completed_at") VALUES('0b2ff564-11e7-422c-ba90-32f5cc1bb5ef','536db205-5fbb-4fa3-963f-04497753e223','skip','completed',NULL);
INSERT INTO "user_onboarding" ("id","user_id","step_id","status","completed_at") VALUES('41a5f2b2-a2df-424a-b2db-950bd0cefaa7','536db205-5fbb-4fa3-963f-04497753e223','skip','completed',NULL);
INSERT INTO "user_onboarding" ("id","user_id","step_id","status","completed_at") VALUES('dae940e3-052d-4e53-ab75-22868f4ebbb3','536db205-5fbb-4fa3-963f-04497753e223','welcome','completed',NULL);
INSERT INTO "user_onboarding" ("id","user_id","step_id","status","completed_at") VALUES('f8731a83-9576-4116-8ee3-ed685d530f12','536db205-5fbb-4fa3-963f-04497753e223','skip','completed',NULL);
INSERT INTO "user_onboarding" ("id","user_id","step_id","status","completed_at") VALUES('2841ade1-8782-4f06-9e7f-bbee0e1f0dd3','536db205-5fbb-4fa3-963f-04497753e223','skip','completed',NULL);
INSERT INTO "user_onboarding" ("id","user_id","step_id","status","completed_at") VALUES('8d3a444c-2d2c-4a32-88e8-8113a5c4b395','536db205-5fbb-4fa3-963f-04497753e223','skip','completed',NULL);
INSERT INTO "user_onboarding" ("id","user_id","step_id","status","completed_at") VALUES('91b037f5-ce42-45e4-aa4a-5b751df9877a','536db205-5fbb-4fa3-963f-04497753e223','skip','completed',NULL);
INSERT INTO "user_onboarding" ("id","user_id","step_id","status","completed_at") VALUES('24c9b8da-1eff-45f4-8a64-9b32e729e608','536db205-5fbb-4fa3-963f-04497753e223','skip','completed',NULL);
INSERT INTO "user_onboarding" ("id","user_id","step_id","status","completed_at") VALUES('3fce5adc-8f88-4a6b-9e57-c2b545376935','536db205-5fbb-4fa3-963f-04497753e223','welcome','completed',NULL);
INSERT INTO "user_onboarding" ("id","user_id","step_id","status","completed_at") VALUES('a1ecc6c7-5652-4271-beb4-ba39fe9a2d51','536db205-5fbb-4fa3-963f-04497753e223','security','completed',NULL);
INSERT INTO "user_onboarding" ("id","user_id","step_id","status","completed_at") VALUES('17813573-3e01-407b-b7ee-afa23c4c9aa7','536db205-5fbb-4fa3-963f-04497753e223','dashboard','completed',NULL);
INSERT INTO "user_onboarding" ("id","user_id","step_id","status","completed_at") VALUES('233b84fd-e455-47aa-b2a8-f3410c8a065f','536db205-5fbb-4fa3-963f-04497753e223','vault','completed',NULL);
INSERT INTO "user_onboarding" ("id","user_id","step_id","status","completed_at") VALUES('05ccd7fd-efe3-40e0-a3ee-fc5014847db5','536db205-5fbb-4fa3-963f-04497753e223','accounts','completed',NULL);
INSERT INTO "user_onboarding" ("id","user_id","step_id","status","completed_at") VALUES('91681d45-a276-4059-9a19-79a3cecb205a','536db205-5fbb-4fa3-963f-04497753e223','budget','completed',NULL);
INSERT INTO "user_onboarding" ("id","user_id","step_id","status","completed_at") VALUES('c5be0e68-e256-4fc9-a76e-4d74940b5a43','536db205-5fbb-4fa3-963f-04497753e223','subscriptions','completed',NULL);
INSERT INTO "user_onboarding" ("id","user_id","step_id","status","completed_at") VALUES('0e0dbd7f-5829-4fd7-882b-7d40e5d0754b','536db205-5fbb-4fa3-963f-04497753e223','rollovers','completed',NULL);
INSERT INTO "user_onboarding" ("id","user_id","step_id","status","completed_at") VALUES('5933a9e7-a44f-4ff3-b057-d884674ce801','536db205-5fbb-4fa3-963f-04497753e223','receipts','completed',NULL);
INSERT INTO "user_onboarding" ("id","user_id","step_id","status","completed_at") VALUES('90e7c87b-3724-4a61-9ec6-f6eed018de1b','536db205-5fbb-4fa3-963f-04497753e223','skip','completed',NULL);
INSERT INTO "user_onboarding" ("id","user_id","step_id","status","completed_at") VALUES('37a4bd47-0389-4dec-a856-02815f3795a9','536db205-5fbb-4fa3-963f-04497753e223','skip','completed',NULL);
INSERT INTO "user_onboarding" ("id","user_id","step_id","status","completed_at") VALUES('5335474b-7f3d-4e9a-b510-f1cbbb5c5a59','536db205-5fbb-4fa3-963f-04497753e223','skip','completed',NULL);
INSERT INTO "user_onboarding" ("id","user_id","step_id","status","completed_at") VALUES('dd5a9450-0356-4da4-9fa4-2d9f5b617fb9','536db205-5fbb-4fa3-963f-04497753e223','skip','completed',NULL);
INSERT INTO "user_onboarding" ("id","user_id","step_id","status","completed_at") VALUES('d77a709d-beab-4959-bc16-ccb104b6b45b','536db205-5fbb-4fa3-963f-04497753e223','skip','completed',NULL);
CREATE TABLE `user_payment_methods` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`token` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP, `status` text DEFAULT 'active',
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `user_preferences` (
	`user_id` text NOT NULL,
	`key` text NOT NULL,
	`value` text,
	PRIMARY KEY(`user_id`, `key`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
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
, `passkey_verified_at` text);
INSERT INTO "users" ("id","email","display_name","username","password_hash","avatar_url","totp_secret","totp_enabled","global_role","status","last_active_at","settings_json","last_viewed_version","force_password_change","created_at","passkey_verified_at") VALUES('536db205-5fbb-4fa3-963f-04497753e223','ledger@gameproductions.net','Devon','morenicano','100000.g/AyBzjAGRUFK9sOF9dNwg==.1vnSQhEdu+8ie5l9+GFiNw81ZOYQPHdD3Lwu3ub4zhg=','https://cdn.discordapp.com/avatars/447814058465296396/1440137d1076454840612ce358f56972.png','EUSBEV7VDWNJYOEE5LYCY5X3A5OI3UNT',1,'super_admin','active','2026-04-26T17:54:37.244Z','{"theme":"emerald"}','3.32.3',0,'2026-04-06 21:23:08','2026-04-09 19:48:17');
INSERT INTO "users" ("id","email","display_name","username","password_hash","avatar_url","totp_secret","totp_enabled","global_role","status","last_active_at","settings_json","last_viewed_version","force_password_change","created_at","passkey_verified_at") VALUES('admin_override_uuid_123','admin@gameproductions.net',NULL,'admin','100000.NOBzJdmjqB7nOnhXZ+dG6A==.e0uhzV5atRJ6yFVZ7rRCKq1q+SSKvwQ7Wr9+OYhhPgs=',NULL,NULL,0,'super_admin','active','2026-04-07T00:23:51.504Z','{"theme":"emerald"}','v3.19.11',0,'2026-04-07 00:08:46',NULL);
CREATE TABLE `webhook_delivery_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`webhook_id` text NOT NULL,
	`event` text NOT NULL,
	`status_code` integer DEFAULT 0,
	`error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`webhook_id`) REFERENCES `webhooks`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `webhooks` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`url` text NOT NULL,
	`secret` text NOT NULL,
	`event_list` text NOT NULL,
	`is_active` integer DEFAULT true,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`passkey_verified_at` text,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP, `device_name` text, `os` text, `browser` text, `ip_address` text, `last_active_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
INSERT INTO "sessions" ("id","user_id","passkey_verified_at","expires_at","created_at","device_name","os","browser","ip_address","last_active_at") VALUES('sess-2141365a-bddc-48db-8e86-c327fed82d01','536db205-5fbb-4fa3-963f-04497753e223',NULL,'2026-05-10T08:42:09.023Z','2026-04-10 08:42:09','Mac OS X Device','Mac OS X','Chrome','2601:14d:5080:e660:65b9:9cf9:fb24:6219','2026-04-10T08:42:09.023Z');
INSERT INTO "sessions" ("id","user_id","passkey_verified_at","expires_at","created_at","device_name","os","browser","ip_address","last_active_at") VALUES('sess-a954e0a1-e766-4379-b10f-3988205a5778','536db205-5fbb-4fa3-963f-04497753e223',NULL,'2026-05-10T08:42:25.166Z','2026-04-10 08:42:25','Mac OS X Device','Mac OS X','Chrome','2601:14d:5080:e660:65b9:9cf9:fb24:6219','2026-04-10T08:42:25.166Z');
INSERT INTO "sessions" ("id","user_id","passkey_verified_at","expires_at","created_at","device_name","os","browser","ip_address","last_active_at") VALUES('sess-a8007592-106e-4169-8a1c-68b48cc8064c','536db205-5fbb-4fa3-963f-04497753e223',NULL,'2026-05-10T12:44:27.741Z','2026-04-10 12:44:27','Mac OS X Device','Mac OS X','Chrome','174.172.67.30','2026-04-10T12:44:27.741Z');
INSERT INTO "sessions" ("id","user_id","passkey_verified_at","expires_at","created_at","device_name","os","browser","ip_address","last_active_at") VALUES('sess-e8953b24-d3c0-4638-886b-07b95713f097','536db205-5fbb-4fa3-963f-04497753e223',NULL,'2026-05-10T12:44:55.933Z','2026-04-10 12:44:55','Mac OS X Device','Mac OS X','Chrome','174.172.67.30','2026-04-10T12:44:55.933Z');
INSERT INTO "sessions" ("id","user_id","passkey_verified_at","expires_at","created_at","device_name","os","browser","ip_address","last_active_at") VALUES('sess-6a53e478-7656-4622-a1db-f6c3bccd10e2','536db205-5fbb-4fa3-963f-04497753e223',NULL,'2026-05-10T13:15:35.841Z','2026-04-10 13:15:35','Mac OS X Device','Mac OS X','Chrome','2601:14d:5080:e660:311b:1cb3:bad5:3805','2026-04-10T13:15:35.841Z');
INSERT INTO "sessions" ("id","user_id","passkey_verified_at","expires_at","created_at","device_name","os","browser","ip_address","last_active_at") VALUES('sess-5a42edd1-a24d-46f4-ae13-0bc2ec394a9d','536db205-5fbb-4fa3-963f-04497753e223',NULL,'2026-05-10T13:17:59.342Z','2026-04-10 13:17:59','Mac OS X Device','Mac OS X','Chrome','174.172.67.30','2026-04-10T13:17:59.342Z');
INSERT INTO "sessions" ("id","user_id","passkey_verified_at","expires_at","created_at","device_name","os","browser","ip_address","last_active_at") VALUES('sess-a80e2e3b-11e7-4f34-92bf-0cc9c8bf81ba','536db205-5fbb-4fa3-963f-04497753e223',NULL,'2026-05-11T08:14:25.352Z','2026-04-11 08:14:25','Mac OS X Device','Mac OS X','Chrome','2601:14d:5080:e660:d91d:f95d:671e:3290','2026-04-11T08:14:25.352Z');
INSERT INTO "sessions" ("id","user_id","passkey_verified_at","expires_at","created_at","device_name","os","browser","ip_address","last_active_at") VALUES('sess-287e11e8-3cbe-4f3e-9391-72bf816e9f8c','536db205-5fbb-4fa3-963f-04497753e223',NULL,'2026-05-12T11:19:25.160Z','2026-04-12 11:19:25','Mac OS X Device','Mac OS X','Chrome','2601:14d:5080:e660:893a:85a1:b99:d037','2026-04-12T11:19:25.160Z');
INSERT INTO "sessions" ("id","user_id","passkey_verified_at","expires_at","created_at","device_name","os","browser","ip_address","last_active_at") VALUES('sess-66d6b7a0-cae4-46e8-8d53-17dc6c8d5de6','536db205-5fbb-4fa3-963f-04497753e223',NULL,'2026-05-23T22:44:46.971Z','2026-04-23 22:44:47','Mac OS X Device','Mac OS X','Chrome','2601:14d:5080:e660:f920:95e5:ea9f:5502','2026-04-23T22:44:46.971Z');
INSERT INTO "sessions" ("id","user_id","passkey_verified_at","expires_at","created_at","device_name","os","browser","ip_address","last_active_at") VALUES('sess-c573b865-b7a7-4dca-89d3-ff04d8c2fb3b','536db205-5fbb-4fa3-963f-04497753e223',NULL,'2026-05-23T22:45:27.152Z','2026-04-23 22:45:27','Mac OS X Device','Mac OS X','Chrome','2601:14d:5080:e660:f920:95e5:ea9f:5502','2026-04-23T22:45:27.152Z');
INSERT INTO "sessions" ("id","user_id","passkey_verified_at","expires_at","created_at","device_name","os","browser","ip_address","last_active_at") VALUES('sess-4431d2c2-aadb-49ab-aec4-d3faba8d0aff','536db205-5fbb-4fa3-963f-04497753e223',NULL,'2026-05-23T22:47:53.725Z','2026-04-23 22:47:53','Mac OS X Device','Mac OS X','Chrome','2601:14d:5080:e660:f920:95e5:ea9f:5502','2026-04-23T22:47:53.725Z');
INSERT INTO "sessions" ("id","user_id","passkey_verified_at","expires_at","created_at","device_name","os","browser","ip_address","last_active_at") VALUES('sess-6bd9b92d-fa29-479f-bb01-189e9f8dc758','536db205-5fbb-4fa3-963f-04497753e223',NULL,'2026-05-24T07:14:04.114Z','2026-04-24 07:14:04','Mac OS X Device','Mac OS X','Chrome','2601:14d:5080:e660:f920:95e5:ea9f:5502','2026-04-24T07:14:04.114Z');
INSERT INTO "sessions" ("id","user_id","passkey_verified_at","expires_at","created_at","device_name","os","browser","ip_address","last_active_at") VALUES('sess-a29314df-4e87-4d23-9001-f63cc217118c','536db205-5fbb-4fa3-963f-04497753e223',NULL,'2026-05-24T07:39:59.144Z','2026-04-24 07:39:59','Mac OS X Device','Mac OS X','Chrome','2601:14d:5080:e660:f920:95e5:ea9f:5502','2026-04-24T07:39:59.144Z');
INSERT INTO "sessions" ("id","user_id","passkey_verified_at","expires_at","created_at","device_name","os","browser","ip_address","last_active_at") VALUES('sess-c159f4af-d71a-4fb9-b333-0444db946e27','536db205-5fbb-4fa3-963f-04497753e223',NULL,'2026-05-24T07:43:12.194Z','2026-04-24 07:43:12','Mac OS X Device','Mac OS X','Chrome','2601:14d:5080:e660:f920:95e5:ea9f:5502','2026-04-24T07:43:12.194Z');
INSERT INTO "sessions" ("id","user_id","passkey_verified_at","expires_at","created_at","device_name","os","browser","ip_address","last_active_at") VALUES('sess-80fc9021-97ce-40a4-bcb0-acf69528730c','536db205-5fbb-4fa3-963f-04497753e223',NULL,'2026-05-24T07:44:00.331Z','2026-04-24 07:44:00','Mac OS X Device','Mac OS X','Chrome','2601:14d:5080:e660:f920:95e5:ea9f:5502','2026-04-24T07:44:00.331Z');
INSERT INTO "sessions" ("id","user_id","passkey_verified_at","expires_at","created_at","device_name","os","browser","ip_address","last_active_at") VALUES('sess-6f8103ec-6188-4710-9991-d933753a4114','536db205-5fbb-4fa3-963f-04497753e223',NULL,'2026-05-25T17:41:24.041Z','2026-04-25 17:41:24','Mac OS X Device','Mac OS X','Chrome','45.38.16.203','2026-04-25T17:41:24.041Z');
INSERT INTO "sessions" ("id","user_id","passkey_verified_at","expires_at","created_at","device_name","os","browser","ip_address","last_active_at") VALUES('sess-6d83e845-beb3-4c45-8141-4177450de340','536db205-5fbb-4fa3-963f-04497753e223',NULL,'2026-05-25T18:22:06.869Z','2026-04-25 18:22:06','Mac OS X Device','Mac OS X','Chrome','45.38.16.203','2026-04-25T18:22:06.869Z');
INSERT INTO "sessions" ("id","user_id","passkey_verified_at","expires_at","created_at","device_name","os","browser","ip_address","last_active_at") VALUES('sess-0f076665-d2e7-49a7-84cc-55b8022ba92e','536db205-5fbb-4fa3-963f-04497753e223',NULL,'2026-05-25T18:23:02.772Z','2026-04-25 18:23:02','Mac OS X Device','Mac OS X','Chrome','45.38.16.203','2026-04-25T18:23:02.772Z');
INSERT INTO "sessions" ("id","user_id","passkey_verified_at","expires_at","created_at","device_name","os","browser","ip_address","last_active_at") VALUES('sess-0ca1ee4e-9b18-4e19-a88c-71cf8a6e6de2','536db205-5fbb-4fa3-963f-04497753e223',NULL,'2026-05-26T18:25:16.332Z','2026-04-26 18:25:16','Mac OS X Device','Mac OS X','Chrome','2601:14d:5080:e660:a91c:d2cd:959c:6265','2026-04-26T18:25:16.332Z');
INSERT INTO "sessions" ("id","user_id","passkey_verified_at","expires_at","created_at","device_name","os","browser","ip_address","last_active_at") VALUES('sess-5a55449d-c5c6-482b-8535-988dcd20c998','536db205-5fbb-4fa3-963f-04497753e223',NULL,'2026-05-26T18:25:52.953Z','2026-04-26 18:25:52','Mac OS X Device','Mac OS X','Chrome','2601:14d:5080:e660:a91c:d2cd:959c:6265','2026-04-26T18:25:52.953Z');
CREATE TABLE `totps` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`secret` text NOT NULL,
	`name` text DEFAULT 'Authenticator App',
	`last_used_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
INSERT INTO "totps" ("id","user_id","secret","name","last_used_at","created_at") VALUES('65c372e6-3f06-4d27-8e70-75613db651dc','536db205-5fbb-4fa3-963f-04497753e223','RJ334DQFHQN6KHKFRNOQ5PST2F7QRY4P','1Password',NULL,'2026-04-09 17:14:15');
CREATE TABLE `reminders` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`user_id` text NOT NULL,
	`target_id` text NOT NULL,
	`target_type` text NOT NULL,
	`delivery_type` text NOT NULL,
	`delivery_target` text,
	`frequency_days` integer NOT NULL,
	`time_of_day` text DEFAULT '09:00',
	`note` text,
	`is_active` integer DEFAULT true,
	`last_sent_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
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
	`created_at` text DEFAULT CURRENT_TIMESTAMP, `upcoming_amount_cents` integer, `upcoming_effective_date` text, `owner_id` text REFERENCES users(id),
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
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
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`originator_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `pay_exceptions` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`user_id` text NOT NULL,
	`pay_schedule_id` text NOT NULL,
	`original_date` text NOT NULL,
	`override_date` text,
	`override_amount_cents` integer,
	`note` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`pay_schedule_id`) REFERENCES `pay_schedules`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `transaction_pairing_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`pattern` text NOT NULL,
	`target_provider_id` text,
	`target_category_id` text,
	`auto_confirm` integer DEFAULT false,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`target_provider_id`) REFERENCES `service_providers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`target_category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    household_id TEXT NOT NULL REFERENCES households(id),
    actor_id TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    action TEXT NOT NULL,
    severity TEXT DEFAULT 'INFO',
    target_type TEXT,
    target_id TEXT,
    record_id TEXT,
    old_values_json TEXT DEFAULT '{}',
    new_values_json TEXT DEFAULT '{}',
    metadata_json TEXT DEFAULT '{}',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "audit_logs" ("id","household_id","actor_id","ip_address","user_agent","action","severity","target_type","target_id","record_id","old_values_json","new_values_json","metadata_json","created_at") VALUES(1,'ledger-main-001','system',NULL,NULL,'login','INFO','users',NULL,'admin_override_uuid_123','{}','{"strategy":"password"}','{}','2026-04-07 00:16:40');
INSERT INTO "audit_logs" ("id","household_id","actor_id","ip_address","user_agent","action","severity","target_type","target_id","record_id","old_values_json","new_values_json","metadata_json","created_at") VALUES(2,'ledger-main-001','system',NULL,NULL,'login','INFO','users',NULL,'admin_override_uuid_123','{}','{"strategy":"password"}','{}','2026-04-07 00:18:31');
INSERT INTO "audit_logs" ("id","household_id","actor_id","ip_address","user_agent","action","severity","target_type","target_id","record_id","old_values_json","new_values_json","metadata_json","created_at") VALUES(3,'ledger-main-001','536db205-5fbb-4fa3-963f-04497753e223',NULL,NULL,'PASSWORD_CHANGE','INFO','users',NULL,'536db205-5fbb-4fa3-963f-04497753e223','{}','{}','{}','2026-04-09 04:29:30');
INSERT INTO "audit_logs" ("id","household_id","actor_id","ip_address","user_agent","action","severity","target_type","target_id","record_id","old_values_json","new_values_json","metadata_json","created_at") VALUES(4,'ledger-main-001','system',NULL,NULL,'login','INFO','users',NULL,'536db205-5fbb-4fa3-963f-04497753e223','{}','{"strategy":"password"}','{}','2026-04-09 06:24:28');
INSERT INTO "audit_logs" ("id","household_id","actor_id","ip_address","user_agent","action","severity","target_type","target_id","record_id","old_values_json","new_values_json","metadata_json","created_at") VALUES(5,'ledger-main-001','system',NULL,NULL,'login','INFO','users',NULL,'536db205-5fbb-4fa3-963f-04497753e223','{}','{"strategy":"password"}','{}','2026-04-09 16:11:01');
INSERT INTO "audit_logs" ("id","household_id","actor_id","ip_address","user_agent","action","severity","target_type","target_id","record_id","old_values_json","new_values_json","metadata_json","created_at") VALUES(6,'ledger-main-001','536db205-5fbb-4fa3-963f-04497753e223',NULL,NULL,'UPDATE','INFO','households',NULL,'ledger-main-001','{"name":"Default Household"}','{"name":"Buckingham"}','{}','2026-04-09 16:23:41');
INSERT INTO "audit_logs" ("id","household_id","actor_id","ip_address","user_agent","action","severity","target_type","target_id","record_id","old_values_json","new_values_json","metadata_json","created_at") VALUES(7,'ledger-main-001','536db205-5fbb-4fa3-963f-04497753e223',NULL,NULL,'UPDATE','INFO','households',NULL,'ledger-main-001','{"name":"Buckingham"}','{"name":"Buckingham"}','{}','2026-04-09 16:24:33');
INSERT INTO "audit_logs" ("id","household_id","actor_id","ip_address","user_agent","action","severity","target_type","target_id","record_id","old_values_json","new_values_json","metadata_json","created_at") VALUES(8,'ledger-main-001','536db205-5fbb-4fa3-963f-04497753e223',NULL,NULL,'UPDATE','INFO','totps',NULL,'65c372e6-3f06-4d27-8e70-75613db651dc','{}','{"name":"1Password"}','{}','2026-04-09 17:14:36');
INSERT INTO "audit_logs" ("id","household_id","actor_id","ip_address","user_agent","action","severity","target_type","target_id","record_id","old_values_json","new_values_json","metadata_json","created_at") VALUES(9,'ledger-main-001','system',NULL,NULL,'login','INFO','users',NULL,'536db205-5fbb-4fa3-963f-04497753e223','{}','{"strategy":"passkey"}','{}','2026-04-10 01:50:47');
INSERT INTO "audit_logs" ("id","household_id","actor_id","ip_address","user_agent","action","severity","target_type","target_id","record_id","old_values_json","new_values_json","metadata_json","created_at") VALUES(10,'ledger-main-001','536db205-5fbb-4fa3-963f-04497753e223',NULL,NULL,'CREATE','INFO','households',NULL,'h-e45e67c0','{}','{"name":"Test","currency":"USD"}','{}','2026-04-10 01:51:31');
INSERT INTO "audit_logs" ("id","household_id","actor_id","ip_address","user_agent","action","severity","target_type","target_id","record_id","old_values_json","new_values_json","metadata_json","created_at") VALUES(11,'ledger-main-001','536db205-5fbb-4fa3-963f-04497753e223',NULL,NULL,'CREATE','INFO','households',NULL,'h-94c40895','{}','{"name":"Buckingham","currency":"USD"}','{}','2026-04-10 01:52:08');
INSERT INTO "audit_logs" ("id","household_id","actor_id","ip_address","user_agent","action","severity","target_type","target_id","record_id","old_values_json","new_values_json","metadata_json","created_at") VALUES(12,'ledger-main-001','536db205-5fbb-4fa3-963f-04497753e223',NULL,NULL,'UPDATE','INFO','households',NULL,'h-e45e67c0','{"name":"Test"}','{"name":"test2"}','{}','2026-04-10 01:57:46');
INSERT INTO "audit_logs" ("id","household_id","actor_id","ip_address","user_agent","action","severity","target_type","target_id","record_id","old_values_json","new_values_json","metadata_json","created_at") VALUES(13,'ledger-main-001','system',NULL,NULL,'login','INFO','users',NULL,'536db205-5fbb-4fa3-963f-04497753e223','{}','{"strategy":"password"}','{}','2026-04-10 08:42:09');
INSERT INTO "audit_logs" ("id","household_id","actor_id","ip_address","user_agent","action","severity","target_type","target_id","record_id","old_values_json","new_values_json","metadata_json","created_at") VALUES(14,'ledger-main-001','system',NULL,NULL,'login','INFO','users',NULL,'536db205-5fbb-4fa3-963f-04497753e223','{}','{"strategy":"passkey"}','{}','2026-04-10 08:42:25');
INSERT INTO "audit_logs" ("id","household_id","actor_id","ip_address","user_agent","action","severity","target_type","target_id","record_id","old_values_json","new_values_json","metadata_json","created_at") VALUES(15,'ledger-main-001','system',NULL,NULL,'login','INFO','users',NULL,'536db205-5fbb-4fa3-963f-04497753e223','{}','{"strategy":"password"}','{}','2026-04-10 12:44:27');
INSERT INTO "audit_logs" ("id","household_id","actor_id","ip_address","user_agent","action","severity","target_type","target_id","record_id","old_values_json","new_values_json","metadata_json","created_at") VALUES(16,'ledger-main-001','system',NULL,NULL,'login','INFO','users',NULL,'536db205-5fbb-4fa3-963f-04497753e223','{}','{"strategy":"passkey"}','{}','2026-04-10 12:44:55');
INSERT INTO "audit_logs" ("id","household_id","actor_id","ip_address","user_agent","action","severity","target_type","target_id","record_id","old_values_json","new_values_json","metadata_json","created_at") VALUES(17,'ledger-main-001','system',NULL,NULL,'login','INFO','users',NULL,'536db205-5fbb-4fa3-963f-04497753e223','{}','{"strategy":"passkey"}','{}','2026-04-10 13:15:35');
INSERT INTO "audit_logs" ("id","household_id","actor_id","ip_address","user_agent","action","severity","target_type","target_id","record_id","old_values_json","new_values_json","metadata_json","created_at") VALUES(18,'ledger-main-001','system',NULL,NULL,'login','INFO','users',NULL,'536db205-5fbb-4fa3-963f-04497753e223','{}','{"strategy":"password"}','{}','2026-04-10 13:17:59');
INSERT INTO "audit_logs" ("id","household_id","actor_id","ip_address","user_agent","action","severity","target_type","target_id","record_id","old_values_json","new_values_json","metadata_json","created_at") VALUES(19,'ledger-main-001','536db205-5fbb-4fa3-963f-04497753e223',NULL,NULL,'create','INFO','subscriptions',NULL,'769bc043-5dd3-40f5-a894-6d6df3c9b872','{}','{"name":"Test","amount_cents":1000,"billing_cycle":"monthly"}','{}','2026-04-10 16:36:21');
INSERT INTO "audit_logs" ("id","household_id","actor_id","ip_address","user_agent","action","severity","target_type","target_id","record_id","old_values_json","new_values_json","metadata_json","created_at") VALUES(20,'ledger-main-001','system',NULL,NULL,'login','INFO','users',NULL,'536db205-5fbb-4fa3-963f-04497753e223','{}','{"strategy":"password"}','{}','2026-04-11 08:14:25');
INSERT INTO "audit_logs" ("id","household_id","actor_id","ip_address","user_agent","action","severity","target_type","target_id","record_id","old_values_json","new_values_json","metadata_json","created_at") VALUES(21,'ledger-main-001','536db205-5fbb-4fa3-963f-04497753e223',NULL,NULL,'UPDATE','INFO','users',NULL,'536db205-5fbb-4fa3-963f-04497753e223','{}','{"settingsJson":"{\"theme\":\"emerald\"}"}','{}','2026-04-12 00:48:59');
INSERT INTO "audit_logs" ("id","household_id","actor_id","ip_address","user_agent","action","severity","target_type","target_id","record_id","old_values_json","new_values_json","metadata_json","created_at") VALUES(22,'ledger-main-001','536db205-5fbb-4fa3-963f-04497753e223',NULL,NULL,'UPDATE','INFO','users',NULL,'536db205-5fbb-4fa3-963f-04497753e223','{}','{"settingsJson":"{\"theme\":\"emerald\"}"}','{}','2026-04-12 04:11:34');
INSERT INTO "audit_logs" ("id","household_id","actor_id","ip_address","user_agent","action","severity","target_type","target_id","record_id","old_values_json","new_values_json","metadata_json","created_at") VALUES(23,'ledger-main-001','536db205-5fbb-4fa3-963f-04497753e223',NULL,NULL,'UPDATE','INFO','users',NULL,'536db205-5fbb-4fa3-963f-04497753e223','{}','{"settingsJson":"{\"theme\":\"emerald\"}"}','{}','2026-04-12 04:13:15');
INSERT INTO "audit_logs" ("id","household_id","actor_id","ip_address","user_agent","action","severity","target_type","target_id","record_id","old_values_json","new_values_json","metadata_json","created_at") VALUES(24,'ledger-main-001','536db205-5fbb-4fa3-963f-04497753e223',NULL,NULL,'UPDATE','INFO','users',NULL,'536db205-5fbb-4fa3-963f-04497753e223','{}','{"settingsJson":"{\"theme\":\"emerald\"}"}','{}','2026-04-12 04:52:46');
INSERT INTO "audit_logs" ("id","household_id","actor_id","ip_address","user_agent","action","severity","target_type","target_id","record_id","old_values_json","new_values_json","metadata_json","created_at") VALUES(25,'ledger-main-001','536db205-5fbb-4fa3-963f-04497753e223',NULL,NULL,'UPDATE','INFO','users',NULL,'536db205-5fbb-4fa3-963f-04497753e223','{}','{"settingsJson":"{\"theme\":\"emerald\"}"}','{}','2026-04-12 06:02:22');
INSERT INTO "audit_logs" ("id","household_id","actor_id","ip_address","user_agent","action","severity","target_type","target_id","record_id","old_values_json","new_values_json","metadata_json","created_at") VALUES(26,'ledger-main-001','536db205-5fbb-4fa3-963f-04497753e223',NULL,NULL,'UPDATE','INFO','users',NULL,'536db205-5fbb-4fa3-963f-04497753e223','{}','{"settingsJson":"{\"theme\":\"emerald\"}"}','{}','2026-04-12 06:17:09');
INSERT INTO "audit_logs" ("id","household_id","actor_id","ip_address","user_agent","action","severity","target_type","target_id","record_id","old_values_json","new_values_json","metadata_json","created_at") VALUES(27,'ledger-main-001','536db205-5fbb-4fa3-963f-04497753e223',NULL,NULL,'UPDATE','INFO','users',NULL,'536db205-5fbb-4fa3-963f-04497753e223','{}','{"settingsJson":"{\"theme\":\"emerald\"}"}','{}','2026-04-12 07:58:10');
INSERT INTO "audit_logs" ("id","household_id","actor_id","ip_address","user_agent","action","severity","target_type","target_id","record_id","old_values_json","new_values_json","metadata_json","created_at") VALUES(28,'ledger-main-001','system',NULL,NULL,'login','INFO','users',NULL,'536db205-5fbb-4fa3-963f-04497753e223','{}','{"strategy":"password"}','{}','2026-04-12 11:19:25');
INSERT INTO "audit_logs" ("id","household_id","actor_id","ip_address","user_agent","action","severity","target_type","target_id","record_id","old_values_json","new_values_json","metadata_json","created_at") VALUES(29,'ledger-main-001','536db205-5fbb-4fa3-963f-04497753e223',NULL,NULL,'UPDATE','INFO','users',NULL,'536db205-5fbb-4fa3-963f-04497753e223','{}','{"settingsJson":"{\"theme\":\"emerald\"}"}','{}','2026-04-12 11:19:25');
INSERT INTO "audit_logs" ("id","household_id","actor_id","ip_address","user_agent","action","severity","target_type","target_id","record_id","old_values_json","new_values_json","metadata_json","created_at") VALUES(30,'ledger-main-001','536db205-5fbb-4fa3-963f-04497753e223',NULL,NULL,'UPDATE','INFO','users',NULL,'536db205-5fbb-4fa3-963f-04497753e223','{}','{"settingsJson":"{\"theme\":\"emerald\"}"}','{}','2026-04-12 13:53:24');
INSERT INTO "audit_logs" ("id","household_id","actor_id","ip_address","user_agent","action","severity","target_type","target_id","record_id","old_values_json","new_values_json","metadata_json","created_at") VALUES(31,'ledger-main-001','536db205-5fbb-4fa3-963f-04497753e223',NULL,NULL,'UPDATE','INFO','users',NULL,'536db205-5fbb-4fa3-963f-04497753e223','{}','{"settingsJson":"{\"theme\":\"emerald\"}"}','{}','2026-04-12 17:25:32');
INSERT INTO "audit_logs" ("id","household_id","actor_id","ip_address","user_agent","action","severity","target_type","target_id","record_id","old_values_json","new_values_json","metadata_json","created_at") VALUES(32,'ledger-main-001','536db205-5fbb-4fa3-963f-04497753e223',NULL,NULL,'UPDATE','INFO','users',NULL,'536db205-5fbb-4fa3-963f-04497753e223','{}','{"settingsJson":"{\"theme\":\"emerald\"}"}','{}','2026-04-12 20:07:38');
INSERT INTO "audit_logs" ("id","household_id","actor_id","ip_address","user_agent","action","severity","target_type","target_id","record_id","old_values_json","new_values_json","metadata_json","created_at") VALUES(33,'ledger-main-001','536db205-5fbb-4fa3-963f-04497753e223',NULL,NULL,'UPDATE','INFO','users',NULL,'536db205-5fbb-4fa3-963f-04497753e223','{}','{"settingsJson":"{\"theme\":\"emerald\"}"}','{}','2026-04-12 20:55:45');
INSERT INTO "audit_logs" ("id","household_id","actor_id","ip_address","user_agent","action","severity","target_type","target_id","record_id","old_values_json","new_values_json","metadata_json","created_at") VALUES(34,'ledger-main-001','536db205-5fbb-4fa3-963f-04497753e223',NULL,NULL,'UPDATE','INFO','users',NULL,'536db205-5fbb-4fa3-963f-04497753e223','{}','{"settingsJson":"{\"theme\":\"emerald\"}"}','{}','2026-04-12 20:55:57');
INSERT INTO "audit_logs" ("id","household_id","actor_id","ip_address","user_agent","action","severity","target_type","target_id","record_id","old_values_json","new_values_json","metadata_json","created_at") VALUES(35,'ledger-main-001','536db205-5fbb-4fa3-963f-04497753e223',NULL,NULL,'UPDATE','INFO','users',NULL,'536db205-5fbb-4fa3-963f-04497753e223','{}','{"settingsJson":"{\"theme\":\"emerald\"}"}','{}','2026-04-12 20:59:08');
INSERT INTO "audit_logs" ("id","household_id","actor_id","ip_address","user_agent","action","severity","target_type","target_id","record_id","old_values_json","new_values_json","metadata_json","created_at") VALUES(36,'ledger-main-001','system','2601:14d:5080:e660:f920:95e5:ea9f:5502','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','login','INFO','users',NULL,'536db205-5fbb-4fa3-963f-04497753e223','{}','{"strategy":"password"}','{}','2026-04-23 22:44:47');
INSERT INTO "audit_logs" ("id","household_id","actor_id","ip_address","user_agent","action","severity","target_type","target_id","record_id","old_values_json","new_values_json","metadata_json","created_at") VALUES(37,'ledger-main-001','system','2601:14d:5080:e660:f920:95e5:ea9f:5502','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','login','INFO','users',NULL,'536db205-5fbb-4fa3-963f-04497753e223','{}','{"strategy":"password"}','{}','2026-04-23 22:45:27');
INSERT INTO "audit_logs" ("id","household_id","actor_id","ip_address","user_agent","action","severity","target_type","target_id","record_id","old_values_json","new_values_json","metadata_json","created_at") VALUES(38,'ledger-main-001','system','2601:14d:5080:e660:f920:95e5:ea9f:5502','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','login','INFO','users',NULL,'536db205-5fbb-4fa3-963f-04497753e223','{}','{"strategy":"password"}','{}','2026-04-23 22:47:53');
INSERT INTO "audit_logs" ("id","household_id","actor_id","ip_address","user_agent","action","severity","target_type","target_id","record_id","old_values_json","new_values_json","metadata_json","created_at") VALUES(39,'ledger-main-001','system','2601:14d:5080:e660:f920:95e5:ea9f:5502','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','login','INFO','users',NULL,'536db205-5fbb-4fa3-963f-04497753e223','{}','{"strategy":"password"}','{}','2026-04-24 07:14:04');
INSERT INTO "audit_logs" ("id","household_id","actor_id","ip_address","user_agent","action","severity","target_type","target_id","record_id","old_values_json","new_values_json","metadata_json","created_at") VALUES(40,'ledger-main-001','system','2601:14d:5080:e660:f920:95e5:ea9f:5502','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','login','INFO','users',NULL,'536db205-5fbb-4fa3-963f-04497753e223','{}','{"strategy":"passkey"}','{}','2026-04-24 07:39:59');
INSERT INTO "audit_logs" ("id","household_id","actor_id","ip_address","user_agent","action","severity","target_type","target_id","record_id","old_values_json","new_values_json","metadata_json","created_at") VALUES(41,'ledger-main-001','system','2601:14d:5080:e660:f920:95e5:ea9f:5502','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','login','INFO','users',NULL,'536db205-5fbb-4fa3-963f-04497753e223','{}','{"strategy":"passkey"}','{}','2026-04-24 07:43:12');
INSERT INTO "audit_logs" ("id","household_id","actor_id","ip_address","user_agent","action","severity","target_type","target_id","record_id","old_values_json","new_values_json","metadata_json","created_at") VALUES(42,'ledger-main-001','system','2601:14d:5080:e660:f920:95e5:ea9f:5502','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','login','INFO','users',NULL,'536db205-5fbb-4fa3-963f-04497753e223','{}','{"strategy":"password"}','{}','2026-04-24 07:44:00');
INSERT INTO "audit_logs" ("id","household_id","actor_id","ip_address","user_agent","action","severity","target_type","target_id","record_id","old_values_json","new_values_json","metadata_json","created_at") VALUES(43,'h-94c40895','536db205-5fbb-4fa3-963f-04497753e223','2601:14d:5080:e660:7597:ec32:9a48:8ea1','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','CREATE','INFO','investment_holdings',NULL,'e688ffd1-3fe0-4ccd-a9a2-d3aff5074415','{}','{"name":"Test invest","asset_type":"Stock","quantity":1,"cost_basis_cents":30,"current_valuation_cents":40,"currency":"USD"}','{}','2026-04-24 19:50:07');
INSERT INTO "audit_logs" ("id","household_id","actor_id","ip_address","user_agent","action","severity","target_type","target_id","record_id","old_values_json","new_values_json","metadata_json","created_at") VALUES(44,'ledger-main-001','system','45.38.16.203','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','login','INFO','users',NULL,'536db205-5fbb-4fa3-963f-04497753e223','{}','{"strategy":"password"}','{}','2026-04-25 17:41:24');
INSERT INTO "audit_logs" ("id","household_id","actor_id","ip_address","user_agent","action","severity","target_type","target_id","record_id","old_values_json","new_values_json","metadata_json","created_at") VALUES(45,'ledger-main-001','system','45.38.16.203','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','login','INFO','users',NULL,'536db205-5fbb-4fa3-963f-04497753e223','{}','{"strategy":"passkey"}','{}','2026-04-25 18:22:06');
INSERT INTO "audit_logs" ("id","household_id","actor_id","ip_address","user_agent","action","severity","target_type","target_id","record_id","old_values_json","new_values_json","metadata_json","created_at") VALUES(46,'ledger-main-001','system','45.38.16.203','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','login','INFO','users',NULL,'536db205-5fbb-4fa3-963f-04497753e223','{}','{"strategy":"password"}','{}','2026-04-25 18:23:02');
INSERT INTO "audit_logs" ("id","household_id","actor_id","ip_address","user_agent","action","severity","target_type","target_id","record_id","old_values_json","new_values_json","metadata_json","created_at") VALUES(47,'h-94c40895','536db205-5fbb-4fa3-963f-04497753e223','2601:14d:5080:e660:a91c:d2cd:959c:6265','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','UPDATE','INFO','households',NULL,'h-94c40895','{"name":"Buckingham"}','{"name":"Buckingham"}','{}','2026-04-26 15:13:45');
INSERT INTO "audit_logs" ("id","household_id","actor_id","ip_address","user_agent","action","severity","target_type","target_id","record_id","old_values_json","new_values_json","metadata_json","created_at") VALUES(48,'ledger-main-001','system','2601:14d:5080:e660:a91c:d2cd:959c:6265','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','login','INFO','users',NULL,'536db205-5fbb-4fa3-963f-04497753e223','{}','{"strategy":"passkey"}','{}','2026-04-26 18:25:16');
INSERT INTO "audit_logs" ("id","household_id","actor_id","ip_address","user_agent","action","severity","target_type","target_id","record_id","old_values_json","new_values_json","metadata_json","created_at") VALUES(49,'ledger-main-001','system','2601:14d:5080:e660:a91c:d2cd:959c:6265','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','login','INFO','users',NULL,'536db205-5fbb-4fa3-963f-04497753e223','{}','{"strategy":"passkey"}','{}','2026-04-26 18:25:53');
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
INSERT INTO "tracked_expenses" ("id","household_id","amount_cents","description","notes","status","attention_required","needs_balance_transfer","transfer_timing","is_borrowed","borrow_source","created_at") VALUES('9151054b-a1d1-4780-ac69-c24f7fa3aea3','h-94c40895',500,'test 1',NULL,'pending',0,0,NULL,0,NULL,'2026-04-24 13:42:48');
INSERT INTO "tracked_expenses" ("id","household_id","amount_cents","description","notes","status","attention_required","needs_balance_transfer","transfer_timing","is_borrowed","borrow_source","created_at") VALUES('31ba451f-df22-4a47-a0d9-6811677f8bed','h-94c40895',1500,'test 3',NULL,'pending',1,1,'future',1,NULL,'2026-04-24 14:23:51');
CREATE TABLE IF NOT EXISTS "investment_holdings" (
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
INSERT INTO "investment_holdings" ("id","household_id","account_id","name","asset_type","quantity","cost_basis_cents","value_cents","currency","institution_id","created_at") VALUES('e688ffd1-3fe0-4ccd-a9a2-d3aff5074415','h-94c40895',NULL,'Test invest','Stock',1,30,40,'USD',NULL,'2026-04-24 19:50:07');
DELETE FROM sqlite_sequence;
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('d1_migrations',13);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('audit_logs',49);
CREATE INDEX `idx_accounts_household` ON `accounts` (`household_id`);
CREATE INDEX `idx_categories_household` ON `categories` (`household_id`);
CREATE INDEX `idx_installments_household` ON `installment_plans` (`household_id`);
CREATE INDEX `idx_savings_household` ON `savings_buckets` (`household_id`);
CREATE INDEX `idx_subscriptions_household` ON `subscriptions` (`household_id`);
CREATE UNIQUE INDEX `system_config_config_key_unique` ON `system_config` (`config_key`);
CREATE UNIQUE INDEX `system_feature_flags_feature_key_unique` ON `system_feature_flags` (`feature_key`);
CREATE INDEX `idx_transactions_household` ON `transactions` (`household_id`);
CREATE INDEX `idx_transactions_account` ON `transactions` (`account_id`);
CREATE INDEX `idx_transactions_category` ON `transactions` (`category_id`);
CREATE UNIQUE INDEX `idx_user_identities_unique` ON `user_identities` (`provider`,`provider_user_id`);
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);
CREATE INDEX `idx_reminders_target` ON `reminders` (`target_type`,`target_id`);
CREATE INDEX `idx_reminders_user` ON `reminders` (`user_id`);
CREATE INDEX `idx_bills_household` ON `bills` (`household_id`);
CREATE INDEX `idx_liability_splits_target` ON `liability_splits` (`target_type`,`target_id`);
CREATE INDEX `idx_liability_splits_assigned` ON `liability_splits` (`assigned_user_id`);
CREATE INDEX `idx_pay_exceptions_household` ON `pay_exceptions` (`household_id`);
CREATE INDEX `idx_pay_exceptions_user` ON `pay_exceptions` (`user_id`);
CREATE INDEX `idx_pay_exceptions_schedule` ON `pay_exceptions` (`pay_schedule_id`);
CREATE INDEX `idx_transactions_parent` ON `transactions` (`parent_id`);
CREATE INDEX `idx_transactions_provider` ON `transactions` (`provider_id`);
CREATE INDEX `idx_bills_owner` ON `bills` (`owner_id`);
CREATE INDEX `idx_pay_schedules_household` ON `pay_schedules` (`household_id`);
CREATE INDEX idx_audit_logs_household ON audit_logs(household_id);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX `idx_tracked_expenses_household` ON `tracked_expenses` (`household_id`);
CREATE INDEX `idx_invest_holdings_household` ON `investment_holdings` (`household_id`);
CREATE INDEX `idx_invest_holdings_account` ON `investment_holdings` (`account_id`);
