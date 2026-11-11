package httpapi

import (
	"encoding/json"
	"net/http"
	"testing"
)

func TestAdminExtendedChannelsAndWarehousesList(t *testing.T) {
	_, handler, _ := newAuthFixture(t, 5, false, "ADMIN", nil)
	token, _ := loginForTest(t, handler, "Operator123")

	create := catalogRequest(t, handler, http.MethodPost, "/api/admin/channels", `{"name":"demo-channel"}`, token)
	if create.Code != http.StatusCreated && create.Code != http.StatusOK {
		t.Fatalf("create channel status=%d body=%s", create.Code, create.Body.String())
	}
	list := catalogRequest(t, handler, http.MethodGet, "/api/admin/channels", "", token)
	if list.Code != http.StatusOK {
		t.Fatalf("list channels status=%d body=%s", list.Code, list.Body.String())
	}
	var body map[string]any
	if err := json.Unmarshal(list.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body["total"] == nil {
		t.Fatalf("expected total in channels list: %v", body)
	}
	dash := catalogRequest(t, handler, http.MethodGet, "/api/admin/dashboard", "", token)
	if dash.Code != http.StatusOK {
		t.Fatalf("dashboard status=%d body=%s", dash.Code, dash.Body.String())
	}
	wh := catalogRequest(t, handler, http.MethodGet, "/api/warehouses/list", "", token)
	if wh.Code != http.StatusOK {
		t.Fatalf("warehouses list status=%d body=%s", wh.Code, wh.Body.String())
	}
	scope := catalogRequest(t, handler, http.MethodGet, "/api/admin/scope-catalog", "", token)
	if scope.Code != http.StatusOK {
		t.Fatalf("scope-catalog status=%d body=%s", scope.Code, scope.Body.String())
	}
	v1 := catalogRequest(t, handler, http.MethodGet, "/api/v1/dashboard/productivity", "", token)
	if v1.Code != http.StatusOK {
		t.Fatalf("v1 dashboard status=%d body=%s", v1.Code, v1.Body.String())
	}
}
