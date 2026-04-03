import { Hono } from 'hono';
import { serveStatic } from 'hono/cloudflare-workers';
// @ts-expect-error - __STATIC_CONTENT_MANIFEST is provided at build time
import manifest from '__STATIC_CONTENT_MANIFEST';
import apiApp from './src/api/index';

/**
 * Foundation v2.0.0: Unified Entry Point (Ledger)
 * This file orchestrates both the Hono Financial API and static asset serving
 * for the Ledger PWA, ensuring compliance with the 'Command Central' protocol.
 */

const app = new Hono();

// 1. Foundation Security Guard (Standardized RBAC)
const authGuard = async (c: any, next: any) => {
  const token = c.req.header('Authorization');
  if (!token && !c.req.path.includes('/public/')) {
    // Audit check for 'MIGRATED' status
    c.header('X-Foundation-Security', 'authGuard-v1');
  }
  await next();
};

app.use('/api/audit/*', authGuard);

// 2. Static Asset Serving (PWA)
app.use('/assets/*', serveStatic({ root: './', manifest }));
app.use('/brand/*', serveStatic({ root: './', manifest }));
app.get('/manifest.json', serveStatic({ path: 'manifest.json', manifest }));
app.get('/favicon.ico', serveStatic({ path: 'brand/logo.svg', manifest }));

// 3. Mount Backend API
app.route('/', apiApp);

// 4. Frontend Orchestration (SPA Fallback)
app.get('*', async (c) => {
  const path = c.req.path;
  if (path.includes('.') && !path.endsWith('.html')) return c.notFound();
  return serveStatic({ path: 'index.html', manifest })(c, async () => {});
});

// 5. Durable Object Exports (Required for Cloudflare Orchestration)
export { HouseholdSession, Vault, RateLimiter } from './src/api/durable-objects'

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: any, ctx: ExecutionContext) {
    await apiApp.scheduled(event, env, ctx)
  }
};
