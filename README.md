# LEDGER 💸
Unified Financial Command: Live Evaluation of Daily Gains & Expense Records.

LEDGER (v1.5.7) is a production-grade personal and household finance platform built for speed, transparency, and elite security.

## 🚀 Key Features

### 🛡️ Security & Privacy
- **Hardened Hashing**: PBKDF2-SHA256 with **600,000 iterations** for maximum password security.
- **Zero-Trust Validation**: Strict Zod-powered input validation on all API endpoints.
- **E2EE Vault**: End-to-end encrypted storage for PII via Cloudflare Durable Objects.
- **Forensic Audit Logging**: Detailed tracking of all sensitive actions.

### 🧠 Financial Intelligence
- **Safety Number™**: Real-time spending headroom based on upcoming bills and income.
- **Multi-Select Calculation**: Instant sum totals via a premium floating calculation bar.
- **Bill Forecasting**: Rolling 30-day and "Until Payday" projections.
- **Provider Visibility**: Granular access control (Private, Household, Public) for service providers.

### 👥 Collaboration & Onboarding
- **Multi-User Households**: Collaborative finance with administrative role management.
- **Premium Onboarding**: Version-aware guided tours with "What's New" tracking (v1.5.7).
- **Discord Bot**: Fully interactive slash commands (`/ledger-*`) for your server.

---

## 🛠️ Deployment Options

### 1. Cloudflare Workers (Recommended)
Deploy directly to Cloudflare's global edge network:
```bash
npm run deploy:api
npm run deploy:web
```

### 2. Self-Hosting (Docker)
Run the entire stack (API, Web UI, and DB) using Docker Compose:

#### Prerequisites
- Docker & Docker Compose
- `JWT_SECRET` and `ENCRYPTION_KEY` environment variables.

#### Setup
1. Clone the repository and navigate to the root.
2. Run the stack:
```bash
docker compose up -d
```
3. Access the Web UI at `http://localhost:8080`.
4. Use the default credentials to log in:
   - **Email**: `admin@example.com`
   - **Password**: `admin`
5. The API will be available at `http://localhost:8787`.

---

## 📖 Documentation
- [User Guide](file:///Users/morenicano/Documents/coding/projects/bots/ledger/USER_GUIDE.md): Navigation and feature how-tos.
- [Walkthrough](file:///Users/morenicano/.gemini/antigravity/brain/8475cb0d-d421-4e48-b005-f896415e5389/walkthrough.md): Technical details and accomplishments.
- [Feature List](file:///Users/morenicano/.gemini/antigravity/brain/8475cb0d-d421-4e48-b005-f896415e5389/feature_list.md): Detailed breakdown of all platform capabilities.
- [Discord Listing](file:///Users/morenicano/.gemini/antigravity/brain/8475cb0d-d421-4e48-b005-f896415e5389/discord_listing.md): Description for the Discord Developer Portal.
