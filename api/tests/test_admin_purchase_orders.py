"""Admin purchase-order contract, lifecycle and concurrency regression tests."""

import os
import sys
import uuid
from concurrent.futures import ThreadPoolExecutor

import pytest

os.environ.setdefault("DATABASE_URL", "postgresql://sentry:sentry@localhost:5432/sentry")
os.environ.setdefault("JWT_SECRET", "NEVER_USE_THIS_IN_PRODUCTION_32!")
os.environ.setdefault("SENTRY_ENCRYPTION_KEY", "t5hPIEVn_O41qfiMqAiPEnwzQh68o3Es46YfSOBvEK8=")
os.environ.setdefault("SENTRY_TOKEN_PEPPER", "NEVER_USE_THIS_PEPPER_IN_PRODUCTION")

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from db_test_context import get_raw_connection


def _admin_headers(app):
    with app.test_client() as client:
        response = client.post(
            "/api/auth/login", json={"username": "admin", "password": "admin"},
        )
        assert response.status_code == 200, response.get_json()
        return {"Authorization": f"Bearer {response.get_json()['token']}"}


def _po_line(po_id, item_id):
    conn = get_raw_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT po_line_id, quantity_ordered, quantity_received "
            "FROM purchase_order_lines WHERE po_id = %s AND item_id = %s",
            (po_id, item_id),
        )
        return cur.fetchone()
    finally:
        cur.close()


def test_create_rejects_purchase_order_without_lines(client, app):
    response = client.post(
        "/api/admin/purchase-orders",
        headers=_admin_headers(app),
        json={"po_number": "PO-EMPTY-TEST", "warehouse_id": 1, "lines": []},
    )
    assert response.status_code == 422


def test_create_rejects_non_positive_ordered_quantity(client, app):
    response = client.post(
        "/api/admin/purchase-orders",
        headers=_admin_headers(app),
        json={
            "po_number": "PO-INVALID-QTY-TEST",
            "warehouse_id": 1,
            "lines": [{"item_id": 1, "quantity_ordered": 0}],
        },
    )
    assert response.status_code == 422



def test_create_assigns_distinct_line_numbers_for_multiple_lines(client, app, seed_data):
    response = client.post(
        "/api/admin/purchase-orders",
        headers=_admin_headers(app),
        json={
            "po_number": f"PO-MULTI-{uuid.uuid4().hex[:8]}",
            "warehouse_id": 1,
            "lines": [
                {"item_id": 1, "quantity_ordered": 4},
                {"item_id": 2, "quantity_ordered": 7},
            ],
        },
    )
    assert response.status_code == 200, response.get_json()
    body = response.get_json()
    assert [line["line_number"] for line in body["lines"]] == [1, 2]

def test_received_line_cannot_be_reduced_below_received_or_deleted(
    client, app, auth_headers, seed_data,
):
    po_id = 1
    bin_id = seed_data["staging_bin_id"]
    received = client.post(
        "/api/receiving/receive",
        headers=auth_headers,
        json={"po_id": po_id, "items": [{"item_id": 1, "quantity": 2, "bin_id": bin_id}]},
    )
    assert received.status_code == 200, received.get_json()

    line = _po_line(po_id, 1)
    assert line is not None
    po_line_id, _ordered, quantity_received = line
    admin = _admin_headers(app)

    update = client.patch(
        f"/api/admin/purchase-orders/{po_id}/lines/{po_line_id}",
        headers=admin,
        json={"quantity_ordered": quantity_received - 1},
    )
    assert update.status_code == 400
    assert "cannot be less than" in update.get_json()["error"]

    delete = client.delete(
        f"/api/admin/purchase-orders/{po_id}/lines/{po_line_id}",
        headers=admin,
    )
    assert delete.status_code == 400
    assert "received units" in delete.get_json()["error"]


def test_close_with_pending_receipt_is_explicit_and_reopen_restores_receiving(
    client, app, auth_headers, seed_data,
):
    admin = _admin_headers(app)
    detail = client.get("/api/admin/purchase-orders/1", headers=admin)
    assert detail.status_code == 200
    assert any(line["quantity_ordered"] > line["quantity_received"] for line in detail.get_json()["lines"])

    closed = client.post("/api/admin/purchase-orders/1/close", headers=admin)
    assert closed.status_code == 200
    assert closed.get_json()["status"] == "CLOSED"
    blocked_receive = client.post(
        "/api/receiving/receive",
        headers=auth_headers,
        json={"po_id": 1, "items": [{"item_id": 1, "quantity": 1, "bin_id": seed_data["staging_bin_id"]}]},
    )
    assert blocked_receive.status_code == 400

    reopened = client.post("/api/admin/purchase-orders/1/reopen", headers=admin)
    assert reopened.status_code == 200
    assert reopened.get_json()["status"] == "OPEN"


def test_reopen_rejects_orders_that_are_not_closed(client, app, seed_data):
    admin = _admin_headers(app)
    response = client.post("/api/admin/purchase-orders/1/reopen", headers=admin)
    assert response.status_code == 409


def test_concurrent_receive_and_close_serialize_on_purchase_order(client, app, auth_headers, seed_data):
    po_id = 1
    bin_id = seed_data["staging_bin_id"]
    admin = _admin_headers(app)

    def receive():
        with app.test_client() as worker:
            return worker.post(
                "/api/receiving/receive",
                headers=auth_headers,
                json={"po_id": po_id, "items": [{"item_id": 1, "quantity": 1, "bin_id": bin_id}]},
            )

    def close():
        with app.test_client() as worker:
            return worker.post(f"/api/admin/purchase-orders/{po_id}/close", headers=admin)

    with ThreadPoolExecutor(max_workers=2) as pool:
        receive_future = pool.submit(receive)
        close_future = pool.submit(close)
        receive_response = receive_future.result()
        close_response = close_future.result()

    assert close_response.status_code == 200, close_response.get_json()
    assert receive_response.status_code in (200, 400), receive_response.get_json()
    line = _po_line(po_id, 1)
    assert line is not None
    # The receive either committed before close or observed CLOSED after
    # waiting for the aggregate lock. It must never partially apply.
    assert line[2] == (1 if receive_response.status_code == 200 else 0)
