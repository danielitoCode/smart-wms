-- 085: durable, line-owned inventory reservations for transfer orders.
-- A reservation row records exactly which inventory/bin/lot quantity belongs
-- to one transfer-order line. quantity_allocated remains the aggregate ATP
-- counter; this table is the ownership ledger used for consume/release.
SET lock_timeout = '5s';
SET statement_timeout = '60s';

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS ux_transfer_order_lines_id_to
    ON transfer_order_lines(to_line_id, to_id);

CREATE TABLE IF NOT EXISTS transfer_order_reservations (
    reservation_id       BIGSERIAL PRIMARY KEY,
    to_id                INT NOT NULL,
    to_line_id           INT NOT NULL,
    inventory_id         INT NOT NULL REFERENCES inventory(inventory_id),
    item_id              INT NOT NULL REFERENCES items(item_id),
    warehouse_id         INT NOT NULL REFERENCES warehouses(warehouse_id),
    quantity_reserved    INT NOT NULL CHECK (quantity_reserved > 0),
    quantity_consumed    INT NOT NULL DEFAULT 0 CHECK (quantity_consumed >= 0),
    quantity_released    INT NOT NULL DEFAULT 0 CHECK (quantity_released >= 0),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT transfer_order_reservation_line_inventory_uq
        UNIQUE (to_line_id, inventory_id),
    CONSTRAINT transfer_order_reservation_line_owner_ck
        CHECK (to_id > 0 AND to_line_id > 0),
    CONSTRAINT transfer_order_reservation_line_fk
        FOREIGN KEY (to_line_id, to_id)
        REFERENCES transfer_order_lines(to_line_id, to_id) ON DELETE CASCADE,
    CONSTRAINT transfer_order_reservation_balance_ck
        CHECK (quantity_consumed + quantity_released <= quantity_reserved)
);

CREATE INDEX IF NOT EXISTS ix_to_reservations_to_line
    ON transfer_order_reservations(to_id, to_line_id);
CREATE INDEX IF NOT EXISTS ix_to_reservations_inventory
    ON transfer_order_reservations(inventory_id);

-- Existing aggregate quantity_allocated values cannot identify which TO
-- owns which bin/lot. Do not fabricate ownership by allocating another
-- order's (or an SO's) reservation. Require active TOs to be reconciled
-- before applying this migration; closed/cancelled TO history is unaffected.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
          FROM transfer_order_lines tol
          JOIN transfer_orders too ON too.to_id = tol.to_id
         WHERE tol.committed_qty > tol.approved_qty
           AND tol.status <> 'SHORT_CLOSED'
           AND too.status NOT IN ('CLOSED', 'CANCELLED')
    ) THEN
        RAISE EXCEPTION
            'Migration 085 requires active transfer orders to be reconciled first: cancel/close them or create verified line/bin reservations before retrying';
    END IF;
END $$;

COMMIT;
