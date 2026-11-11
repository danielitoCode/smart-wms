package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
)

func catalogRequest(t *testing.T, handler http.Handler, method, path, body, token string) *httptest.ResponseRecorder {
	t.Helper()
	request := httptest.NewRequest(method, path, strings.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Authorization", "Bearer "+token)
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	return response
}

func TestAdminCatalogWarehouseZoneBinRoutes(t *testing.T) {
	_, handler, _ := newAuthFixture(t, 5, false, "ADMIN", nil)
	token, _ := loginForTest(t, handler, "Operator123")
	createdWarehouse := catalogRequest(t, handler, http.MethodPost, "/api/admin/warehouses", `{"warehouse_code":"WH-01","warehouse_name":"Main","address":"Street"}`, token)
	if createdWarehouse.Code != http.StatusCreated {
		t.Fatalf("warehouse create %d: %s", createdWarehouse.Code, createdWarehouse.Body.String())
	}
	var warehouse map[string]any
	if err := json.Unmarshal(createdWarehouse.Body.Bytes(), &warehouse); err != nil {
		t.Fatal(err)
	}
	warehouseID := int64(warehouse["warehouse_id"].(float64))
	createdZone := catalogRequest(t, handler, http.MethodPost, "/api/admin/zones", `{"warehouse_id":`+jsonNumber(warehouseID)+`,"zone_code":"ST-01","zone_name":"Storage","zone_type":"STORAGE"}`, token)
	if createdZone.Code != http.StatusCreated {
		t.Fatalf("zone create %d: %s", createdZone.Code, createdZone.Body.String())
	}
	var zone map[string]any
	if err := json.Unmarshal(createdZone.Body.Bytes(), &zone); err != nil {
		t.Fatal(err)
	}
	zoneID := int64(zone["zone_id"].(float64))
	createdBin := catalogRequest(t, handler, http.MethodPost, "/api/admin/bins", `{"warehouse_id":`+jsonNumber(warehouseID)+`,"zone_id":`+jsonNumber(zoneID)+`,"bin_code":"A-01","bin_barcode":"BC-01","bin_type":"Pickable"}`, token)
	if createdBin.Code != http.StatusCreated {
		t.Fatalf("bin create %d: %s", createdBin.Code, createdBin.Body.String())
	}
	list := catalogRequest(t, handler, http.MethodGet, "/api/admin/bins?warehouse_id="+jsonNumber(warehouseID), "", token)
	if list.Code != http.StatusOK || !strings.Contains(list.Body.String(), `"bin_code":"A-01"`) {
		t.Fatalf("bin list %d: %s", list.Code, list.Body.String())
	}
	detail := catalogRequest(t, handler, http.MethodGet, "/api/admin/warehouses/"+jsonNumber(warehouseID), "", token)
	if detail.Code != http.StatusOK || !strings.Contains(detail.Body.String(), `"zone_code":"ST-01"`) {
		t.Fatalf("warehouse detail %d: %s", detail.Code, detail.Body.String())
	}
	deleteZone := catalogRequest(t, handler, http.MethodDelete, "/api/admin/zones/"+jsonNumber(zoneID), "", token)
	if deleteZone.Code != http.StatusConflict {
		t.Fatalf("zone dependency status %d: %s", deleteZone.Code, deleteZone.Body.String())
	}
}

func TestAdminCatalogRequiresLoginAndPagePermission(t *testing.T) {
	_, handler, users := newAuthFixture(t, 5, false, "USER", []int64{1})
	if _, err := users.SetPagePermissions(1, []string{"warehouses", "zones"}, nil); err != nil {
		t.Fatal(err)
	}
	unauthorized := httptest.NewRecorder()
	handler.ServeHTTP(unauthorized, httptest.NewRequest(http.MethodGet, "/api/admin/warehouses", nil))
	if unauthorized.Code != http.StatusUnauthorized {
		t.Fatalf("unauthenticated status %d", unauthorized.Code)
	}
	token, _ := loginForTest(t, handler, "Operator123")
	denied := catalogRequest(t, handler, http.MethodPost, "/api/admin/zones", `{"warehouse_id":99,"zone_code":"Z1","zone_name":"Zone","zone_type":"STORAGE"}`, token)
	if denied.Code != http.StatusForbidden {
		t.Fatalf("out-of-scope warehouse status %d: %s", denied.Code, denied.Body.String())
	}
}

func jsonNumber(value int64) string { return strconv.FormatInt(value, 10) }
