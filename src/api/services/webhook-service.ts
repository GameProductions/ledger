import { Context } from 'hono'
import { Bindings, Variables } from '../types'
import { getDb } from '../db'
import { webhooks, webhookDeliveryLogs } from '../db/schema'
import { eq, and } from 'drizzle-orm'

export const isValidWebhookUrl = (url: string) => {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return false
    const hostname = parsed.hostname.toLowerCase()
    const blacklist = ['localhost', '127.0.0.1', '0.0.0.0', '::1', 'metadata.google.internal', '169.254.169.254']
    if (blacklist.includes(hostname)) return false
    return true
  } catch (e) {
    return false
  }
}

export const dispatchWebhook = async (c: Context<{ Bindings: Bindings, Variables: Variables }>, event: string, data: any, householdId: string) => {
  if (!householdId) return

  const db = getDb(c.env)
  const hooks = await db.select({
    id: webhooks.id,
    url: webhooks.url,
    secret: webhooks.secret,
    eventList: webhooks.eventList
  }).from(webhooks).where(and(eq(webhooks.householdId, householdId), eq(webhooks.isActive, true)))

  for (const hook of hooks) {
    if (!isValidWebhookUrl(hook.url as string)) {
      console.warn(`[Webhook] Insecure URL blocked: ${hook.url}`)
      continue
    }

    const events = (hook.eventList as string).split(',')
    if (events.includes('*') || events.includes(event)) {
      const { decrypt } = require('../utils')
      const decSecret = await decrypt(hook.secret as string, c.env.ENCRYPTION_KEY || c.env.JWT_SECRET)
      const finalSecret = decSecret === 'DECRYPTION_FAILED' ? hook.secret : decSecret

      const deliveryId = crypto.randomUUID()
      
      // Log Attempt
      await db.insert(webhookDeliveryLogs).values({
        id: deliveryId,
        webhookId: hook.id,
        event,
        statusCode: 0
      });
      
      c.executionCtx.waitUntil(
        fetch(hook.url as string, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Ledger-Signature': finalSecret as string,
            'X-Ledger-Event': event
          },
          body: JSON.stringify({
            id: crypto.randomUUID(),
            event,
            timestamp: new Date().toISOString(),
            data
          })
        }).then(async (res) => {
          await db.update(webhookDeliveryLogs).set({ statusCode: res.status }).where(eq(webhookDeliveryLogs.id, deliveryId))
        }).catch(async (err) => {
          await db.update(webhookDeliveryLogs).set({ error: err.message }).where(eq(webhookDeliveryLogs.id, deliveryId))
        })
      )
    }
  }
}
