---
description: Automated Cloudflare-First Project Initialization (v2)
---

# Create Project Workflow (v2)

Follow these steps to initialize a new GameProductions bot/PWA project. All steps MUST adhere to the **Global Laws** defined in the foundation repository.

## 1. Project Scaffolding
- Create a new directory for the project.
- Initialize with `wrangler init`.
- Ensure the project name matches the desired sub-domain on `gpnet.dev`.

## 2. Infrastructure Setup (Wrangler)
- Create `wrangler.jsonc` (never `.toml`).
- Configure the following bindings:
  - `D1_DATABASE`: Binding `DB`.
  - `KV_NAMESPACE`: Binding `CACHE`.
  - `R2_BUCKET`: Binding `STORAGE`.
- Set the `routes` to `[project-name].gpnet.dev/*`.

## 3. Standardized Routing (Hono)
- Install Hono: `npm install hono`.
- Setup the main entry point (e.g., `src/index.ts`) with the following pattern:
  - `/api/*`: Backend/Bot logic.
  - `/*`: UI/Static assets.

## 4. SQL Integration (Native D1)
- Use `c.env.DB` for all database interactions.
- Avoid Drizzle for simple projects; use raw SQL with `?` placeholders.
- If Drizzle is necessary, initialize it as a lightweight middleware.

## 5. Federated SSO Identity
- **Proxy Requirement**: Never register a unique project URL in an external Developer Portal (Discord, Google, etc.).
- **Auth Endpoint**: Hardcode `oauth2/authorize` handoffs and token exchange POST requests to use `https://sso.gpnet.dev/api/proxy/callback/:provider`.
- **State Payload**: Ensure the OAuth `state` query string is a base64-encoded JSON payload containing `targetOrigin` so Foundation knows where to redirect back to.

## 6. UI/UX & Components
- Implement a **Toast Provider** for all user communication.
- Create the **Floating Header** with:
  - Left: Logo + App Name.
  - Right: User avatar dropdown.
- Create the **Universal Footer** with:
  - Top: App Name + Version (Left), Legal links (Right).
  - Bottom: Center-aligned "© [Current Year] GameProductions".
- Ensure the **Landing Page** is Google-compliant for account-linking approval.
- Add **Microsoft Verification**: Create `.well-known/microsoft-identity-association.json`.

## 7. Admin & "God Mode"
- Implement the **Role Hierarchy**: Super Admin, Admin, Mod, User.
- Create a separate **God Mode Portal** for Super Admins.
- Implement **User Management (CRUD)** for Mods+.

## 8. Local Development & Deployment
- **Local Testing**: Always run `npm run dev` or `wrangler dev` before deploying.
- **Remote DB**: To test against production data, run `wrangler dev --remote`.
- **Publishing**: Only run `wrangler deploy` after successful local verification and user confirmation.

## 9. Globalization (Sync Foundation)
- Run the `sync-foundation.sh` script to pull the latest `.cursorrules` and global workflows from the `foundation` repository.
