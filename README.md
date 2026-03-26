# LEDGER
> **Sovereign Financial Infrastructure** | Live Evaluation of Daily Gains & Expense Records

LEDGER is a production-grade personal and household finance platform built for speed, transparency, and elite security.

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
- **Universal Currency Engine**: Per-user currency preferences (USD, EUR, GBP) and platform-wide defaults.
- **Provider Visibility**: Granular access control (Private, Household, Public) for service providers.

### 👥 Collaboration & Onboarding
- **Multi-User Households**: Collaborative finance with administrative role management.
- **Premium Onboarding**: Version-aware guided tours with "What's New" tracking.
- **Discord Bot**: Fully interactive slash commands (`/ledger-*`) for your server.

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

#### Why Self-Host?
- **Absolute Privacy**: Your data never leaves your perimeter.
- **Elite Performance**: Optimized multi-stage builds for lightning-fast response times.
- **Zero Configuration**: Ready-to-run environment with Docker Compose.

#### Prerequisites
- Docker & Docker Compose
- **Note**: Security keys (`JWT_SECRET`, `ENCRYPTION_KEY`) are automatically generated when using the Docker Compose setup flow.

#### Setup
1. **Pull the Image (Recommended)**:
  Avoid local builds by pulling the pre-built image from your preferred registry:
  ```bash
  # From GitHub Container Registry
  docker pull ghcr.io/gameproductions/ledger:latest

  # From Docker Hub
  docker pull gameproductions/ledger:latest
  ```
2. Clone the repository and navigate to the root.
3. Run the stack:
```bash
5. The API will be available at `http://localhost:8787`.

#### Automated Configuration
LEDGER features a "Zero-Touch" security bootstrapping flow:

1. **One-Command Setup**: Run the following to automatically clone the template and generate unique, high-entropy keys:
  ```bash
  docker compose run --rm setup
  ```
2. **Persistence**: This creates a local `.env` file that is ignored by Git, ensuring your keys are private and persistent.
3. **Launch**: Once setup is complete, run:
  ```bash
  docker compose up -d
  ```

#### Health & Resilience
LEDGER uses hard-coded Docker health checks. The `web` service will automatically wait until the `api` is fully initialized and healthy before starting, ensuring a seamless first-run experience.

---

## 📖 Included Documentation
The following documentation assets are included in the repository and container:
- **User Guide**: Navigation and feature how-tos.
- **Walkthrough**: Technical details and platform evolution.
- **Feature List**: Detailed breakdown of all platform capabilities.
- **Discord Listing**: Description for the Discord Developer Portal.
