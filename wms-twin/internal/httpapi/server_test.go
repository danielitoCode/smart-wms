package httpapi

import (
	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
	"github.com/yecharlot/PrismaTec-Core/core"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestHealthIsPublicAndRecordsRequireToken(t *testing.T) {
	node, err := core.NewNode(core.Config{DataDir: t.TempDir(), Name: "wms-http-test"})
	if err != nil {
		t.Fatal(err)
	}
	handler := New(node, corestore.New(node.Organisms(), string(node.ID())), "test-secret").Handler()
	health := httptest.NewRecorder()
	handler.ServeHTTP(health, httptest.NewRequest(http.MethodGet, "/api/health", nil))
	if health.Code != 200 {
		t.Fatalf("health status %d", health.Code)
	}
	unauth := httptest.NewRecorder()
	handler.ServeHTTP(unauth, httptest.NewRequest(http.MethodGet, "/api/twin/records/warehouses", nil))
	if unauth.Code != 401 {
		t.Fatalf("records status %d", unauth.Code)
	}
	bare := httptest.NewRecorder()
	bareReq := httptest.NewRequest(http.MethodGet, "/api/twin/records/warehouses", nil)
	bareReq.Header.Set("Authorization", "test-secret")
	handler.ServeHTTP(bare, bareReq)
	if bare.Code != 401 {
		t.Fatalf("bare token status %d", bare.Code)
	}
	req := httptest.NewRequest(http.MethodPost, "/api/twin/records/warehouses", strings.NewReader(`{"warehouse_code":"WH-01"}`))
	req.Header.Set("Authorization", "Bearer test-secret")
	req.Header.Set("Content-Type", "application/json")
	created := httptest.NewRecorder()
	handler.ServeHTTP(created, req)
	if created.Code != 201 {
		t.Fatalf("create status %d: %s", created.Code, created.Body.String())
	}
}
