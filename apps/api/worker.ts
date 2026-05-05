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
import { apiError } from '~/utils/errors';
import { logger } from "hono/logger";
import { ipRateLimit } from './middlewares/rate-limit';

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


// 3. Mount Backend API (Protected Domain)
app.route('/', apiApp);

// 4. API Shield: Explicit 404 for missing API routes to prevent HTML fallthrough
app.all('/api/*', (c) => {
  return c.json({ error: 'API Endpoint Not Found', status: 404 }, 404)
})

// --- [SECURITY] Secret Migration & Clean Slate (Fleet v6.1) ---
// This route is temporary and will be decommissioned after the fleet audit.
async function offloadToFoundation(c: any, source: string, category: string, recordId: string, plaintext: string) {
    const foundationUrl = c.env.FOUNDATION_URL || 'https://foundation.gpnet.dev';
    const url = `${foundationUrl}/api/admin/security/deletion-queue`;
    
    try {
        await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Service-Token': c.env.SHARED_SERVICE_SECRET
            },
            body: JSON.stringify({
                sourceSystem: source,
                category,
                recordId,
                plaintext,
                actorId: 'migration-task'
            })
        });
    } catch (e) {
        console.error(`[Offload] Failed to offload ${category} for ${recordId}:`, e);
    }
}

app.post('/api/admin/vault-migration', ipRateLimit(5, 60), async (c) => {
    const authHeader = c.req.header('Authorization');
    if (authHeader !== `Bearer ${c.env.ADMIN_MIGRATION_KEY}`) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const { getDb } = await import('#/index');
    const { userIdentities, passwordResets, adminInvitations, personalAccessTokens } = await import('#/schema');
    const { eq, isNull, or, sql } = await import('drizzle-orm');

    const db = getDb(c.env);
    
    // 1. Migrate OAuth Identities -> Offload
    const identities = await db.select().from(userIdentities).where(
        or(sql`accessToken IS NOT NULL`, sql`refreshToken IS NOT NULL`)
    );

    let offloaded = 0;
    for (const identity of identities) {
        if (identity.accessToken && identity.accessToken !== '[VAULTED]') {
            await offloadToFoundation(c, 'ledger', 'oauth_access_token', identity.userId, identity.accessToken);
            offloaded++;
        }
        if (identity.refreshToken && identity.refreshToken !== '[VAULTED]') {
            await offloadToFoundation(c, 'ledger', 'oauth_refresh_token', identity.userId, identity.refreshToken);
            offloaded++;
        }
        
        await db.update(userIdentities).set({
            accessToken: '[VAULTED]',
            refreshToken: '[VAULTED]'
        }).where(eq(userIdentities.id, identity.id));
    }

    // 2. Clean Slate Lifecycle Tokens (Purge plaintext tokens, requiring new hashes)
    const resetPurge = await db.delete(passwordResets).where(sql`tokenHash IS NULL`);
    const invitePurge = await db.delete(adminInvitations).where(sql`tokenHash IS NULL`);
    const patPurge = await db.delete(personalAccessTokens).where(sql`tokenHash IS NULL`);

    return c.json({
        success: true,
        offloadedIdentities: offloaded,
        purgedResets: resetPurge.rowsAffected,
        purgedInvites: invitePurge.rowsAffected,
        purgedPats: patPurge.rowsAffected,
        message: 'Fleet Security v6.1 Offload Complete. Legacy plaintext material purged.'
    });
});

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

// 🏛️ Global Error Handler (Security System error handling)
app.onError((err, c) => {
  return apiError(c, err.message, 'INTERNAL_SERVER_ERROR', 'A system error occurred.', (err as any).status || 500, { stack: err.stack });
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
