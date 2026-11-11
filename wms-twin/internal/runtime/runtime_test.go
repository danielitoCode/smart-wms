package runtime

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestRuntimeSeparatesWMSAndAIPHandlers(t *testing.T) {
	app, err := New(Config{
		DataDir:  t.TempDir(),
		NodeName: "runtime-test",
		HTTPAddr: "127.0.0.1:0",
		AIPAddr:  "127.0.0.1:0",
		APIToken: "test-token",
		JWTSecret: strings.Repeat("j",32),
		AllowDemoBootstrap: true,
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
	// Handler values are funcs and cannot be compared with ==.
	// Prove separation by distinct routes each serves.
	wmsOnAIP := httptest.NewRecorder()
	app.AIPHandler().ServeHTTP(wmsOnAIP, httptest.NewRequest(http.MethodGet, "/api/health", nil))
	if wmsOnAIP.Code == http.StatusOK {
		t.Fatal("AIP handler must not serve the WMS /api/health route")
	}
	aipOnWMS := httptest.NewRecorder()
	app.Handler().ServeHTTP(aipOnWMS, httptest.NewRequest(http.MethodGet, "/aip/v1/info", nil))
	if aipOnWMS.Code == http.StatusOK {
		t.Fatal("WMS handler must not serve the AIP /aip/v1/info route")
	}
}

func TestRuntimeRejectsMissingJWTSecret(t *testing.T) {
	_, err := New(Config{DataDir:t.TempDir(),NodeName:"runtime-no-jwt"})
	if err == nil || !strings.Contains(err.Error(),"JWT_SECRET must contain at least 32 characters") {
		t.Fatalf("runtime should reject a missing JWT secret, got %v",err)
	}
}

func TestRuntimeRequiresExplicitIdentityBootstrap(t *testing.T) {
	_, err := New(Config{DataDir:t.TempDir(),NodeName:"runtime-no-identities",JWTSecret:strings.Repeat("j",32)})
	if err == nil || !strings.Contains(err.Error(),"no WMS identities configured") {
		t.Fatalf("runtime should reject an empty identity store without explicit demo opt-in, got %v",err)
	}
}
