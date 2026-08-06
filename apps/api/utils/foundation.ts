import type { Context } from 'hono';

/**
 * 🔒 Fleet Security Utility: Foundation Offload (v6.2)
 * Standardized mechanism to offload sensitive records to the Foundation
 * fleet-wide Deletion Queue.
 *
 * @param c Hono context (provides env bindings)
 * @param source originating fleet system (e.g. 'food', 'globot')
 * @param category classification of the retired record (e.g. 'legacy_passkey')
 * @param recordId original ID in the source system
 * @param plaintext data to be held securely before deletion
 * @param actorId initiator of the offload (default 'system')
 * @param retentionDays retention window before automatic purge (default 30)
 * @returns {Promise<boolean>} true when the record was accepted
 */
export async function offloadToFoundation(
  c: Context<any>,
  sourceSystem: string,
  category: string,
  recordId: string,
  plaintext: string,
  actorId: string = 'system',
  retentionDays: number = 30
) {
  const foundationUrl = c.env.FOUNDATION_URL || (c.env.ENVIRONMENT === 'production' ? 'https://foundation.gpnet.dev' : 'http://localhost:8787');
  const url = `${foundationUrl}/api/admin/security/deletion-queue`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Token': c.env.SHARED_SERVICE_SECRET
      },
      body: JSON.stringify({
        sourceSystem,
        category,
        recordId,
        plaintext,
        actorId,
        retentionDays
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[FOUNDATION_OFFLOAD_FAILED] ${response.status}: ${errorText}`);
      return false;
    }

    return true;
  } catch (e) {
    console.error(`[FOUNDATION_OFFLOAD_ERROR] Failed to offload ${category} for ${recordId}:`, e);
    return false;
  }
}