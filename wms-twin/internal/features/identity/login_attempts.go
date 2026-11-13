package identity

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"time"
)

const loginAttemptKind = "login-attempts"

type LoginAttempt struct {
	Attempts    int        `json:"attempts"`
	LockedUntil *time.Time `json:"locked_until,omitempty"`
	LastAttempt time.Time  `json:"last_attempt"`
}

func (r *Repository) LoginLocked(key string, now time.Time) (bool, int, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	attempt, found, err := r.getLoginAttemptLocked(key)
	if err != nil || !found {
		return false, 0, err
	}
	if attempt.LockedUntil == nil || !attempt.LockedUntil.After(now) {
		return false, 0, nil
	}
	remaining := int(attempt.LockedUntil.Sub(now).Seconds())
	if remaining < 1 {
		remaining = 1
	}
	return true, remaining, nil
}

func (r *Repository) RecordLoginFailure(key string, allowLockout bool, maxAttempts int, lockout time.Duration, now time.Time) (bool, int, error) {
	if maxAttempts < 1 || lockout <= 0 {
		return false, 0, errors.New("login lockout policy is invalid")
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	attempt, found, err := r.getLoginAttemptLocked(key)
	if err != nil {
		return false, 0, err
	}
	if !found || (attempt.LockedUntil != nil && !attempt.LockedUntil.After(now)) {
		attempt = LoginAttempt{}
	}
	attempt.Attempts++
	attempt.LastAttempt = now.UTC()
	if allowLockout && attempt.Attempts >= maxAttempts {
		until := now.Add(lockout).UTC()
		attempt.LockedUntil = &until
		attempt.Attempts = 0
		if err := r.saveLoginAttemptLocked(key, attempt); err != nil {
			return false, 0, err
		}
		return true, 0, nil
	}
	if err := r.saveLoginAttemptLocked(key, attempt); err != nil {
		return false, 0, err
	}
	remaining := maxAttempts - attempt.Attempts
	if remaining < 0 {
		remaining = 0
	}
	return false, remaining, nil
}

func (r *Repository) ResetLoginAttempts(key string) error {
	if r.store == nil {
		return errors.New("identity repository has no Core store")
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	id := loginAttemptID(key)
	_, found, err := r.store.Get(loginAttemptKind, id)
	if err != nil || !found {
		return err
	}
	return r.store.Delete(loginAttemptKind, id)
}

func (r *Repository) getLoginAttemptLocked(key string) (LoginAttempt, bool, error) {
	if r.store == nil {
		return LoginAttempt{}, false, errors.New("identity repository has no Core store")
	}
	record, found, err := r.store.Get(loginAttemptKind, loginAttemptID(key))
	if err != nil || !found {
		return LoginAttempt{}, found, err
	}
	var attempt LoginAttempt
	if err := json.Unmarshal(record.Data, &attempt); err != nil {
		return LoginAttempt{}, false, fmt.Errorf("decode login attempt: %w", err)
	}
	if attempt.Attempts < 0 {
		return LoginAttempt{}, false, fmt.Errorf("persisted login attempt count is invalid")
	}
	return attempt, true, nil
}

func (r *Repository) saveLoginAttemptLocked(key string, attempt LoginAttempt) error {
	if r.store == nil {
		return errors.New("identity repository has no Core store")
	}
	data, err := json.Marshal(attempt)
	if err != nil {
		return err
	}
	_, err = r.store.Put(loginAttemptKind, loginAttemptID(key), data)
	if err != nil {
		return fmt.Errorf("persist login attempt: %w", err)
	}
	return nil
}

func loginAttemptID(key string) string {
	sum := sha256.Sum256([]byte(key))
	return hex.EncodeToString(sum[:])
}

func LoginLockoutMessage(remaining int) string {
	if remaining < 0 {
		remaining = 0
	}
	minutes := remaining / 60
	seconds := remaining % 60
	return "Too many failed login attempts for this account. Try again in " +
		strconv.Itoa(minutes) + "m " + strconv.Itoa(seconds) + "s"
}
