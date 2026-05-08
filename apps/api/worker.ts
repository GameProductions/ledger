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

// [SECURITY-V6.1] Fleet-wide Security Hardening & Vault Migration (TOP LEVEL - BYPASS CSRF)
app.post('/api/admin/vault-migration', ipRateLimit(5, 60), async (c) => {
    const authHeader = c.req.header('Authorization');
    if (authHeader !== `Bearer ${c.env.ADMIN_MIGRATION_KEY}`) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const { getDb } = await import('#/index');
    const { userIdentities, passwordResets, adminInvitations, personalAccessTokens, sessions, users, passkeys } = await import('#/schema');
    const { eq, isNull, or, sql } = await import('drizzle-orm');

    const db = getDb(c.env);
    const results = { offloaded: 0, purged: 0 };

    try {
        // 1. Migrate OAuth Identities -> Offload
        const identities = await db.select().from(userIdentities).where(
            or(sql`accessToken IS NOT NULL`, sql`refreshToken IS NOT NULL`)
        );

        for (const identity of identities) {
            let changed = false;
            if (identity.accessToken && identity.accessToken !== '[VAULTED]') {
                await offloadToFoundation(c, 'ledger', 'oauth_access_token', identity.userId, identity.accessToken);
                results.offloaded++;
                changed = true;
            }
            if (identity.refreshToken && identity.refreshToken !== '[VAULTED]') {
                await offloadToFoundation(c, 'ledger', 'oauth_refresh_token', identity.userId, identity.refreshToken);
                results.offloaded++;
                changed = true;
            }
            
            if (changed) {
                await db.update(userIdentities).set({
                    accessToken: '[VAULTED]',
                    refreshToken: '[VAULTED]'
                }).where(eq(userIdentities.id, identity.id));
            }
        }

        // 2. Migrate Personal Access Tokens -> Offload
        const pats = await db.select().from(personalAccessTokens).where(sql`tokenHash IS NOT NULL`);
        for (const pat of pats) {
            if (pat.tokenHash && pat.tokenHash !== '[VAULTED]') {
                await offloadToFoundation(c, 'ledger', 'personal_access_token', pat.id, pat.tokenHash);
                await db.update(personalAccessTokens).set({ tokenHash: '[VAULTED]' }).where(eq(personalAccessTokens.id, pat.id));
                results.offloaded++;
            }
        }

        // 3. Passkeys Reset (Fleet-wide 2FA Reset)
        const allPasskeys = await db.select().from(passkeys);
        for (const pk of allPasskeys) {
            await offloadToFoundation(c, 'ledger', 'legacy_passkey', pk.userId, JSON.stringify(pk));
            await db.delete(passkeys).where(eq(passkeys.id, pk.id));
            results.offloaded++;
        }

        // 4. Reset 2FA verification flags for all users and sessions
        await db.update(users).set({ passkeyVerifiedAt: null });
        await db.update(sessions).set({ passkeyVerifiedAt: null });

        // 5. Clean Slate Lifecycle Tokens
        const resetPurge = await db.delete(passwordResets);
        const invitePurge = await db.delete(adminInvitations);
        const patPurge = await db.delete(personalAccessTokens).where(sql`tokenHash IS NULL`);
        
        results.purged = ((resetPurge as any).meta?.changes || 0) + ((invitePurge as any).meta?.changes || 0);

        return c.json({
            success: true,
            data: results,
            purgedPats: (patPurge as any).meta?.changes || 0,
            message: 'Fleet Security v6.1 Offload Complete. Legacy plaintext material purged.'
        });
    } catch (err: any) {
        console.error('[Vault Offload Error]', err);
        return c.json({ success: false, error: err.message }, 500);
    }
});

// [SECURITY] Strict Content Security Policy & Headers
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

import { offloadToFoundation } from './utils/foundation';

// 3. Mount Backend API
app.route('/', apiApp);

// 4. API Shield
app.all('/api/*', (c) => {
  return c.json({ error: 'API Endpoint Not Found', status: 404 }, 404)
})

// 8. Static Assets & SPA Fallback
app.get("*", async (c) => {
  const path = c.req.path;
  const nonce = c.get('cspNonce');
  
  const assetRes = await c.env.ASSETS.fetch(c.req.raw as any);
  const res = new Response(assetRes.body as any, assetRes as any);
  
  if (res.status === 404) {
      if (path.startsWith('/api/') || path.startsWith('/auth/')) {
          return c.json({ error: 'Not Found', path }, 404);
      }
      
      const indexRes = await c.env.ASSETS.fetch(new Request(new URL('/index.html', c.req.url)) as any);
      return injectCSPNonce(new Response(indexRes.body as any, indexRes as any), nonce);
  }
  
  return injectCSPNonce(res, nonce);
});

app.onError((err, c) => {
  return apiError(c, err.message, 'INTERNAL_SERVER_ERROR', 'A system error occurred.', (err as any).status || 500, { stack: err.stack });
});

// 5. Durable Object & Agent Exports
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
