/**
 * Cryptography Utilities for Ledger (Standardized)
 */

// Helper to convert hex string to ArrayBuffer
function hexStringToArrayBuffer(hexString: string): ArrayBuffer {
    const bytes = new Uint8Array(Math.ceil(hexString.length / 2));
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hexString.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes.buffer;
}

// Helper to convert ArrayBuffer to hex string
function arrayBufferToHexString(arrayBuffer: ArrayBuffer): string {
    const byteArray = new Uint8Array(arrayBuffer);
    let hexString = '';
    for (let i = 0; i < byteArray.length; i++) {
        hexString += byteArray[i].toString(16).padStart(2, '0');
    }
    return hexString;
}

async function getCryptoKey(secret: string): Promise<CryptoKey> {
    // SHA-256 the secret to ensure we always have a consistent 256-bit (32-byte) key
    const msgUint8 = new TextEncoder().encode(secret);
    const hashBuffer = (await crypto.subtle.digest('SHA-256', msgUint8) as any);

    return await crypto.subtle.importKey(
        "raw",
        hashBuffer,
        { name: "AES-GCM" },
        false,
        ["encrypt", "decrypt"]
    );
}

/**
 * Encrypts a string using AES-GCM.
 * Returns a string format of `ivHex:ciphertextHex`.
 */
export async function encryptData(plaintext: string, secret: string): Promise<string> {
    const key = (await getCryptoKey(secret) as any);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encodedPlaintext = new TextEncoder().encode(plaintext);
    
    const ciphertextBuffer = (await crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            key,
            encodedPlaintext
        ) as any);
    
    const ivHex = arrayBufferToHexString(iv.buffer);
    const ciphertextHex = arrayBufferToHexString(ciphertextBuffer);
    
    return `${ivHex}:${ciphertextHex}`;
}

/**
 * Decrypts a string formatted as `ivHex:ciphertextHex` using AES-GCM.
 */
export async function decryptData(encryptedData: string, secret: string): Promise<string> {
    const parts = encryptedData.split(':');
    if (parts.length !== 2) {
        throw new Error("Invalid encrypted data format");
    }
    
    const ivHex = parts[0];
    const ciphertextHex = parts[1];
    
    const key = (await getCryptoKey(secret) as any);
    const iv = hexStringToArrayBuffer(ivHex);
    const ciphertextBuffer = hexStringToArrayBuffer(ciphertextHex);
    
    const decryptedBuffer = (await crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: new Uint8Array(iv)
            },
            key,
            ciphertextBuffer
        ) as any);
    
    return new TextDecoder().decode(decryptedBuffer);
}

/**
 * Generates a SHA-256 hash of a string.
 */
export async function hashToken(token: string): Promise<string> {
    const msgUint8 = new TextEncoder().encode(token);
    const hashBuffer = (await crypto.subtle.digest('SHA-256', msgUint8) as any);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- NATIVE BASE64URL HELPERS (Buffer-free) ---
export function base64ToUint8Array(base64: string): Uint8Array {
  const standard = base64.replace(/-/g, '+').replace(/_/g, '/');
  const binaryString = atob(standard);
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
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * 🔒 SHA-256 Hash for Zero-Knowledge Lookups
 */
export async function hashIdentifier(id: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = (encoder.encode(id) as any);
  const hashBuffer = (await crypto.subtle.digest('SHA-256', data) as any);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
