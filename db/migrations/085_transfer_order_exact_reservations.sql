-- ============================================================
-- Migration 085: exact Transfer Order inventory reservations
-- ============================================================
-- Older TOs cannot be backfilled safely: inventory.quantity_allocated
-- is shared with sales orders and other reservation owners, so its
-- current per-bin balance does not identify the owner. Keep those
-- rows explicitly untracked and fail closed on destructive/stock-moving
-- operations until they are reconciled manually.
--
-- New TOs use one reservation row per TO line and inventory row.
-- Approval consumes the exact row; cancel/short-close releases only
-- the remaining quantity owned by that line.
-- ============================================================

BEGIN;

ALTER TABLE transfer_orders
    ADD COLUMN IF NOT EXISTS reservations_tracked BOOLEAN NOT NULL DEFAULT FALSE;

-- Existing rows retain FALSE. All rows created after this migration
-- default to TRUE and must persist their allocations in the table below.
ALTER TABLE transfer_orders
    ALTER COLUMN reservations_tracked SET DEFAULT TRUE;

ALTER TABLE pick_tasks
    ADD COLUMN IF NOT EXISTS inventory_id INT
        REFERENCES inventory(inventory_id) ON DELETE SET NULL;

ALTER TABLE pick_tasks
    ADD COLUMN IF NOT EXISTS quantity_approved INT NOT NULL DEFAULT 0;

DO $
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conname = 'pick_tasks_quantity_approved_check'
    ) THEN
        ALTER TABLE pick_tasks
            ADD CONSTRAINT pick_tasks_quantity_approved_check
            CHECK (quantity_approved >= 0 AND quantity_approved <= quantity_picked);
    END IF;
END $;

CREATE INDEX IF NOT EXISTS ix_pick_tasks_inventory
    ON pick_tasks(inventory_id);

CREATE TABLE IF NOT EXISTS transfer_order_reservations (
    reservation_id BIGSERIAL PRIMARY KEY,
    to_line_id INT NOT NULL
        REFERENCES transfer_order_lines(to_line_id) ON DELETE CASCADE,
    inventory_id INT NOT NULL
        REFERENCES inventory(inventory_id),
    reserved_qty INT NOT NULL CHECK (reserved_qty > 0),
    consumed_qty INT NOT NULL DEFAULT 0 CHECK (consumed_qty >= 0),
    released_qty INT NOT NULL DEFAULT 0 CHECK (released_qty >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT transfer_order_reservations_consumed_released
        CHECK (consumed_qty + released_qty <= reserved_qty),
    CONSTRAINT transfer_order_reservations_line_inventory_unique
        UNIQUE (to_line_id, inventory_id)
);

CREATE INDEX IF NOT EXISTS ix_to_reservations_line
    ON transfer_order_reservations(to_line_id, inventory_id);

CREATE INDEX IF NOT EXISTS ix_to_reservations_inventory
    ON transfer_order_reservations(inventory_id);


-- Protect TO-owned reservations from unrelated allocation releases (e.g.
-- SO cancellation or picking). The aggregate inventory counter is shared,
-- so every decrement must leave at least the sum of still-open TO
-- reservations on that exact inventory row.
CREATE OR REPLACE FUNCTION prevent_to_reservation_underallocation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $
DECLARE
    reserved_total BIGINT;
BEGIN
    SELECT COALESCE(SUM(reserved_qty - consumed_qty - released_qty), 0)
      INTO reserved_total
      FROM transfer_order_reservations
     WHERE inventory_id = NEW.inventory_id;

    IF NEW.quantity_allocated < reserved_total THEN
        RAISE EXCEPTION
            'inventory_id=% allocation % would undercut open Transfer Order reservations %',
            NEW.inventory_id, NEW.quantity_allocated, reserved_total
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$;

DROP TRIGGER IF EXISTS trg_inventory_to_reservation_floor ON inventory;
CREATE TRIGGER trg_inventory_to_reservation_floor
BEFORE UPDATE OF quantity_allocated ON inventory
FOR EACH ROW
EXECUTE FUNCTION prevent_to_reservation_underallocation();

COMMIT;
