-- Migration: 0029_webhook_logs.sql
-- Adds logging for outgoing webhook deliveries to improve observability.

CREATE TABLE IF NOT EXISTS webhook_delivery_logs (
    id TEXT PRIMARY KEY,
    webhook_id TEXT NOT NULL,
    event TEXT NOT NULL,
    status_code INTEGER DEFAULT 0, -- 0 = Attempting
    error TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (webhook_id) REFERENCES webhooks(id)
);

CREATE INDEX idx_webhook_logs_webhook_id ON webhook_delivery_logs(webhook_id);
CREATE INDEX idx_webhook_logs_created_at ON webhook_delivery_logs(created_at);
