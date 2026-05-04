import { Hono } from 'hono';
// @ts-expect-error - __STATIC_CONTENT_MANIFEST is provided at build time
import manifest from '__STATIC_CONTENT_MANIFEST';
import { app as apiApp } from './index';
import { FLEET_VERSION } from '@shared/constants';
import { handleScheduled } from './cron';
import { handleQueue } from './queues';
import { Bindings, Variables } from './types';

/**
 * Foundation: Unified Entry Point
 * This file orchestrates both the Hono Financial API and static asset serving
 * for the Ledger PWA, ensuring compliance with the 'Command Central' protocol.
 */

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

import { csrf } from "hono/csrf";
import { cors } from "hono/cors";
import { fleetSecurity, injectCSPNonce } from '~/utils/fleet-security';
import { logger } from "hono/logger";

// [SECURITY] Strict Content Security Policy & Headers (Fleet Security Standard - Codified)
app.use('*', csrf());
app.use('*', fleetSecurity());

app.use("*", logger());

app.use("*", cors({
  origin: (origin) => {
    if (!origin) return "*";
    if (origin.endsWith(".gpnet.dev") || origin.endsWith(".glosonproductions.com") || origin.includes("localhost") || origin.includes("127.0.0.1")) {
      return origin;
    }
    return "https://ledger.gpnet.dev";
  },
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "x-household-id", "X-Ledger-Integrity", "X-Requested-With"],
  exposeHeaders: ["Content-Range", "X-Total-Count"],
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
app.get('/sw-register.js', serveStatic({ path: 'sw-register.js', manifest }));
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

// 8. Static Assets & SPA Fallback (with Nonce Injection)
app.get("*", async (c) => {
  const path = c.req.path;
  const nonce = c.get('cspNonce');
  
  // Try to fetch from ASSETS
  const assetRes = await c.env.ASSETS.fetch(c.req.raw as any);
  const res = new Response(assetRes.body as any, assetRes as any);
  
  if (res.status === 404) {
      if (path.startsWith('/api/') || path.startsWith('/auth/')) {
          return c.json({ error: 'Not Found', path }, 404);
      }
      
      // Serve index.html for SPA routing
      const indexRes = await c.env.ASSETS.fetch(new Request(new URL('/index.html', c.req.url)) as any);
      return injectCSPNonce(new Response(indexRes.body as any, indexRes as any), nonce);
  }
  
  return injectCSPNonce(res, nonce);
});

// 5. Durable Object & Agent Exports (Required for Cloudflare Orchestration)
export { HouseholdSession, Vault } from './durable-objects'
export { ReconciliationAgent } from './agents/ReconciliationAgent'
export { MatchAgent } from './agents/MatchAgent'
export { RuleAgent } from './agents/RuleAgent'

export default {
  fetch: app.fetch,
  async scheduled(event: any, env: Bindings, ctx: any) {
    await handleScheduled(event, env, ctx)
  },
  async queue(batch: any, env: Bindings, ctx: any) {
    ctx.waitUntil(handleQueue(batch, env))
  }
};
