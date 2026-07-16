-- BNPL & Lender Providers — seeded as stable reference data
-- Billers provide logo/website/industry; ServiceProviders link to them for entity-manager access

--> statement-breakpoint
INSERT INTO "billers" ("id", "name", "website", "logo_url", "industry") VALUES
  ('biller_affirm', 'Affirm', 'https://www.affirm.com', 'https://cdn.affirm.com/common/images/logo/affirm_logo_dark.svg', 'BNPL'),
  ('biller_klarna', 'Klarna', 'https://www.klarna.com', 'https://cdn.klarna.com/1.0/shared/content/generic/logo/klarna_logo.png', 'BNPL'),
  ('biller_afterpay', 'Afterpay', 'https://www.afterpay.com', 'https://www.afterpay.com/favicon.ico', 'BNPL'),
  ('biller_paypal_pay4', 'PayPal Pay in 4', 'https://www.paypal.com', 'https://www.paypal.com/favicon.ico', 'BNPL'),
  ('biller_sezzle', 'Sezzle', 'https://www.sezzle.com', 'https://www.sezzle.com/favicon.ico', 'BNPL'),
  ('biller_zip', 'Zip', 'https://zip.co', 'https://zip.co/favicon.ico', 'BNPL'),
  ('biller_splitit', 'Splitit', 'https://www.splitit.com', 'https://www.splitit.com/favicon.ico', 'BNPL'),
  ('biller_uplift', 'Uplift', 'https://www.uplift.com', 'https://www.uplift.com/favicon.ico', 'BNPL'),
  ('biller_sunbit', 'Sunbit', 'https://www.sunbit.com', 'https://www.sunbit.com/favicon.ico', 'BNPL'),
  ('biller_perpay', 'Perpay', 'https://www.perpay.com', 'https://www.perpay.com/favicon.ico', 'BNPL')
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint

INSERT INTO "service_providers" ("id", "name", "visibility", "status", "biller_id", "icon_url") VALUES
  ('sp_affirm', 'Affirm', 'public', 'active', 'biller_affirm', 'https://cdn.affirm.com/common/images/logo/affirm_logo_dark.svg'),
  ('sp_klarna', 'Klarna', 'public', 'active', 'biller_klarna', 'https://cdn.klarna.com/1.0/shared/content/generic/logo/klarna_logo.png'),
  ('sp_afterpay', 'Afterpay', 'public', 'active', 'biller_afterpay', 'https://www.afterpay.com/favicon.ico'),
  ('sp_paypal_pay4', 'PayPal Pay in 4', 'public', 'active', 'biller_paypal_pay4', 'https://www.paypal.com/favicon.ico'),
  ('sp_sezzle', 'Sezzle', 'public', 'active', 'biller_sezzle', 'https://www.sezzle.com/favicon.ico'),
  ('sp_zip', 'Zip', 'public', 'active', 'biller_zip', 'https://zip.co/favicon.ico'),
  ('sp_splitit', 'Splitit', 'public', 'active', 'biller_splitit', 'https://www.splitit.com/favicon.ico'),
  ('sp_uplift', 'Uplift', 'public', 'active', 'biller_uplift', 'https://www.uplift.com/favicon.ico'),
  ('sp_sunbit', 'Sunbit', 'public', 'active', 'biller_sunbit', 'https://www.sunbit.com/favicon.ico'),
  ('sp_perpay', 'Perpay', 'public', 'active', 'biller_perpay', 'https://www.perpay.com/favicon.ico')
ON CONFLICT ("id") DO NOTHING;
