import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import { logAudit } from '../utils';
const data = new Hono();
// Analysis & Insights (Plain English replacements for Analytics)
data.get('/analysis/summary', async (c) => {
    const householdId = c.get('householdId');
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const { results: income } = await c.env.DB.prepare('SELECT SUM(amount_cents) as total FROM transactions WHERE household_id = ? AND amount_cents > 0 AND transaction_date >= ?').bind(householdId, startOfMonth).all();
    const { results: expense } = await c.env.DB.prepare('SELECT SUM(ABS(amount_cents)) as total FROM transactions WHERE household_id = ? AND amount_cents < 0 AND transaction_date >= ?').bind(householdId, startOfMonth).all();
    const totalIncome = income[0].total || 0;
    const totalExpense = expense[0].total || 0;
    const savings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const { results: recentExpense } = await c.env.DB.prepare('SELECT SUM(ABS(amount_cents)) as total FROM transactions WHERE household_id = ? AND amount_cents < 0 AND transaction_date >= ?').bind(householdId, thirtyDaysAgo).all();
    const burnRate = recentExpense[0].total / 30;
    return c.json({
        healthScore: 85,
        monthlyIncome: totalIncome,
        monthlyExpense: totalExpense,
        savingsRate: Math.round(savingsRate),
        dailyBurnRate: Math.round(burnRate),
        safetyNumberCents: (savings * 6)
    });
});
data.get('/analysis/category-spending', async (c) => {
    const householdId = c.get('householdId');
    const timeframe = c.req.query('timeframe') || '30d';
    const days = timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 365;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];
    const { results } = await c.env.DB.prepare(`SELECT c.name, c.color, SUM(ABS(t.amount_cents)) as total_cents 
     FROM transactions t
     JOIN categories c ON t.category_id = c.id
     WHERE t.household_id = ? AND t.amount_cents < 0 AND t.transaction_date >= ?
     GROUP BY c.id
     ORDER BY total_cents DESC`).bind(householdId, startDateStr).all();
    return c.json(results);
});
data.get('/analysis/net-worth', async (c) => {
    const householdId = c.get('householdId');
    const { results: accs } = await c.env.DB.prepare('SELECT type, balance_cents FROM accounts WHERE household_id = ?').bind(householdId).all();
    const netWorthCents = accs.reduce((sum, a) => sum + a.balance_cents, 0);
    const { results: snapshots } = await c.env.DB.prepare('SELECT created_at, data_json FROM reports WHERE household_id = ? AND type = "net_worth_snapshot" ORDER BY created_at DESC LIMIT 6').bind(householdId).all();
    const history = snapshots.map((s) => ({
        date: s.created_at.split('T')[0],
        value: JSON.parse(s.data_json).net_worth_cents
    })).reverse();
    return c.json({
        current_net_worth_cents: netWorthCents,
        history
    });
});
data.get('/analysis/insights', async (c) => {
    const insights = [
        "You've saved 15% more this week compared to last week. Keep it up!",
        "Subscriptions are taking up 22% of your monthly budget. Consider a review of your ongoing costs.",
        "Your financial patterns indicate strong budget adherence.",
    ];
    return c.json({ insights });
});
data.get('/analysis/forecast', async (c) => {
    const householdId = c.get('householdId');
    const now = new Date();
    const dates = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now);
        d.setMonth(now.getMonth() + i);
        return d.toISOString().split('T')[0];
    });
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const { results: income } = await c.env.DB.prepare('SELECT SUM(amount_cents) as total FROM transactions WHERE household_id = ? AND amount_cents > 0 AND transaction_date >= ?').bind(householdId, thirtyDaysAgo).all();
    const { results: expense } = await c.env.DB.prepare('SELECT SUM(ABS(amount_cents)) as total FROM transactions WHERE household_id = ? AND amount_cents < 0 AND transaction_date >= ?').bind(householdId, thirtyDaysAgo).all();
    const monthlySurplus = (income[0].total || 0) - (expense[0].total || 0);
    const { results: accs } = await c.env.DB.prepare('SELECT balance_cents FROM accounts WHERE household_id = ?').bind(householdId).all();
    const startingBalance = accs.reduce((sum, a) => sum + a.balance_cents, 0);
    const forecast = dates.map((date, i) => {
        const projectedBalance = startingBalance + (monthlySurplus * (i + 1));
        return { date, balanceCents: Math.round(projectedBalance) };
    });
    return c.json(forecast);
});
// Universal Scraper
data.post('/scrape', zValidator('json', z.object({
    url: z.string().url(),
    type: z.enum(['provider', 'bank', 'billing']).default('provider')
})), async (c) => {
    const { url, type } = c.req.valid('json');
    try {
        const response = await fetch(url);
        const html = await response.text();
        // Basic metadata extraction
        const title = html.match(/<title>(.*?)<\/title>/i)?.[1] || url;
        const description = html.match(/<meta name="description" content="(.*?)"/i)?.[1] || "";
        const logo = html.match(/<link rel="(?:icon|shortcut icon|apple-touch-icon)" href="(.*?)"/i)?.[1];
        let absoluteLogo = logo;
        if (logo && !logo.startsWith('http')) {
            const baseUrl = new URL(url);
            absoluteLogo = `${baseUrl.origin}${logo.startsWith('/') ? '' : '/'}${logo}`;
        }
        // Follow links logic (Simulated for common paths)
        // In a real Worker, we might do another fetch here for /contact or /about
        // Spreadsheet detection
        const isSpreadsheet = url.endsWith('.csv') || url.includes('docs.google.com/spreadsheets') || url.includes('export=csv');
        return c.json({
            success: true,
            data: {
                name: title.split('|')[0].trim(),
                description,
                website_url: url,
                logo_url: absoluteLogo,
                is_spreadsheet: isSpreadsheet,
                type
            }
        });
    }
    catch (err) {
        throw new HTTPException(500, { message: 'Failure to analyze the provided link' });
    }
});
// Unified Import Confirmation
data.post('/import/confirm', zValidator('json', z.object({
    type: z.enum(['transactions', 'providers', 'paychecks']),
    scope: z.enum(['household', 'private']),
    data: z.array(z.object({
        description: z.string(),
        amount: z.number(),
        date: z.string(),
        category: z.string().optional(),
        notes: z.string().optional(),
        owner_id: z.string().optional()
    }))
})), async (c) => {
    const userId = c.get('userId');
    const householdId = c.req.valid('json').scope === 'private' ? `personal-${userId}` : c.get('householdId');
    const { type, data: items } = c.req.valid('json');
    if (type === 'transactions') {
        const queries = items.map(item => {
            const id = crypto.randomUUID();
            return c.env.DB.prepare('INSERT INTO transactions (id, household_id, account_id, description, amount_cents, transaction_date, notes, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(id, householdId, 'default-import-account', // Typically set by user in complex flow
            item.description, Math.round(item.amount * 100), item.date, item.notes || null, item.owner_id || null);
        });
        if (queries.length > 0) {
            await c.env.DB.batch(queries);
        }
    }
    await logAudit(c, 'data_center', 'bulk_import', 'IMPORT', null, { type, scope: c.req.valid('json').scope, count: items.length });
    return c.json({ success: true, count: items.length, target: householdId });
});
// Webhooks
data.post('/webhooks/external', async (c) => {
    const payload = await c.req.json();
    console.log('[Connection Update]:', payload);
    return c.json({ received: true });
});
// Service Providers (Moved from interop)
data.get('/providers', async (c) => {
    const userId = c.get('userId');
    const householdId = c.get('householdId');
    const q = c.req.query('q');
    let query = `
    SELECT * FROM service_providers 
    WHERE (visibility = 'public' 
    OR (visibility = 'household' AND household_id = ?)
    OR (visibility = 'private' AND created_by = ?))`;
    if (q) {
        query += ' AND name LIKE ?';
        const { results } = await c.env.DB.prepare(query).bind(householdId, userId, `%${q}%`).all();
        return c.json(results);
    }
    const { results } = await c.env.DB.prepare(query).bind(householdId, userId).all();
    return c.json(results);
});
// History (f.k.a. Reports)
data.get('/history', async (c) => {
    const householdId = c.get('householdId');
    const { results } = await c.env.DB.prepare('SELECT id, type, period_start, period_end, created_at FROM reports WHERE household_id = ? ORDER BY created_at DESC').bind(householdId).all();
    return c.json(results);
});
data.post('/history/lock', async (c) => {
    const householdId = c.get('householdId');
    const { type } = await c.req.json();
    const id = crypto.randomUUID();
    await c.env.DB.prepare('INSERT INTO reports (id, household_id, type) VALUES (?, ?, ?)')
        .bind(id, householdId, type).run();
    return c.json({ success: true, id });
});
// Developer tools
data.post('/tools/tokens', zValidator('json', z.object({ name: z.string().min(1).max(50) })), async (c) => {
    const householdId = c.get('householdId');
    const { name } = c.req.valid('json');
    const tokenValue = crypto.randomUUID().replace(/-/g, '');
    const id = `ledger_${tokenValue}`;
    await c.env.DB.prepare('INSERT INTO personal_access_tokens (id, household_id, name) VALUES (?, ?, ?)')
        .bind(id, householdId, name).run();
    return c.json({ token: id });
});
data.get('/tools/tokens', async (c) => {
    const householdId = c.get('householdId');
    const { results } = await c.env.DB.prepare('SELECT id, name, created_at FROM personal_access_tokens WHERE household_id = ?')
        .bind(householdId).all();
    return c.json(results);
});
export default data;
