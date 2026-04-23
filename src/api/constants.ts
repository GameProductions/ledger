export const CURRENT_VERSION = 'Stable'

export const VERSION_UPDATES = [
  { version: 'v3.29.2', title: 'Immortal State Hardening (Final)', description: 'Definitive resolution for all context-driven 500 errors. Purged legacy CommonJS artifacts, enforced strict user verification across all planning routes, and modernized global error diagnostics.' },
  { version: 'v3.29.1', title: 'Stability Hardened (Consolidated Routing)', description: 'Consolidated API architecture to resolve route-matching conflicts. Migrated to strict ESM imports in auth middleware and implemented an API Shield handler to prevent unintended SPA fallbacks.' },
  { version: 'v3.25.0', title: 'Security Insights & System Protection', description: 'Implemented the high-density Transaction Ledger with smart matching, automated splitting/linking, and a full security pass (automated alarms, clear logs, and 100% audit coverage).' },
  { version: 'v3.20.2', title: 'Identity & Polish', description: 'Restructured the Settings Portal, refined the master user dropdown, and resolved critical backend authentication bugs.' },
  { version: 'v3.19.11', title: 'System Resilience (Total Security Update)', description: 'Detailed System Audit and security update of the entire Management suite, achieving a high-reliability state across all system modules.' },
  { version: 'v3.19.10', title: 'Resilient-X (Total Eradication)', description: 'Global null-safe iteration sweep across all functional components, including a definitive fix for the SpendingHeatmap dashboard crash.' },
  { version: 'v3.19.9', title: 'Ironclad Resilience', description: 'Deep-level iteration hardening across Dashboard, Onboarding, and Timeline components to ensure zero-crash performance during 401 Unauthorized or loading states.' },
  { version: 'v3.19.8', title: 'Resilience Hardening', description: 'Resolved frontend crashes by implementing null-safe iteration guards and robust fallback patterns for API data mapping.' },
  { version: 'v3.19.6', title: 'Integrity Certification (Stable)', description: 'Certified total platform stability following the 401 Unauthorized regression resolution. Implemented terminal routing and integrity headers.' },
  { version: 'v3.19.5', title: 'Asset Restoration & Routing Finality', description: 'Restored missing favicon.ico and hardened entry point routing to prevent asset-fallthrough into protected API paths.' },
  { version: 'v3.19.4', title: 'Ghost Protocol Neutralization', description: 'Purged stale JavaScript artifacts and synchronized release baseline to resolve the persistent 401 Unauthorized regression for public assets.' },
  { version: 'v3.17.4', title: 'Root-Level Protocol Rectification', description: 'Decommissioned legacy entry-point guards in server.ts to ensure absolute visual and functional stability for public assets.' },
  { version: 'v3.17.3', title: 'Secure Access Method Update', description: 'Transitioned to a targeted route-based authentication guard to ensure system and asset visual stability.' }
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
