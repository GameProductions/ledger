CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`householdId` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`balanceCents` integer DEFAULT 0,
	`currency` text DEFAULT 'USD',
	`status` text DEFAULT 'active',
	FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_accounts_household` ON `accounts` (`householdId`);--> statement-breakpoint
CREATE TABLE `adminAuditLogs` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`action` text NOT NULL,
	`target` text NOT NULL,
	`targetId` text,
	`detailsJson` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `idx_admin_audit_user` ON `adminAuditLogs` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_admin_audit_action` ON `adminAuditLogs` (`action`);--> statement-breakpoint
CREATE INDEX `idx_admin_audit_created` ON `adminAuditLogs` (`createdAt`);--> statement-breakpoint
CREATE TABLE `adminInvitations` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text,
	`token` text NOT NULL,
	`role` text NOT NULL,
	`isClaimed` integer DEFAULT 0,
	`expiresAt` text NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `adminInvitations_token_unique` ON `adminInvitations` (`token`);--> statement-breakpoint
CREATE TABLE `auditLogs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`householdId` text NOT NULL,
	`actorId` text NOT NULL,
	`ipAddress` text,
	`userAgent` text,
	`action` text NOT NULL,
	`severity` text DEFAULT 'INFO',
	`targetType` text,
	`targetId` text,
	`recordId` text,
	`oldValuesJson` text DEFAULT '{}',
	`newValuesJson` text DEFAULT '{}',
	`metadataJson` text DEFAULT '{}',
	`cfRay` text,
	`location` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_audit_logs_household` ON `auditLogs` (`householdId`);--> statement-breakpoint
CREATE INDEX `idx_audit_logs_actor` ON `auditLogs` (`actorId`);--> statement-breakpoint
CREATE INDEX `idx_audit_logs_action` ON `auditLogs` (`action`);--> statement-breakpoint
CREATE INDEX `idx_audit_logs_created` ON `auditLogs` (`createdAt`);--> statement-breakpoint
CREATE TABLE `billingProcessors` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`websiteUrl` text,
	`brandingUrl` text,
	`supportUrl` text,
	`subscriptionIdNotes` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `bills` (
	`id` text PRIMARY KEY NOT NULL,
	`householdId` text NOT NULL,
	`name` text NOT NULL,
	`amountCents` integer NOT NULL,
	`dueDate` text NOT NULL,
	`status` text DEFAULT 'unpaid',
	`notes` text,
	`categoryId` text,
	`accountId` text,
	`isRecurring` integer DEFAULT false,
	`frequency` text,
	`upcomingAmountCents` integer,
	`upcomingEffectiveDate` text,
	`ownerId` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_bills_household` ON `bills` (`householdId`);--> statement-breakpoint
CREATE INDEX `idx_bills_owner` ON `bills` (`ownerId`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`householdId` text NOT NULL,
	`name` text NOT NULL,
	`icon` text,
	`color` text,
	`monthlyBudgetCents` integer DEFAULT 0,
	`envelopeBalanceCents` integer DEFAULT 0,
	`rolloverEnabled` integer DEFAULT false,
	`rolloverCents` integer DEFAULT 0,
	`emergencyFund` integer DEFAULT false,
	FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_categories_household` ON `categories` (`householdId`);--> statement-breakpoint
CREATE TABLE `creditCards` (
	`id` text PRIMARY KEY NOT NULL,
	`householdId` text NOT NULL,
	`accountId` text NOT NULL,
	`creditLimitCents` integer NOT NULL,
	`interestRateApy` integer,
	`statementClosingDay` integer,
	`paymentDueDay` integer,
	`nextStatementDate` text,
	FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_credit_cards_household` ON `creditCards` (`householdId`);--> statement-breakpoint
CREATE INDEX `idx_credit_cards_account` ON `creditCards` (`accountId`);--> statement-breakpoint
CREATE TABLE `externalConnections` (
	`id` text PRIMARY KEY NOT NULL,
	`householdId` text NOT NULL,
	`provider` text NOT NULL,
	`accessToken` text NOT NULL,
	`status` text DEFAULT 'active',
	`lastSyncAt` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_ext_conn_household` ON `externalConnections` (`householdId`);--> statement-breakpoint
CREATE TABLE `holidays` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`name` text NOT NULL,
	`countryCode` text DEFAULT 'US'
);
--> statement-breakpoint
CREATE TABLE `householdInvites` (
	`id` text PRIMARY KEY NOT NULL,
	`householdId` text NOT NULL,
	`createdBy` text NOT NULL,
	`status` text DEFAULT 'pending',
	`expiresAt` text NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_household_invites_household` ON `householdInvites` (`householdId`);--> statement-breakpoint
CREATE INDEX `idx_household_invites_creator` ON `householdInvites` (`createdBy`);--> statement-breakpoint
CREATE TABLE `households` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	`currency` text DEFAULT 'USD',
	`countryCode` text DEFAULT 'US',
	`unallocatedBalanceCents` integer DEFAULT 0,
	`status` text DEFAULT 'active'
);
--> statement-breakpoint
CREATE TABLE `installmentPlans` (
	`id` text PRIMARY KEY NOT NULL,
	`householdId` text NOT NULL,
	`name` text NOT NULL,
	`totalAmountCents` integer NOT NULL,
	`installmentAmountCents` integer NOT NULL,
	`totalInstallments` integer NOT NULL,
	`remainingInstallments` integer NOT NULL,
	`frequency` text NOT NULL,
	`nextPaymentDate` text NOT NULL,
	`accountId` text,
	`paymentMode` text DEFAULT 'manual',
	`status` text DEFAULT 'active',
	`upcomingAmountCents` integer,
	`upcomingEffectiveDate` text,
	FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_installments_household` ON `installmentPlans` (`householdId`);--> statement-breakpoint
CREATE TABLE `investmentHoldings` (
	`id` text PRIMARY KEY NOT NULL,
	`householdId` text NOT NULL,
	`accountId` text,
	`name` text NOT NULL,
	`assetType` text DEFAULT 'misc' NOT NULL,
	`quantity` integer NOT NULL,
	`costBasisCents` integer,
	`valueCents` integer NOT NULL,
	`currency` text DEFAULT 'USD',
	`institutionId` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_invest_holdings_household` ON `investmentHoldings` (`householdId`);--> statement-breakpoint
CREATE INDEX `idx_invest_holdings_account` ON `investmentHoldings` (`accountId`);--> statement-breakpoint
CREATE TABLE `liabilitySplits` (
	`id` text PRIMARY KEY NOT NULL,
	`householdId` text NOT NULL,
	`targetId` text NOT NULL,
	`targetType` text NOT NULL,
	`originatorUserId` text NOT NULL,
	`assignedUserId` text NOT NULL,
	`splitType` text NOT NULL,
	`splitValue` integer NOT NULL,
	`calculatedAmountCents` integer NOT NULL,
	`overrideDate` text,
	`overrideFrequency` text,
	`status` text DEFAULT 'pending',
	`isMasterLedgerPublic` integer DEFAULT false,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`originatorUserId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assignedUserId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `linkedProviders` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`serviceProviderId` text NOT NULL,
	`accountReference` text,
	`customLabel` text,
	`metadata` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`serviceProviderId`) REFERENCES `serviceProviders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_linked_providers_user` ON `linkedProviders` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_linked_providers_provider` ON `linkedProviders` (`serviceProviderId`);--> statement-breakpoint
CREATE TABLE `loanPayments` (
	`id` text PRIMARY KEY NOT NULL,
	`loanId` text NOT NULL,
	`amountCents` integer NOT NULL,
	`platform` text,
	`externalId` text,
	`method` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`loanId`) REFERENCES `personalLoans`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_loan_payments_loan` ON `loanPayments` (`loanId`);--> statement-breakpoint
CREATE TABLE `notificationSettings` (
	`userId` text NOT NULL,
	`type` text NOT NULL,
	`event` text NOT NULL,
	`enabled` integer DEFAULT false,
	`offsetDays` integer DEFAULT 3,
	PRIMARY KEY(`userId`, `type`, `event`),
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `passkeyChallenges` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`challenge` text NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	`expiresAt` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `passkeys` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`credentialId` text NOT NULL,
	`publicKey` text NOT NULL,
	`counter` integer NOT NULL,
	`deviceType` text,
	`backedUp` integer DEFAULT 0,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	`lastUsedAt` text,
	`name` text,
	`aaguid` text,
	`transports` text,
	`providerName` text,
	`icon` text,
	`lastUsedIp` text,
	`lastUsedLocation` text,
	`lastUsedUa` text,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_passkeys_user` ON `passkeys` (`userId`);--> statement-breakpoint
CREATE TABLE `passwordResets` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`token` text NOT NULL,
	`isUsed` integer DEFAULT 0,
	`expiresAt` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_pass_resets_user` ON `passwordResets` (`userId`);--> statement-breakpoint
CREATE TABLE `payExceptions` (
	`id` text PRIMARY KEY NOT NULL,
	`householdId` text NOT NULL,
	`userId` text NOT NULL,
	`payScheduleId` text NOT NULL,
	`originalDate` text NOT NULL,
	`overrideDate` text,
	`overrideAmountCents` integer,
	`note` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`payScheduleId`) REFERENCES `paySchedules`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_pay_exceptions_household` ON `payExceptions` (`householdId`);--> statement-breakpoint
CREATE INDEX `idx_pay_exceptions_user` ON `payExceptions` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_pay_exceptions_schedule` ON `payExceptions` (`payScheduleId`);--> statement-breakpoint
CREATE TABLE `paySchedules` (
	`id` text PRIMARY KEY NOT NULL,
	`householdId` text NOT NULL,
	`userId` text,
	`name` text NOT NULL,
	`frequency` text NOT NULL,
	`nextPayDate` text,
	`estimatedAmountCents` integer,
	`upcomingAmountCents` integer,
	`upcomingEffectiveDate` text,
	`notes` text,
	`semiMonthlyDay1` integer,
	`semiMonthlyDay2` integer,
	FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_pay_schedules_household` ON `paySchedules` (`householdId`);--> statement-breakpoint
CREATE TABLE `personalAccessTokens` (
	`id` text PRIMARY KEY NOT NULL,
	`householdId` text NOT NULL,
	`name` text,
	`scopes` text DEFAULT 'READ,WRITE',
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	`lastUsedAt` text,
	FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_pat_household` ON `personalAccessTokens` (`householdId`);--> statement-breakpoint
CREATE TABLE `personalLoans` (
	`id` text PRIMARY KEY NOT NULL,
	`householdId` text NOT NULL,
	`lenderUserId` text NOT NULL,
	`borrowerName` text NOT NULL,
	`borrowerContact` text,
	`totalAmountCents` integer NOT NULL,
	`remainingBalanceCents` integer NOT NULL,
	`interestRateApy` integer DEFAULT 0,
	`termMonths` integer,
	`originationDate` text NOT NULL,
	FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lenderUserId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_personal_loans_household` ON `personalLoans` (`householdId`);--> statement-breakpoint
CREATE INDEX `idx_personal_loans_lender` ON `personalLoans` (`lenderUserId`);--> statement-breakpoint
CREATE TABLE `privacyCards` (
	`id` text PRIMARY KEY NOT NULL,
	`householdId` text NOT NULL,
	`connectionId` text NOT NULL,
	`last4` text NOT NULL,
	`hostname` text,
	`spendLimitCents` integer,
	`state` text,
	FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_privacy_cards_household` ON `privacyCards` (`householdId`);--> statement-breakpoint
CREATE TABLE `reminders` (
	`id` text PRIMARY KEY NOT NULL,
	`householdId` text NOT NULL,
	`userId` text NOT NULL,
	`targetId` text NOT NULL,
	`targetType` text NOT NULL,
	`deliveryType` text NOT NULL,
	`deliveryTarget` text,
	`frequencyDays` integer NOT NULL,
	`timeOfDay` text DEFAULT '09:00',
	`note` text,
	`isActive` integer DEFAULT true,
	`lastSentAt` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_reminders_target` ON `reminders` (`targetType`,`targetId`);--> statement-breakpoint
CREATE INDEX `idx_reminders_user` ON `reminders` (`userId`);--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`householdId` text NOT NULL,
	`type` text NOT NULL,
	`periodStart` text,
	`periodEnd` text,
	`dataJson` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_reports_household` ON `reports` (`householdId`);--> statement-breakpoint
CREATE TABLE `savingsBuckets` (
	`id` text PRIMARY KEY NOT NULL,
	`householdId` text NOT NULL,
	`name` text NOT NULL,
	`targetCents` integer NOT NULL,
	`currentCents` integer DEFAULT 0,
	`targetDate` text,
	`categoryId` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_savings_household` ON `savingsBuckets` (`householdId`);--> statement-breakpoint
CREATE TABLE `scheduleHistory` (
	`id` text PRIMARY KEY NOT NULL,
	`scheduleId` text NOT NULL,
	`householdId` text NOT NULL,
	`occurrenceAt` text NOT NULL,
	`actionStatus` text NOT NULL,
	`detailsJson` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`scheduleId`) REFERENCES `schedules`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_sched_history_schedule` ON `scheduleHistory` (`scheduleId`);--> statement-breakpoint
CREATE INDEX `idx_sched_history_household` ON `scheduleHistory` (`householdId`);--> statement-breakpoint
CREATE TABLE `schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`householdId` text NOT NULL,
	`targetId` text NOT NULL,
	`targetType` text NOT NULL,
	`frequency` text NOT NULL,
	`nextRunAt` text NOT NULL,
	`lastRunAt` text,
	`executedCount` integer DEFAULT 0,
	`status` text DEFAULT 'active',
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `serviceProviders` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`visibility` text DEFAULT 'public',
	`householdId` text,
	`billingProcessorId` text,
	`createdBy` text,
	`status` text DEFAULT 'active',
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_providers_household` ON `serviceProviders` (`householdId`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	`expiresAt` text NOT NULL,
	`passkeyVerifiedAt` text,
	`challenge` text,
	`userAgent` text,
	`ipAddress` text,
	`lastActiveAt` text DEFAULT CURRENT_TIMESTAMP,
	`deviceName` text,
	`os` text,
	`browser` text,
	`cfRay` text,
	`isPersistent` integer DEFAULT 0,
	`city` text,
	`country` text,
	`region` text,
	`continent` text,
	`latitude` text,
	`longitude` text,
	`cfIp` text,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_sessions_user` ON `sessions` (`userId`);--> statement-breakpoint
CREATE TABLE `sharedBalances` (
	`id` text PRIMARY KEY NOT NULL,
	`householdId` text NOT NULL,
	`fromUserId` text NOT NULL,
	`toUserId` text NOT NULL,
	`amountCents` integer NOT NULL,
	`transactionId` text,
	FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`transactionId`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_shared_balances_household` ON `sharedBalances` (`householdId`);--> statement-breakpoint
CREATE INDEX `idx_shared_balances_transaction` ON `sharedBalances` (`transactionId`);--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`householdId` text NOT NULL,
	`name` text NOT NULL,
	`amountCents` integer NOT NULL,
	`billingCycle` text NOT NULL,
	`nextBillingDate` text,
	`trialEndDate` text,
	`isTrial` integer DEFAULT false,
	`categoryId` text,
	`accountId` text,
	`paymentMode` text DEFAULT 'manual',
	`ownerId` text,
	`upcomingAmountCents` integer,
	`upcomingEffectiveDate` text,
	FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_subscriptions_household` ON `subscriptions` (`householdId`);--> statement-breakpoint
CREATE TABLE `supportComments` (
	`id` text PRIMARY KEY NOT NULL,
	`issueId` text NOT NULL,
	`userId` text,
	`authorName` text,
	`body` text NOT NULL,
	`githubCommentId` integer,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`issueId`) REFERENCES `supportIssues`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `supportIssues` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`category` text,
	`priority` text DEFAULT 'medium',
	`status` text DEFAULT 'open',
	`githubIssueUrl` text,
	`githubIssueNumber` integer,
	`githubIssueId` integer,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `systemAnnouncements` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`contentMd` text NOT NULL,
	`priority` text DEFAULT 'info',
	`actorId` text,
	`isActive` integer DEFAULT true,
	`expiresAt` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `systemAuditLogs` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`action` text NOT NULL,
	`target` text NOT NULL,
	`detailsJson` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `systemConfig` (
	`id` text PRIMARY KEY NOT NULL,
	`configKey` text NOT NULL,
	`configValue` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `systemConfig_configKey_unique` ON `systemConfig` (`configKey`);--> statement-breakpoint
CREATE TABLE `systemFeatureFlags` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	`featureKey` text NOT NULL,
	`enabledGlobally` integer DEFAULT 0,
	`description` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `systemFeatureFlags_featureKey_unique` ON `systemFeatureFlags` (`featureKey`);--> statement-breakpoint
CREATE TABLE `systemRegistry` (
	`id` text PRIMARY KEY NOT NULL,
	`itemType` text NOT NULL,
	`name` text NOT NULL,
	`logoUrl` text,
	`websiteUrl` text,
	`metadataJson` text
);
--> statement-breakpoint
CREATE TABLE `systemWalkthroughs` (
	`id` text PRIMARY KEY NOT NULL,
	`version` text NOT NULL,
	`title` text NOT NULL,
	`contentMd` text NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `templates` (
	`id` text PRIMARY KEY NOT NULL,
	`householdId` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`amountCents` integer,
	`categoryId` text,
	`accountId` text,
	FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `totpCredentials` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`secret` text NOT NULL,
	`name` text DEFAULT 'Authenticator App',
	`verified` integer DEFAULT 0,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	`lastUsedAt` text,
	`lastUsedIp` text,
	`lastUsedLocation` text,
	`lastUsedUa` text,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_totp_credentials_user` ON `totpCredentials` (`userId`);--> statement-breakpoint
CREATE TABLE `trackedExpenses` (
	`id` text PRIMARY KEY NOT NULL,
	`householdId` text NOT NULL,
	`amountCents` integer NOT NULL,
	`description` text NOT NULL,
	`notes` text,
	`status` text DEFAULT 'pending',
	`attentionRequired` integer DEFAULT false,
	`needsBalanceTransfer` integer DEFAULT false,
	`transferTiming` text,
	`isBorrowed` integer DEFAULT false,
	`borrowSource` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_tracked_expenses_household` ON `trackedExpenses` (`householdId`);--> statement-breakpoint
CREATE TABLE `transactionPairingRules` (
	`id` text PRIMARY KEY NOT NULL,
	`householdId` text NOT NULL,
	`pattern` text NOT NULL,
	`targetProviderId` text,
	`targetCategoryId` text,
	`autoConfirm` integer DEFAULT false,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`targetProviderId`) REFERENCES `serviceProviders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`targetCategoryId`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_pairing_rules_household` ON `transactionPairingRules` (`householdId`);--> statement-breakpoint
CREATE INDEX `idx_pairing_rules_provider` ON `transactionPairingRules` (`targetProviderId`);--> statement-breakpoint
CREATE INDEX `idx_pairing_rules_category` ON `transactionPairingRules` (`targetCategoryId`);--> statement-breakpoint
CREATE TABLE `transactionTimeline` (
	`id` text PRIMARY KEY NOT NULL,
	`transactionId` text NOT NULL,
	`type` text NOT NULL,
	`content` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`transactionId`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_timeline_transaction` ON `transactionTimeline` (`transactionId`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`householdId` text NOT NULL,
	`accountId` text NOT NULL,
	`categoryId` text,
	`amountCents` integer NOT NULL,
	`description` text,
	`transactionDate` text DEFAULT (DATE('now')),
	`status` text DEFAULT 'pending',
	`isRecurring` integer DEFAULT false,
	`receiptR2Key` text,
	`ownerId` text,
	`confirmationNumber` text,
	`linkedTransactionId` text,
	`reconciliationStatus` text DEFAULT 'unreconciled',
	`notes` text,
	`rawDescription` text,
	`parentId` text,
	`providerId` text,
	`billId` text,
	`attentionRequired` integer DEFAULT false,
	`needsBalanceTransfer` integer DEFAULT false,
	`transferTiming` text,
	`isBorrowed` integer DEFAULT false,
	`borrowSource` text,
	`accountedFor` integer DEFAULT false,
	FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`providerId`) REFERENCES `serviceProviders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`billId`) REFERENCES `bills`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_transactions_household` ON `transactions` (`householdId`);--> statement-breakpoint
CREATE INDEX `idx_transactions_account` ON `transactions` (`accountId`);--> statement-breakpoint
CREATE INDEX `idx_transactions_category` ON `transactions` (`categoryId`);--> statement-breakpoint
CREATE INDEX `idx_transactions_parent` ON `transactions` (`parentId`);--> statement-breakpoint
CREATE INDEX `idx_transactions_provider` ON `transactions` (`providerId`);--> statement-breakpoint
CREATE INDEX `idx_transactions_date` ON `transactions` (`transactionDate`);--> statement-breakpoint
CREATE TABLE `userHouseholds` (
	`userId` text NOT NULL,
	`householdId` text NOT NULL,
	`role` text DEFAULT 'member',
	PRIMARY KEY(`userId`, `householdId`),
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `userIdentities` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`provider` text NOT NULL,
	`providerUserId` text NOT NULL,
	`email` text,
	`name` text,
	`avatarUrl` text,
	`accessToken` text,
	`refreshToken` text,
	`tokenExpiresAt` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_user_identities_user` ON `userIdentities` (`userId`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_user_identities_unique` ON `userIdentities` (`provider`,`providerUserId`);--> statement-breakpoint
CREATE TABLE `userLinkedAccounts` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`householdId` text,
	`providerId` text NOT NULL,
	`paymentMethodId` text,
	`emailAttached` text,
	`membershipStartDate` text,
	`membershipEndDate` text,
	`subscriptionId` text,
	`notes` text,
	`status` text DEFAULT 'active',
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`providerId`) REFERENCES `serviceProviders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`paymentMethodId`) REFERENCES `userPaymentMethods`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_linked_accounts_user` ON `userLinkedAccounts` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_linked_accounts_household` ON `userLinkedAccounts` (`householdId`);--> statement-breakpoint
CREATE TABLE `userOnboarding` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`stepId` text NOT NULL,
	`status` text DEFAULT 'pending',
	`completedAt` text,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_onboarding_user` ON `userOnboarding` (`userId`);--> statement-breakpoint
CREATE TABLE `userPaymentMethods` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`householdId` text,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`lastFour` text,
	`brandingUrl` text,
	`status` text DEFAULT 'active',
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_payment_methods_user` ON `userPaymentMethods` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_payment_methods_household` ON `userPaymentMethods` (`householdId`);--> statement-breakpoint
CREATE TABLE `userPreferences` (
	`userId` text NOT NULL,
	`key` text NOT NULL,
	`value` text,
	PRIMARY KEY(`userId`, `key`),
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text,
	`displayName` text,
	`username` text NOT NULL,
	`passwordHash` text,
	`avatarUrl` text,
	`globalRole` text DEFAULT 'user',
	`status` text DEFAULT 'active',
	`lastActiveAt` text,
	`forcePasswordChange` integer DEFAULT 0,
	`passkeyVerifiedAt` text,
	`totpSecret` text,
	`totpEnabled` integer DEFAULT 0,
	`lastLogin` text DEFAULT CURRENT_TIMESTAMP,
	`lastSeenVersion` text DEFAULT '0.0.0',
	`onboardingCompleted` integer DEFAULT 0,
	`failedLoginAttempts` integer DEFAULT 0,
	`lockoutUntil` text,
	`backupCodesJson` text DEFAULT '[]',
	`passwordChangedAt` text,
	`preferredMfaType` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	`timezone` text DEFAULT 'UTC',
	`locale` text DEFAULT 'en-US',
	`themePreference` text DEFAULT 'system'
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE TABLE `webhookDeliveryLogs` (
	`id` text PRIMARY KEY NOT NULL,
	`webhookId` text NOT NULL,
	`event` text NOT NULL,
	`statusCode` integer DEFAULT 0,
	`error` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`webhookId`) REFERENCES `webhooks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_webhook_logs_webhook` ON `webhookDeliveryLogs` (`webhookId`);--> statement-breakpoint
CREATE TABLE `webhooks` (
	`id` text PRIMARY KEY NOT NULL,
	`householdId` text NOT NULL,
	`url` text NOT NULL,
	`secret` text NOT NULL,
	`eventList` text NOT NULL,
	`isActive` integer DEFAULT true,
	FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_webhooks_household` ON `webhooks` (`householdId`);