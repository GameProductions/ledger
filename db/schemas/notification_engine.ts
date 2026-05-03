import { sqliteTable, text, integer, primaryKey, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { users } from './auth';
import { households } from './financials';

// [NEW] Core Reminders table
export const reminders_new = sqliteTable('reminders_new', {
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

// [NEW] Collaboration & Sharing
export const reminderMembers = sqliteTable('reminderMembers', {
  id: text('id').primaryKey(),
  reminderId: text('reminderId').notNull().references(() => reminders_new.id, { onDelete: 'cascade' }),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('MEMBER'), 
  joinedAt: text('joinedAt').default(sql`CURRENT_TIMESTAMP`),
});

export const reminderShares = sqliteTable('reminderShares', {
  id: text('id').primaryKey(),
  reminderId: text('reminderId').notNull().references(() => reminders_new.id, { onDelete: 'cascade' }),
  shareToken: text('shareToken').notNull().unique(),
  expiresAt: text('expiresAt'),
  maxUses: integer('maxUses').default(0), 
  usedCount: integer('usedCount').default(0),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
});

export const reminderActivity = sqliteTable('reminderActivity', {
  id: text('id').primaryKey(),
  reminderId: text('reminderId').notNull().references(() => reminders_new.id, { onDelete: 'cascade' }),
  actorId: text('actorId').notNull().references(() => users.id),
  action: text('action').notNull(), 
  detailsJson: text('detailsJson'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
});

// [NEW] Scheduling & Delivery
export const reminderSchedules = sqliteTable('reminderSchedules', {
  id: text('id').primaryKey(),
  reminderId: text('reminderId').notNull().references(() => reminders_new.id, { onDelete: 'cascade' }),
  scheduleType: text('scheduleType').notNull(), 
  cronString: text('cronString'),
  nextRunAt: text('nextRunAt').notNull(),
  lastRunAt: text('lastRunAt'),
  isActive: integer('isActive', { mode: 'boolean' }).default(true),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
});

export const reminderChannels = sqliteTable('reminderChannels', {
  id: text('id').primaryKey(),
  scheduleId: text('scheduleId').notNull().references(() => reminderSchedules.id, { onDelete: 'cascade' }),
  channelType: text('channelType').notNull(), 
  target: text('target'), 
  soundId: text('soundId'), 
  isEnabled: integer('isEnabled', { mode: 'boolean' }).default(true),
});

// [NEW] Audio & Settings
export const notificationSounds = sqliteTable('notificationSounds', {
  id: text('id').primaryKey(),
  userId: text('userId').references(() => users.id, { onDelete: 'cascade' }), 
  name: text('name').notNull(),
  r2Key: text('r2Key').notNull(), 
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

export const activityLogs = sqliteTable('activityLogs', {
  id: text('id').primaryKey(),
  householdId: text('householdId').notNull().references(() => households.id, { onDelete: 'cascade' }),
  actorId: text('actorId').notNull().references(() => users.id),
  action: text('action').notNull(),
  targetType: text('targetType').notNull(),
  targetId: text('targetId'),
  detailsJson: text('detailsJson'),
  severity: text('severity').notNull().default('INFO'),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  householdIdx: index('idx_activity_logs_household').on(table.householdId),
  actorIdx: index('idx_activity_logs_actor').on(table.actorId),
  targetIdx: index('idx_activity_logs_target').on(table.targetType, table.targetId),
}));
