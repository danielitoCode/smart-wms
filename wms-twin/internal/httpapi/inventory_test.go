package httpapi

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
	"github.com/yecharlot/PrismaTec-Core/core"
)

func TestInventoryLedgerHTTPRequiresBearerAndPersistsMovement(t *testing.T) {
	node, err := core.NewNode(core.Config{DataDir: t.TempDir(), Name: "wms-inventory-http-test"})
	if err != nil {
		t.Fatal(err)
	}
	handler := New(node, corestore.New(node.Organisms()), "secret-token").Handler()

	bareToken := httptest.NewRecorder()
	bareRequest := httptest.NewRequest(http.MethodGet, "/api/twin/inventory/balances", nil)
	bareRequest.Header.Set("Authorization", "secret-token")
	handler.ServeHTTP(bareToken, bareRequest)
	if bareToken.Code != http.StatusUnauthorized {
		t.Fatalf("bare token status = %d, want 401", bareToken.Code)
	}

	request := httptest.NewRequest(http.MethodPost, "/api/twin/inventory/adjust", strings.NewReader(
		`{"operation_id":"seed-1","warehouse_id":1,"bin_id":2,"item_id":3,"delta":9}`,
	))
	request.Header.Set("Authorization", "Bearer secret-token")
	request.Header.Set("Content-Type", "application/json")
	created := httptest.NewRecorder()
	handler.ServeHTTP(created, request)
	if created.Code != http.StatusOK {
		t.Fatalf("adjust status = %d body=%s", created.Code, created.Body.String())
	}

	read := httptest.NewRecorder()
	readRequest := httptest.NewRequest(http.MethodGet, "/api/twin/inventory/balances", nil)
	readRequest.Header.Set("Authorization", "Bearer secret-token")
	handler.ServeHTTP(read, readRequest)
	if read.Code != http.StatusOK || !strings.Contains(read.Body.String(), `"quantity_on_hand":9`) {
		t.Fatalf("balance response = %d %s", read.Code, read.Body.String())
	}

	invalid := httptest.NewRecorder()
	invalidRequest := httptest.NewRequest(http.MethodPost, "/api/twin/inventory/adjust", strings.NewReader(`{"operation_id":"bad","warehouse_id":1,"bin_id":2,"item_id":3,"delta":1,"unknown":true}`))
	invalidRequest.Header.Set("Authorization", "Bearer secret-token")
	handler.ServeHTTP(invalid, invalidRequest)
	if invalid.Code != http.StatusBadRequest {
		t.Fatalf("unknown JSON field status = %d, want 400", invalid.Code)
	}
}
