import { eq, and } from 'drizzle-orm';
import { vault } from '#/schema';
import { encryptData, decryptData } from '../utils/security';

export class VaultService {
    constructor(private db: any, private encryptionKey: string) {}

    /**
     * Stores a secret in the vault.
     */
    async store(ownerId: string, keyName: string, scope: string, plaintext: string) {
        const full = await encryptData(plaintext, this.encryptionKey);
        const [iv, encryptedValue] = full.split(':');
        const id = crypto.randomUUID();
        
        await this.db.insert(vault).values({
            id,
            ownerId,
            keyName,
            scope,
            encryptedValue,
            iv,
            updatedAt: new Date().toISOString()
        }).onConflictDoUpdate({
            target: [vault.ownerId, vault.keyName, vault.scope],
            set: { encryptedValue, iv, updatedAt: new Date().toISOString() }
        });

        return id;
    }

    /**
     * Retrieves a secret from the vault.
     */
    async get(ownerId: string, keyName: string, scope: string): Promise<string | null> {
        const result = await this.db.select().from(vault).where(
            and(
                eq(vault.ownerId, ownerId),
                eq(vault.keyName, keyName),
                eq(vault.scope, scope)
            )
        ).limit(1);

        if (result.length === 0) return null;

        const item = result[0];
        return await decryptData(`${item.iv}:${item.encryptedValue}`, this.encryptionKey);
    }
}
