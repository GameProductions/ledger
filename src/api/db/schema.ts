import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const tenants = sqliteTable('tenants', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  subscriptionTier: text('subscription_tier').default('free'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const apiKeys = sqliteTable('api_keys', {
  keyHash: text('key_hash').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  description: text('description'),
  lastUsedAt: text('last_used_at'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => {
  return {
    tenantIdx: index('idx_apikeys_tenant').on(table.tenantId),
  };
});

export const usageMetrics = sqliteTable('usage_metrics', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  metricType: text('metric_type').notNull(),
  amount: integer('amount').notNull().default(1),
  recordedAt: text('recorded_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => {
  return {
    tenantIdx: index('idx_metrics_tenant').on(table.tenantId),
    metricTypeIdx: index('idx_metrics_type').on(table.metricType),
  };
});
