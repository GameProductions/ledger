import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { Bindings, Variables } from '../../types'
import { getDb } from '#/index'
import { systemAnnouncements, adminInvitations } from '#/schema'
import { eq, desc, sql } from 'drizzle-orm'
import { logAudit } from '../../utils'
import { HTTPException } from 'hono/http-exception'

const communications = new Hono<{ Bindings: Bindings, Variables: Variables }>()

// Announcements
communications.get('/announcements', async (c) => {
  const db = getDb(c.env)
  const results = await db.select().from(systemAnnouncements).orderBy(desc(systemAnnouncements.createdAt))
  return c.json({ success: true, data: results || [] })
})

communications.post('/announcements', zValidator('json', z.object({
  title: z.string().min(1),
  contentMd: z.string().min(1),
  priority: z.enum(['info', 'warning', 'critical']).default('info')
})), async (c) => {
  const data = c.req.valid('json')
  const db = getDb(c.env)
  const id = crypto.randomUUID()
  
  await db.insert(systemAnnouncements).values({
    id,
    ...data,
    isActive: 1,
    authorId: (c.get('user') as any).id
  })
  
  await logAudit(c, 'announcements', id, 'ADMIN_BROADCAST', null, data, {}, true)
  return c.json({ success: true, id })
})

communications.delete('/announcements/:id', async (c) => {
  const id = c.req.param('id')
  const db = getDb(c.env)
  await db.delete(systemAnnouncements).where(eq(systemAnnouncements.id, id))
  await logAudit(c, 'announcements', id, 'ADMIN_DELETE', null, null, {}, true)
  return c.json({ success: true })
})

// Invitations
communications.get('/invitations', async (c) => {
  const db = getDb(c.env)
  const results = await db.select().from(adminInvitations).orderBy(desc(adminInvitations.createdAt))
  return c.json({ success: true, data: results || [] })
})

communications.post('/invitations', zValidator('json', z.object({
  role: z.enum(['owner', 'operator']),
  expires_in_hours: z.number().default(24)
})), async (c) => {
  const { role, expires_in_hours } = c.req.valid('json')
  const db = getDb(c.env)
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + expires_in_hours * 60 * 60 * 1000).toISOString()
  
  await db.insert(adminInvitations).values({
    token,
    role,
    expiresAt,
    createdBy: (c.get('user') as any).id
  })
  
  await logAudit(c, 'invitations', token, 'ADMIN_INVITE_GENERATE', null, { role, expiresAt }, {}, true)
  return c.json({ success: true, token })
})

communications.delete('/invitations/:token', async (c) => {
  const token = c.req.param('token')
  const db = getDb(c.env)
  await db.delete(adminInvitations).where(eq(adminInvitations.token, token))
  await logAudit(c, 'invitations', token, 'ADMIN_INVITE_REVOKE', null, null, {}, true)
  return c.json({ success: true })
})

export default communications
