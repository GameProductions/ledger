/**
 * 🎨 Universal Foundation Logo API Client
 * (Reusable across all fleet apps: Ledger, Globot, Groupcord, Butlarr, etc.)
 */

import { LogoSearchResponse, LogoSearchResult, BrandProfileResult } from '../types';

export interface LogoSearchOptions {
  projectId?: string;
  baseUrl?: string;
  allowNsfw?: boolean;
  preferredFormat?: 'png' | 'svg' | 'webp' | 'ico';
  preferredTheme?: 'light' | 'dark' | 'auto';
}

export class FoundationLogoClient {
  private baseUrl: string;
  private defaultProjectId: string;

  constructor(options?: { baseUrl?: string; projectId?: string }) {
    this.baseUrl = options?.baseUrl || (
      typeof window !== 'undefined' && window.location.hostname.includes('localhost')
        ? 'http://localhost:8787'
        : 'https://foundation.gpnet.dev'
    );
    this.defaultProjectId = options?.projectId || 'fleet-app';
  }

  /**
   * Search for logos across multiple sources with fallback scraping and NSFW support
   */
  async search(query: string, options?: LogoSearchOptions): Promise<LogoSearchResult[]> {
    if (!query || !query.trim()) return [];

    const projectId = options?.projectId || this.defaultProjectId;
    const url = `${options?.baseUrl || this.baseUrl}/api/foundation/v1/logo/search`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Foundation-Project-ID': projectId,
        },
        body: JSON.stringify({
          query: query.trim(),
          allowNsfw: options?.allowNsfw ?? true,
          preferredFormat: options?.preferredFormat,
          preferredTheme: options?.preferredTheme,
        }),
      });

      if (!res.ok) {
        console.warn(`[FoundationLogoClient] Search returned status ${res.status}`);
        return [];
      }

      const data: LogoSearchResponse = await res.json();
      if (data.success && Array.isArray(data.results)) {
        return data.results;
      }
      return [];
    } catch (err) {
      console.error('[FoundationLogoClient] Error querying logo gateway:', err);
      return [];
    }
  }

  /**
   * Fetch full brand profile including dominant colors and social links
   */
  async getBrandProfile(domain: string, options?: { projectId?: string }): Promise<BrandProfileResult | null> {
    if (!domain) return null;

    const projectId = options?.projectId || this.defaultProjectId;
    const url = `${this.baseUrl}/api/foundation/v1/logo/brand?domain=${encodeURIComponent(domain)}`;

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Foundation-Project-ID': projectId,
        },
      });

      if (!res.ok) return null;
      const data = await res.json() as any;
      return data.success ? data.profile : null;
    } catch {
      return null;
    }
  }
}

// Global default singleton instance
export const foundationLogoClient = new FoundationLogoClient();
