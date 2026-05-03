CREATE TABLE `reminders_v2` (
	`id` text PRIMARY KEY NOT NULL,
	`householdId` text NOT NULL,
	`ownerId` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`targetId` text,
	`targetType` text,
	`priority` text DEFAULT 'MEDIUM' NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `reminderMembers` (
	`id` text PRIMARY KEY NOT NULL,
	`reminderId` text NOT NULL,
	`userId` text NOT NULL,
	`role` text DEFAULT 'MEMBER' NOT NULL,
	`joinedAt` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`reminderId`) REFERENCES `reminders_v2`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `reminderShares` (
	`id` text PRIMARY KEY NOT NULL,
	`reminderId` text NOT NULL,
	`shareToken` text NOT NULL,
	`expiresAt` text,
	`maxUses` integer DEFAULT 0,
	`usedCount` integer DEFAULT 0,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`reminderId`) REFERENCES `reminders_v2`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reminderShares_shareToken_unique` ON `reminderShares` (`shareToken`);--> statement-breakpoint
CREATE TABLE `reminderActivity` (
	`id` text PRIMARY KEY NOT NULL,
	`reminderId` text NOT NULL,
	`actorId` text NOT NULL,
	`action` text NOT NULL,
	`detailsJson` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`reminderId`) REFERENCES `reminders_v2`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actorId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `reminderSchedules` (
	`id` text PRIMARY KEY NOT NULL,
	`reminderId` text NOT NULL,
	`scheduleType` text NOT NULL,
	`cronString` text,
	`nextRunAt` text NOT NULL,
	`lastRunAt` text,
	`isActive` integer DEFAULT 1,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`reminderId`) REFERENCES `reminders_v2`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `reminderChannels` (
	`id` text PRIMARY KEY NOT NULL,
	`scheduleId` text NOT NULL,
	`channelType` text NOT NULL,
	`target` text,
	`soundId` text,
	`isEnabled` integer DEFAULT 1,
	FOREIGN KEY (`scheduleId`) REFERENCES `reminderSchedules`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `notificationSounds` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text,
	`name` text NOT NULL,
	`r2Key` text NOT NULL,
	`fileSize` integer,
	`mimeType` text DEFAULT 'audio/mpeg',
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `userNotificationSettings` (
	`userId` text PRIMARY KEY NOT NULL,
	`dndEnabled` integer DEFAULT 0,
	`dndStart` text DEFAULT '22:00',
	`dndEnd` text DEFAULT '08:00',
	`allowHighPriorityInDnd` integer DEFAULT 1,
	`defaultSoundId` text,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `vault_v2` (
	`id` text PRIMARY KEY NOT NULL,
	`ownerId` text NOT NULL,
	`keyName` text NOT NULL,
	`scope` text NOT NULL,
	`encryptedValue` text NOT NULL,
	`iv` text NOT NULL,
	`version` integer DEFAULT 1,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `activityLogs` (
	`id` text PRIMARY KEY NOT NULL,
	`householdId` text NOT NULL,
	`actorId` text NOT NULL,
	`action` text NOT NULL,
	`targetType` text NOT NULL,
	`targetId` text,
	`detailsJson` text,
	`severity` text DEFAULT 'INFO' NOT NULL,
	`ipAddress` text,
	`userAgent` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actorId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_activity_logs_household` ON `activityLogs` (`householdId`);--> statement-breakpoint
CREATE INDEX `idx_activity_logs_actor` ON `activityLogs` (`actorId`);--> statement-breakpoint
CREATE INDEX `idx_activity_logs_target` ON `activityLogs` (`targetType`,`targetId`);