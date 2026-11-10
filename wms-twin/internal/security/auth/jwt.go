package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

const (
	Algorithm     = "HS256"
	TokenLifetime = 8 * time.Hour
	MaxTokenSize  = 16 * 1024
	clockSkew     = time.Minute
)

var (
	ErrInvalidSecret = errors.New("JWT secret must contain at least 32 bytes")
	ErrInvalidToken  = errors.New("invalid token")
	ErrExpiredToken  = errors.New("token expired")
)

type Claims struct {
	UserID       int64   `json:"user_id"`
	Username     string  `json:"username"`
	Role         string  `json:"role"`
	WarehouseID  *int64  `json:"warehouse_id"`
	WarehouseIDs []int64 `json:"warehouse_ids"`
	IssuedAt     int64   `json:"iat"`
	JTI          string  `json:"jti"`
	ExpiresAt    int64   `json:"exp"`
}

type header struct {
	Algorithm string `json:"alg"`
	Type      string `json:"typ"`
}

// Sign emits the HS256 JWT shape used by the original WMS. User state must
// still be loaded from persistent storage on every protected request.
func Sign(claims Claims, secret []byte) (string, error) {
	if len(secret) < 32 {
		return "", ErrInvalidSecret
	}
	if err := validateClaims(claims); err != nil {
		return "", err
	}
	if claims.WarehouseIDs == nil {
		claims.WarehouseIDs = []int64{}
	}
	headerJSON, err := json.Marshal(header{Algorithm: Algorithm, Type: "JWT"})
	if err != nil {
		return "", fmt.Errorf("encode JWT header: %w", err)
	}
	payloadJSON, err := json.Marshal(claims)
	if err != nil {
		return "", fmt.Errorf("encode JWT claims: %w", err)
	}
	unsigned := base64.RawURLEncoding.EncodeToString(headerJSON) + "." +
		base64.RawURLEncoding.EncodeToString(payloadJSON)
	mac := hmac.New(sha256.New, secret)
	_, _ = mac.Write([]byte(unsigned))
	signature := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	return unsigned + "." + signature, nil
}

// Verify checks structure, algorithm, signature, lifetime and required claims.
// It deliberately does not authorize the user or trust role/warehouse claims.
func Verify(token string, secret []byte, now time.Time) (Claims, error) {
	if len(secret) < 32 {
		return Claims{}, ErrInvalidSecret
	}
	if token == "" || len(token) > MaxTokenSize {
		return Claims{}, ErrInvalidToken
	}
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return Claims{}, ErrInvalidToken
	}
	headerJSON, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return Claims{}, ErrInvalidToken
	}
	var h header
	if err := json.Unmarshal(headerJSON, &h); err != nil || h.Algorithm != Algorithm || (h.Type != "" && h.Type != "JWT") {
		return Claims{}, ErrInvalidToken
	}
	signature, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil {
		return Claims{}, ErrInvalidToken
	}
	unsigned := parts[0] + "." + parts[1]
	mac := hmac.New(sha256.New, secret)
	_, _ = mac.Write([]byte(unsigned))
	if !hmac.Equal(signature, mac.Sum(nil)) {
		return Claims{}, ErrInvalidToken
	}
	payloadJSON, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return Claims{}, ErrInvalidToken
	}
	var claims Claims
	if err := json.Unmarshal(payloadJSON, &claims); err != nil {
		return Claims{}, ErrInvalidToken
	}
	if err := validateClaims(claims); err != nil {
		return Claims{}, ErrInvalidToken
	}
	unixNow := now.Unix()
	if claims.ExpiresAt <= unixNow {
		return Claims{}, ErrExpiredToken
	}
	if claims.IssuedAt > unixNow+int64(clockSkew.Seconds()) {
		return Claims{}, ErrInvalidToken
	}
	if claims.WarehouseIDs == nil {
		claims.WarehouseIDs = []int64{}
	}
	return claims, nil
}

func validateClaims(claims Claims) error {
	if claims.UserID <= 0 || strings.TrimSpace(claims.Username) == "" ||
		strings.TrimSpace(claims.Role) == "" || strings.TrimSpace(claims.JTI) == "" ||
		claims.IssuedAt <= 0 || claims.ExpiresAt <= claims.IssuedAt ||
		claims.ExpiresAt-claims.IssuedAt > int64(TokenLifetime/time.Second) {
		return ErrInvalidToken
	}
	for _, warehouseID := range claims.WarehouseIDs {
		if warehouseID <= 0 {
			return ErrInvalidToken
		}
	}
	if claims.WarehouseID != nil && *claims.WarehouseID <= 0 {
		return ErrInvalidToken
	}
	return nil
}
