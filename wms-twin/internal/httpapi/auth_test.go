package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/identity"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
	"github.com/yecharlot/PrismaTec-Core/core"
)

func newAuthFixture(t *testing.T, maxAttempts int, mustChange bool, role string, warehouseIDs []int64) (*Server, http.Handler, *identity.Repository) {
	t.Helper()
	node, err := core.NewNode(core.Config{DataDir: t.TempDir(), Name: "wms-auth-http-test"})
	if err != nil {
		t.Fatal(err)
	}
	store := corestore.New(node.Organisms(), string(node.ID()))
	users := identity.New(store)
	user, err := users.CreateWithPassword(identity.User{
		Username: "operator", FullName: "WMS Operator", Role: role,
		WarehouseIDs: warehouseIDs, AllowedFunctions: []string{"receive", "pick"},
		AllowedPages: []string{"warehouses"}, AllowedOverrides: []string{"so-full-edit"},
		IsActive: true, MustChangePassword: mustChange,
	}, "Operator123")
	if err != nil {
		t.Fatal(err)
	}
	if user.UserID != 1 {
		t.Fatalf("expected first user ID 1, got %d", user.UserID)
	}
	server := NewWithIdentity(node, store, "technical-token", users, []byte(strings.Repeat("j", 32)), maxAttempts, 15*time.Minute, true)
	return server, server.Handler(), users
}

func loginForTest(t *testing.T, handler http.Handler, password string) (string, []*http.Cookie) {
	t.Helper()
	request := httptest.NewRequest(http.MethodPost, "/api/auth/login", strings.NewReader("{\"username\":\"operator\",\"password\":\""+password+"\"}"))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	if response.Code != http.StatusOK {
		t.Fatalf("login status %d: %s", response.Code, response.Body.String())
	}
	var body map[string]any
	if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	token, _ := body["token"].(string)
	if token == "" {
		t.Fatal("login did not return a token")
	}
	return token, response.Result().Cookies()
}

func TestHTTPAuthLoginMeCookieCSRFAndPasswordRotation(t *testing.T) {
	_, handler, _ := newAuthFixture(t, 5, false, "USER", []int64{1, 2})
	token, cookies := loginForTest(t, handler, "Operator123")
	var authCookie, csrfCookie *http.Cookie
	for _, cookie := range cookies {
		switch cookie.Name {
		case authCookieName:
			authCookie = cookie
		case csrfCookieName:
			csrfCookie = cookie
		}
	}
	if authCookie == nil || csrfCookie == nil || !authCookie.HttpOnly || csrfCookie.HttpOnly ||
		authCookie.SameSite != http.SameSiteLaxMode || authCookie.MaxAge != 28800 {
		t.Fatalf("auth cookies do not match the WMS contract: %#v %#v", authCookie, csrfCookie)
	}

	meRequest := httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
	meRequest.AddCookie(authCookie)
	meResponse := httptest.NewRecorder()
	handler.ServeHTTP(meResponse, meRequest)
	if meResponse.Code != http.StatusOK {
		t.Fatalf("me status %d: %s", meResponse.Code, meResponse.Body.String())
	}
	var me map[string]any
	if err := json.Unmarshal(meResponse.Body.Bytes(), &me); err != nil {
		t.Fatal(err)
	}
	if me["username"] != "operator" || me["role"] != "USER" || me["require_packing"] != true {
		t.Fatalf("unexpected /me response: %#v", me)
	}

	missingCSRF := httptest.NewRequest(http.MethodPost, "/api/auth/change-password", strings.NewReader("{\"current_password\":\"Operator123\",\"new_password\":\"NewOperator123\"}"))
	missingCSRF.AddCookie(authCookie)
	missingCSRF.Header.Set("Content-Type", "application/json")
	missingResponse := httptest.NewRecorder()
	handler.ServeHTTP(missingResponse, missingCSRF)
	if missingResponse.Code != http.StatusForbidden {
		t.Fatalf("missing CSRF status %d", missingResponse.Code)
	}

	time.Sleep(1100 * time.Millisecond)
	change := httptest.NewRequest(http.MethodPost, "/api/auth/change-password", strings.NewReader("{\"current_password\":\"Operator123\",\"new_password\":\"NewOperator123\"}"))
	change.AddCookie(authCookie)
	change.AddCookie(csrfCookie)
	change.Header.Set("X-CSRF-Token", csrfCookie.Value)
	change.Header.Set("Content-Type", "application/json")
	changeResponse := httptest.NewRecorder()
	handler.ServeHTTP(changeResponse, change)
	if changeResponse.Code != http.StatusOK {
		t.Fatalf("change password status %d: %s", changeResponse.Code, changeResponse.Body.String())
	}

	oldTokenRequest := httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
	oldTokenRequest.Header.Set("Authorization", "Bearer "+token)
	oldTokenResponse := httptest.NewRecorder()
	handler.ServeHTTP(oldTokenResponse, oldTokenRequest)
	if oldTokenResponse.Code != http.StatusUnauthorized || !strings.Contains(oldTokenResponse.Body.String(), "Token invalidated by password change") {
		t.Fatalf("old token was not invalidated: %d %s", oldTokenResponse.Code, oldTokenResponse.Body.String())
	}
	newToken, _ := loginForTest(t, handler, "NewOperator123")
	if newToken == "" {
		t.Fatal("new password did not produce a session")
	}
}

func TestHTTPAuthPersistentLockout(t *testing.T) {
	_, handler, _ := newAuthFixture(t, 2, false, "USER", []int64{1})
	for i := 0; i < 2; i++ {
		request := httptest.NewRequest(http.MethodPost, "/api/auth/login", strings.NewReader("{\"username\":\"operator\",\"password\":\"wrong\"}"))
		request.Header.Set("Content-Type", "application/json")
		response := httptest.NewRecorder()
		handler.ServeHTTP(response, request)
		expected := http.StatusUnauthorized
		if i == 1 {
			expected = http.StatusTooManyRequests
		}
		if response.Code != expected {
			t.Fatalf("attempt %d status %d, want %d: %s", i+1, response.Code, expected, response.Body.String())
		}
	}
	request := httptest.NewRequest(http.MethodPost, "/api/auth/login", strings.NewReader("{\"username\":\"operator\",\"password\":\"Operator123\"}"))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	if response.Code != http.StatusTooManyRequests {
		t.Fatalf("locked account accepted login: %d", response.Code)
	}
}

func TestForcedPasswordAndWarehouseScopeMiddleware(t *testing.T) {
	server, _, _ := newAuthFixture(t, 5, true, "USER", []int64{1})
	token, _ := loginForTest(t, server.Handler(), "Operator123")
	protected := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	handler := http.NewServeMux()
	handler.Handle("/api/protected", server.RequireAuth(protected))
	request := httptest.NewRequest(http.MethodGet, "/api/protected", nil)
	request.Header.Set("Authorization", "Bearer "+token)
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	if response.Code != http.StatusForbidden || !strings.Contains(response.Body.String(), "password_change_required") {
		t.Fatalf("forced password gate failed: %d %s", response.Code, response.Body.String())
	}

	warehouseServer, _, _ := newAuthFixture(t, 5, false, "USER", []int64{1})
	warehouseToken, _ := loginForTest(t, warehouseServer.Handler(), "Operator123")
	warehouseMux := http.NewServeMux()
	warehouseMux.Handle("/api/warehouses/", warehouseServer.RequireAuth(protected))
	mismatch := httptest.NewRequest(http.MethodGet, "/api/warehouses/1?warehouse_id=2", nil)
	mismatch.Header.Set("Authorization", "Bearer "+warehouseToken)
	mismatchResponse := httptest.NewRecorder()
	warehouseMux.ServeHTTP(mismatchResponse, mismatch)
	if mismatchResponse.Code != http.StatusBadRequest {
		t.Fatalf("warehouse mismatch status %d", mismatchResponse.Code)
	}
	denied := httptest.NewRequest(http.MethodGet, "/api/warehouses/2", nil)
	denied.Header.Set("Authorization", "Bearer "+warehouseToken)
	deniedResponse := httptest.NewRecorder()
	warehouseMux.ServeHTTP(deniedResponse, denied)
	if deniedResponse.Code != http.StatusForbidden {
		t.Fatalf("warehouse scope status %d", deniedResponse.Code)
	}
}
