-- 084: bind inter-warehouse idempotency receipts to immutable user IDs.
-- Upgrade installations that already ran migration 083 with username keys.
-- Fresh schema.sql installations already create the final user_id shape.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = current_schema()
           AND table_name = 'inter_warehouse_transfer_requests'
           AND column_name = 'username'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = current_schema()
           AND table_name = 'inter_warehouse_transfer_requests'
           AND column_name = 'user_id'
    ) THEN
        ALTER TABLE inter_warehouse_transfer_requests ADD COLUMN user_id INT;

        UPDATE inter_warehouse_transfer_requests r
           SET user_id = u.user_id
          FROM users u
         WHERE u.username = r.username;

        -- Receipts belonging to deleted usernames cannot be replayed by a
        -- current account; discard only those orphaned historical receipts.
        DELETE FROM inter_warehouse_transfer_requests WHERE user_id IS NULL;

        ALTER TABLE inter_warehouse_transfer_requests
            ALTER COLUMN user_id SET NOT NULL;

        ALTER TABLE inter_warehouse_transfer_requests
            DROP CONSTRAINT IF EXISTS inter_warehouse_transfer_requests_pkey;

        ALTER TABLE inter_warehouse_transfer_requests
            ADD CONSTRAINT inter_warehouse_transfer_requests_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

        ALTER TABLE inter_warehouse_transfer_requests
            ADD CONSTRAINT inter_warehouse_transfer_requests_pkey
            PRIMARY KEY (user_id, idempotency_key);

        ALTER TABLE inter_warehouse_transfer_requests DROP COLUMN username;
    END IF;
END
$$;
