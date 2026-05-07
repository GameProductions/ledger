import { sqliteTable, text, integer, primaryKey, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique(), 
  displayName: text('display_name'),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash'),
  avatarUrl: text('avatar_url'),
  globalRole: text('global_role').default('user'),
  status: text('status').default('active'),
  lastActiveAt: text('last_active_at'),
  forcePasswordChange: integer('force_password_change').default(0),
  passkeyVerifiedAt: text('passkey_verified_at'),
  lastLogin: text('last_login').default(sql`CURRENT_TIMESTAMP`),
  lastSeenVersion: text('last_seen_version').default('0.0.0'),
  onboardingCompleted: integer('onboarding_completed').default(0),
  failedLoginAttempts: integer('failed_login_attempts').default(0),
  lockoutUntil: text('lockout_until'),
  passwordChangedAt: text('password_changed_at'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  timezone: text('timezone').default('UTC'),
  locale: text('locale').default('en-US'),
  theme: text('theme').default('system'),
});

export const userIdentities = sqliteTable('user_identities', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  providerUserId: text('provider_user_id').notNull(),
  email: text('email'),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  tokenExpiresAt: text('token_expires_at'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  userIdx: index('idx_user_identities_user').on(table.userId),
  uniqueIdentity: uniqueIndex('idx_user_identities_unique').on(table.provider, table.providerUserId),
}));

export const passwordResets = sqliteTable('password_resets', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(), // Zero-knowledge hash
  isUsed: integer('is_used').default(0),
  expiresAt: text('expires_at').notNull(),
}, (table) => ({
  userIdx: index('idx_pass_resets_user').on(table.userId),
}));

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  expiresAt: text('expires_at').notNull(),
  passkeyVerifiedAt: text('passkey_verified_at'),
  challenge: text('challenge'),
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'),
  ipV4: text('ip_v4'),
  ipV6: text('ip_v6'),
  lastActiveAt: text('last_active_at').default(sql`CURRENT_TIMESTAMP`),
  deviceName: text('device_name'),
  os: text('os'),
  browser: text('browser'),
  cfRay: text('cf_ray'),
  isPersistent: integer('is_persistent').default(0),
  location: text('location'), // Fleet Standardization
  city: text('city'),
  country: text('country'),
  region: text('region'),
  continent: text('continent'),
  latitude: text('latitude'),
  longitude: text('longitude'),
  cfIp: text('cf_ip'),
}, (table) => ({
  userIdx: index('idx_sessions_user').on(table.userId),
}));

export const passkeys = sqliteTable('passkeys', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // 🔐 Zero-Knowledge Lookup
  // The raw credentialId is stored in the Vault. We use a SHA-256 hash here for lookups.
  credentialIdHash: text('credential_id_hash').notNull().unique(),
  
  // 📈 Security & Counters
  counter: integer('counter').notNull().default(0),
  deviceType: text('device_type'), // 'single_device' | 'multi_device'
  backedUp: integer('backed_up').default(0), 
  attestationFormat: text('attestation_format'), // 'packed', 'none', etc.
  userVerified: integer('user_verified').default(0),

  // 🕒 Temporal Metadata
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  lastUsedAt: text('last_used_at'),
  
  // 🏷️ Identity & Branding
  name: text('name'),
  aaguid: text('aaguid'),
  providerName: text('provider_name'),
  icon: text('icon'),
  securityLevel: text('security_level'),
  manufacturer: text('manufacturer'),
  logo: text('logo'),
  transports: text('transports'), // JSON array of allowed transports

  // 🕵️ Registration Forensics (Immutable)
  registrationIp: text('registration_ip'),
  registrationIpV4: text('registration_ipv4'),
  registrationIpV6: text('registration_ipv6'),
  registrationCity: text('registration_city'),
  registrationCountry: text('registration_country'),
  registrationRegion: text('registration_region'),
  registrationLatitude: text('registration_latitude'),
  registrationLongitude: text('registration_longitude'),
  registrationLocation: text('registration_location'),
  registrationUa: text('registration_ua'),

  // 🕵️ Usage Forensics (Mutable)
  lastUsedIp: text('last_used_ip'),
  lastUsedIpV4: text('last_used_ip_v4'),
  lastUsedIpV6: text('last_used_ip_v6'),
  lastUsedCity: text('last_used_city'),
  lastUsedCountry: text('last_used_country'),
  lastUsedRegion: text('last_used_region'),
  lastUsedLatitude: text('last_used_latitude'),
  lastUsedLongitude: text('last_used_longitude'),
  lastUsedLocation: text('last_used_location'),
  lastUsedUa: text('last_used_ua'),
}, (table) => ({
  userIdx: index('idx_passkeys_user').on(table.userId),
  hashIdx: index('idx_passkeys_hash').on(table.credentialIdHash),
}));

export const backupCodes = sqliteTable('backup_codes', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  codeHash: text('code_hash').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  usedAt: text('used_at'),
}, (table) => ({
  userIdx: index('idx_backup_codes_user').on(table.userId),
}));

export const passkeyChallenges = sqliteTable('passkey_challenges', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  challenge: text('challenge').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  expiresAt: text('expires_at').notNull(),
});

export const userOnboarding = sqliteTable('user_onboarding', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  stepId: text('step_id').notNull(),
  status: text('status').default('pending'),
  completedAt: text('completed_at'),
}, (table) => ({
  userIdx: index('idx_onboarding_user').on(table.userId),
}));

export const userPreferences = sqliteTable('user_preferences', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  key: text('key').notNull(),
  value: text('value'),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.key] }),
}));

export const adminInvitations = sqliteTable('admin_invitations', {
  id: text('id').primaryKey(),
  email: text('email'),
  tokenHash: text('token_hash').notNull().unique(), // Zero-knowledge hash
  role: text('role').notNull(),
  isClaimed: integer('is_claimed').default(0),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const personalAccessTokens = sqliteTable('personal_access_tokens', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull(), 
  name: text('name'),
  tokenHash: text('token_hash').notNull().unique(), // Zero-knowledge hash
  scopes: text('scopes').default('READ,WRITE'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  lastUsedAt: text('last_used_at'),
}, (table) => ({
  householdIdx: index('idx_pat_household').on(table.householdId),
}));
