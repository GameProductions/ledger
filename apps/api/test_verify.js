import { Buffer } from 'node:buffer';

const DEFAULT_ITERATIONS = 100000;

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits', 'deriveKey']
  );
  const pbkdf2Params = {
    name: 'PBKDF2',
    salt,
    iterations: DEFAULT_ITERATIONS,
    hash: 'SHA-256'
  };
  const derivedBits = await crypto.subtle.deriveBits(pbkdf2Params, keyMaterial, 256);
  
  const saltBase64 = Buffer.from(salt).toString('base64');
  const hashBase64 = Buffer.from(new Uint8Array(derivedBits)).toString('base64');
  return `${DEFAULT_ITERATIONS}.${saltBase64}.${hashBase64}`;
}

async function verifyPassword(password, storedHash) {
  try {
    const [iterations, saltBase64, expectedHashBase64] = storedHash.split('.');
    const salt = Buffer.from(saltBase64, 'base64');
    
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits', 'deriveKey']
    );
    const pbkdf2Params = {
      name: 'PBKDF2',
      salt,
      iterations: parseInt(iterations),
      hash: 'SHA-256'
    };
    const derivedBits = await crypto.subtle.deriveBits(pbkdf2Params, keyMaterial, 256);
    const actualHashBase64 = Buffer.from(new Uint8Array(derivedBits)).toString('base64');
    
    return actualHashBase64 === expectedHashBase64;
  } catch (e) {
    return false;
  }
}

async function runTest() {
  const password = "Password123!";
  console.log("Hashing...");
  const hash = await hashPassword(password);
  console.log("Hash:", hash);
  console.log("Verifying...");
  const isMatch = await verifyPassword(password, hash);
  console.log("Match:", isMatch);
  if (!isMatch) console.error("MISMATCH DETECTED!");
}

runTest();
