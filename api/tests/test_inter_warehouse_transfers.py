"""Inter-warehouse transfer authorization, transactional integrity and idempotency."""
import os
import sys
import threading
import uuid

import pytest

os.environ.setdefault("DATABASE_URL", "postgresql://sentry:sentry@localhost:5432/sentry")
os.environ.setdefault("JWT_SECRET", "NEVER_USE_THIS_IN_PRODUCTION_32!")
os.environ.setdefault("SENTRY_ENCRYPTION_KEY", "t5hPIEVn_O41qfiMqAiPEnwzQh68o3Es46YfSOBvEK8=")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import db_test_context
import psycopg2


_PASSWORD_HASH = "$2b$12$zDGRKFLmc6v/A4mVhxOzb.7uoW1ulnXn0AisK5uJ5iWk33vC2EpSK"


def _query(sql, params=()):
    conn = db_test_context.get_raw_connection()
    cur = conn.cursor()
    try:
        cur.execute(sql, params)
        return cur.fetchall() if cur.description else None
    finally:
        cur.close()


def _headers(client, warehouse_ids):
    username = "iwh-" + uuid.uuid4().hex[:10]
    _query("DELETE FROM login_attempts")
    ids = "{" + ",".join(str(value) for value in warehouse_ids) + "}"
    warehouse_id = warehouse_ids[0] if warehouse_ids else None
    rows = _query(
        """INSERT INTO users (username, password_hash, full_name, role,
               warehouse_id, warehouse_ids, allowed_functions, external_id)
           VALUES (%s, %s, 'Inter-warehouse test', 'USER', %s, %s,
                   '{pick,receive,count}', %s) RETURNING user_id""",
        (username, _PASSWORD_HASH, warehouse_id, ids, str(uuid.uuid4())),
    )
    _query(
        "INSERT INTO user_page_permissions (user_id, page_key) VALUES (%s, 'transfer-orders')",
        (rows[0][0],),
    )
    login = client.post("/api/auth/login", json={"username": username, "password": "admin"})
    assert login.status_code == 200, login.get_json()
    return {"Authorization": "Bearer " + login.get_json()["token"]}


def _source_destination():
    source = _query(
        """SELECT inv.item_id, inv.bin_id, inv.warehouse_id
             FROM inventory inv JOIN bins b ON b.bin_id = inv.bin_id
            WHERE inv.warehouse_id = 1 AND b.is_active = TRUE
              AND inv.quantity_on_hand > inv.quantity_allocated
            ORDER BY inv.item_id, inv.bin_id LIMIT 1"""
    )
    assert source, "seed database must contain source stock in warehouse 1"
    suffix = uuid.uuid4().hex[:10].upper()
    warehouse_id = _query(
        "INSERT INTO warehouses (warehouse_code, warehouse_name) VALUES (%s, %s) RETURNING warehouse_id",
        ("IWH-" + suffix, "Inter-warehouse test " + suffix),
    )[0][0]
    zone_id = _query(
        "INSERT INTO zones (warehouse_id, zone_code, zone_name, zone_type) "
        "VALUES (%s, %s, %s, 'STORAGE') RETURNING zone_id",
        (warehouse_id, "Z-" + suffix, "Test zone " + suffix),
    )[0][0]
    destination_bin_id = _query(
        """INSERT INTO bins (zone_id, warehouse_id, bin_code, bin_barcode, bin_type, external_id)
           VALUES (%s, %s, %s, %s, 'Pickable', %s) RETURNING bin_id""",
        (zone_id, warehouse_id, "B-" + suffix, "BC-" + suffix, str(uuid.uuid4())),
    )[0][0]
    return source[0][0], source[0][1], source[0][2], destination_bin_id, warehouse_id


def _body(item_id, from_bin, from_wh, to_bin, to_wh, key=None, quantity=1):
    return {
        "item_id": item_id, "from_bin_id": from_bin, "from_warehouse_id": from_wh,
        "to_bin_id": to_bin, "to_warehouse_id": to_wh, "quantity": quantity,
        "reason": "automated transfer test", "idempotency_key": key or str(uuid.uuid4()),
    }


def _quantity(item_id, bin_id):
    return _query(
        "SELECT COALESCE(SUM(quantity_on_hand), 0) FROM inventory WHERE item_id = %s AND bin_id = %s",
        (item_id, bin_id),
    )[0][0]


def test_create_requires_access_to_both_warehouses(client):
    item_id, from_bin, from_wh, to_bin, to_wh = _source_destination()
    payload = _body(item_id, from_bin, from_wh, to_bin, to_wh)
    for allowed_ids in ([from_wh], [2], []):
        response = client.post(
            "/api/admin/inter-warehouse-transfer",
            json={**payload, "idempotency_key": str(uuid.uuid4())},
            headers=_headers(client, allowed_ids),
        )
        assert response.status_code == 404, (allowed_ids, response.get_json())

    both = _headers(client, [from_wh, to_wh])
    response = client.post(
        "/api/admin/inter-warehouse-transfer",
        json={**payload, "idempotency_key": str(uuid.uuid4())},
        headers=both,
    )
    assert response.status_code == 201, response.get_json()


def test_list_history_requires_access_to_both_warehouses(client, auth_headers):
    item_id, from_bin, from_wh, to_bin = _source_destination()
    created = client.post(
        "/api/admin/inter-warehouse-transfer",
        json=_body(item_id, from_bin, from_wh, to_bin),
        headers=auth_headers,
    )
    assert created.status_code == 201, created.get_json()
    transfer_id = created.get_json()["transfer_id"]

    for allowed_ids in ([from_wh], [2], []):
        headers = _headers(client, allowed_ids)
        response = client.get("/api/admin/inter-warehouse-transfers", headers=headers)
        assert response.status_code == 200
        assert transfer_id not in {row["transfer_id"] for row in response.get_json()["transfers"]}

    both = _headers(client, [from_wh, 2])
    response = client.get("/api/admin/inter-warehouse-transfers", headers=both)
    assert response.status_code == 200
    assert transfer_id in {row["transfer_id"] for row in response.get_json()["transfers"]}

    filtered = client.get(
        f"/api/admin/inter-warehouse-transfers?from_warehouse_id={from_wh}&to_warehouse_id=to_wh",
        headers=both,
    )
    assert transfer_id in {row["transfer_id"] for row in filtered.get_json()["transfers"]}
    reverse = client.get(
        f"/api/admin/inter-warehouse-transfers?from_warehouse_id=to_wh&to_warehouse_id={from_wh}",
        headers=both,
    )
    assert transfer_id not in {row["transfer_id"] for row in reverse.get_json()["transfers"]}
    malformed = client.get("/api/admin/inter-warehouse-transfers?from_warehouse_id=bad", headers=both)
    assert malformed.status_code == 400


def test_allocated_source_inventory_cannot_be_transferred(client, auth_headers):
    item_id, from_bin, from_wh, to_bin = _source_destination()
    _query(
        "UPDATE inventory SET quantity_allocated = quantity_on_hand "
        "WHERE item_id = %s AND bin_id = %s",
        (item_id, from_bin),
    )
    response = client.post(
        "/api/admin/inter-warehouse-transfer",
        json=_body(item_id, from_bin, from_wh, to_bin, to_wh, quantity=1),
        headers=auth_headers,
    )
    assert response.status_code == 400
    assert "unallocated" in response.get_json()["error"].lower()


def test_idempotent_retry_moves_stock_once_and_rejects_key_reuse(client, auth_headers):
    item_id, from_bin, from_wh, to_bin = _source_destination()
    key = str(uuid.uuid4())
    payload = _body(item_id, from_bin, from_wh, to_bin, 2, key=key, quantity=1)
    before_source, before_destination = _quantity(item_id, from_bin), _quantity(item_id, to_bin)

    first = client.post("/api/admin/inter-warehouse-transfer", json=payload, headers=auth_headers)
    retry = client.post("/api/admin/inter-warehouse-transfer", json=payload, headers=auth_headers)
    assert first.status_code == 201, first.get_json()
    assert retry.status_code == 201, retry.get_json()
    assert retry.get_json() == first.get_json()
    assert _quantity(item_id, from_bin) == before_source - 1
    assert _quantity(item_id, to_bin) == before_destination + 1

    mismatch = client.post(
        "/api/admin/inter-warehouse-transfer",
        json={**payload, "quantity": 2},
        headers=auth_headers,
    )
    assert mismatch.status_code == 409
    transfer_ids = first.get_json()["transfer_ids"]
    count = _query(
        "SELECT COUNT(*) FROM bin_transfers WHERE transfer_id = ANY(%s)",
        (transfer_ids,),
    )[0][0]
    assert count == len(transfer_ids)


def test_failure_before_commit_rolls_back_stock_transfer_and_receipt(
    client, auth_headers, monkeypatch,
):
    from routes.admin import admin_warehouse

    item_id, from_bin, from_wh, to_bin = _source_destination()
    key = str(uuid.uuid4())
    payload = _body(item_id, from_bin, from_wh, to_bin, 2, key=key)
    before_source, before_destination = _quantity(item_id, from_bin), _quantity(item_id, to_bin)
    before_transfers = _query(
        "SELECT COUNT(*) FROM bin_transfers WHERE transfer_type = 'INTER_WAREHOUSE'"
    )[0][0]
    before_audits = _query(
        "SELECT COUNT(*) FROM audit_log WHERE action_type = 'TRANSFER' AND entity_type = 'ITEM' AND entity_id = %s",
        (item_id,),
    )[0][0]
    original_audit = admin_warehouse.write_audit_log
    audit_calls = {"count": 0}

    def fail_second_audit(*args, **kwargs):
        audit_calls["count"] += 1
        if audit_calls["count"] == 2:
            raise RuntimeError("forced rollback after first audit")
        return original_audit(*args, **kwargs)

    monkeypatch.setattr(admin_warehouse, "write_audit_log", fail_second_audit)
    with pytest.raises(RuntimeError, match="forced rollback after first audit"):
        client.post("/api/admin/inter-warehouse-transfer", json=payload, headers=auth_headers)

    assert _quantity(item_id, from_bin) == before_source
    assert _quantity(item_id, to_bin) == before_destination
    assert _query(
        "SELECT COUNT(*) FROM bin_transfers WHERE transfer_type = 'INTER_WAREHOUSE'"
    )[0][0] == before_transfers
    assert _query(
        "SELECT COUNT(*) FROM audit_log WHERE action_type = 'TRANSFER' AND entity_type = 'ITEM' AND entity_id = %s",
        (item_id,),
    )[0][0] == before_audits
    assert _query(
        "SELECT COUNT(*) FROM inter_warehouse_transfer_requests WHERE idempotency_key = %s",
        (key,),
    )[0][0] == 0

    # A failed transaction does not consume the key; a client retry can
    # safely complete the same operation after the transient failure.
    monkeypatch.undo()
    retried = client.post("/api/admin/inter-warehouse-transfer", json=payload, headers=auth_headers)
    assert retried.status_code == 201, retried.get_json()
    assert _quantity(item_id, from_bin) == before_source - 1
    assert _quantity(item_id, to_bin) == before_destination + 1


def test_idempotency_user_identity_migration_is_repeatable():
    migration_path = os.path.join(
        os.path.dirname(__file__), "..", "..", "db", "migrations",
        "084_inter_warehouse_transfer_user_identity.sql",
    )
    with open(migration_path, encoding="utf-8") as migration_file:
        sql = migration_file.read()
    schema = "iwh_migration_" + uuid.uuid4().hex[:12]
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    conn.autocommit = True
    try:
        cur = conn.cursor()
        cur.execute(f'CREATE SCHEMA "{schema}"')
        cur.execute(f'SET search_path TO "{schema}"')
        cur.execute("CREATE TABLE users (user_id SERIAL PRIMARY KEY, username VARCHAR(50) UNIQUE NOT NULL)")
        cur.execute("INSERT INTO users (username) VALUES ('migrated-user') RETURNING user_id")
        user_id = cur.fetchone()[0]
        cur.execute(
            """CREATE TABLE inter_warehouse_transfer_requests (
                   username VARCHAR(100) NOT NULL,
                   idempotency_key UUID NOT NULL,
                   request_payload JSONB NOT NULL,
                   response_payload JSONB NOT NULL,
                   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                   PRIMARY KEY (username, idempotency_key)
               )"""
        )
        key = str(uuid.uuid4())
        cur.execute(
            """INSERT INTO inter_warehouse_transfer_requests
                   (username, idempotency_key, request_payload, response_payload)
               VALUES ('migrated-user', %s, '{}'::jsonb, '{}'::jsonb)""",
            (key,),
        )
        cur.execute(sql)
        cur.execute(sql)
        cur.execute(
            "SELECT user_id, idempotency_key FROM inter_warehouse_transfer_requests"
        )
        migrated = cur.fetchone()
        assert migrated[0] == user_id
        assert str(migrated[1]) == key
        cur.execute(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_schema = %s AND table_name = 'inter_warehouse_transfer_requests'",
            (schema,),
        )
        columns = {row[0] for row in cur.fetchall()}
        assert "user_id" in columns and "username" not in columns
    finally:
        cur = conn.cursor()
        cur.execute(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE')
        conn.close()

def test_same_idempotency_key_is_serialized_by_postgres_transaction_lock():
    key = "test-user:" + str(uuid.uuid4())
    first = psycopg2.connect(os.environ["DATABASE_URL"])
    second = psycopg2.connect(os.environ["DATABASE_URL"])
    try:
        c1, c2 = first.cursor(), second.cursor()
        c1.execute("SELECT pg_advisory_xact_lock(hashtextextended(%s, 0))", (key,))
        c2.execute("SELECT pg_try_advisory_xact_lock(hashtextextended(%s, 0))", (key,))
        assert c2.fetchone()[0] is False
        first.commit()
        c2.execute("SELECT pg_try_advisory_xact_lock(hashtextextended(%s, 0))", (key,))
        assert c2.fetchone()[0] is True
        second.commit()
    finally:
        first.close()
        second.close()


def test_concurrent_transfer_reservations_cannot_overdraw_locked_source_rows():
    item_id, from_bin, from_wh, _ = _source_destination()
    setup = psycopg2.connect(os.environ["DATABASE_URL"])
    try:
        cur = setup.cursor()
        cur.execute(
            """SELECT inventory_id, quantity_on_hand, quantity_allocated
                 FROM inventory
                WHERE item_id = %s AND bin_id = %s AND warehouse_id = %s
                ORDER BY inventory_id""",
            (item_id, from_bin, from_wh),
        )
        snapshot = cur.fetchall()
        assert snapshot
        cur.execute(
            "UPDATE inventory SET quantity_on_hand = 0, quantity_allocated = 0 "
            "WHERE item_id = %s AND bin_id = %s AND warehouse_id = %s",
            (item_id, from_bin, from_wh),
        )
        cur.execute(
            "UPDATE inventory SET quantity_on_hand = 5, quantity_allocated = 0 "
            "WHERE inventory_id = %s",
            (snapshot[0][0],),
        )
        setup.commit()
    finally:
        setup.close()

    barrier = threading.Barrier(2)
    accepted, rejected, errors = [], [], []

    def worker():
        conn = psycopg2.connect(os.environ["DATABASE_URL"])
        try:
            cur = conn.cursor()
            barrier.wait(timeout=5)
            cur.execute(
                """SELECT inventory_id, quantity_on_hand, quantity_allocated
                     FROM inventory
                    WHERE item_id = %s AND bin_id = %s AND warehouse_id = %s
                    ORDER BY lot_number NULLS FIRST, inventory_id
                    FOR UPDATE""",
                (item_id, from_bin, from_wh),
            )
            rows = cur.fetchall()
            available = sum(max(on_hand - allocated, 0) for _, on_hand, allocated in rows)
            if available < 4:
                conn.rollback()
                rejected.append(available)
                return
            remaining = 4
            for inventory_id, on_hand, allocated in rows:
                moved = min(max(on_hand - allocated, 0), remaining)
                if moved:
                    cur.execute(
                        "UPDATE inventory SET quantity_on_hand = quantity_on_hand - %s WHERE inventory_id = %s",
                        (moved, inventory_id),
                    )
                    remaining -= moved
                if remaining == 0:
                    break
            conn.commit()
            accepted.append(4)
        except Exception as exc:
            conn.rollback()
            errors.append(str(exc))
        finally:
            conn.close()

    threads = [threading.Thread(target=worker) for _ in range(2)]
    try:
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(timeout=10)
        assert all(not thread.is_alive() for thread in threads)
        assert not errors, errors
        assert len(accepted) == 1
        assert len(rejected) == 1
        check = psycopg2.connect(os.environ["DATABASE_URL"])
        try:
            cur = check.cursor()
            cur.execute(
                "SELECT COALESCE(SUM(quantity_on_hand - quantity_allocated), 0) "
                "FROM inventory WHERE item_id = %s AND bin_id = %s AND warehouse_id = %s",
                (item_id, from_bin, from_wh),
            )
            assert cur.fetchone()[0] == 1
        finally:
            check.close()
    finally:
        restore = psycopg2.connect(os.environ["DATABASE_URL"])
        try:
            cur = restore.cursor()
            for inventory_id, on_hand, allocated in snapshot:
                cur.execute(
                    "UPDATE inventory SET quantity_on_hand = %s, quantity_allocated = %s "
                    "WHERE inventory_id = %s",
                    (on_hand, allocated, inventory_id),
                )
            restore.commit()
        finally:
            restore.close()
