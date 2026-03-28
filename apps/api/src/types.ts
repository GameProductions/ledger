import { D1Database, R2Bucket, DurableObjectNamespace } from '@cloudflare/workers-types'

export type Bindings = {
  DB: D1Database
  ASSETS: R2Bucket
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
}

export type Variables = {
  householdId: string
  userId: string
  globalRole: string
}
