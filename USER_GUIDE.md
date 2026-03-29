# LEDGER v3.11.0: User Guide & Documentation

Welcome to LEDGER (Live Evaluation of Daily Gains & Expense Records). This guide will help you navigate the platform and maximize your financial intelligence.

## 🚀 Getting Started

### 1. Private Installation (Docker)
LEDGER is designed for automatic setup.
1. **Initial Setup**: Run `docker compose run --rm setup`. This automatically clones the `docker.env` template and generates secure access keys for your specific environment.
2. **Launch**: Run `docker compose up -d`.
3. **Status Check**: The platform will verify the API is ready before serving the Web interface.

### 2. User Onboarding
Upon your first login, you will be greeted by a **Guided Tour**. This tour is updated as we release new features; you'll see a "What's New" notification to keep you up to speed.

### 2. The Dashboard
- **Navigation Tabs**: Effortlessly switch between Overview, Activity, Planning, and Insights.
- **Safe-to-Spend Balance**: This is your most important metric. It represents how much you can safely spend today without missing any upcoming bills or falling below your budget targets.
- **Onboarding Checklist**: Track your setup progress directly from the dashboard widget.
- **Financial Health Score**: A real-time assessment of your financial habits.
- **Balance Transfer**: Remaining funds from "Transfer Enabled" categories carry over to the next month automatically.
- **Global Currency**: Customize your display currency in Preferences. Choose from USD, EUR, or GBP (with more coming soon). This synchronizes across all devices and the Discord bot.

## 💳 Managing Transactions

### Receipt Uploads
Keep your house in order by attaching digital receipts to any transaction.
1. Click the 📁 icon on any transaction record.
2. Select your file (PDF, PNG, JPG).
3. View it anytime by clicking the 📄 icon.

### Multi-Select Calculation
Need to know the total of a specific group of transactions?
1. Check the boxes next to the transactions in the list.
2. A **Total Amount Bar** will appear at the bottom, showing the count and total sum of your selection.
3. Click "Clear" to reset.

### Matching Transactions
Link your bank transactions to your recorded entries or planned bills to ensure accuracy. Use the "Link" button on any transaction to find its counterpart.

## 🛡️ Security & Privacy

### Provider Visibility
When adding a Service Provider (e.g., your landlord or a local utility):
- **Private**: Visible only to you.
- **Household**: Visible to all members of your household.
- **Public**: Visible to all LEDGER users (for common services like Netflix or local mainstream utilities).

### Security Improvements
- **Secure Password Storage**: Your passwords are protected with industry-standard security methods.
- **Encrypted Storage**: Sensitive data is encrypted before it is ever stored.
- **Activity History**: View a history of all sensitive actions in your account settings.

### Subscription Trials
LEDGER monitors your free trials. If a subscription has a trial end date, you will receive an automated alert 3 days before it converts to a paid plan. Look for the **TRIAL** badge on your subscription cards.

## 🤖 Discord Integration
LEDGER lives where you work. Use these Discord commands in your server:
- `/ledger-safety`: Check your current safe-to-spend amount.
- `/ledger-upcoming`: See a summary of bills due in the next 7 days.
- `/ledger-forecast`: Get an estimate of your end-of-month balance.
- `/ledger-report`: View a visual chart of your current budget.
- `/ledger-activity`: View recent security events for your account.

---
*For support or feature requests, contact the development team.*
