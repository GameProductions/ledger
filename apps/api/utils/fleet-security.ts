import { Context, Next, MiddlewareHandler } from 'hono';
import { secureHeaders } from 'hono/secure-headers';

/**
 * 🛡️ Security Standard: Security Orchestration
 * Standardizes dynamic nonces and Content Security Policy across the fleet.
 */

/**
 * Generates a cryptographically secure nonce for CSP.
 */
export const generateNonce = () => {
  const nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);
  return btoa(String.fromCharCode(...nonceBytes));
};

/**
 * Returns the standardized fleet-wide Content Security Policy.
 */
export const getStandardCSP = (nonce: string) => {
  return {
    contentSecurityPolicy: {
      frameAncestors: ["'self'", "https://*.gpnet.dev", "http://localhost:*"],
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'", 
        `'nonce-${nonce}'`,
        "https://static.cloudflareinsights.com",
      ],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: [
        "'self'", "data:", "blob:", 
        "https://*.gpnet.dev", "https://*.glosonproductions.com",
        "https://*.discordapp.com", "https://*.discord.com", "https://discord.com", "https://canary.discord.com",
        "https://www.gstatic.com", "https://cdn.simpleicons.org", "https://flaticons.net",
        "https://api.dicebear.com", "https://ui-avatars.com", "https://api.qrserver.com",
        "https://images.unsplash.com", "https://*.giphy.com",
        "https://c.1password.com", "https://cache.agilebits.com", "https://raw.githubusercontent.com"
      ],
      connectSrc: [
        "'self'", "https://*.gpnet.dev", "https://*.glosonproductions.com",
        "https://discord.com", "https://*.discord.com", "https://canary.discord.com",
        "https://cloudflareinsights.com", "https://static.cloudflareinsights.com"
      ],
      upgradeInsecureRequests: [],
    },
    referrerPolicy: 'strict-origin-when-cross-origin' as const,
  };
};

/**
 * Hono Middleware that generates a nonce and applies the standard CSP.
 */
export const fleetSecurity = (): MiddlewareHandler => {
  return async (c, next) => {
    const nonce = generateNonce();
    c.set('cspNonce', nonce);
    
    const headers = getStandardCSP(nonce);
    return secureHeaders(headers)(c, next);
  };
};

/**
 * Injects the CSP nonce into script tags in an HTML response via HTMLRewriter.
 */
export const injectCSPNonce = (response: Response, nonce: string): Response => {
  const contentType = response.headers.get('Content-Type') || '';
  if (!contentType.includes('text/html')) return response;

  return new HTMLRewriter()
    .on('script', {
      element(el) {
        if (!el.getAttribute('nonce')) {
          el.setAttribute('nonce', nonce);
        }
      },
    })
    .transform(response);
};
