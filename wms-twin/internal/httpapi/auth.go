package httpapi

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/features/identity"
	securityauth "github.com/danielitoCode/smart-wms/wms-twin/internal/security/auth"
)

const (
	authCookieName = "sentry_auth"
	csrfCookieName = "sentry_csrf"
	csrfHeaderName = "X-CSRF-Token"
)

var allFunctions = []string{"receive", "putaway", "pick", "pack", "ship", "count", "transfer"}
var allPageKeys = []string{
	"dashboard", "inventory", "cycle-counts", "count-approvals",
	"purchase-orders", "receiving", "putaway", "sales-orders", "backorders",
	"fraud", "picking-tickets", "picking-batches", "items", "vendors",
	"adjustments", "inter-warehouse-transfers", "transfer-orders",
	"warehouses", "bins", "zones", "preferred-bins", "users", "api-tokens",
	"inbound", "consumer-groups", "channels", "webhooks", "notifications",
	"audit-log", "imports", "integrations", "settings",
}
var allOverrideKeys = []string{"so-full-edit"}

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}
type changePasswordRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}
type authContextKey struct{}

func (s *Server) authRoute(w http.ResponseWriter, r *http.Request) {
	switch strings.TrimPrefix(r.URL.Path, "/api/auth/") {
	case "login":
		s.login(w, r)
	case "logout":
		s.logout(w, r)
	case "me":
		s.me(w, r)
	case "refresh":
		s.refresh(w, r)
	case "change-password":
		s.changePassword(w, r)
	default:
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "Not found"})
	}
}

func (s *Server) login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	if len(s.jwtSecret) < 32 {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "JWT_SECRET is not configured"})
		return
	}
	var input loginRequest
	if err := decodeAuthJSON(w, r, &input); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	input.Username = strings.TrimSpace(input.Username)
	if input.Username == "" || len([]rune(input.Username)) > 150 ||
		input.Password == "" || len([]rune(input.Password)) > 256 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid login payload"})
		return
	}
	username := strings.ToLower(input.Username)
	clientIP := requestClientIP(r)
	userKey := "user:" + username
	lockKey := "ip:" + clientIP + "|user:" + username
	now := time.Now().UTC()

	locked, remaining, err := s.users.LoginLocked(lockKey, now)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Login rate-limit state unavailable"})
		return
	}
	if locked {
		writeJSON(w, http.StatusTooManyRequests, map[string]string{"error": identity.LoginLockoutMessage(remaining)})
		return
	}
	user, err := s.users.Authenticate(username, input.Password)
	if err != nil {
		if err != identity.ErrInvalidCredentials {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Authentication service unavailable"})
			return
		}
		_, _, userErr := s.users.RecordLoginFailure(userKey, false, s.maxLoginAttempts, s.loginLockout, now)
		lockedNow, _, lockErr := s.users.RecordLoginFailure(lockKey, true, s.maxLoginAttempts, s.loginLockout, now)
		if userErr != nil || lockErr != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Login rate-limit state unavailable"})
			return
		}
		if lockedNow {
			writeJSON(w, http.StatusTooManyRequests, map[string]string{
				"error": fmt.Sprintf("Too many failed login attempts for this account. Locked for %d minutes", int(s.loginLockout/time.Minute)),
			})
			return
		}
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Invalid username or password"})
		return
	}
	if err := s.users.ResetLoginAttempts(userKey); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Could not reset login attempts"})
		return
	}
	if err := s.users.ResetLoginAttempts(lockKey); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Could not reset login attempts"})
		return
	}
	token, err := s.issueToken(user)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Could not issue session"})
		return
	}
	csrf, err := securityauth.NewCSRFToken()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Could not issue CSRF token"})
		return
	}
	setAuthCookies(w, r, token, csrf)
	writeJSON(w, http.StatusOK, map[string]any{"token": token, "user": identity.Public(user)})
}

func (s *Server) logout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	cookie, err := r.Cookie(authCookieName)
	if err != nil || cookie.Value == "" {
		writeJSON(w, http.StatusOK, map[string]string{"message": "logged out"})
		return
	}
	_, verifyErr := securityauth.Verify(cookie.Value, s.jwtSecret, time.Now().UTC())
	if verifyErr == nil {
		csrfCookie, _ := r.Cookie(csrfCookieName)
		if csrfCookie == nil || !securityauth.MatchCSRF(r.Header.Get(csrfHeaderName), csrfCookie.Value) {
			writeJSON(w, http.StatusForbidden, map[string]string{"error": "CSRF token missing or invalid"})
			return
		}
	}
	clearAuthCookies(w, r)
	writeJSON(w, http.StatusOK, map[string]string{"message": "logged out"})
}

func (s *Server) me(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	user, ok := s.authenticatedUser(w, r)
	if !ok {
		return
	}
	functions := nonNilStringList(user.AllowedFunctions)
	if user.Role == "ADMIN" {
		functions = append([]string(nil), allFunctions...)
	}
	if !s.requirePacking {
		functions = removeString(functions, "pack")
	}
	pages := nonNilStringList(user.AllowedPages)
	overrides := nonNilStringList(user.AllowedOverrides)
	if user.Role == "ADMIN" {
		pages = append([]string(nil), allPageKeys...)
		overrides = append([]string(nil), allOverrideKeys...)
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"user_id": user.UserID, "username": user.Username, "full_name": user.FullName,
		"role": user.Role, "warehouse_id": user.WarehouseID,
		"allowed_functions": functions, "allowed_pages": pages,
		"allowed_overrides": overrides, "require_packing": s.requirePacking,
		"must_change_password": user.MustChangePassword,
	})
}

func (s *Server) refresh(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	user, ok := s.authenticatedUser(w, r)
	if !ok {
		return
	}
	token, err := s.issueToken(user)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Could not issue session"})
		return
	}
	csrf, err := securityauth.NewCSRFToken()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Could not issue CSRF token"})
		return
	}
	setAuthCookies(w, r, token, csrf)
	writeJSON(w, http.StatusOK, map[string]string{"token": token})
}

func (s *Server) changePassword(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	user, ok := s.authenticatedUser(w, r)
	if !ok {
		return
	}
	var input changePasswordRequest
	if err := decodeAuthJSON(w, r, &input); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	_, err := s.users.ChangePassword(user.UserID, input.CurrentPassword, input.NewPassword)
	if err != nil {
		switch {
		case err == identity.ErrCurrentPassword:
			writeJSON(w, http.StatusForbidden, map[string]string{"error": "Current password is incorrect"})
		case strings.Contains(err.Error(), "Password"):
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": strings.TrimPrefix(err.Error(), "invalid user: ")})
		default:
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Could not change password"})
		}
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "Password changed"})
}

func (s *Server) authenticatedUser(w http.ResponseWriter, r *http.Request) (identity.User, bool) {
	if len(s.jwtSecret) < 32 {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "JWT_SECRET is not configured"})
		return identity.User{}, false
	}
	token, source := requestSessionToken(r)
	if token == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
		return identity.User{}, false
	}
	if source == "cookie" && isCSRFSensitive(r.Method) {
		csrfCookie, _ := r.Cookie(csrfCookieName)
		if csrfCookie == nil || !securityauth.MatchCSRF(r.Header.Get(csrfHeaderName), csrfCookie.Value) {
			writeJSON(w, http.StatusForbidden, map[string]string{"error": "CSRF token missing or invalid"})
			return identity.User{}, false
		}
	}
	claims, err := securityauth.Verify(token, s.jwtSecret, time.Now().UTC())
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Token expired"})
		return identity.User{}, false
	}
	user, err := s.users.GetByID(claims.UserID)
	if err != nil || !user.IsActive {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
		return identity.User{}, false
	}
	if user.PasswordChangedAt != nil && claims.IssuedAt < user.PasswordChangedAt.Unix() {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Token invalidated by password change"})
		return identity.User{}, false
	}
	if user.MustChangePassword && !forcedChangeAllowed(r.URL.Path) {
		writeJSON(w, http.StatusForbidden, map[string]string{
			"error":   "password_change_required",
			"message": "Admin must change password before accessing other resources",
		})
		return identity.User{}, false
	}
	if user.Role != "ADMIN" && !checkWarehouseScope(w, r, user.WarehouseIDs) {
		return identity.User{}, false
	}
	return user, true
}

func (s *Server) RequireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := s.authenticatedUser(w, r)
		if !ok {
			return
		}
		ctx := context.WithValue(r.Context(), authContextKey{}, user)
		next(w, r.WithContext(ctx))
	}
}

func (s *Server) RequirePagePermission(pageKey string, next http.HandlerFunc) http.HandlerFunc {
	return s.RequireAuth(func(w http.ResponseWriter, r *http.Request) {
		user, ok := r.Context().Value(authContextKey{}).(identity.User)
		if !ok {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
			return
		}
		if user.Role != "ADMIN" && !containsString(user.AllowedPages, pageKey) {
			writeJSON(w, http.StatusForbidden, map[string]string{"error": "Permission denied", "page_key": pageKey})
			return
		}
		next(w, r)
	})
}

func (s *Server) issueToken(user identity.User) (string, error) {
	now := time.Now().UTC()
	jtiBytes := make([]byte, 16)
	if _, err := rand.Read(jtiBytes); err != nil {
		return "", fmt.Errorf("generate token ID: %w", err)
	}
	jtiBytes[6] = (jtiBytes[6] & 0x0f) | 0x40
	jtiBytes[8] = (jtiBytes[8] & 0x3f) | 0x80
	raw := hex.EncodeToString(jtiBytes)
	jti := raw[:8] + "-" + raw[8:12] + "-" + raw[12:16] + "-" + raw[16:20] + "-" + raw[20:]
	claims := securityauth.Claims{
		UserID: user.UserID, Username: user.Username, Role: user.Role,
		WarehouseID: user.WarehouseID, WarehouseIDs: nonNilInt64List(user.WarehouseIDs),
		IssuedAt: now.Unix(), JTI: jti, ExpiresAt: now.Add(securityauth.TokenLifetime).Unix(),
	}
	return securityauth.Sign(claims, s.jwtSecret)
}

func requestSessionToken(r *http.Request) (string, string) {
	header := r.Header.Get("Authorization")
	if strings.HasPrefix(header, "Bearer ") {
		return strings.TrimSpace(strings.TrimPrefix(header, "Bearer ")), "header"
	}
	if cookie, err := r.Cookie(authCookieName); err == nil {
		return cookie.Value, "cookie"
	}
	return "", ""
}

func setAuthCookies(w http.ResponseWriter, r *http.Request, token, csrf string) {
	secure := r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https"
	maxAge := int(securityauth.TokenLifetime.Seconds())
	// HTTP lab behind a same-origin proxy: Lax lets the admin SPA send cookies.
	// HTTPS keeps Strict.
	sameSite := http.SameSiteLaxMode
	if secure {
		sameSite = http.SameSiteStrictMode
	}
	http.SetCookie(w, &http.Cookie{Name: authCookieName, Value: token, Path: "/", MaxAge: maxAge, HttpOnly: true, Secure: secure, SameSite: sameSite})
	http.SetCookie(w, &http.Cookie{Name: csrfCookieName, Value: csrf, Path: "/", MaxAge: maxAge, HttpOnly: false, Secure: secure, SameSite: sameSite})
}

func clearAuthCookies(w http.ResponseWriter, r *http.Request) {
	secure := r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https"
	sameSite := http.SameSiteLaxMode
	if secure {
		sameSite = http.SameSiteStrictMode
	}
	http.SetCookie(w, &http.Cookie{Name: authCookieName, Value: "", Path: "/", MaxAge: -1, HttpOnly: true, Secure: secure, SameSite: sameSite})
	http.SetCookie(w, &http.Cookie{Name: csrfCookieName, Value: "", Path: "/", MaxAge: -1, HttpOnly: false, Secure: secure, SameSite: sameSite})
}

func decodeAuthJSON(w http.ResponseWriter, r *http.Request, target any) error {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	defer r.Body.Close()
	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(target); err != nil {
		return fmt.Errorf("invalid JSON body: %w", err)
	}
	if decoder.Decode(new(any)) != io.EOF {
		return fmt.Errorf("request body must contain one JSON value")
	}
	return nil
}

func requestClientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err == nil && host != "" {
		return host
	}
	if r.RemoteAddr == "" {
		return "unknown"
	}
	return r.RemoteAddr
}

func isCSRFSensitive(method string) bool {
	return method == http.MethodPost || method == http.MethodPut || method == http.MethodPatch || method == http.MethodDelete
}

func forcedChangeAllowed(path string) bool {
	return path == "/api/auth/change-password" || path == "/api/auth/logout" || path == "/api/auth/me"
}

func checkWarehouseScope(w http.ResponseWriter, r *http.Request, allowed []int64) bool {
	type candidate struct {
		source string
		value  string
	}
	var candidates []candidate
	if value, ok := warehouseIDFromPath(r.URL.Path); ok {
		candidates = append(candidates, candidate{"path", value})
	}
	if value := r.URL.Query().Get("warehouse_id"); value != "" {
		candidates = append(candidates, candidate{"query", value})
	}
	if r.Body != nil && strings.Contains(strings.ToLower(r.Header.Get("Content-Type")), "application/json") {
		body, err := io.ReadAll(io.LimitReader(r.Body, (1<<20)+1))
		r.Body = io.NopCloser(bytes.NewReader(body))
		if err == nil && len(body) <= 1<<20 {
			var payload map[string]any
			if json.Unmarshal(body, &payload) == nil && payload["warehouse_id"] != nil {
				candidates = append(candidates, candidate{"body", fmt.Sprint(payload["warehouse_id"])})
			}
		}
	}
	if len(candidates) == 0 {
		return true
	}
	values := make(map[string]int64, len(candidates))
	for _, item := range candidates {
		id, err := strconv.ParseInt(item.value, 10, 64)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid warehouse_id"})
			return false
		}
		values[item.source] = id
	}
	var selected int64
	first := true
	for _, id := range values {
		if first {
			selected = id
			first = false
			continue
		}
		if id != selected {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "warehouse_id mismatch across request", "sources": values})
			return false
		}
	}
	for _, id := range allowed {
		if id == selected {
			return true
		}
	}
	writeJSON(w, http.StatusForbidden, map[string]string{"error": "Access denied for this warehouse"})
	return false
}

func warehouseIDFromPath(path string) (string, bool) {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	for i := 0; i+1 < len(parts); i++ {
		if parts[i] == "warehouses" {
			if _, err := strconv.ParseInt(parts[i+1], 10, 64); err == nil {
				return parts[i+1], true
			}
		}
	}
	return "", false
}

func containsString(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}

func removeString(values []string, target string) []string {
	out := make([]string, 0, len(values))
	for _, value := range values {
		if value != target {
			out = append(out, value)
		}
	}
	return out
}

func nonNilStringList(values []string) []string {
	if values == nil {
		return []string{}
	}
	return values
}

func nonNilInt64List(values []int64) []int64 {
	if values == nil {
		return []int64{}
	}
	return values
}
