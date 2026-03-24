import { serve } from '@hono/node-server'
import { app, HouseholdSession } from './index'
import Database from 'better-sqlite3'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const DB_PATH = process.env.DATABASE_PATH || './cash.db'
const db = new Database(DB_PATH)

// --- D1 SHIM ---
const d1Shim = {
  prepare: (sql: string) => {
    const stmt = db.prepare(sql)
    return {
      bind: (...args: any[]) => {
        return {
          all: async () => ({ results: stmt.all(...args) }),
          run: async () => {
             const info = stmt.run(...args)
             return { success: true, meta: { changes: info.changes } }
          },
          first: async (key?: string) => {
            const row = stmt.get(...args) as any
            return key ? row?.[key] : row
          }
        }
      },
      all: async () => ({ results: stmt.all() }),
      run: async () => {
        const info = stmt.run()
        return { success: true, meta: { changes: info.changes } }
      },
      first: async (key?: string) => {
        const row = stmt.get() as any
        return key ? row?.[key] : row
      }
    }
  },
  batch: async (stmts: any[]) => {
    const results = []
    for (const s of stmts) {
      results.push(await s.run())
    }
    return results
  },
  exec: async (sql: string) => {
    db.exec(sql)
    return { success: true }
  }
}

// --- DURABLE OBJECT SHIM ---
class DurableObjectNamespaceShim {
  instances: Map<string, any> = new Map()
  
  idFromName(name: string) { return { toString: () => name } }
  get(id: { toString: () => string }) {
    const key = id.toString()
    if (!this.instances.has(key)) {
      // Mock state for constructor
      const state = {
        waitUntil: (p: Promise<any>) => p,
        id: id
      } as any
      this.instances.set(key, new HouseholdSession(state))
    }
    return this.instances.get(key)
  }
}

// --- INITIALIZE DB ---
console.log(`[Node] Initializing database at ${DB_PATH}...`)

// Check if tables exist by checking for 'users'
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get()
if (!tables) {
  console.log('[Node] Empty database. Applying base schema...')
  // Try packages/db/schema.sql
  const schemaPath = join(process.cwd(), '../../packages/db/schema.sql')
  if (existsSync(schemaPath)) {
    db.exec(readFileSync(schemaPath, 'utf8'))
    console.log('[Node] Base schema applied.')
  }
}

// Apply migrations
const migrationsDir = join(process.cwd(), '../../packages/db/migrations')
if (existsSync(migrationsDir)) {
  const migrations = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()
  for (const m of migrations) {
    console.log(`[Node] Checking migration: ${m}...`)
    try {
      db.exec(readFileSync(join(migrationsDir, m), 'utf8'))
    } catch (e: any) {
      if (e.message.includes('already exists') || e.message.includes('duplicate')) {
        // Skip
      } else {
        console.warn(`[Node] Migration ${m} note: ${e.message}`)
      }
    }
  }
}

// --- START SERVER ---
const port = parseInt(process.env.PORT || '8787')
console.log(`[Node] CASH API starting on port ${port}...`)

serve({
  fetch: (request) => {
    const env = {
      DB: d1Shim as any,
      SESSION: new DurableObjectNamespaceShim() as any,
      JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-hush',
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || '128a5f5152feecd29746e8c0e768393e',
      ENVIRONMENT: 'production',
      // Optional/Dummy for self-hosting if not provided
      RESEND_API_KEY: process.env.RESEND_API_KEY || '',
      DISCORD_WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL || '',
      DISCORD_TOKEN: process.env.DISCORD_TOKEN || '',
      DISCORD_PUBLIC_KEY: process.env.DISCORD_PUBLIC_KEY || ''
    }
    return app.fetch(request, env, {
      waitUntil: (p) => p.catch(console.error)
    } as any)
  },
  port
})
