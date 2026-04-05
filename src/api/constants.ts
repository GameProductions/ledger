export const CURRENT_VERSION = 'v3.19.6'

export const VERSION_UPDATES = [
  { version: 'v3.19.6', title: 'Integrity Certification (Stable)', description: 'Certified total platform stability following the 401 Unauthorized regression resolution. Implemented terminal routing and integrity headers.' },
  { version: 'v3.19.5', title: 'Asset Restoration & Routing Finality', description: 'Restored missing favicon.ico and hardened entry point routing to prevent asset-fallthrough into protected API paths.' },
  { version: 'v3.19.4', title: 'Ghost Protocol Neutralization', description: 'Purged stale JavaScript artifacts and synchronized release baseline to resolve the persistent 401 Unauthorized regression for public assets.' },
  { version: 'v3.17.4', title: 'Root-Level Protocol Rectification', description: 'Decommissioned legacy entry-point guards in server.ts to ensure absolute visual and functional stability for public assets.' },
  { version: 'v3.17.3', title: 'Forensic Access Protocol Rectification', description: 'Transitioned to a targeted route-based authentication guard to ensure absolute root and asset visual stability.' }
]

export const AUTH_EXCLUSIONS = [
  '/',
  '/ping',
  '/auth/login',
  '/auth/login/discord',
  '/auth/callback/discord',
  '/auth/login/google',
  '/auth/callback/google',
  '/auth/login/dropbox',
  '/auth/callback/dropbox',
  '/auth/login/onedrive',
  '/auth/callback/onedrive',
  '/auth/passkeys/login-options',
  '/auth/passkeys/login-verify',
  '/auth/password/reset-request',
  '/auth/password/reset',
  '/auth/admin/claim',
  '/api/theme/broadcast',
  '/.well-known/microsoft-identity-association.json',
  '/favicon.ico',
  '/favicon.png',
  '/apple-touch-icon.png',
  '/manifest.json'
]
