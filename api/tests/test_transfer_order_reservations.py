"""Integration coverage for line-owned Transfer Order inventory reservations.

These tests exercise the real Flask routes against the isolated PostgreSQL
test database. Each test is enclosed by conftest's rollback transaction.
"""
import json
import uuid

from db_test_context import get_raw_connection


def _cursor():
    return get_raw_connection().cursor()


def _seed_to(status="OPEN"):
    cur = _cursor()
    try:
        cur.execute(
            """
            INSERT INTO transfer_orders
                (to_number, source_warehouse_id, destination_warehouse_id,
                 status, created_by, external_id)
            VALUES (%s, 1, 2, %s, 'reservation-test', %s)
            RETURNING to_id
            """,
            (f"TO-RES-{uuid.uuid4().hex[:10]}", status, str(uuid.uuid4())),
        )
        return cur.fetchone()[0]
    finally:
        cur.close()


def _seed_line(to_id, committed, picked=0, approved=0, status="PENDING"):
    cur = _cursor()
    try:
        cur.execute(
            """
            INSERT INTO transfer_order_lines
                (to_id, item_id, line_number, requested_qty, committed_qty,
                 picked_qty, approved_qty, status)
            VALUES (%s, 1, 1, %s, %s, %s, %s, %s)
            RETURNING to_line_id
            """,
            (to_id, committed, committed, picked, approved, status),
        )
        return cur.fetchone()[0]
    finally:
        cur.close()


def _inventory_rows(minimum=1):
    cur = _cursor()
    try:
        cur.execute(
            """
            SELECT inventory_id, bin_id, quantity_on_hand, quantity_allocated
              FROM inventory
             WHERE item_id = 1 AND warehouse_id = 1
               AND quantity_on_hand - quantity_allocated >= %s
             ORDER BY inventory_id
            """,
            (minimum,),
        )
        return cur.fetchall()
    finally:
        cur.close()


def _ensure_second_source_inventory_row():
    if len(_inventory_rows(5)) >= 2:
        return
    cur = _cursor()
    try:
        cur.execute(
            """
            SELECT bin_id FROM bins
             WHERE warehouse_id = 1 AND bin_type = 'Pickable'
               AND bin_id NOT IN (
                   SELECT bin_id FROM inventory
                    WHERE item_id = 1 AND warehouse_id = 1
               )
             ORDER BY bin_id LIMIT 1
            """
        )
        candidate = cur.fetchone()
        assert candidate, "seed requires a second pickable source bin"
        cur.execute(
            """
            INSERT INTO inventory
                (item_id, bin_id, warehouse_id, quantity_on_hand, quantity_allocated)
            VALUES (1, %s, 1, 10, 0)
            """,
            (candidate[0],),
        )
    finally:
        cur.close()


def _reserve(to_id, line_id, inventory_id, quantity, consumed=0, released=0, picked=0):
    cur = _cursor()
    try:
        cur.execute(
            """
            UPDATE inventory
               SET quantity_allocated = quantity_allocated + %s
             WHERE inventory_id = %s
            """,
            (quantity - consumed - released, inventory_id),
        )
        cur.execute(
            """
            INSERT INTO transfer_order_reservations
                (to_id, to_line_id, inventory_id, item_id, warehouse_id,
                 quantity_reserved, quantity_picked, quantity_consumed, quantity_released)
            VALUES (%s, %s, %s, 1, 1, %s, %s, %s, %s)
            """,
            (to_id, line_id, inventory_id, quantity, picked, consumed, released),
        )
    finally:
        cur.close()


def _seed_approval(to_id, line_id, quantity, status="PENDING"):
    slices = _all(
        """
        SELECT inventory_id, quantity_picked - quantity_consumed
          FROM transfer_order_reservations
         WHERE to_line_id = %s AND quantity_picked > quantity_consumed
         ORDER BY inventory_id
        """,
        (line_id,),
    )
    assert sum(row[1] for row in slices) == quantity
    cur = _cursor()
    try:
        cur.execute(
            """
            INSERT INTO transfer_order_approvals
                (to_id, submitted_by, lines_snapshot, status, external_id)
            VALUES (%s, 'picker', %s::jsonb, %s, %s)
            RETURNING to_approval_id
            """,
            (
                to_id,
                json.dumps({"lines": [{
                    "to_line_id": line_id,
                    "item_id": 1,
                    "picked_in_snapshot": quantity,
                    "inventory_slices": [
                        {"inventory_id": row[0], "picked_in_snapshot": row[1]}
                        for row in slices
                    ],
                }]}),
                status,
                str(uuid.uuid4()),
            ),
        )
        return cur.fetchone()[0]
    finally:
        cur.close()


def _one(sql, params=()):
    cur = _cursor()
    try:
        cur.execute(sql, params)
        return cur.fetchone()
    finally:
        cur.close()


def _ensure_destination_staging_bin():
    existing = _one(
        "SELECT bin_id FROM bins WHERE warehouse_id = 2 AND bin_type = 'Staging' "
        "ORDER BY bin_id LIMIT 1"
    )
    if existing:
        return existing[0]
    cur = _cursor()
    try:
        suffix = uuid.uuid4().hex[:8]
        zone_code = f"TO-RES-{suffix}"
        bin_code = f"TO-RES-STAGE-{suffix}"
        cur.execute(
            """
            INSERT INTO zones (warehouse_id, zone_code, zone_name, zone_type)
            VALUES (2, %s, 'Transfer Reservation Staging', 'STAGING')
            RETURNING zone_id
            """,
            (zone_code,),
        )
        zone_id = cur.fetchone()[0]
        cur.execute(
            """
            INSERT INTO bins
                (zone_id, warehouse_id, bin_code, bin_barcode, bin_type, external_id)
            VALUES (%s, 2, %s, %s, 'Staging', %s)
            RETURNING bin_id
            """,
            (zone_id, bin_code, bin_code, str(uuid.uuid4())),
        )
        return cur.fetchone()[0]
    finally:
        cur.close()


def test_reservation_table_tracks_line_inventory_and_balances():
    row = _one(
        """
        SELECT column_name
          FROM information_schema.columns
         WHERE table_name = 'transfer_order_reservations'
        """
    )
    assert row is not None
    columns = {
        item[0] for item in _all(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name = 'transfer_order_reservations'"
        )
    }
    assert {
        "to_id", "to_line_id", "inventory_id", "item_id", "warehouse_id",
        "quantity_reserved", "quantity_picked", "quantity_consumed", "quantity_released",
    }.issubset(columns)


def _all(sql, params=()):
    cur = _cursor()
    try:
        cur.execute(sql, params)
        return cur.fetchall()
    finally:
        cur.close()


def test_start_picking_uses_only_line_owned_bin_slices_and_blocks_duplicate_batch(
    client, auth_headers
):
    _ensure_second_source_inventory_row()
    rows = _inventory_rows(5)
    assert len(rows) >= 2, "seed requires two source inventory bins"
    first, second = rows[0], rows[1]
    to_id = _seed_to()
    line_id = _seed_line(to_id, committed=5)
    _reserve(to_id, line_id, first[0], 2)
    _reserve(to_id, line_id, second[0], 3)

    response = client.post(
        f"/api/admin/transfer-orders/{to_id}/start-picking",
        headers=auth_headers,
    )
    assert response.status_code == 201, response.get_json()
    tasks = _all(
        """
        SELECT bin_id, quantity_to_pick
          FROM pick_tasks
         WHERE to_id = %s
         ORDER BY pick_sequence
        """,
        (to_id,),
    )
    assert tasks == [(first[0], first[1], 2), (second[0], second[1], 3)]

    duplicate = client.post(
        f"/api/admin/transfer-orders/{to_id}/start-picking",
        headers=auth_headers,
    )
    assert duplicate.status_code == 409
    assert duplicate.get_json()["error"] == "picking_batch_already_open"


def test_short_close_releases_only_the_current_lines_reservation(client, auth_headers):
    inventory = _inventory_rows(10)[0]
    inventory_id = inventory[0]
    to_a, to_b = _seed_to(), _seed_to()
    line_a, line_b = _seed_line(to_a, committed=4), _seed_line(to_b, committed=6)
    _reserve(to_a, line_a, inventory_id, 4)
    _reserve(to_b, line_b, inventory_id, 6)
    before = _one(
        "SELECT quantity_allocated FROM inventory WHERE inventory_id = %s",
        (inventory_id,),
    )[0]

    response = client.post(
        f"/api/admin/transfer-orders/{to_a}/lines/{line_a}/short-close",
        headers=auth_headers,
    )
    assert response.status_code == 200, response.get_json()
    after = _one(
        "SELECT quantity_allocated FROM inventory WHERE inventory_id = %s",
        (inventory_id,),
    )[0]
    assert after == before - 4
    assert _one(
        "SELECT quantity_released FROM transfer_order_reservations WHERE to_line_id = %s",
        (line_a,),
    )[0] == 4
    assert _one(
        "SELECT quantity_released FROM transfer_order_reservations WHERE to_line_id = %s",
        (line_b,),
    )[0] == 0


def test_approval_consumes_exact_owned_inventory_and_preserves_other_reservation(
    client, auth_headers
):
    inventory = _inventory_rows(10)[0]
    inventory_id = inventory[0]
    to_a, to_b = _seed_to("AWAITING_APPROVAL"), _seed_to()
    line_a = _seed_line(to_a, committed=4, picked=4, status="PICKED")
    line_b = _seed_line(to_b, committed=6)
    _reserve(to_a, line_a, inventory_id, 4)
    _reserve(to_b, line_b, inventory_id, 6)
    approval_id = _seed_approval(to_a, line_a, 4)
    _ensure_destination_staging_bin()
    before = _one(
        "SELECT quantity_on_hand, quantity_allocated FROM inventory WHERE inventory_id = %s",
        (inventory_id,),
    )

    response = client.post(
        f"/api/admin/transfer-orders/{to_a}/approvals/{approval_id}/approve",
        headers=auth_headers,
    )
    assert response.status_code == 200, response.get_json()
    after = _one(
        "SELECT quantity_on_hand, quantity_allocated FROM inventory WHERE inventory_id = %s",
        (inventory_id,),
    )
    assert after == (before[0] - 4, before[1] - 4)
    assert _one(
        "SELECT quantity_consumed FROM transfer_order_reservations WHERE to_line_id = %s",
        (line_a,),
    )[0] == 4
    assert _one(
        "SELECT quantity_consumed FROM transfer_order_reservations WHERE to_line_id = %s",
        (line_b,),
    )[0] == 0


def test_reject_restores_line_to_partially_picked_after_prior_approval(client, auth_headers):
    inventory = _inventory_rows(10)[0]
    to_id = _seed_to("AWAITING_APPROVAL")
    line_id = _seed_line(
        to_id, committed=10, picked=10, approved=3, status="PICKED"
    )
    _reserve(to_id, line_id, inventory[0], 10, consumed=3, picked=10)
    approval_id = _seed_approval(to_id, line_id, 7)

    response = client.post(
        f"/api/admin/transfer-orders/{to_id}/approvals/{approval_id}/reject",
        json={"rejection_reason": "count mismatch"},
        headers=auth_headers,
    )
    assert response.status_code == 200, response.get_json()
    line = _one(
        "SELECT picked_qty, approved_qty, status FROM transfer_order_lines WHERE to_line_id = %s",
        (line_id,),
    )
    assert line == (3, 3, "PARTIALLY_PICKED")
    reservation = _one(
        """
        SELECT quantity_reserved, quantity_consumed, quantity_released
          FROM transfer_order_reservations WHERE to_line_id = %s
        """,
        (line_id,),
    )
    assert reservation == (10, 3, 3, 0)
