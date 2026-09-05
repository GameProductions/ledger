import { eq, and } from 'drizzle-orm';
import { vault_v2 as vault } from '#/schema';
import { encryptData, decryptData } from '../utils/security';

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
    | string;

export class VaultService {
    constructor(private db: any, private encryptionKey: string) {}

    /**
     * Stores a secret in the vault.
     */
    async setSecret(ownerId: string, keyName: SecretKeyName, scope: SecretScope, plaintext: string) {
        const full = (await encryptData(plaintext, this.encryptionKey) as any);
        const [iv, encryptedValue] = full.split(':');
        
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
            return existing[0].id;
        } else {
            const id = crypto.randomUUID();
            await this.db.insert(vault).values({
                id,
                ownerId,
                keyName,
                scope,
                encryptedValue,
                iv,
                version: 1
            });
            return id;
        }
    }

    async store(ownerId: string, keyName: string, scope: string, plaintext: string) {
        return this.setSecret(ownerId, keyName, scope, plaintext);
    }

    /**
     * Retrieves a secret from the vault.
     */
    async getSecret(ownerId: string, keyName: SecretKeyName, scope: SecretScope): Promise<string | null> {
        try {
            const result = (await this.db.select().from(vault).where(
                and(
                    eq(vault.ownerId, ownerId),
                    eq(vault.keyName, keyName),
                    eq(vault.scope, scope)
                )
            ).limit(1) as any);

            if (result.length === 0) return null;

            const item = result[0];
            return await decryptData(`${item.iv}:${item.encryptedValue}`, this.encryptionKey);
        } catch {
            return null;
        }
    }

    async get(ownerId: string, keyName: string, scope: string): Promise<string | null> {
        return this.getSecret(ownerId, keyName, scope);
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
