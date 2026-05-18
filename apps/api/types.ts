export type D1Database = any;
export type R2Bucket = any;
export type DurableObjectNamespace = any;
export type KVNamespace = any;
export type Fetcher = any;

export type Bindings = {
  DB: D1Database
  ASSETS: Fetcher
  STORAGE: R2Bucket
  BACKUPS: R2Bucket
  STORAGE_BUCKET: R2Bucket
  CACHE: KVNamespace
  FLEET_SECURITY_CACHE: KVNamespace
  SESSION: DurableObjectNamespace
  JWT_SECRET: string
  DISCORD_TOKEN: string
  DISCORD_WEBHOOK_URL: string
  DISCORD_PUBLIC_KEY: string
  ENCRYPTION_KEY: string
  RESEND_API_KEY: string
  FROM_EMAIL: string
  WEB_URL: string
  ENVIRONMENT: string
  VAULT: DurableObjectNamespace
  RATE_LIMITER: DurableObjectNamespace
  DISCORD_CLIENT_ID: string
  DISCORD_CLIENT_SECRET: string
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  DROPBOX_CLIENT_ID: string
  DROPBOX_CLIENT_SECRET: string
  ONEDRIVE_CLIENT_ID: string
  ONEDRIVE_CLIENT_SECRET: string
  GITHUB_TOKEN: string
  GITHUB_REPO: string
  MAINTENANCE_MODE?: string
  FOUNDATION_URL?: string
  SHARED_SERVICE_SECRET: string
  RECONCILIATION_AGENT: any
  MATCH_AGENT: any
  RULE_AGENT: any
  ADMIN_MIGRATION_KEY: string
  // 🛰️ Fleet Activity Queue (Producer)
  FLEET_ACTIVITY?: Queue;
}

export type Variables = {
  householdId: string
  userId: string
  globalRole: string
  sessionId?: string
  impersonatorId?: string
  cspNonce: string
  [key: string]: any
}
