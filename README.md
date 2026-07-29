# LEDGER — Secure Financial Platform
> **Forensic Integrity & Agentic Reconciliation**

LEDGER is a production-grade personal and household finance platform built for speed, transparency, and security.

## Key Features

### Forensic Integrity
- **Dual-Stack Network Forensics**: Full-stack transparency with labeled IPv4 and IPv6 chronology for every session and security event.
- **Human-Readable Audit Logs**: Plain-English descriptions for all administrative and system actions.
- **Zero-Native Dialog System**: Complete eradication of browser-native alerts, confirms, and prompts in favor of a secure, promise-based toast utility.
- **Session Persistence Control**: Granular "Stay Signed In" toggles for users and administrative overrides.

### Agentic Intelligence
- **Reconciliation Agent**: Stateful background matching of transactions using Cloudflare Agents SDK and internal SQLite.
- **Modular Schema**: Domain-specific database architecture (Auth, Financials, Planning, Loans, System).
- **Rule-Based Pairing**: Automated transaction categorization and linking based on historical patterns and shared visibility rules.

### Security & Activity Tracking
- **Owner Access (Impersonation)**: Securely log in as users for support with a confirmation workflow and privacy masking.
- **Hardened Hashing**: PBKDF2-SHA256 with 100,000 iterations for maximum password security.
- **Zero-Trust Validation**: Strict Zod-powered input validation on all API endpoints.
- **Activity History**: Detailed record of all administrative actions.

### Financial Intelligence
- **Payment Orchestrator**: Granular status tracking (Paid, Pending, Scheduled, Unpaid) with high-fidelity color coding.
- **Transaction Timeline**: Chronological history of every note, confirmation number, and status change.
- **Multi-Note Support**: Persistent, append-only notes for every financial record.
- **Bill Forecasting**: Rolling 30-day and "Until Payday" projections.
- **Universal Currency Engine**: Per-user currency preferences (USD, EUR, GBP) and platform-wide defaults.

### Searchable Dropdowns & Inline Creation
- **Searchable Selectors**: All dropdown lists for Accounts, Categories, Providers, Payment Methods, and Subscriptions are fully searchable.
- **Inline Entity Creation**: Create new categories, accounts, or providers on the fly directly inside form selectors with automatic insertion and selection.

### Collaboration & Households
- **Household Management**: Collaborative finance with administrative role management.
- **Social Accounts**: Secure OAuth 2.0 integration for Discord and Google.

---

## Deployment Options

### 1. Cloudflare Workers (Recommended)
Deploy directly to Cloudflare's global edge network:
```bash
npm run deploy:api
npm run deploy:web
```

### 2. Secure Self-Hosting (Docker Compose)
Deploy the entire ecosystem—API, Web UI, and Database—to your own private hardware.

#### Setup
1. **Pull the Image**:
  ```bash
  docker pull ghcr.io/gameproductions/ledger:latest
  ```
2. Run the setup protocol:
  ```bash
  docker compose run --rm setup
  ```
3. Launch the stack:
  ```bash
  docker compose up -d
  ```

---

## Documentation
- **User Guide**: Navigation and feature how-tos.
- **Walkthrough**: Technical details and platform capabilities.

---

© 2026 GameProductions. All Rights Reserved.
