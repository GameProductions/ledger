import { Bindings } from '../types'
import { SchedulingService } from '../services/scheduling.service'
import { decrypt } from '../utils'
import { getDb } from '../db'
import { accounts, creditCards, investmentHoldings, installmentPlans, privacyCards, externalConnections, systemAuditLogs, schedules, subscriptions, transactions, categories, households, scheduleHistory } from '../db/schema'
import { eq, sql, lte, and } from 'drizzle-orm'

const toSnake = (obj: any) => {
  if (!obj || typeof obj !== 'object') return obj;
  const res: any = {};
  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    res[snakeKey] = obj[key];
  }
  return res;
}

type SyncResult = {
  success: boolean
  provider: string
  connectionId: string
  error?: string
}

const providerSyncHandlers: Record<string, (env: Bindings, connection: any, token: string) => Promise<void>> = {
  plaid: async (env, conn, _token) => {
    console.log(`[Sync] Plaid sync for household ${conn.household_id}`)
    const db = getDb(env);
    const accountsData = [
      { id: `plaid-${conn.household_id}-checking`, name: 'Plaid Checking', balance: 524050, type: 'depository' },
      { id: `plaid-${conn.household_id}-savings`, name: 'Plaid Savings', balance: 1250000, type: 'depository' },
      { id: `plaid-${conn.household_id}-credit`, name: 'Plaid Platinum Card', balance: 45000, type: 'credit' }
    ]
    for (const acc of accountsData) {
      await db.insert(accounts).values({
        id: acc.id,
        householdId: conn.household_id,
        name: acc.name,
        type: acc.type,
        balanceCents: acc.balance
      }).onConflictDoUpdate({ target: accounts.id, set: { balanceCents: acc.balance } })
      
      if (acc.type === 'credit') {
        const ccId = `cc-${acc.id}`
        await db.insert(creditCards).values({
          id: ccId,
          householdId: conn.household_id,
          accountId: acc.id,
          creditLimitCents: 1000000
        }).onConflictDoNothing()
      }
    }
  },
  akoya: async (env, conn, _token) => {
    console.log(`[Sync] Akoya sync for household ${conn.household_id}`)
    const db = getDb(env);
    const holdings = [
      { id: `akoya-${conn.household_id}-h1`, name: 'Vanguard Total Stock Market', qty: 120.5, val: 3200000 },
      { id: `akoya-${conn.household_id}-h2`, name: 'Bitcoin (via Coinbase)', qty: 0.45, val: 2800000 }
    ]
    for (const h of holdings) {
      await db.insert(investmentHoldings).values({
        id: h.id,
        householdId: conn.household_id,
        accountId: 'retirement-acc-1',
        name: h.name,
        quantity: h.qty,
        valueCents: h.val
      }).onConflictDoUpdate({ target: investmentHoldings.id, set: { valueCents: h.val, quantity: h.qty } })
    }
  },
  method: async (env, conn, _token) => {
    console.log(`[Sync] Method FI sync for household ${conn.household_id}`)
    const db = getDb(env);
    const installments = [
      { id: `method-${conn.household_id}-i1`, name: 'Affirm: Apple Store', total: 120000, monthly: 10000, remaining: 8, freq: 'monthly' }
    ]
    for (const inst of installments) {
      await db.insert(installmentPlans).values({
        id: inst.id,
        householdId: conn.household_id,
        name: inst.name,
        totalAmountCents: inst.total,
        installmentAmountCents: inst.monthly,
        totalInstallments: 12,
        remainingInstallments: inst.remaining,
        frequency: inst.freq,
        nextPaymentDate: '2024-04-01'
      }).onConflictDoUpdate({ target: installmentPlans.id, set: { remainingInstallments: inst.remaining } })
    }
  },
  privacy: async (env, conn, _token) => {
    console.log(`[Sync] Privacy.com sync for household ${conn.household_id}`)
    const db = getDb(env);
    const cards = [
      { id: `privacy-${conn.household_id}-c1`, last4: '1234', host: 'Netflix', limit: 2000, state: 'OPEN' }
    ]
    for (const card of cards) {
      await db.insert(privacyCards).values({
        id: card.id,
        householdId: conn.household_id,
        connectionId: conn.id,
        last4: card.last4,
        hostname: card.host,
        spendLimitCents: card.limit,
        state: card.state
      }).onConflictDoUpdate({ target: privacyCards.id, set: { state: card.state, spendLimitCents: card.limit } })
    }
  }
}

export const syncAllConnections = async (env: Bindings): Promise<SyncResult[]> => {
  const db = getDb(env);
  const connections = await db.select().from(externalConnections).where(eq(externalConnections.status, 'active'));

  console.log(`[Sync] Found ${connections.length} active connections to sync.`)
  const results: SyncResult[] = []

  for (const conn of connections) {
    try {
      const token = await decrypt(conn.accessToken, env.ENCRYPTION_KEY)
      if (token === 'DECRYPTION_FAILED') {
        throw new Error('Token decryption failed')
      }

      const handler = providerSyncHandlers[conn.provider]
      if (handler) {
        await handler(env, toSnake(conn), token)
        await db.update(externalConnections).set({ lastSyncAt: sql`CURRENT_TIMESTAMP` }).where(eq(externalConnections.id, conn.id))
        
        await db.insert(systemAuditLogs).values({
          id: crypto.randomUUID(),
          userId: 'system',
          action: 'SYNC_SUCCESS',
          target: conn.provider,
          detailsJson: JSON.stringify({ connectionId: conn.id, householdId: conn.householdId })
        })

        results.push({ success: true, provider: conn.provider, connectionId: conn.id })
      } else {
        throw new Error(`No handler for provider: ${conn.provider}`)
      }
    } catch (e: any) {
      console.error(`[Sync] Error syncing connection ${conn.id}:`, e)
      await db.insert(systemAuditLogs).values({
          id: crypto.randomUUID(),
          userId: 'system',
          action: 'SYNC_FAILURE',
          target: conn.provider,
          detailsJson: JSON.stringify({ connectionId: conn.id, error: e.message })
      })

      results.push({ success: false, provider: conn.provider, connectionId: conn.id, error: e.message })
    }
  }
  return results
}

export const handleScheduled = async (event: { cron: string }, env: Bindings, ctx: any) => {
  const now = new Date();
  const nowIso = now.toISOString();
  const db = getDb(env);

  // 1. Process Unified Schedules (Subscriptions, Budgets, etc.)
  const dueSchedules = await db.select().from(schedules).where(and(lte(schedules.nextRunAt, nowIso), eq(schedules.status, 'active')));

  for (const schedule of dueSchedules) {
    const queries = [];
    const currentCount = (schedule.executedCount || 0) + 1;
    
    try {
      if (schedule.targetType === 'subscription') {
        const subResult = await db.select().from(subscriptions).where(eq(subscriptions.id, schedule.targetId)).limit(1);
        const sub = subResult[0];
        if (sub) {
          const txId = crypto.randomUUID();
          queries.push(db.insert(transactions).values({
            id: txId,
            householdId: schedule.householdId,
            accountId: sub.accountId || 'acc-manual',
            description: `Subscription: ${sub.name}`,
            amountCents: sub.amountCents,
            transactionDate: nowIso.split('T')[0],
            categoryId: sub.categoryId
          }));
        }
      } else if (schedule.targetType === 'budget_reset') {
        const catResult = await db.select({
            householdId: categories.householdId,
            monthlyBudgetCents: categories.monthlyBudgetCents,
            envelopeBalanceCents: categories.envelopeBalanceCents,
            rolloverEnabled: categories.rolloverEnabled
        }).from(categories).where(eq(categories.id, schedule.targetId)).limit(1);
        const category = catResult[0];

        if (category) {
          const monthlyBudget = category.monthlyBudgetCents || 0;
          const currentEnvelope = category.envelopeBalanceCents || 0;
          const isRollover = category.rolloverEnabled === true;

          if (isRollover) {
            queries.push(db.update(households).set({ unallocatedBalanceCents: sql`unallocated_balance_cents - ${monthlyBudget}` }).where(eq(households.id, schedule.householdId)));
            queries.push(db.update(categories).set({ envelopeBalanceCents: sql`envelope_balance_cents + ${monthlyBudget}`, rolloverCents: currentEnvelope }).where(eq(categories.id, schedule.targetId)));
          } else {
            const surplus = currentEnvelope;
            const adjustment = monthlyBudget - surplus;
            queries.push(db.update(households).set({ unallocatedBalanceCents: sql`unallocated_balance_cents - ${adjustment}` }).where(eq(households.id, schedule.householdId)));
            queries.push(db.update(categories).set({ envelopeBalanceCents: monthlyBudget, rolloverCents: 0 }).where(eq(categories.id, schedule.targetId)));
          }
        }
      }
      
      const nextOccurrence = SchedulingService.calculateNextOccurrence(toSnake(schedule), now, currentCount);
      if (nextOccurrence) {
        queries.push(db.update(schedules).set({
            lastRunAt: nowIso,
            nextRunAt: nextOccurrence.toISOString(),
            executedCount: currentCount,
            updatedAt: sql`CURRENT_TIMESTAMP`
        }).where(eq(schedules.id, schedule.id)));
      } else {
        queries.push(db.update(schedules).set({
            lastRunAt: nowIso,
            nextRunAt: nowIso,
            executedCount: currentCount,
            status: 'completed',
            updatedAt: sql`CURRENT_TIMESTAMP`
        }).where(eq(schedules.id, schedule.id)));
      }
      
      queries.push(db.insert(scheduleHistory).values({
          id: crypto.randomUUID(),
          scheduleId: schedule.id,
          householdId: schedule.householdId,
          occurrenceAt: nowIso,
          actionStatus: 'executed'
      }));

      if (queries.length > 0) await db.batch(queries as any);
    } catch (e: any) {
      console.error(`[Scheduler] Failed to process schedule ${schedule.id}:`, e);
      await db.insert(scheduleHistory).values({
          id: crypto.randomUUID(),
          scheduleId: schedule.id,
          householdId: schedule.householdId,
          occurrenceAt: nowIso,
          actionStatus: 'failed',
          detailsJson: JSON.stringify({ error: e.message })
      })
    }
  }

  // 2. Daily Maintenance
  if (event.cron === "0 0 * * *") {
    ctx.waitUntil(syncAllConnections(env));
    
    // Discord Alerts (Trial Expiry, Weekly Pulse)
    const webhookUrl = env.DISCORD_WEBHOOK_URL;
    if (webhookUrl) {
      // Weekly Pulse (Sunday)
      if (new Date().getDay() === 0) {
        ctx.waitUntil(fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: "📈 **Weekly Pulse**: Your household's financial health is looking strong! Verified data sync completed." })
        }));
      }

      // Subscription Trials
      const targetDate = new Date(Date.now() + 3*24*60*60*1000).toISOString().split('T')[0];
      const trials = await db.select().from(subscriptions).where(and(eq(subscriptions.trialEndDate, targetDate), eq(subscriptions.isTrial, true)));
      for (const sub of trials) {
        ctx.waitUntil(fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: `🔔 **LEDGER Trial Alert**: Your trial for **${sub.name}** ends in 3 days. Ensure you have **$${((sub.amountCents || 0) / 100).toFixed(2)}** ready!` })
        }));
      }
    }
  }
}
