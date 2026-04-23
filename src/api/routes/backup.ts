import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { Bindings, Variables } from '../types'
import { logAudit } from '../utils'
import { HTTPException } from 'hono/http-exception'

const backup = new Hono<{ Bindings: Bindings, Variables: Variables }>()

// 🛑 EXPORT: Data Backup (Full JSON Account Export)
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
    'loan_payments',
    'bills',
    'liability_splits',
    'investment_holdings',
    'schedules',
    'webhooks'
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

// 🛑 RESTORE: Data Restore (v3.26.0)
const TABLE_WHITELIST: Record<string, string[]> = {
  households: ['id', 'name', 'currency', 'country_code', 'status'],
  accounts: ['id', 'household_id', 'name', 'type', 'balance_cents', 'currency', 'status'],
  categories: ['id', 'household_id', 'name', 'icon', 'color', 'monthly_budget_cents', 'envelope_balance_cents', 'rollover_enabled', 'rollover_cents', 'emergency_fund'],
  transactions: ['id', 'household_id', 'account_id', 'category_id', 'amount_cents', 'description', 'transaction_date', 'status', 'is_recurring', 'provider_id', 'bill_id'],
  subscriptions: ['id', 'household_id', 'name', 'amount_cents', 'billing_cycle', 'next_billing_date', 'category_id', 'account_id', 'payment_mode'],
  pay_schedules: ['id', 'household_id', 'userId', 'name', 'frequency', 'next_pay_date', 'estimated_amount_cents', 'semi_monthly_day_1', 'semi_monthly_day_2'],
  pay_exceptions: ['id', 'household_id', 'userId', 'pay_schedule_id', 'original_date', 'override_date', 'override_amount_cents', 'note'],
  savings_buckets: ['id', 'household_id', 'name', 'target_cents', 'current_cents', 'target_date', 'category_id'],
  templates: ['id', 'household_id', 'name', 'description', 'amount_cents', 'category_id', 'account_id'],
  installment_plans: ['id', 'household_id', 'name', 'total_amount_cents', 'installment_amount_cents', 'total_installments', 'remaining_installments', 'frequency', 'next_payment_date', 'status'],
  credit_cards: ['id', 'household_id', 'account_id', 'credit_limit_cents', 'interest_rate_apy', 'statement_closing_day', 'payment_due_day'],
  personal_loans: ['id', 'household_id', 'lender_user_id', 'borrower_name', 'total_amount_cents', 'remaining_balance_cents', 'interest_rate_apy', 'origination_date'],
  loan_payments: ['id', 'loan_id', 'amount_cents', 'platform', 'method'],
  bills: ['id', 'household_id', 'name', 'amount_cents', 'due_date', 'status', 'is_recurring', 'frequency'],
  liability_splits: ['id', 'household_id', 'target_id', 'target_type', 'assigned_user_id', 'split_type', 'split_value', 'calculated_amount_cents', 'status'],
  investment_holdings: ['id', 'household_id', 'account_id', 'name', 'quantity', 'value_cents'],
  schedules: ['id', 'household_id', 'target_id', 'target_type', 'frequency', 'next_run_at', 'status'],
  webhooks: ['id', 'household_id', 'url', 'secret', 'event_list', 'is_active']
};

backup.post('/restore', zValidator('json', z.object({
  data: z.record(z.string(), z.array(z.any()))
})), async (c) => {
  const householdId = c.get('householdId')
  const { data } = c.req.valid('json')
  const db = c.env.DB;
  
  let totalRestored = 0;
  const tables = Object.keys(data).filter(t => !!TABLE_WHITELIST[t]);
  
  for (const table of tables) {
    const rows = data[table]
    if (!rows || rows.length === 0) continue
    
    const allowedColumns = TABLE_WHITELIST[table];
    
    for (const row of rows) {
      // 1. Sanitize keys: only allow columns specified in the whitelist
      const sanitizedRow: any = {};
      const actualCols: string[] = [];
      
      allowedColumns.forEach(col => {
        if (row[col] !== undefined) {
          sanitizedRow[col] = row[col];
          actualCols.push(col);
        }
      });

      // 2. Force Household Context if the table supports it
      if (allowedColumns.includes('household_id')) {
        sanitizedRow['household_id'] = householdId;
        if (!actualCols.includes('household_id')) actualCols.push('household_id');
      }

      if (actualCols.length === 0) continue;

      // 3. Strict Pre-execution Regex Check
      const invalidCol = actualCols.find(c => !/^[a-z0-9_]+$/.test(c));
      const invalidTable = !/^[a-z0-9_]+$/.test(table);
      
      if (invalidCol || invalidTable) {
        throw new HTTPException(400, { message: 'Invalid data format. Restore cancelled to ensure security.' });
      }

      const placeholders = actualCols.map(() => '?').join(', ');
      const cols = actualCols.join(', ');
      const values = actualCols.map(c => sanitizedRow[c]);
      
      // 4. SECURE EXECUTION: Column names are now verified against a static whitelist and strict regex
      await db.prepare(`INSERT OR REPLACE INTO ${table} (${cols}) VALUES (${placeholders})`)
        .bind(...values).run();
      
      totalRestored++;
    }
  }

  await logAudit(c, 'households', householdId, 'RESTORE', null, { rows_restored: totalRestored, tables_count: tables.length })
  return c.json({ success: true, rows_restored: totalRestored, tables_count: tables.length })
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
    throw new HTTPException(502, { message: `Cloud sync failure: ${err.message}` })
  }

  await logAudit(c, 'households', householdId, 'CLOUD_SYNC', null, { provider })
  return c.json({ success: true, provider, filename })
})

export default backup
