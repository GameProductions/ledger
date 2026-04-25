import { describe, it, expect, beforeAll } from 'vitest'
import { app as ledgerApi } from '../index'

describe('Global Infrastructure Checks', () => {
  it('Should successfully verify system health ping', async () => {
    const res = await ledgerApi.request('/ping', {}, {
      ENVIRONMENT: 'test',
      DB: {} as any,
      ASSETS: {} as any,
      BACKUPS: {} as any,
      LEDGER_CACHE: {} as any,
      SESSION: {} as any,
      JWT_SECRET: 'test',
      DISCORD_TOKEN: 'test',
      DISCORD_WEBHOOK_URL: 'test',
      DISCORD_PUBLIC_KEY: 'test',
      ENCRYPTION_KEY: 'test',
      RESEND_API_KEY: 'test',
      FROM_EMAIL: 'test',
      WEB_URL: 'test',
      VAULT: {} as any,
      RATE_LIMITER: {} as any,
      DISCORD_CLIENT_ID: 'test',
      DISCORD_CLIENT_SECRET: 'test',
      GOOGLE_CLIENT_ID: 'test',
      GOOGLE_CLIENT_SECRET: 'test',
      DROPBOX_CLIENT_ID: 'test',
      DROPBOX_CLIENT_SECRET: 'test',
      ONEDRIVE_CLIENT_ID: 'test',
      ONEDRIVE_CLIENT_SECRET: 'test',
      GITHUB_TOKEN: 'test',
      GITHUB_REPO: 'test'
    })
    
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toContain('PONG - LEDGER')
    expect(text).toContain('IS LIVE')
  })
})
