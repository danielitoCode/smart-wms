"""Concurrency regressions using independent PostgreSQL transactions.

The normal conftest fixture binds SessionLocal to one outer test connection.
These tests deliberately bypass that binding: every worker gets a fresh
SQLAlchemy Session/connection and setup data is committed before workers start.
"""
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor

from sqlalchemy import text
from sqlalchemy.orm import sessionmaker

import models.database as db
from services.picking_service import confirm_pick


def _seed_concurrent_to_pick():
    suffix = uuid.uuid4().hex[:12]
    lot = f"CONC-{suffix}"
    with db.engine.begin() as conn:
        inventory_id = conn.execute(
            text(
                """
                INSERT INTO inventory
                    (item_id, bin_id, warehouse_id, quantity_on_hand,
                     quantity_allocated, lot_number)
                VALUES (1, 3, 1, 10, 5, :lot)
                RETURNING inventory_id
                """
            ),
            {"lot": lot},
        ).scalar_one()
        to_id = conn.execute(
            text(
                """
                INSERT INTO transfer_orders
                    (to_number, source_warehouse_id, destination_warehouse_id,
                     status, created_by, external_id)
                VALUES (:number, 1, 2, 'OPEN', 'concurrency-test', :external_id)
                RETURNING to_id
                """
            ),
            {"number": f"TO-CONC-{suffix}", "external_id": str(uuid.uuid4())},
        ).scalar_one()
        line_id = conn.execute(
            text(
                """
                INSERT INTO transfer_order_lines
                    (to_id, item_id, line_number, requested_qty, committed_qty, status)
                VALUES (:tid, 1, 1, 5, 5, 'PENDING')
                RETURNING to_line_id
                """
            ),
            {"tid": to_id},
        ).scalar_one()
        conn.execute(
            text(
                """
                INSERT INTO transfer_order_reservations
                    (to_id, to_line_id, inventory_id, item_id, warehouse_id,
                     quantity_reserved)
                VALUES (:tid, :lid, :iid, 1, 1, 5)
                """
            ),
            {"tid": to_id, "lid": line_id, "iid": inventory_id},
        )
        batch_id = conn.execute(
            text(
                """
                INSERT INTO pick_batches
                    (batch_number, warehouse_id, status, assigned_to)
                VALUES (:number, 1, 'OPEN', 'picker')
                RETURNING batch_id
                """
            ),
            {"number": f"PB-CONC-{suffix}"},
        ).scalar_one()
        task_id = conn.execute(
            text(
                """
                INSERT INTO pick_tasks
                    (batch_id, so_id, so_line_id, to_id, to_line_id,
                     item_id, bin_id, inventory_id, quantity_to_pick,
                     pick_sequence, status)
                VALUES (:bid, NULL, NULL, :tid, :lid,
                        1, 3, :iid, 5, 1, 'PENDING')
                RETURNING pick_task_id
                """
            ),
            {"bid": batch_id, "tid": to_id, "lid": line_id, "iid": inventory_id},
        ).scalar_one()
    return {
        "to_id": to_id,
        "line_id": line_id,
        "inventory_id": inventory_id,
        "batch_id": batch_id,
        "task_id": task_id,
    }


def test_duplicate_pick_confirmations_serialize_on_independent_connections():
    ids = _seed_concurrent_to_pick()
    factory = sessionmaker(bind=db.engine, expire_on_commit=False)
    barrier = threading.Barrier(2)

    def confirm():
        session = factory()
        try:
            barrier.wait(timeout=10)
            confirm_pick(
                session, ids["task_id"], "100000000001", 5, "picker"
            )
            return "confirmed"
        except ValueError as exc:
            session.rollback()
            return f"rejected:{exc}"
        finally:
            session.close()

    try:
        with ThreadPoolExecutor(max_workers=2) as pool:
            outcomes = list(pool.map(lambda _: confirm(), range(2)))
        assert outcomes.count("confirmed") == 1
        assert sum(value.startswith("rejected:") for value in outcomes) == 1

        with db.engine.connect() as conn:
            task = conn.execute(
                text(
                    "SELECT status, quantity_picked FROM pick_tasks "
                    "WHERE pick_task_id = :tid"
                ),
                {"tid": ids["task_id"]},
            ).one()
            line = conn.execute(
                text(
                    "SELECT picked_qty FROM transfer_order_lines "
                    "WHERE to_line_id = :lid"
                ),
                {"lid": ids["line_id"]},
            ).scalar_one()
            reservation = conn.execute(
                text(
                    "SELECT quantity_picked, quantity_consumed "
                    "FROM transfer_order_reservations WHERE to_line_id = :lid"
                ),
                {"lid": ids["line_id"]},
            ).one()
            audit_count = conn.execute(
                text(
                    "SELECT COUNT(*) FROM audit_log "
                    "WHERE details->>'pick_task_id' = :task_id"
                ),
                {"task_id": str(ids["task_id"])},
            ).scalar_one()

        assert tuple(task) == ("PICKED", 5)
        assert line == 5
        assert tuple(reservation) == (5, 0)
        assert audit_count == 1
    finally:
        # Audit rows are append-only and remain as historical evidence.
        with db.engine.begin() as conn:
            conn.execute(
                text("DELETE FROM pick_tasks WHERE pick_task_id = :tid"),
                {"tid": ids["task_id"]},
            )
            conn.execute(
                text("DELETE FROM pick_batches WHERE batch_id = :bid"),
                {"bid": ids["batch_id"]},
            )
            conn.execute(
                text("DELETE FROM transfer_orders WHERE to_id = :tid"),
                {"tid": ids["to_id"]},
            )
            conn.execute(
                text("DELETE FROM inventory WHERE inventory_id = :iid"),
                {"iid": ids["inventory_id"]},
            )


def test_duplicate_shipping_fulfillments_serialize_on_independent_connections(
    app, auth_headers,
):
    suffix = uuid.uuid4().hex[:12]
    with db.engine.begin() as conn:
        so_id = conn.execute(
            text(
                """
                INSERT INTO sales_orders
                    (so_number, so_barcode, customer_name, status, warehouse_id,
                     ship_method, created_by, external_id)
                VALUES (:number, :barcode, 'Concurrency Test', 'PACKED', 1,
                        'GROUND', 'concurrency-test', :external_id)
                RETURNING so_id
                """
            ),
            {
                "number": f"SO-CONC-{suffix}",
                "barcode": f"SO-CONC-{suffix}",
                "external_id": str(uuid.uuid4()),
            },
        ).scalar_one()
        conn.execute(
            text(
                """
                INSERT INTO sales_order_lines
                    (so_id, item_id, quantity_ordered, quantity_picked,
                     quantity_packed, quantity_shipped, line_number, status)
                VALUES (:sid, 1, 2, 2, 2, 0, 1, 'PACKED')
                """
            ),
            {"sid": so_id},
        )

    original_factory = db.SessionLocal
    db.SessionLocal = sessionmaker(bind=db.engine, expire_on_commit=False)
    barrier = threading.Barrier(2)

    def fulfill(index):
        with app.test_client() as client:
            barrier.wait(timeout=10)
            response = client.post(
                "/api/shipping/fulfill",
                json={
                    "so_id": so_id,
                    "tracking_number": f"CONC-{suffix}-{index}",
                    "carrier": "UPS",
                    "ship_method": "GROUND",
                    "warehouse_id": 1,
                },
                headers=auth_headers,
            )
            return response.status_code, response.get_json()

    try:
        with ThreadPoolExecutor(max_workers=2) as pool:
            outcomes = list(pool.map(fulfill, (1, 2)))
        assert sorted(status for status, _ in outcomes) == [200, 400]

        with db.engine.connect() as conn:
            status = conn.execute(
                text("SELECT status FROM sales_orders WHERE so_id = :sid"),
                {"sid": so_id},
            ).scalar_one()
            fulfillments = conn.execute(
                text("SELECT COUNT(*) FROM item_fulfillments WHERE so_id = :sid"),
                {"sid": so_id},
            ).scalar_one()
            events = conn.execute(
                text(
                    """
                    SELECT COUNT(*) FROM integration_events
                     WHERE aggregate_type = 'sales_order' AND aggregate_id = :sid
                       AND event_type = 'ship.confirmed'
                    """
                ),
                {"sid": so_id},
            ).scalar_one()
            audit = conn.execute(
                text(
                    "SELECT COUNT(*) FROM audit_log "
                    "WHERE action_type = 'SHIP' AND entity_id = :sid"
                ),
                {"sid": so_id},
            ).scalar_one()

        assert status == "SHIPPED"
        assert fulfillments == 1
        assert events == 1
        assert audit == 1
    finally:
        db.SessionLocal = original_factory
        # Preserve append-only audit/outbox rows; remove only operational data.
        with db.engine.begin() as conn:
            conn.execute(
                text(
                    "DELETE FROM item_fulfillment_lines "
                    "WHERE fulfillment_id IN "
                    "(SELECT fulfillment_id FROM item_fulfillments WHERE so_id = :sid)"
                ),
                {"sid": so_id},
            )
            conn.execute(
                text("DELETE FROM item_fulfillments WHERE so_id = :sid"),
                {"sid": so_id},
            )
            conn.execute(
                text("DELETE FROM sales_order_lines WHERE so_id = :sid"),
                {"sid": so_id},
            )
            conn.execute(
                text("DELETE FROM sales_orders WHERE so_id = :sid"),
                {"sid": so_id},
            )
