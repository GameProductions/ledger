/**
 * LEDGER Auth Utilities
 * Implements TOTP (RFC 6238) and WebAuthn helpers using Web Crypto API.
 */

// --- NATIVE BASE64 HELPERS (Buffer-free) ---
export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// --- TIMING SAFE EQUAL POLYFILL (Fleet Hardening) ---
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}


import { 
  verifyRegistrationResponse, 
  verifyAuthenticationResponse,
  VerifyRegistrationResponseOpts,
  VerifyAuthenticationResponseOpts
} from '@simplewebauthn/server';

// --- WEBAUTHN UTILS (Industrial Verified) ---
export async function verifyWebAuthnAssertion(
  options: VerifyAuthenticationResponseOpts
): Promise<boolean> {
  try {
    const verification = await verifyAuthenticationResponse(options);
    return verification.verified;
  } catch (e) {
    console.error('[WebAuthn] Assertion verification failed', e);
    return false;
  }
}

export async function verifyWebAuthnRegistration(
  options: VerifyRegistrationResponseOpts
): Promise<{ success: boolean; registrationInfo?: any }> {
  try {
    const verification = await verifyRegistrationResponse(options);
    return { 
      success: verification.verified, 
      registrationInfo: verification.registrationInfo 
    };
  } catch (e) {
    console.error('[WebAuthn] Registration verification failed', e);
    return { success: false };
  }
}

// --- PASSWORD HASHING (PBKDF2) ---
const DEFAULT_ITERATIONS = 100000

export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits', 'deriveKey']
  )
  const pbkdf2Params = {
    name: 'PBKDF2',
    salt,
    iterations: DEFAULT_ITERATIONS,
    hash: 'SHA-256'
  }
  const derivedBits = await crypto.subtle.deriveBits(pbkdf2Params, keyMaterial, 256)
  
  // Format: iterations.salt_base64.hash_base64
  const saltBase64 = uint8ArrayToBase64(salt)
  const hashBase64 = uint8ArrayToBase64(new Uint8Array(derivedBits))
  return `${DEFAULT_ITERATIONS}.${saltBase64}.${hashBase64}`
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const [iterations, saltBase64, expectedHashBase64] = storedHash.split('.')
    const salt = base64ToUint8Array(saltBase64)
    
    const encoder = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
      'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits', 'deriveKey']
    )
    const pbkdf2Params = {
      name: 'PBKDF2',
      salt,
      iterations: parseInt(iterations),
      hash: 'SHA-256'
    }
    const derivedBits = await crypto.subtle.deriveBits(pbkdf2Params, keyMaterial, 256)
    const actualHashBase64 = uint8ArrayToBase64(new Uint8Array(derivedBits))
    
    const isMatched = timingSafeEqual(actualHashBase64, expectedHashBase64)
    if (!isMatched) console.warn('[Auth] Password hash mismatch')
    return isMatched
  } catch (e: any) {
    console.error('[Auth] Password verification error:', e.message)
    return false
  }
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
