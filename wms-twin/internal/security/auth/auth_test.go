package auth

import (
	"strings"
	"testing"
	"time"
)

func validClaims(now time.Time) Claims {
	return Claims{
		UserID: 7, Username: "operator", Role: "USER",
		WarehouseIDs: []int64{2, 4}, IssuedAt: now.Unix(),
		JTI:       "f8a6b2e5-4a7c-4df0-9f62-6a4e4a3e22c1",
		ExpiresAt: now.Add(TokenLifetime).Unix(),
	}
}

func TestJWTMatchesOriginalWMSClaimsAndRoundTrips(t *testing.T) {
	now := time.Date(2026, 11, 10, 20, 0, 0, 0, time.UTC)
	secret := []byte(strings.Repeat("s", 32))
	want := validClaims(now)
	token, err := Sign(want, secret)
	if err != nil {
		t.Fatal(err)
	}
	got, err := Verify(token, secret, now.Add(time.Minute))
	if err != nil {
		t.Fatal(err)
	}
	if got.UserID != want.UserID || got.Username != want.Username ||
		got.Role != want.Role || got.JTI != want.JTI ||
		got.ExpiresAt != want.ExpiresAt || len(got.WarehouseIDs) != 2 ||
		got.WarehouseIDs[1] != 4 {
		t.Fatalf("claims mismatch: got %#v want %#v", got, want)
	}
}

func TestJWTRejectsExpiredTamperedAndWeakSecret(t *testing.T) {
	now := time.Date(2026, 11, 10, 20, 0, 0, 0, time.UTC)
	secret := []byte(strings.Repeat("s", 32))
	token, err := Sign(validClaims(now), secret)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := Verify(token, secret, now.Add(TokenLifetime)); err != ErrExpiredToken {
		t.Fatalf("expected expired token, got %v", err)
	}
	parts := strings.Split(token, ".")
	parts[1] = parts[1][:len(parts[1])-1] + "A"
	if _, err := Verify(strings.Join(parts, "."), secret, now); err == nil {
		t.Fatal("tampered token was accepted")
	}
	if _, err := Sign(validClaims(now), []byte("short")); err != ErrInvalidSecret {
		t.Fatalf("expected weak secret rejection, got %v", err)
	}
}

func TestJWTRejectsNonHS256Algorithm(t *testing.T) {
	now := time.Date(2026, 11, 10, 20, 0, 0, 0, time.UTC)
	secret := []byte(strings.Repeat("s", 32))
	token, err := Sign(validClaims(now), secret)
	if err != nil {
		t.Fatal(err)
	}
	parts := strings.Split(token, ".")
	parts[0] = "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0"
	unsigned := strings.Join(parts[:2], ".")
	_ = unsigned
	if _, err := Verify(strings.Join(parts, "."), secret, now); err == nil {
		t.Fatal("non-HS256 token was accepted")
	}
}

func TestCSRFDoubleSubmit(t *testing.T) {
	token, err := NewCSRFToken()
	if err != nil {
		t.Fatal(err)
	}
	if len(token) < 40 || !MatchCSRF(token, token) {
		t.Fatal("generated CSRF token did not match itself")
	}
	if MatchCSRF(token, "") || MatchCSRF(token, token+"x") || MatchCSRF("other", token) {
		t.Fatal("mismatched CSRF token was accepted")
	}
}

func TestPasswordPolicy(t *testing.T) {
	cases := []struct{ input, want string }{
		{" admin ", "Password cannot be 'admin'"},
		{"short1", "Password must be at least 8 characters"},
		{"12345678", "Password must contain at least one letter"},
		{"abcdefgh", "Password must contain at least one digit"},
		{"Abcdefg1", ""},
	}
	for _, tc := range cases {
		if got := ValidatePassword(tc.input); got != tc.want {
			t.Errorf("ValidatePassword(%q) = %q, want %q", tc.input, got, tc.want)
		}
	}
}
