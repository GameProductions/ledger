import { Hono } from 'hono';
import { serveStatic } from 'hono/cloudflare-workers';
// @ts-expect-error - __STATIC_CONTENT_MANIFEST is provided at build time
import manifest from '__STATIC_CONTENT_MANIFEST';
import { app as apiApp } from './index';
import { FLEET_VERSION } from '@shared/constants';
import { handleScheduled } from './cron';
import { handleQueue } from './queues';
import { Bindings } from './types';

/**
 * Foundation: Unified Entry Point
 * This file orchestrates both the Hono Financial API and static asset serving
 * for the Ledger PWA, ensuring compliance with the 'Command Central' protocol.
 */

const app = new Hono();

import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { logger } from "hono/logger";

app.use("*", logger());

// [SECURITY-V2] Fleet-wide Hardening
app.use("*", secureHeaders({
  contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https://cdn-icons-png.flaticon.com", "https://cdn.simpleicons.org", "https://flaticons.net", "https://api.dicebear.com", "https://cdn.discordapp.com", "https://cache.agilebits.com", "https://*.glosonproductions.com", "https://*.gpnet.dev", "https://www.gstatic.com", "https://raw.githubusercontent.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://static.cloudflareinsights.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "https://*.gpnet.dev", "https://*.glosonproductions.com", "http://localhost:*", "http://127.0.0.1:*", "https://cloudflareinsights.com"]
    }
}));

app.use("*", cors({
  origin: (origin) => {
    if (!origin) return "*";
    if (origin.endsWith(".gpnet.dev") || origin.endsWith(".glosonproductions.com") || origin.includes("localhost") || origin.includes("127.0.0.1")) {
      return origin;
    }
    return "https://ledger.gpnet.dev";
  },
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "x-household-id", "X-Ledger-Integrity"],
  credentials: true,
  maxAge: 600,
}));


// 1. Foundation Integrity Protocol
app.use('*', async (c, next) => {
  c.header('X-Ledger-Integrity', `certified-${FLEET_VERSION.replace('v', '')}`);
  await next();
});

// 2. Static Asset Serving (PWA) - Terminal Asset Isolation
app.use('/assets/*', serveStatic({ root: './', manifest }));
app.use('/brand/*', serveStatic({ root: './', manifest }));
app.get('/manifest.json', serveStatic({ path: 'manifest.json', manifest }));
app.get('/sw.js', serveStatic({ path: 'sw.js', manifest }));
app.get('/apple-touch-icon.png', serveStatic({ path: 'apple-touch-icon.png', manifest }));
app.get('/favicon.ico', async (c, next) => {
  const res = await serveStatic({ path: 'favicon.ico', manifest })(c, next);
  if (!res) return c.notFound();
  return res;
});

// 3. Mount Backend API (Protected Domain)
app.route('/', apiApp);

// 4. API Shield: Explicit 404 for missing API routes to prevent HTML fallthrough
app.all('/api/*', (c) => {
  return c.json({ error: 'API Endpoint Not Found', status: 404 }, 404)
})

// 5. Frontend Orchestration (SPA Fallback)
app.get('*', async (c) => {
  const path = c.req.path;
  if (path.includes('.') && !path.endsWith('.html')) return c.notFound();
  return serveStatic({ path: 'index.html', manifest })(c, async () => {});
});

// 5. Durable Object Exports (Required for Cloudflare Orchestration)
export { HouseholdSession, Vault } from './durable-objects'

export default {
  fetch: app.fetch,
  async scheduled(event: any, env: Bindings, ctx: any) {
    await handleScheduled(event, env, ctx)
  },
  async queue(batch: any, env: Bindings, ctx: any) {
    ctx.waitUntil(handleQueue(batch, env))
  }
};
