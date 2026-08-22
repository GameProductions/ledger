import { Hono } from 'hono'
import { Bindings, Variables } from '../types'
import { getDb } from '#/index'
import { activityLogs, users } from '#/schema'
import { desc, count, sql, eq, or } from 'drizzle-orm'

const notifications = new Hono<{ Bindings: Bindings, Variables: Variables }>()

export interface NotificationItem {
  id: string | number
  sourceProject: string
  sourceProjectName: string
  actorId: string
  actorName: string
  action: string
  friendlyAction?: string
  targetType: string
  friendlyTarget?: string
  severity?: 'INFO' | 'WARN' | 'CRITICAL' | string
  reason?: string
  recordId?: string | null
  metadataJson?: string | null
  createdAt: string
}

/**
 * GET /api/notifications
 * Merges local Ledger audit activity with Foundation's centralized Fleet telemetry.
 */
notifications.get('/', async (c) => {
  const limitParam = c.req.query('limit')
  const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 50, 200) : 50
  const householdId = c.get('householdId')
  const foundationUrl = c.env.FOUNDATION_URL || 'https://foundation.gpnet.dev'
  
  let mergedLogs: NotificationItem[] = []

  const user = c.get('user') as any
  const userId = user?.id || c.get('userId')
  const userRole = (user?.globalRole || c.get('role') || 'user').toLowerCase()
  const isOwner = userRole === 'owner'
  const isAdmin = userRole === 'admin' || isOwner

  // 1. Fetch Local Ledger Activity Logs from Neon
  try {
    const db = getDb(c.env)
    const localLogs = await db.select({
      id: activityLogs.id,
      actorId: activityLogs.actorId,
      actorType: activityLogs.actorType,
      action: activityLogs.action,
      severity: activityLogs.severity,
      targetType: activityLogs.targetType,
      targetId: activityLogs.targetId,
      detailsJson: activityLogs.detailsJson,
      createdAt: activityLogs.createdAt,
      actorDisplayName: users.displayName,
      actorUsername: users.username
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.actorId, users.id))
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit * 2)


    for (const log of localLogs) {
      // Authorization Check:
      // - Owners/Admins see all household/system activity logs.
      // - Regular users see only their own actions, general financial updates, announcements, or notifications targeted to them.
      if (!isAdmin && log.actorId !== userId && log.targetType.includes('system') && !log.action.includes('ANNOUNCEMENT')) {
        continue
      }

      let friendlyAction = log.action.replace(/_/g, ' ')
      let friendlyTarget = log.targetType

      if (log.action.includes('TRANSACTION')) {
        friendlyAction = 'Transaction Mutation'
        friendlyTarget = 'Transaction'
      } else if (log.action.includes('BILL')) {
        friendlyAction = 'Bill Tracker Update'
        friendlyTarget = 'Household Bill'
      } else if (log.action.includes('SUBSCRIPTION')) {
        friendlyAction = 'Subscription Update'
        friendlyTarget = 'Subscription Renewal'
      } else if (log.action.includes('AUTH') || log.action.includes('LOGIN') || log.action.includes('PASSKEY')) {
        friendlyAction = 'Security & Session Access'
        friendlyTarget = 'Security Passkey'
      }

      // Format actor as Display Name (@username)
      let resolvedActorName = log.actorType === 'SYSTEM' ? 'Ledger Engine' : 'Household Member'
      if (log.actorDisplayName) {
        if (log.actorUsername && !log.actorDisplayName.toLowerCase().includes(log.actorUsername.toLowerCase())) {
          resolvedActorName = `${log.actorDisplayName} (@${log.actorUsername})`
        } else {
          resolvedActorName = log.actorDisplayName
        }
      } else if (log.actorUsername) {
        resolvedActorName = `@${log.actorUsername}`
      }

      mergedLogs.push({
        id: `local-${log.id}`,
        sourceProject: 'ledger',
        sourceProjectName: 'LEDGER',
        actorId: log.actorId || 'system',
        actorName: resolvedActorName,
        action: log.action,
        friendlyAction,
        targetType: log.targetType,
        friendlyTarget,
        severity: (log.severity?.toUpperCase() as any) || 'INFO',
        metadataJson: log.detailsJson,
        createdAt: log.createdAt ? new Date(log.createdAt).toISOString() : new Date().toISOString()
      })

    }
  } catch (e: any) {
    console.warn('[Notifications] Failed fetching local activity logs:', e.message)
  }

  // 2. Fetch Centralized Fleet Notifications from Foundation Engine
  try {
    const res = await fetch(`${foundationUrl}/api/admin/activity-logs?limit=${limit * 2}`, {
      headers: { 'Accept': 'application/json' }
    })
    if (res.ok) {
      const envelope = await res.json() as any
      if (envelope.success && Array.isArray(envelope.logs)) {
        for (const item of envelope.logs) {
          const source = (item.sourceProject || item.guildId || '').toLowerCase()
          
          // Authorization Check for Fleet Engine Telemetry:
          // - Owners/Admins see all fleet maintenance, security alerts, and system telemetry.
          // - Regular users see user-facing notices, maintenance banners, and ledger-specific updates.
          if (!isAdmin) {
            const isUserPermitted = source === 'ledger' || item.action.includes('MAINTENANCE') || item.action.includes('ANNOUNCEMENT')
            if (!isUserPermitted) continue
          }

          const isLedgerRelevant = source === 'ledger' || item.severity === 'CRITICAL' || item.action.includes('MAINTENANCE') || item.action.includes('SECURITY')

          if (isLedgerRelevant) {
            mergedLogs.push({
              id: `fleet-${item.id}`,
              sourceProject: item.sourceProject || 'foundation',
              sourceProjectName: item.sourceProjectName || 'Foundation',
              actorId: item.actorId,
              actorName: item.actorName || 'Fleet Engine',
              action: item.action,
              friendlyAction: item.friendlyAction || item.action.replace(/_/g, ' '),
              targetType: item.targetType,
              friendlyTarget: item.friendlyTarget || item.targetType,
              severity: item.severity || 'INFO',
              reason: item.reason,
              recordId: item.recordId,
              metadataJson: item.metadataJson,
              createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString()
            })
          }
        }
      }
    }
  } catch (e: any) {
    console.warn('[Notifications] Foundation Fleet fetch unavailable:', e.message)
  }


  // 3. Deduplicate and sort chronologically descending
  const seen = new Set<string>()
  const finalLogs = mergedLogs
    .filter(l => {
      const key = `${l.action}-${l.targetType}-${l.createdAt}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)

  return c.json({
    success: true,
    notifications: finalLogs,
    count: finalLogs.length,
    timestamp: Date.now()
  })
})

export default notifications
