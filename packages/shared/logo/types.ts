/**
 * 🎨 Universal Fleet-Wide Logo Search Gateway Types
 * (Part of @shared/logo in GameProductions Foundation)
 */

export interface LogoSearchResult {
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

export interface BrandProfileResult {
  domain: string;
  name: string;
  description?: string;
  colors: string[];
  logos: LogoSearchResult[];
  isNsfw?: boolean;
  socialLinks?: Record<string, string>;
}

export interface LogoSearchResponse {
  success: boolean;
  results: LogoSearchResult[];
  metadata?: {
    query: string;
    sourcesQueried: number;
    totalResults: number;
    deduplicated: boolean;
    cached: boolean;
  };
  error?: string;
}
