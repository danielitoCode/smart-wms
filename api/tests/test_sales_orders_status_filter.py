"""GET /api/admin/sales-orders status filter.

The status param accepts a comma-separated list so a worklist can show
several statuses on one screen (the Local Pickup dashboard's OPEN+PICKED
active view). A single value still binds as plain equality.
"""

from db_test_context import get_raw_connection


def _set_status(so_id, status):
    conn = get_raw_connection()
    cur = conn.cursor()
    cur.execute("UPDATE sales_orders SET status = %s WHERE so_id = %s", (status, so_id))
    cur.close()


def _list(client, auth_headers, query):
    resp = client.get(f"/api/admin/sales-orders?{query}", headers=auth_headers)
    assert resp.status_code == 200
    return resp.get_json()["sales_orders"]


class TestSalesOrderStatusFilter:
    def test_single_status_binds_as_equality(self, client, auth_headers):
        _set_status(1, "OPEN")
        _set_status(2, "PICKED")
        rows = _list(client, auth_headers, "status=OPEN&per_page=1000")
        ids = {r["so_id"] for r in rows}
        assert 1 in ids
        assert 2 not in ids
        assert all(r["status"] == "OPEN" for r in rows)

    def test_comma_separated_status_uses_in_filter(self, client, auth_headers):
        _set_status(1, "OPEN")
        _set_status(2, "PICKED")
        rows = _list(client, auth_headers, "status=OPEN,PICKED&per_page=1000")
        ids = {r["so_id"] for r in rows}
        assert 1 in ids
        assert 2 in ids
        assert all(r["status"] in ("OPEN", "PICKED") for r in rows)

    def test_in_filter_excludes_non_matching_statuses(self, client, auth_headers):
        _set_status(1, "OPEN")
        _set_status(2, "SHIPPED")
        rows = _list(client, auth_headers, "status=OPEN,PICKED&per_page=1000")
        ids = {r["so_id"] for r in rows}
        assert 1 in ids
        assert 2 not in ids  # SHIPPED is excluded by the IN filter


class TestRefundReadProjection:
    def test_refund_list_includes_signed_amount_and_original_order_number(self, client, auth_headers):
        from db_test_context import get_raw_connection

        conn = get_raw_connection()
        cur = conn.cursor()
        cur.execute(
            """
            UPDATE sales_orders
               SET order_type = 'refund', parent_so_id = 2,
                   order_total = -12.34, status = 'SHIPPED', voided_at = NULL
             WHERE so_id = 1
            """
        )
        cur.close()

        rows = _list(client, auth_headers, "order_type=refund&per_page=1000")
        row = next(r for r in rows if r["so_id"] == 1)
        assert row["order_total"] == "-12.34"
        assert row["parent_so_number"]
