import { webcrypto } from 'node:crypto';
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto as any;
}

import { generateTOTPToken } from './src/api/auth-utils';

async function test() {
  const secret = 'EBLUKHXWHUBW5YPFRVJCE562LG7PSCG5';
  const token = await generateTOTPToken(secret, Math.floor(Date.now() / 30000));
  console.log(token);
}

test().catch(console.error);
