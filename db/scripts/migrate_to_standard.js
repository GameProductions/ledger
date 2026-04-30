const fs = require('fs');
const crypto = require('crypto');

// CONFIG
const ENCRYPTION_SECRET = process.argv[2] || 'ledger-super-secret-key-2026';
const BACKUP_DIR = 'db/backups';
const OUTPUT_FILE = 'db/scripts/apply_standard_data.sql';

function encrypt(text, secret) {
    const iv = crypto.randomBytes(12);
    const key = crypto.createHash('sha256').update(secret).digest();
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    // Format: ivHex:ciphertextHex+authTagHex
    return {
        iv: iv.toString('hex'),
        encryptedData: encrypted + authTag
    };
}

const users = JSON.parse(fs.readFileSync(`${BACKUP_DIR}/users.json`, 'utf8'))[0].results;
const households = JSON.parse(fs.readFileSync(`${BACKUP_DIR}/households.json`, 'utf8'))[0].results;
const userHouseholds = JSON.parse(fs.readFileSync(`${BACKUP_DIR}/user_households.json`, 'utf8'))[0].results;
const userIdentities = JSON.parse(fs.readFileSync(`${BACKUP_DIR}/user_identities.json`, 'utf8'))[0].results;

let sql = '-- STANDARDIZED DATA IMPORT\nPRAGMA foreign_keys = OFF;\n\n';

// 1. Households
households.forEach(h => {
    sql += `INSERT INTO households (id, name, createdAt, currency, countryCode, unallocatedBalanceCents, status) VALUES ('${h.id}', '${h.name.replace(/'/g, "''")}', '${h.created_at}', '${h.currency}', '${h.country_code}', ${h.unallocated_balance_cents}, '${h.status}');\n`;
});

// 2. Users & Vault (TOTP)
users.forEach(u => {
    sql += `INSERT INTO users (id, email, displayName, username, passwordHash, avatarUrl, globalRole, status, lastActiveAt, forcePasswordChange, passkeyVerifiedAt, totpEnabled, createdAt, failedLoginAttempts, lockoutUntil, backupCodesJson, locale, themePreference) VALUES ('${u.id}', '${u.email}', ${u.display_name ? `'${u.display_name.replace(/'/g, "''")}'` : 'NULL'}, '${u.username}', '${u.password_hash}', ${u.avatar_url ? `'${u.avatar_url}'` : 'NULL'}, '${u.global_role}', '${u.status}', ${u.last_active_at ? `'${u.last_active_at}'` : 'NULL'}, ${u.force_password_change}, ${u.passkey_verified_at ? `'${u.passkey_verified_at}'` : 'NULL'}, ${u.totp_enabled}, '${u.created_at}', ${u.failed_login_attempts}, ${u.lockout_until ? `'${u.lockout_until}'` : 'NULL'}, '${u.backup_codes_json}', '${u.locale || 'en-US'}', '${u.theme || 'system'}');\n`;
    
    if (u.totp_secret) {
        const encrypted = encrypt(u.totp_secret, ENCRYPTION_SECRET);
        const vaultId = crypto.randomUUID();
        sql += `INSERT INTO vault (id, userId, secretType, keyIdentifier, encryptedData, iv, createdAt) VALUES ('${vaultId}', '${u.id}', 'TOTP_SECRET', 'primary', '${encrypted.encryptedData}', '${encrypted.iv}', CURRENT_TIMESTAMP);\n`;
    }
});

// 3. User Households
userHouseholds.forEach(uh => {
    sql += `INSERT INTO userHouseholds (userId, householdId, role) VALUES ('${uh.user_id}', '${uh.household_id}', '${uh.role}');\n`;
});

// 4. User Identities & Vault (Tokens)
userIdentities.forEach(ui => {
    sql += `INSERT INTO userIdentities (id, userId, provider, providerUserId, email, name, avatarUrl, createdAt, updatedAt) VALUES ('${ui.id}', '${ui.user_id}', '${ui.provider}', '${ui.provider_user_id}', ${ui.email ? `'${ui.email}'` : 'NULL'}, ${ui.name ? `'${ui.name.replace(/'/g, "''")}'` : 'NULL'}, ${ui.avatar_url ? `'${ui.avatar_url}'` : 'NULL'}, '${ui.created_at}', '${ui.updated_at}');\n`;
    
    if (ui.access_token) {
        const encrypted = encrypt(ui.access_token, ENCRYPTION_SECRET);
        const vaultId = crypto.randomUUID();
        sql += `INSERT INTO vault (id, userId, secretType, keyIdentifier, encryptedData, iv, createdAt) VALUES ('${vaultId}', '${ui.user_id}', 'OAUTH_ACCESS', '${ui.provider}', '${encrypted.encryptedData}', '${encrypted.iv}', CURRENT_TIMESTAMP);\n`;
    }
    
    if (ui.refresh_token) {
        const encrypted = encrypt(ui.refresh_token, ENCRYPTION_SECRET);
        const vaultId = crypto.randomUUID();
        sql += `INSERT INTO vault (id, userId, secretType, keyIdentifier, encryptedData, iv, createdAt) VALUES ('${vaultId}', '${ui.user_id}', 'OAUTH_REFRESH', '${ui.provider}', '${encrypted.encryptedData}', '${encrypted.iv}', CURRENT_TIMESTAMP);\n`;
    }
});

sql += '\nPRAGMA foreign_keys = ON;\n';

fs.writeFileSync(OUTPUT_FILE, sql);
console.log(`Generated ${OUTPUT_FILE}`);
