import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { Bindings, Variables } from '../types'
import { logAudit } from '../utils'
import { HTTPException } from 'hono/http-exception'

const backup = new Hono<{ Bindings: Bindings, Variables: Variables }>()

// 🛑 EXPORT: Sovereignty Protocol (Full JSON Ledger Dump)
backup.get('/export', async (c) => {
  const householdId = c.get('householdId')
  
  const tables = [
    'households',
    'accounts',
    'categories',
    'transactions',
    'subscriptions',
    'pay_schedules',
    'savings_buckets',
    'templates',
    'installment_plans',
    'milestone_plans',
    'milestone_installments',
    'credit_cards',
    'variable_schedules',
    'personal_loans',
    'loan_payments'
  ]

  const dump: Record<string, any[]> = {}
  
  for (const table of tables) {
    const { results } = await c.env.DB.prepare(`SELECT * FROM ${table} WHERE household_id = ?`)
      .bind(householdId).all()
    dump[table] = results
  }

  // Special case: households table (filter by ID)
  const { results: h } = await c.env.DB.prepare(`SELECT * FROM households WHERE id = ?`)
    .bind(householdId).all()
  dump['households'] = h

  return c.json({
    version: '3.18.0',
    timestamp: new Date().toISOString(),
    householdId,
    data: dump
  })
})

// 🛑 RESTORE: Atomic Ingestion Protocol
backup.post('/restore', zValidator('json', z.object({
  data: z.record(z.string(), z.array(z.any()))
})), async (c) => {
  const householdId = c.get('householdId')
  const { data } = c.req.valid('json')
  
  // We perform separate transactions for each table to avoid massive batch limits
  // but we use a sequence to ensure atomicity within reason.
  
  const tables = Object.keys(data)
  
  for (const table of tables) {
    const rows = data[table]
    if (!rows || rows.length === 0) continue
    
    // Safety check: only restore to the current household
    const filteredRows = rows.map(r => ({ ...r, household_id: householdId }))
    
    for (const row of filteredRows) {
      const keys = Object.keys(row)
      const values = Object.values(row)
      const placeholders = keys.map(() => '?').join(', ')
      const cols = keys.join(', ')
      
      await c.env.DB.prepare(`INSERT OR REPLACE INTO ${table} (${cols}) VALUES (${placeholders})`)
        .bind(...values).run()
    }
  }

  await logAudit(c, 'households', householdId, 'RESTORE', null, { table_count: tables.length })
  return c.json({ success: true, tables_restored: tables.length })
})

// 🛑 CLOUD SYNC: Provider Redundancy (Google/Dropbox/OneDrive)
backup.post('/cloud/:provider', async (c) => {
  const householdId = c.get('householdId')
  const provider = c.req.param('provider')
  const userId = c.get('userId')
  
  // 1. Fetch Cloud Tokens
  const identity = await c.env.DB.prepare('SELECT access_token, refresh_token FROM user_identities WHERE user_id = ? AND provider = ?')
    .bind(userId, provider).first() as any
    
  if (!identity) {
    throw new HTTPException(401, { message: `Identity for ${provider} not linked. Please connect your account in Settings.` })
  }

  // 2. Generate the backup payload (Same as /export)
  const tables = ['households', 'accounts', 'categories', 'transactions', 'subscriptions']
  const dump: Record<string, any[]> = {}
  for (const table of tables) {
    const { results } = await c.env.DB.prepare(`SELECT * FROM ${table} WHERE household_id = ?`).bind(householdId).all()
    dump[table] = results
  }
  
  const payload = JSON.stringify({ version: '3.18.0', data: dump })
  const filename = `ledger_backup_${householdId}_${new Date().toISOString().split('T')[0]}.json`

  // 3. Provider Specific Upload logic
  try {
    if (provider === 'google') {
      // Create/Update file in Google Drive
      const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${identity.access_token}` },
        body: payload 
      })
      if (!uploadRes.ok) throw new Error(await uploadRes.text())
    } else if (provider === 'dropbox') {
      const uploadRes = await fetch('https://content.dropboxapi.com/2/files/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${identity.access_token}`,
          'Dropbox-API-Arg': JSON.stringify({ path: `/${filename}`, mode: 'overwrite' }),
          'Content-Type': 'application/octet-stream'
        },
        body: payload
      })
      if (!uploadRes.ok) throw new Error(await uploadRes.text())
    } else if (provider === 'onedrive') {
      const uploadRes = await fetch(`https://graph.microsoft.com/v1.0/me/drive/root:/${filename}:/content`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${identity.access_token}`,
          'Content-Type': 'application/json'
        },
        body: payload
      })
      if (!uploadRes.ok) throw new Error(await uploadRes.text())
    }
  } catch (err: any) {
    console.error(`[CLOUD_SYNC] Failed for ${provider}:`, err)
    throw new HTTPException(502, { message: `Cloud transport failure: ${err.message}` })
  }

  await logAudit(c, 'households', householdId, 'CLOUD_SYNC', null, { provider })
  return c.json({ success: true, provider, filename })
})

export default backup
