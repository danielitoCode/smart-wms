-- 083: durable idempotency receipts for inter-warehouse transfers.
-- A request row and every stock/audit/bin_transfers mutation commit atomically.
-- user_id prevents username reuse from inheriting an earlier actor's receipt.
CREATE TABLE IF NOT EXISTS inter_warehouse_transfer_requests (
    user_id           INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    idempotency_key   UUID NOT NULL,
    request_payload   JSONB NOT NULL,
    response_payload  JSONB NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS ix_inter_warehouse_transfer_requests_created
    ON inter_warehouse_transfer_requests(created_at);
