import { Hono } from 'hono'
import { Bindings, Variables } from '../types'
import auditRoutes from './admin/audit'
import userRoutes from './admin/users'
import systemRoutes from './admin/system'
import billingRoutes from './admin/billing'
import householdRoutes from './admin/households'
import communicationRoutes from './admin/communications'
import entityRoutes from './admin/entity-manager'
import webauthnRoutes from './admin/webauthn'
import demoRoutes from './admin/demo'
import { getDb } from '#/index'
import { users, households, systemRegistry, transactions } from '#/schema'
import { count, sql, or, ilike, desc, eq } from 'drizzle-orm'
import { CURRENT_VERSION } from '@shared/constants'

const admin = new Hono<{ Bindings: Bindings, Variables: Variables }>()

// Sub-routers
admin.route('/audit', auditRoutes)
admin.route('/users', userRoutes)
admin.route('/system', systemRoutes)
admin.route('/billing', billingRoutes)
admin.route('/households', householdRoutes)
admin.route('/communications', communicationRoutes)
admin.route('/entity-manager', entityRoutes)
admin.route('/webauthn', webauthnRoutes)
admin.route('/demo', demoRoutes)

// Dashboard Stats
admin.get('/stats', async (c) => {
  const db = getDb(c.env)
  const userCount = (await db.select({ count: count() }).from(users).then(res => res[0].count) as any)
  const activeToday = (await db.select({ count: count() }).from(users).where(sql`cast(last_active_at as timestamp) > now() - interval '1 day'`).then(res => res[0].count) as any)
  const householdCount = (await db.select({ count: count() }).from(households).then(res => res[0].count) as any)
  
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
admin.get('/search/global', async (c) => {
  const q = c.req.query('q') || ''
  if (q.length < 2) return c.json({ success: true, data: { users: [], registry: [], transactions: [] } })
  const db = getDb(c.env)

  const usersRes = (await db.select({
      id: users.id,
      email: users.email,
      displayName: users.displayName
    }).from(users).where(or(ilike(users.email, `%${q}%`), ilike(users.displayName, `%${q}%`))).limit(10) as any)

  const registryRes = (await db.select({
      id: systemRegistry.id,
      name: systemRegistry.name,
      itemType: systemRegistry.itemType
    }).from(systemRegistry).where(ilike(systemRegistry.name, `%${q}%`)).limit(10) as any)

  const transactionsRes = (await db.select({
      id: transactions.id,
      description: transactions.description,
      amountCents: transactions.amountCents,
      transactionDate: transactions.transactionDate,
      reconciliationStatus: transactions.reconciliationStatus,
      householdName: households.name
    })
    .from(transactions)
    .innerJoin(households, eq(transactions.householdId, households.id))
    .where(or(
      ilike(transactions.description, `%${q}%`),
      ilike(transactions.id, `%${q}%`)
    ))
    .limit(10) as any)

  return c.json({ success: true, data: { users: usersRes, registry: registryRes, transactions: transactionsRes } })
})

export default admin
