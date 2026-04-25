import { Context } from 'hono'
import { Bindings, Variables } from '../types'
import { getDb } from '#/index'
import { webhooks, webhookDeliveryLogs } from '#/schema'
import { eq, and } from 'drizzle-orm'
import { decrypt } from '../utils'

export const isValidWebhookUrl = (url: string) => {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return false
    const hostname = parsed.hostname.toLowerCase()
    
    // FORENSIC HARDENING: Comprehensive SSRF blocklist
    const blacklist = [
      'localhost', '127.0.0.1', '0.0.0.0', '::1', 
      'metadata.google.internal', '169.254.169.254',
      'internal', 'nodes', 'vault', 'worker', 'd1'
    ]
    if (blacklist.some(h => hostname.includes(h))) return false
    
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
      const decSecret = await decrypt(hook.secret as string, c.env.ENCRYPTION_KEY || c.env.JWT_SECRET)
      const finalSecret = decSecret === 'DECRYPTION_FAILED' ? hook.secret : decSecret

      const deliveryId = crypto.randomUUID()
      const payload = {
        id: crypto.randomUUID(),
        event,
        timestamp: new Date().toISOString(),
        data
      }
      const bodyStr = JSON.stringify(payload)

      // FORENSIC HARDENING: Generate HMAC-SHA256 signature instead of sending raw secret
      const encoder = new TextEncoder()
      const key = await crypto.subtle.importKey(
        'raw', encoder.encode(finalSecret as string), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
      )
      const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(bodyStr))
      const sigHex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('')

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
            'X-Ledger-Signature': sigHex,
            'X-Ledger-Event': event
          },
          body: bodyStr
        }).then(async (res) => {
          await db.update(webhookDeliveryLogs).set({ statusCode: res.status }).where(eq(webhookDeliveryLogs.id, deliveryId))
        }).catch(async (err) => {
          await db.update(webhookDeliveryLogs).set({ error: err.message }).where(eq(webhookDeliveryLogs.id, deliveryId))
        })
      )
    }
  }
}

