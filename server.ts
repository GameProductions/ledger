import { Hono } from 'hono';
import { serveStatic } from 'hono/cloudflare-workers';
// @ts-expect-error - __STATIC_CONTENT_MANIFEST is provided at build time
import manifest from '__STATIC_CONTENT_MANIFEST';
import { app as apiApp } from './src/api/index';
import { CURRENT_VERSION } from './src/api/constants';
import { handleScheduled } from './src/api/cron';
import { Bindings } from './src/api/types';

/**
 * Foundation v2.0.4: Unified Entry Point (Ledger v3.19.11)
 * This file orchestrates both the Hono Financial API and static asset serving
 * for the Ledger PWA, ensuring compliance with the 'Command Central' protocol.
 */

const app = new Hono();

// 1. Foundation Integrity Protocol (v3.19.11)
app.use('*', async (c, next) => {
  c.header('X-Ledger-Integrity', `certified-${CURRENT_VERSION.replace('v', '')}`);
  await next();
});

// 2. Static Asset Serving (PWA) - Terminal Asset Isolation (v3.19.5)
app.use('/assets/*', serveStatic({ root: './', manifest }));
app.use('/brand/*', serveStatic({ root: './', manifest }));
app.get('/manifest.json', serveStatic({ path: 'manifest.json', manifest }));
app.get('/sw.js', serveStatic({ path: 'sw.js', manifest }));
app.get('/favicon.ico', async (c, next) => {
  const res = await serveStatic({ path: 'favicon.ico', manifest })(c, next);
  if (!res) return c.notFound();
  return res;
});

// 3. Mount Backend API (Protected Domain)
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
  async scheduled(event: any, env: Bindings, ctx: any) {
    await handleScheduled(event, env, ctx)
  }
};
