import { Context, Next } from 'hono'
import { Bindings } from '../types'
import { HTTPException } from 'hono/http-exception'

/**
 * 🛡️ Adaptive IP Rate Limiter (Fleet Standard v6.1)
 * Standardizes rate limiting across the fleet using CF Cache/KV or local memory.
 */
export const ipRateLimit = (limit: number = 60, windowSeconds: number = 60) => {
  return async (c: Context<{ Bindings: Bindings }>, next: Next) => {
    // Skip for non-mutating local dev if needed, but fleet standard enforces production parity
    const ip = c.req.header('cf-connecting-ip') || '127.0.0.1'
    const key = `rate_limit:${ip}:${c.req.path}`
    
    // Use Cloudflare Cache API for distributed rate limiting (Zero Cost)
    const cache = (caches as any).default
    const cacheKey = new Request(`https://rate-limit.gpnet.internal/${key}`)
    
    const existing = (await cache.match(cacheKey) as any)
    let count = 0
    
    if (existing) {
      count = parseInt(await existing.text())
    }
    
    if (count >= limit) {
      console.warn(`[Rate Limit] Blocking ${ip} for ${c.req.path} (Count: ${count})`)
      throw new HTTPException(429, { 
        message: 'Too many requests. Please try again later.',
        res: new Response('Rate limit exceeded', { 
            status: 429,
            headers: { 'Retry-After': windowSeconds.toString() }
        })
      })
    }
    
    // Increment and store
    const newCount = count + 1
    c.executionCtx.waitUntil(
      cache.put(cacheKey, new Response(newCount.toString(), {
        headers: {
          'Cache-Control': `max-age=${windowSeconds}`,
          'Content-Type': 'text/plain'
        }
      }))
    )
    
    await next()
  }
}
