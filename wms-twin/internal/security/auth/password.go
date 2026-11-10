package auth

import (
	"strings"
	"unicode"
)

// ValidatePassword mirrors the original WMS password policy and returns the
// same user-facing validation message, or an empty string when valid.
func ValidatePassword(password string) string {
	if strings.ToLower(strings.TrimSpace(password)) == "admin" {
		return "Password cannot be 'admin'"
	}
	if len(password) < 8 {
		return "Password must be at least 8 characters"
	}
	hasLetter, hasDigit := false, false
	for _, r := range password {
		hasLetter = hasLetter || unicode.IsLetter(r)
		hasDigit = hasDigit || unicode.IsDigit(r)
	}
	if !hasLetter {
		return "Password must contain at least one letter"
	}
	if !hasDigit {
		return "Password must contain at least one digit"
	}
	return ""
}
