import { Context } from 'hono';

/**
 * Foundation Connectivity Utility (v6.1)
 * Standardized interface for offloading sensitive records to the central vault.
 */
export async function offloadToFoundation(
  c: Context<any>, 
  source: string, 
  category: string, 
  recordId: string, 
  plaintext: string
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
        sourceSystem: source,
        category,
        recordId,
        plaintext,
        actorId: 'system-migration'
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
