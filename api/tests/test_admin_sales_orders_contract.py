"""Admin Sales Orders response contracts consumed by the Svelte feature."""

import uuid


def test_sales_order_detail_matches_frontend_projection_and_line_dtos(client, auth_headers):
    response = client.get("/api/admin/sales-orders/1", headers=auth_headers)
    assert response.status_code == 200, response.get_json()
    body = response.get_json()
    assert set(("sales_order", "lines", "pick_tasks")).issubset(body)
    order = body["sales_order"]
    assert {
        "so_id", "so_number", "status", "warehouse_id", "order_type",
        "parent_so_id", "backorder_opened_at", "backorder_fulfillable_at",
        "picked_at", "packed_at", "shipped_at", "shipped_date_local",
        "billing_address_name", "shipping_address_name",
    }.issubset(order)
    assert isinstance(body["lines"], list)
    if body["lines"]:
        line = body["lines"][0]
        assert {
            "so_line_id", "line_number", "item_id", "sku", "item_name",
            "quantity_ordered", "quantity_allocated", "quantity_picked",
            "quantity_packed", "quantity_shipped", "quantity_received", "status",
        }.issubset(line)
    assert isinstance(body["pick_tasks"], list)


def test_sales_order_list_matches_pagination_and_optional_projection_contract(client, auth_headers):
    response = client.get(
        "/api/admin/sales-orders?page=1&per_page=25&include_primary_bin=true&include_line_count=true",
        headers=auth_headers,
    )
    assert response.status_code == 200, response.get_json()
    body = response.get_json()
    assert {
        "sales_orders", "total", "page", "per_page", "pages",
    }.issubset(body)
    assert body["page"] == 1
    assert body["per_page"] == 25
    if body["sales_orders"]:
        order = body["sales_orders"][0]
        assert "so_id" in order and "so_number" in order
        assert "line_count" in order
        assert "primary_bin_code" in order
        assert "primary_bin_pick_sequence" in order


def test_sales_order_create_response_round_trips_the_create_dto(client, auth_headers):
    number = f"SO-CONTRACT-{uuid.uuid4().hex[:10]}"
    response = client.post(
        "/api/admin/sales-orders",
        json={
            "so_number": number,
            "warehouse_id": 1,
            "customer_name": "Contract Customer",
            "customer_email": "contract@example.test",
            "customer_phone": "555-0100",
            "ship_method": "Ground",
            "ship_address": "Receiving Dock",
            "memo": "Created by contract test",
            "order_origin": "contract-test",
            "lines": [{"item_id": 1, "quantity_ordered": 1}],
        },
        headers=auth_headers,
    )
    assert response.status_code == 200, response.get_json()
    body = response.get_json()
    assert body["sales_order"]["so_number"] == number
    assert body["sales_order"]["customer_name"] == "Contract Customer"
    assert body["sales_order"]["order_origin"] == "contract-test"
    assert len(body["lines"]) == 1
    assert body["lines"][0]["quantity_ordered"] == 1
    assert body["lines"][0]["quantity_received"] == 0
    assert isinstance(body["pick_tasks"], list)
