import { eq, and } from 'drizzle-orm';
import { vault } from '#/schema';
import { encryptData, decryptData } from '../utils/security';

export class VaultService {
    constructor(private db: any, private encryptionKey: string) {}

    /**
     * Stores a secret in the vault.
     */
    async store(userId: string, secretType: string, keyIdentifier: string | null, plaintext: string) {
        const full = await encryptData(plaintext, this.encryptionKey);
        const [iv, encryptedData] = full.split(':');
        const id = crypto.randomUUID();

        // Check for existing secret of same type/identifier and overwrite or create new?
        // Standardizing on 'latest wins' or multiple allowed? 
        // For TOTP/Tokens, usually latest wins.
        
        await this.db.insert(vault).values({
            id,
            userId,
            secretType,
            keyIdentifier,
            encryptedData,
            iv,
            createdAt: new Date().toISOString()
        }).onConflictDoUpdate({
            target: [vault.userId, vault.secretType, vault.keyIdentifier],
            set: { encryptedData, iv, createdAt: new Date().toISOString() }
        });

        return id;
    }

    /**
     * Retrieves a secret from the vault.
     */
    async get(userId: string, secretType: string, keyIdentifier: string | null): Promise<string | null> {
        const result = await this.db.select().from(vault).where(
            and(
                eq(vault.userId, userId),
                eq(vault.secretType, secretType),
                keyIdentifier ? eq(vault.keyIdentifier, keyIdentifier) : undefined
            )
        ).limit(1);

        if (result.length === 0) return null;

        const item = result[0];
        return await decryptData(`${item.iv}:${item.encryptedData}`, this.encryptionKey);
    }
}
