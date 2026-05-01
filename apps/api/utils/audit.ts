import { Context } from 'hono';
import { getDb } from '#/index';
import { auditLogs, adminAuditLogs } from '#/schema';

/**
 * Security Utility - Forensic Audit Utility (Zero-Latency)
 * Best-of-Breed Standardized for the GameProductions fleet.
 * Supports both standard and administrative audit trails.
 */
export const logAudit = (
  c: Context<any>, 
  targetType: string, 
  recordId: string | number | undefined | null, 
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
      const householdId = c.get('householdId') || 'ledger-main-001';
      const impersonatorId = c.get('impersonatorId');
      
      // Tier 1 Telemetry Extraction
      const connectingIp = c.req.header('cf-connecting-ip') || 
                        c.req.header('x-forwarded-for') || 
                        c.req.header('x-real-ip') ||
                        '0.0.0.0';
      const pseudoIp = c.req.header('cf-pseudo-ipv4');
      const userAgent = c.req.header('user-agent') || 'Unknown-UA';
      const cfRay = c.req.header('cf-ray') || 'Unknown-Ray';
      const cfIpCountry = c.req.header('cf-ipcountry') || 'Unknown';

      // [FORENSIC-PARITY] Dual-Stack IP Detection
      const isIPv6 = connectingIp.includes(':');
      const ipV4 = isIPv6 ? (pseudoIp || null) : connectingIp;
      const ipV6 = isIPv6 ? connectingIp : null;

      const finalNewValues = newValues ? { ...newValues } : {};
      if (impersonatorId) {
        (finalNewValues as any).impersonatorId = impersonatorId;
      }

      const table = isAdmin ? adminAuditLogs : auditLogs;

      await db.insert(table).values({
        householdId,
        actorId,
        ipAddress: connectingIp,
        ipV4,
        ipV6,
        userAgent,
        action,
        severity: action.includes('CRITICAL') || action.includes('ADMIN') || action.includes('DELETE') ? 'CRITICAL' : 'INFO',
        targetType,
        recordId: recordId ? String(recordId) : null,
        oldValuesJson: JSON.stringify(oldValues || {}),
        newValuesJson: JSON.stringify(finalNewValues || {}),
        metadataJson: JSON.stringify({
          ...(metadata || {}),
          path: c.req.path,
          method: c.req.method,
          cfRay,
          cfIpCountry,
          pseudoIp
        }),
        cfRay
      } as any);

      console.log(`[TITAN_GUARD] ${isAdmin ? 'ADMIN_' : ''}Audit logged: ${action} on ${targetType}:${recordId} by ${actorId}`);
    } catch (error) {
      console.error('[TITAN_GUARD_ERROR] Failed to record audit log:', error);
    }
  };

  if (c.executionCtx && c.executionCtx.waitUntil) {
    c.executionCtx.waitUntil(performAudit());
  } else {
    performAudit();
  }
};
