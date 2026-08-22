/**
 * Security Utility (Stable)
 * 🏺 Enforcing safe boundaries for external data.
 */

/**
 * Sanitizes a URL for use in sensitive DOM attributes like <img src>.
 * Prevents javascript: protocols and other injection vectors.
 */
export const sanitizeImageUrl = (url: string | null | undefined): string | undefined => {
  if (!url || typeof url !== 'string') return undefined;

  const trimmed = url.trim();
  if (!trimmed) return undefined;

  // 1. Allow relative paths starting with /
  if (trimmed.startsWith('/')) {
    // Only allow alphanumeric, dash, dot, underscore, slash, query params
    if (/^\/[a-zA-Z0-9_\-\.\/\?=&%]+$/.test(trimmed)) {
      return trimmed;
    }
    return undefined;
  }

  // 2. Allow specific safe data types (images only)
  if (/^data:image\/(png|jpeg|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    
    // 3. Whitelist safe protocols
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
  } catch {
    return undefined;
  }

  return undefined;
};

