package inbound

import (
	"testing"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/features/catalog"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/features/inventoryledger"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/features/purchaseorders"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/features/salesorders"
	"github.com/yecharlot/PrismaTec-Core/core"
)

func newInboundTestService(t *testing.T) *Service {
	t.Helper()
	node, err := core.NewNode(core.Config{DataDir: t.TempDir(), Name: "wms-inbound-test"})
	if err != nil {
		t.Fatal(err)
	}
	store := corestore.New(node.Organisms(), string(node.ID()))
	ledger := inventoryledger.New(store)
	cat := catalog.New(store, ledger)
	sos := salesorders.New(store, cat)
	pos := purchaseorders.New(store, cat)
	return New(store, cat, sos, pos)
}

func TestWriteIsIdempotentBySourceResourceAndExternalID(t *testing.T) {
	service := newInboundTestService(t)
	req := WriteRequest{
		SourceSystem: "erp-west",
		Resource:     "items",
		Records:      []map[string]any{{"external_id": "ITEM-001", "external_version": "v1", "sku": "SKU-001", "item_name": "Widget", "upc": "0123456789012"}},
	}
	first, err := service.Write(req, "integration")
	if err != nil {
		t.Fatal(err)
	}
	second, err := service.Write(req, "integration")
	if err != nil {
		t.Fatal(err)
	}
	if first["total_ok"] != 1 || second["total_ok"] != 1 {
		t.Fatalf("unexpected result first=%v second=%v", first, second)
	}
	items, err := service.cat.ListItems()
	if err != nil {
		t.Fatal(err)
	}
	if len(items) != 1 {
		t.Fatalf("idempotent replay created duplicate item: %d", len(items))
	}
}

func TestWriteRejectsSameExternalVersionWithDifferentPayload(t *testing.T) {
	service := newInboundTestService(t)
	base := WriteRequest{SourceSystem: "erp-west", Resource: "items", Records: []map[string]any{{"external_id": "ITEM-002", "external_version": "v1", "sku": "SKU-002", "item_name": "Widget"}}}
	if _, err := service.Write(base, "integration"); err != nil {
		t.Fatal(err)
	}
	changed := WriteRequest{SourceSystem: "erp-west", Resource: "items", Records: []map[string]any{{"external_id": "ITEM-002", "external_version": "v1", "sku": "SKU-002", "item_name": "Different widget"}}}
	result, err := service.Write(changed, "integration")
	if err != nil {
		t.Fatal(err)
	}
	if result["total_err"] != 1 {
		t.Fatalf("expected one idempotency conflict, got %v", result)
	}
}

func TestInboundMapsFullItemMetadata(t *testing.T) {
	service := newInboundTestService(t)
	result, err := service.Write(WriteRequest{SourceSystem: "erp-west", Resource: "items", Records: []map[string]any{{
		"external_id": "ITEM-META-1", "external_version": "1", "sku": "SKU-META-1", "item_name": "Metadata item",
		"upc": "123456789012", "mpn": "MPN-1", "category": "hardware", "description": "Imported item",
		"weight_lbs": 2.5, "reorder_point": 4, "reorder_qty": 12, "is_active": false,
	}}}, "integration")
	if err != nil || result["total_ok"] != 1 {
		t.Fatalf("item inbound failed: result=%v err=%v", result, err)
	}
	items, err := service.cat.ListItems()
	if err != nil {
		t.Fatal(err)
	}
	if len(items) != 1 || items[0].WeightLbs == nil || *items[0].WeightLbs != 2.5 || items[0].ReorderPoint != 4 || items[0].ReorderQty != 12 || items[0].IsActive {
		t.Fatalf("item metadata mapping incomplete: %+v", items)
	}
}

func TestInboundMapsPurchaseOrderHeaderAndLineFields(t *testing.T) {
	service := newInboundTestService(t)
	warehouse, err := service.cat.CreateWarehouse(catalog.WarehouseInput{WarehouseCode: "IN-PO-WH", WarehouseName: "Inbound PO"})
	if err != nil {
		t.Fatal(err)
	}
	item, err := service.cat.CreateItem(catalog.ItemInput{SKU: "IN-PO-SKU", ItemName: "Inbound PO item"})
	if err != nil {
		t.Fatal(err)
	}
	result, err := service.Write(WriteRequest{SourceSystem: "erp-west", Resource: "purchase_orders", Records: []map[string]any{{
		"external_id": "PO-EXT-1", "external_version": "1", "po_number": "PO-IN-1", "po_barcode": "PO-BAR-1",
		"warehouse_id": warehouse.WarehouseID, "vendor_name": "Vendor One", "expected_date": "2026-11-20", "notes": "Inbound header",
		"lines": []any{map[string]any{"item_id": item.ItemID, "quantity_ordered": 5, "unit_cost": 12.75, "line_number": 7}},
	}}}, "integration")
	if err != nil || result["total_ok"] != 1 {
		t.Fatalf("PO inbound failed: result=%v err=%v", result, err)
	}
	orders, err := service.pos.List()
	if err != nil {
		t.Fatal(err)
	}
	if len(orders) != 1 || orders[0].POBarcode != "PO-BAR-1" || orders[0].VendorName == nil || *orders[0].VendorName != "Vendor One" || orders[0].ExpectedDate == nil || *orders[0].ExpectedDate != "2026-11-20" || len(orders[0].Lines) != 1 || orders[0].Lines[0].LineNumber != 7 || orders[0].Lines[0].UnitCost == nil || *orders[0].Lines[0].UnitCost != 12.75 {
		t.Fatalf("purchase order field mapping incomplete: %+v", orders)
	}
}

func TestInboundMapsSalesOrderBarcodeAndRejectsNaturalKeyPayloadDrift(t *testing.T) {
	service := newInboundTestService(t)
	warehouse, err := service.cat.CreateWarehouse(catalog.WarehouseInput{WarehouseCode: "IN-SO-WH", WarehouseName: "Inbound SO"})
	if err != nil {
		t.Fatal(err)
	}
	item, err := service.cat.CreateItem(catalog.ItemInput{SKU: "IN-SO-SKU", ItemName: "Inbound SO item"})
	if err != nil {
		t.Fatal(err)
	}
	base := map[string]any{"so_number": "SO-IN-1", "so_barcode": "SO-BAR-1", "warehouse_id": warehouse.WarehouseID, "customer_name": "Customer", "notes": "Imported order", "lines": []any{map[string]any{"item_id": item.ItemID, "quantity": 3}}}
	if _, err := service.writeSO(base, "integration"); err != nil {
		t.Fatal(err)
	}
	orders, err := service.sos.List()
	if err != nil {
		t.Fatal(err)
	}
	if len(orders) != 1 || orders[0].SOBarcode != "SO-BAR-1" || orders[0].CustomerName != "Customer" || orders[0].Notes != "Imported order" {
		t.Fatalf("sales order field mapping incomplete: %+v", orders)
	}
	changed := map[string]any{"so_number": "SO-IN-1", "so_barcode": "SO-BAR-1", "warehouse_id": warehouse.WarehouseID, "customer_name": "Different customer", "notes": "Imported order", "lines": []any{map[string]any{"item_id": item.ItemID, "quantity": 3}}}
	if _, err := service.writeSO(changed, "integration"); err == nil {
		t.Fatal("natural-key recovery accepted a different sales-order header")
	}
}

func TestInboundRequiresExternalVersionForIdempotency(t *testing.T) {
	service := newInboundTestService(t)
	result, err := service.Write(WriteRequest{SourceSystem: "erp-west", Resource: "items", Records: []map[string]any{{"external_id": "ITEM-NO-VERSION", "sku": "SKU-NO-VERSION", "item_name": "No version"}}}, "integration")
	if err != nil {
		t.Fatal(err)
	}
	if result["total_err"] != 1 {
		t.Fatalf("expected missing external_version to be rejected: %v", result)
	}
}
