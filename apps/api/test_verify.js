import { verifyKey } from 'discord-interactions';

const body = '{"type":1}';
const signature = '';
const timestamp = '';
const publicKey = 'replace-me';

const isValid = await verifyKey(body, signature, timestamp, publicKey);
console.log('Is valid (awaited):', isValid);
