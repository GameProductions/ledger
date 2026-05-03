import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { users } from './auth';
import { households, billers } from './financials';

// [CONSOLIDATED] Activity Logs - Unified auditing for all actor types
export const activityLogs = sqliteTable('activityLogs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  householdId: text('householdId').references(() => households.id, { onDelete: 'cascade' }),
  actorId: text('actorId').notNull(),
  actorType: text('actorType').notNull().default('USER'), // USER, SYSTEM, ADMIN, AGENT
  action: text('action').notNull(),
  severity: text('severity').default('INFO'),
  targetType: text('targetType'),
  targetId: text('targetId'),
  detailsJson: text('detailsJson').default('{}'),
  oldValuesJson: text('oldValuesJson').default('{}'),
  newValuesJson: text('newValuesJson').default('{}'),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  cfRay: text('cfRay'),
  location: text('location'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  householdIdx: index('idx_activity_logs_household').on(table.householdId),
  actorIdx: index('idx_activity_logs_actor').on(table.actorId),
  actionIdx: index('idx_activity_logs_action').on(table.action),
}));

export const systemFeatureFlags = sqliteTable('systemFeatureFlags', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6))))`),
  featureKey: text('featureKey').notNull().unique(),
  enabledGlobally: integer('enabledGlobally').default(0),
  description: text('description'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updatedAt').default(sql`CURRENT_TIMESTAMP`),
});

export const systemConfig = sqliteTable('systemConfig', {
  id: text('id').primaryKey(),
  configKey: text('configKey').notNull().unique(),
  configValue: text('configValue'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updatedAt').default(sql`CURRENT_TIMESTAMP`),
});

export const systemRegistry = sqliteTable('systemRegistry', {
  id: text('id').primaryKey(),
  itemType: text('itemType').notNull(),
  name: text('name').notNull(),
  logoUrl: text('logoUrl'),
  websiteUrl: text('websiteUrl'),
  metadataJson: text('metadataJson'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updatedAt').default(sql`CURRENT_TIMESTAMP`),
});

export const billingProcessors = sqliteTable('billingProcessors', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  websiteUrl: text('websiteUrl'),
  brandingUrl: text('brandingUrl'),
  supportUrl: text('supportUrl'),
  subscriptionIdNotes: text('subscriptionIdNotes'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updatedAt').default(sql`CURRENT_TIMESTAMP`),
});

export const serviceProviders = sqliteTable('serviceProviders', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  visibility: text('visibility').default('public'),
  householdId: text('householdId').references(() => households.id, { onDelete: 'cascade' }),
  billingProcessorId: text('billingProcessorId').references(() => billingProcessors.id, { onDelete: 'set null' }),
  billerId: text('billerId').references(() => billers.id, { onDelete: 'set null' }),
  createdBy: text('createdBy').references(() => users.id, { onDelete: 'set null' }),
  status: text('status').default('active'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  householdIdx: index('idx_providers_household').on(table.householdId),
}));

export const systemWalkthroughs = sqliteTable('systemWalkthroughs', {
  id: text('id').primaryKey(),
  version: text('version').notNull(),
  title: text('title').notNull(),
  contentMd: text('contentMd').notNull(),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updatedAt').default(sql`CURRENT_TIMESTAMP`),
});

export const systemAnnouncements = sqliteTable('systemAnnouncements', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  contentMd: text('contentMd').notNull(),
  priority: text('priority').default('info'),
  actorId: text('actorId').references(() => users.id, { onDelete: 'set null' }),
  isActive: integer('isActive', { mode: 'boolean' }).default(true),
  expiresAt: text('expiresAt'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updatedAt').default(sql`CURRENT_TIMESTAMP`),
});

export const externalConnections = sqliteTable('externalConnections', {
  id: text('id').primaryKey(),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  accessToken: text('accessToken').notNull(),
  status: text('status').default('active'),
  lastSyncAt: text('lastSyncAt'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  householdIdx: index('idx_ext_conn_household').on(table.householdId),
}));

export const privacyCards = sqliteTable('privacyCards', {
  id: text('id').primaryKey(),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  connectionId: text('connectionId').notNull().references(() => externalConnections.id, { onDelete: 'cascade' }),
  last4: text('last4').notNull(),
  hostname: text('hostname'),
  spendLimitCents: integer('spendLimitCents'),
  state: text('state'),
}, (table) => ({
  householdIdx: index('idx_privacy_cards_household').on(table.householdId),
}));

export const schedules = sqliteTable('schedules', {
  id: text('id').primaryKey(),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  targetId: text('targetId').notNull(),
  targetType: text('targetType').notNull(),
  frequency: text('frequency').notNull(),
  nextRunAt: text('nextRunAt').notNull(),
  lastRunAt: text('lastRunAt'),
  executedCount: integer('executedCount').default(0),
  status: text('status').default('active'),
  updatedAt: text('updatedAt').default(sql`CURRENT_TIMESTAMP`),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
});

export const scheduleHistory = sqliteTable('scheduleHistory', {
  id: text('id').primaryKey(),
  scheduleId: text('scheduleId').notNull().references(() => schedules.id, { onDelete: 'cascade' }),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  occurrenceAt: text('occurrenceAt').notNull(),
  actionStatus: text('actionStatus').notNull(),
  detailsJson: text('detailsJson'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  scheduleIdx: index('idx_sched_history_schedule').on(table.scheduleId),
  householdIdx: index('idx_sched_history_household').on(table.householdId),
}));

export const webhooks = sqliteTable('webhooks', {
  id: text('id').primaryKey(),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  secret: text('secret').notNull(),
  eventList: text('eventList').notNull(),
  isActive: integer('isActive', { mode: 'boolean' }).default(true),
}, (table) => ({
  householdIdx: index('idx_webhooks_household').on(table.householdId),
}));

export const webhookDeliveryLogs = sqliteTable('webhookDeliveryLogs', {
  id: text('id').primaryKey(),
  webhookId: text('webhookId').notNull().references(() => webhooks.id, { onDelete: 'cascade' }),
  event: text('event').notNull(),
  statusCode: integer('statusCode').default(0),
  error: text('error'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  webhookIdx: index('idx_webhook_logs_webhook').on(table.webhookId),
}));

export const supportIssues = sqliteTable('supportIssues', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description').notNull(),
  category: text('category'),
  priority: text('priority').default('medium'),
  status: text('status').default('open'),
  githubIssueUrl: text('githubIssueUrl'),
  githubIssueNumber: integer('githubIssueNumber'),
  githubIssueId: integer('githubIssueId'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updatedAt').default(sql`CURRENT_TIMESTAMP`),
});

export const supportComments = sqliteTable('supportComments', {
  id: text('id').primaryKey(),
  issueId: text('issueId').notNull().references(() => supportIssues.id, { onDelete: 'cascade' }),
  userId: text('userId').references(() => users.id, { onDelete: 'set null' }), 
  authorName: text('authorName'), 
  body: text('body').notNull(),
  githubCommentId: integer('githubCommentId'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
});

// [LEGACY] Original Reminders table - to be decommissioned after migration
export const reminders = sqliteTable('reminders', {
  id: text('id').primaryKey(),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  targetId: text('targetId').notNull(),
  targetType: text('targetType').notNull(),
  deliveryType: text('deliveryType').notNull(),
  deliveryTarget: text('deliveryTarget'),
  priority: text('priority').notNull().default('medium'),
  status: text('status').notNull().default('active'),
  dueAt: text('dueAt').notNull(),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  targetIdx: index('idx_reminders_target').on(table.targetType, table.targetId),
  userIdx: index('idx_reminders_user').on(table.userId),
}));

// [LEGACY] Original Notification Settings
export const notificationSettings = sqliteTable('notificationSettings', {
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  event: text('event').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).default(false),
  offsetDays: integer('offsetDays').default(3),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.type, table.event] }),
}));

// [NEW] Core Reminders table (v2)
export const reminders_v2 = sqliteTable('reminders_v2', {
  id: text('id').primaryKey(),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  ownerId: text('ownerId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  targetId: text('targetId'), 
  targetType: text('targetType'), 
  priority: text('priority').notNull().default('MEDIUM'), 
  status: text('status').notNull().default('ACTIVE'), 
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updatedAt').default(sql`CURRENT_TIMESTAMP`),
});

export const vault = sqliteTable('vault', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  secretType: text('secretType').notNull(),
  keyIdentifier: text('keyIdentifier').notNull(),
  encryptedData: text('encryptedData').notNull(),
  lastAccessedAt: text('lastAccessedAt'),
}, (table) => ({
  userIdx: index('idx_vault_user_id').on(table.userId),
  typeIdx: index('idx_vault_type').on(table.secretType),
}));

// [NEW] Collaboration & Sharing
export const reminderMembers = sqliteTable('reminderMembers', {
  id: text('id').primaryKey(),
  reminderId: text('reminderId').notNull().references(() => reminders_v2.id, { onDelete: 'cascade' }),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('MEMBER'), // OWNER, ADMIN, MEMBER
  joinedAt: text('joinedAt').default(sql`CURRENT_TIMESTAMP`),
});

export const reminderShares = sqliteTable('reminderShares', {
  id: text('id').primaryKey(),
  reminderId: text('reminderId').notNull().references(() => reminders_v2.id, { onDelete: 'cascade' }),
  shareToken: text('shareToken').notNull().unique(),
  expiresAt: text('expiresAt'),
  maxUses: integer('maxUses').default(0), // 0 = unlimited
  usedCount: integer('usedCount').default(0),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
});

export const reminderActivity = sqliteTable('reminderActivity', {
  id: text('id').primaryKey(),
  reminderId: text('reminderId').notNull().references(() => reminders_v2.id, { onDelete: 'cascade' }),
  actorId: text('actorId').notNull().references(() => users.id),
  action: text('action').notNull(), // CREATED, UPDATED, ACKNOWLEDGED, SHARED
  detailsJson: text('detailsJson'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
});

// [NEW] Scheduling & Delivery
export const reminderSchedules = sqliteTable('reminderSchedules', {
  id: text('id').primaryKey(),
  reminderId: text('reminderId').notNull().references(() => reminders_v2.id, { onDelete: 'cascade' }),
  scheduleType: text('scheduleType').notNull(), // SINGLE, RECURRING, CRON
  cronString: text('cronString'),
  nextRunAt: text('nextRunAt').notNull(),
  lastRunAt: text('lastRunAt'),
  isActive: integer('isActive', { mode: 'boolean' }).default(true),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
});

export const reminderChannels = sqliteTable('reminderChannels', {
  id: text('id').primaryKey(),
  scheduleId: text('scheduleId').notNull().references(() => reminderSchedules.id, { onDelete: 'cascade' }),
  channelType: text('channelType').notNull(), // DISCORD_DM, DISCORD_WEBHOOK, EMAIL, TOAST, WEBHOOK
  target: text('target'), // Email address, Webhook URL, Discord ID
  soundId: text('soundId'), // FK to notificationSounds
  isEnabled: integer('isEnabled', { mode: 'boolean' }).default(true),
});

// [NEW] Audio & Settings
export const notificationSounds = sqliteTable('notificationSounds', {
  id: text('id').primaryKey(),
  userId: text('userId').references(() => users.id, { onDelete: 'cascade' }), // null = system sound
  name: text('name').notNull(),
  r2Key: text('r2Key').notNull(), // Path in R2 bucket
  fileSize: integer('fileSize'),
  mimeType: text('mimeType').default('audio/mpeg'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
});

export const userNotificationSettings = sqliteTable('userNotificationSettings', {
  userId: text('userId').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  dndEnabled: integer('dndEnabled', { mode: 'boolean' }).default(false),
  dndStart: text('dndStart').default('22:00'),
  dndEnd: text('dndEnd').default('08:00'),
  allowHighPriorityInDnd: integer('allowHighPriorityInDnd', { mode: 'boolean' }).default(true),
  defaultSoundId: text('defaultSoundId'),
  updatedAt: text('updatedAt').default(sql`CURRENT_TIMESTAMP`),
});

export const holidays = sqliteTable('holidays', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),
  name: text('name').notNull(),
  countryCode: text('countryCode').default('US'),
});

export const templates = sqliteTable('templates', {
  id: text('id').primaryKey(),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  amountCents: integer('amountCents'),
  categoryId: text('categoryId'), 
  accountId: text('accountId'), 
});

export const householdInvites = sqliteTable('householdInvites', {
  id: text('id').primaryKey(),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  createdBy: text('createdBy').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: text('status').default('pending'),
  expiresAt: text('expiresAt').notNull(),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
});

export const linkedProviders = sqliteTable('linkedProviders', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  serviceProviderId: text('serviceProviderId').notNull().references(() => serviceProviders.id, { onDelete: 'cascade' }),
  accountReference: text('accountReference'),
  customLabel: text('customLabel'),
  metadata: text('metadata'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
});

export const vault_v2 = sqliteTable('vault_v2', {
  id: text('id').primaryKey(),
  ownerId: text('ownerId').notNull(),
  keyName: text('keyName').notNull(),
  scope: text('scope').notNull(),
  encryptedValue: text('encryptedValue').notNull(),
  iv: text('iv').notNull(),
  version: integer('version').default(1),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updatedAt').default(sql`CURRENT_TIMESTAMP`),
});

// TEMPORARY: Restoring legacy tables to bypass interactive Drizzle-Kit prompts
export const adminAuditLogs = sqliteTable('adminAuditLogs', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  action: text('action').notNull(),
  target: text('target').notNull(),
  targetId: text('targetId'),
  detailsJson: text('detailsJson'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
});

export const auditLogs = sqliteTable('auditLogs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  actorId: text('actorId').notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  action: text('action').notNull(),
  severity: text('severity').default('INFO'),
  targetType: text('targetType'),
  targetId: text('targetId'),
  recordId: text('recordId'),
  oldValuesJson: text('oldValuesJson').default('{}'),
  newValuesJson: text('newValuesJson').default('{}'),
  metadataJson: text('metadataJson').default('{}'),
  cfRay: text('cfRay'),
  location: text('location'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
});

export const systemAuditLogs = sqliteTable('systemAuditLogs', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  action: text('action').notNull(),
  target: text('target').notNull(),
  detailsJson: text('detailsJson'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
});
