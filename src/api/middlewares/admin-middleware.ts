import { Context, Next } from 'hono'
import { Bindings, Variables } from '../types'

export const adminMiddleware = async (c: Context<{ Bindings: Bindings, Variables: Variables }>, next: Next) => {
  const role = c.get('globalRole')
  if (role !== 'super_admin') {
    console.warn(`[Admin Access Denied] User ${c.get('userId')} attempted access with role ${role}`)
    return c.json({ error: 'Forbidden: Super Admin access required' }, 403)
  }
  await next()
}
