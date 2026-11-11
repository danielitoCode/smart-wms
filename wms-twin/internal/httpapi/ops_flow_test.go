package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestOpsRoutesRequireAuth(t *testing.T) {
	_, handler, _ := newAuthFixture(t, 5, false, "ADMIN", nil)
	paths := []struct {
		method, path string
	}{
		{http.MethodGet, "/api/lookup/item/SKU1"},
		{http.MethodGet, "/api/lookup/bin/BIN1"},
		{http.MethodGet, "/api/receiving/po/PO1"},
		{http.MethodGet, "/api/putaway/pending/1"},
		{http.MethodGet, "/api/picking/active-batch"},
		{http.MethodGet, "/api/packing/order/SO1"},
		{http.MethodGet, "/api/shipping/order/SO1"},
		{http.MethodPost, "/api/transfers/move"},
		{http.MethodGet, "/api/inventory/cycle-count/1"},
	}
	for _, p := range paths {
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, httptest.NewRequest(p.method, p.path, nil))
		if rr.Code != http.StatusUnauthorized && rr.Code != http.StatusForbidden {
			t.Fatalf("%s %s expected 401/403 got %d body=%s", p.method, p.path, rr.Code, rr.Body.String())
		}
	}
}

func TestLookupItemAndBinWithAuth(t *testing.T) {
	_, handler, _ := newAuthFixture(t, 5, false, "ADMIN", nil)
	token, _ := loginForTest(t, handler, "Operator123")

	wh := catalogRequest(t, handler, http.MethodPost, "/api/admin/warehouses",
		`{"warehouse_code":"WH-L","warehouse_name":"Lookup WH"}`, token)
	if wh.Code != http.StatusCreated {
		t.Fatalf("warehouse %d %s", wh.Code, wh.Body.String())
	}
	var warehouse map[string]any
	_ = json.Unmarshal(wh.Body.Bytes(), &warehouse)
	wid := int64(warehouse["warehouse_id"].(float64))

	zone := catalogRequest(t, handler, http.MethodPost, "/api/admin/zones",
		`{"warehouse_id":`+jsonNumber(wid)+`,"zone_code":"Z-L","zone_name":"Zone","zone_type":"STORAGE"}`, token)
	if zone.Code != http.StatusCreated {
		t.Fatalf("zone %d %s", zone.Code, zone.Body.String())
	}
	var z map[string]any
	_ = json.Unmarshal(zone.Body.Bytes(), &z)
	zid := int64(z["zone_id"].(float64))

	bin := catalogRequest(t, handler, http.MethodPost, "/api/admin/bins",
		`{"warehouse_id":`+jsonNumber(wid)+`,"zone_id":`+jsonNumber(zid)+`,"bin_code":"L-01","bin_barcode":"BL-01","bin_type":"Pickable"}`, token)
	if bin.Code != http.StatusCreated {
		t.Fatalf("bin %d %s", bin.Code, bin.Body.String())
	}

	item := catalogRequest(t, handler, http.MethodPost, "/api/admin/items",
		`{"sku":"SKU-LOOKUP","item_name":"Lookup Item"}`, token)
	if item.Code != http.StatusCreated {
		t.Fatalf("item %d %s", item.Code, item.Body.String())
	}

	got := catalogRequest(t, handler, http.MethodGet, "/api/lookup/item/SKU-LOOKUP", "", token)
	if got.Code != http.StatusOK || !strings.Contains(got.Body.String(), "SKU-LOOKUP") {
		t.Fatalf("lookup item %d %s", got.Code, got.Body.String())
	}

	gotBin := catalogRequest(t, handler, http.MethodGet, "/api/lookup/bin/BL-01", "", token)
	if gotBin.Code != http.StatusOK || !strings.Contains(gotBin.Body.String(), "L-01") {
		t.Fatalf("lookup bin %d %s", gotBin.Code, gotBin.Body.String())
	}

	search := catalogRequest(t, handler, http.MethodGet, "/api/lookup/item/search?q=LOOKUP", "", token)
	if search.Code != http.StatusOK {
		t.Fatalf("search %d %s", search.Code, search.Body.String())
	}
}

func TestPickingActiveBatchEmpty(t *testing.T) {
	_, handler, _ := newAuthFixture(t, 5, false, "ADMIN", nil)
	token, _ := loginForTest(t, handler, "Operator123")
	rr := catalogRequest(t, handler, http.MethodGet, "/api/picking/active-batch", "", token)
	if rr.Code != http.StatusOK {
		t.Fatalf("active-batch %d %s", rr.Code, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), `"active":false`) && !strings.Contains(rr.Body.String(), `"active": false`) {
		t.Fatalf("expected active false: %s", rr.Body.String())
	}
}

func TestReceivePutawayFlow(t *testing.T) {
	_, handler, _ := newAuthFixture(t, 5, false, "ADMIN", nil)
	token, _ := loginForTest(t, handler, "Operator123")

	wh := catalogRequest(t, handler, http.MethodPost, "/api/admin/warehouses",
		`{"warehouse_code":"WH-R","warehouse_name":"Recv"}`, token)
	var warehouse map[string]any
	_ = json.Unmarshal(wh.Body.Bytes(), &warehouse)
	wid := int64(warehouse["warehouse_id"].(float64))

	zone := catalogRequest(t, handler, http.MethodPost, "/api/admin/zones",
		`{"warehouse_id":`+jsonNumber(wid)+`,"zone_code":"ZR","zone_name":"Z","zone_type":"STORAGE"}`, token)
	var z map[string]any
	_ = json.Unmarshal(zone.Body.Bytes(), &z)
	zid := int64(z["zone_id"].(float64))

	staging := catalogRequest(t, handler, http.MethodPost, "/api/admin/bins",
		`{"warehouse_id":`+jsonNumber(wid)+`,"zone_id":`+jsonNumber(zid)+`,"bin_code":"ST-1","bin_barcode":"BST","bin_type":"Staging"}`, token)
	pickable := catalogRequest(t, handler, http.MethodPost, "/api/admin/bins",
		`{"warehouse_id":`+jsonNumber(wid)+`,"zone_id":`+jsonNumber(zid)+`,"bin_code":"P-1","bin_barcode":"BP","bin_type":"Pickable"}`, token)
	var stBin, pkBin map[string]any
	_ = json.Unmarshal(staging.Body.Bytes(), &stBin)
	_ = json.Unmarshal(pickable.Body.Bytes(), &pkBin)
	stID := int64(stBin["bin_id"].(float64))
	pkID := int64(pkBin["bin_id"].(float64))

	item := catalogRequest(t, handler, http.MethodPost, "/api/admin/items",
		`{"sku":"SKU-R","item_name":"Recv Item"}`, token)
	var it map[string]any
	_ = json.Unmarshal(item.Body.Bytes(), &it)
	itemID := int64(it["item_id"].(float64))

	po := catalogRequest(t, handler, http.MethodPost, "/api/admin/purchase-orders",
		`{"po_number":"PO-R1","warehouse_id":`+jsonNumber(wid)+`,"lines":[{"item_id":`+jsonNumber(itemID)+`,"quantity_ordered":5}]}`, token)
	if po.Code != http.StatusCreated && po.Code != http.StatusOK {
		t.Fatalf("po create %d %s", po.Code, po.Body.String())
	}
	var poBody map[string]any
	if err := json.Unmarshal(po.Body.Bytes(), &poBody); err != nil {
		t.Fatalf("po json: %v body=%s", err, po.Body.String())
	}
	var poID int64
	if raw, ok := poBody["po_id"]; ok {
		poID = int64(raw.(float64))
	} else if nested, ok := poBody["purchase_order"].(map[string]any); ok {
		poID = int64(nested["po_id"].(float64))
	} else {
		t.Fatalf("po_id missing in %s", po.Body.String())
	}

	lookup := catalogRequest(t, handler, http.MethodGet, "/api/receiving/po/PO-R1", "", token)
	if lookup.Code != http.StatusOK {
		t.Fatalf("po lookup %d %s", lookup.Code, lookup.Body.String())
	}

	recvBody := `{"po_id":` + jsonNumber(poID) + `,"items":[{"item_id":` + jsonNumber(itemID) + `,"quantity":5,"bin_id":` + jsonNumber(stID) + `}]}`
	recv := catalogRequest(t, handler, http.MethodPost, "/api/receiving/receive", recvBody, token)
	if recv.Code != http.StatusOK {
		t.Fatalf("receive %d %s", recv.Code, recv.Body.String())
	}

	pending := catalogRequest(t, handler, http.MethodGet, "/api/putaway/pending/"+jsonNumber(wid), "", token)
	if pending.Code != http.StatusOK {
		t.Fatalf("pending %d %s", pending.Code, pending.Body.String())
	}

	confirm := catalogRequest(t, handler, http.MethodPost, "/api/putaway/confirm",
		`{"item_id":`+jsonNumber(itemID)+`,"from_bin_id":`+jsonNumber(stID)+`,"to_bin_id":`+jsonNumber(pkID)+`,"quantity":5}`, token)
	if confirm.Code != http.StatusOK {
		t.Fatalf("putaway confirm %d %s", confirm.Code, confirm.Body.String())
	}
}

func TestSalesOrderCreateAndPackShip(t *testing.T) {
	_, handler, _ := newAuthFixture(t, 5, false, "ADMIN", nil)
	token, _ := loginForTest(t, handler, "Operator123")

	wh := catalogRequest(t, handler, http.MethodPost, "/api/admin/warehouses",
		`{"warehouse_code":"WH-S","warehouse_name":"Ship"}`, token)
	var warehouse map[string]any
	_ = json.Unmarshal(wh.Body.Bytes(), &warehouse)
	wid := int64(warehouse["warehouse_id"].(float64))

	item := catalogRequest(t, handler, http.MethodPost, "/api/admin/items",
		`{"sku":"SKU-S","item_name":"Ship Item"}`, token)
	var it map[string]any
	_ = json.Unmarshal(item.Body.Bytes(), &it)
	itemID := int64(it["item_id"].(float64))

	so := catalogRequest(t, handler, http.MethodPost, "/api/admin/sales-orders",
		`{"so_number":"SO-1","warehouse_id":`+jsonNumber(wid)+`,"lines":[{"item_id":`+jsonNumber(itemID)+`,"quantity_ordered":2}]}`, token)
	if so.Code != http.StatusCreated && so.Code != http.StatusOK {
		t.Fatalf("so create %d %s", so.Code, so.Body.String())
	}
	var soBody map[string]any
	_ = json.Unmarshal(so.Body.Bytes(), &soBody)
	soID := int64(soBody["so_id"].(float64))

	// mark picked-ish via packing complete path after verify
	verify := catalogRequest(t, handler, http.MethodPost, "/api/packing/verify",
		`{"so_id":`+jsonNumber(soID)+`,"item_id":`+jsonNumber(itemID)+`,"quantity":2}`, token)
	if verify.Code != http.StatusOK {
		t.Fatalf("pack verify %d %s", verify.Code, verify.Body.String())
	}
	complete := catalogRequest(t, handler, http.MethodPost, "/api/packing/complete",
		`{"so_id":`+jsonNumber(soID)+`}`, token)
	if complete.Code != http.StatusOK {
		t.Fatalf("pack complete %d %s", complete.Code, complete.Body.String())
	}
	ship := catalogRequest(t, handler, http.MethodPost, "/api/shipping/fulfill",
		`{"so_id":`+jsonNumber(soID)+`,"carrier":"UPS","tracking_number":"1Z"}`, token)
	if ship.Code != http.StatusOK {
		t.Fatalf("ship %d %s", ship.Code, ship.Body.String())
	}
}

func TestCycleCountCreate(t *testing.T) {
	_, handler, _ := newAuthFixture(t, 5, false, "ADMIN", nil)
	token, _ := loginForTest(t, handler, "Operator123")
	wh := catalogRequest(t, handler, http.MethodPost, "/api/admin/warehouses",
		`{"warehouse_code":"WH-C","warehouse_name":"Count"}`, token)
	var warehouse map[string]any
	_ = json.Unmarshal(wh.Body.Bytes(), &warehouse)
	wid := int64(warehouse["warehouse_id"].(float64))
	cc := catalogRequest(t, handler, http.MethodPost, "/api/inventory/cycle-count/create",
		`{"warehouse_id":`+jsonNumber(wid)+`,"bin_ids":[]}`, token)
	if cc.Code != http.StatusCreated && cc.Code != http.StatusOK {
		t.Fatalf("cycle count %d %s", cc.Code, cc.Body.String())
	}
}

func TestTransferMoveValidation(t *testing.T) {
	_, handler, _ := newAuthFixture(t, 5, false, "ADMIN", nil)
	token, _ := loginForTest(t, handler, "Operator123")
	rr := catalogRequest(t, handler, http.MethodPost, "/api/transfers/move",
		`{"item_id":1,"from_bin_id":1,"to_bin_id":1,"quantity":1}`, token)
	// same bin should fail validation
	if rr.Code == http.StatusOK {
		t.Fatalf("expected failure for same bin, got ok: %s", rr.Body.String())
	}
}
