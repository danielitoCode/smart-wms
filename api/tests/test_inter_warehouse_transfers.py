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
    destination = _query(
        "SELECT bin_id FROM bins WHERE warehouse_id = 2 AND is_active = TRUE ORDER BY bin_id LIMIT 1"
    )
    assert source and destination, "seed database must contain source stock in warehouse 1 and an active bin in warehouse 2"
    return source[0][0], source[0][1], source[0][2], destination[0][0]


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
    item_id, from_bin, from_wh, to_bin = _source_destination()
    payload = _body(item_id, from_bin, from_wh, to_bin, 2)
    for allowed_ids in ([from_wh], [2], []):
        response = client.post(
            "/api/admin/inter-warehouse-transfer",
            json={**payload, "idempotency_key": str(uuid.uuid4())},
            headers=_headers(client, allowed_ids),
        )
        assert response.status_code == 404, (allowed_ids, response.get_json())


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

    def fail_after_inventory_mutation(*args, **kwargs):
        raise RuntimeError("forced rollback test")

    monkeypatch.setattr(admin_warehouse, "release_satisfiable_backorders", fail_after_inventory_mutation)
    with pytest.raises(RuntimeError, match="forced rollback"):
        client.post("/api/admin/inter-warehouse-transfer", json=payload, headers=auth_headers)

    assert _quantity(item_id, from_bin) == before_source
    assert _quantity(item_id, to_bin) == before_destination
    assert _query(
        "SELECT COUNT(*) FROM bin_transfers WHERE transfer_type = 'INTER_WAREHOUSE'"
    )[0][0] == before_transfers
    assert _query(
        "SELECT COUNT(*) FROM inter_warehouse_transfer_requests WHERE idempotency_key = %s",
        (key,),
    )[0][0] == 0


def test_idempotency_migration_is_repeatable():
    migration_path = os.path.join(
        os.path.dirname(__file__), "..", "..", "db", "migrations",
        "083_inter_warehouse_transfer_idempotency.sql",
    )
    with open(migration_path, encoding="utf-8") as migration_file:
        sql = migration_file.read()
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    conn.autocommit = True
    try:
        cur = conn.cursor()
        cur.execute(sql)
        cur.execute(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name = 'inter_warehouse_transfer_requests'"
        )
        columns = {row[0] for row in cur.fetchall()}
        assert {"username", "idempotency_key", "request_payload", "response_payload", "created_at"} <= columns
    finally:
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
