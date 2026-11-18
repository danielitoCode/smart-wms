-- 082: persist the reviewer and rejection rationale for inventory adjustments.
-- Safe to apply to existing databases and repeatable.
ALTER TABLE inventory_adjustments
    ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(100),
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(500);
