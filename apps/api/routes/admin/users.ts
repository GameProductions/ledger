import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { Bindings, Variables } from '../../types'
import { CreateUserAdminSchema, UpdateUserAdminSchema } from '@shared/schemas'
import { getDb } from '#/index'
import { users, passkeys, userIdentities, userHouseholds, externalConnections, adminInvitations } from '#/schema'
import { eq, desc, count, or, and, sql } from 'drizzle-orm'
import { hashPassword } from '../../auth-utils'
import { EmailService } from '../../services/email.service'
import { logAudit } from '../../utils'
import { HTTPException } from 'hono/http-exception'

const userAdmin = new Hono<{ Bindings: Bindings, Variables: Variables }>()

userAdmin.get('/', async (c) => {
  const db = getDb(c.env)
  const results = (await db.select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      globalRole: users.globalRole,
      status: users.status,
      createdAt: users.createdAt,
      lastActiveAt: users.lastActiveAt
    }).from(users).orderBy(desc(users.createdAt)) as any)
  return c.json({ success: true, data: results || [] })
})

userAdmin.post('/', zValidator('json', CreateUserAdminSchema), async (c) => {
  const data = (c.req.valid('json') as any)
  const { username, email, password, displayName, globalRole, forcePasswordChange } = data
  const db = getDb(c.env)
  
  const existing = (await db.select({ id: users.id }).from(users).where(or(eq(users.username, username), eq(users.email, email))).limit(1).then(res => res[0]) as any)
  if (existing) throw new HTTPException(400, { message: 'Username or email already exists' })
 
  const userId = crypto.randomUUID()
  const passwordHash = (await hashPassword(password) as any)
  
  await db.insert(users).values({
    id: userId,
    username,
    email,
    passwordHash,
    displayName,
    globalRole,
    status: 'active',
    forcePasswordChange: forcePasswordChange ? 1 : 0
  })
  
  await logAudit(c, 'users', userId, 'ADMIN_MANUAL_CREATE', null, { username, email, globalRole }, {}, true)
  
  const emailService = new EmailService(c.env)
  try {
    await emailService.sendSetupEmail(email, username, password)
  } catch (err: any) {
    console.error('[Admin] Failed to send setup email:', err)
  }
 
  return c.json({ success: true, id: userId })
})

userAdmin.get('/:id', async (c) => {
  const userId = c.req.param('id')
  const db = getDb(c.env)
  
  const userFields = (await db.select().from(users).where(eq(users.id, userId)).limit(1).then(res => res[0]) as any)
  if (!userFields) throw new HTTPException(404, { message: 'User not found' })

  const connections = (await db.select().from(externalConnections).where(
      sql`household_id IN (SELECT household_id FROM user_households WHERE user_id = ${userId})`
    ) as any)
  const socialLinks = (await db.select().from(userIdentities).where(eq(userIdentities.userId, userId)) as any)
  const userPasskeys = (await db.select().from(passkeys).where(eq(passkeys.userId, userId)) as any)
  
  return c.json({
    success: true,
    data: {
      profile: userFields,
      connections,
      socialLinks,
      passkeys: userPasskeys
    }
  })
})

userAdmin.patch('/:id', zValidator('json', UpdateUserAdminSchema), async (c) => {
  const userId = c.req.param('id')
  const data = (c.req.valid('json') as any)
  const db = getDb(c.env)
  
  const old = (await db.select().from(users).where(eq(users.id, userId)).limit(1).then(res => res[0]) as any)
  if (!old) throw new HTTPException(404, { message: 'User not found' })

  await db.update(users).set({ ...data }).where(eq(users.id, userId))
  await logAudit(c, 'users', userId, 'ADMIN_UPDATE', old, data, {}, true)
  
  return c.json({ success: true })
})

userAdmin.delete('/:id', async (c) => {
  const userId = c.req.param('id')
  const db = getDb(c.env)
  
  const old = (await db.select().from(users).where(eq(users.id, userId)).limit(1).then(res => res[0]) as any)
  if (!old) throw new HTTPException(404, { message: 'User not found' })

  await db.delete(users).where(eq(users.id, userId))
  await logAudit(c, 'users', userId, 'ADMIN_DELETE', old, null, {}, true)
  
  return c.json({ success: true })
})

userAdmin.post('/:id/password/reset', zValidator('json', z.object({
  new_password: z.string().min(8),
  is_temporary: z.boolean().default(true)
})), async (c) => {
  const userId = c.req.param('id')
  const { new_password, is_temporary } = c.req.valid('json')
  const db = getDb(c.env)
  
  const old = (await db.select().from(users).where(eq(users.id, userId)).limit(1).then(res => res[0]) as any)
  if (!old) throw new HTTPException(404, { message: 'User not found' })

  const passwordHash = (await hashPassword(new_password) as any)
  await db.update(users).set({ 
    passwordHash, 
    forcePasswordChange: is_temporary ? 1 : 0
  }).where(eq(users.id, userId))
  
  await logAudit(c, 'users', userId, 'ADMIN_PASSWORD_RESET', { forcePasswordChange: old.forcePasswordChange }, { forcePasswordChange: is_temporary ? 1 : 0 }, {}, true)
  
  return c.json({ success: true })
})

userAdmin.patch('/:id/passkeys/:passkeyId', zValidator('json', z.object({
  name: z.string()
})), async (c) => {
  const { id, passkeyId } = c.req.param()
  const { name } = c.req.valid('json')
  const db = getDb(c.env)
  
  const pk = (await db.select().from(passkeys).where(and(eq(passkeys.id, passkeyId), eq(passkeys.userId, id))).limit(1).then(res => res[0]) as any)
  if (!pk) throw new HTTPException(404, { message: 'Passkey not found' })

  await db.update(passkeys).set({ name }).where(eq(passkeys.id, passkeyId))
  await logAudit(c, 'passkeys', passkeyId, 'ADMIN_PASSKEY_RENAME', { oldName: pk.name }, { newName: name }, { userId: id }, true)
  
  return c.json({ success: true })
})

userAdmin.delete('/:id/passkeys/:passkeyId', async (c) => {
  const { id, passkeyId } = c.req.param()
  const db = getDb(c.env)
  
  const pk = (await db.select().from(passkeys).where(and(eq(passkeys.id, passkeyId), eq(passkeys.userId, id))).limit(1).then(res => res[0]) as any)
  if (!pk) throw new HTTPException(404, { message: 'Passkey not found' })

  await db.delete(passkeys).where(eq(passkeys.id, passkeyId))
  await logAudit(c, 'passkeys', passkeyId, 'ADMIN_PASSKEY_DELETE', pk, null, { userId: id }, true)
  
  return c.json({ success: true })
})

userAdmin.post('/merge', zValidator('json', z.object({
  sourceId: z.string(),
  targetId: z.string()
})), async (c) => {
  const { sourceId, targetId } = c.req.valid('json')
  const db = getDb(c.env)
  
  // Verify both users exist
  const source = (await db.select().from(users).where(eq(users.id, sourceId)).limit(1).then(res => res[0]) as any)
  const target = (await db.select().from(users).where(eq(users.id, targetId)).limit(1).then(res => res[0]) as any)
  
  if (!source || !target) throw new HTTPException(404, { message: 'One or both users not found' })

  // Perform merge logic (simplified for audit)
  // In a real scenario, we'd move households, transactions, etc.
  // For now, we'll just log it and potentially delete the source
  await db.update(userIdentities).set({ userId: targetId }).where(eq(userIdentities.userId, sourceId))
  await db.update(userHouseholds).set({ userId: targetId }).where(eq(userHouseholds.userId, sourceId))
  
  await logAudit(c, 'users', targetId, 'ADMIN_USER_MERGE', { sourceId }, { targetId }, {}, true)
  
  // Delete source user
  await db.delete(users).where(eq(users.id, sourceId))
  
  return c.json({ success: true })
})

userAdmin.get('/invitations', async (c) => {
  const db = getDb(c.env)
  const results = (await db.select().from(adminInvitations).orderBy(desc(adminInvitations.createdAt)) as any)
  return c.json({ success: true, data: results || [] })
})

export default userAdmin
