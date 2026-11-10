package identity

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

var ErrAlreadyInitialized = errors.New("identity repository already contains users")

// ImportJSON accepts an export containing bcrypt hashes, never plaintext
// passwords. It refuses to merge into an initialized identity store.
func (r *Repository) ImportJSON(data []byte) error {
	var users []User
	if err := json.Unmarshal(data, &users); err != nil {
		return fmt.Errorf("decode identity export: %w", err)
	}
	return r.Import(users)
}

func (r *Repository) Import(users []User) error {
	if len(users) == 0 {
		return fmt.Errorf("%w: export is empty", ErrInvalidUser)
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	existing, err := r.listLocked()
	if err != nil {
		return err
	}
	if len(existing) != 0 {
		return ErrAlreadyInitialized
	}
	seenIDs := make(map[int64]struct{}, len(users))
	seenNames := make(map[string]struct{}, len(users))
	normalized := make([]User, 0, len(users))
	for _, user := range users {
		user = normalizeUser(user)
		if user.CreatedAt.IsZero() {
			user.CreatedAt = time.Now().UTC()
		}
		if err := validateUser(user); err != nil {
			return err
		}
		if _, exists := seenIDs[user.UserID]; exists {
			return fmt.Errorf("%w: duplicate user_id %d in import", ErrInvalidUser, user.UserID)
		}
		if _, exists := seenNames[user.Username]; exists {
			return fmt.Errorf("%w: duplicate username in import", ErrDuplicateUsername)
		}
		seenIDs[user.UserID] = struct{}{}
		seenNames[user.Username] = struct{}{}
		normalized = append(normalized, user)
	}
	for _, user := range normalized {
		if err := r.persistLocked(user); err != nil {
			return fmt.Errorf("import user %d (%s): %w", user.UserID, user.Username, err)
		}
	}
	return nil
}

// ValidateExportFileMode prevents importing an identity export readable by
// group/other users. The caller supplies the file permission bits.
func ValidateExportFileMode(mode uint32) error {
	if mode&0077 != 0 {
		return fmt.Errorf("identity export permissions must be 0600 or stricter")
	}
	return nil
}

func ValidateImportedUsername(username string) bool {
	return strings.TrimSpace(username) != "" && normalizeUsername(username) == username
}
