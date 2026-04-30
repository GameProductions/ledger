import { eq, and } from 'drizzle-orm';
import { vault } from '#/schema';
import { encryptData, decryptData } from './security';

export type SecretType = 
    | 'OAUTH_ACCESS' 
    | 'OAUTH_REFRESH' 
    | 'TOTP_SECRET' 
    | 'RECOVERY_CODE' 
    | 'API_KEY' 
    | 'WEBHOOK_URL'
    | 'WEBHOOK_SECRET'
    | 'EXTERNAL_CONNECTION_TOKEN';

export class VaultService {
    constructor(private db: any, private encryptionKey: string) {}

    /**
     * Stores a secret in the vault, encrypted at rest.
     */
    async setSecret(userId: string, type: SecretType, identifier: string | null, plaintext: string) {
        const full = await encryptData(plaintext, this.encryptionKey);
        const [iv, encryptedData] = full.split(':');
        
        // Check if exists to update or insert
        const existing = await this.db.select().from(vault).where(
            and(
                eq(vault.userId, userId),
                eq(vault.secretType, type),
                identifier ? eq(vault.keyIdentifier, identifier) : eq(vault.keyIdentifier, '')
            )
        ).limit(1);

        if (existing.length > 0) {
            await this.db.update(vault).set({
                encryptedData,
                iv,
                lastAccessedAt: new Date().toISOString()
            }).where(eq(vault.id, existing[0].id));
        } else {
            await this.db.insert(vault).values({
                id: crypto.randomUUID(),
                userId,
                secretType: type,
                keyIdentifier: identifier || '',
                encryptedData,
                iv
            });
        }
    }

    /**
     * Retrieves and decrypts a secret from the vault.
     */
    async getSecret(userId: string, type: SecretType, identifier: string | null): Promise<string | null> {
        const result = await this.db.select().from(vault).where(
            and(
                eq(vault.userId, userId),
                eq(vault.secretType, type),
                identifier ? eq(vault.keyIdentifier, identifier) : eq(vault.keyIdentifier, '')
            )
        ).limit(1);

        if (result.length === 0) return null;

        const record = result[0];
        
        // Update last accessed
        await this.db.update(vault).set({
            lastAccessedAt: new Date().toISOString()
        }).where(eq(vault.id, record.id));

        return await decryptData(`${record.iv}:${record.encryptedData}`, this.encryptionKey);
    }

    /**
     * Deletes a secret from the vault.
     */
    async deleteSecret(userId: string, type: SecretType, identifier: string | null) {
        await this.db.delete(vault).where(
            and(
                eq(vault.userId, userId),
                eq(vault.secretType, type),
                identifier ? eq(vault.keyIdentifier, identifier) : eq(vault.keyIdentifier, '')
            )
        );
    }
}
