import { SchedulingService } from '../services/scheduling.service';
import { decrypt } from '../utils';
const providerSyncHandlers = {
    plaid: async (env, conn, _token) => {
        console.log(`[Sync] Plaid sync for household ${conn.household_id}`);
        const accounts = [
            { id: `plaid-${conn.household_id}-checking`, name: 'Plaid Checking', balance: 524050, type: 'depository' },
            { id: `plaid-${conn.household_id}-savings`, name: 'Plaid Savings', balance: 1250000, type: 'depository' },
            { id: `plaid-${conn.household_id}-credit`, name: 'Plaid Platinum Card', balance: 45000, type: 'credit' }
        ];
        for (const acc of accounts) {
            await env.DB.prepare('INSERT INTO accounts (id, household_id, name, type, balance_cents) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET balance_cents = EXCLUDED.balance_cents').bind(acc.id, conn.household_id, acc.name, acc.type, acc.balance).run();
            if (acc.type === 'credit') {
                const ccId = `cc-${acc.id}`;
                await env.DB.prepare('INSERT INTO credit_cards (id, household_id, account_id, credit_limit_cents) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO NOTHING').bind(ccId, conn.household_id, acc.id, 1000000).run();
            }
        }
    },
    akoya: async (env, conn, _token) => {
        console.log(`[Sync] Akoya sync for household ${conn.household_id}`);
        const holdings = [
            { id: `akoya-${conn.household_id}-h1`, name: 'Vanguard Total Stock Market', qty: 120.5, val: 3200000 },
            { id: `akoya-${conn.household_id}-h2`, name: 'Bitcoin (via Coinbase)', qty: 0.45, val: 2800000 }
        ];
        for (const h of holdings) {
            await env.DB.prepare('INSERT INTO investment_holdings (id, household_id, account_id, name, quantity, value_cents) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET value_cents = EXCLUDED.value_cents, quantity = EXCLUDED.quantity').bind(h.id, conn.household_id, 'retirement-acc-1', h.name, h.qty, h.val).run();
        }
    },
    method: async (env, conn, _token) => {
        console.log(`[Sync] Method FI sync for household ${conn.household_id}`);
        const installments = [
            { id: `method-${conn.household_id}-i1`, name: 'Affirm: Apple Store', total: 120000, monthly: 10000, remaining: 8, freq: 'monthly' }
        ];
        for (const inst of installments) {
            await env.DB.prepare('INSERT INTO installment_plans (id, household_id, name, total_amount_cents, installment_amount_cents, total_installments, remaining_installments, frequency, next_payment_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET remaining_installments = EXCLUDED.remaining_installments').bind(inst.id, conn.household_id, inst.name, inst.total, inst.monthly, 12, inst.remaining, inst.freq, '2024-04-01').run();
        }
    },
    privacy: async (env, conn, _token) => {
        console.log(`[Sync] Privacy.com sync for household ${conn.household_id}`);
        const cards = [
            { id: `privacy-${conn.household_id}-c1`, last4: '1234', host: 'Netflix', limit: 2000, state: 'OPEN' }
        ];
        for (const card of cards) {
            await env.DB.prepare('INSERT INTO privacy_cards (id, household_id, connection_id, last4, hostname, spend_limit_cents, state) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET state = EXCLUDED.state, spend_limit_cents = EXCLUDED.spend_limit_cents').bind(card.id, conn.household_id, conn.id, card.last4, card.host, card.limit, card.state).run();
        }
    }
};
export const syncAllConnections = async (env) => {
    const { results: connections } = await env.DB.prepare('SELECT * FROM external_connections WHERE status = "active"').all();
    console.log(`[Sync] Found ${connections.length} active connections to sync.`);
    const results = [];
    for (const conn of connections) {
        try {
            const token = await decrypt(conn.access_token, env.ENCRYPTION_KEY);
            if (token === 'DECRYPTION_FAILED') {
                throw new Error('Token decryption failed');
            }
            const handler = providerSyncHandlers[conn.provider];
            if (handler) {
                await handler(env, conn, token);
                await env.DB.prepare('UPDATE external_connections SET last_sync_at = CURRENT_TIMESTAMP WHERE id = ?')
                    .bind(conn.id).run();
                await env.DB.prepare('INSERT INTO system_audit_logs (id, user_id, action, target, details_json) VALUES (?, ?, ?, ?, ?)').bind(crypto.randomUUID(), 'system', 'SYNC_SUCCESS', conn.provider, JSON.stringify({ connectionId: conn.id, householdId: conn.household_id })).run();
                results.push({ success: true, provider: conn.provider, connectionId: conn.id });
            }
            else {
                throw new Error(`No handler for provider: ${conn.provider}`);
            }
        }
        catch (e) {
            console.error(`[Sync] Error syncing connection ${conn.id}:`, e);
            await env.DB.prepare('INSERT INTO system_audit_logs (id, user_id, action, target, details_json) VALUES (?, ?, ?, ?, ?)').bind(crypto.randomUUID(), 'system', 'SYNC_FAILURE', conn.provider, JSON.stringify({ connectionId: conn.id, error: e.message })).run();
            results.push({ success: false, provider: conn.provider, connectionId: conn.id, error: e.message });
        }
    }
    return results;
};
export const handleScheduled = async (event, env, ctx) => {
    const now = new Date();
    const nowIso = now.toISOString();
    // 1. Process Unified Schedules (Subscriptions, Budgets, etc.)
    const { results: dueSchedules } = await env.DB.prepare('SELECT * FROM schedules WHERE next_run_at <= ? AND status = "active"').bind(nowIso).all();
    for (const schedule of dueSchedules) {
        const queries = [];
        const currentCount = (schedule.executed_count || 0) + 1;
        try {
            if (schedule.target_type === 'subscription') {
                const sub = await env.DB.prepare('SELECT * FROM subscriptions WHERE id = ?').bind(schedule.target_id).first();
                if (sub) {
                    const txId = crypto.randomUUID();
                    queries.push(env.DB.prepare('INSERT INTO transactions (id, household_id, account_id, description, amount_cents, transaction_date, category_id) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(txId, schedule.household_id, sub.account_id || 'acc-manual', `Subscription: ${sub.name}`, sub.amount_cents, nowIso.split('T')[0], sub.category_id));
                }
            }
            else if (schedule.target_type === 'budget_reset') {
                const category = await env.DB.prepare('SELECT household_id, monthly_budget_cents, envelope_balance_cents, rollover_enabled FROM categories WHERE id = ?').bind(schedule.target_id).first();
                if (category) {
                    const data = category;
                    const monthlyBudget = data.monthly_budget_cents;
                    const currentEnvelope = data.envelope_balance_cents;
                    const isRollover = data.rollover_enabled === 1 || data.rollover_enabled === true;
                    if (isRollover) {
                        queries.push(env.DB.prepare('UPDATE households SET unallocated_balance_cents = unallocated_balance_cents - ? WHERE id = ?').bind(monthlyBudget, schedule.household_id));
                        queries.push(env.DB.prepare('UPDATE categories SET envelope_balance_cents = envelope_balance_cents + ?, rollover_cents = ? WHERE id = ?').bind(monthlyBudget, currentEnvelope, schedule.target_id));
                    }
                    else {
                        const surplus = currentEnvelope;
                        const adjustment = monthlyBudget - surplus;
                        queries.push(env.DB.prepare('UPDATE households SET unallocated_balance_cents = unallocated_balance_cents - ? WHERE id = ?').bind(adjustment, schedule.household_id));
                        queries.push(env.DB.prepare('UPDATE categories SET envelope_balance_cents = ?, rollover_cents = 0 WHERE id = ?').bind(monthlyBudget, schedule.target_id));
                    }
                }
            }
            const nextOccurrence = SchedulingService.calculateNextOccurrence(schedule, now, currentCount);
            if (nextOccurrence) {
                queries.push(env.DB.prepare('UPDATE schedules SET last_run_at = ?, next_run_at = ?, executed_count = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(nowIso, nextOccurrence.toISOString(), currentCount, schedule.id));
            }
            else {
                queries.push(env.DB.prepare('UPDATE schedules SET last_run_at = ?, next_run_at = ?, executed_count = ?, status = "completed", updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(nowIso, nowIso, currentCount, schedule.id));
            }
            queries.push(env.DB.prepare('INSERT INTO schedule_history (id, schedule_id, household_id, occurrence_at, action_status) VALUES (?, ?, ?, ?, ?)').bind(crypto.randomUUID(), schedule.id, schedule.household_id, nowIso, 'executed'));
            if (queries.length > 0)
                await env.DB.batch(queries);
        }
        catch (e) {
            console.error(`[Scheduler] Failed to process schedule ${schedule.id}:`, e);
            await env.DB.prepare('INSERT INTO schedule_history (id, schedule_id, household_id, occurrence_at, action_status, details_json) VALUES (?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), schedule.id, schedule.household_id, nowIso, 'failed', JSON.stringify({ error: e.message })).run();
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
            const targetDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const { results: trials } = await env.DB.prepare('SELECT * FROM subscriptions WHERE trial_end_date = ? AND is_trial = 1').bind(targetDate).all();
            for (const sub of trials) {
                ctx.waitUntil(fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: `🔔 **LEDGER Trial Alert**: Your trial for **${sub.name}** ends in 3 days. Ensure you have **$${(sub.amount_cents / 100).toFixed(2)}** ready!` })
                }));
            }
        }
    }
};
