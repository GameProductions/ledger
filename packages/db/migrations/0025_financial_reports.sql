-- Migration: 0025_financial_reports.sql
-- Phase 5: Financial Intelligence & Reporting (v1.22.0)

CREATE TABLE reports (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL,
    type TEXT NOT NULL, -- 'monthly_summary', 'net_worth_snapshot', 'burn_rate_audit'
    period_start DATE,
    period_end DATE,
    data_json TEXT NOT NULL, -- Payload containing facts and figures
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (household_id) REFERENCES households(id)
);

CREATE INDEX idx_reports_household_period ON reports(household_id, period_start, period_end);
CREATE INDEX idx_reports_type ON reports(type);
