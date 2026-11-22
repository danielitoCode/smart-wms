"""Warehouse-isolation regression tests for admin purchase orders and receiving reversals."""

import os
import sys
import uuid

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




def _create_warehouse_two_staging_bin():
    suffix = uuid.uuid4().hex[:8]
    zone_id = _query_one(
        """INSERT INTO zones (warehouse_id, zone_code, zone_name, zone_type)
           VALUES (2, %s, %s, 'RECEIVING') RETURNING zone_id""",
        (f"R2-{suffix}", "R2 receiving test zone"),
    )[0]
    return _query_one(
        """INSERT INTO bins (
               zone_id, warehouse_id, bin_code, bin_barcode, bin_type,
               pick_sequence, putaway_sequence, external_id
           ) VALUES (%s, 2, %s, %s, 'Staging', 0, 0, %s)
           RETURNING bin_id""",
        (zone_id, f"R2-{suffix}", f"R2-{suffix}", str(uuid.uuid4())),
    )[0]

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
    return response.get_json()["purchase_order"]["po_id"]


def test_admin_purchase_order_reads_and_lifecycle_are_warehouse_scoped(client):
    admin = _admin_headers(client)
    po_id = _create_warehouse_two_po(client, admin)
    user = _user_headers(client, [1], ["purchase-orders"])

    listing = client.get("/api/admin/purchase-orders?per_page=1000", headers=user)
    assert listing.status_code == 200, listing.get_json()
    assert po_id not in {row["po_id"] for row in listing.get_json()["purchase_orders"]}

    assert client.get(f"/api/admin/purchase-orders/{po_id}", headers=user).status_code == 404
    assert client.put(
        f"/api/admin/purchase-orders/{po_id}", json={"notes": "must not change"}, headers=user
    ).status_code == 404
    assert client.post(
        f"/api/admin/purchase-orders/{po_id}/lines",
        json={"item_id": 1, "quantity_ordered": 1}, headers=user,
    ).status_code == 404
    line_id = _query_one(
        "SELECT po_line_id FROM purchase_order_lines WHERE po_id = %s ORDER BY po_line_id LIMIT 1",
        (po_id,),
    )[0]
    assert client.patch(
        f"/api/admin/purchase-orders/{po_id}/lines/{line_id}",
        json={"quantity_ordered": 6}, headers=user,
    ).status_code == 404
    assert client.delete(
        f"/api/admin/purchase-orders/{po_id}/lines/{line_id}", headers=user
    ).status_code == 404
    assert client.post(f"/api/admin/purchase-orders/{po_id}/close", headers=user).status_code == 404
    assert client.post(f"/api/admin/purchase-orders/{po_id}/reopen", headers=user).status_code == 404
    assert _query_one(
        "SELECT notes FROM purchase_orders WHERE po_id = %s", (po_id,)
    )[0] is None
    assert _query_one(
        "SELECT quantity_ordered FROM purchase_order_lines WHERE po_id = %s", (po_id,)
    )[0] == 5
    assert client.get("/api/admin/bins?warehouse_id=1", headers=user).status_code == 403


def test_receipt_history_unreceive_and_batch_cancel_respect_warehouse_scope(client):
    admin = _admin_headers(client)
    po_id = _create_warehouse_two_po(client, admin)
    bin_id = _create_warehouse_two_staging_bin()
    received = client.post(
        "/api/receiving/receive",
        headers=admin,
        json={"po_id": po_id, "items": [{"item_id": 1, "quantity": 1, "bin_id": bin_id}]},
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


def test_receiving_routes_require_receiving_page_grant(client):
    user = _user_headers(client, [1], [])
    headers = user
    assert client.get("/api/receiving/po/PO-2026-001", headers=headers).status_code == 403
    assert client.post(
        "/api/receiving/receive",
        headers=headers,
        json={"po_id": 1, "items": [{"item_id": 1, "quantity": 1, "bin_id": 1}]},
    ).status_code == 403
    assert client.post(
        "/api/receiving/cancel",
        headers=headers,
        json={"po_id": 1, "receipt_ids": [999999999]},
    ).status_code == 403


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


def test_receiving_grant_can_list_only_bins_and_purchase_orders_in_assigned_warehouse(client):
    admin = _admin_headers(client)
    own_po_number = f"PO-WH-OWN-{uuid.uuid4().hex[:8]}"
    own_po = client.post(
        "/api/admin/purchase-orders",
        headers=admin,
        json={
            "po_number": own_po_number,
            "warehouse_id": 1,
            "lines": [{"item_id": 1, "quantity_ordered": 2}],
        },
    )
    assert own_po.status_code == 200, own_po.get_json()
    foreign_po_id = _create_warehouse_two_po(client, admin)
    user = _user_headers(client, [1], ["receiving"])

    own = client.get("/api/admin/bins?warehouse_id=1&per_page=1000", headers=user)
    assert own.status_code == 200, own.get_json()
    assert all(row["warehouse_id"] == 1 for row in own.get_json()["bins"])

    scoped = client.get("/api/admin/bins?per_page=1000", headers=user)
    assert scoped.status_code == 200, scoped.get_json()
    assert all(row["warehouse_id"] == 1 for row in scoped.get_json()["bins"])

    foreign = client.get("/api/admin/bins?warehouse_id=2&per_page=1000", headers=user)
    assert foreign.status_code == 403

    orders = client.get("/api/admin/purchase-orders?per_page=1000", headers=user)
    assert orders.status_code == 200, orders.get_json()
    listed_ids = {row["po_id"] for row in orders.get_json()["purchase_orders"]}
    own_po_id = own_po.get_json()["purchase_order"]["po_id"]
    assert own_po_id in listed_ids
    assert foreign_po_id not in listed_ids

    lookup = client.get(f"/api/receiving/po/{own_po_number}", headers=user)
    assert lookup.status_code == 200, lookup.get_json()
    assert lookup.get_json()["purchase_order"]["warehouse_id"] == 1

    own_bin_id = _query_one(
        """SELECT bin_id FROM bins
           WHERE warehouse_id = 1 AND is_active = TRUE AND bin_type = 'Staging'
           ORDER BY bin_id LIMIT 1"""
    )[0]
    own_receive = client.post(
        "/api/receiving/receive",
        headers=user,
        json={"po_id": own_po_id, "items": [{"item_id": 1, "quantity": 1, "bin_id": own_bin_id}]},
    )
    assert own_receive.status_code == 200, own_receive.get_json()
    own_receipt_id = own_receive.get_json()["receipt_ids"][0]
    assert _query_one(
        "SELECT warehouse_id FROM item_receipts WHERE receipt_id = %s AND po_id = %s",
        (own_receipt_id, own_po_id),
    )[0] == 1
    assert _query_one(
        "SELECT quantity_received FROM purchase_order_lines WHERE po_id = %s AND item_id = 1",
        (own_po_id,),
    )[0] == 1

    foreign_bin_id = _create_warehouse_two_staging_bin()
    foreign_receive = client.post(
        "/api/receiving/receive",
        headers=user,
        json={"po_id": foreign_po_id, "items": [{"item_id": 1, "quantity": 1, "bin_id": foreign_bin_id}]},
    )
    assert foreign_receive.status_code == 404
    assert _query_one(
        "SELECT COUNT(*) FROM item_receipts WHERE po_id = %s", (foreign_po_id,)
    )[0] == 0
    assert _query_one(
        "SELECT quantity_received FROM purchase_order_lines WHERE po_id = %s AND item_id = 1",
        (foreign_po_id,),
    )[0] == 0

    denied_foreign_filter = client.get(
        "/api/admin/purchase-orders?warehouse_id=2", headers=user
    )
    assert denied_foreign_filter.status_code == 403
