/**
 * 🔐 WebAuthn AAGUID Metadata Mapping
 * Provides human-readable provider names and branding for passkeys.
 * [FLEET-STANDARD] Consistent with Fleet Forensic Standard v6.1.
 */

export interface PasskeyProviderMetadata {
  name: string;
  icon: string;
  logo?: string;
  securityLevel: string;
  manufacturer: string;
}

// Common AAGUIDs mapped to human-readable names and branding
const AAGUID_MAP: Record<string, PasskeyProviderMetadata> = {
  'ad155505-7d1d-473d-8517-c8a417646a53': { 
    name: 'Apple iCloud Keychain', 
    icon: 'apple', 
    logo: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg',
    securityLevel: 'Hardware Protected (TEE/SE)',
    manufacturer: 'Apple Inc.'
  },
  'ea9b8d66-4d01-1d21-3ce4-b6b48cb575d4': { 
    name: 'Google Password Manager', 
    icon: 'google', 
    logo: 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_Logo.svg',
    securityLevel: 'Hardware Protected (TEE)',
    manufacturer: 'Google LLC'
  },
  '6028c46d-0081-4229-873b-554474775f0a': { 
    name: 'Windows Hello', 
    icon: 'windows', 
    logo: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg',
    securityLevel: 'Hardware Protected (TPM)',
    manufacturer: 'Microsoft Corporation'
  },
  'f8a011f3-8c0a-4d15-8006-17111f9edc01': { 
    name: 'YubiKey 5 Series', 
    icon: 'key', 
    logo: 'https://www.yubico.com/wp-content/uploads/2020/09/yubico-logo.png',
    securityLevel: 'Hardware Protected (Secure Element)',
    manufacturer: 'Yubico AB'
  },
};

/**
 * Returns metadata for a given AAGUID.
 */
export function getAAGUIDMetadata(aaguid: string | null | undefined): PasskeyProviderMetadata {
  if (!aaguid) {
    return { 
      name: 'Generic Authenticator', 
      icon: 'key', 
      securityLevel: 'Software Protected (Fallback)',
      manufacturer: 'Unknown'
    };
  }
  
  const metadata = AAGUID_MAP[aaguid.toLowerCase()];
  if (metadata) return metadata;
  
  return { 
    name: 'Hardware Security Key', 
    icon: 'key', 
    securityLevel: 'Hardware Protected',
    manufacturer: 'Generic Manufacturer'
  };
}
