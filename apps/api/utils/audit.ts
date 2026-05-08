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
      const actorId = c.var?.userId || c.get('userId') || 'system';
      const householdId = c.get('householdId');
      const impersonatorId = c.get('impersonatorId');
      
      const ipAddress = c.req.header('cf-connecting-ip') || 
                        c.req.header('x-forwarded-for') || 
                        c.req.header('x-real-ip') ||
                        '0.0.0.0';
      const userAgent = c.req.header('user-agent') || 'Unknown-UA';
      const cfRay = c.req.header('cf-ray') || 'Unknown-Ray';
      const cfIpCountry = c.req.header('cf-ipcountry') || 'Unknown';

      // Redact PII before logging
      const safeOldValues = redactSensitiveData(oldValues || {});
      const safeNewValues = redactSensitiveData(newValues || {});
      const safeMeta = redactSensitiveData({
        ...(metadata || {}),
        path: c.req.path,
        method: c.req.method,
        cfRay,
        cfIpCountry,
        impersonatorId,
        householdId,
        actorType: isAdmin ? 'ADMIN' : (actorId === 'system' ? 'SYSTEM' : 'USER')
      });

      const severity: 'INFO' | 'WARN' | 'CRITICAL' = 
        action.includes('CRITICAL') || action.includes('ADMIN') || action.includes('DELETE') 
          ? 'CRITICAL' : 'INFO';

      const message = {
        source: 'ledger',
        actorId,
        ipAddress,
        userAgent,
        action: action.toUpperCase(),
        severity,
        targetType,
        recordId: targetId ? String(targetId) : null,
        oldValuesJson: JSON.stringify(safeOldValues),
        newValuesJson: JSON.stringify(safeNewValues),
        metadataJson: JSON.stringify(safeMeta),
        timestamp: Date.now(),
      };

      // 🛰️ Primary: Push to Fleet Activity Queue
      if (c.env?.FLEET_ACTIVITY) {
        await c.env.FLEET_ACTIVITY.send(message);
        return;
      }

      // 🏠 Fallback: Local D1 write
      if (!c.env?.DB) return;
      const db = getDb(c.env);
      await db.insert(activityLogs).values({
        householdId,
        actorId,
        actorType: isAdmin ? 'ADMIN' : (actorId === 'system' ? 'SYSTEM' : 'USER'),
        action: message.action,
        severity: message.severity,
        targetType,
        targetId: message.recordId,
        detailsJson: message.metadataJson,
        oldValuesJson: message.oldValuesJson,
        newValuesJson: message.newValuesJson,
        ipAddress,
        userAgent,
        cfRay
      }).catch(e => console.error('[AUDIT_FAILURE]', e));

      console.log(`[SENTINEL] Audit logged (local fallback): ${action} on ${targetType} ${targetId || ''}`);
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
