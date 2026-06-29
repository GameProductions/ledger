import { MiddlewareHandler } from 'hono';

/**
 * Rate Limiting Middleware
 * Unified request management for the application fleet.
 * Uses shared KV for global IP reputation and unblock support.
 */

export type RateLimitTier = 'API' | 'AUTH' | 'STRICT';

const DEFAULT_POLICIES: Record<RateLimitTier, { limit: number; window: number }> = {
  API: { limit: 1000, window: 60 },       // 1000 req / 60s
  AUTH: { limit: 500, window: 600 },      // 500 req / 10m
  STRICT: { limit: 10, window: 1800 }     // 10 req / 30m
};

// 🛡️ Global write-coalescing map to avoid hitting KV's 1-write-per-second-per-key limit
const LAST_WRITE = new Map<string, number>();

export const ipRateLimit = (tier: RateLimitTier = 'API'): MiddlewareHandler => {
  return async (c, next) => {
    const kv = (c.env as any).FLEET_SECURITY_CACHE;
    if (!kv) {
      console.warn(`[Security] FLEET_SECURITY_CACHE binding missing for Ledger. Falling back to passthrough.`);
      return await next();
    }

    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1';
    const botName = (c.env as any).APP_NAME || 'ledger';
    
    // 0. Global Block Enforcement (Fleet-wide Shield)
    const isBlocked = (await kv.get(`fs:block:${ip}`) as any);
    if (isBlocked) {
      return c.json({ 
        error: 'Security Shield Active', 
        message: 'Access restricted due to security policy violations.',
        security_v: 'Security v6.1'
      }, 429);
    }

    const safePut = (k: string, v: string, o: any) => {
      const now = Date.now();
      const last = LAST_WRITE.get(k) || 0;
      
      // Coalesce writes: only write if > 1s passed OR it's a block trigger
      if (now - last < 1000 && !k.includes(':block:')) return Promise.resolve();
      
      LAST_WRITE.set(k, now);
      const p = kv.put(k, v, o).catch((err: any) => {
        if (err.message?.includes('429')) return; // Suppress KV rate limit logs
        console.error(`[Security] KV Write Failed: ${err.message}`);
      });
      
      if (c.executionCtx) c.executionCtx.waitUntil(p);
      return p;
    };

    try {
      // 1. Fetch Active Policy (Global -> Bot Specific)
      const globalConfig = await kv.get(`fs:config:${tier}`, 'json') as any;
      const botConfig = await kv.get(`fs:config:${botName}:${tier}`, 'json') as any;
      
      const policy = botConfig || globalConfig || DEFAULT_POLICIES[tier];
      const { limit, window } = policy;

      // 2. Perform Rate Limit Check
      const key = `fs:bot:${botName}:rl:${tier}:${ip}`;
      const current = await kv.get(key, 'json') as { count: number; reset: number } | null;

      if (current) {
        if (Date.now() > current.reset) {
          // Reset expired
          safePut(key, JSON.stringify({ count: 1, reset: Date.now() + (window * 1000) }), { expirationTtl: window + 60 });
        } else if (current.count >= limit) {
          // 🚨 BLOCK TRIGGERED
          console.error(`[Security] 🛑 Rate limit exceeded for ${ip} on ${botName} (${tier})`);
          
          // Log block for Foundation Monitoring
          await safePut(`fs:block:${ip}`, JSON.stringify({
            bot: botName,
            tier,
            triggered: Date.now(),
            limit,
            window
          }), { expirationTtl: 3600 });

          return c.json({ 
            error: 'Security Shield Active', 
            message: 'You are making too many requests. Please wait a moment and try again.',
            security_v: 'Security v6.1'
          }, 429);
        } else {
          // Increment
          safePut(key, JSON.stringify({ count: current.count + 1, reset: current.reset }), { expirationTtl: Math.ceil((current.reset - Date.now()) / 1000) + 60 });
        }
      } else {
        // First strike
        safePut(key, JSON.stringify({ count: 1, reset: Date.now() + (window * 1000) }), { expirationTtl: window + 60 });
      }
    } catch (error: any) {
      console.error(`[Security] Critical failure in middleware:`, error);
      // Fail-open to ensure service availability
    }

    await next();
  };
};
