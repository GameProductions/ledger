import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { Bindings, Variables } from '../../types'
import { BillingProcessorSchema, ProviderSchema } from '@shared/schemas'
import { getDb } from '#/index'
import { billingProcessors, serviceProviders } from '#/schema'
import { eq, count, sql } from 'drizzle-orm'
import { logAudit } from '../../utils'
import { HTTPException } from 'hono/http-exception'

const billing = new Hono<{ Bindings: Bindings, Variables: Variables }>()

billing.get('/networks', async (c) => {
  const db = getDb(c.env)
  const results = (await db.select().from(billingProcessors).orderBy(billingProcessors.name) as any)
  return c.json({ success: true, data: results || [] })
})

billing.post('/networks', zValidator('json', BillingProcessorSchema), async (c) => {
  const data = (c.req.valid('json') as any)
  const id = crypto.randomUUID()
  const db = getDb(c.env)
  await db.insert(billingProcessors).values({ id, ...data })
  await logAudit(c, 'billing_processors', id, 'ADMIN_CREATE', null, data, {}, true)
  return c.json({ success: true, id })
})

billing.get('/providers', async (c) => {
  const db = getDb(c.env)
  const results = (await db.select().from(serviceProviders).orderBy(serviceProviders.name) as any)
  return c.json({ success: true, data: results || [] })
})

export default billing
