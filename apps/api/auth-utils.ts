/**
 * LEDGER Auth Utilities
 * Implements TOTP (RFC 6238) and WebAuthn helpers using Web Crypto API.
 */
import { Buffer } from 'node:buffer'

// --- BASE32 UTILS ---
const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function base32Encode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let bits = 0
  let value = 0
  let output = ''
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i]
    bits += 8
    while (bits >= 5) {
      output += B32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) {
    output += B32_ALPHABET[(value << (5 - bits)) & 31]
  }
  return output
}

export function base32Decode(str: string): Uint8Array {
  str = str.toUpperCase().replace(/=+$/, '')
  let bits = 0
  let value = 0
  const output = new Uint8Array((str.length * 5) / 8 | 0)
  let index = 0
  for (let i = 0; i < str.length; i++) {
    const val = B32_ALPHABET.indexOf(str[i])
    if (val === -1) throw new Error('Invalid base32 character')
    value = (value << 5) | val
    bits += 5
    if (bits >= 8) {
      output[index++] = (value >>> (bits - 8)) & 255
      bits -= 8
    }
  }
  return output
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

// --- TOTP UTILS ---
export async function generateTOTPSecret(): Promise<string> {
  const bytes = crypto.getRandomValues(new Uint8Array(20))
  return base32Encode(bytes.buffer)
}

export async function generateTOTPToken(secret: string, counter: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    base32Decode(secret) as any,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  )

  const counterBuffer = new ArrayBuffer(8)
  const view = new DataView(counterBuffer)
  view.setUint32(4, counter) // Standard counter is 8-byte, we use bottom 4 bytes
  
  const signature = await crypto.subtle.sign('HMAC', key, counterBuffer)
  const hmac = new Uint8Array(signature)
  const offset = hmac[hmac.length - 1] & 0xf
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)

  const otp = binary % 1000000
  return otp.toString().padStart(6, '0')
}

export async function verifyTOTP(secret: string, token: string, window = 1): Promise<boolean> {
  const counter = Math.floor(Date.now() / 30000)
  for (let i = -window; i <= window; i++) {
    if (timingSafeEqual(await generateTOTPToken(secret, counter + i), token)) {
      return true
    }
  }
  return false
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
  const saltBase64 = Buffer.from(salt).toString('base64')
  const hashBase64 = Buffer.from(derivedBits).toString('base64')
  return `${DEFAULT_ITERATIONS}.${saltBase64}.${hashBase64}`
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const [iterations, saltBase64, expectedHashBase64] = storedHash.split('.')
    const salt = new Uint8Array(Buffer.from(saltBase64, 'base64'))
    
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
    const actualHashBase64 = Buffer.from(derivedBits).toString('base64')
    
    const isMatched = timingSafeEqual(actualHashBase64, expectedHashBase64)
    if (!isMatched) console.warn('[Auth] Password hash mismatch')
    return isMatched
  } catch (e: any) {
    console.error('[Auth] Password verification error:', e.message)
    return false
  }
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const buf = Buffer.from(base64.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
}
