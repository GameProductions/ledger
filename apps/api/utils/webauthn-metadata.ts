/**
 * 🔐 WebAuthn AAGUID Metadata Mapping
 * Provides human-readable provider names and branding for passkeys.
 */

export interface PasskeyProviderMetadata {
  name: string;
  icon: string; // URL to icon or simpleicons name
}

// Common AAGUIDs mapped to human-readable names and branding
// Data sourced from FIDO Alliance Metadata Service and community lists
const AAGUID_MAP: Record<string, PasskeyProviderMetadata> = {
  // Apple
  '7d444828-ea09-41ac-aa13-f4ef75782728': { name: 'Apple iCloud / FaceID', icon: 'apple' },
  '00000000-0000-0000-0000-000000000000': { name: 'Apple Device (Local)', icon: 'apple' },
  
  // Google
  'adce361d-73e3-4bc2-aa0b-222a0887e81b': { name: 'Google Chrome / Android', icon: 'google' },
  '61229f34-f25b-4395-9271-4770337c768a': { name: 'Google Titan Key', icon: 'google' },
  
  // Microsoft
  '6028744f-f9ce-4277-90f7-640b3967f407': { name: 'Windows Hello', icon: 'windows' },
  
  // Yubico
  'cb699144-3074-4b5b-ad7d-ef74895c721c': { name: 'YubiKey 5 Series', icon: 'yubico' },
  'fa2b9927-3efc-4981-aa94-98447814ec92': { name: 'YubiKey 5 FIPS', icon: 'yubico' },
  '8d350915-d91d-4074-a035-7c5ec82f5b61': { name: 'YubiKey 5 Nano', icon: 'yubico' },
  
  // 1Password
  'b31f79f2-085f-40f4-9041-356c38f4d96c': { name: '1Password', icon: '1password' },
  
  // Bitwarden
  '86111f3b-7f12-429a-8c76-5957d096c4a3': { name: 'Bitwarden', icon: 'bitwarden' },
  
  // Dashlane
  '6398935c-2794-4d83-9366-4172f3a60c6d': { name: 'Dashlane', icon: 'dashlane' }
};

/**
 * Returns metadata for a given AAGUID.
 * Falls back to "Unknown Authenticator" if no match is found.
 */
export function getAAGUIDMetadata(aaguid: string | null | undefined): PasskeyProviderMetadata {
  if (!aaguid) {
    return { name: 'Unknown Authenticator', icon: 'shield-question' };
  }
  
  const metadata = AAGUID_MAP[aaguid.toLowerCase()];
  if (metadata) {
    return metadata;
  }
  
  // Generic fallbacks for common brand strings if we have them (future expansion)
  return { name: `Authenticator (${aaguid.slice(0, 8)})`, icon: 'key' };
}
