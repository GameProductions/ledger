import { Context } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { auditLogs } from '#/schema';

/**
 * Security Utility - Forensic Audit Utility (Zero-Latency)
 * Best-of-Breed Standardized for the GameProductions fleet.
 */
export const logAudit = (
  c: Context<any>, 
  targetType: string, 
  recordId: string | number | undefined | null, 
  action: string, 
  oldValues: any = {}, 
  newValues: any = {}, 
  metadata: any = {}
) => {
  const performAudit = async () => {
    try {
      if (!c.env?.DB) return;
      
      const db = drizzle(c.env.DB);
      const user = c.var?.user;
      const actorId = user?.id || c.get('userId') || c.get('user_id') || 'unauthenticated';
      
      // Tier 1 Telemetry Extraction
      const ipAddress = c.req.header('cf-connecting-ip') || 
                        c.req.header('x-forwarded-for') || 
                        '0.0.0.0';
      const userAgent = c.req.header('user-agent') || 'Unknown-UA';
      const cfRay = c.req.header('cf-ray') || 'Unknown-Ray';
      const cfIpCountry = c.req.header('cf-ipcountry') || 'Unknown';
      const pseudoIp = c.req.header('cf-pseudo-ipv4') || undefined;

      await db.insert(auditLogs).values({
        actorId,
        ipAddress,
        userAgent,
        action,
        severity: action.includes('CRITICAL') || action.includes('ADMIN') || action.includes('DELETE') ? 'CRITICAL' : 'INFO',
        targetType,
        recordId: recordId ? String(recordId) : null,
        oldValuesJson: JSON.stringify(oldValues || {}),
        newValuesJson: JSON.stringify(newValues || {}),
        metadataJson: JSON.stringify({
          ...(metadata || {}),
          path: c.req.path,
          method: c.req.method,
          cfRay,
          cfIpCountry,
          pseudoIp
        }),
        cfRay
      });

      console.log(`[TITAN_GUARD] Audit logged: ${action} on ${targetType}:${recordId} by ${actorId}`)
    } catch (error) {
      console.error('[TITAN_GUARD_ERROR] Failed to record audit log:', error)
    }
  };

  if (c.executionCtx && c.executionCtx.waitUntil) {
    c.executionCtx.waitUntil(performAudit());
  } else {
    performAudit();
  }
};
