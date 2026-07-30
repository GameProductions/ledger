ALTER TABLE reconciliation_proposals ADD COLUMN IF NOT EXISTS updated_at text;
ALTER TABLE reconciliation_proposals ADD COLUMN IF NOT EXISTS approved_by text;
ALTER TABLE reconciliation_proposals ADD COLUMN IF NOT EXISTS approved_at text;
ALTER TABLE reconciliation_proposals ADD CONSTRAINT uq_reconciliation_proposals_pair UNIQUE (primary_transaction_id, suggested_transaction_id);
