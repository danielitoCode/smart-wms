"""PostgreSQL concurrency regressions using independent DB sessions.

These tests intentionally do not use the conftest SessionLocal override, which
binds requests to one outer test transaction. Each worker obtains its own
SQLAlchemy session/connection so PostgreSQL row locks are exercised for real.
"""

import os
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor

import psycopg2
from sqlalchemy import text
from sqlalchemy.orm import sessionmaker

import models.database as db
import services.picking_service as picking_service
import services.shipping_service as shipping_service


def _connect():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def _seed_transfer_pick():
    conn = _connect()
    cur = conn.cursor()
    suffix = uuid.uuid4().hex[:12]
    try:
        cur.execute("SELECT upc FROM items WHERE item_id = 1")
        upc = cur.fetchone()[0]
        cur.execute(
            """
            INSERT INTO transfer_orders
                (to_number, source_warehouse_id, destination_warehouse_id,
                 status, created_by, external_id, reservations_tracked)
            VALUES (%s, 1, 2, 'OPEN', 'concurrency-test', %s, TRUE)
            RETURNING to_id
            """,
            (f"TO-CONC-{suffix}", str(uuid.uuid4())),
        )
        to_id = cur.fetchone()[0]
        cur.execute(
            """
            INSERT INTO transfer_order_lines
                (to_id, item_id, line_number, requested_qty, committed_qty, status)
            VALUES (%s, 1, 1, 1, 1, 'PENDING')
            RETURNING to_line_id
            """,
            (to_id,),
        )
        line_id = cur.fetchone()[0]
        cur.execute(
            "SELECT inventory_id FROM inventory WHERE item_id = 1 AND warehouse_id = 1 "
            "ORDER BY inventory_id LIMIT 1"
        )
        inventory_id = cur.fetchone()[0]
        cur.execute(
            "UPDATE inventory SET quantity_allocated = quantity_allocated + 1 "
            " WHERE inventory_id = %s",
            (inventory_id,),
        )
        cur.execute(
            "INSERT INTO transfer_order_reservations "
            "(to_line_id, inventory_id, reserved_qty) VALUES (%s, %s, 1)",
            (line_id, inventory_id),
        )
        cur.execute(
            """
            INSERT INTO pick_batches (batch_number, warehouse_id, status, assigned_to)
            VALUES (%s, 1, 'OPEN', 'concurrency-test')
            RETURNING batch_id
            """,
            (f"BATCH-CONC-{suffix}",),
        )
        batch_id = cur.fetchone()[0]
        cur.execute(
            """
            INSERT INTO pick_tasks
                (batch_id, so_id, so_line_id, to_id, to_line_id, item_id,
                 bin_id, quantity_to_pick, pick_sequence, status)
            VALUES (%s, NULL, NULL, %s, %s, 1, 3, 1, 1, 'PENDING')
            RETURNING pick_task_id
            """,
            (batch_id, to_id, line_id),
        )
        task_id = cur.fetchone()[0]
        conn.commit()
        return {
            "to_id": to_id, "line_id": line_id, "batch_id": batch_id,
            "task_id": task_id, "inventory_id": inventory_id, "barcode": upc,
        }
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


def _cleanup_transfer_pick(seed):
    conn = _connect()
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM pick_tasks WHERE pick_task_id = %s", (seed["task_id"],))
        cur.execute("DELETE FROM pick_batches WHERE batch_id = %s", (seed["batch_id"],))
        cur.execute("DELETE FROM transfer_orders WHERE to_id = %s", (seed["to_id"],))
        cur.execute(
            "UPDATE inventory SET quantity_allocated = quantity_allocated - 1 "
            " WHERE inventory_id = %s AND quantity_allocated >= 1",
            (seed["inventory_id"],),
        )
        conn.commit()
    finally:
        cur.close()
        conn.close()


def _seed_shipping_order():
    conn = _connect()
    cur = conn.cursor()
    suffix = uuid.uuid4().hex[:12]
    try:
        cur.execute(
            """
            INSERT INTO sales_orders
                (so_number, so_barcode, customer_name, status, warehouse_id,
                 ship_method, created_by, external_id)
            VALUES (%s, %s, 'Concurrency Test', 'PACKED', 1,
                    'UPS Ground', 'concurrency-test', %s)
            RETURNING so_id, so_number, external_id
            """,
            (f"SO-CONC-{suffix}", f"SO-CONC-{suffix}", str(uuid.uuid4())),
        )
        so_id, so_number, external_id = cur.fetchone()
        cur.execute(
            """
            INSERT INTO sales_order_lines
                (so_id, item_id, quantity_ordered, quantity_picked, quantity_packed, line_number, status)
            VALUES (%s, 1, 1, 1, 1, 1, 'PACKED')
            RETURNING so_line_id
            """,
            (so_id,),
        )
        line_id = cur.fetchone()[0]
        cur.execute(
            """
            INSERT INTO pick_batches (batch_number, warehouse_id, status, assigned_to)
            VALUES (%s, 1, 'COMPLETED', 'concurrency-test')
            RETURNING batch_id
            """,
            (f"BATCH-SHIP-{suffix}",),
        )
        batch_id = cur.fetchone()[0]
        cur.execute(
            """
            INSERT INTO pick_tasks
                (batch_id, so_id, so_line_id, item_id, bin_id,
                 quantity_to_pick, quantity_picked, pick_sequence, status)
            VALUES (%s, %s, %s, 1, 3, 1, 1, 1, 'PICKED')
            RETURNING pick_task_id
            """,
            (batch_id, so_id, line_id),
        )
        task_id = cur.fetchone()[0]
        conn.commit()
        return {
            "so_id": so_id, "so_number": so_number, "external_id": external_id,
            "line_id": line_id, "batch_id": batch_id, "task_id": task_id,
        }
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


def _seed_sales_short_pick():
    conn = _connect()
    cur = conn.cursor()
    suffix = uuid.uuid4().hex[:12]
    try:
        cur.execute(
            "SELECT inventory_id, quantity_allocated, quantity_on_hand "
            "FROM inventory WHERE item_id = 1 AND warehouse_id = 1 AND bin_id = 3 "
            "ORDER BY inventory_id LIMIT 1"
        )
        inventory_id, allocated_before, on_hand_before = cur.fetchone()
        cur.execute(
            """
            INSERT INTO sales_orders
                (so_number, so_barcode, customer_name, status, warehouse_id,
                 ship_method, created_by, external_id)
            VALUES (%s, %s, 'Short Pick Concurrency', 'OPEN', 1,
                    'UPS Ground', 'concurrency-test', %s)
            RETURNING so_id
            """,
            (f"SO-SHORT-{suffix}", f"SO-SHORT-{suffix}", str(uuid.uuid4())),
        )
        so_id = cur.fetchone()[0]
        cur.execute(
            """
            INSERT INTO sales_order_lines
                (so_id, item_id, quantity_ordered, quantity_allocated,
                 quantity_picked, line_number, status)
            VALUES (%s, 1, 1, 1, 0, 1, 'ALLOCATED')
            RETURNING so_line_id
            """,
            (so_id,),
        )
        line_id = cur.fetchone()[0]
        cur.execute(
            """
            INSERT INTO pick_batches (batch_number, warehouse_id, status, assigned_to)
            VALUES (%s, 1, 'OPEN', 'concurrency-test')
            RETURNING batch_id
            """,
            (f"BATCH-SHORT-{suffix}",),
        )
        batch_id = cur.fetchone()[0]
        cur.execute(
            "UPDATE inventory SET quantity_allocated = quantity_allocated + 1 "
            " WHERE inventory_id = %s",
            (inventory_id,),
        )
        cur.execute(
            """
            INSERT INTO pick_tasks
                (batch_id, so_id, so_line_id, item_id, bin_id,
                 quantity_to_pick, quantity_picked, pick_sequence, status)
            VALUES (%s, %s, %s, 1, 3, 1, 0, 1, 'PENDING')
            RETURNING pick_task_id
            """,
            (batch_id, so_id, line_id),
        )
        task_id = cur.fetchone()[0]
        conn.commit()
        return {
            "so_id": so_id, "line_id": line_id, "batch_id": batch_id,
            "task_id": task_id, "inventory_id": inventory_id,
            "allocated_before": allocated_before, "on_hand_before": on_hand_before,
        }
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


def _cleanup_sales_short_pick(seed):
    conn = _connect()
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM pick_tasks WHERE pick_task_id = %s", (seed["task_id"],))
        cur.execute("DELETE FROM pick_batches WHERE batch_id = %s", (seed["batch_id"],))
        cur.execute("DELETE FROM sales_order_lines WHERE so_id = %s", (seed["so_id"],))
        cur.execute("DELETE FROM sales_orders WHERE so_id = %s", (seed["so_id"],))
        cur.execute(
            "UPDATE inventory SET quantity_allocated = %s WHERE inventory_id = %s",
            (seed["allocated_before"], seed["inventory_id"]),
        )
        conn.commit()
    finally:
        cur.close()
        conn.close()


def _cleanup_shipping_order(seed):
    conn = _connect()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            DELETE FROM item_fulfillment_lines
             WHERE fulfillment_id IN (
                 SELECT fulfillment_id FROM item_fulfillments WHERE so_id = %s
             )
            """,
            (seed["so_id"],),
        )
        cur.execute("DELETE FROM item_fulfillments WHERE so_id = %s", (seed["so_id"],))
        cur.execute("DELETE FROM pick_tasks WHERE pick_task_id = %s", (seed["task_id"],))
        cur.execute("DELETE FROM pick_batches WHERE batch_id = %s", (seed["batch_id"],))
        cur.execute("DELETE FROM sales_order_lines WHERE so_id = %s", (seed["so_id"],))
        cur.execute("DELETE FROM sales_orders WHERE so_id = %s", (seed["so_id"],))
        conn.commit()
    finally:
        cur.close()
        conn.close()


def test_duplicate_pick_confirmations_serialize_on_independent_postgres_connections(monkeypatch):
    seed = _seed_transfer_pick()
    monkeypatch.setattr(picking_service, "write_audit_log", lambda *args, **kwargs: None)
    independent_sessions = sessionmaker(bind=db.engine, expire_on_commit=False)
    barrier = threading.Barrier(2)

    def confirm():
        session = independent_sessions()
        try:
            session.execute(text("SET LOCAL lock_timeout = '5s'"))
            barrier.wait(timeout=10)
            result = picking_service.confirm_pick(
                session,
                seed["task_id"],
                seed["barcode"],
                1,
                "concurrency-picker",
            )
            return ("ok", result)
        except Exception as exc:
            session.rollback()
            return ("error", str(exc))
        finally:
            session.close()

    try:
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(lambda _: confirm(), range(2), timeout=15))
        assert [result[0] for result in results].count("ok") == 1
        assert [result[0] for result in results].count("error") == 1
        assert any("already PICKED" in result[1] for result in results if result[0] == "error")
        conn = _connect()
        cur = conn.cursor()
        cur.execute(
            "SELECT status, quantity_picked FROM pick_tasks WHERE pick_task_id = %s",
            (seed["task_id"],),
        )
        assert cur.fetchone() == ("PICKED", 1)
        cur.execute(
            "SELECT picked_qty FROM transfer_order_lines WHERE to_line_id = %s",
            (seed["line_id"],),
        )
        assert cur.fetchone()[0] == 1
        cur.execute(
            "SELECT reserved_qty, consumed_qty, released_qty "
            "FROM transfer_order_reservations WHERE to_line_id = %s",
            (seed["line_id"],),
        )
        assert cur.fetchone() == (1, 0, 0)
        conn.close()
    finally:
        _cleanup_transfer_pick(seed)


def test_duplicate_short_picks_serialize_on_independent_postgres_connections(monkeypatch):
    seed = _seed_sales_short_pick()
    monkeypatch.setattr(picking_service, "write_audit_log", lambda *args, **kwargs: None)
    independent_sessions = sessionmaker(bind=db.engine, expire_on_commit=False)
    barrier = threading.Barrier(2)

    def short():
        session = independent_sessions()
        try:
            session.execute(text("SET LOCAL lock_timeout = '5s'"))
            barrier.wait(timeout=10)
            result = picking_service.short_pick(
                session,
                seed["task_id"],
                0,
                "concurrency-picker",
            )
            return ("ok", result)
        except Exception as exc:
            session.rollback()
            return ("error", str(exc))
        finally:
            session.close()

    try:
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(lambda _: short(), range(2), timeout=15))
        assert [result[0] for result in results].count("ok") == 1
        assert [result[0] for result in results].count("error") == 1
        assert any("already SHORT" in result[1] for result in results if result[0] == "error")
        conn = _connect()
        cur = conn.cursor()
        cur.execute(
            "SELECT status, quantity_picked FROM pick_tasks WHERE pick_task_id = %s",
            (seed["task_id"],),
        )
        assert cur.fetchone() == ("SHORT", 0)
        cur.execute(
            "SELECT quantity_allocated, quantity_on_hand FROM inventory WHERE inventory_id = %s",
            (seed["inventory_id"],),
        )
        allocated, on_hand = cur.fetchone()
        assert allocated == seed["allocated_before"]
        assert on_hand == seed["on_hand_before"]
        cur.execute(
            "SELECT quantity_picked FROM sales_order_lines WHERE so_line_id = %s",
            (seed["line_id"],),
        )
        assert cur.fetchone()[0] == 0
        cur.close()
        conn.close()
    finally:
        _cleanup_sales_short_pick(seed)


def test_duplicate_shipping_fulfillments_serialize_on_independent_postgres_connections(monkeypatch):
    route_path = os.path.join(
        os.path.dirname(__file__), "..", "routes", "shipping.py"
    )
    with open(route_path, encoding="utf-8") as source_file:
        source = source_file.read()
    fulfill_section = source.split('@shipping_bp.route("/fulfill"', 1)[1].split(
        "@shipping_bp.route", 1
    )[0]
    assert "FOR UPDATE" in fulfill_section

    seed = _seed_shipping_order()
    monkeypatch.setattr(shipping_service, "write_audit_log", lambda *args, **kwargs: 0)
    monkeypatch.setattr(shipping_service, "_emit_ship_confirmed", lambda *args, **kwargs: None)
    independent_sessions = sessionmaker(bind=db.engine, expire_on_commit=False)
    barrier = threading.Barrier(2)

    def fulfill(index):
        session = independent_sessions()
        try:
            session.execute(text("SET LOCAL lock_timeout = '5s'"))
            barrier.wait(timeout=10)
            so = session.execute(
                text(
                    """
                    SELECT so_id, so_number, status, warehouse_id, external_id
                      FROM sales_orders WHERE so_id = :sid FOR UPDATE
                    """
                ),
                {"sid": seed["so_id"]},
            ).fetchone()
            if not so or so.status not in ("PICKED", "PACKED"):
                session.rollback()
                return ("rejected", so.status if so else None)
            result = shipping_service.record_ship(
                session,
                so_id=so.so_id,
                so_number=so.so_number,
                so_external_id=so.external_id,
                warehouse_id=so.warehouse_id,
                tracking_number=f"CONC-{index}",
                carrier="UPS",
                ship_method="UPS Ground",
                username="concurrency-shipper",
                source_txn_id=str(uuid.uuid4()),
            )
            session.commit()
            return ("ok", result["fulfillment_id"])
        except Exception as exc:
            session.rollback()
            return ("error", str(exc))
        finally:
            session.close()

    try:
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(fulfill, (1, 2), timeout=15))
        assert [result[0] for result in results].count("ok") == 1
        assert [result[0] for result in results].count("rejected") == 1
        conn = _connect()
        cur = conn.cursor()
        cur.execute("SELECT status FROM sales_orders WHERE so_id = %s", (seed["so_id"],))
        assert cur.fetchone()[0] == "SHIPPED"
        cur.execute("SELECT COUNT(*) FROM item_fulfillments WHERE so_id = %s", (seed["so_id"],))
        assert cur.fetchone()[0] == 1
        cur.execute(
            "SELECT COUNT(*) FROM item_fulfillment_lines fl "
            "JOIN item_fulfillments f ON f.fulfillment_id = fl.fulfillment_id "
            "WHERE f.so_id = %s",
            (seed["so_id"],),
        )
        assert cur.fetchone()[0] == 1
        conn.close()
    finally:
        _cleanup_shipping_order(seed)
