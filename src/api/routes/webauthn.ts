import { Hono } from 'hono';
import type { D1Database } from '@cloudflare/workers-types';
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';

export const authRouter = new Hono<{ Bindings: { DB: D1Database } }>();

const rpName = 'GameProductions Identity';

function getRpID(c: any): string {
  const hostStr = c.req.header('host') || '';
  const originStr = c.req.header('origin') || '';
  if (hostStr.includes('localhost') || originStr.includes('localhost')) {
    return 'localhost';
  }
  return 'gpnet.dev';
}

authRouter.post('/webauthn/generate-registration', async (c) => { 
  try {
    const userId = (c.get as any)('userId') as string;
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    
    const rpID = getRpID(c);
    
    const userRow = await c.env.DB.prepare('SELECT username, display_name, email FROM users WHERE id = ?').bind(userId).first();
    const realUsername = userRow?.username || userRow?.email || `root-${userId.substring(0, 5)}`;
    const displayName = userRow?.display_name || realUsername;

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: new TextEncoder().encode(userId) as any,
      userName: realUsername,
      userDisplayName: displayName,
      attestationType: 'none',
      authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' }
    });
    
    await c.env.DB.prepare("UPDATE users SET passkey_verified_at = ? WHERE id = ?").bind(options.challenge, userId).run();

    return c.json(options);
  } catch (error: any) {
    return c.json({ error: error.message, stack: error.stack }, 400);
  }
});

authRouter.post('/webauthn/verify-registration', async (c) => {
  try {
    const body = await c.req.json();
    const userId = (c.get as any)('userId') as string;
    const sessionId = (c.get as any)('session_id') as string;
    
    const rpID = getRpID(c);
    
    const session = await c.env.DB.prepare('SELECT passkey_verified_at FROM users WHERE id = ?').bind(userId).first();
    if (!session || !session.passkey_verified_at) return c.json({ error: `No active challenge. Debug - User: ${userId}, Session: ${JSON.stringify(session)}` }, 400);

    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge: session.passkey_verified_at as string,
      expectedOrigin: c.req.header('origin') || `https://${rpID}`,
      expectedRPID: rpID,
    });

    if (verification.verified && verification.registrationInfo) {
      const regInfo = verification.registrationInfo as any;
      const credentialID = regInfo.credential?.id || (regInfo as any).credentialID;
      const credentialPublicKey = regInfo.credential?.publicKey || (regInfo as any).credentialPublicKey;
      const counter = regInfo.credential?.counter || regInfo.counter || 0;
      const aaguid = regInfo.aaguid || null;
      const backedUp = regInfo.credentialBackedUp ? 1 : 0;

      await c.env.DB.prepare(`
        INSERT INTO passkeys (id, user_id, public_key, credential_id, counter, aaguid, backed_up, last_used_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(
        crypto.randomUUID(), userId, 
        btoa(String.fromCharCode(...new Uint8Array(credentialPublicKey))),
        credentialID,
        counter,
        aaguid,
        backedUp
      ).run();

      await c.env.DB.prepare('UPDATE users SET passkey_verified_at = CURRENT_TIMESTAMP WHERE id = ?').bind(userId).run();
      return c.json({ verified: true });
    }

    return c.json({ verified: false }, 400);
  } catch (error: any) {
    console.error('[WebAuthn] verify-registration error:', error);
    return c.json({ error: error.message }, 400);
  }
});

authRouter.get('/webauthn/passkeys', async (c) => {
  try {
    const userId = (c.get as any)('userId') as string;
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    
    const results = await c.env.DB.prepare('SELECT id, name, aaguid, backed_up as backedUp, last_used_at as lastUsedAt, created_at, counter FROM passkeys WHERE user_id = ? ORDER BY created_at DESC').bind(userId).all();
    return c.json({ passkeys: results.results || [] });
  } catch (error: any) {
    return c.json({ error: 'Failed to retrieve signatures' }, 500);
  }
});

authRouter.put('/webauthn/passkeys/:id', async (c) => {
  try {
    const userId = (c.get as any)('userId') as string;
    const keyId = c.req.param('id');
    const body = await c.req.json();
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    await c.env.DB.prepare('UPDATE passkeys SET name = ? WHERE id = ? AND user_id = ?').bind(body.name || '', keyId, userId).run();
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: 'Failed to rename signature' }, 500);
  }
});

authRouter.delete('/webauthn/passkeys/:id', async (c) => {
  try {
    const userId = (c.get as any)('userId') as string;
    const keyId = c.req.param('id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    await c.env.DB.prepare('DELETE FROM passkeys WHERE id = ? AND user_id = ?').bind(keyId, userId).run();
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: 'Failed to revoke signature' }, 500);
  }
});

authRouter.post('/webauthn/generate-auth', async (c) => {
  try {
    const userId = (c.get as any)('userId') as string;
    const sessionId = (c.get as any)('session_id') as string;
    
    const rpID = getRpID(c);

    const passkeys = await c.env.DB.prepare('SELECT credential_id FROM passkeys WHERE user_id = ?').bind(userId).all();
    if (!passkeys.results.length) return c.json({ error: 'No passkeys registered' }, 404);

    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: 'preferred',
    });

    await c.env.DB.prepare('UPDATE users SET passkey_verified_at = ? WHERE id = ?').bind(options.challenge, userId).run();
    return c.json(options);
  } catch (error: any) {
    console.error('[WebAuthn] generate-auth error:', error);
    return c.json({ error: error.message }, 500);
  }
});

authRouter.post('/webauthn/verify-auth', async (c) => {
  try {
    const body = await c.req.json();
    const userId = (c.get as any)('userId') as string;
    const sessionId = (c.get as any)('session_id') as string;
    
    const rpID = getRpID(c);

    const session = await c.env.DB.prepare('SELECT passkey_verified_at FROM users WHERE id = ?').bind(userId).first();
    if (!session || !session.passkey_verified_at) return c.json({ error: `No active challenge. Debug - User: ${userId}, Session: ${JSON.stringify(session)}` }, 400);

    const passkey = await c.env.DB.prepare('SELECT * FROM passkeys WHERE user_id = ? AND credential_id = ?')
      .bind(userId, body.id).first() as any;

    if (!passkey) return c.json({ error: 'Passkey not found' }, 404);

    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: session.passkey_verified_at as string,
      expectedOrigin: c.req.header('origin') || `https://${rpID}`,
      expectedRPID: rpID,
      requireUserVerification: false,
      credential: {
        id: passkey.credential_id,
        publicKey: Uint8Array.from(atob(passkey.public_key), c => c.charCodeAt(0)),
        counter: passkey.counter,
        transports: passkey.transports ? JSON.parse(passkey.transports) : undefined,
      } as any,
    });

    if (verification.verified) {
      await c.env.DB.batch([
        c.env.DB.prepare('UPDATE passkeys SET counter = ?, last_used_at = CURRENT_TIMESTAMP WHERE id = ?').bind(verification.authenticationInfo.newCounter, passkey.id),
        c.env.DB.prepare('UPDATE users SET passkey_verified_at = CURRENT_TIMESTAMP WHERE id = ?').bind(userId)
      ]);
      return c.json({ verified: true });
    }

    return c.json({ verified: false }, 400);
  } catch (error: any) {
    console.error('[WebAuthn] verify-auth error:', error);
    return c.json({ error: error.message }, 400);
  }
});

export default authRouter;
