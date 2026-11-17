"""Transfer-order warehouse scope must cover both sides of the move."""
import os
import sys
import uuid

os.environ.setdefault("DATABASE_URL", "postgresql://sentry:sentry@localhost:5432/sentry")
os.environ.setdefault("JWT_SECRET", "NEVER_USE_THIS_IN_PRODUCTION_32!")
os.environ.setdefault("SENTRY_ENCRYPTION_KEY", "t5hPIEVn_O41qfiMqAiPEnwzQh68o3Es46YfSOBvEK8=")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import db_test_context


_PASSWORD_HASH = "$2b$12$zDGRKFLmc6v/A4mVhxOzb.7uoW1ulnXn0AisK5uJ5iWk33vC2EpSK"


def _query(sql, params=()):
    conn = db_test_context.get_raw_connection()
    cur = conn.cursor()
    try:
        cur.execute(sql, params)
        return cur.fetchall() if cur.description else None
    finally:
        cur.close()


def _create_transfer_user(client, username, warehouse_ids):
    _query("DELETE FROM login_attempts")
    conn = db_test_context.get_raw_connection()
    cur = conn.cursor()
    try:
        ids = "{" + ",".join(str(value) for value in warehouse_ids) + "}"
        cur.execute(
            """INSERT INTO users (username, password_hash, full_name, role,
                   warehouse_id, warehouse_ids, allowed_functions, external_id)
               VALUES (%s, %s, 'Transfer scope test', 'USER', %s, %s,
                       '{pick,receive,count}', %s) RETURNING user_id""",
            (username, _PASSWORD_HASH, warehouse_ids[0], ids, str(uuid.uuid4())),
        )
        user_id = cur.fetchone()[0]
        cur.execute(
            "INSERT INTO user_page_permissions (user_id, page_key) VALUES (%s, 'transfer-orders')",
            (user_id,),
        )
    finally:
        cur.close()
    response = client.post("/api/auth/login", json={"username": username, "password": "admin"})
    assert response.status_code == 200, response.get_json()
    return {"Authorization": f"Bearer {response.get_json()['token']}"}


def _seed_to():
    conn = db_test_context.get_raw_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """INSERT INTO transfer_orders
               (to_number, source_warehouse_id, destination_warehouse_id,
                status, created_by, external_id)
               VALUES (%s, 1, 2, 'OPEN', 'scope-test', %s)
               RETURNING to_id""",
            (f"TO-SCOPE-{uuid.uuid4().hex[:10]}", str(uuid.uuid4())),
        )
        return cur.fetchone()[0]
    finally:
        cur.close()


class TestTransferOrderWarehouseScope:
    def test_admin_list_and_detail_require_access_to_both_warehouses(self, client):
        to_id = _seed_to()
        source_only = _create_transfer_user(client, f"to-src-{uuid.uuid4().hex[:6]}", [1])
        warehouse_response = client.get("/api/warehouses/list", headers=source_only)
        assert warehouse_response.status_code == 200
        assert {row["id"] for row in warehouse_response.get_json()["warehouses"]} == {1}
        response = client.get("/api/admin/transfer-orders", headers=source_only)
        assert response.status_code == 200
        assert to_id not in {row["to_id"] for row in response.get_json()["transfer_orders"]}
        detail = client.get(f"/api/admin/transfer-orders/{to_id}", headers=source_only)
        assert detail.status_code == 404

        both = _create_transfer_user(client, f"to-both-{uuid.uuid4().hex[:6]}", [1, 2])
        warehouse_response = client.get("/api/warehouses/list", headers=both)
        assert {row["id"] for row in warehouse_response.get_json()["warehouses"]} >= {1, 2}
        response = client.get("/api/admin/transfer-orders", headers=both)
        assert response.status_code == 200
        assert to_id in {row["to_id"] for row in response.get_json()["transfer_orders"]}
        detail = client.get(f"/api/admin/transfer-orders/{to_id}", headers=both)
        assert detail.status_code == 200

    def test_import_and_cancel_are_denied_without_destination_access(self, client):
        to_id = _seed_to()
        headers = _create_transfer_user(client, f"to-one-{uuid.uuid4().hex[:6]}", [1])
        codes = _query(
            "SELECT warehouse_id, warehouse_code FROM warehouses WHERE warehouse_id IN (1, 2)"
        )
        warehouse_codes = {row[0]: row[1] for row in codes}
        imported = client.post(
            "/api/admin/transfer-orders/import",
            json={
                "source_warehouse_code": warehouse_codes[1],
                "destination_warehouse_code": warehouse_codes[2],
                "records": [{"sku": "SCOPE-UNKNOWN", "quantity": 1}],
            },
            headers=headers,
        )
        assert imported.status_code == 403
        cancelled = client.post(f"/api/admin/transfer-orders/{to_id}/cancel", headers=headers)
        assert cancelled.status_code == 403

    def test_picker_read_requires_source_access_not_destination_page_grant(self, client):
        to_id = _seed_to()
        source_only = _create_transfer_user(client, f"to-picker-{uuid.uuid4().hex[:6]}", [1])
        response = client.get(f"/api/admin/picker/transfer-orders/{to_id}", headers=source_only)
        assert response.status_code == 200
