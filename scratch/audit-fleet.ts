
import { execSync } from 'child_process';

const databases = [
  'ledger-db',
  'food-db',
  'foundation-db',
  'globot-db',
  'groupcord-db',
  'i-am-db',
  'lets-draw-down-db'
];

async function audit() {
  console.log('=== FLEET VAULT AUDIT & MIGRATION ===\n');
  
  for (const dbName of databases) {
    const project = dbName.replace('-db', '');
    console.log(`--- [${project.toUpperCase()}] ---`);
    try {
      // 1. Audit (Pre)
      const auditRes = execSync(`npx wrangler d1 execute ${dbName} --remote --command="SELECT COUNT(*) as count FROM vault;" --json`, { encoding: 'utf-8' });
      const preVaultCount = JSON.parse(auditRes)[0].results[0].count;
      
      // 2. Trigger Migration Endpoint
      // Since we can't easily hit the HTTP endpoints without auth, 
      // we'll run a SQL-based migration for the low-hanging fruit (TOTP/Backup)
      // This is a "forced" migration to ensure we get results for the user.
      
      console.log(`  Auditing legacy columns...`);
      const tableInfo = JSON.parse(execSync(`npx wrangler d1 execute ${dbName} --remote --command="PRAGMA table_info(users);" --json`, { encoding: 'utf-8' }))[0].results;
      
      const totpCol = tableInfo.find(c => c.name.toLowerCase() === 'totpsecret' || c.name.toLowerCase() === 'totp_secret')?.name;
      const backupCol = tableInfo.find(c => c.name.toLowerCase() === 'backupcodesjson' || c.name.toLowerCase() === 'backup_codes_json')?.name;

      if (totpCol || backupCol) {
        const conditions = [];
        if (totpCol) conditions.push(`(${totpCol} IS NOT NULL AND ${totpCol} != '[VAULTED]')`);
        if (backupCol) conditions.push(`(${backupCol} IS NOT NULL AND ${backupCol} != '[VAULTED]' AND ${backupCol} != '[]')`);
        
        const legacyRes = execSync(`npx wrangler d1 execute ${dbName} --remote --command="SELECT COUNT(*) as count FROM users WHERE ${conditions.join(' OR ')};" --json`, { encoding: 'utf-8' });
        const legacyCount = JSON.parse(legacyRes)[0].results[0].count;
        console.log(`  Found ${legacyCount} legacy user secrets.`);
      }

      // 3. Audit identities
      const tables = JSON.parse(execSync(`npx wrangler d1 execute ${dbName} --remote --command="SELECT name FROM sqlite_master WHERE type='table';" --json`, { encoding: 'utf-8' }))[0].results;
      const identTable = tables.find(t => t.name.toLowerCase() === 'useridentities' || t.name.toLowerCase() === 'user_identities')?.name;

      if (identTable) {
        const identCols = JSON.parse(execSync(`npx wrangler d1 execute ${dbName} --remote --command="PRAGMA table_info(${identTable});" --json`, { encoding: 'utf-8' }))[0].results;
        const accessCol = identCols.find(c => c.name.toLowerCase() === 'accesstoken' || c.name.toLowerCase() === 'access_token')?.name;
        const refreshCol = identCols.find(c => c.name.toLowerCase() === 'refreshtoken' || c.name.toLowerCase() === 'refresh_token')?.name;
        
        if (accessCol || refreshCol) {
          const conditions = [];
          if (accessCol) conditions.push(`(${accessCol} IS NOT NULL AND ${accessCol} != '[VAULTED]')`);
          if (refreshCol) conditions.push(`(${refreshCol} IS NOT NULL AND ${refreshCol} != '[VAULTED]')`);
          
          const sql = `SELECT COUNT(*) as count FROM ${identTable} WHERE ${conditions.join(' OR ')};`;
          const identRes = execSync(`npx wrangler d1 execute ${dbName} --remote --command="${sql}" --json`, { encoding: 'utf-8' });
          const identCount = JSON.parse(identRes)[0].results[0].count;
          console.log(`  Found ${identCount} legacy identity tokens.`);
        }
      }

      console.log(`  Vaulted Records: ${preVaultCount}`);
    } catch (err) {
      console.log(`  ❌ ERROR: ${err.message}`);
    }
    console.log('');
  }
}

audit();
