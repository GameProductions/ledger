-- Seed Data for CASH (YOLO Mode)

-- Insert a default household
INSERT INTO households (id, name, currency, country_code) VALUES
('household-abc', 'Main Home', 'USD', 'US'),
('household-xyz', 'Business Expense', 'USD', 'US');

-- Insert users
INSERT INTO users (id, email, display_name) VALUES
('user-123', 'yolo@example.com', 'YOLO User');

-- Map users to households
INSERT INTO user_households (user_id, household_id, role) VALUES
('user-123', 'household-abc', 'admin'),
('user-123', 'household-xyz', 'member');

-- Insert categories for both households
INSERT INTO categories (id, household_id, name, icon, color, monthly_budget_cents) VALUES
('cat-1', 'household-abc', 'Groceries', '🛒', '#10b981', 60000),
('cat-2', 'household-abc', 'Rent', '🏠', '#3b82f6', 200000),
('cat-3', 'household-abc', 'Entertainment', '🎬', '#f59e0b', 20000),
('cat-4', 'household-xyz', 'Cloud Hosting', '☁️', '#3b82f6', 50000);

-- Insert accounts
INSERT INTO accounts (id, household_id, name, type, balance_cents) VALUES
('acc-1', 'household-abc', 'Main Checking', 'checking', 250000),
('acc-2', 'household-abc', 'Emergency Fund', 'savings', 1000000),
('acc-3', 'household-abc', 'Wallet', 'cash', 5000);

-- Insert some transactions
INSERT INTO transactions (id, household_id, account_id, category_id, amount_cents, description, status) VALUES 
('tx-1', 'household-abc', 'acc-1', 'cat-1', 4520, 'Whole Foods', 'reconciled'),
('tx-2', 'household-abc', 'acc-1', 'cat-3', 1599, 'Netflix Subscription', 'accounted_for');

-- Insert templates
INSERT INTO templates (id, household_id, name, description, amount_cents, category_id, account_id) VALUES 
('tpl-1', 'household-abc', 'Starbucks', 'Morning Coffee', 575, 'cat-3', 'acc-1'),
('tpl-2', 'household-abc', 'Trader Joes', 'Weekly Groceries', 8500, 'cat-1', 'acc-1');
