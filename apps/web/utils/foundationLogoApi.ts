/**
 * 🎨 Foundation Logo API Client (Issue #16)
 * Queries Foundation's Central Logo Search Gateway with automatic fallbacks and caching.
 */

import { FoundationLogoSearchResponse, FoundationLogoSearchResult } from '../types/foundationLogo';

const FOUNDATION_API_URL = typeof window !== 'undefined' && window.location.hostname.includes('localhost')
  ? 'http://localhost:8787'
  : 'https://foundation.gpnet.dev';

export async function searchFoundationLogos(
  query: string,
  options?: {
    allowNsfw?: boolean;
    preferredFormat?: 'png' | 'svg' | 'webp' | 'ico';
    preferredTheme?: 'light' | 'dark' | 'auto';
  }
): Promise<FoundationLogoSearchResult[]> {
  if (!query || !query.trim()) return [];

  try {
    const res = await fetch(`${FOUNDATION_API_URL}/api/foundation/v1/logo/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Foundation-Project-ID': 'ledger',
      },
      body: JSON.stringify({
        query: query.trim(),
        allowNsfw: options?.allowNsfw ?? true,
        preferredFormat: options?.preferredFormat,
        preferredTheme: options?.preferredTheme,
      }),
    });

    if (!res.ok) {
      console.warn('[FoundationLogoApi] Search returned status:', res.status);
      return [];
    }

    const data: FoundationLogoSearchResponse = await res.json();
    if (data.success && Array.isArray(data.results)) {
      return data.results;
    }
    return [];
  } catch (err) {
    console.error('[FoundationLogoApi] Error searching logos:', err);
    return [];
  }
}
