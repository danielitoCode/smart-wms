"""Real PostgreSQL race tests for Transfer Order picking and approval locks."""
import os
import threading
import uuid

os.environ.setdefault("DATABASE_URL", "postgresql://sentry:sentry@localhost:5432/sentry")
import psycopg2


def _connect():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def test_concurrent_picks_cannot_exceed_committed_quantity():
    setup = _connect()
    setup.autocommit = True
    cur = setup.cursor()
    cur.execute(
        """INSERT INTO transfer_orders
           (to_number, source_warehouse_id, destination_warehouse_id,
            status, created_by, external_id)
           VALUES (%s, 1, 2, 'OPEN', 'to-race', %s)
           RETURNING to_id""",
        (f"TO-RACE-{uuid.uuid4().hex[:10]}", str(uuid.uuid4())),
    )
    to_id = cur.fetchone()[0]
    cur.execute(
        """INSERT INTO transfer_order_lines
           (to_id, item_id, line_number, requested_qty, committed_qty,
            picked_qty, approved_qty, status)
           VALUES (%s, 1, 1, 10, 10, 0, 0, 'PENDING')
           RETURNING to_line_id""",
        (to_id,),
    )
    line_id = cur.fetchone()[0]
    cur.close()
    setup.close()

    results, blocked = [], []
    barrier = threading.Barrier(2)

    def worker():
        conn = _connect()
        try:
            cur = conn.cursor()
            cur.execute("BEGIN")
            barrier.wait(timeout=5)
            cur.execute(
                """UPDATE transfer_order_lines
                      SET picked_qty = picked_qty + %s,
                          status = CASE
                              WHEN picked_qty + %s = committed_qty THEN 'PICKED'
                              ELSE 'PARTIALLY_PICKED'
                          END
                    WHERE to_line_id = %s
                      AND picked_qty + %s <= committed_qty
                      AND status IN ('PENDING', 'PARTIALLY_PICKED')
                    RETURNING picked_qty""",
                (7, 7, line_id, 7),
            )
            row = cur.fetchone()
            if row:
                conn.commit()
                results.append(row[0])
            else:
                conn.rollback()
                blocked.append("over-pick blocked")
            cur.close()
        except Exception as exc:
            conn.rollback()
            blocked.append(str(exc))
        finally:
            conn.close()

    threads = [threading.Thread(target=worker) for _ in range(2)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(timeout=10)

    check = _connect()
    check.autocommit = True
    cur = check.cursor()
    cur.execute(
        "SELECT picked_qty, committed_qty FROM transfer_order_lines WHERE to_line_id = %s",
        (line_id,),
    )
    picked, committed = cur.fetchone()
    assert len(results) == 1, f"expected one concurrent pick, got {results}"
    assert len(blocked) == 1, f"expected one over-pick rejection, got {blocked}"
    assert picked == 7 and picked <= committed

    cur.execute("DELETE FROM transfer_order_lines WHERE to_line_id = %s", (line_id,))
    cur.execute("DELETE FROM transfer_orders WHERE to_id = %s", (to_id,))
    cur.close()
    check.close()


def test_approval_route_keeps_row_lock_for_concurrent_retries():
    route_path = os.path.join(
        os.path.dirname(__file__), "..", "routes", "admin", "admin_transfer_orders.py"
    )
    with open(route_path, encoding="utf-8") as source_file:
        source = source_file.read()
    approve_section = source.split("def approve_transfer_order_approval", 1)[1].split(
        "def reject_transfer_order_approval", 1
    )[0]
    assert "FROM transfer_order_approvals" in approve_section
    assert "FOR UPDATE" in approve_section
    assert "approval_not_pending" in approve_section

    setup = _connect()
    setup.autocommit = True
    cur = setup.cursor()
    cur.execute(
        """INSERT INTO transfer_orders
           (to_number, source_warehouse_id, destination_warehouse_id,
            status, created_by, external_id)
           VALUES (%s, 1, 2, 'AWAITING_APPROVAL', 'to-race', %s)
           RETURNING to_id""",
        (f"TO-APPROVAL-RACE-{uuid.uuid4().hex[:8]}", str(uuid.uuid4())),
    )
    to_id = cur.fetchone()[0]
    cur.execute(
        """INSERT INTO transfer_order_approvals
           (to_id, submitted_by, lines_snapshot, status, external_id)
           VALUES (%s, 'picker', '{"lines":[]}'::jsonb, 'PENDING', %s)
           RETURNING to_approval_id""",
        (to_id, str(uuid.uuid4())),
    )
    approval_id = cur.fetchone()[0]
    cur.close()
    setup.close()

    conn1, conn2 = _connect(), _connect()
    try:
        c1, c2 = conn1.cursor(), conn2.cursor()
        c1.execute("BEGIN")
        c1.execute(
            "SELECT to_approval_id FROM transfer_order_approvals WHERE to_approval_id = %s FOR UPDATE",
            (approval_id,),
        )
        c2.execute("BEGIN")
        try:
            c2.execute(
                "SELECT to_approval_id FROM transfer_order_approvals WHERE to_approval_id = %s FOR UPDATE NOWAIT",
                (approval_id,),
            )
            raise AssertionError("second approval attempt should wait on the same row lock")
        except psycopg2.errors.LockNotAvailable:
            pass
    finally:
        conn1.rollback()
        conn2.rollback()
        conn1.close()
        conn2.close()

    cleanup = _connect()
    cleanup.autocommit = True
    cur = cleanup.cursor()
    cur.execute("DELETE FROM transfer_order_approvals WHERE to_approval_id = %s", (approval_id,))
    cur.execute("DELETE FROM transfer_orders WHERE to_id = %s", (to_id,))
    cur.close()
    cleanup.close()
