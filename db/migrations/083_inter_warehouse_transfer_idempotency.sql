-- 083: durable idempotency receipts for inter-warehouse transfers.
-- The actor is initially stored by username; migration 084 upgrades this
-- to the immutable users.user_id identity.
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
