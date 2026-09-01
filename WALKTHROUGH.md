# LEDGER — Technical Platform Architecture

LEDGER is a full-stack financial management platform built on Cloudflare Workers, React, and PostgreSQL (Neon).

## Architecture Overview

### Database Schema (PostgreSQL)
- **Auth**: Users, sessions, passkeys, identity linking
- **Financials**: Accounts, categories, transactions, bills, subscriptions, credit cards, installment plans, charge descriptors, payment methods, linked accounts, confirmation number categories, confirmation number lifecycle logs
- **Planning**: Pay schedules, pay exceptions, tracked expenses, confirmation numbers
- **Loans**: Personal loans, lending relationships
- **System**: Service providers, feature flags, activity logs, configuration

All schemas use drizzle-orm for type-safe queries. IDs are UUIDs generated via `crypto.randomUUID()`.

### API Layer (Cloudflare Workers / Hono)
- Route-based architecture under `/api/` namespace
- Zod validation on all endpoints
- JWT-based authentication with passkey support
- Owner impersonation for support workflows
- All administrative actions logged to the activity audit trail

### Frontend (React SPA)
- Component-based UI with glassmorphism design system
- Modals for create/edit/delete operations on all entities
- Searchable selectors with inline entity creation
- Currency inputs with RTL calculator-style formatting
- Mobile-responsive layout with dynamic bottom navigation
- **Shared Navigation Config**: All nav items defined in `apps/web/lib/navigation.ts` — both the dropdown menu and mobile nav derive from the same source, filtered by `navigationVisibility` in the user's `settingsJson`.
- **Dashboard Widget System**: 25 widgets across 4 dashboard tabs, each individually togglable via the same `settingsJson.dashboardLayout` structure.

## Key Design Decisions

- **No native dialogs**: All alerts/confirms use a custom toast/promise system
- **Cents storage**: All monetary values stored as integers (cents) to avoid floating-point errors
- **CamelCase API keys**: Consistent JavaScript property naming across all API responses
- **Household scoping**: Most entities scoped to a household for collaborative finance
- **Force PATCH**: Updates use PATCH with partial payloads
- **settingsJson persistence**: User preferences (theme, currency, dashboard layout, navigation visibility, UI style) are stored as a JSON text blob in the `settings_json` column. The PATCH `/api/user/profile` endpoint now accepts and persists this field.
- **Menu Visibility**: The `navigationVisibility` key within `settingsJson` stores per-item boolean toggles. Settings is always visible to prevent lockout.
- **Dashboard Layout**: The `dashboardLayout` key stores a tab-keyed map of widget visibility arrays (e.g. `{ overview: [{ id: 'calendar', visible: true }, ...] }`).
- **Audit logging**: All Owner (administration) actions are recorded with before/after snapshots

## Admin Entity Manager

The Owner Entity Manager provides platform-wide CRUD across all entity types. Field types are contextual:
- Booleans render as toggle switches
- Enums render as dropdowns
- Monetary amounts render as decimal inputs (stored as cents)
- Dates render as date pickers
- System-managed fields (IDs, timestamps) are locked with an unlock padlock

## Discord Integration

LEDGER exposes slash commands for Discord:
- `/ledger-safety` — Check spendable balance
- `/ledger-upcoming` — View upcoming bills and subscriptions
- `/ledger-forecast` — Financial health score and outlook
- `/ledger-report` — Visual budget distribution chart
- `/ledger-audit` — Recent security and audit logs (admin)

---

*LEDGER — Built by Antigravity*
