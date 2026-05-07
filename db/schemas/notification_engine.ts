import { sqliteTable, text, integer, primaryKey, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { users } from './auth';
import { households } from './financials';

// [NEW] Core Reminders table
export const reminders_new = sqliteTable('reminders_new', {
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

// [NEW] Collaboration & Sharing
export const reminderMembers = sqliteTable('reminder_members', {
  id: text('id').primaryKey(),
  reminderId: text('reminder_id').notNull().references(() => reminders_new.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('MEMBER'), 
  joinedAt: text('joined_at').default(sql`CURRENT_TIMESTAMP`),
});

export const reminderShares = sqliteTable('reminder_shares', {
  id: text('id').primaryKey(),
  reminderId: text('reminder_id').notNull().references(() => reminders_new.id, { onDelete: 'cascade' }),
  shareToken: text('share_token').notNull().unique(),
  expiresAt: text('expires_at'),
  maxUses: integer('max_uses').default(0), 
  usedCount: integer('used_count').default(0),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const reminderActivity = sqliteTable('reminder_activity', {
  id: text('id').primaryKey(),
  reminderId: text('reminder_id').notNull().references(() => reminders_new.id, { onDelete: 'cascade' }),
  actorId: text('actor_id').notNull().references(() => users.id),
  action: text('action').notNull(), 
  detailsJson: text('details_json'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// [NEW] Scheduling & Delivery
export const reminderSchedules = sqliteTable('reminder_schedules', {
  id: text('id').primaryKey(),
  reminderId: text('reminder_id').notNull().references(() => reminders_new.id, { onDelete: 'cascade' }),
  scheduleType: text('schedule_type').notNull(), 
  cronString: text('cron_string'),
  nextRunAt: text('next_run_at').notNull(),
  lastRunAt: text('last_run_at'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const reminderChannels = sqliteTable('reminder_channels', {
  id: text('id').primaryKey(),
  scheduleId: text('schedule_id').notNull().references(() => reminderSchedules.id, { onDelete: 'cascade' }),
  channelType: text('channel_type').notNull(), 
  target: text('target'), 
  soundId: text('sound_id'), 
  isEnabled: integer('is_enabled', { mode: 'boolean' }).default(true),
});

// [NEW] Audio & Settings
export const notificationSounds = sqliteTable('notification_sounds', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }), 
  name: text('name').notNull(),
  r2Key: text('r2_key').notNull(), 
  fileSize: integer('file_size'),
  mimeType: text('mime_type').default('audio/mpeg'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const userNotificationSettings = sqliteTable('user_notification_settings', {
  userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  dndEnabled: integer('dnd_enabled', { mode: 'boolean' }).default(false),
  dndStart: text('dnd_start').default('22:00'),
  dndEnd: text('dnd_end').default('08:00'),
  allowHighPriorityInDnd: integer('allow_high_priority_in_dnd', { mode: 'boolean' }).default(true),
  defaultSoundId: text('default_sound_id'),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const activityLogs = sqliteTable('activity_logs', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  actorId: text('actor_id').notNull().references(() => users.id),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id'),
  detailsJson: text('details_json'),
  severity: text('severity').notNull().default('INFO'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  householdIdx: index('idx_activity_logs_household').on(table.householdId),
  actorIdx: index('idx_activity_logs_actor').on(table.actorId),
  targetIdx: index('idx_activity_logs_target').on(table.targetType, table.targetId),
}));
