/**
 * 🎨 Foundation Logo Search Gateway TypeScript Definitions (Issue #16)
 */

export interface FoundationLogoSearchResult {
  url: string;
  source: 'logo_dev' | 'brandfetch' | 'geticon' | 'favicon_kit' | 'google' | 'direct_scraper';
  type: 'icon' | 'symbol' | 'brandmark' | 'dark' | 'light' | 'touch_icon' | 'manifest_icon';
  format: 'png' | 'svg' | 'webp' | 'ico';
  size: { width: number; height: number };
  isRetina: boolean;
  isVector: boolean;
  isNsfw?: boolean;
  theme: 'light' | 'dark' | 'auto';
  confidence: number;
  brandColors?: string[];
  label?: string;
}

export interface FoundationBrandProfileResult {
  domain: string;
  name: string;
  description?: string;
  colors: string[];
  logos: FoundationLogoSearchResult[];
  isNsfw?: boolean;
  socialLinks?: Record<string, string>;
}

export interface FoundationLogoSearchResponse {
  success: boolean;
  results: FoundationLogoSearchResult[];
  metadata?: {
    query: string;
    sourcesQueried: number;
    totalResults: number;
    deduplicated: boolean;
    cached: boolean;
  };
  error?: string;
}
