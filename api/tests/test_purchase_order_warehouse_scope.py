"""Warehouse-isolation regression tests for admin purchase orders and receiving reversals."""

import os
import sys
import uuid

import pytest

os.environ.setdefault("DATABASE_URL", "postgresql://sentry:sentry@localhost:5432/sentry")
os.environ.setdefault("JWT_SECRET", "NEVER_USE_THIS_IN_PRODUCTION_32!")
os.environ.setdefault("SENTRY_ENCRYPTION_KEY", "t5hPIEVn_O41qfiMqAiPEnwzQh68o3Es46YfSOBvEK8=")
os.environ.setdefault("SENTRY_TOKEN_PEPPER", "NEVER_USE_THIS_PEPPER_IN_PRODUCTION")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from db_test_context import get_raw_connection

_PASSWORD_HASH = "$2b$12$zDGRKFLmc6v/A4mVhxOzb.7uoW1ulnXn0AisK5uJ5iWk33vC2EpSK"


def _admin_headers(client):
    response = client.post("/api/auth/login", json={"username": "admin", "password": "admin"})
    assert response.status_code == 200, response.get_json()
    return {"Authorization": f"Bearer {response.get_json()['token']}"}


def _user_headers(client, warehouse_ids, page_keys):
    username = f"po_scope_{uuid.uuid4().hex[:10]}"
    conn = get_raw_connection()
    cur = conn.cursor()
    ids = "{" + ",".join(str(value) for value in warehouse_ids) + "}"
    cur.execute(
        """INSERT INTO users (username, password_hash, full_name, role,
               warehouse_id, warehouse_ids, allowed_functions, external_id)
           VALUES (%s, %s, 'PO scope test', 'USER', %s, %s,
                   '{pick,receive,count}', %s) RETURNING user_id""",
        (username, _PASSWORD_HASH, warehouse_ids[0], ids, str(uuid.uuid4())),
    )
    user_id = cur.fetchone()[0]
    for page_key in page_keys:
        cur.execute(
            "INSERT INTO user_page_permissions (user_id, page_key) VALUES (%s, %s)",
            (user_id, page_key),
        )
    cur.close()
    response = client.post("/api/auth/login", json={"username": username, "password": "admin"})
    assert response.status_code == 200, response.get_json()
    return {"Authorization": f"Bearer {response.get_json()['token']}"}


def _query_one(sql, params=()):
    conn = get_raw_connection()
    cur = conn.cursor()
    try:
        cur.execute(sql, params)
        return cur.fetchone()
    finally:
        cur.close()


def _create_warehouse_two_po(client, admin_headers):
    po_number = f"PO-WH-SCOPE-{uuid.uuid4().hex[:8]}"
    response = client.post(
        "/api/admin/purchase-orders",
        headers=admin_headers,
        json={
            "po_number": po_number,
            "warehouse_id": 2,
            "lines": [{"item_id": 1, "quantity_ordered": 5}],
        },
    )
    assert response.status_code == 200, response.get_json()
    return response.get_json()["po_id"]


def test_admin_purchase_order_reads_and_lifecycle_are_warehouse_scoped(client):
    admin = _admin_headers(client)
    po_id = _create_warehouse_two_po(client, admin)
    user = _user_headers(client, [1], ["purchase-orders"])

    listing = client.get("/api/admin/purchase-orders?per_page=1000", headers=user)
    assert listing.status_code == 200, listing.get_json()
    assert po_id not in {row["po_id"] for row in listing.get_json()["purchase_orders"]}

    assert client.get(f"/api/admin/purchase-orders/{po_id}", headers=user).status_code == 404
    assert client.post(f"/api/admin/purchase-orders/{po_id}/close", headers=user).status_code == 404
    assert client.post(f"/api/admin/purchase-orders/{po_id}/reopen", headers=user).status_code == 404


def test_receipt_history_unreceive_and_batch_cancel_respect_warehouse_scope(client):
    admin = _admin_headers(client)
    po_id = _create_warehouse_two_po(client, admin)
    bin_row = _query_one("SELECT bin_id FROM bins WHERE warehouse_id = 2 ORDER BY bin_id LIMIT 1")
    if bin_row is None:
        pytest.skip("warehouse 2 has no bin available for receiving test")
    received = client.post(
        "/api/receiving/receive",
        headers=admin,
        json={"po_id": po_id, "items": [{"item_id": 1, "quantity": 1, "bin_id": bin_row[0]}]},
    )
    assert received.status_code == 200, received.get_json()
    receipt_id = received.get_json()["receipt_ids"][0]
    user = _user_headers(client, [1], ["purchase-orders", "receiving"])

    history = client.get(f"/api/admin/purchase-orders/{po_id}/receipts", headers=user)
    assert history.status_code == 404
    unreceive = client.post(
        f"/api/admin/receipts/{receipt_id}/unreceive",
        json={"reason": "scope test"},
        headers=user,
    )
    assert unreceive.status_code == 404
    cancel = client.post(
        "/api/receiving/cancel",
        json={"po_id": po_id, "receipt_ids": [999999999]},
        headers=user,
    )
    assert cancel.status_code == 404
    assert _query_one("SELECT 1 FROM item_receipts WHERE receipt_id = %s", (receipt_id,)) is not None


def test_create_purchase_order_rejects_unassigned_warehouse(client):
    user = _user_headers(client, [1], ["purchase-orders"])
    response = client.post(
        "/api/admin/purchase-orders",
        headers=user,
        json={
            "po_number": f"PO-WH-DENIED-{uuid.uuid4().hex[:8]}",
            "warehouse_id": 2,
            "lines": [{"item_id": 1, "quantity_ordered": 1}],
        },
    )
    assert response.status_code == 403


def test_receiving_grant_can_list_only_bins_in_assigned_warehouse(client):
    user = _user_headers(client, [1], ["receiving"])

    own = client.get("/api/admin/bins?warehouse_id=1&per_page=1000", headers=user)
    assert own.status_code == 200, own.get_json()
    assert all(row["warehouse_id"] == 1 for row in own.get_json()["bins"])

    foreign = client.get("/api/admin/bins?warehouse_id=2&per_page=1000", headers=user)
    assert foreign.status_code == 200, foreign.get_json()
    assert foreign.get_json()["bins"] == []
