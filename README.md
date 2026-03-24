# LEDGER 💸
Unified Financial Command: Live Evaluation of Daily Gains & Expense Records.

## Features
- **Deterministic Tracking**: Precise accounting with a multi-household architecture.
- **Webhook Engine**: Automated notifications for transaction events.
- **UI Customizer**: Persistent dashboard layouts and themes.
- **Hybrid Deployment**: Run on **Cloudflare Workers** or self-host with **Docker**.

## Deployment Options

### 1. Cloudflare Workers (Recommended)
Deploy directly to Cloudflare's global edge network:
```bash
npm run deploy:api
npm run deploy:web
```

### 2. Self-Hosting (Docker)
Run the entire stack in a single containerized environment:
```bash
docker compose up -d
```
Access the Web UI at `http://localhost:8080`.

## Documentation
For detailed architecture and feature walk-throughs, see [walkthrough.md](file:///Users/morenicano/.gemini/antigravity/brain/15d2c455-a010-4435-84f2-5ee8aefc9f1a/walkthrough.md).
