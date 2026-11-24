-- Test-only identities for the isolated smart-wms-r2-e2e PostgreSQL volume.
-- Password for all three lab accounts: admin (never use outside this DB).
-- Idempotent: Start-R2E2E.ps1 reapplies this after API pytest reseeds the DB.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO users (
    username, password_hash, full_name, role, warehouse_id,
    warehouse_ids, allowed_functions, must_change_password, external_id
)
VALUES (
    'r2_user', crypt('admin', gen_salt('bf')), 'R2 E2E Receiving User',
    'USER', 1, ARRAY[1], '{receive}', FALSE, gen_random_uuid()
)
ON CONFLICT (username) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    warehouse_id = EXCLUDED.warehouse_id,
    warehouse_ids = EXCLUDED.warehouse_ids,
    allowed_functions = EXCLUDED.allowed_functions,
    must_change_password = FALSE;

DELETE FROM user_page_permissions
WHERE user_id = (SELECT user_id FROM users WHERE username = 'r2_user');
INSERT INTO user_page_permissions (user_id, page_key)
SELECT user_id, 'receiving' FROM users WHERE username = 'r2_user';

INSERT INTO users (
    username, password_hash, full_name, role, warehouse_id,
    warehouse_ids, allowed_functions, must_change_password, external_id
)
VALUES (
    'r2_limited', crypt('admin', gen_salt('bf')), 'R2 E2E Limited User',
    'USER', 1, ARRAY[1], '{}', FALSE, gen_random_uuid()
)
ON CONFLICT (username) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    warehouse_id = EXCLUDED.warehouse_id,
    warehouse_ids = EXCLUDED.warehouse_ids,
    allowed_functions = EXCLUDED.allowed_functions,
    must_change_password = FALSE;

DELETE FROM user_page_permissions
WHERE user_id = (SELECT user_id FROM users WHERE username = 'r2_limited');
