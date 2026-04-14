import { MiddlewareHandler } from 'hono';

/**
 * 🛡️ Titan Guard v2.0 (Adaptive Collective Defense)
 * Unified rate-limiting middleware for the GameProductions fleet.
 * Uses shared KV (TITAN_GUARD_CACHE) for global IP reputation and 1-click unblock support.
 */

export type RateLimitTier = 'API' | 'AUTH' | 'STRICT';

const DEFAULT_POLICIES: Record<RateLimitTier, { limit: number; window: number }> = {
  API: { limit: 100, window: 60 },        // 100 req / 60s
  AUTH: { limit: 10, window: 600 },      // 10 req / 10m
  STRICT: { limit: 3, window: 1800 }     // 3 req / 30m
};

export const ipRateLimit = (tier: RateLimitTier = 'API'): MiddlewareHandler => {
  return async (c, next) => {
    const kv = (c.env as any).TITAN_GUARD_CACHE;
    if (!kv) {
      console.warn(`[Titan Guard] TITAN_GUARD_CACHE binding missing. Falling back to passthrough.`);
      return await next();
    }

    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1';
    const botName = (c.env as any).APP_NAME || 'unknown';
    
    // 1. Fetch Active Policy (Global -> Bot Specific)
    const globalConfig = await kv.get(`tg:config:${tier}`, 'json') as any;
    const botConfig = await kv.get(`tg:config:${botName}:${tier}`, 'json') as any;
    
    const policy = botConfig || globalConfig || DEFAULT_POLICIES[tier];
    const { limit, window } = policy;

    // 2. Perform Rate Limit Check
    const key = `tg:bot:${botName}:rl:${tier}:${ip}`;
    const current = await kv.get(key, 'json') as { count: number; reset: number } | null;

    if (current) {
      if (Date.now() > current.reset) {
        // Reset expired
        await kv.put(key, JSON.stringify({ count: 1, reset: Date.now() + (window * 1000) }), { expirationTtl: window + 60 });
      } else if (current.count >= limit) {
        // 🚨 BLOCK TRIGGERED
        console.error(`[Titan Guard] 🛑 Rate limit exceeded for ${ip} on ${botName} (${tier})`);
        
        // Log block for Foundation Monitoring
        await kv.put(`tg:block:${ip}`, JSON.stringify({
          bot: botName,
          tier,
          triggered: Date.now(),
          limit,
          window
        }), { expirationTtl: 3600 }); // Retain for 1 hour for dashboard visibility

        return c.json({ 
          error: 'Shield Active', 
          message: 'Security threshold exceeded. Please try again later.',
          security_v: 'Titan Guard v6.1'
        }, 429);
      } else {
        // Increment
        await kv.put(key, JSON.stringify({ count: current.count + 1, reset: current.reset }), { expirationTtl: Math.ceil((current.reset - Date.now()) / 1000) + 60 });
      }
    } else {
      // First strike
      await kv.put(key, JSON.stringify({ count: 1, reset: Date.now() + (window * 1000) }), { expirationTtl: window + 60 });
    }

    await next();
  };
};
