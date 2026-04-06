-- God Mode Enhancements: System Announcements & Configuration
CREATE TABLE IF NOT EXISTS system_announcements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content_md TEXT NOT NULL,
    priority TEXT DEFAULT 'info', -- info, warning, critical
    is_active INTEGER DEFAULT 1,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    actor_id TEXT NOT NULL,
    FOREIGN KEY (actor_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_announcements_active ON system_announcements(is_active) WHERE is_active = 1;

-- Ensure MAINTENANCE_MODE exists in system_config
INSERT OR IGNORE INTO system_config (id, config_key, config_value, description) 
VALUES (hex(randomblob(16)), 'MAINTENANCE_MODE', 'false', 'Global emergency maintenance toggle (true/false)');
