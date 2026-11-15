"""Warehouse authorization and lifecycle tests for inventory adjustments."""

from db_test_context import get_raw_connection
from test_admin import _query_val, _web_user_with_pages


def _insert_adjustment(item_id=1, bin_id=3, warehouse_id=1, delta=2, status="PENDING"):
    conn = get_raw_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO inventory_adjustments
            (item_id, bin_id, warehouse_id, quantity_change, reason_code,
             reason_detail, status, adjusted_by, external_id)
        VALUES (%s, %s, %s, %s, 'CORRECTION', 'scope test', %s, 'test-user', gen_random_uuid())
        RETURNING adjustment_id
        """,
        (item_id, bin_id, warehouse_id, delta, status),
    )
    adjustment_id = cur.fetchone()[0]
    cur.close()
    return adjustment_id


def _other_warehouse_bin():
    conn = get_raw_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO warehouses (warehouse_code, warehouse_name) "
        "VALUES ('ADJ-SCOPE', 'Adjustment Scope') RETURNING warehouse_id"
    )
    warehouse_id = cur.fetchone()[0]
    cur.execute(
        "INSERT INTO zones (warehouse_id, zone_code, zone_name, zone_type) "
        "VALUES (%s, 'ADJ-Z', 'Adjustment Scope', 'STORAGE') RETURNING zone_id",
        (warehouse_id,),
    )
    zone_id = cur.fetchone()[0]
    cur.execute(
        """
        INSERT INTO bins
            (zone_id, warehouse_id, bin_code, bin_barcode, bin_type, external_id)
        VALUES (%s, %s, 'ADJ-OUTSIDE', 'ADJ-OUTSIDE', 'Pickable', gen_random_uuid())
        RETURNING bin_id
        """,
        (zone_id, warehouse_id),
    )
    bin_id = cur.fetchone()[0]
    cur.close()
    return warehouse_id, bin_id


class TestInventoryAdjustmentDirect:
    def test_direct_add_is_applied_and_audited(self, client, auth_headers):
        before = _query_val(
            "SELECT COALESCE(SUM(quantity_on_hand), 0) FROM inventory WHERE item_id = 1 AND bin_id = 3"
        )
        response = client.post(
            "/api/admin/adjustments/direct",
            json={
                "item_id": 1, "bin_id": 3, "warehouse_id": 1,
                "adjustment_type": "add", "quantity": 3, "reason": "Found stock",
            },
            headers=auth_headers,
        )
        assert response.status_code == 201
        body = response.get_json()
        assert body["status"] == "APPROVED"
        assert body["quantity_change"] == 3
        assert _query_val(
            "SELECT COALESCE(SUM(quantity_on_hand), 0) FROM inventory WHERE item_id = 1 AND bin_id = 3"
        ) == before + 3
        assert _query_val(
            "SELECT status FROM inventory_adjustments WHERE adjustment_id = %s",
            (body["adjustment_id"],),
        ) == "APPROVED"

    def test_direct_remove_cannot_make_stock_negative(self, client, auth_headers):
        before = _query_val(
            "SELECT COALESCE(SUM(quantity_on_hand), 0) FROM inventory WHERE item_id = 1 AND bin_id = 3"
        )
        response = client.post(
            "/api/admin/adjustments/direct",
            json={
                "item_id": 1, "bin_id": 3, "warehouse_id": 1,
                "adjustment_type": "REMOVE", "quantity": before + 1,
                "reason": "Invalid removal",
            },
            headers=auth_headers,
        )
        assert response.status_code == 409
        assert _query_val(
            "SELECT COALESCE(SUM(quantity_on_hand), 0) FROM inventory WHERE item_id = 1 AND bin_id = 3"
        ) == before

    def test_direct_rejects_bin_warehouse_mismatch(self, client, auth_headers):
        response = client.post(
            "/api/admin/adjustments/direct",
            json={
                "item_id": 1, "bin_id": 3, "warehouse_id": 9999,
                "adjustment_type": "ADD", "quantity": 1, "reason": "Mismatch",
            },
            headers=auth_headers,
        )
        assert response.status_code in (400, 403)


class TestInventoryAdjustmentReview:
    def test_approval_applies_once_and_repeat_is_conflict(self, client, auth_headers):
        adjustment_id = _insert_adjustment(delta=4)
        before = _query_val(
            "SELECT COALESCE(SUM(quantity_on_hand), 0) FROM inventory WHERE item_id = 1 AND bin_id = 3"
        )
        payload = {"decisions": [{"adjustment_id": adjustment_id, "action": "approve"}]}
        first = client.post("/api/admin/adjustments/review", json=payload, headers=auth_headers)
        assert first.status_code == 200
        assert _query_val(
            "SELECT COALESCE(SUM(quantity_on_hand), 0) FROM inventory WHERE item_id = 1 AND bin_id = 3"
        ) == before + 4

        repeated = client.post("/api/admin/adjustments/review", json=payload, headers=auth_headers)
        assert repeated.status_code == 409
        assert _query_val(
            "SELECT COALESCE(SUM(quantity_on_hand), 0) FROM inventory WHERE item_id = 1 AND bin_id = 3"
        ) == before + 4

    def test_rejection_closes_adjustment_without_mutating_stock(self, client, auth_headers):
        adjustment_id = _insert_adjustment(delta=5)
        before = _query_val(
            "SELECT COALESCE(SUM(quantity_on_hand), 0) FROM inventory WHERE item_id = 1 AND bin_id = 3"
        )
        payload = {"decisions": [{"adjustment_id": adjustment_id, "action": "reject"}]}
        response = client.post("/api/admin/adjustments/review", json=payload, headers=auth_headers)
        assert response.status_code == 200
        assert _query_val(
            "SELECT status FROM inventory_adjustments WHERE adjustment_id = %s",
            (adjustment_id,),
        ) == "REJECTED"
        assert _query_val(
            "SELECT COALESCE(SUM(quantity_on_hand), 0) FROM inventory WHERE item_id = 1 AND bin_id = 3"
        ) == before
        assert client.post("/api/admin/adjustments/review", json=payload, headers=auth_headers).status_code == 409

    def test_missing_adjustment_is_404(self, client, auth_headers):
        response = client.post(
            "/api/admin/adjustments/review",
            json={"decisions": [{"adjustment_id": 999999, "action": "approve"}]},
            headers=auth_headers,
        )
        assert response.status_code == 404

    def test_duplicate_ids_in_one_review_are_rejected(self, client, auth_headers):
        adjustment_id = _insert_adjustment()
        response = client.post(
            "/api/admin/adjustments/review",
            json={"decisions": [
                {"adjustment_id": adjustment_id, "action": "approve"},
                {"adjustment_id": adjustment_id, "action": "reject"},
            ]},
            headers=auth_headers,
        )
        assert response.status_code == 400


class TestInventoryAdjustmentWarehouseScope:
    def test_list_and_review_hide_adjustments_from_unassigned_warehouse(self, client):
        other_warehouse_id, other_bin_id = _other_warehouse_bin()
        foreign_id = _insert_adjustment(bin_id=other_bin_id, warehouse_id=other_warehouse_id)
        _user_id, headers = _web_user_with_pages(client, ["adjustments"], username="adjustment_scope_user")

        listed = client.get("/api/admin/adjustments/list", headers=headers)
        assert listed.status_code == 200
        assert all(row["warehouse_id"] == 1 for row in listed.get_json()["adjustments"])

        pending = client.get("/api/admin/adjustments/pending", headers=headers)
        assert pending.status_code == 200
        assert all(row["warehouse_id"] == 1 for row in pending.get_json()["adjustments"])

        denied = client.post(
            "/api/admin/adjustments/review",
            json={"decisions": [{"adjustment_id": foreign_id, "action": "approve"}]},
            headers=headers,
        )
        assert denied.status_code == 404
        assert _query_val(
            "SELECT status FROM inventory_adjustments WHERE adjustment_id = %s",
            (foreign_id,),
        ) == "PENDING"

    def test_direct_adjustment_rejects_foreign_bin(self, client):
        other_warehouse_id, other_bin_id = _other_warehouse_bin()
        _user_id, headers = _web_user_with_pages(client, ["adjustments"], username="adjustment_direct_scope")
        response = client.post(
            "/api/admin/adjustments/direct",
            json={
                "item_id": 1, "bin_id": other_bin_id, "warehouse_id": other_warehouse_id,
                "adjustment_type": "ADD", "quantity": 1, "reason": "Foreign bin",
            },
            headers=headers,
        )
        assert response.status_code == 403

    def test_batch_review_is_atomic_when_any_adjustment_is_closed(self, client, auth_headers):
        pending_id = _insert_adjustment(delta=6)
        rejected_id = _insert_adjustment(delta=7, status="REJECTED")
        before = _query_val(
            "SELECT COALESCE(SUM(quantity_on_hand), 0) FROM inventory WHERE item_id = 1 AND bin_id = 3"
        )
        response = client.post(
            "/api/admin/adjustments/review",
            json={"decisions": [
                {"adjustment_id": pending_id, "action": "approve"},
                {"adjustment_id": rejected_id, "action": "approve"},
            ]},
            headers=auth_headers,
        )
        assert response.status_code == 409
        assert _query_val(
            "SELECT status FROM inventory_adjustments WHERE adjustment_id = %s",
            (pending_id,),
        ) == "PENDING"
        assert _query_val(
            "SELECT COALESCE(SUM(quantity_on_hand), 0) FROM inventory WHERE item_id = 1 AND bin_id = 3"
        ) == before


class TestConcurrentInventoryAdjustmentReview:
    def test_two_concurrent_approvals_apply_the_delta_once(self, app, auth_headers):
        """Separate request sessions race on one pending adjustment.

        The row lock must let one request commit and force the other to
        observe the terminal status instead of applying stock twice.
        """
        import os
        from concurrent.futures import ThreadPoolExecutor

        import psycopg2
        from sqlalchemy.orm import sessionmaker
        import models.database as db

        connection = psycopg2.connect(os.environ["TEST_DATABASE_URL"])
        cursor = connection.cursor()
        cursor.execute(
            """
            SELECT inventory_id, quantity_on_hand
            FROM inventory
            WHERE item_id = 1 AND bin_id = 3 AND lot_number IS NULL
            ORDER BY inventory_id
            """
        )
        original_rows = cursor.fetchall()
        assert original_rows
        before_total = sum(row[1] for row in original_rows)
        cursor.execute(
            """
            INSERT INTO inventory_adjustments
                (item_id, bin_id, warehouse_id, quantity_change, reason_code,
                 reason_detail, status, adjusted_by, external_id)
            VALUES (1, 3, 1, 2, 'CORRECTION', 'concurrent approval', 'PENDING',
                    'concurrency-test', gen_random_uuid())
            RETURNING adjustment_id
            """
        )
        adjustment_id = cursor.fetchone()[0]
        connection.commit()
        cursor.close()
        connection.close()

        original_session_factory = db.SessionLocal
        db.SessionLocal = sessionmaker(bind=db.engine, expire_on_commit=False)
        payload = {"decisions": [{"adjustment_id": adjustment_id, "action": "approve"}]}

        def approve_once():
            with app.test_client() as test_client:
                response = test_client.post(
                    "/api/admin/adjustments/review",
                    json=payload,
                    headers=auth_headers,
                )
                return response.status_code

        try:
            with ThreadPoolExecutor(max_workers=2) as executor:
                statuses = list(executor.map(lambda _index: approve_once(), range(2)))
            assert sorted(statuses) == [200, 409]

            verify = psycopg2.connect(os.environ["TEST_DATABASE_URL"])
            verify_cursor = verify.cursor()
            verify_cursor.execute(
                "SELECT COALESCE(SUM(quantity_on_hand), 0) FROM inventory "
                "WHERE item_id = 1 AND bin_id = 3"
            )
            assert verify_cursor.fetchone()[0] == before_total + 2
            verify_cursor.execute(
                "SELECT status FROM inventory_adjustments WHERE adjustment_id = %s",
                (adjustment_id,),
            )
            assert verify_cursor.fetchone()[0] == "APPROVED"
            verify_cursor.close()
            verify.close()
        finally:
            db.SessionLocal = original_session_factory
            cleanup = psycopg2.connect(os.environ["TEST_DATABASE_URL"])
            cleanup_cursor = cleanup.cursor()
            for inventory_id, quantity in original_rows:
                cleanup_cursor.execute(
                    "UPDATE inventory SET quantity_on_hand = %s WHERE inventory_id = %s",
                    (quantity, inventory_id),
                )
            original_ids = [row[0] for row in original_rows]
            cleanup_cursor.execute(
                "DELETE FROM inventory WHERE item_id = 1 AND bin_id = 3 "
                "AND NOT (inventory_id = ANY(%s))",
                (original_ids,),
            )
            cleanup_cursor.execute(
                "DELETE FROM inventory_adjustments WHERE adjustment_id = %s",
                (adjustment_id,),
            )
            cleanup.commit()
            cleanup_cursor.close()
            cleanup.close()
