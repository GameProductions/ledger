import { boolean, serial, pgTable, text, integer, primaryKey, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './auth';
import { households, billers } from './financials';

// [CONSOLIDATED] Activity Logs - Unified auditing for all actor types
export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  householdId: text('household_id').references(() => households.id, { onDelete: 'cascade' }),
  actorId: text('actor_id').notNull(),
  actorType: text('actor_type').notNull().default('USER'), // USER, SYSTEM, ADMIN, AGENT
  action: text('action').notNull(),
  severity: text('severity').default('INFO'),
  targetType: text('target_type'),
  targetId: text('target_id'),
  detailsJson: text('details_json').default('{}'),
  oldValuesJson: text('old_values_json').default('{}'),
  newValuesJson: text('new_values_json').default('{}'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  cfRay: text('cf_ray'),
  location: text('location'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  householdIdx: index('idx_activity_logs_household').on(table.householdId),
  actorIdx: index('idx_activity_logs_actor').on(table.actorId),
  actionIdx: index('idx_activity_logs_action').on(table.action),
}));

export const systemFeatureFlags = pgTable('system_feature_flags', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()::text`),
  featureKey: text('feature_key').notNull().unique(),
  enabledGlobally: boolean('enabled_globally').default(false),
  description: text('description'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const systemConfig = pgTable('system_config', {
  id: text('id').primaryKey(),
  configKey: text('config_key').notNull().unique(),
  configValue: text('config_value'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const systemRegistry = pgTable('system_registry', {
  id: text('id').primaryKey(),
  itemType: text('item_type').notNull(),
  name: text('name').notNull(),
  logoUrl: text('logo_url'),
  websiteUrl: text('website_url'),
  metadataJson: text('metadata_json'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const billingProcessors = pgTable('billing_processors', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  websiteUrl: text('website_url'),
  brandingUrl: text('branding_url'),
  supportUrl: text('support_url'),
  subscriptionIdNotes: text('subscription_id_notes'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const serviceProviders = pgTable('service_providers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  visibility: text('visibility').default('public'),
  householdId: text('household_id').references(() => households.id, { onDelete: 'cascade' }),
  billingProcessorId: text('billing_processor_id').references(() => billingProcessors.id, { onDelete: 'set null' }),
  billerId: text('biller_id').references(() => billers.id, { onDelete: 'set null' }),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  status: text('status').default('active'),
  iconUrl: text('icon_url'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  householdIdx: index('idx_providers_household').on(table.householdId),
}));

export const systemWalkthroughs = pgTable('system_walkthroughs', {
  id: text('id').primaryKey(),
  version: text('version').notNull(),
  title: text('title').notNull(),
  contentMd: text('content_md').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const systemAnnouncements = pgTable('system_announcements', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  contentMd: text('content_md').notNull(),
  priority: text('priority').default('info'),
  actorId: text('actor_id').references(() => users.id, { onDelete: 'set null' }),
  isActive: boolean('is_active').default(true),
  expiresAt: text('expires_at'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const externalConnections = pgTable('external_connections', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  accessToken: text('access_token').notNull(),
  status: text('status').default('active'),
  lastSyncAt: text('last_sync_at'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  householdIdx: index('idx_ext_conn_household').on(table.householdId),
}));

export const privacyCards = pgTable('privacy_cards', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  connectionId: text('connection_id').notNull().references(() => externalConnections.id, { onDelete: 'cascade' }),
  last4: text('last_4').notNull(),
  hostname: text('hostname'),
  spendLimitCents: integer('spend_limit_cents'),
  state: text('state'),
}, (table) => ({
  householdIdx: index('idx_privacy_cards_household').on(table.householdId),
}));

export const schedules = pgTable('schedules', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  targetId: text('target_id').notNull(),
  targetType: text('target_type').notNull(),
  frequency: text('frequency').notNull(),
  nextRunAt: text('next_run_at').notNull(),
  lastRunAt: text('last_run_at'),
  executedCount: integer('executed_count').default(0),
  status: text('status').default('active'),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const scheduleHistory = pgTable('schedule_history', {
  id: text('id').primaryKey(),
  scheduleId: text('schedule_id').notNull().references(() => schedules.id, { onDelete: 'cascade' }),
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  occurrenceAt: text('occurrence_at').notNull(),
  actionStatus: text('action_status').notNull(),
  detailsJson: text('details_json'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  scheduleIdx: index('idx_sched_history_schedule').on(table.scheduleId),
  householdIdx: index('idx_sched_history_household').on(table.householdId),
}));

export const webhooks = pgTable('webhooks', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  secret: text('secret').notNull(),
  eventList: text('event_list').notNull(),
  isActive: boolean('is_active').default(true),
}, (table) => ({
  householdIdx: index('idx_webhooks_household').on(table.householdId),
}));

export const webhookDeliveryLogs = pgTable('webhook_delivery_logs', {
  id: text('id').primaryKey(),
  webhookId: text('webhook_id').notNull().references(() => webhooks.id, { onDelete: 'cascade' }),
  event: text('event').notNull(),
  statusCode: integer('status_code').default(0),
  error: text('error'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  webhookIdx: index('idx_webhook_logs_webhook').on(table.webhookId),
}));

export const supportIssues = pgTable('support_issues', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description').notNull(),
  category: text('category'),
  priority: text('priority').default('medium'),
  status: text('status').default('open'),
  githubIssueUrl: text('github_issue_url'),
  githubIssueNumber: integer('github_issue_number'),
  githubIssueId: integer('github_issue_id'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const supportComments = pgTable('support_comments', {
  id: text('id').primaryKey(),
  issueId: text('issue_id').notNull().references(() => supportIssues.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }), 
  authorName: text('author_name'), 
  body: text('body').notNull(),
  githubCommentId: integer('github_comment_id'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// [LEGACY] Original Reminders table - to be decommissioned after migration
export const reminders = pgTable('reminders', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  targetId: text('target_id').notNull(),
  targetType: text('target_type').notNull(),
  deliveryType: text('delivery_type').notNull(),
  deliveryTarget: text('delivery_target'),
  priority: text('priority').notNull().default('medium'),
  status: text('status').notNull().default('active'),
  dueAt: text('due_at'),
  frequencyDays: integer('frequency_days').notNull().default(0),
  timeOfDay: text('time_of_day').default('09:00'),
  note: text('note'),
  lastSentAt: text('last_sent_at'),
  isActive: boolean('is_active').default(true),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  targetIdx: index('idx_reminders_target').on(table.targetType, table.targetId),
  userIdx: index('idx_reminders_user').on(table.userId),
}));

// [LEGACY] Original Notification Settings
export const notificationSettings = pgTable('notification_settings', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  event: text('event').notNull(),
  enabled: boolean('enabled').default(false),
  offsetDays: integer('offset_days').default(3),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.type, table.event] }),
}));

// [NEW] Core Reminders table (v2)
export const reminders_v2 = pgTable('reminders_v2', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  ownerId: text('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  targetId: text('target_id'), 
  targetType: text('target_type'), 
  priority: text('priority').notNull().default('MEDIUM'), 
  status: text('status').notNull().default('ACTIVE'), 
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const vault = pgTable('vault', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  secretType: text('secret_type').notNull(),
  keyIdentifier: text('key_identifier').notNull(),
  encryptedData: text('encrypted_data').notNull(),
  lastAccessedAt: text('last_accessed_at'),
}, (table) => ({
  userIdx: index('idx_vault_user_id').on(table.userId),
  typeIdx: index('idx_vault_type').on(table.secretType),
}));

// [NEW] Collaboration & Sharing
export const reminderMembers = pgTable('reminder_members', {
  id: text('id').primaryKey(),
  reminderId: text('reminder_id').notNull().references(() => reminders_v2.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('MEMBER'), // OWNER, ADMIN, MEMBER
  joinedAt: text('joined_at').default(sql`CURRENT_TIMESTAMP`),
});

export const reminderShares = pgTable('reminder_shares', {
  id: text('id').primaryKey(),
  reminderId: text('reminder_id').notNull().references(() => reminders_v2.id, { onDelete: 'cascade' }),
  shareToken: text('share_token').notNull().unique(),
  expiresAt: text('expires_at'),
  maxUses: integer('max_uses').default(0), // 0 = unlimited
  usedCount: integer('used_count').default(0),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const reminderActivity = pgTable('reminder_activity', {
  id: text('id').primaryKey(),
  reminderId: text('reminder_id').notNull().references(() => reminders_v2.id, { onDelete: 'cascade' }),
  actorId: text('actor_id').notNull().references(() => users.id),
  action: text('action').notNull(), // CREATED, UPDATED, ACKNOWLEDGED, SHARED
  detailsJson: text('details_json'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// [NEW] Scheduling & Delivery
export const reminderSchedules = pgTable('reminder_schedules', {
  id: text('id').primaryKey(),
  reminderId: text('reminder_id').notNull().references(() => reminders_v2.id, { onDelete: 'cascade' }),
  scheduleType: text('schedule_type').notNull(), // SINGLE, RECURRING, CRON
  cronString: text('cron_string'),
  nextRunAt: text('next_run_at').notNull(),
  lastRunAt: text('last_run_at'),
  isActive: boolean('is_active').default(true),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const reminderChannels = pgTable('reminder_channels', {
  id: text('id').primaryKey(),
  scheduleId: text('schedule_id').notNull().references(() => reminderSchedules.id, { onDelete: 'cascade' }),
  channelType: text('channel_type').notNull(), // DISCORD_DM, DISCORD_WEBHOOK, EMAIL, TOAST, WEBHOOK
  target: text('target'), // Email address, Webhook URL, Discord ID
  soundId: text('sound_id'), // FK to notificationSounds
  isEnabled: boolean('is_enabled').default(true),
});

// [NEW] Audio & Settings
export const notificationSounds = pgTable('notification_sounds', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }), // null = system sound
  name: text('name').notNull(),
  r2Key: text('r2_key').notNull(), // Path in R2 bucket
  fileSize: integer('file_size'),
  mimeType: text('mime_type').default('audio/mpeg'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const userNotificationSettings = pgTable('user_notification_settings', {
  userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  dndEnabled: boolean('dnd_enabled').default(false),
  dndStart: text('dnd_start').default('22:00'),
  dndEnd: text('dnd_end').default('08:00'),
  allowHighPriorityInDnd: boolean('allow_high_priority_in_dnd').default(true),
  defaultSoundId: text('default_sound_id'),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const holidays = pgTable('holidays', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),
  name: text('name').notNull(),
  countryCode: text('country_code').default('US'),
});

export const templates = pgTable('templates', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  amountCents: integer('amount_cents'),
  categoryId: text('category_id'), 
  accountId: text('account_id'), 
});

export const householdInvites = pgTable('household_invites', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  createdBy: text('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: text('status').default('pending'),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const linkedProviders = pgTable('linked_providers', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  serviceProviderId: text('service_provider_id').notNull().references(() => serviceProviders.id, { onDelete: 'cascade' }),
  accountReference: text('account_reference'),
  customLabel: text('custom_label'),
  metadata: text('metadata'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const vault_v2 = pgTable('vault_v2', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  keyName: text('key_name').notNull(),
  scope: text('scope').notNull(),
  encryptedValue: text('encrypted_value').notNull(),
  iv: text('iv').notNull(),
  version: integer('version').default(1),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// TEMPORARY: Restoring legacy tables to bypass interactive Drizzle-Kit prompts
export const adminAuditLogs = pgTable('admin_audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  action: text('action').notNull(),
  target: text('target').notNull(),
  targetId: text('target_id'),
  detailsJson: text('details_json'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  actorId: text('actor_id').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  action: text('action').notNull(),
  severity: text('severity').default('INFO'),
  targetType: text('target_type'),
  targetId: text('target_id'),
  recordId: text('record_id'),
  oldValuesJson: text('old_values_json').default('{}'),
  newValuesJson: text('new_values_json').default('{}'),
  metadataJson: text('metadata_json').default('{}'),
  cfRay: text('cf_ray'),
  location: text('location'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const systemAuditLogs = pgTable('system_audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  action: text('action').notNull(),
  target: text('target').notNull(),
  detailsJson: text('details_json'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});
