export const CURRENT_VERSION = 'v3.11.8'

export const VERSION_UPDATES = [
  { version: 'v3.11.8', title: 'Total Modernization', description: 'Complete elimination of legacy routing and transition to a standardized modular architecture.' },
  { version: 'v3.10.0', title: 'Tabbed Dashboard (Evolutionary Leap)', description: 'Consolidated financial management into a sleek, tabbed interface for enhanced navigation.' },
  { version: 'v3.0.0', title: 'Modular Architecture Baseline', description: 'Initial transition to a domain-driven modular structure.' },
  { version: 'v2.3.0', title: 'Forensic Admin Hub', description: 'Advanced user management, account merging, and deep forensic auditing.' },
  { version: 'v2.2.2', title: 'Stability & UI Refresh', description: 'Authentication performance fixes and refined global footer.' },
  { version: 'v1.31.0', title: 'Feature Parity & Rollovers', description: 'Budget rollovers, subscription trial alerts, and receipt management.' },
  { version: 'v1.15.0', title: 'Universal Interop', description: 'Advanced CSV/JSON imports and export engine.' },
  { version: 'v1.5.6', title: 'Provider Visibility', description: 'Designate providers as private, household, or public.' },
  { version: 'v1.5.5', title: 'Audit Analytics', description: 'New forensic security dashboard.' }
]

export const AUTH_EXCLUSIONS = [
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
  '/.well-known/microsoft-identity-association.json'
]
