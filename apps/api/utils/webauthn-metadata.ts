/**
 * 🔐 WebAuthn AAGUID Metadata Mapping
 * Comprehensive provider branding for passkeys.
 * [FLEET-STANDARD] Fleet Forensic Standard v6.1.
 */

export interface PasskeyProviderMetadata {
  name: string;         // Full provider name (e.g. "iCloud Keychain")
  service: string;      // Short service/brand label (e.g. "iCloud")
  icon: string;         // Icon slug
  logo?: string;        // CDN logo URL (SVG preferred)
  color?: string;       // Brand hex color (no #)
  securityLevel: string;
  manufacturer: string;
  description?: string;
  website?: string;
}

const APPLE: PasskeyProviderMetadata = {
  name: 'iCloud Keychain',
  service: 'Apple',
  icon: 'apple',
  logo: 'https://cdn.simpleicons.org/apple/A2AAAD',
  color: 'A2AAAD',
  securityLevel: 'Hardware Protected (Secure Enclave)',
  manufacturer: 'Apple Inc.',
  description: 'End-to-end encrypted passkeys synced across all your Apple devices via iCloud.',
  website: 'https://support.apple.com/guide/icloud/keychain-mmfc9f1e7b'
};

const GOOGLE: PasskeyProviderMetadata = {
  name: 'Google Password Manager',
  service: 'Google',
  icon: 'google',
  logo: 'https://cdn.simpleicons.org/google/4285F4',
  color: '4285F4',
  securityLevel: 'Hardware Protected (Titan / TEE)',
  manufacturer: 'Google LLC',
  description: 'Passkeys stored in Google Password Manager, synced across Android and Chrome.',
  website: 'https://passwords.google.com'
};

const WINDOWS: PasskeyProviderMetadata = {
  name: 'Windows Hello',
  service: 'Microsoft',
  icon: 'windows',
  logo: 'https://cdn.simpleicons.org/windows/00AFF0',
  color: '00AFF0',
  securityLevel: 'Hardware Protected (TPM)',
  manufacturer: 'Microsoft Corporation',
  description: 'Passkeys protected by Windows Hello using facial recognition, fingerprint, or PIN backed by a TPM chip.',
  website: 'https://support.microsoft.com/windows/windows-hello'
};

const WINDOWS_VBS: PasskeyProviderMetadata = {
  ...WINDOWS,
  name: 'Windows Hello (VBS)',
  service: 'Microsoft',
  securityLevel: 'Virtualization-Based Security (VBS)',
  description: 'Windows Hello with Virtualization-Based Security for additional isolation of credential material.',
};

const YUBIKEY: PasskeyProviderMetadata = {
  name: 'YubiKey',
  service: 'Yubico',
  icon: 'yubico',
  logo: 'https://cdn.simpleicons.org/yubico/9ACA3C',
  color: '9ACA3C',
  securityLevel: 'Hardware Protected (Secure Element)',
  manufacturer: 'Yubico AB',
  description: 'Hardware security key with a dedicated Secure Element chip. Physical tap required for authentication.',
  website: 'https://www.yubico.com'
};

const ONEPASSWORD: PasskeyProviderMetadata = {
  name: '1Password',
  service: '1Password',
  icon: '1password',
  logo: 'https://cdn.simpleicons.org/1password/0094F5',
  color: '0094F5',
  securityLevel: 'Software Protected (E2EE Vault)',
  manufacturer: '1Password Ltd.',
  description: 'Passkeys managed in your 1Password vault with zero-knowledge encryption.',
  website: 'https://1password.com/passkeys'
};

const BITWARDEN: PasskeyProviderMetadata = {
  name: 'Bitwarden',
  service: 'Bitwarden',
  icon: 'bitwarden',
  logo: 'https://cdn.simpleicons.org/bitwarden/175DDC',
  color: '175DDC',
  securityLevel: 'Software Protected (E2EE Vault)',
  manufacturer: 'Bitwarden Inc.',
  description: 'Open-source passkey management with end-to-end encryption.',
  website: 'https://bitwarden.com/passwordless-passkeys'
};

const DASHLANE: PasskeyProviderMetadata = {
  name: 'Dashlane',
  service: 'Dashlane',
  icon: 'dashlane',
  logo: 'https://cdn.simpleicons.org/dashlane/1F6AFF',
  color: '1F6AFF',
  securityLevel: 'Software Protected (Confidential SSO)',
  manufacturer: 'Dashlane SAS',
  description: 'Passkeys stored in Dashlane with Confidential SSO architecture.',
  website: 'https://www.dashlane.com/passkeys'
};

const SAMSUNG: PasskeyProviderMetadata = {
  name: 'Samsung Pass',
  service: 'Samsung',
  icon: 'samsung',
  logo: 'https://cdn.simpleicons.org/samsung/1428A0',
  color: '1428A0',
  securityLevel: 'Hardware Protected (Samsung Knox SE)',
  manufacturer: 'Samsung Electronics',
  description: 'Passkeys protected by Samsung Pass using biometrics backed by Samsung Knox Secure Enclave.',
  website: 'https://www.samsung.com/us/support/owners/app/samsung-pass'
};

const ANDROID: PasskeyProviderMetadata = {
  name: 'Android Authenticator',
  service: 'Android',
  icon: 'android',
  logo: 'https://cdn.simpleicons.org/android/3DDC84',
  color: '3DDC84',
  securityLevel: 'Hardware Protected (Android Keystore)',
  manufacturer: 'Google LLC',
  description: 'Platform passkey backed by the Android Keystore and hardware-backed security.',
  website: 'https://developers.google.com/identity/passkeys'
};

const KEEPER: PasskeyProviderMetadata = {
  name: 'Keeper Security',
  service: 'Keeper',
  icon: 'keeper',
  logo: 'https://cdn.simpleicons.org/keepassxc/6CAC4D',
  color: '0172F0',
  securityLevel: 'Software Protected (Zero-Knowledge Vault)',
  manufacturer: 'Keeper Security Inc.',
  description: 'Enterprise-grade passkey storage with zero-knowledge architecture.',
  website: 'https://www.keepersecurity.com/passkeys.html'
};

const FEITIAN: PasskeyProviderMetadata = {
  name: 'Feitian Security Key',
  service: 'Feitian',
  icon: 'key',
  logo: undefined,
  color: 'E31837',
  securityLevel: 'Hardware Protected (Secure Element)',
  manufacturer: 'Feitian Technologies Co., Ltd.',
  description: 'FIDO2-certified hardware security key with built-in secure element.',
  website: 'https://www.ftsafe.com'
};

const GOOGLE_TITAN: PasskeyProviderMetadata = {
  ...GOOGLE,
  name: 'Google Titan Key',
  service: 'Google',
  securityLevel: 'Hardware Protected (Titan Chip)',
  description: 'Physical security key with a Google Titan security chip, resistant to remote attacks.',
  website: 'https://store.google.com/product/titan_security_key'
};

const GENERIC: PasskeyProviderMetadata = {
  name: 'Security Key',
  service: 'FIDO2',
  icon: 'key',
  color: '6366F1',
  securityLevel: 'Hardware Protected',
  manufacturer: 'Unknown Manufacturer',
  description: 'FIDO2-compliant hardware security key.',
};

const UNKNOWN: PasskeyProviderMetadata = {
  name: 'Platform Authenticator',
  service: 'Device',
  icon: 'fingerprint',
  color: '64748B',
  securityLevel: 'Software Protected',
  manufacturer: 'Unknown',
  description: 'Built-in authenticator using device biometrics or PIN.',
};

// ──────────────────────────────────────────────────────────────────────────────
// AAGUID → Provider Metadata
// Reference: https://passkeys.dev/device-support/ & simplewebauthn community
// ──────────────────────────────────────────────────────────────────────────────
const AAGUID_MAP: Record<string, PasskeyProviderMetadata> = {
  // Apple — iCloud Keychain
  'adce0002-35bc-c60a-648b-0b25f1f05503': APPLE, // Touch ID (Chrome on Mac)
  'ad155505-7d1d-473d-8517-c8a417646a53': APPLE, // iCloud Keychain (legacy)
  'dd4ec289-e01d-41c9-bb89-70fa845d4bf2': APPLE, // iCloud Keychain (Safari)
  'fbfc3007-154e-4ecc-8c0b-6e020557d7bd': APPLE, // iCloud Keychain (iOS)
  'b84e4048-15dc-4dd0-8640-f4f60813c8af': APPLE, // iCloud Keychain (iOS 16+)

  // Google — Password Manager & Titan
  'ea9b8d66-4d01-1d21-3ce4-b6b48cb575d4': GOOGLE,       // Google Password Manager
  '42b4fb4a-2866-43b2-9bf7-6c6669c2e5d3': GOOGLE,       // Google Password Manager (Android)
  '6d44ba9b-f6ec-2e49-b930-0c8fe920cb73': GOOGLE,       // Google Password Manager (Android 2)
  '8fc51060-b01c-0d64-ae18-e594b1b2a27b': GOOGLE_TITAN, // Google Titan Key v2
  'd5cdae2d-4d22-4d16-a8f1-82e0a2e39ce0': GOOGLE_TITAN, // Google Titan (BLE)

  // Microsoft — Windows Hello
  '08987058-cadc-4b81-b6e1-30de50dcbe96': { ...WINDOWS, name: 'Windows Hello (Hardware)', securityLevel: 'Hardware Protected (TPM 2.0)' },
  '9ddd1817-af5a-4672-a2b9-3e3dd95000a9': WINDOWS,
  '6028c46d-0081-4229-873b-554474775f0a': WINDOWS_VBS,
  'b5397666-4885-aa6b-cebf-e52262a439a6': WINDOWS_VBS,

  // Yubico — YubiKey series
  'f8a011f3-8c0a-4d15-8006-17111f9edc01': { ...YUBIKEY, name: 'Security Key by Yubico' },
  'fa2b99dc-9e39-4257-8f92-4a30d23c4118': { ...YUBIKEY, name: 'YubiKey 5 Series', securityLevel: 'Hardware Protected (Secure Element, FIDO2 L2)' },
  'c1f9a0bc-1dd2-404a-b27f-8e29047a43fd': { ...YUBIKEY, name: 'YubiKey 5Ci' },
  '73bb0cd4-e502-49b8-9c6f-b59445bf720b': { ...YUBIKEY, name: 'YubiKey 5 FIDO2' },
  'ee882879-721c-4913-9775-3dfcce97072a': { ...YUBIKEY, name: 'YubiKey 5 NFC' },
  '2fc0579f-8113-47ea-b116-bb5a8db9202a': { ...YUBIKEY, name: 'YubiKey 5Ci (FIDO2)' },
  'cb69481e-8ff7-4039-93ec-0a2729a154a8': { ...YUBIKEY, name: 'YubiKey 5 (USB-A)' },
  '6d66b4a0-d8d8-4a23-b9f6-9e7f5a3e8f85': { ...YUBIKEY, name: 'YubiKey Bio Series' },
  '6f7e5b97-3a5c-4ead-8fe5-9f6f3e3e8c5b': { ...YUBIKEY, name: 'YubiKey Bio (USB-C)', securityLevel: 'Hardware Protected (SE + Biometric)' },

  // 1Password
  'a4e9fc6d-4cbe-4758-b8ba-37598bb5bbaa': ONEPASSWORD,
  'bdb6a04e-4d37-4c42-8a4f-21938e1c17da': ONEPASSWORD,

  // Bitwarden
  'bada5566-a7aa-401f-bd96-45619a55120d': BITWARDEN,
  'd548826e-79b4-db40-a3d8-11116f7e8349': BITWARDEN,

  // Dashlane
  '39a5647e-1853-446c-a1f6-a79bae9f5bc7': DASHLANE,
  'fbdc3c33-6e2a-469b-a20c-0b947cc7b6c7': DASHLANE,

  // Keeper Security
  'b93fd961-f2e6-462f-b122-82002247de78': KEEPER,

  // Samsung Pass
  'cc45f64e-52a2-451b-831a-4edd8022a202': SAMSUNG,
  '53414d53-554e-4700-0000-000000000000': SAMSUNG,
  'be727034-574a-f799-5c76-0929e0430973': SAMSUNG,

  // Android Biometric / Platform
  'ef1dce6a-44e1-4de9-9a55-fd40eee03fe0': ANDROID,
  'b3f6988d-a2c8-4e3c-9a14-45e9038e4b37': ANDROID,

  // Feitian
  '77010bd7-212a-4fc9-b236-d2ca5e9d4084': FEITIAN,
  '3e22415d-7fdf-4ea4-8a0c-dd60c4249b9d': { ...FEITIAN, name: 'Feitian BioPass FIDO2', securityLevel: 'Hardware Protected (SE + Biometric)' },
  'b6ede29c-3772-412c-8a78-539c1f4c62d2': FEITIAN,
};

export function getAAGUIDMetadata(aaguid: string | null | undefined): PasskeyProviderMetadata {
  if (!aaguid) return UNKNOWN;
  const entry = AAGUID_MAP[aaguid.toLowerCase()];
  if (entry) return entry;
  // Check zero AAGUID (generic platform authenticator)
  if (aaguid === '00000000-0000-0000-0000-000000000000') return UNKNOWN;
  return GENERIC;
}
