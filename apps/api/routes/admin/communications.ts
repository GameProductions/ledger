import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { Bindings, Variables } from '../../types'
import { getDb } from '#/index'
import { systemAnnouncements, adminInvitations } from '#/schema'
import { eq, desc } from 'drizzle-orm'
import { logAudit, hashToken } from '../../utils'


const communications = new Hono<{ Bindings: Bindings, Variables: Variables }>()

// Announcements
communications.get('/announcements', async (c) => {
  const db = getDb(c.env)
  const results = (await db.select().from(systemAnnouncements).orderBy(desc(systemAnnouncements.createdAt)) as any)
  return c.json({ success: true, data: results || [] })
})

communications.post('/announcements', zValidator('json', z.object({
  title: z.string().min(1),
  contentMd: z.string().min(1),
  priority: z.enum(['info', 'warning', 'critical']).default('info')
})), async (c) => {
  const data = (c.req.valid('json') as any)
  const db = getDb(c.env)
  const id = crypto.randomUUID()
  
  await db.insert(systemAnnouncements).values({
    id,
    ...data,
    isActive: true,
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
  const results = (await db.select().from(adminInvitations).orderBy(desc(adminInvitations.createdAt)) as any)
  return c.json({ success: true, data: results || [] })
})

communications.post('/invitations', zValidator('json', z.object({
  role: z.enum(['owner', 'operator']),
  expires_in_hours: z.number().default(24)
})), async (c) => {
  const { role, expires_in_hours } = c.req.valid('json')
  const db = getDb(c.env)
  const token = crypto.randomUUID()
  const tokenHash = await hashToken(token)
  const expiresAt = new Date(Date.now() + expires_in_hours * 60 * 60 * 1000).toISOString()
  
  await db.insert(adminInvitations).values({
    id: crypto.randomUUID(),
    tokenHash,
    role,
    expiresAt
  })
  
  await logAudit(c, 'invitations', tokenHash, 'ADMIN_INVITE_GENERATE', null, { role, expiresAt }, {}, true)
  return c.json({ success: true, token })
})

communications.delete('/invitations/:token', async (c) => {
  const token = c.req.param('token')
  const db = getDb(c.env)
  const tokenHash = await hashToken(token)
  await db.delete(adminInvitations).where(eq(adminInvitations.tokenHash, tokenHash))
  await logAudit(c, 'invitations', tokenHash, 'ADMIN_INVITE_REVOKE', null, null, {}, true)
  return c.json({ success: true })
})

export default communications
