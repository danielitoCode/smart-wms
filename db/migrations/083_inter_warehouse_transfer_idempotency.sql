-- 083: durable idempotency receipts for inter-warehouse transfers.
-- A request row and every stock/audit/bin_transfers mutation commit atomically.
-- The composite key scopes replay protection to the authenticated actor.
CREATE TABLE IF NOT EXISTS inter_warehouse_transfer_requests (
    username          VARCHAR(100) NOT NULL,
    idempotency_key   UUID NOT NULL,
    request_payload   JSONB NOT NULL,
    response_payload  JSONB NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (username, idempotency_key)
);

CREATE INDEX IF NOT EXISTS ix_inter_warehouse_transfer_requests_created
    ON inter_warehouse_transfer_requests(created_at);
