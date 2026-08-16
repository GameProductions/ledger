import { Hono } from 'hono';
import { app as apiApp } from './index';
import { FLEET_VERSION } from '@shared/constants';
import { handleScheduled } from './cron';
import { handleQueue } from './queues';
import { Bindings, Variables } from './types';

/**
 * Foundation: Unified Entry Point
 * This file orchestrates both the Hono Financial API and static asset serving
 * for the Ledger PWA, ensuring compliance with the Foundation Console.
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

    const { getDb } = (await import('#/index') as any);
    const { userIdentities, passwordResets, adminInvitations, personalAccessTokens, sessions, users, passkeys } = (await import('#/schema') as any);
    const { eq, isNull, or, sql } = (await import('drizzle-orm') as any);

    const db = getDb(c.env);
    const results = { offloaded: 0, purged: 0 };

    try {
        // 1. Migrate OAuth Identities -> Offload
        const identities = (await db.select().from(userIdentities).where(
                    or(sql`access_token IS NOT NULL`, sql`refresh_token IS NOT NULL`)
                ) as any);

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
        const pats = (await db.select().from(personalAccessTokens).where(sql`token_hash IS NOT NULL`) as any);
        for (const pat of pats) {
            if (pat.tokenHash && pat.tokenHash !== '[VAULTED]') {
                await offloadToFoundation(c, 'ledger', 'personal_access_token', pat.id, pat.tokenHash);
                await db.update(personalAccessTokens).set({ tokenHash: '[VAULTED]' }).where(eq(personalAccessTokens.id, pat.id));
                results.offloaded++;
            }
        }

        // 3. Passkeys Reset (Fleet-wide 2FA Reset)
        const allPasskeys = (await db.select().from(passkeys) as any);
        for (const pk of allPasskeys) {
            await offloadToFoundation(c, 'ledger', 'legacy_passkey', pk.userId, JSON.stringify(pk));
            await db.delete(passkeys).where(eq(passkeys.id, pk.id));
            results.offloaded++;
        }

        // 4. Reset 2FA verification flags for all users and sessions
        await db.update(users).set({ passkeyVerifiedAt: null });
        await db.update(sessions).set({ passkeyVerifiedAt: null });

        // 5. Clean Slate Lifecycle Tokens
        const resetPurge = (await db.delete(passwordResets) as any);
        const invitePurge = (await db.delete(adminInvitations) as any);
        const patPurge = (await db.delete(personalAccessTokens).where(sql`token_hash IS NULL`) as any);
        
        results.purged = ((resetPurge as any).meta?.changes || 0) + ((invitePurge as any).meta?.changes || 0);

        return c.json({
            success: true,
            data: results,
            purgedPats: (patPurge as any).meta?.changes || 0,
            message: 'Security Offload Complete. Legacy plaintext material purged.'
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
  origin: async (origin, c) => {
    if (!origin) return "*";
    
    let allowedStr = '*.gpnet.dev, *.glosonproductions.com, localhost, 127.0.0.1';
    let blockedStr = '';
    
    try {
      const cache = c.env.CACHE || c.env.FLEET_SECURITY_CACHE;
      let cachedConfigs: Record<string, string> | null = null;
      if (cache && typeof cache.get === 'function') {
        cachedConfigs = await cache.get('API_CONFIG', 'json');
      }
      
      if (cachedConfigs && cachedConfigs.ALLOWED_DOMAINS !== undefined) {
        allowedStr = cachedConfigs.ALLOWED_DOMAINS;
        blockedStr = cachedConfigs.BLOCKED_DOMAINS || '';
      } else {
        const { getDb } = (await import('#/index') as any);
        const { systemConfig } = (await import('#/schema') as any);
        const { or, eq } = (await import('drizzle-orm') as any);
        
        const db = getDb(c.env);
        const configs = (await db.select().from(systemConfig).where(
          or(
            eq(systemConfig.configKey, 'ALLOWED_DOMAINS'),
            eq(systemConfig.configKey, 'BLOCKED_DOMAINS')
          )
        ) as any);
        
        const allowedItem = configs.find((cf: any) => cf.configKey === 'ALLOWED_DOMAINS');
        const blockedItem = configs.find((cf: any) => cf.configKey === 'BLOCKED_DOMAINS');
        if (allowedItem) allowedStr = allowedItem.configValue || '';
        if (blockedItem) blockedStr = blockedItem.configValue || '';
      }
    } catch (e) {
      // Fallback
    }

    const parseToRegex = (pattern: string) => {
      const escaped = pattern.trim().replace(/[-\/\\^$+.()|[\]{}]/g, '\\$&').replace(/\\\*/g, '.*');
      return new RegExp(`^https?:\\/\\/${escaped}(:\\d+)?$`, 'i');
    };

    const allowedPatterns = allowedStr.split(',').map(s => s.trim()).filter(Boolean);
    const blockedPatterns = blockedStr.split(',').map(s => s.trim()).filter(Boolean);

    // 1. Check blacklist first
    for (const pattern of blockedPatterns) {
      const rx = parseToRegex(pattern);
      if (rx.test(origin)) {
        return "https://ledger.gpnet.dev";
      }
    }

    // 2. Check whitelist
    for (const pattern of allowedPatterns) {
      if (pattern === '*') return '*';
      const rx = parseToRegex(pattern);
      if (rx.test(origin)) {
        return origin;
      }
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

// 8. React Router v8 Fullstack SSR
import { createRequestHandler, RouterContextProvider } from 'react-router';
// @ts-ignore
import * as build from '../../build/server';

app.all("*", async (c) => {
  const path = c.req.path;
  const nonce = c.get('cspNonce');

  if (path.startsWith('/api/') || path.startsWith('/auth/')) {
    return c.json({ error: 'Not Found', path }, 404);
  }

  try {
    const buildObj = build;
    if (!buildObj || !(buildObj as any).routes) {
      const assetRes = (await c.env.ASSETS.fetch(c.req.raw as any) as any);
      return injectCSPNonce(new Response(assetRes.body as any, assetRes as any), nonce);
    }

    // @ts-ignore
    const handler = createRequestHandler(buildObj);

    const loadContext = Object.assign(new RouterContextProvider(), {
      cloudflare: {
        env: c.env,
        ctx: c.executionCtx,
        cf: (c.req.raw as any).cf || {},
      },
      env: c.env,
      ctx: c.executionCtx,
    });

    const res = await handler(c.req.raw, loadContext);
    return injectCSPNonce(res, nonce);
  } catch (error: any) {
    console.error('React Router SSR Error:', error);
    return c.text('Internal Server Error', 500);
  }
});

app.onError((err, c) => {
  const status = (err as any).status && typeof (err as any).status === 'number' ? (err as any).status : 500;
  const isClientError = status >= 400 && status < 500;

  let code = 'INTERNAL_SERVER_ERROR';
  if (status === 401) code = 'UNAUTHORIZED';
  else if (status === 403) code = 'FORBIDDEN';
  else if (status === 404) code = 'NOT_FOUND';
  else if (status === 409) code = 'CONFLICT';
  else if (status === 410) code = 'EXPIRED';
  else if (status === 429) code = 'RATE_LIMITED';
  else if (isClientError) code = 'BAD_REQUEST';

  const userMsg = isClientError ? (err.message || 'Client Request Error') : 'A system error occurred.';
  const details = isClientError ? null : { path: c.req.path, stack: err.stack };

  return apiError(c, err.message, code, userMsg, status, details);
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
