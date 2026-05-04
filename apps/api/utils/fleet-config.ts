import { MiddlewareHandler } from 'hono';

/**
 * 🛰️ Fleet Configuration Engine
 * Fetches project-specific overrides from Fleet Security KV.
 * Allows Foundation to control feature flags and identity source of truth.
 */
export const fleetConfig = (): MiddlewareHandler => {
  return async (c, next) => {
    const kv = (c.env as any).FLEET_SECURITY_CACHE;
    if (!kv) return await next();

    try {
      const config = await kv.get(`project:config:cash`, 'json') as any;
      if (config) {
        (c as any).set('fleet', config);
        
        // 🚨 Fallback Readiness Check
        // If Foundation is mandated but we're in emergency mode, we set a flag
        if (config.authType === 'foundation' && config.config?.ALLOW_FALLBACK === 'true') {
          // Check if Foundation is actually reachable (with 1s timeout)
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1000);
          
          try {
            const healthRes = await fetch('https://foundation.gpnet.dev/api/health', { 
              signal: controller.signal,
              headers: { 'User-Agent': 'Fleet-Health-Check' }
            });
            clearTimeout(timeoutId);
            if (!healthRes.ok) throw new Error('Foundation Unhealthy');
          } catch (err) {
            console.warn('[Fleet] Foundation unreachable, triggering fallback mode.');
            (c as any).set('fleet_fallback', true);
          }
        }

        // Dynamic maintenance mode check
        if (config.status === 'maintenance' && !c.req.path.startsWith('/admin')) {
          return c.json({ 
            error: 'Maintenance Mode', 
            message: 'Our kitchen is currently being renovated. Please check back later.' 
          }, 503);
        }
      }
    } catch (e) {
      console.error('[Fleet Config] Failed to fetch overrides:', e);
    }

    await next();
  };
};
