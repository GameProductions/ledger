-- Migration: 0005_onboarding.sql
CREATE TABLE IF NOT EXISTS user_onboarding (
    user_id TEXT PRIMARY KEY,
    completed_steps_json TEXT DEFAULT '[]',
    is_completed BOOLEAN DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
