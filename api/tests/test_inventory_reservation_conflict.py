"""The DB middleware exposes TO reservation-floor violations as HTTP 409."""

import uuid

from flask import g, jsonify
from sqlalchemy import text

from middleware.db import with_db
import db_test_context


def test_inventory_reservation_floor_violation_is_a_conflict_and_rolls_back(app):
    conn = db_test_context.get_raw_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            INSERT INTO transfer_orders
                (to_number, source_warehouse_id, destination_warehouse_id,
                 created_by, external_id, reservations_tracked)
            VALUES (%s, 1, 2, 'reservation-middleware-test', %s, TRUE)
            RETURNING to_id
            """,
            (f"TO-MW-{uuid.uuid4().hex[:10]}", str(uuid.uuid4())),
        )
        to_id = cur.fetchone()[0]
        cur.execute(
            """
            INSERT INTO transfer_order_lines
                (to_id, item_id, line_number, requested_qty, committed_qty)
            VALUES (%s, 1, 1, 5, 5)
            RETURNING to_line_id
            """,
            (to_id,),
        )
        line_id = cur.fetchone()[0]
        cur.execute(
            "SELECT inventory_id FROM inventory "
            " WHERE item_id = 1 AND warehouse_id = 1 "
            " ORDER BY inventory_id LIMIT 1 FOR UPDATE"
        )
        inventory_id = cur.fetchone()[0]
        cur.execute(
            "UPDATE inventory SET quantity_allocated = 5 "
            " WHERE inventory_id = %s",
            (inventory_id,),
        )
        cur.execute(
            "INSERT INTO transfer_order_reservations "
            "(to_line_id, inventory_id, reserved_qty) VALUES (%s, %s, 5)",
            (line_id, inventory_id),
        )

        @with_db
        def consume_reserved_stock():
            g.db.execute(
                text(
                    "UPDATE inventory SET quantity_allocated = quantity_allocated - 5 "
                    " WHERE inventory_id = :iid"
                ),
                {"iid": inventory_id},
            )
            g.db.commit()
            return jsonify({"ok": True})

        with app.test_request_context():
            response, status = consume_reserved_stock()

        assert status == 409
        assert response.get_json()["error"] == "inventory_reservation_conflict"
        cur.execute(
            "SELECT quantity_allocated FROM inventory WHERE inventory_id = %s",
            (inventory_id,),
        )
        assert cur.fetchone()[0] == 5
    finally:
        cur.close()
