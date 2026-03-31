---
description: Automated Cloudflare-First Project Initialization
---

// turbo-all
# New Project Workflow

Follow these steps precisely when initializing a new app or microservice for this user.

## 1. Project Initialization
1.  **Framework Setup**: Run `npx create-...` as requested by the user, but ALWAYS use the `./` flag to initialize in the current directory.
2.  **PWA Configuration**: Immediately configure the manifest and service worker for PWA support.
3.  **Wrangler Setup**: Initialize **wrangler.jsonc** for Cloudflare deployment. **Never create a wrangler.toml file.**

## 2. Rule Enforcement (CRITICAL)
1.  **Create `.cursorrules`**: Generate a `.cursorrules` file in the root directory.
2.  **Content**: Copy the standard Cloudflare (**D1, KV, Workers, Pages, Durable Objects, R2**), Discord, PWA, and GitHub rules.
3.  **Org/User Config**: Target **GameProductions/** for GitHub and **morenicano/** for Docker Hub.
4.  **Notifications**: Enforce the use of **dismissable toasts** and the **ban on native browser notifications**.
5.  **Domain**: Ensure **gpnet.dev** is noted as the default domain.

## 3. Infrastructure & Integration
1.  **GitHub Repo**: Initialize the repository under the **GameProductions/** organization.
2.  **Discord OAuth**: Boilerplate the Discord login flow using Hono or the requested framework.
3.  **Database/Storage**: Initialize **D1** (SQL), **KV** (Cache), **Durable Objects** (State), and **R2** (Buckets) via Wrangler.
4.  **Toast System**: Boilerplate a custom, dismissable toast component into the core UI layout.
5.  **Domain Setup**: Configure the **gpnet.dev** custom domain in the environment config or **wrangler.jsonc** settings.
6.  **GitHub Actions**: Create a `.github/workflows/deploy.yml` that syncs secrets and deploys to Cloudflare.

## 4. Verification
1.  Verify that `.cursorrules` exists.
2.  Check that **wrangler.jsonc** is correctly formatted and **wrangler.toml** is absent.
3.  Ensure a GitHub Project is linked and the implementation plan is synced.
4.  Confirm with the user that the base infrastructure is ready for feature development.
