import { Hono } from 'hono';
import type { D1Database } from '@cloudflare/workers-types';
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';

export const authRouter = new Hono<{ Bindings: { DB: D1Database } }>();

const rpName = 'GameProductions Identity';

authRouter.post('/webauthn/generate-registration', async (c) => { 
  try {
    const userId = (c.get as any)('user_id') as string;
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    
    const originStr = c.req.header('origin');
    const hostStr = c.req.header('host');
    let rpID = c.req.url.split('/')[2].split(':')[0]; // default to production
    if (hostStr && hostStr.includes('localhost')) {
      rpID = 'localhost';
    } else if (originStr && originStr.includes('localhost')) {
      rpID = 'localhost';
    }
    
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: new TextEncoder().encode(userId) as any,
      userName: `root-${userId.substring(0, 5)}`,
      attestationType: 'none',
      authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' }
    });
    
    const sessionId = (c.get as any)('session_id');
    if (sessionId) {
      await c.env.DB.prepare('UPDATE sessions SET passkey_verified_at = ? WHERE id = ?').bind(options.challenge, sessionId).run();
    }

    return c.json(options);
  } catch (error: any) {
    return c.json({ error: error.message, stack: error.stack }, 400);
  }
});

authRouter.post('/webauthn/verify-registration', async (c) => {
  const body = await c.req.json();
  const userId = (c.get as any)('user_id') as string;
  const sessionId = (c.get as any)('session_id') as string;
  const originStr = c.req.header('origin');
  const hostStr = c.req.header('host');
  let rpID = c.req.url.split('/')[2].split(':')[0];
  if (hostStr && hostStr.includes('localhost')) {
    rpID = 'localhost';
  } else if (originStr && originStr.includes('localhost')) {
    rpID = 'localhost';
  }
  
  const session = await c.env.DB.prepare('SELECT passkey_verified_at FROM sessions WHERE id = ?').bind(sessionId).first();
  if (!session || !session.passkey_verified_at) return c.json({ error: 'No active challenge' }, 400);

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge: session.passkey_verified_at as string,
      expectedOrigin: c.req.header('origin') || `https://${rpID}`,
      expectedRPID: rpID,
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }

  if (verification.verified && verification.registrationInfo) {
    const regInfo = verification.registrationInfo as any;
    const credentialID = regInfo.credential?.id || (regInfo as any).credentialID;
    const credentialPublicKey = regInfo.credential?.publicKey || (regInfo as any).credentialPublicKey;
    const counter = regInfo.credential?.counter || regInfo.counter || 0;
    const aaguid = regInfo.aaguid || null;

    await c.env.DB.prepare(`
      INSERT INTO passkeys (id, user_id, public_key, credential_id, counter, aaguid)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(), userId, 
      btoa(String.fromCharCode(...new Uint8Array(credentialPublicKey))),
      credentialID,
      counter,
      aaguid
    ).run();

    await c.env.DB.prepare('UPDATE sessions SET passkey_verified_at = CURRENT_TIMESTAMP WHERE id = ?').bind(sessionId).run();
    return c.json({ verified: true });
  }

  return c.json({ verified: false }, 400);
});

authRouter.get('/webauthn/passkeys', async (c) => {
  try {
    const userId = (c.get as any)('user_id') as string;
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    
    const results = await c.env.DB.prepare('SELECT id, name, aaguid, created_at, counter FROM passkeys WHERE user_id = ? ORDER BY created_at DESC').bind(userId).all();
    return c.json({ passkeys: results.results || [] });
  } catch (error: any) {
    return c.json({ error: 'Failed to retrieve signatures' }, 500);
  }
});

authRouter.put('/webauthn/passkeys/:id', async (c) => {
  try {
    const userId = (c.get as any)('user_id') as string;
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
    const userId = (c.get as any)('user_id') as string;
    const keyId = c.req.param('id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    await c.env.DB.prepare('DELETE FROM passkeys WHERE id = ? AND user_id = ?').bind(keyId, userId).run();
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: 'Failed to revoke signature' }, 500);
  }
});

authRouter.post('/webauthn/generate-auth', async (c) => {
  const userId = (c.get as any)('user_id') as string;
  const sessionId = (c.get as any)('session_id') as string;
  const originStr = c.req.header('origin');
  const hostStr = c.req.header('host');
  let rpID = c.req.url.split('/')[2].split(':')[0];
  if (hostStr && hostStr.includes('localhost')) {
    rpID = 'localhost';
  } else if (originStr && originStr.includes('localhost')) {
    rpID = 'localhost';
  }

  const passkeys = await c.env.DB.prepare('SELECT credential_id FROM passkeys WHERE user_id = ?').bind(userId).all();
  if (!passkeys.results.length) return c.json({ error: 'No passkeys registered' }, 404);

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: passkeys.results.map((pk: any) => ({
      id: pk.credential_id, // Pass the base64 string directly
      type: 'public-key',
    })) as any,
    userVerification: 'preferred',
  });

  await c.env.DB.prepare('UPDATE sessions SET passkey_verified_at = ? WHERE id = ?').bind(options.challenge, sessionId).run();
  return c.json(options);
});

authRouter.post('/webauthn/verify-auth', async (c) => {
  const body = await c.req.json();
  const userId = (c.get as any)('user_id') as string;
  const sessionId = (c.get as any)('session_id') as string;
  const originStr = c.req.header('origin');
  const hostStr = c.req.header('host');
  let rpID = c.req.url.split('/')[2].split(':')[0];
  if (hostStr && hostStr.includes('localhost')) {
    rpID = 'localhost';
  } else if (originStr && originStr.includes('localhost')) {
    rpID = 'localhost';
  }

  const session = await c.env.DB.prepare('SELECT passkey_verified_at FROM sessions WHERE id = ?').bind(sessionId).first();
  if (!session || !session.passkey_verified_at) return c.json({ error: 'No active challenge' }, 400);

  const passkey = await c.env.DB.prepare('SELECT * FROM passkeys WHERE user_id = ? AND credential_id = ?')
    .bind(userId, body.id).first() as any;

  if (!passkey) return c.json({ error: 'Passkey not found' }, 404);

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
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
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }

  if (verification.verified) {
    await c.env.DB.prepare('UPDATE passkeys SET counter = ? WHERE id = ?').bind(verification.authenticationInfo.newCounter, passkey.id).run();
    await c.env.DB.prepare('UPDATE sessions SET passkey_verified_at = CURRENT_TIMESTAMP WHERE id = ?').bind(sessionId).run();
    return c.json({ verified: true });
  }

  return c.json({ verified: false }, 400);
});

export default authRouter;
