import { MiddlewareHandler } from 'hono';

/**
 * Rate Limiting Middleware
 * Unified request management for the application fleet.
 * Uses shared KV for global IP reputation and unblock support.
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
    
    try {
      // 1. Fetch Active Policy (Global -> Bot Specific)
      let globalConfig, botConfig;
      try {
        globalConfig = await kv.get(`tg:config:${tier}`, 'json') as any;
        botConfig = await kv.get(`tg:config:${botName}:${tier}`, 'json') as any;
      } catch (e) {
        console.warn(`[Titan Guard] Failed to fetch config from KV:`, e);
      }
      
      const policy = botConfig || globalConfig || DEFAULT_POLICIES[tier];
      const { limit, window } = policy;

      // 2. Perform Rate Limit Check
      const key = `tg:bot:${botName}:rl:${tier}:${ip}`;
      let current;
      try {
        current = await kv.get(key, 'json') as { count: number; reset: number } | null;
      } catch (e) {
        console.warn(`[Titan Guard] Failed to fetch rate limit state from KV:`, e);
      }

      if (current) {
        if (Date.now() > current.reset) {
          // Reset expired
          try {
            await kv.put(key, JSON.stringify({ count: 1, reset: Date.now() + (window * 1000) }), { expirationTtl: window + 60 });
          } catch (e) {
            console.warn(`[Titan Guard] Failed to reset rate limit in KV:`, e);
          }
        } else if (current.count >= limit) {
          // 🚨 BLOCK TRIGGERED
          console.error(`[Titan Guard] 🛑 Rate limit exceeded for ${ip} on ${botName} (${tier})`);
          
          // Log block for Foundation Monitoring
          try {
            await kv.put(`tg:block:${ip}`, JSON.stringify({
              bot: botName,
              tier,
              triggered: Date.now(),
              limit,
              window
            }), { expirationTtl: 3600 });
          } catch (e) {
            console.warn(`[Titan Guard] Failed to log block in KV:`, e);
          }

          return c.json({ 
            error: 'Please slow down', 
            message: 'You are making too many requests. Please wait a moment and try again.'
          }, 429);
        } else {
          // Increment
          try {
            await kv.put(key, JSON.stringify({ count: current.count + 1, reset: current.reset }), { expirationTtl: Math.ceil((current.reset - Date.now()) / 1000) + 60 });
          } catch (e) {
            console.warn(`[Titan Guard] Failed to increment rate limit in KV:`, e);
          }
        }
      } else {
        // First strike
        try {
          await kv.put(key, JSON.stringify({ count: 1, reset: Date.now() + (window * 1000) }), { expirationTtl: window + 60 });
        } catch (e) {
          console.warn(`[Rate Limit] Failed to set up rate limit in KV:`, e);
        }
      }
    } catch (error) {
      console.error(`[Titan Guard] Critical failure in middleware:`, error);
      // Fail-open to ensure service availability
    }

    await next();
  };
};
