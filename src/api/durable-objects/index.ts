// import { DurableObjectState } from '@cloudflare/workers-types'
type DurableObjectState = any;

// --- DURABLE OBJECT: HouseholdSession ---
export class HouseholdSession {
  state: DurableObjectState

  constructor(state: DurableObjectState) {
    this.state = state
  }

  async fetch(request: Request) {
    const url = new URL(request.url)
    if (url.pathname === '/join') {
      const { userId } = await request.json() as any
      const users: string[] = (await this.state.storage.get('active_users')) || []
      if (!users.includes(userId)) {
        users.push(userId)
        await this.state.storage.put('active_users', users)
      }
      return new Response(JSON.stringify({ activeCount: users.length }))
    }
    if (url.pathname === '/status') {
      const users: string[] = (await this.state.storage.get('active_users')) || []
      return new Response(JSON.stringify({ activeCount: users.length }))
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
    
    // FORENSIC AUDIT: Verify that the request is properly contextualized
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


