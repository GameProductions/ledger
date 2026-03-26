# LEDGER: User Guide & Documentation

Welcome to LEDGER (Live Evaluation of Daily Gains & Expense Records). This guide will help you navigate the platform and maximize your financial intelligence.

## 🚀 Getting Started

### 1. Sovereign Deployment (Docker)
LEDGER is designed for rapid, low-config deployment.
1. **Prepare Config**: Rename the provided `docker.env` file to `.env` in the root directory. This is required for Docker Compose to detect your environment variables.
2. **Launch**: Run `docker compose up -d`.
3. **Health Check**: The platform will automatically wait for the API to pass its health probes before starting the Web UI.

### 2. Premium Onboarding
Upon your first login, you will be greeted by a **Guided Tour**. This tour is version-aware; as we release new features (like the recent **v2.0.0** update), you'll see a "What's New" notification to keep you up to speed.

### 2. The Dashboard
- **Safety Number**: This is your most important metric. It represents how much you can safely spend today without missing any upcoming bills or falling below your budget targets.
- **Onboarding Checklist**: Track your setup progress directly from the dashboard widget.
- **Health Score**: A real-time assessment of your financial habits.
- **Budget Rollover**: Surplus funds from "Rollover Enabled" categories carry over to the next month automatically.
- **Universal Currency**: Customize your display currency in Preferences. Choose from USD, EUR, or GBP (with more coming soon). This synchronizes across all devices and the Discord bot.

## 💳 Managing Transactions

### Receipt Uploads
Keep your house in order by attaching digital receipts to any transaction.
1. Click the 📁 icon on any transaction record.
2. Select your file (PDF, PNG, JPG).
3. View it anytime by clicking the 📄 icon.

### Multi-Select Calculation
Need to know the total of a specific group of transactions?
1. Check the boxes next to the transactions in the list.
2. A **Floating Calculation Bar** will appear at the bottom, showing the count and total sum of your selection.
3. Click "Clear" to reset.

### Reconciliation
Link your bank transactions to your manual entries or planned bills to ensure accuracy. Use the "Link" button on any transaction to find its counterpart.

## 🛡️ Security & Privacy

### Provider Visibility
When adding a Service Provider (e.g., your landlord or a local utility):
- **Private**: Visible only to you.
- **Household**: Visible to all members of your household.
- **Public**: Visible to all LEDGER users (for common services like Netflix or local mainstream utilities).

### Hardening
- **PBKDF2 Hashing**: Your passwords are secured with industry-standard cryptographic hashing (600,000 iterations).
- **E2EE Vault**: Sensitive data is encrypted before it ever hits our persistent storage.
- **Audit Logs**: View a history of all sensitive actions in your account settings.

### Subscription Trials
LEDGER monitors your free trials. If a subscription has a trial end date, you will receive an automated alert 3 days before it converts to a paid plan. Look for the **TRIAL** badge on your subscription cards.

## 🤖 Discord Integration
LEDGER lives where you work. Use these slash commands in your Discord server:
- `/ledger-safety`: Check your current spendable headroom.
- `/ledger-upcoming`: See a summary of bills due in the next 7 days.
- `/ledger-forecast`: Get a projection of your end-of-month balance.
- `/ledger-report`: View a visual pie chart of your current budget distribution.
- `/ledger-audit`: View recent security events for your account.

---
*For support or feature requests, contact the LEDGER development team.*
