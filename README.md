# LEDGER v3.19.2 (Sovereign Edition)
> **Sovereign Financial Infrastructure** | Total Modernization

LEDGER is a production-grade personal and household finance platform built for speed, transparency, and elite security. This release (v3.19.2) introduces **Transaction Data Ownership** and hardened **Forensic Support** tools.

## 🚀 Key Features

### 🛡️ Security & Forensic Integrity
- **Identity Mirroring (God Mode)**: Securely impersonate users for support with a hardened confirmation workflow and privacy masking.
- **Hardened Hashing**: PBKDF2-SHA256 with **100,000 iterations** for maximum password security.
- **Zero-Trust Validation**: Strict Zod-powered input validation on all API endpoints.
- **Forensic Audit Logging**: Detailed actor-to-target mapping for all administrative actions.

### 🧠 Financial Intelligence
- **Payment Orchestrator**: Granular status tracking (Paid, Pending, Scheduled, Unpaid) with high-fidelity color coding.
- **Transaction Timeline**: Chronological history of every note, confirmation number, and status change.
- **Multi-Note Support**: Persistent, append-only notes for every financial record.
- **Bill Forecasting**: Rolling 30-day and "Until Payday" projections.
- **Universal Currency Engine**: Per-user currency preferences (USD, EUR, GBP) and platform-wide defaults.

### 👥 Collaboration & Households
- **Household Management**: Collaborative finance with administrative role management (formerly Territory Data Ownership).
- **Social Accounts**: Hardened OAuth 2.0 integration for Discord and Google (Sovereign Identity).
- **Premium Onboarding**: Version-aware guided tours with "What's New" tracking.

---

## 🛠️ Deployment Options

### 1. Cloudflare Workers (Recommended)
Deploy directly to Cloudflare's global edge network:
```bash
npm run deploy:api
npm run deploy:web
```

### 2. Sovereign Self-Hosting (Docker Compose)
Take total command of your infrastructure. Deploy the entire ecosystem—API, Web UI, and Database—to your own private hardware in seconds. 

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

## 📖 Included Documentation
- **User Guide**: Navigation and feature how-tos.
- **Walkthrough**: Technical details and platform evolution (v3.15.4 - v3.19.2).
- **Feature List**: Detailed breakdown of all platform capabilities.

## Historical Evolution

LEDGER is the direct successor to the **CASH** platform, evolving through several major architectural eras:

- **CASH v1.5.6 (Gold Era)**: Introduced the signature "Glassmorphism" UI and fluid Framer-motion transitions.
- **v3.11.x (Hardening Era)**: Transitioned authentication to Node.js `Buffer` logic for cross-environment Bit-Perfect Cryptographic Stability.
- **v3.13.x (Mobility Era)**: Full Mobile-First refactor and PWA Asset Hardening.
- **v3.15.x (Sovereign Era)**: Rebranded from "Territory" to **"Household Management"** and adopted Plain English terminology.
- **v3.19.2 (Current)**: Implementation of the **Payment Orchestrator Intelligence** and Forensic Identity Mirroring.

---
© 2026 GameProductions. All Rights Reserved.
