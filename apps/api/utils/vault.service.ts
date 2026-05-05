import { eq, and } from 'drizzle-orm';
import { vault_v2 as vault } from '#/schema';
import { encryptData, decryptData } from './security';

export type SecretScope = 'system' | 'discord' | 'google' | 'internal' | 'webhook' | string;
export type SecretKeyName = 
    | 'OAUTH_ACCESS' 
    | 'OAUTH_REFRESH' 
    | 'TOTP_SECRET' 
    | 'RECOVERY_CODES' 
    | 'API_KEY' 
    | 'WEBHOOK_URL'
    | 'WEBHOOK_SECRET'
    | 'EXTERNAL_CONNECTION_TOKEN'
    | 'PASSKEY_PUBLIC_KEY'
    | 'CREDENTIAL_ID'
    | string;

export class VaultService {
    constructor(private db: any, private encryptionKey: string) {}

    /**
     * Stores a secret in the vault, encrypted at rest.
     */
    async setSecret(ownerId: string, keyName: SecretKeyName, scope: SecretScope, plaintext: string) {
        const full = await encryptData(plaintext, this.encryptionKey);
        const [iv, encryptedValue] = full.split(':');
        
        // Check if exists to update or insert
        const existing = await this.db.select().from(vault).where(
            and(
                eq(vault.ownerId, ownerId),
                eq(vault.keyName, keyName),
                eq(vault.scope, scope)
            )
        ).limit(1);

        if (existing.length > 0) {
            await this.db.update(vault).set({
                encryptedValue,
                iv,
                version: (existing[0].version || 1) + 1,
                updatedAt: new Date().toISOString()
            }).where(eq(vault.id, existing[0].id));
        } else {
            await this.db.insert(vault).values({
                id: crypto.randomUUID(),
                ownerId,
                keyName,
                scope,
                encryptedValue,
                iv,
                version: 1
            });
        }
    }

    /**
     * Retrieves and decrypts a secret from the vault.
     */
    async getSecret(ownerId: string, keyName: SecretKeyName, scope: SecretScope): Promise<string | null> {
        const result = await this.db.select().from(vault).where(
            and(
                eq(vault.ownerId, ownerId),
                eq(vault.keyName, keyName),
                eq(vault.scope, scope)
            )
        ).limit(1);

        if (result.length === 0) return null;

        const record = result[0];
        
        return await decryptData(`${record.iv}:${record.encryptedValue}`, this.encryptionKey);
    }

    /**
     * Deletes a secret from the vault.
     */
    async deleteSecret(ownerId: string, keyName: SecretKeyName, scope: SecretScope) {
        await this.db.delete(vault).where(
            and(
                eq(vault.ownerId, ownerId),
                eq(vault.keyName, keyName),
                eq(vault.scope, scope)
            )
        );
    }
}
