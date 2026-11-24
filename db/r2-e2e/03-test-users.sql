-- Test-only identities for the isolated smart-wms-r2-e2e PostgreSQL volume.
-- Password for both accounts: admin (never use these accounts outside this DB).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO users (
    username, password_hash, full_name, role, warehouse_id,
    warehouse_ids, allowed_functions, must_change_password, external_id
)
VALUES (
    'r2_user', crypt('admin', gen_salt('bf')), 'R2 E2E Receiving User',
    'USER', 1, ARRAY[1], '{receive}', FALSE, gen_random_uuid()
);

INSERT INTO user_page_permissions (user_id, page_key)
SELECT user_id, 'receiving' FROM users WHERE username = 'r2_user';

INSERT INTO users (
    username, password_hash, full_name, role, warehouse_id,
    warehouse_ids, allowed_functions, must_change_password, external_id
)
VALUES (
    'r2_limited', crypt('admin', gen_salt('bf')), 'R2 E2E Limited User',
    'USER', 1, ARRAY[1], '{}', FALSE, gen_random_uuid()
);
