import { Context } from 'hono';
import { getDb } from '#/index';
import { activityLogs } from '#/schema';

/**
 * Security Utility - Forensic Audit Utility (Zero-Latency)
 * Consolidated Activity Logging for the Ledger platform.
 */
export const logAudit = (
  c: Context<any>, 
  targetType: string, 
  targetId: string | number | undefined | null, 
  action: string, 
  oldValues: any = {}, 
  newValues: any = {}, 
  metadata: any = {},
  isAdmin: boolean = false
) => {
  const performAudit = async () => {
    try {
      if (!c.env?.DB) return;
      
      const db = getDb(c.env);
      const actorId = c.var?.userId || c.get('userId') || 'system';
      const householdId = c.get('householdId');
      const impersonatorId = c.get('impersonatorId');
      
      const connectingIp = c.req.header('cf-connecting-ip') || 
                        c.req.header('x-forwarded-for') || 
                        c.req.header('x-real-ip') ||
                        '0.0.0.0';
      const userAgent = c.req.header('user-agent') || 'Unknown-UA';
      const cfRay = c.req.header('cf-ray') || 'Unknown-Ray';
      const cfIpCountry = c.req.header('cf-ipcountry') || 'Unknown';

      const finalDetails = {
        ...(metadata || {}),
        path: c.req.path,
        method: c.req.method,
        cfRay,
        cfIpCountry,
        impersonatorId
      };

      await db.insert(activityLogs).values({
        householdId,
        actorId,
        actorType: isAdmin ? 'ADMIN' : (actorId === 'system' ? 'SYSTEM' : 'USER'),
        action: action.toUpperCase(),
        severity: action.includes('CRITICAL') || action.includes('ADMIN') || action.includes('DELETE') ? 'CRITICAL' : 'INFO',
        targetType,
        targetId: targetId ? String(targetId) : null,
        detailsJson: JSON.stringify(finalDetails),
        oldValuesJson: JSON.stringify(oldValues || {}),
        newValuesJson: JSON.stringify(newValues || {}),
        ipAddress: connectingIp,
        userAgent,
        cfRay
      });

      // HUMAN-FIRST TERMINOLOGY: Use plain English for logs
      const plainAction = action.toLowerCase().replace(/_/g, ' ');
      console.log(`[SENTINEL] ${isAdmin ? 'Administrator' : 'User'} ${actorId} performed ${plainAction} on ${targetType} ${targetId || ''}`);
    } catch (error) {
      console.error('[FLEET_SECURITY_ERROR] Failed to record activity log:', error);
    }
  };

  if (c.executionCtx && c.executionCtx.waitUntil) {
    c.executionCtx.waitUntil(performAudit());
  } else {
    performAudit();
  }
};
