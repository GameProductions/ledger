import { webcrypto } from 'node:crypto';
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto as any;
}

import { verifyTOTP, generateTOTPSecret, generateTOTPToken } from './src/api/auth-utils';

async function test() {
  const secret = await generateTOTPSecret();
  console.log('Secret:', secret);
  
  const token = await generateTOTPToken(secret, Math.floor(Date.now() / 30000));
  console.log('Token:', token);
  
  const isValid = await verifyTOTP(secret, token);
  console.log('Is Valid:', isValid);
}

test().catch(console.error);
