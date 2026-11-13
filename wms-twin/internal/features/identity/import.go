package identity

import (
	"encoding/json"
	"fmt"
	"time"
)

// ImportJSON accepts an export containing bcrypt hashes, never plaintext
// passwords. Import is idempotent so a partially completed import can resume.
func (r *Repository) ImportJSON(data []byte) error {
	var users []User
	if err := json.Unmarshal(data, &users); err != nil {
		return fmt.Errorf("decode identity export: %w", err)
	}
	return r.Import(users)
}

// Import never overwrites an existing user. Matching IDs are skipped, new
// IDs are added, and username collisions or duplicate input rows are rejected.
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
	byID := make(map[int64]User, len(existing))
	byName := make(map[string]int64, len(existing))
	for _, user := range existing {
		byID[user.UserID] = user
		byName[user.Username] = user.UserID
	}
	seenIDs := make(map[int64]struct{}, len(users))
	seenNames := make(map[string]struct{}, len(users))
	pending := make([]User, 0, len(users))
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
		if _, exists := byID[user.UserID]; exists {
			continue
		}
		if existingID, exists := byName[user.Username]; exists {
			return fmt.Errorf("%w: username belongs to user_id %d", ErrDuplicateUsername, existingID)
		}
		byID[user.UserID] = user
		byName[user.Username] = user.UserID
		pending = append(pending, user)
	}
	for _, user := range pending {
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
