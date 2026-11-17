"""Service-level tests for sales_order_service.create_rma.

create_rma builds the goods-in RMA SO (order_type='return') off an original
order: so_number "<original>-RMA" via the suffix helper, warehouse/order_source
inherited, one return line per selected item pointing back to its original line.
Setup uses raw-cursor inserts sharing the per-test transaction; the service runs
on the same transaction via the SQLAlchemy connection.
"""

import os
import sys
import uuid

os.environ.setdefault("DATABASE_URL", "postgresql://sentry:sentry@localhost:5432/sentry")
os.environ.setdefault("JWT_SECRET", "NEVER_USE_THIS_IN_PRODUCTION_32!")
os.environ.setdefault("SENTRY_ENCRYPTION_KEY", "t5hPIEVn_O41qfiMqAiPEnwzQh68o3Es46YfSOBvEK8=")
os.environ.setdefault("SENTRY_TOKEN_PEPPER", "NEVER_USE_THIS_PEPPER_IN_PRODUCTION")

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from sqlalchemy import text as sa_text

from db_test_context import get_raw_connection


def _insert_item():
    conn = get_raw_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO items (sku, item_name, upc, external_id) "
        "VALUES (%s, %s, %s, %s) RETURNING item_id",
        (f"SKU-{uuid.uuid4().hex[:8]}", "Widget", "0123456789012", str(uuid.uuid4())),
    )
    item_id = cur.fetchone()[0]
    cur.close()
    return item_id


def _insert_so(so_number, *, order_type="sale", status="SHIPPED",
               warehouse_id=1, order_source="web"):
    conn = get_raw_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO sales_orders "
        "(so_number, customer_name, status, warehouse_id, order_type, "
        " order_source, external_id) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING so_id",
        (so_number, "Cust", status, warehouse_id, order_type, order_source,
         str(uuid.uuid4())),
    )
    so_id = cur.fetchone()[0]
    cur.close()
    return so_id


def _insert_so_line(so_id, item_id, *, qty=2, line_number=1, status="SHIPPED"):
    conn = get_raw_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO sales_order_lines "
        "(so_id, item_id, quantity_ordered, quantity_shipped, line_number, status) "
        "VALUES (%s, %s, %s, %s, %s, %s) RETURNING so_line_id",
        (so_id, item_id, qty, qty, line_number, status),
    )
    so_line_id = cur.fetchone()[0]
    cur.close()
    return so_line_id


class TestCreateRma:
    def test_creates_return_so_with_suffix_and_linked_lines(self, _db_transaction):
        from services.sales_order_service import create_rma
        db = _db_transaction
        parent_no = f"POS-{uuid.uuid4().hex[:8]}"
        parent_id = _insert_so(parent_no, order_type="sale", order_source="web")
        item_a, item_b = _insert_item(), _insert_item()
        line_a = _insert_so_line(parent_id, item_a, qty=3, line_number=1)
        line_b = _insert_so_line(parent_id, item_b, qty=5, line_number=2)

        result = create_rma(
            db,
            original_so_id=parent_id,
            lines=[
                {"item_id": item_a, "quantity": 1, "original_so_line_id": line_a},
                {"item_id": item_b, "quantity": 2, "original_so_line_id": line_b},
            ],
            created_by="op",
        )

        assert result["so_number"] == f"{parent_no}-RMA"
        rma = db.execute(
            sa_text("SELECT order_type, parent_so_id, status, order_source "
                    "FROM sales_orders WHERE so_id = :s"),
            {"s": result["so_id"]},
        ).fetchone()
        assert rma.order_type == "return"
        assert rma.parent_so_id == parent_id
        assert rma.status == "OPEN"
        assert rma.order_source == "web"  # inherited from the original

        rows = db.execute(
            sa_text("SELECT item_id, quantity_ordered, original_so_line_id, status "
                    "FROM sales_order_lines WHERE so_id = :s ORDER BY line_number"),
            {"s": result["so_id"]},
        ).fetchall()
        assert len(rows) == 2
        assert rows[0].item_id == item_a
        assert rows[0].quantity_ordered == 1
        assert rows[0].original_so_line_id == line_a
        assert rows[0].status == "OPEN"
        assert rows[1].original_so_line_id == line_b
        assert rows[1].quantity_ordered == 2

    def test_rejects_duplicate_original_line_in_one_authorization(self, _db_transaction):
        from services.sales_order_service import create_rma
        db = _db_transaction
        parent_id = _insert_so(f"POS-{uuid.uuid4().hex[:8]}")
        item_id = _insert_item()
        line_id = _insert_so_line(parent_id, item_id, qty=3)

        with pytest.raises(ValueError, match="duplicate original"):
            create_rma(
                db, original_so_id=parent_id, created_by="op",
                lines=[
                    {"item_id": item_id, "quantity": 1, "original_so_line_id": line_id},
                    {"item_id": item_id, "quantity": 1, "original_so_line_id": line_id},
                ],
            )
        assert db.execute(
            sa_text("SELECT count(*) FROM sales_orders WHERE parent_so_id=:p AND order_type='return'"),
            {"p": parent_id},
        ).scalar() == 0

    def test_rejects_item_not_belonging_to_original_line(self, _db_transaction):
        from services.sales_order_service import create_rma
        db = _db_transaction
        parent_id = _insert_so(f"POS-{uuid.uuid4().hex[:8]}")
        authorized_item, foreign_item = _insert_item(), _insert_item()
        line_id = _insert_so_line(parent_id, authorized_item, qty=2)

        with pytest.raises(ValueError, match="not authorized"):
            create_rma(
                db, original_so_id=parent_id, created_by="op",
                lines=[{"item_id": foreign_item, "quantity": 1, "original_so_line_id": line_id}],
            )
        assert db.execute(
            sa_text("SELECT count(*) FROM sales_orders WHERE parent_so_id=:p AND order_type='return'"),
            {"p": parent_id},
        ).scalar() == 0

    def test_rejects_invalid_quantity_and_unlinked_authorization_line(self, _db_transaction):
        from services.sales_order_service import create_rma
        db = _db_transaction
        parent_id = _insert_so(f"POS-{uuid.uuid4().hex[:8]}")
        item_id = _insert_item()
        line_id = _insert_so_line(parent_id, item_id, qty=2)

        with pytest.raises(ValueError, match="positive integer"):
            create_rma(
                db, original_so_id=parent_id, created_by="op",
                lines=[{"item_id": item_id, "quantity": 0, "original_so_line_id": line_id}],
            )
        with pytest.raises(ValueError, match="must reference"):
            create_rma(
                db, original_so_id=parent_id, created_by="op",
                lines=[{"item_id": item_id, "quantity": 1}],
            )

    def test_cannot_authorize_more_than_shipped_or_authorize_it_twice(self, _db_transaction):
        from services.sales_order_service import create_rma
        db = _db_transaction
        parent_id = _insert_so(f"POS-{uuid.uuid4().hex[:8]}")
        item_id = _insert_item()
        line_id = _insert_so_line(parent_id, item_id, qty=3)

        first = create_rma(
            db, original_so_id=parent_id, created_by="op",
            lines=[{"item_id": item_id, "quantity": 2, "original_so_line_id": line_id}],
        )
        assert first["so_id"] > 0
        with pytest.raises(ValueError, match="exceeds remaining shipped quantity"):
            create_rma(
                db, original_so_id=parent_id, created_by="op",
                lines=[{"item_id": item_id, "quantity": 2, "original_so_line_id": line_id}],
            )

    def test_rejects_non_sale_parent(self, _db_transaction):
        from services.sales_order_service import create_rma
        db = _db_transaction
        parent_id = _insert_so(
            f"BO-{uuid.uuid4().hex[:8]}", order_type="backorder",
        )
        item_id = _insert_item()
        line_id = _insert_so_line(parent_id, item_id, qty=2)
        with pytest.raises(ValueError, match="original sale"):
            create_rma(
                db, original_so_id=parent_id, created_by="op",
                lines=[{"item_id": item_id, "quantity": 1, "original_so_line_id": line_id}],
            )

    def test_missing_original_raises(self, _db_transaction):
        from services.sales_order_service import create_rma
        db = _db_transaction
        with pytest.raises(ValueError):
            create_rma(db, original_so_id=999_999_999, lines=[], created_by="op")
