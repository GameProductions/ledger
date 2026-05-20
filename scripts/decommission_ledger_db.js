/**
 * Decommissioning Script for Ledger D1 Database
 * Enqueues ledger-db to Foundation Purge Queue.
 */

const { execSync } = require('child_process');
const crypto = require('crypto').webcrypto;

const DATABASE_NAME = 'ledger-db';
const DATABASE_ID = '37cdc982-24b7-4c10-999b-62732e922476';
const FOUNDATION_DB_NAME = 'foundation-db';

// Convert hex string to ArrayBuffer
function hexStringToArrayBuffer(hexString) {
  const bytes = new Uint8Array(Math.ceil(hexString.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hexString.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes.buffer;
}

// Convert ArrayBuffer to hex string
function arrayBufferToHexString(arrayBuffer) {
  const byteArray = new Uint8Array(arrayBuffer);
  let hexString = '';
  for (let i = 0; i < byteArray.length; i++) {
    hexString += byteArray[i].toString(16).padStart(2, '0');
  }
  return hexString;
}

async function getCryptoKey(secret) {
  const msgUint8 = new TextEncoder().encode(secret);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);

  return await crypto.subtle.importKey(
    "raw",
    hashBuffer,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptData(plaintext, secret) {
  const key = await getCryptoKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedPlaintext = new TextEncoder().encode(plaintext);
  
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encodedPlaintext
  );
  
  return `${arrayBufferToHexString(iv.buffer)}:${arrayBufferToHexString(ciphertextBuffer)}`;
}

async function run() {
  const secret = process.env.ENCRYPTION_KEY || 'DEPRECATED';
  const payloadObj = {
    database_name: DATABASE_NAME,
    database_id: DATABASE_ID,
    decommissioned_at: new Date().toISOString(),
    reason: 'Migration to Neon PostgreSQL completed successfully'
  };
  
  const plaintext = JSON.stringify(payloadObj);
  console.log('Plaintext payload:', plaintext);
  
  const encrypted = await encryptData(plaintext, secret);
  const [iv, encryptedData] = encrypted.split(':');
  
  const deletionId = crypto.randomUUID();
  const activityId = crypto.randomUUID();
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days retention
  const expiresAtStr = expiresAt.toISOString();
  
  // Construct SQL commands
  const sqlScheduledDeletions = `INSERT INTO scheduled_deletions (id, source_system, category, record_id, encrypted_data, iv, status, expires_at) VALUES ('${deletionId}', 'ledger', 'd1_database', '${DATABASE_ID}', '${encryptedData}', '${iv}', 'PENDING', '${expiresAtStr}');`;
  const sqlDeletionQueueActivity = `INSERT INTO deletion_queue_activity (id, deletion_id, action, actor_id, details_json) VALUES ('${activityId}', '${deletionId}', 'ENQUEUED', 'system', '${JSON.stringify({ sourceSystem: 'ledger', category: 'd1_database', recordId: DATABASE_ID })}');`;

  console.log('\nGenerated SQL queries to enqueue database deletion:');
  console.log(sqlScheduledDeletions);
  console.log(sqlDeletionQueueActivity);

  // Ask if we should run against local D1 or remote D1
  const runRemote = process.argv.includes('--remote');
  const runLocal = process.argv.includes('--local') || !runRemote;

  const targetProjectDir = '/Users/morenicano/Documents/coding/projects/bots/foundation';

  if (runLocal) {
    console.log('\nRunning against LOCAL Foundation D1...');
    try {
      execSync(`npx wrangler d1 execute ${FOUNDATION_DB_NAME} --command="${sqlScheduledDeletions}"`, { cwd: targetProjectDir, stdio: 'inherit' });
      execSync(`npx wrangler d1 execute ${FOUNDATION_DB_NAME} --command="${sqlDeletionQueueActivity}"`, { cwd: targetProjectDir, stdio: 'inherit' });
      console.log('✓ Successfully enqueued database deletion in local database.');
    } catch (err) {
      console.error('✗ Failed to run local commands:', err.message);
    }
  }

  if (runRemote) {
    console.log('\nRunning against REMOTE Production Foundation D1...');
    try {
      execSync(`npx wrangler d1 execute ${FOUNDATION_DB_NAME} --remote --command="${sqlScheduledDeletions}"`, { cwd: targetProjectDir, stdio: 'inherit' });
      execSync(`npx wrangler d1 execute ${FOUNDATION_DB_NAME} --remote --command="${sqlDeletionQueueActivity}"`, { cwd: targetProjectDir, stdio: 'inherit' });
      console.log('✓ Successfully enqueued database deletion in remote production database.');
    } catch (err) {
      console.error('✗ Failed to run remote commands:', err.message);
    }
  }
}

run().catch(console.error);
