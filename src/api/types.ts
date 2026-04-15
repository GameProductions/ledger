export type D1Database = any;
export type R2Bucket = any;
export type DurableObjectNamespace = any;
export type KVNamespace = any;

export type Bindings = {
  DB: D1Database
  ASSETS: R2Bucket
  BACKUPS: R2Bucket
  LEDGER_CACHE: KVNamespace
  TITAN_GUARD_CACHE: KVNamespace
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
}

export type Variables = {
  householdId: string
  userId: string
  globalRole: string
  impersonatorId?: string
  [key: string]: any
}
