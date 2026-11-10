package auth

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"fmt"
)

const csrfTokenBytes = 32

// NewCSRFToken creates a cryptographically random token for double-submit
// cookie protection. The caller must issue it in a readable SameSite cookie.
func NewCSRFToken() (string, error) {
	raw := make([]byte, csrfTokenBytes)
	if _, err := rand.Read(raw); err != nil {
		return "", fmt.Errorf("generate CSRF token: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(raw), nil
}

// MatchCSRF compares the header and cookie values without content-dependent
// timing. Empty values never authenticate a request.
func MatchCSRF(header, cookie string) bool {
	if header == "" || cookie == "" || len(header) != len(cookie) {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(header), []byte(cookie)) == 1
}
