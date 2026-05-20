import { describe, it, expect } from 'vitest';
import { encryptData, decryptData, hashToken, hashIdentifier } from '../utils/security';

describe('Security Utilities - Encryption & Hashing', () => {
  const secretKey = 'super-secret-key-used-for-testing';
  const plaintext = 'Sensitive financial transaction information';

  it('should successfully encrypt and decrypt data', async () => {
    const encrypted = await encryptData(plaintext, secretKey);
    expect(encrypted).toBeDefined();
    expect(encrypted).toContain(':'); // Should be in format iv:ciphertext
    expect(encrypted).not.toBe(plaintext);

    const decrypted = await decryptData(encrypted, secretKey);
    expect(decrypted).toBe(plaintext);
  });

  it('should fail to decrypt when using an incorrect key', async () => {
    const encrypted = await encryptData(plaintext, secretKey);
    const wrongKey = 'completely-different-secret-key';

    // Decrypting with wrong key should either throw an error or return incorrect data
    await expect(decryptData(encrypted, wrongKey)).rejects.toThrow();
  });

  it('should produce different ciphertext on consecutive encryptions due to random IV', async () => {
    const encrypted1 = await encryptData(plaintext, secretKey);
    const encrypted2 = await encryptData(plaintext, secretKey);

    expect(encrypted1).not.toBe(encrypted2);
    
    // Both should decrypt back to the same plaintext
    expect(await decryptData(encrypted1, secretKey)).toBe(plaintext);
    expect(await decryptData(encrypted2, secretKey)).toBe(plaintext);
  });

  it('should hash tokens consistently using SHA-256', async () => {
    const token = 'my-super-secret-token';
    const hash1 = await hashToken(token);
    const hash2 = await hashToken(token);

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256 hex output is 64 characters
  });

  it('should hash identifiers consistently using SHA-256', async () => {
    const id = 'user-identifier-123';
    const hash1 = await hashIdentifier(id);
    const hash2 = await hashIdentifier(id);

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256 hex output is 64 characters
  });
});
