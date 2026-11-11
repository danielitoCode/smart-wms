package httpapi

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"
)

func TestAdminPurchaseOrderRoutes(t *testing.T) {
	_, handler, _ := newAuthFixture(t, 5, false, "ADMIN", nil)
	token, _ := loginForTest(t, handler, "Operator123")
	wh := catalogRequest(t, handler, http.MethodPost, "/api/admin/warehouses", `{"warehouse_code":"WH-PO","warehouse_name":"PO Warehouse"}`, token)
	if wh.Code != 201 {
		t.Fatalf("warehouse %d: %s", wh.Code, wh.Body.String())
	}
	var whBody map[string]any
	_ = json.Unmarshal(wh.Body.Bytes(), &whBody)
	warehouseID := int64(whBody["warehouse_id"].(float64))
	item := catalogRequest(t, handler, http.MethodPost, "/api/admin/items", `{"sku":"SKU-PO","item_name":"PO Item"}`, token)
	if item.Code != 201 {
		t.Fatalf("item %d: %s", item.Code, item.Body.String())
	}
	var itemBody map[string]any
	_ = json.Unmarshal(item.Body.Bytes(), &itemBody)
	itemID := int64(itemBody["item_id"].(float64))
	created := catalogRequest(t, handler, http.MethodPost, "/api/admin/purchase-orders", `{"po_number":"PO-HTTP","warehouse_id":`+jsonNumber(warehouseID)+`,"vendor_name":"Supplier","lines":[{"item_id":`+jsonNumber(itemID)+`,"quantity_ordered":10}]}`, token)
	if created.Code != 201 || !strings.Contains(created.Body.String(), `"po_number":"PO-HTTP"`) {
		t.Fatalf("PO create %d: %s", created.Code, created.Body.String())
	}
	var envelope map[string]any
	_ = json.Unmarshal(created.Body.Bytes(), &envelope)
	po := envelope["purchase_order"].(map[string]any)
	poID := int64(po["po_id"].(float64))
	list := catalogRequest(t, handler, http.MethodGet, "/api/admin/purchase-orders?q=PO-HTTP", "", token)
	if list.Code != 200 || !strings.Contains(list.Body.String(), `"PO-HTTP"`) {
		t.Fatalf("PO list %d: %s", list.Code, list.Body.String())
	}
	detail := catalogRequest(t, handler, http.MethodGet, "/api/admin/purchase-orders/"+jsonNumber(poID), "", token)
	if detail.Code != 200 || !strings.Contains(detail.Body.String(), `"SKU-PO"`) {
		t.Fatalf("PO detail %d: %s", detail.Code, detail.Body.String())
	}
	closed := catalogRequest(t, handler, http.MethodPost, "/api/admin/purchase-orders/"+jsonNumber(poID)+"/close", "", token)
	if closed.Code != 200 {
		t.Fatalf("PO close %d: %s", closed.Code, closed.Body.String())
	}
	reopen := catalogRequest(t, handler, http.MethodPost, "/api/admin/purchase-orders/"+jsonNumber(poID)+"/reopen", "", token)
	if reopen.Code != 200 {
		t.Fatalf("PO reopen %d: %s", reopen.Code, reopen.Body.String())
	}
	update := catalogRequest(t, handler, http.MethodPut, "/api/admin/purchase-orders/"+jsonNumber(poID), `{"vendor_name":"Updated Supplier"}`, token)
	if update.Code != 200 || !strings.Contains(update.Body.String(), `"Updated Supplier"`) {
		t.Fatalf("PO update %d: %s", update.Code, update.Body.String())
	}
}
