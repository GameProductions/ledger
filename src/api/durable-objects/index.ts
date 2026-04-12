// import { DurableObjectState } from '@cloudflare/workers-types'
type DurableObjectState = any;

// --- DURABLE OBJECT: HouseholdSession ---
export class HouseholdSession {
  state: DurableObjectState
  users: Set<string> = new Set()

  constructor(state: DurableObjectState) {
    this.state = state
  }

  async fetch(request: Request) {
    const url = new URL(request.url)
    if (url.pathname === '/join') {
      const { userId } = await request.json() as any
      this.users.add(userId)
      return new Response(JSON.stringify({ activeCount: this.users.size }))
    }
    if (url.pathname === '/status') {
      return new Response(JSON.stringify({ activeCount: this.users.size }))
    }
    return new Response('Not Found', { status: 404 })
  }
}

// --- DURABLE OBJECT: Vault ---
export class Vault {
  state: DurableObjectState

  constructor(state: DurableObjectState) {
    this.state = state
  }

  async fetch(request: Request) {
    const url = new URL(request.url)
    const householdId = url.searchParams.get('householdId') || request.headers.get('x-household-id')
    
    if (!householdId) {
      return new Response('Household Context Required', { status: 400 })
    }
    
    const vaultKey = `vault:${householdId}`

    if (request.method === 'PUT') {
      const { data } = await request.json() as any
      await this.state.storage.put(vaultKey, data)
      return new Response(JSON.stringify({ success: true }))
    }

    if (request.method === 'GET') {
      const value = await this.state.storage.get(vaultKey)
      return new Response(JSON.stringify({ value }))
    }

    return new Response('Not Found', { status: 404 })
  }
}

// --- DURABLE OBJECT: RateLimiter ---
export class RateLimiter {
  state: DurableObjectState
  constructor(state: DurableObjectState) { this.state = state }
  async fetch(request: Request) {
    const url = new URL(request.url)
    const ip = url.searchParams.get('ip') || 'anon'
    const limit = parseInt(url.searchParams.get('limit') || '100')
    const windowMinute = Math.floor(Date.now() / 60000)
    const key = `${ip}:${windowMinute}`
    
    const current: number = (await this.state.storage.get(key)) || 0
    if (current >= limit) {
      return new Response('Rate limit exceeded', { 
        status: 429, 
        headers: { 'X-RateLimit-Limit': limit.toString(), 'X-RateLimit-Remaining': '0', 'Retry-After': '60' } 
      })
    }
    
    await this.state.storage.put(key, current + 1)

    // Schedule cleanup alarm for 2 minutes from now, if not already scheduled
    const currentAlarm = await this.state.storage.getAlarm()
    if (!currentAlarm) {
      await this.state.storage.setAlarm(Date.now() + 120000)
    }

    return new Response(JSON.stringify({ remaining: limit - current - 1 }), { 
      headers: { 'X-RateLimit-Limit': limit.toString(), 'X-RateLimit-Remaining': (limit - current - 1).toString() } 
    })
  }

  async alarm() {
    const currentMinute = Math.floor(Date.now() / 60000)
    const map = await this.state.storage.list()
    
    for (const key of map.keys()) {
      const parts = key.split(':')
      if (parts.length > 1) {
        const windowMinute = parseInt(parts[parts.length - 1], 10)
        // Delete if older than 2 minutes
        if (windowMinute < currentMinute - 1) {
          await this.state.storage.delete(key)
        }
      }
    }
  }
}
