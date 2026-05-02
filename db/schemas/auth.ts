import { sqliteTable, text, integer, primaryKey, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique(), 
  displayName: text('displayName'),
  username: text('username').notNull().unique(),
  passwordHash: text('passwordHash'),
  avatarUrl: text('avatarUrl'),
  globalRole: text('globalRole').default('user'),
  status: text('status').default('active'),
  lastActiveAt: text('lastActiveAt'),
  forcePasswordChange: integer('forcePasswordChange').default(0),
  passkeyVerifiedAt: text('passkeyVerifiedAt'),
  lastLogin: text('lastLogin').default(sql`CURRENT_TIMESTAMP`),
  lastSeenVersion: text('lastSeenVersion').default('0.0.0'),
  onboardingCompleted: integer('onboardingCompleted').default(0),
  failedLoginAttempts: integer('failedLoginAttempts').default(0),
  lockoutUntil: text('lockoutUntil'),
  passwordChangedAt: text('passwordChangedAt'),
  preferredMfaType: text('preferredMfaType'), // PASSKEY, TOTP, NONE
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
  timezone: text('timezone').default('UTC'),
  locale: text('locale').default('en-US'),
  themePreference: text('themePreference').default('system'),
});

export const userIdentities = sqliteTable('userIdentities', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  providerUserId: text('providerUserId').notNull(),
  email: text('email'),
  name: text('name'),
  avatarUrl: text('avatarUrl'),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  tokenExpiresAt: text('tokenExpiresAt'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updatedAt').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  userIdx: index('idx_user_identities_user').on(table.userId),
  uniqueIdentity: uniqueIndex('idx_user_identities_unique').on(table.provider, table.providerUserId),
}));

export const passwordResets = sqliteTable('passwordResets', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull(),
  isUsed: integer('isUsed').default(0),
  expiresAt: text('expiresAt').notNull(),
}, (table) => ({
  userIdx: index('idx_pass_resets_user').on(table.userId),
}));

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
  expiresAt: text('expiresAt').notNull(),
  passkeyVerifiedAt: text('passkeyVerifiedAt'),
  challenge: text('challenge'),
  userAgent: text('userAgent'),
  ipAddress: text('ipAddress'),
  ipV4: text('ipV4'),
  ipV6: text('ipV6'),
  lastActiveAt: text('lastActiveAt').default(sql`CURRENT_TIMESTAMP`),
  deviceName: text('deviceName'),
  os: text('os'),
  browser: text('browser'),
  cfRay: text('cfRay'),
  isPersistent: integer('isPersistent').default(0),
  city: text('city'),
  country: text('country'),
  region: text('region'),
  continent: text('continent'),
  latitude: text('latitude'),
  longitude: text('longitude'),
  cfIp: text('cfIp'),
}, (table) => ({
  userIdx: index('idx_sessions_user').on(table.userId),
}));

export const totpCredentials = sqliteTable('totpCredentials', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  secret: text('secret').notNull(),
  name: text('name').default('Authenticator App'),
  verified: integer('verified').default(0),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
  lastUsedAt: text('lastUsedAt'),
  lastUsedIp: text('lastUsedIp'),
  lastUsedIpV4: text('lastUsedIpV4'),
  lastUsedIpV6: text('lastUsedIpV6'),
  lastUsedLocation: text('lastUsedLocation'),
  lastUsedUa: text('lastUsedUa'),
}, (table) => ({
  userIdx: index('idx_totp_credentials_user').on(table.userId),
}));

export const passkeys = sqliteTable('passkeys', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  credentialId: text('credentialId').notNull(),
  publicKey: text('publicKey').notNull(),
  counter: integer('counter').notNull(),
  deviceType: text('deviceType'),
  backedUp: integer('backedUp').default(0), // 0 or 1
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
  lastUsedAt: text('lastUsedAt'),
  name: text('name'),
  aaguid: text('aaguid'),
  transports: text('transports'),
  providerName: text('providerName'),
  icon: text('icon'),
  lastUsedIp: text('lastUsedIp'),
  lastUsedIpV4: text('lastUsedIpV4'),
  lastUsedIpV6: text('lastUsedIpV6'),
  lastUsedLocation: text('lastUsedLocation'),
  lastUsedUa: text('lastUsedUa'),
}, (table) => ({
  userIdx: index('idx_passkeys_user').on(table.userId),
}));

export const backupCodes = sqliteTable('backupCodes', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  codeHash: text('codeHash').notNull(),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
  usedAt: text('usedAt'),
}, (table) => ({
  userIdx: index('idx_backup_codes_user').on(table.userId),
}));

export const passkeyChallenges = sqliteTable('passkeyChallenges', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  challenge: text('challenge').notNull(),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
  expiresAt: text('expiresAt').notNull(),
});

export const userOnboarding = sqliteTable('userOnboarding', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  stepId: text('stepId').notNull(),
  status: text('status').default('pending'),
  completedAt: text('completedAt'),
}, (table) => ({
  userIdx: index('idx_onboarding_user').on(table.userId),
}));

export const userPreferences = sqliteTable('userPreferences', {
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  key: text('key').notNull(),
  value: text('value'),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.key] }),
}));

export const adminInvitations = sqliteTable('adminInvitations', {
  id: text('id').primaryKey(),
  email: text('email'),
  token: text('token').notNull().unique(),
  role: text('role').notNull(),
  isClaimed: integer('isClaimed').default(0),
  expiresAt: text('expiresAt').notNull(),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
});

export const personalAccessTokens = sqliteTable('personalAccessTokens', {
  id: text('id').primaryKey(),
  householdId: text('householdId').notNull(), 
  name: text('name'),
  scopes: text('scopes').default('READ,WRITE'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
  lastUsedAt: text('lastUsedAt'),
}, (table) => ({
  householdIdx: index('idx_pat_household').on(table.householdId),
}));

export const notificationSettings = sqliteTable('notificationSettings', {
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  event: text('event').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).default(false),
  offsetDays: integer('offsetDays').default(3),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.type, table.event] }),
}));
