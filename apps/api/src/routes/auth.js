import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';
import { AuthService } from '../services/auth.service';
import { logAudit } from '../utils';
import { setSignedCookie, getSignedCookie } from 'hono/cookie';
import { verify as jwtVerify } from 'hono/jwt';
import { HTTPException } from 'hono/http-exception';
import { EmailService } from '../services/email.service';
const auth = new Hono();
// Pass loginAudit as a parameter to handlers if needed, or handle it here
// Since logAudit is in index.ts, we might need to pass it or move it to a utility
auth.post('/login', zValidator('json', z.object({
    username: z.string().min(1),
    password: z.string().min(1),
    totpCode: z.string().optional()
}), (result, c) => {
    if (!result.success) {
        console.error('[Login Validation Failed]', {
            error: result.error,
            contentType: c.req.header('Content-Type'),
            path: c.req.path
        });
        return c.json({ success: false, error: result.error }, 400);
    }
}), async (c) => {
    const { username, password, totpCode } = c.req.valid('json');
    const authService = new AuthService(c.env);
    try {
        const user = await authService.validateCredentials(username, password);
        const twoFactor = await authService.verify2FA(user, totpCode);
        if (twoFactor.requires2FA) {
            return c.json({ requires2FA: true }, 202);
        }
        const token = await authService.generateToken(user.id);
        await logAudit(c, 'users', user.id, 'login', null, { strategy: 'password' });
        return c.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                displayName: user.display_name,
                force_password_change: !!user.force_password_change
            }
        });
    }
    catch (e) {
        return c.json({ error: e.message || 'Unauthorized' }, e.status || 401);
    }
});
// --- TOTP SETUP ---
auth.post('/totp/setup', async (c) => {
    const userId = c.get('userId');
    const authService = new AuthService(c.env);
    const secret = await authService.setupTOTP(userId);
    const otpauth = `otpauth://totp/LEDGER:${userId}?secret=${secret}&issuer=LEDGER`;
    return c.json({ secret, qrUrl: otpauth });
});
auth.post('/totp/verify', zValidator('json', z.object({ code: z.string() })), async (c) => {
    const userId = c.get('userId');
    const { code } = c.req.valid('json');
    const authService = new AuthService(c.env);
    const success = await authService.verifyAndEnableTOTP(userId, code);
    return c.json({ success }, success ? 200 : 400);
});
auth.get('/login/discord', async (c) => {
    const clientId = c.env.DISCORD_CLIENT_ID;
    if (!clientId || clientId.includes('REPLACE_WITH')) {
        const errorMsg = `[OAUTH_ERROR] Discord Client ID is not configured. Please ensure DISCORD_CLIENT_ID is set in your Cloudflare Worker secrets (use 'wrangler secret put DISCORD_CLIENT_ID').`;
        console.error(errorMsg);
        throw new HTTPException(500, { message: errorMsg });
    }
    // 1. Capture session context if present
    let userId = null;
    const authHeader = c.req.header('Authorization');
    const authQuery = c.req.query('auth_token');
    const token = authQuery || (authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null);
    if (token) {
        try {
            const payload = await jwtVerify(token, c.env.JWT_SECRET, 'HS256');
            userId = payload.sub;
        }
        catch (e) {
            console.warn('[OAuth] Failed to verify existing token for linking:', e);
        }
    }
    const challenge = crypto.randomUUID();
    const state = Buffer.from(JSON.stringify({ challenge, userId })).toString('base64');
    await setSignedCookie(c, 'oauth_state', state, c.env.JWT_SECRET, {
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'None',
        maxAge: 300,
    });
    const redirectUri = `${new URL(c.req.url).origin}/auth/callback/discord`;
    const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&robot=false&response_type=code&scope=identify%20email&state=${state}`;
    return c.redirect(url);
});
auth.get('/callback/discord', async (c) => {
    const code = c.req.query('code');
    const state = c.req.query('state');
    const savedState = await getSignedCookie(c, c.env.JWT_SECRET, 'oauth_state');
    if (!code || !state || state !== savedState) {
        throw new HTTPException(401, { message: 'Invalid OAuth state or missing code' });
    }
    // Parse state for session context
    let sessionUserId = null;
    try {
        const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
        sessionUserId = decoded.userId;
    }
    catch (e) {
        console.warn('[OAuth] State decode failure:', e);
    }
    const authService = new AuthService(c.env);
    // 1. Exchange code for token
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        body: new URLSearchParams({
            client_id: c.env.DISCORD_CLIENT_ID || '',
            client_secret: c.env.DISCORD_CLIENT_SECRET || '',
            grant_type: 'authorization_code',
            code,
            redirect_uri: `${new URL(c.req.url).origin}/auth/callback/discord`
        })
    });
    const tokenData = await tokenRes.json();
    // 2. Fetch profile
    const userRes = await fetch('https://discord.com/api/users/@me', {
        headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    });
    const profile = await userRes.json();
    const socialProfile = {
        id: profile.id,
        email: profile.email,
        name: profile.username,
        avatar: `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
    };
    const socialTokens = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in
    };
    if (sessionUserId) {
        // LINK MODE
        await authService.linkSocialAccount(sessionUserId, 'discord', socialProfile, socialTokens);
        await logAudit(c, 'user_identities', profile.id, 'LINK', null, { provider: 'discord', userId: sessionUserId });
        return c.redirect(`${c.env.ENVIRONMENT === 'production' ? 'https://ledger.gpnet.dev' : 'http://localhost:5173'}/#/settings`);
    }
    else {
        // LOGIN MODE
        const userId = await authService.findOrCreateSocialUser('discord', socialProfile, socialTokens);
        const token = await authService.generateToken(userId);
        return c.redirect(`${c.env.ENVIRONMENT === 'production' ? 'https://ledger.gpnet.dev' : 'http://localhost:5173'}/#/login?token=${token}`);
    }
});
auth.get('/login/google', async (c) => {
    const clientId = c.env.GOOGLE_CLIENT_ID;
    if (!clientId || clientId.includes('REPLACE_WITH')) {
        const errorMsg = `[OAUTH_ERROR] Google Client ID is not configured. Please ensure GOOGLE_CLIENT_ID is set in your Cloudflare Worker secrets (use 'wrangler secret put GOOGLE_CLIENT_ID').`;
        console.error(errorMsg);
        throw new HTTPException(500, { message: errorMsg });
    }
    // 1. Capture session context if present
    let userId = null;
    const authHeader = c.req.header('Authorization');
    const authQuery = c.req.query('auth_token');
    const token = authQuery || (authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null);
    if (token) {
        try {
            const payload = await jwtVerify(token, c.env.JWT_SECRET, 'HS256');
            userId = payload.sub;
        }
        catch (e) {
            console.warn('[OAuth] Failed to verify existing token for linking:', e);
        }
    }
    const challenge = crypto.randomUUID();
    const state = Buffer.from(JSON.stringify({ challenge, userId })).toString('base64');
    await setSignedCookie(c, 'oauth_state', state, c.env.JWT_SECRET, {
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'None',
        maxAge: 300,
    });
    const redirectUri = `${new URL(c.req.url).origin}/auth/callback/google`;
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=email%20profile%20https://www.googleapis.com/auth/spreadsheets&access_type=offline&prompt=consent&state=${state}`;
    return c.redirect(url);
});
auth.get('/callback/google', async (c) => {
    const code = c.req.query('code');
    const state = c.req.query('state');
    const savedState = await getSignedCookie(c, c.env.JWT_SECRET, 'oauth_state');
    if (!code || !state || state !== savedState) {
        throw new HTTPException(401, { message: 'Invalid OAuth state or missing code' });
    }
    // Parse state for session context
    let sessionUserId = null;
    try {
        const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
        sessionUserId = decoded.userId;
    }
    catch (e) {
        console.warn('[OAuth] State decode failure:', e);
    }
    const authService = new AuthService(c.env);
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        body: new URLSearchParams({
            client_id: c.env.GOOGLE_CLIENT_ID || '',
            client_secret: c.env.GOOGLE_CLIENT_SECRET || '',
            code: code || '',
            grant_type: 'authorization_code',
            redirect_uri: `${new URL(c.req.url).origin}/auth/callback/google`
        })
    });
    const tokenData = await tokenRes.json();
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    });
    const profile = await userRes.json();
    const socialProfile = {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        avatar: profile.picture
    };
    const socialTokens = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in
    };
    if (sessionUserId) {
        // LINK MODE
        await authService.linkSocialAccount(sessionUserId, 'google', socialProfile, socialTokens);
        await logAudit(c, 'user_identities', profile.id, 'LINK', null, { provider: 'google', userId: sessionUserId });
        return c.redirect(`${c.env.ENVIRONMENT === 'production' ? 'https://ledger.gpnet.dev' : 'http://localhost:5173'}/#/settings`);
    }
    else {
        // LOGIN MODE
        const userId = await authService.findOrCreateSocialUser('google', socialProfile, socialTokens);
        const token = await authService.generateToken(userId);
        return c.redirect(`${c.env.ENVIRONMENT === 'production' ? 'https://ledger.gpnet.dev' : 'http://localhost:5173'}/#/login?token=${token}`);
    }
});
// --- DROPBOX ---
auth.get('/login/dropbox', async (c) => {
    const clientId = c.env.DROPBOX_CLIENT_ID;
    if (!clientId || clientId.includes('REPLACE_WITH')) {
        throw new HTTPException(500, { message: 'Dropbox Storage Integration Not Configured (Missing Client ID)' });
    }
    // 1. Capture session context if present
    let userId = null;
    const authHeader = c.req.header('Authorization');
    const authQuery = c.req.query('auth_token');
    const token = authQuery || (authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null);
    if (token) {
        try {
            const payload = await jwtVerify(token, c.env.JWT_SECRET, 'HS256');
            userId = payload.sub;
        }
        catch (e) {
            console.warn('[OAuth] Failed to verify existing token for linking:', e);
        }
    }
    const challenge = crypto.randomUUID();
    const state = Buffer.from(JSON.stringify({ challenge, userId })).toString('base64');
    await setSignedCookie(c, 'oauth_state', state, c.env.JWT_SECRET, {
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'None',
        maxAge: 300,
    });
    const redirectUri = `${new URL(c.req.url).origin}/auth/callback/dropbox`;
    const url = `https://www.dropbox.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${state}`;
    return c.redirect(url);
});
auth.get('/callback/dropbox', async (c) => {
    const code = c.req.query('code');
    const state = c.req.query('state');
    const savedState = await getSignedCookie(c, c.env.JWT_SECRET, 'oauth_state');
    if (!code || !state || state !== savedState) {
        throw new HTTPException(401, { message: 'Invalid OAuth state or missing code' });
    }
    // Parse state for session context
    let sessionUserId = null;
    try {
        const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
        sessionUserId = decoded.userId;
    }
    catch (e) {
        console.warn('[OAuth] State decode failure:', e);
    }
    const authService = new AuthService(c.env);
    const tokenRes = await fetch('https://api.dropbox.com/oauth2/token', {
        method: 'POST',
        body: new URLSearchParams({
            client_id: c.env.DROPBOX_CLIENT_ID || '',
            client_secret: c.env.DROPBOX_CLIENT_SECRET || '',
            code: code || '',
            grant_type: 'authorization_code',
            redirect_uri: `${new URL(c.req.url).origin}/auth/callback/dropbox`
        })
    });
    const tokenData = await tokenRes.json();
    const userRes = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${tokenData.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(null)
    });
    const profile = await userRes.json();
    const socialProfile = {
        id: profile.account_id,
        email: profile.email,
        name: profile.name.display_name,
        avatar: profile.profile_photo_url
    };
    const socialTokens = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in
    };
    if (sessionUserId) {
        // LINK MODE
        await authService.linkSocialAccount(sessionUserId, 'dropbox', socialProfile, socialTokens);
        await logAudit(c, 'user_identities', profile.account_id, 'LINK', null, { provider: 'dropbox', userId: sessionUserId });
        return c.redirect(`${c.env.ENVIRONMENT === 'production' ? 'https://ledger.gpnet.dev' : 'http://localhost:5173'}/#/settings`);
    }
    else {
        // LOGIN MODE
        const userId = await authService.findOrCreateSocialUser('dropbox', socialProfile, socialTokens);
        const token = await authService.generateToken(userId);
        return c.redirect(`${c.env.ENVIRONMENT === 'production' ? 'https://ledger.gpnet.dev' : 'http://localhost:5173'}/#/login?token=${token}`);
    }
});
// --- ONEDRIVE ---
auth.get('/login/onedrive', async (c) => {
    const clientId = c.env.ONEDRIVE_CLIENT_ID;
    if (!clientId || clientId.includes('REPLACE_WITH')) {
        throw new HTTPException(500, { message: 'OneDrive Cloud Storage Not Configured (Missing Client ID)' });
    }
    // 1. Capture session context if present
    let userId = null;
    const authHeader = c.req.header('Authorization');
    const authQuery = c.req.query('auth_token');
    const token = authQuery || (authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null);
    if (token) {
        try {
            const payload = await jwtVerify(token, c.env.JWT_SECRET, 'HS256');
            userId = payload.sub;
        }
        catch (e) {
            console.warn('[OAuth] Failed to verify existing token for linking:', e);
        }
    }
    const challenge = crypto.randomUUID();
    const state = Buffer.from(JSON.stringify({ challenge, userId })).toString('base64');
    await setSignedCookie(c, 'oauth_state', state, c.env.JWT_SECRET, {
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'None',
        maxAge: 300,
    });
    const redirectUri = `${new URL(c.req.url).origin}/auth/callback/onedrive`;
    const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=files.readwrite%20offline_access%20User.Read&state=${state}`;
    return c.redirect(url);
});
auth.get('/callback/onedrive', async (c) => {
    const code = c.req.query('code');
    const state = c.req.query('state');
    const savedState = await getSignedCookie(c, c.env.JWT_SECRET, 'oauth_state');
    if (!code || !state || state !== savedState) {
        throw new HTTPException(401, { message: 'Invalid OAuth state or missing code' });
    }
    // Parse state for session context
    let sessionUserId = null;
    try {
        const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
        sessionUserId = decoded.userId;
    }
    catch (e) {
        console.warn('[OAuth] State decode failure:', e);
    }
    const authService = new AuthService(c.env);
    const tokenRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        body: new URLSearchParams({
            client_id: c.env.ONEDRIVE_CLIENT_ID || '',
            client_secret: c.env.ONEDRIVE_CLIENT_SECRET || '',
            code: code || '',
            grant_type: 'authorization_code',
            redirect_uri: `${new URL(c.req.url).origin}/auth/callback/onedrive`
        })
    });
    const tokenData = await tokenRes.json();
    const userRes = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    });
    const profile = await userRes.json();
    const socialProfile = {
        id: profile.id,
        email: profile.mail || profile.userPrincipalName,
        name: profile.displayName
    };
    const socialTokens = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in
    };
    if (sessionUserId) {
        // LINK MODE
        await authService.linkSocialAccount(sessionUserId, 'onedrive', socialProfile, socialTokens);
        await logAudit(c, 'user_identities', profile.id, 'LINK', null, { provider: 'onedrive', userId: sessionUserId });
        return c.redirect(`${c.env.ENVIRONMENT === 'production' ? 'https://ledger.gpnet.dev' : 'http://localhost:5173'}/#/settings`);
    }
    else {
        // LOGIN MODE
        const userId = await authService.findOrCreateSocialUser('onedrive', socialProfile, socialTokens);
        const token = await authService.generateToken(userId);
        return c.redirect(`${c.env.ENVIRONMENT === 'production' ? 'https://ledger.gpnet.dev' : 'http://localhost:5173'}/#/login?token=${token}`);
    }
});
// --- WEBAUTHN / PASSKEYS ---
auth.post('/passkeys/register-options', async (c) => {
    const userId = c.get('userId');
    const authService = new AuthService(c.env);
    const user = await c.env.DB.prepare('SELECT email, username FROM users WHERE id = ?').bind(userId).first();
    const passkeys = await c.env.DB.prepare('SELECT credential_id, transports FROM passkeys WHERE user_id = ?').bind(userId).all();
    const options = await generateRegistrationOptions({
        rpName: 'LEDGER',
        rpID: c.env.ENVIRONMENT === 'production' ? 'gpnet.dev' : 'localhost',
        userID: new TextEncoder().encode(userId),
        userName: user.username || user.email,
        attestationType: 'none',
        excludeCredentials: (passkeys.results || []).map((pk) => ({
            id: Buffer.from(pk.credential_id, 'base64'),
            type: 'public-key',
            transports: pk.transports ? JSON.parse(pk.transports) : [],
        })),
        authenticatorSelection: {
            residentKey: 'preferred',
            userVerification: 'preferred',
        },
    });
    await setSignedCookie(c, 'webauthn_challenge', options.challenge, c.env.JWT_SECRET, {
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'None',
        maxAge: 300,
    });
    return c.json(options);
});
auth.post('/passkeys/register-verify', zValidator('json', z.object({
    attestation: z.any(),
    name: z.string().optional()
})), async (c) => {
    const userId = c.get('userId');
    const { attestation, name } = c.req.valid('json');
    const expectedChallenge = await getSignedCookie(c, c.env.JWT_SECRET, 'webauthn_challenge');
    if (!expectedChallenge) {
        throw new HTTPException(401, { message: 'Invalid or expired WebAuthn challenge' });
    }
    const verification = await verifyRegistrationResponse({
        response: attestation,
        expectedChallenge,
        expectedOrigin: c.env.ENVIRONMENT === 'production' ? 'https://ledger.gpnet.dev' : 'http://localhost:5173',
        expectedRPID: c.env.ENVIRONMENT === 'production' ? 'gpnet.dev' : 'localhost',
    });
    if (!verification.verified || !verification.registrationInfo) {
        throw new HTTPException(400, { message: 'WebAuthn verification failed' });
    }
    const { credentialPublicKey, credentialId, counter } = verification.registrationInfo;
    const id = crypto.randomUUID();
    await c.env.DB.prepare('INSERT INTO passkeys (id, user_id, public_key, credential_id, name, aaguid, counter, transports) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(id, userId, Buffer.from(credentialPublicKey).toString('base64'), Buffer.from(credentialId).toString('base64'), name || 'New Passkey', verification.registrationInfo.aaguid || 'unknown', counter, JSON.stringify(attestation.response.transports || [])).run();
    await logAudit(c, 'passkeys', id, 'REGISTER', null, { name });
    // Trigger Security Alert
    const user = await c.env.DB.prepare('SELECT email FROM users WHERE id = ?').bind(userId).first();
    if (user?.email) {
        try {
            await new EmailService(c.env).sendSecurityAlertEmail(user.email, 'New Biometric Passkey Enrolled');
        }
        catch (e) {
            console.error('[Sentinel] Failed to send security alert:', e);
        }
    }
    return c.json({ success: true, id });
});
auth.patch('/passkeys/:id', zValidator('json', z.object({ name: z.string().min(1) })), async (c) => {
    const userId = c.get('userId');
    const { id } = c.req.param();
    const { name } = c.req.valid('json');
    const authService = new AuthService(c.env);
    await authService.updatePasskeyName(id, userId, name);
    await logAudit(c, 'passkeys', id, 'RENAME', null, { name });
    return c.json({ success: true });
});
auth.delete('/passkeys/:id', async (c) => {
    const userId = c.get('userId');
    const { id } = c.req.param();
    const authService = new AuthService(c.env);
    await authService.removePasskey(id, userId);
    await logAudit(c, 'passkeys', id, 'REMOVE', null, null);
    return c.json({ success: true });
});
auth.post('/passkeys/login-options', async (c) => {
    const options = await generateAuthenticationOptions({
        rpID: c.env.ENVIRONMENT === 'production' ? 'gpnet.dev' : 'localhost',
        allowCredentials: [], // Allow any credential for this RP
        userVerification: 'preferred',
    });
    await setSignedCookie(c, 'webauthn_challenge', options.challenge, c.env.JWT_SECRET, {
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'None',
        maxAge: 300,
    });
    return c.json(options);
});
auth.post('/passkeys/login-verify', async (c) => {
    const { assertion } = await c.req.json();
    const expectedChallenge = await getSignedCookie(c, c.env.JWT_SECRET, 'webauthn_challenge');
    if (!expectedChallenge) {
        throw new HTTPException(401, { message: 'Invalid or expired WebAuthn challenge' });
    }
    const passkey = await c.env.DB.prepare('SELECT * FROM passkeys WHERE credential_id = ? OR credential_id = ?')
        .bind(assertion.id, Buffer.from(assertion.id, 'base64').toString('base64')).first();
    if (!passkey)
        throw new HTTPException(401, { message: 'Passkey not recognized' });
    const verification = await verifyAuthenticationResponse({
        response: assertion,
        expectedChallenge,
        expectedOrigin: c.env.ENVIRONMENT === 'production' ? 'https://ledger.gpnet.dev' : 'http://localhost:5173',
        expectedRPID: c.env.ENVIRONMENT === 'production' ? 'gpnet.dev' : 'localhost',
        // @ts-ignore
        authenticator: {
            credentialId: Buffer.from(passkey.credential_id, 'base64'),
            credentialPublicKey: Buffer.from(passkey.public_key, 'base64'),
            counter: passkey.counter || 0,
        },
    });
    if (!verification.verified) {
        throw new HTTPException(401, { message: 'Authentication failed' });
    }
    // Update counter
    await c.env.DB.prepare('UPDATE passkeys SET counter = ? WHERE id = ?')
        .bind(verification.authenticationInfo.newCounter, passkey.id).run();
    const authService = new AuthService(c.env);
    const token = await authService.generateToken(passkey.user_id);
    await logAudit(c, 'users', passkey.user_id, 'login', null, { strategy: 'passkey' });
    return c.json({ token });
});
// --- PASSWORD LIFECYCLE (v2.4.0) ---
auth.post('/password/reset-request', zValidator('json', z.object({ identifier: z.string() })), async (c) => {
    const { identifier } = c.req.valid('json');
    const authService = new AuthService(c.env);
    const token = await authService.requestPasswordReset(identifier);
    // In a real app, this would send an email. For now, we'll return it in dev or log it.
    console.log(`[AUTH] Password reset requested for ${identifier}. Token: ${token}`);
    return c.json({ success: true, message: 'Check console for reset token (Development Mode)' });
});
auth.post('/password/reset', zValidator('json', z.object({ token: z.string(), newPassword: z.string().min(8) })), async (c) => {
    const { token, newPassword } = c.req.valid('json');
    const authService = new AuthService(c.env);
    await authService.resetPassword(token, newPassword);
    return c.json({ success: true });
});
auth.post('/password/change', zValidator('json', z.object({ newPassword: z.string().min(8) })), async (c) => {
    const userId = c.get('userId');
    const { newPassword } = c.req.valid('json');
    const authService = new AuthService(c.env);
    await authService.changePassword(userId, newPassword);
    await logAudit(c, 'users', userId, 'PASSWORD_CHANGE', null, null);
    // Trigger Security Alert
    const user = await c.env.DB.prepare('SELECT email FROM users WHERE id = ?').bind(userId).first();
    if (user?.email) {
        try {
            await new EmailService(c.env).sendSecurityAlertEmail(user.email, 'Account Password Modified');
        }
        catch (e) {
            console.error('[Sentinel] Failed to send security alert:', e);
        }
    }
    return c.json({ success: true });
});
// --- ADMIN INVITATIONS ---
auth.post('/admin/invite', async (c) => {
    // Requires authenticated super_admin or secret (for first time setup)
    // For simplicity here, we'll allow it if a super_admin is logged in
    if (c.get('globalRole') !== 'super_admin')
        throw new HTTPException(403, { message: 'Forbidden' });
    const authService = new AuthService(c.env);
    const token = await authService.createAdminInvite();
    return c.json({ token, url: `${c.env.ENVIRONMENT === 'production' ? 'https://ledger.gpnet.dev' : 'http://localhost:3000'}/claim?token=${token}` });
});
auth.post('/admin/claim', zValidator('json', z.object({
    token: z.string(),
    username: z.string().min(3),
    password: z.string().min(8),
    email: z.string().email()
})), async (c) => {
    const { token, username, password, email } = c.req.valid('json');
    const authService = new AuthService(c.env);
    const userId = await authService.consumeAdminInvite(token, username, password, email);
    await logAudit(c, 'users', userId, 'claim_invite', null, { username, email });
    return c.json({ success: true, userId });
});
export default auth;
