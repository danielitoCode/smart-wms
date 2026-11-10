package httpapi

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
	"github.com/yecharlot/PrismaTec-Core/core"
)

func TestHealthIsPublicAndRecordsRequireToken(t *testing.T) {
	node, err := core.NewNode(core.Config{DataDir: t.TempDir(), Name: "wms-http-test"})
	if err != nil {
		t.Fatal(err)
	}
	server := New(node, corestore.New(node.Organisms()), "test-secret")
	handler := server.Handler()

	health := httptest.NewRecorder()
	handler.ServeHTTP(health, httptest.NewRequest(http.MethodGet, "/api/health", nil))
	if health.Code != http.StatusOK {
		t.Fatalf("health status = %d", health.Code)
	}
	if health.Body.String() != "{\"service\":\"sentry-wms\",\"status\":\"ok\"}\n" {
		t.Fatalf("health response changed: %s", health.Body.String())
	}

	unauthorized := httptest.NewRecorder()
	handler.ServeHTTP(unauthorized, httptest.NewRequest(http.MethodGet, "/api/twin/records/warehouses", nil))
	if unauthorized.Code != http.StatusUnauthorized {
		t.Fatalf("records status = %d", unauthorized.Code)
	}

	request := httptest.NewRequest(http.MethodPost, "/api/twin/records/warehouses", strings.NewReader(`{"warehouse_code":"WH-01"}`))
	request.Header.Set("Authorization", "Bearer test-secret")
	request.Header.Set("Content-Type", "application/json")
	created := httptest.NewRecorder()
	handler.ServeHTTP(created, request)
	if created.Code != http.StatusCreated {
		t.Fatalf("create status = %d body=%s", created.Code, created.Body.String())
	}
}
