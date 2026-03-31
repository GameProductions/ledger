export const isValidWebhookUrl = (url) => {
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:')
            return false;
        const hostname = parsed.hostname.toLowerCase();
        const blacklist = ['localhost', '127.0.0.1', '0.0.0.0', '::1', 'metadata.google.internal', '169.254.169.254'];
        if (blacklist.includes(hostname))
            return false;
        return true;
    }
    catch (e) {
        return false;
    }
};
export const dispatchWebhook = async (c, event, data, householdId) => {
    if (!householdId)
        return;
    const { results: hooks } = await c.env.DB.prepare('SELECT id, url, secret, event_list FROM webhooks WHERE household_id = ? AND is_active = 1').bind(householdId).all();
    for (const hook of hooks) {
        if (!isValidWebhookUrl(hook.url)) {
            console.warn(`[Webhook] Insecure URL blocked: ${hook.url}`);
            continue;
        }
        const events = hook.event_list.split(',');
        if (events.includes('*') || events.includes(event)) {
            const deliveryId = crypto.randomUUID();
            // Log Attempt
            await c.env.DB.prepare('INSERT INTO webhook_delivery_logs (id, webhook_id, event, status_code) VALUES (?, ?, ?, ?)').bind(deliveryId, hook.id, event, 0).run(); // 0 = Attempting
            c.executionCtx.waitUntil(fetch(hook.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Ledger-Signature': hook.secret,
                    'X-Ledger-Event': event
                },
                body: JSON.stringify({
                    id: crypto.randomUUID(),
                    event,
                    timestamp: new Date().toISOString(),
                    data
                })
            }).then(async (res) => {
                await c.env.DB.prepare('UPDATE webhook_delivery_logs SET status_code = ? WHERE id = ?').bind(res.status, deliveryId).run();
            }).catch(async (err) => {
                await c.env.DB.prepare('UPDATE webhook_delivery_logs SET error = ? WHERE id = ?').bind(err.message, deliveryId).run();
            }));
        }
    }
};
