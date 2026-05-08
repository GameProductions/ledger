import { Context } from 'hono';
import { getDb } from '#/index';
import { activityLogs } from '#/schema';

/**
 * Security Utility - Forensic Audit Utility (Zero-Latency)
 * Consolidated Activity Logging for the Ledger platform.
 */
const SENSITIVE_KEYS = [
  'password', 'passwordHash', 'token', 'accessToken', 'refreshToken', 
  'secret', 'key', 'webhookUrl', 'discordWebhookUrl', 'totpSecret',
  'email', 'phone', 'ssn', 'creditCard'
];

/**
 * Recursively redacts sensitive keys from an object or array.
 */
function redactSensitiveData(data: any): any {
  if (!data || typeof data !== 'object') return data;
  
  if (Array.isArray(data)) {
    return data.map(item => redactSensitiveData(item));
  }

  const redacted: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.some(k => key.toLowerCase().includes(k.toLowerCase()))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      redacted[key] = redactSensitiveData(value);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

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

      // Hardened Data Redaction
      const safeOldValues = redactSensitiveData(oldValues);
      const safeNewValues = redactSensitiveData(newValues);

      await db.insert(activityLogs).values({
        householdId,
        actorId,
        actorType: isAdmin ? 'ADMIN' : (actorId === 'system' ? 'SYSTEM' : 'USER'),
        action: action.toUpperCase(),
        severity: action.includes('CRITICAL') || action.includes('ADMIN') || action.includes('DELETE') ? 'CRITICAL' : 'INFO',
        targetType,
        targetId: targetId ? String(targetId) : null,
        detailsJson: JSON.stringify(finalDetails),
        oldValuesJson: JSON.stringify(safeOldValues || {}),
        newValuesJson: JSON.stringify(safeNewValues || {}),
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
