package runtime

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRuntimeSeparatesWMSAndAIPHandlers(t *testing.T) {
	app, err := New(Config{
		DataDir:  t.TempDir(),
		NodeName: "runtime-test",
		HTTPAddr: "127.0.0.1:0",
		AIPAddr:  "127.0.0.1:0",
		APIToken: "test-token",
	})
	if err != nil {
		t.Fatal(err)
	}
	defer app.Close()

	wmsHealth := httptest.NewRecorder()
	app.Handler().ServeHTTP(wmsHealth, httptest.NewRequest(http.MethodGet, "/api/health", nil))
	if wmsHealth.Code != http.StatusOK {
		t.Fatalf("WMS health status = %d", wmsHealth.Code)
	}
	aipInfo := httptest.NewRecorder()
	app.AIPHandler().ServeHTTP(aipInfo, httptest.NewRequest(http.MethodGet, "/aip/v1/info", nil))
	if aipInfo.Code != http.StatusOK {
		t.Fatalf("AIP info status = %d body=%s", aipInfo.Code, aipInfo.Body.String())
	}
	if app.Handler() == app.AIPHandler() {
		t.Fatal("WMS and AIP handlers must be separate")
	}
}
