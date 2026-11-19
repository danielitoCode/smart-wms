"""Integration tests for admin transfer order CRUD routes
(v1.8.0 #290).

Covers:
- GET /api/admin/transfer-orders (list + filters + pagination)
- GET /api/admin/transfer-orders/<to_id> (detail w/ lines + approvals)
- DELETE /api/admin/transfer-orders/<to_id>
  (success path; 409 on picks/approvals)
- POST /api/admin/transfer-orders/<to_id>/cancel
  (releases reservations; 409 on already-approved)
- POST /api/admin/transfer-orders/<to_id>/lines/<line_id>/short-close
  (releases remaining; transitions line to SHORT_CLOSED)
- audit_log row written per state-changing action.

Picking, submission, and admin approval live in Pass 4.3 / 4.4 tests.
"""

import json
import os
import sys
import uuid

import pytest

os.environ.setdefault("DATABASE_URL", "postgresql://sentry:sentry@localhost:5432/sentry")
os.environ.setdefault("JWT_SECRET", "NEVER_USE_THIS_IN_PRODUCTION_32!")
os.environ.setdefault("SENTRY_ENCRYPTION_KEY", "t5hPIEVn_O41qfiMqAiPEnwzQh68o3Es46YfSOBvEK8=")

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import db_test_context


def _query(sql, params=()):
    conn = db_test_context.get_raw_connection()
    cur = conn.cursor()
    try:
        cur.execute(sql, params)
        if cur.description is None:
            return None
        return cur.fetchall()
    finally:
        cur.close()


def _seed_to(source_wh=1, dest_wh=2, status="OPEN", created_by="t290"):
    conn = db_test_context.get_raw_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO transfer_orders "
            "(to_number, source_warehouse_id, destination_warehouse_id, "
            " status, created_by, external_id) "
            "VALUES (%s, %s, %s, %s, %s, %s) RETURNING to_id",
            (
                f"TO-T290-{uuid.uuid4().hex[:8]}",
                source_wh, dest_wh, status, created_by, str(uuid.uuid4()),
            ),
        )
        return cur.fetchone()[0]
    finally:
        cur.close()


def _seed_to_line(to_id, item_id=1, line_number=1, requested=10,
                  committed=10, picked=0, approved=0, status="PENDING"):
    conn = db_test_context.get_raw_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO transfer_order_lines "
            "(to_id, item_id, line_number, requested_qty, committed_qty, "
            " picked_qty, approved_qty, status) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING to_line_id",
            (
                to_id, item_id, line_number, requested, committed,
                picked, approved, status,
            ),
        )
        return cur.fetchone()[0]
    finally:
        cur.close()


def _seed_to_approval(
    to_id, status="PENDING", submitted_by="picker", lines_snapshot=None,
):
    conn = db_test_context.get_raw_connection()
    cur = conn.cursor()
    try:
        sql = (
            "INSERT INTO transfer_order_approvals "
            "(to_id, submitted_by, lines_snapshot, status, external_id"
            + (", approved_by, approved_at" if status == "APPROVED" else "")
            + ") VALUES (%s, %s, %s::jsonb, %s, %s"
            + (", 'admin1', NOW()" if status == "APPROVED" else "")
            + ") RETURNING to_approval_id"
        )
        cur.execute(
            sql,
            (
                to_id, submitted_by, json.dumps(lines_snapshot or {}),
                status, str(uuid.uuid4()),
            ),
        )
        return cur.fetchone()[0]
    finally:
        cur.close()


def _bump_inventory_allocated(
    item_id, warehouse_id, delta, to_line_id, reserved_qty=None, consumed_qty=0,
):
    """Seed the exact reservation ledger and its current inventory balance."""
    conn = db_test_context.get_raw_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT inventory_id FROM inventory "
            " WHERE item_id = %s AND warehouse_id = %s "
            " ORDER BY inventory_id LIMIT 1 FOR UPDATE",
            (item_id, warehouse_id),
        )
        inventory_id = cur.fetchone()[0]
        cur.execute(
            "UPDATE inventory "
            "   SET quantity_allocated = quantity_allocated + %s, "
            "       quantity_on_hand = quantity_on_hand - %s "
            " WHERE inventory_id = %s",
            (delta, consumed_qty, inventory_id),
        )
        cur.execute(
            "INSERT INTO transfer_order_reservations "
            "(to_line_id, inventory_id, reserved_qty, consumed_qty) "
            "VALUES (%s, %s, %s, %s)",
            (to_line_id, inventory_id, reserved_qty or delta + consumed_qty, consumed_qty),
        )
        return inventory_id
    finally:
        cur.close()


def _seed_to_pick_task(
    to_id, to_line_id, inventory_id, quantity_to_pick,
    quantity_picked, quantity_approved=0,
):
    conn = db_test_context.get_raw_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT item_id, bin_id FROM inventory WHERE inventory_id = %s", (inventory_id,))
        item_id, bin_id = cur.fetchone()
        cur.execute(
            """
            INSERT INTO pick_batches (batch_number, warehouse_id, status, assigned_to)
            VALUES (%s, 1, 'COMPLETED', 'transfer-order-test')
            RETURNING batch_id
            """,
            (f"BATCH-TO-TEST-{uuid.uuid4().hex[:10]}",),
        )
        batch_id = cur.fetchone()[0]
        cur.execute(
            """
            INSERT INTO pick_tasks
                (batch_id, to_id, to_line_id, item_id, bin_id, inventory_id,
                 quantity_to_pick, quantity_picked, quantity_approved,
                 pick_sequence, status, picked_by, picked_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 1,
                    'PICKED', 'picker', NOW())
            RETURNING pick_task_id
            """,
            (
                batch_id, to_id, to_line_id, item_id, bin_id, inventory_id,
                quantity_to_pick, quantity_picked, quantity_approved,
            ),
        )
        return cur.fetchone()[0], bin_id
    finally:
        cur.close()


def _allocated(item_id, warehouse_id):
    rows = _query(
        "SELECT quantity_allocated FROM inventory "
        " WHERE item_id = %s AND warehouse_id = %s",
        (item_id, warehouse_id),
    )
    return rows[0][0] if rows else None


# ----------------------------------------------------------------------
# List + detail
# ----------------------------------------------------------------------


class TestListAndDetail:
    def test_list_returns_paginated_payload(self, client, auth_headers):
        _seed_to()
        _seed_to()
        resp = client.get(
            "/api/admin/transfer-orders?page=1&per_page=10",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        body = resp.get_json()
        assert "transfer_orders" in body
        assert body["page"] == 1
        assert body["per_page"] == 10
        assert body["total"] >= 2

    def test_list_filters_by_status(self, client, auth_headers):
        seed_open = _seed_to(status="OPEN")
        seed_cancelled = _seed_to(status="CANCELLED")
        resp = client.get(
            "/api/admin/transfer-orders?status=OPEN",
            headers=auth_headers,
        )
        body = resp.get_json()
        ids = {r["to_id"] for r in body["transfer_orders"]}
        assert seed_open in ids
        assert seed_cancelled not in ids

    def test_detail_returns_header_lines_and_approvals(
        self, client, auth_headers,
    ):
        to_id = _seed_to()
        line_id = _seed_to_line(to_id, item_id=1)
        approval_id = _seed_to_approval(to_id)
        resp = client.get(
            f"/api/admin/transfer-orders/{to_id}",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["transfer_order"]["to_id"] == to_id
        assert any(line["to_line_id"] == line_id for line in body["lines"])
        assert any(
            a["to_approval_id"] == approval_id for a in body["approvals"]
        )
        # Item join surfaces sku + item_name on each line.
        line = body["lines"][0]
        assert line["sku"] is not None
        assert line["item_name"] is not None

    def test_detail_404_on_unknown_id(self, client, auth_headers):
        resp = client.get(
            "/api/admin/transfer-orders/999999",
            headers=auth_headers,
        )
        assert resp.status_code == 404


# ----------------------------------------------------------------------
# Exact reservation approval/rejection
# ----------------------------------------------------------------------


class TestApprovalConsumesPickedInventoryRowNotFirstSkuBin:
    def test_approval_decrements_only_the_bin_recorded_on_the_picked_task(
        self, client, auth_headers,
    ):
        to_id = _seed_to(source_wh=1, dest_wh=2, status="AWAITING_APPROVAL")
        line_id = _seed_to_line(
            to_id, item_id=1, committed=5, picked=3, status="PARTIALLY_PICKED",
        )
        rows = _query(
            """
            SELECT inventory_id, bin_id, quantity_on_hand, quantity_allocated
              FROM inventory
             WHERE item_id = 1 AND warehouse_id = 1
             ORDER BY inventory_id LIMIT 2
            """
        )
        if len(rows) < 2:
            pytest.skip("seed warehouse needs two inventory rows for bin-specific approval")
        first, picked_row = rows
        assert first[2] - first[3] >= 2
        assert picked_row[2] - picked_row[3] >= 3

        conn = db_test_context.get_raw_connection()
        cur = conn.cursor()
        cur.execute(
            "UPDATE inventory SET quantity_allocated = quantity_allocated + 2 "
            " WHERE inventory_id = %s",
            (first[0],),
        )
        cur.execute(
            "UPDATE inventory SET quantity_allocated = quantity_allocated + 3 "
            " WHERE inventory_id = %s",
            (picked_row[0],),
        )
        cur.execute(
            "INSERT INTO transfer_order_reservations "
            "(to_line_id, inventory_id, reserved_qty) VALUES (%s, %s, 2), (%s, %s, 3)",
            (line_id, first[0], line_id, picked_row[0]),
        )
        cur.close()
        task_id, bin_id = _seed_to_pick_task(
            to_id, line_id, picked_row[0], quantity_to_pick=3, quantity_picked=3,
        )
        approval_id = _seed_to_approval(
            to_id,
            lines_snapshot={
                "lines": [{
                    "to_line_id": line_id,
                    "item_id": 1,
                    "picked_in_snapshot": 3,
                    "tasks": [{
                        "pick_task_id": task_id,
                        "inventory_id": picked_row[0],
                        "bin_id": bin_id,
                        "picked_in_snapshot": 3,
                    }],
                    "inventory_allocations": [{
                        "inventory_id": picked_row[0],
                        "bin_id": bin_id,
                        "quantity": 3,
                    }],
                }],
            },
        )

        response = client.post(
            f"/api/admin/transfer-orders/{to_id}/approvals/{approval_id}/approve",
            headers=auth_headers,
        )
        assert response.status_code == 200, response.get_json()
        after = _query(
            "SELECT inventory_id, quantity_on_hand, quantity_allocated "
            " FROM inventory WHERE inventory_id IN (%s, %s) ORDER BY inventory_id",
            (first[0], picked_row[0]),
        )
        after_by_id = {row[0]: row[1:] for row in after}
        assert after_by_id[first[0]] == (first[2], first[3] + 2)
        assert after_by_id[picked_row[0]] == (picked_row[2] - 3, picked_row[3])
        reservation_rows = _query(
            "SELECT inventory_id, consumed_qty FROM transfer_order_reservations "
            " WHERE to_line_id = %s ORDER BY inventory_id",
            (line_id,),
        )
        assert reservation_rows == [(first[0], 0), (picked_row[0], 3)]


class TestExactTaskApprovalSnapshots:
    def test_submit_snapshots_exact_inventory_rows_and_blocks_next_batch_until_approval(
        self, client, auth_headers,
    ):
        to_id = _seed_to(source_wh=1, dest_wh=2, status="PARTIALLY_PICKED")
        line_id = _seed_to_line(
            to_id, item_id=1, committed=10, picked=5, status="PARTIALLY_PICKED",
        )
        inventory_id = _bump_inventory_allocated(1, 1, 10, line_id)
        task_id, bin_id = _seed_to_pick_task(
            to_id, line_id, inventory_id, quantity_to_pick=5, quantity_picked=5,
        )

        submitted = client.post(
            f"/api/admin/picker/transfer-orders/{to_id}/submit",
            headers=auth_headers,
        )
        assert submitted.status_code == 201, submitted.get_json()
        approval_id = submitted.get_json()["to_approval_id"]
        snapshot = _query(
            "SELECT lines_snapshot FROM transfer_order_approvals WHERE to_approval_id = %s",
            (approval_id,),
        )[0][0]
        line_snapshot = snapshot["lines"][0]
        assert line_snapshot["picked_in_snapshot"] == 5
        assert line_snapshot["tasks"] == [{
            "pick_task_id": task_id,
            "inventory_id": inventory_id,
            "bin_id": bin_id,
            "picked_in_snapshot": 5,
        }]
        assert line_snapshot["inventory_allocations"] == [{
            "inventory_id": inventory_id,
            "bin_id": bin_id,
            "quantity": 5,
        }]

        next_batch = client.post(
            f"/api/admin/transfer-orders/{to_id}/start-picking",
            headers=auth_headers,
        )
        assert next_batch.status_code == 409
        assert next_batch.get_json()["error"] == "pending_approval_exists"


class TestExactBinPickingPlan:
    def test_start_picking_uses_only_owned_bins_and_resumes_after_prior_picks(
        self, client, auth_headers,
    ):
        to_id = _seed_to(source_wh=1, dest_wh=2, status="OPEN")
        line_id = _seed_to_line(to_id, item_id=1, committed=5)
        inventory_rows = _query(
            """
            SELECT inventory_id, bin_id, quantity_on_hand, quantity_allocated
              FROM inventory
             WHERE item_id = 1 AND warehouse_id = 1
             ORDER BY inventory_id
             LIMIT 3
            """
        )
        if len(inventory_rows) < 3:
            pytest.skip("seed warehouse needs three inventory rows for reservation-isolation coverage")
        first, unreserved, second = inventory_rows
        assert first[2] - first[3] >= 3
        assert unreserved[2] - unreserved[3] >= 2
        assert second[2] - second[3] >= 2

        conn = db_test_context.get_raw_connection()
        cur = conn.cursor()
        cur.execute(
            "UPDATE inventory SET quantity_allocated = quantity_allocated + 3 "
            " WHERE inventory_id = %s",
            (first[0],),
        )
        # Simulate another workflow's allocation in an intervening bin.
        # A TO task must not steal this shared aggregate allocation.
        cur.execute(
            "UPDATE inventory SET quantity_allocated = quantity_allocated + 2 "
            " WHERE inventory_id = %s",
            (unreserved[0],),
        )
        cur.execute(
            "UPDATE inventory SET quantity_allocated = quantity_allocated + 2 "
            " WHERE inventory_id = %s",
            (second[0],),
        )
        cur.execute(
            "INSERT INTO transfer_order_reservations "
            "(to_line_id, inventory_id, reserved_qty) VALUES (%s, %s, 3), (%s, %s, 2)",
            (line_id, first[0], line_id, second[0]),
        )
        cur.close()

        started = client.post(
            f"/api/admin/transfer-orders/{to_id}/start-picking",
            headers=auth_headers,
        )
        assert started.status_code == 201, started.get_json()
        tasks = _query(
            "SELECT bin_id, quantity_to_pick FROM pick_tasks "
            " WHERE to_id = %s ORDER BY pick_sequence",
            (to_id,),
        )
        assert tasks == [(first[1], 3), (second[1], 2)]

        duplicate_start = client.post(
            f"/api/admin/transfer-orders/{to_id}/start-picking",
            headers=auth_headers,
        )
        assert duplicate_start.status_code == 409
        assert duplicate_start.get_json()["error"] == "pending_pick_tasks_exist"
        assert _query(
            "SELECT COUNT(*) FROM pick_tasks WHERE to_id = %s", (to_id,),
        )[0][0] == 2

        # Simulate the first reserved bin being picked and the untouched
        # pending task being removed with its abandoned batch.
        conn = db_test_context.get_raw_connection()
        cur = conn.cursor()
        cur.execute(
            "UPDATE pick_tasks SET status = 'PICKED', quantity_picked = 3, "
            "picked_by = 'picker', picked_at = NOW() "
            " WHERE to_id = %s AND bin_id = %s",
            (to_id, first[1]),
        )
        cur.execute(
            "DELETE FROM pick_tasks WHERE to_id = %s AND bin_id = %s AND status = 'PENDING'",
            (to_id, second[1]),
        )
        cur.execute(
            "UPDATE transfer_order_lines SET picked_qty = 3, status = 'PARTIALLY_PICKED' "
            " WHERE to_line_id = %s",
            (line_id,),
        )
        cur.execute(
            "UPDATE transfer_orders SET status = 'PARTIALLY_PICKED' WHERE to_id = %s",
            (to_id,),
        )
        cur.close()

        resumed = client.post(
            f"/api/admin/transfer-orders/{to_id}/start-picking",
            headers=auth_headers,
        )
        assert resumed.status_code == 201, resumed.get_json()
        remaining_tasks = _query(
            "SELECT bin_id, quantity_to_pick FROM pick_tasks "
            " WHERE to_id = %s AND status = 'PENDING' ORDER BY pick_sequence",
            (to_id,),
        )
        assert remaining_tasks == [(second[1], 2)]


class TestExactReservationApproval:
    def test_approval_consumes_only_the_line_owned_bin_allocations(
        self, client, auth_headers,
    ):
        to_id = _seed_to(source_wh=1, dest_wh=2, status="AWAITING_APPROVAL")
        line_id = _seed_to_line(
            to_id, item_id=1, committed=5, picked=5, status="PICKED",
        )
        inventory_id = _bump_inventory_allocated(1, 1, 5, line_id)
        task_id, bin_id = _seed_to_pick_task(
            to_id, line_id, inventory_id, quantity_to_pick=5, quantity_picked=5,
        )
        approval_id = _seed_to_approval(
            to_id,
            lines_snapshot={
                "lines": [{
                    "to_line_id": line_id,
                    "item_id": 1,
                    "picked_in_snapshot": 5,
                    "tasks": [{
                        "pick_task_id": task_id, "inventory_id": inventory_id,
                        "bin_id": bin_id, "picked_in_snapshot": 5,
                    }],
                    "inventory_allocations": [{
                        "inventory_id": inventory_id, "bin_id": bin_id, "quantity": 5,
                    }],
                }],
            },
        )
        source_before = _query(
            "SELECT quantity_on_hand, quantity_allocated FROM inventory "
            " WHERE item_id = 1 AND warehouse_id = 1 ORDER BY inventory_id LIMIT 1",
        )[0]
        dest_before = _query(
            "SELECT COALESCE(SUM(quantity_on_hand), 0) FROM inventory "
            " WHERE item_id = 1 AND warehouse_id = 2",
        )[0][0]

        response = client.post(
            f"/api/admin/transfer-orders/{to_id}/approvals/{approval_id}/approve",
            headers=auth_headers,
        )
        assert response.status_code == 200, response.get_json()
        source_after = _query(
            "SELECT quantity_on_hand, quantity_allocated FROM inventory "
            " WHERE item_id = 1 AND warehouse_id = 1 ORDER BY inventory_id LIMIT 1",
        )[0]
        dest_after = _query(
            "SELECT COALESCE(SUM(quantity_on_hand), 0) FROM inventory "
            " WHERE item_id = 1 AND warehouse_id = 2",
        )[0][0]
        assert source_after == (source_before[0] - 5, source_before[1] - 5)
        assert dest_after == dest_before + 5
        reservation = _query(
            "SELECT reserved_qty, consumed_qty, released_qty "
            "  FROM transfer_order_reservations WHERE to_line_id = %s",
            (line_id,),
        )[0]
        assert reservation == (5, 5, 0)
        line = _query(
            "SELECT picked_qty, approved_qty, status "
            "  FROM transfer_order_lines WHERE to_line_id = %s",
            (line_id,),
        )[0]
        assert line == (5, 5, "APPROVED")
        duplicate = client.post(
            f"/api/admin/transfer-orders/{to_id}/approvals/{approval_id}/approve",
            headers=auth_headers,
        )
        assert duplicate.status_code == 409
        assert _query(
            "SELECT COUNT(*) FROM transfer_order_reservations "
            " WHERE to_line_id = %s AND consumed_qty = 5",
            (line_id,),
        )[0][0] == 1

    def test_rejection_restores_picked_quantity_without_releasing_stock(
        self, client, auth_headers,
    ):
        to_id = _seed_to(source_wh=1, dest_wh=2, status="AWAITING_APPROVAL")
        line_id = _seed_to_line(
            to_id, item_id=1, committed=10, picked=5, approved=2,
            status="PARTIALLY_PICKED",
        )
        inventory_id = _bump_inventory_allocated(
            1, 1, 8, line_id, reserved_qty=10, consumed_qty=2,
        )
        task_id, bin_id = _seed_to_pick_task(
            to_id, line_id, inventory_id, quantity_to_pick=5,
            quantity_picked=5, quantity_approved=2,
        )
        approval_id = _seed_to_approval(
            to_id,
            lines_snapshot={
                "lines": [{
                    "to_line_id": line_id,
                    "item_id": 1,
                    "picked_in_snapshot": 3,
                    "tasks": [{
                        "pick_task_id": task_id, "inventory_id": inventory_id,
                        "bin_id": bin_id, "picked_in_snapshot": 3,
                    }],
                    "inventory_allocations": [{
                        "inventory_id": inventory_id, "bin_id": bin_id, "quantity": 3,
                    }],
                }],
            },
        )
        before = _query(
            "SELECT quantity_on_hand, quantity_allocated FROM inventory "
            " WHERE item_id = 1 AND warehouse_id = 1 ORDER BY inventory_id LIMIT 1",
        )[0]
        response = client.post(
            f"/api/admin/transfer-orders/{to_id}/approvals/{approval_id}/reject",
            json={"rejection_reason": "Count mismatch"},
            headers=auth_headers,
        )
        assert response.status_code == 200, response.get_json()
        after = _query(
            "SELECT quantity_on_hand, quantity_allocated FROM inventory "
            " WHERE item_id = 1 AND warehouse_id = 1 ORDER BY inventory_id LIMIT 1",
        )[0]
        assert after == before
        line = _query(
            "SELECT picked_qty, approved_qty, status "
            "  FROM transfer_order_lines WHERE to_line_id = %s",
            (line_id,),
        )[0]
        assert line == (2, 2, "PARTIALLY_PICKED")
        reservation = _query(
            "SELECT reserved_qty, consumed_qty, released_qty "
            "  FROM transfer_order_reservations WHERE to_line_id = %s",
            (line_id,),
        )[0]
        assert reservation == (10, 2, 0)


# ----------------------------------------------------------------------
# Legacy and inconsistent reservation ledgers
# ----------------------------------------------------------------------


class TestReservationIntegrityGuards:
    def test_legacy_untracked_order_cannot_start_cancel_or_short_close(
        self, client, auth_headers,
    ):
        to_id = _seed_to(source_wh=1, dest_wh=2, status="OPEN")
        line_id = _seed_to_line(to_id, item_id=1, committed=5)
        conn = db_test_context.get_raw_connection()
        cur = conn.cursor()
        cur.execute(
            "UPDATE transfer_orders SET reservations_tracked = FALSE WHERE to_id = %s",
            (to_id,),
        )
        cur.close()

        start = client.post(
            f"/api/admin/transfer-orders/{to_id}/start-picking",
            headers=auth_headers,
        )
        cancel = client.post(
            f"/api/admin/transfer-orders/{to_id}/cancel",
            headers=auth_headers,
        )
        short_close = client.post(
            f"/api/admin/transfer-orders/{to_id}/lines/{line_id}/short-close",
            headers=auth_headers,
        )
        assert start.status_code == 409
        assert cancel.status_code == 409
        assert short_close.status_code == 409
        assert all(
            response.get_json()["error"] == "reservation_tracking_unavailable"
            for response in (start, cancel, short_close)
        )
        assert _query(
            "SELECT status FROM transfer_orders WHERE to_id = %s", (to_id,),
        )[0][0] == "OPEN"

    def test_tracked_order_with_missing_reservation_fails_cancel_atomically(
        self, client, auth_headers,
    ):
        to_id = _seed_to(source_wh=1, dest_wh=2, status="OPEN")
        _seed_to_line(to_id, item_id=1, committed=5)
        before = _allocated(1, 1)
        response = client.post(
            f"/api/admin/transfer-orders/{to_id}/cancel",
            headers=auth_headers,
        )
        assert response.status_code == 409
        assert response.get_json()["error"] == "reservation_integrity_error"
        assert _allocated(1, 1) == before
        assert _query(
            "SELECT status FROM transfer_orders WHERE to_id = %s", (to_id,),
        )[0][0] == "OPEN"


# ----------------------------------------------------------------------
# Cancel
# ----------------------------------------------------------------------


class TestCancel:
    def test_cancel_releases_reservation_and_writes_audit(
        self, client, auth_headers,
    ):
        to_id = _seed_to(source_wh=1, dest_wh=2)
        line_id = _seed_to_line(to_id, item_id=1, committed=10)
        _bump_inventory_allocated(1, 1, 10, line_id)
        before_alloc = _allocated(1, 1)

        resp = client.post(
            f"/api/admin/transfer-orders/{to_id}/cancel",
            headers=auth_headers,
        )
        assert resp.status_code == 200, resp.get_json()
        assert resp.get_json()["status"] == "CANCELLED"

        # Reservation released back to inventory
        assert _allocated(1, 1) == before_alloc - 10

        # Header status flipped
        rows = _query(
            "SELECT status FROM transfer_orders WHERE to_id = %s",
            (to_id,),
        )
        assert rows[0][0] == "CANCELLED"

        # Audit row written
        audit = _query(
            "SELECT details FROM audit_log "
            " WHERE entity_type = 'TO' AND entity_id = %s "
            "   AND action_type = 'TO_CANCELLED'",
            (to_id,),
        )
        assert audit
        assert audit[0][0]["previous_status"] == "OPEN"

    def test_cancel_after_partial_picking_releases_reservation_without_moving_stock(
        self, client, auth_headers,
    ):
        # TO picking records progress but deliberately leaves on_hand and
        # quantity_allocated untouched until an admin approves a snapshot.
        to_id = _seed_to(
            source_wh=1, dest_wh=2, status="PARTIALLY_PICKED",
        )
        line_id = _seed_to_line(
            to_id, item_id=1, committed=10, picked=4,
            status="PARTIALLY_PICKED",
        )
        _bump_inventory_allocated(1, 1, 10, line_id)
        before = _query(
            "SELECT COALESCE(SUM(quantity_on_hand), 0), "
            "       COALESCE(SUM(quantity_allocated), 0) "
            "  FROM inventory WHERE item_id = %s AND warehouse_id = %s",
            (1, 1),
        )[0]

        response = client.post(
            f"/api/admin/transfer-orders/{to_id}/cancel",
            headers=auth_headers,
        )
        assert response.status_code == 200, response.get_json()
        after = _query(
            "SELECT COALESCE(SUM(quantity_on_hand), 0), "
            "       COALESCE(SUM(quantity_allocated), 0) "
            "  FROM inventory WHERE item_id = %s AND warehouse_id = %s",
            (1, 1),
        )[0]
        assert after[0] == before[0]
        assert after[1] == before[1] - 10
        assert _query(
            "SELECT status FROM transfer_orders WHERE to_id = %s", (to_id,),
        )[0][0] == "CANCELLED"

    def test_cancel_blocked_when_non_pending_approval_exists(
        self, client, auth_headers,
    ):
        # Multi-batch flow where the picker submitted a partial batch
        # and admin already approved it; the TO is back at
        # PARTIALLY_PICKED waiting for the next batch. Cancel should
        # surface to_already_partially_approved so the operator
        # processes the remaining picks rather than nuking the
        # in-flight approval audit trail.
        to_id = _seed_to(status="PARTIALLY_PICKED")
        _seed_to_line(to_id, item_id=1)
        _seed_to_approval(to_id, status="APPROVED")
        resp = client.post(
            f"/api/admin/transfer-orders/{to_id}/cancel",
            headers=auth_headers,
        )
        assert resp.status_code == 409
        assert resp.get_json()["error"] == "to_already_partially_approved"

    def test_cancel_blocked_while_approval_is_pending(self, client, auth_headers):
        to_id = _seed_to(status="PARTIALLY_PICKED")
        _seed_to_line(to_id, item_id=1, committed=5, picked=5, status="PICKED")
        _seed_to_approval(to_id, status="PENDING")
        response = client.post(
            f"/api/admin/transfer-orders/{to_id}/cancel",
            headers=auth_headers,
        )
        assert response.status_code == 409
        assert response.get_json()["error"] == "to_already_partially_approved"

    def test_cancel_404_on_unknown_id(self, client, auth_headers):
        resp = client.post(
            "/api/admin/transfer-orders/999999/cancel",
            headers=auth_headers,
        )
        assert resp.status_code == 404


# ----------------------------------------------------------------------
# Delete
# ----------------------------------------------------------------------


class TestDelete:
    def test_delete_open_to_with_no_picks_succeeds(
        self, client, auth_headers,
    ):
        to_id = _seed_to()
        line_id = _seed_to_line(to_id, item_id=1, committed=5)
        _bump_inventory_allocated(1, 1, 5, line_id)
        before = _allocated(1, 1)

        resp = client.delete(
            f"/api/admin/transfer-orders/{to_id}",
            headers=auth_headers,
        )
        assert resp.status_code == 204
        assert _allocated(1, 1) == before - 5
        rows = _query(
            "SELECT COUNT(*) FROM transfer_orders WHERE to_id = %s",
            (to_id,),
        )
        assert rows[0][0] == 0

    def test_delete_blocked_when_picks_present(
        self, client, auth_headers,
    ):
        to_id = _seed_to()
        _seed_to_line(to_id, item_id=1, committed=5, picked=2,
                      status="PARTIALLY_PICKED")
        resp = client.delete(
            f"/api/admin/transfer-orders/{to_id}",
            headers=auth_headers,
        )
        assert resp.status_code == 409
        body = resp.get_json()
        assert body["error"] == "to_not_deletable"
        assert body["any_picks"] >= 1

    def test_delete_blocked_when_approval_exists(
        self, client, auth_headers,
    ):
        to_id = _seed_to()
        _seed_to_line(to_id, item_id=1)
        _seed_to_approval(to_id, status="PENDING")
        resp = client.delete(
            f"/api/admin/transfer-orders/{to_id}",
            headers=auth_headers,
        )
        assert resp.status_code == 409
        assert resp.get_json()["any_approvals"] >= 1


# ----------------------------------------------------------------------
# Short-close
# ----------------------------------------------------------------------


class TestShortClose:
    def test_short_close_releases_remaining_and_writes_audit(
        self, client, auth_headers,
    ):
        to_id = _seed_to(source_wh=1, dest_wh=2)
        line_id = _seed_to_line(
            to_id, item_id=1, committed=10, picked=4, approved=4,
            status="PARTIALLY_PICKED",
        )
        _bump_inventory_allocated(
            1, 1, 6, line_id, reserved_qty=10, consumed_qty=4,
        )  # outstanding = committed - approved
        before = _allocated(1, 1)

        resp = client.post(
            f"/api/admin/transfer-orders/{to_id}/lines/{line_id}/short-close",
            headers=auth_headers,
        )
        assert resp.status_code == 200, resp.get_json()
        body = resp.get_json()
        assert body["status"] == "SHORT_CLOSED"
        assert body["released_qty"] == 6

        assert _allocated(1, 1) == before - 6
        rows = _query(
            "SELECT status FROM transfer_order_lines WHERE to_line_id = %s",
            (line_id,),
        )
        assert rows[0][0] == "SHORT_CLOSED"

        audit = _query(
            "SELECT details FROM audit_log "
            " WHERE entity_type = 'TO_LINE' AND entity_id = %s "
            "   AND action_type = 'TO_LINE_SHORT_CLOSED'",
            (line_id,),
        )
        assert audit
        assert audit[0][0]["released_qty"] == 6

    def test_short_close_blocked_while_approval_is_pending(
        self, client, auth_headers,
    ):
        to_id = _seed_to(status="AWAITING_APPROVAL")
        line_id = _seed_to_line(
            to_id, item_id=1, committed=5, picked=5, status="PICKED",
        )
        _seed_to_approval(to_id, status="PENDING")
        response = client.post(
            f"/api/admin/transfer-orders/{to_id}/lines/{line_id}/short-close",
            headers=auth_headers,
        )
        assert response.status_code == 409
        assert response.get_json()["error"] == "line_has_pending_approval"

    def test_short_close_blocked_on_already_approved_line(
        self, client, auth_headers,
    ):
        to_id = _seed_to()
        line_id = _seed_to_line(
            to_id, item_id=1, committed=10, picked=10, approved=10,
            status="APPROVED",
        )
        resp = client.post(
            f"/api/admin/transfer-orders/{to_id}/lines/{line_id}/short-close",
            headers=auth_headers,
        )
        assert resp.status_code == 409
        assert resp.get_json()["error"] == "invalid_line_status_for_short_close"

    def test_short_close_404_on_unknown_line(self, client, auth_headers):
        to_id = _seed_to()
        resp = client.post(
            f"/api/admin/transfer-orders/{to_id}/lines/999999/short-close",
            headers=auth_headers,
        )
        assert resp.status_code == 404
