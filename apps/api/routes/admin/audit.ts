import { Hono } from 'hono'
import { Bindings, Variables } from '../../types'
import { getDb } from '#/index'
import { activityLogs, users } from '#/schema'
import { eq, desc, count, sql } from 'drizzle-orm'

const audit = new Hono<{ Bindings: Bindings, Variables: Variables }>()

audit.get('/', async (c) => {
  const db = getDb(c.env)
  const results = await db.select({
    id: activityLogs.id,
    actorId: activityLogs.actorId,
    actorType: activityLogs.actorType,
    action: activityLogs.action,
    severity: activityLogs.severity,
    targetType: activityLogs.targetType,
    targetId: activityLogs.targetId,
    detailsJson: activityLogs.detailsJson,
    createdAt: activityLogs.createdAt,
    actorName: users.displayName
  })
  .from(activityLogs)
  .leftJoin(users, eq(activityLogs.actorId, users.id))
  .orderBy(desc(activityLogs.createdAt))
  .limit(200)

  return c.json({ success: true, data: results || [] })
})

audit.get('/stats', async (c) => {
  const db = getDb(c.env)
  const stats = await db.select({
    severity: activityLogs.severity,
    count: count()
  })
  .from(activityLogs)
  .groupBy(activityLogs.severity)

  return c.json({ success: true, data: stats })
})

audit.get('/system', async (c) => {
  const db = getDb(c.env)
  const results = await db.select({
    id: activityLogs.id,
    action: activityLogs.action,
    targetType: activityLogs.targetType,
    targetId: activityLogs.targetId,
    createdAt: activityLogs.createdAt,
    target: activityLogs.targetType
  })
  .from(activityLogs)
  .where(sql`target_type IN ('system', 'system_config', 'system_feature_flags')`)
  .orderBy(desc(activityLogs.createdAt))
  .limit(50)

  return c.json({ success: true, data: results || [] })
})

export default audit
