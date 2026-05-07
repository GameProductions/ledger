-- Migration: 0003_manual_catchup_fix
-- Purpose: Resolve schema desynchronization blocking login and finance features.

-- 1. Fix Session Tracking (Critical for Login)
ALTER TABLE sessions ADD COLUMN ipV4 text;
ALTER TABLE sessions ADD COLUMN ipV6 text;

-- 2. Fix Loan Payments
ALTER TABLE loanPayments ADD COLUMN paymentDate text;

-- 3. Create Missing Identity & Auth Tables
CREATE TABLE IF NOT EXISTS `backupCodes` (
  `id` text PRIMARY KEY NOT NULL,
  `userId` text NOT NULL,
  `codeHash` text NOT NULL,
  `usedAt` text,
  `createdAt` text DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX IF NOT EXISTS `idx_backup_codes_user` ON `backupCodes` (`userId`);

-- 4. Create Missing Finance Tables
CREATE TABLE IF NOT EXISTS `billers` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `logoUrl` text,
  `website` text,
  `industry` text,
  `createdAt` text DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `reconciliationProposals` (
  `id` text PRIMARY KEY NOT NULL,
  `householdId` text NOT NULL,
  `primaryTransactionId` text NOT NULL,
  `suggestedTransactionId` text NOT NULL,
  `confidenceScore` integer DEFAULT 0,
  `matchReason` text,
  `status` text DEFAULT 'pending',
  `createdAt` text DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`primaryTransactionId`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`suggestedTransactionId`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX IF NOT EXISTS `idx_recon_proposals_household` ON `reconciliationProposals` (`householdId`);
CREATE INDEX IF NOT EXISTS `idx_recon_proposals_primary` ON `reconciliationProposals` (`primaryTransactionId`);
CREATE INDEX IF NOT EXISTS `idx_recon_proposals_suggested` ON `reconciliationProposals` (`suggestedTransactionId`);
