"""Schema tests for migration 085 exact Transfer Order reservations."""

import os
import sys
import uuid
from pathlib import Path

os.environ.setdefault("DATABASE_URL", "postgresql://sentry:sentry@localhost:5432/sentry")
os.environ.setdefault("JWT_SECRET", "NEVER_USE_THIS_IN_PRODUCTION_32!")
os.environ.setdefault("SENTRY_ENCRYPTION_KEY", "t5hPIEVn_O41qfiMqAiPEnwzQh68o3Es46YfSOBvEK8=")

import psycopg2


def _connect():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def _insert_to(cur, tracked=None):
    columns = "to_number, source_warehouse_id, destination_warehouse_id, created_by, external_id"
    values = "%s, 1, 2, 'migration-085', %s"
    params = [f"TO-M085-{uuid.uuid4().hex[:10]}", str(uuid.uuid4())]
    if tracked is not None:
        columns += ", reservations_tracked"
        values += ", %s"
        params.append(tracked)
    cur.execute(
        f"INSERT INTO transfer_orders ({columns}) VALUES ({values}) RETURNING to_id",
        params,
    )
    return cur.fetchone()[0]


def test_existing_transfer_orders_are_marked_untracked_and_new_orders_default_tracked():
    conn = _connect()
    try:
        cur = conn.cursor()
        legacy_id = _insert_to(cur, tracked=False)
        new_id = _insert_to(cur)
        conn.commit()
        cur.execute(
            "SELECT to_id, reservations_tracked FROM transfer_orders "
            " WHERE to_id IN (%s, %s) ORDER BY to_id",
            (legacy_id, new_id),
        )
        assert cur.fetchall() == [(legacy_id, False), (new_id, True)]
    finally:
        conn.close()


def test_reservation_ledger_rejects_consumed_plus_released_above_reserved():
    conn = _connect()
    try:
        cur = conn.cursor()
        to_id = _insert_to(cur)
        cur.execute(
            "INSERT INTO transfer_order_lines "
            "(to_id, item_id, line_number, requested_qty, committed_qty) "
            "VALUES (%s, 1, 1, 5, 5) RETURNING to_line_id",
            (to_id,),
        )
        line_id = cur.fetchone()[0]
        cur.execute(
            "SELECT inventory_id FROM inventory WHERE item_id = 1 AND warehouse_id = 1 "
            "ORDER BY inventory_id LIMIT 1"
        )
        inventory_id = cur.fetchone()[0]
        conn.commit()
        try:
            cur.execute(
                "INSERT INTO transfer_order_reservations "
                "(to_line_id, inventory_id, reserved_qty, consumed_qty, released_qty) "
                "VALUES (%s, %s, 5, 3, 3)",
                (line_id, inventory_id),
            )
            conn.commit()
            assert False, "reservation quantities must not exceed reserved_qty"
        except psycopg2.errors.CheckViolation:
            conn.rollback()
    finally:
        conn.close()


def test_reservation_is_cascaded_when_transfer_line_is_deleted():
    conn = _connect()
    try:
        cur = conn.cursor()
        to_id = _insert_to(cur)
        cur.execute(
            "INSERT INTO transfer_order_lines "
            "(to_id, item_id, line_number, requested_qty, committed_qty) "
            "VALUES (%s, 1, 1, 5, 5) RETURNING to_line_id",
            (to_id,),
        )
        line_id = cur.fetchone()[0]
        cur.execute(
            "SELECT inventory_id FROM inventory WHERE item_id = 1 AND warehouse_id = 1 "
            "ORDER BY inventory_id LIMIT 1"
        )
        inventory_id = cur.fetchone()[0]
        cur.execute(
            "INSERT INTO transfer_order_reservations "
            "(to_line_id, inventory_id, reserved_qty) VALUES (%s, %s, 5)",
            (line_id, inventory_id),
        )
        conn.commit()
        cur.execute("DELETE FROM transfer_order_lines WHERE to_line_id = %s", (line_id,))
        conn.commit()
        cur.execute(
            "SELECT COUNT(*) FROM transfer_order_reservations WHERE to_line_id = %s",
            (line_id,),
        )
        assert cur.fetchone()[0] == 0
    finally:
        conn.close()


def test_forward_migration_marks_preexisting_orders_untracked_and_new_orders_tracked():
    schema_name = f"to_m085_{uuid.uuid4().hex[:10]}"
    conn = _connect()
    conn.autocommit = True
    cur = conn.cursor()
    try:
        cur.execute(f'CREATE SCHEMA "{schema_name}"')
        cur.execute(f'SET search_path TO "{schema_name}"')
        cur.execute(
            """
            CREATE TABLE transfer_orders (
                to_id SERIAL PRIMARY KEY,
                to_number VARCHAR(32) NOT NULL UNIQUE,
                source_warehouse_id INT NOT NULL,
                destination_warehouse_id INT NOT NULL,
                created_by VARCHAR(100) NOT NULL,
                external_id UUID NOT NULL UNIQUE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            CREATE TABLE transfer_order_lines (
                to_line_id SERIAL PRIMARY KEY,
                to_id INT NOT NULL REFERENCES transfer_orders(to_id) ON DELETE CASCADE
            );
            CREATE TABLE inventory (inventory_id SERIAL PRIMARY KEY, quantity_allocated INT NOT NULL DEFAULT 0);
            CREATE TABLE pick_tasks (
                pick_task_id SERIAL PRIMARY KEY,
                quantity_picked INT NOT NULL DEFAULT 0
            );
            """
        )
        cur.execute(
            """
            INSERT INTO transfer_orders
                (to_number, source_warehouse_id, destination_warehouse_id, created_by, external_id)
            VALUES ('TO-LEGACY-085', 1, 2, 'legacy', %s)
            RETURNING to_id
            """,
            (str(uuid.uuid4()),),
        )
        legacy_id = cur.fetchone()[0]
        migration_path = (
            Path(__file__).resolve().parents[2]
            / "db" / "migrations" / "085_transfer_order_exact_reservations.sql"
        )
        cur.execute(migration_path.read_text(encoding="utf-8"))
        cur.execute(
            "SELECT reservations_tracked FROM transfer_orders WHERE to_id = %s",
            (legacy_id,),
        )
        assert cur.fetchone()[0] is False
        cur.execute(
            """
            INSERT INTO transfer_orders
                (to_number, source_warehouse_id, destination_warehouse_id, created_by, external_id)
            VALUES ('TO-NEW-085', 1, 2, 'new', %s)
            RETURNING reservations_tracked
            """,
            (str(uuid.uuid4()),),
        )
        assert cur.fetchone()[0] is True
        cur.execute(
            "SELECT to_regclass('transfer_order_reservations')"
        )
        assert cur.fetchone()[0] == "transfer_order_reservations"
        cur.execute(
            "SELECT column_name FROM information_schema.columns "
            " WHERE table_schema = %s AND table_name = 'pick_tasks' "
            "   AND column_name IN ('inventory_id', 'quantity_approved')",
            (schema_name,),
        )
        assert {row[0] for row in cur.fetchall()} == {"inventory_id", "quantity_approved"}

        cur.execute(
            "INSERT INTO transfer_order_lines (to_id) VALUES (%s) RETURNING to_line_id",
            (new_id,),
        )
        line_id = cur.fetchone()[0]
        cur.execute(
            "INSERT INTO inventory (quantity_allocated) VALUES (5) RETURNING inventory_id"
        )
        inventory_id = cur.fetchone()[0]
        cur.execute(
            "INSERT INTO transfer_order_reservations "
            "(to_line_id, inventory_id, reserved_qty) VALUES (%s, %s, 5)",
            (line_id, inventory_id),
        )
        try:
            cur.execute(
                "UPDATE inventory SET quantity_allocated = 4 WHERE inventory_id = %s",
                (inventory_id,),
            )
            assert False, "unrelated allocation release must preserve TO-owned stock"
        except psycopg2.errors.CheckViolation:
            pass
        cur.execute(
            "UPDATE transfer_order_reservations SET consumed_qty = 1 WHERE to_line_id = %s",
            (line_id,),
        )
        cur.execute(
            "UPDATE inventory SET quantity_allocated = 4 WHERE inventory_id = %s",
            (inventory_id,),
        )

    finally:
        cur.execute("SET search_path TO public")
        cur.execute(f'DROP SCHEMA IF EXISTS "{schema_name}" CASCADE')
        cur.close()
        conn.close()
