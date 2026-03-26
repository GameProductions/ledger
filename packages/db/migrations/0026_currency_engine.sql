-- Migration: Universal Currency Engine Configuration
INSERT OR IGNORE INTO system_config (config_key, config_value, value_type, description) VALUES 
('PLATFORM_DEFAULT_CURRENCY', 'USD', 'string', 'The fallback currency used if no user preference is set'),
('PLATFORM_SUPPORTED_CURRENCIES', 'USD,EUR,GBP,JPY,CAD,AUD', 'string', 'Comma-separated list of globally supported currency codes');

INSERT OR IGNORE INTO system_feature_flags (feature_key, enabled_globally, description) VALUES 
('MULTI_CURRENCY_SUPPORT', 1, 'Enables the universal currency selection and display engine');
