import { Hono } from 'hono'
import { Bindings, Variables } from '../types'
import auditRoutes from './admin/audit'
import userRoutes from './admin/users'
import systemRoutes from './admin/system'
import billingRoutes from './admin/billing'
import householdRoutes from './admin/households'
import communicationRoutes from './admin/communications'
import entityRoutes from './admin/entities'
import webauthnRoutes from './admin/webauthn'
import { getDb } from '#/index'
import { users, households, systemRegistry } from '#/schema'
import { count, sql, or, like, desc } from 'drizzle-orm'
import { CURRENT_VERSION } from '@shared/constants'

const admin = new Hono<{ Bindings: Bindings, Variables: Variables }>()

// Sub-routers
admin.route('/audit', auditRoutes)
admin.route('/users', userRoutes)
admin.route('/system', systemRoutes)
admin.route('/billing', billingRoutes)
admin.route('/households', householdRoutes)
admin.route('/communications', communicationRoutes)
admin.route('/entities', entityRoutes)
admin.route('/webauthn', webauthnRoutes)

// Dashboard Stats
admin.get('/stats', async (c) => {
  const db = getDb(c.env)
  const userCount = await db.select({ count: count() }).from(users).then(res => res[0].count)
  const activeToday = await db.select({ count: count() }).from(users).where(sql`last_active_at > date("now", "-1 day")`).then(res => res[0].count)
  const householdCount = await db.select({ count: count() }).from(households).then(res => res[0].count)
  
  return c.json({
    success: true,
    data: {
      totalUsers: userCount || 0,
      activeToday: activeToday || 0,
      totalHouseholds: householdCount || 0,
      version: CURRENT_VERSION
    }
  })
})

// Global Search
admin.get('/search', async (c) => {
  const q = c.req.query('q') || ''
  if (q.length < 2) return c.json({ success: true, data: { users: [], registry: [] } })
  const db = getDb(c.env)

  const usersRes = await db.select({
    id: users.id,
    email: users.email,
    displayName: users.displayName
  }).from(users).where(or(like(users.email, `%${q}%`), like(users.displayName, `%${q}%`))).limit(10)

  const registryRes = await db.select({
    id: systemRegistry.id,
    name: systemRegistry.name,
    itemType: systemRegistry.itemType
  }).from(systemRegistry).where(like(systemRegistry.name, `%${q}%`)).limit(10)

  return c.json({ success: true, data: { users: usersRes, registry: registryRes } })
})

export default admin
