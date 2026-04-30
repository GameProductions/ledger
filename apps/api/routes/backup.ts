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
    'paySchedules',
    'savingsBuckets',
    'templates',
    'installmentPlans',
    'creditCards',
    'personalLoans',
    'loanPayments',
    'bills',
    'liabilitySplits',
    'investmentHoldings',
    'schedules',
    'webhooks'
  ]

  const dump: Record<string, any[]> = {}
  
  for (const table of tables) {
    const { results } = await c.env.DB.prepare(`SELECT * FROM ${table} WHERE householdId = ?`)
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
  households: ['id', 'name', 'currency', 'countryCode', 'status'],
  accounts: ['id', 'householdId', 'name', 'type', 'balanceCents', 'currency', 'status'],
  categories: ['id', 'householdId', 'name', 'icon', 'color', 'monthlyBudgetCents', 'envelopeBalanceCents', 'rolloverEnabled', 'rolloverCents', 'emergencyFund'],
  transactions: ['id', 'householdId', 'accountId', 'categoryId', 'amountCents', 'description', 'transactionDate', 'status', 'isRecurring', 'providerId', 'billId'],
  subscriptions: ['id', 'householdId', 'name', 'amountCents', 'billingCycle', 'nextBillingDate', 'categoryId', 'accountId', 'paymentMode'],
  paySchedules: ['id', 'householdId', 'userId', 'name', 'frequency', 'nextPayDate', 'estimatedAmountCents', 'semiMonthlyDay1', 'semiMonthlyDay2'],
  payExceptions: ['id', 'householdId', 'userId', 'payScheduleId', 'originalDate', 'overrideDate', 'overrideAmountCents', 'note'],
  savingsBuckets: ['id', 'householdId', 'name', 'targetCents', 'currentCents', 'targetDate', 'categoryId'],
  templates: ['id', 'householdId', 'name', 'description', 'amountCents', 'categoryId', 'accountId'],
  installmentPlans: ['id', 'householdId', 'name', 'totalAmountCents', 'installmentAmountCents', 'totalInstallments', 'remainingInstallments', 'frequency', 'nextPaymentDate', 'status'],
  creditCards: ['id', 'householdId', 'accountId', 'creditLimitCents', 'interestRateApy', 'statementClosingDay', 'paymentDueDay'],
  personalLoans: ['id', 'householdId', 'lenderUserId', 'borrowerName', 'totalAmountCents', 'remainingBalanceCents', 'interestRateApy', 'originationDate'],
  loanPayments: ['id', 'loanId', 'amountCents', 'platform', 'method'],
  bills: ['id', 'householdId', 'name', 'amountCents', 'dueDate', 'status', 'isRecurring', 'frequency'],
  liabilitySplits: ['id', 'householdId', 'targetId', 'targetType', 'assignedUserId', 'splitType', 'splitValue', 'calculatedAmountCents', 'status'],
  investmentHoldings: ['id', 'householdId', 'accountId', 'name', 'quantity', 'valueCents'],
  schedules: ['id', 'householdId', 'targetId', 'targetType', 'frequency', 'nextRunAt', 'status'],
  webhooks: ['id', 'householdId', 'url', 'secret', 'eventList', 'isActive']
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
      if (allowedColumns.includes('householdId')) {
        sanitizedRow['householdId'] = householdId;
        if (!actualCols.includes('householdId')) actualCols.push('householdId');
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

  await logAudit(c, 'households', householdId, 'RESTORE', null, { rowsRestored: totalRestored, tablesCount: tables.length })
  return c.json({ success: true, rowsRestored: totalRestored, tablesCount: tables.length })
})

// 🛑 CLOUD SYNC: Provider Redundancy (Google/Dropbox/OneDrive)
backup.post('/cloud/:provider', async (c) => {
  const householdId = c.get('householdId')
  const provider = c.req.param('provider')
  const userId = c.get('userId')
  const vaultService = new VaultService(c.env)
  
  // 1. Fetch Cloud Tokens from Vault
  const identity = await c.env.DB.prepare('SELECT id FROM userIdentities WHERE userId = ? AND provider = ?')
    .bind(userId, provider).first() as any
    
  if (!identity) {
    throw new HTTPException(401, { message: `Identity for ${provider} not linked. Please connect your account in Settings.` })
  }

  const accessToken = await vaultService.getSecret(userId, 'OAUTH_ACCESS', identity.id)
  if (!accessToken) {
    throw new HTTPException(401, { message: `Secure access token for ${provider} not found in vault.` })
  }

  // 2. Generate the backup payload (Same as /export)
  const tables = ['households', 'accounts', 'categories', 'transactions', 'subscriptions']
  const dump: Record<string, any[]> = {}
  for (const table of tables) {
    const { results } = await c.env.DB.prepare(`SELECT * FROM ${table} WHERE householdId = ?`).bind(householdId).all()
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
        headers: { 'Authorization': `Bearer ${accessToken}` },
        body: payload 
      })
      if (!uploadRes.ok) throw new Error(await uploadRes.text())
    } else if (provider === 'dropbox') {
      const uploadRes = await fetch('https://content.dropboxapi.com/2/files/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
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
          'Authorization': `Bearer ${accessToken}`,
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
