export const CURRENT_VERSION = 'v3.1.2'

export const VERSION_UPDATES = [
  { version: 'v3.0.0', title: 'Modular Architecture (Evolutionary Leap)', description: 'Complete system refactor into a domain-driven modular architecture with root-domain routing and centralized validation.' },
  { version: 'v2.3.0', title: 'Forensic Admin Hub', description: 'Advanced user management, account merging, and deep forensic auditing.' },
  { version: 'v2.2.2', title: 'Stability & UI Refresh', description: 'Authentication performance fixes and refined global footer.' },
  { version: 'v1.31.0', title: 'Feature Parity & Rollovers', description: 'Budget rollovers, subscription trial alerts, and receipt management.' },
  { version: 'v1.15.0', title: 'Universal Interop', description: 'Advanced CSV/JSON imports and export engine.' },
  { version: 'v1.5.6', title: 'Provider Visibility', description: 'Designate providers as private, household, or public.' },
  { version: 'v1.5.5', title: 'Audit Analytics', description: 'New forensic security dashboard.' }
]

export const AUTH_EXCLUSIONS = [
  '/ledger', 
  '/ledger/', 
  '/ledger/ping',
  '/ping',
  '/ledger/auth/login',
  '/ledger/auth/login/discord',
  '/ledger/auth/callback/discord',
  '/ledger/auth/login/google',
  '/ledger/auth/callback/google',
  '/ledger/auth/login/dropbox',
  '/ledger/auth/callback/dropbox',
  '/ledger/auth/login/onedrive',
  '/ledger/auth/callback/onedrive',
  '/ledger/auth/passkeys/login-options',
  '/ledger/auth/passkeys/login-verify',
  '/ledger/auth/password/reset-request',
  '/ledger/auth/password/reset',
  '/ledger/auth/admin/claim',
  '/ledger/api/theme/broadcast',
  '/api/theme/broadcast',
  '/.well-known/microsoft-identity-association.json'
]
