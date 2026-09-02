/**
 * 🔒 Web Crypto Ed25519 Signature Verification
 * Zero-dependency Discord webhook signature verifier optimized for Cloudflare Workers.
 */

function hexToUint8Array(hex: string): Uint8Array {
  const match = hex.match(/.{1,2}/g);
  if (!match) return new Uint8Array(0);
  return new Uint8Array(match.map(byte => parseInt(byte, 16)));
}

export async function verifyDiscordWebhook(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
  clientPublicKey: string
): Promise<boolean> {
  if (!signature || !timestamp || !clientPublicKey) {
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const message = encoder.encode(timestamp + rawBody);
    const signatureBytes = hexToUint8Array(signature);
    const publicKeyBytes = hexToUint8Array(clientPublicKey);

    const key = await crypto.subtle.importKey(
      'raw',
      publicKeyBytes.buffer.slice(publicKeyBytes.byteOffset, publicKeyBytes.byteOffset + publicKeyBytes.byteLength) as ArrayBuffer,
      { name: 'NODE-ED25519', namedCurve: 'NODE-ED25519' },
      false,
      ['verify']
    );

    return await crypto.subtle.verify(
      'NODE-ED25519',
      key,
      signatureBytes.buffer.slice(signatureBytes.byteOffset, signatureBytes.byteOffset + signatureBytes.byteLength) as ArrayBuffer,
      message
    );
  } catch (err) {
    // Subtle fallback for standard Ed25519 algorithm naming
    try {
      const encoder = new TextEncoder();
      const message = encoder.encode(timestamp + rawBody);
      const signatureBytes = hexToUint8Array(signature);
      const publicKeyBytes = hexToUint8Array(clientPublicKey);

      const key = await crypto.subtle.importKey(
        'raw',
        publicKeyBytes.buffer.slice(publicKeyBytes.byteOffset, publicKeyBytes.byteOffset + publicKeyBytes.byteLength) as ArrayBuffer,
        { name: 'Ed25519' },
        false,
        ['verify']
      );

      return await crypto.subtle.verify(
        'Ed25519',
        key,
        signatureBytes.buffer.slice(signatureBytes.byteOffset, signatureBytes.byteOffset + signatureBytes.byteLength) as ArrayBuffer,
        message
      );
    } catch {
      return false;
    }
  }
}
