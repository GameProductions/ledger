/**
 * Security Utility (Stable)
 * 🏺 Enforcing safe boundaries for external data.
 */

/**
 * Sanitizes a URL for use in sensitive DOM attributes like <img src>.
 * Prevents javascript: protocols and other injection vectors.
 */
export const sanitizeImageUrl = (url: string | undefined): string | undefined => {
  if (!url) return undefined;

  const trimmed = url.trim();

  // 1. Allow relative paths starting with /
  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  // 2. Allow specific safe data types (images only)
  if (trimmed.startsWith('data:image/')) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    
    // 3. Whitelist safe protocols
    const safeProtocols = ['http:', 'https:'];
    if (safeProtocols.includes(parsed.protocol)) {
      // Further safety: ensure no quotes or other delimiters that might break out of an attribute
      // Although React escapes these, being explicit helps static analyzers.
      return trimmed.replace(/[<>"'\s]/g, '');
    }
  } catch (e) {
    // If it's not a valid URL (and not relative/data), ignore it
    return undefined;
  }

  return undefined;
};
