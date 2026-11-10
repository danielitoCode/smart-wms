package identity

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/security/auth"
	"golang.org/x/crypto/bcrypt"
)

const userKind = "users"

var (
	ErrNotFound = errors.New("user not found")
	ErrDuplicateUsername = errors.New("username already exists")
	ErrInvalidUser = errors.New("invalid user")
	ErrInvalidCredentials = errors.New("invalid username or password")
	ErrCurrentPassword = errors.New("current password is incorrect")
)

type User struct {
	UserID int64 `json:"user_id"`
	Username string `json:"username"`
	PasswordHash string `json:"password_hash"`
	FullName string `json:"full_name"`
	Role string `json:"role"`
	WarehouseID *int64 `json:"warehouse_id"`
	WarehouseIDs []int64 `json:"warehouse_ids"`
	AllowedFunctions []string `json:"allowed_functions"`
	AllowedPages []string `json:"allowed_pages"`
	AllowedOverrides []string `json:"allowed_overrides"`
	IsActive bool `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	LastLogin *time.Time `json:"last_login,omitempty"`
	PasswordChangedAt *time.Time `json:"password_changed_at,omitempty"`
	MustChangePassword bool `json:"must_change_password"`
}

type PublicUser struct {
	UserID int64 `json:"user_id"`
	Username string `json:"username"`
	FullName string `json:"full_name"`
	Role string `json:"role"`
	WarehouseID *int64 `json:"warehouse_id"`
	WarehouseIDs []int64 `json:"warehouse_ids"`
	AllowedFunctions []string `json:"allowed_functions"`
	IsActive bool `json:"is_active"`
	MustChangePassword bool `json:"must_change_password"`
}

type Repository struct {
	store *corestore.Store
	mu sync.Mutex
}

var dummyPasswordHash []byte

func init() {
	dummyPasswordHash, _ = bcrypt.GenerateFromPassword([]byte("not-a-real-user-password"), bcrypt.DefaultCost)
}

func New(store *corestore.Store) *Repository { return &Repository{store: store} }

func HashPassword(password string) (string, error) {
	if message := auth.ValidatePassword(password); message != "" {
		return "", fmt.Errorf("%w: %s", ErrInvalidUser, message)
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil { return "", fmt.Errorf("hash user password: %w", err) }
	return string(hash), nil
}

func Public(user User) PublicUser {
	return PublicUser{
		UserID: user.UserID, Username: user.Username, FullName: user.FullName,
		Role: user.Role, WarehouseID: user.WarehouseID,
		WarehouseIDs: nonNilInt64s(user.WarehouseIDs),
		AllowedFunctions: nonNilStrings(user.AllowedFunctions),
		IsActive: user.IsActive, MustChangePassword: user.MustChangePassword,
	}
}

func (r *Repository) CreateWithPassword(user User, password string) (User, error) {
	hash, err := HashPassword(password)
	if err != nil { return User{}, err }
	user.PasswordHash = hash
	return r.Create(user)
}

// Create assigns the next local user ID. Core primary fencing plus this
// process mutex serialize writes on the active node; this is not a DHT lock.
func (r *Repository) Create(user User) (User, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	users, err := r.listLocked()
	if err != nil { return User{}, err }
	user = normalizeUser(user)
	if user.UserID == 0 {
		var maxID int64
		for _, current := range users { if current.UserID > maxID { maxID = current.UserID } }
		if maxID == math.MaxInt64 { return User{}, fmt.Errorf("%w: user ID space exhausted", ErrInvalidUser) }
		user.UserID = maxID + 1
	}
	for _, current := range users {
		if current.UserID == user.UserID { return User{}, fmt.Errorf("%w: user_id %d", ErrInvalidUser, user.UserID) }
		if current.Username == user.Username { return User{}, ErrDuplicateUsername }
	}
	if user.CreatedAt.IsZero() { user.CreatedAt = time.Now().UTC() }
	if err := validateUser(user); err != nil { return User{}, err }
	if err := r.persistLocked(user); err != nil { return user, err }
	return user, nil
}

func (r *Repository) GetByID(userID int64) (User, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.getLocked(userID)
}

func (r *Repository) GetByUsername(username string) (User, error) {
	normalized := normalizeUsername(username)
	if normalized == "" { return User{}, ErrNotFound }
	r.mu.Lock()
	defer r.mu.Unlock()
	users, err := r.listLocked()
	if err != nil { return User{}, err }
	for _, user := range users { if user.Username == normalized { return user, nil } }
	return User{}, ErrNotFound
}

func (r *Repository) List() ([]User, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.listLocked()
}

func (r *Repository) Authenticate(username, password string) (User, error) {
	normalized := normalizeUsername(username)
	r.mu.Lock()
	defer r.mu.Unlock()
	users, err := r.listLocked()
	if err != nil { return User{}, err }
	var matched *User
	for i := range users { if users[i].Username == normalized { matched = &users[i]; break } }
	if matched == nil || !matched.IsActive {
		_ = bcrypt.CompareHashAndPassword(dummyPasswordHash, []byte(password))
		return User{}, ErrInvalidCredentials
	}
	if err := bcrypt.CompareHashAndPassword([]byte(matched.PasswordHash), []byte(password)); err != nil {
		return User{}, ErrInvalidCredentials
	}
	now := time.Now().UTC()
	matched.LastLogin = &now
	if err := r.persistLocked(*matched); err != nil { return User{}, err }
	return *matched, nil
}

func (r *Repository) ChangePassword(userID int64, currentPassword, newPassword string) (User, error) {
	if message := auth.ValidatePassword(newPassword); message != "" {
		return User{}, fmt.Errorf("%w: %s", ErrInvalidUser, message)
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	user, err := r.getLocked(userID)
	if err != nil { return User{}, err }
	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(currentPassword)) != nil {
		return User{}, ErrCurrentPassword
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil { return User{}, fmt.Errorf("hash new password: %w", err) }
	now := time.Now().UTC()
	user.PasswordHash = string(hash)
	user.PasswordChangedAt = &now
	user.MustChangePassword = false
	if err := r.persistLocked(user); err != nil { return user, err }
	return user, nil
}

func (r *Repository) Save(user User) (User, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	current, err := r.getLocked(user.UserID)
	if err != nil { return User{}, err }
	users, err := r.listLocked()
	if err != nil { return User{}, err }
	user = normalizeUser(user)
	for _, candidate := range users {
		if candidate.UserID != user.UserID && candidate.Username == user.Username { return User{}, ErrDuplicateUsername }
	}
	if user.CreatedAt.IsZero() { user.CreatedAt = current.CreatedAt }
	if err := validateUser(user); err != nil { return User{}, err }
	if err := r.persistLocked(user); err != nil { return user, err }
	return user, nil
}

func (r *Repository) SetPagePermissions(userID int64, pages, overrides []string) (User, error) {
	user, err := r.GetByID(userID)
	if err != nil { return User{}, err }
	user.AllowedPages = uniqueSorted(pages)
	user.AllowedOverrides = uniqueSorted(overrides)
	return r.Save(user)
}

func (r *Repository) getLocked(userID int64) (User, error) {
	if userID <= 0 { return User{}, ErrNotFound }
	if r.store == nil { return User{}, errors.New("identity repository has no Core store") }
	record, found, err := r.store.Get(userKind, strconv.FormatInt(userID, 10))
	if err != nil { return User{}, err }
	if !found { return User{}, ErrNotFound }
	var user User
	if err := json.Unmarshal(record.Data, &user); err != nil { return User{}, fmt.Errorf("decode persisted user %d: %w", userID, err) }
	if err := validateUser(user); err != nil { return User{}, fmt.Errorf("persisted user %d: %w", userID, err) }
	return user, nil
}

func (r *Repository) listLocked() ([]User, error) {
	if r.store == nil { return nil, errors.New("identity repository has no Core store") }
	records, err := r.store.List(userKind)
	if err != nil { return nil, err }
	users := make([]User, 0, len(records))
	for _, record := range records {
		var user User
		if err := json.Unmarshal(record.Data, &user); err != nil { return nil, fmt.Errorf("decode persisted user %s: %w", record.ID, err) }
		if err := validateUser(user); err != nil { return nil, fmt.Errorf("persisted user %s: %w", record.ID, err) }
		users = append(users, user)
	}
	sort.Slice(users, func(i, j int) bool { return users[i].UserID < users[j].UserID })
	return users, nil
}

func (r *Repository) persistLocked(user User) error {
	data, err := json.Marshal(user)
	if err != nil { return fmt.Errorf("encode user: %w", err) }
	_, err = r.store.Put(userKind, strconv.FormatInt(user.UserID, 10), data)
	if err != nil { return fmt.Errorf("persist user %d in PrismaTec: %w", user.UserID, err) }
	return nil
}

func normalizeUser(user User) User {
	user.Username = normalizeUsername(user.Username)
	user.Role = strings.ToUpper(strings.TrimSpace(user.Role))
	if user.Role == "" { user.Role = "USER" }
	user.FullName = strings.TrimSpace(user.FullName)
	user.WarehouseIDs = nonNilInt64s(user.WarehouseIDs)
	user.AllowedFunctions = nonNilStrings(user.AllowedFunctions)
	user.AllowedPages = uniqueSorted(user.AllowedPages)
	user.AllowedOverrides = uniqueSorted(user.AllowedOverrides)
	return user
}

func normalizeUsername(username string) string { return strings.ToLower(strings.TrimSpace(username)) }

func validateUser(user User) error {
	if user.UserID <= 0 || len(user.Username) == 0 || len(user.Username) > 50 ||
		len(user.FullName) == 0 || len(user.FullName) > 100 ||
		(user.Role != "ADMIN" && user.Role != "USER") ||
		user.PasswordHash == "" || user.CreatedAt.IsZero() { return ErrInvalidUser }
	if _, err := bcrypt.Cost([]byte(user.PasswordHash)); err != nil {
		return fmt.Errorf("%w: password_hash is not bcrypt", ErrInvalidUser)
	}
	if user.WarehouseID != nil && *user.WarehouseID <= 0 { return ErrInvalidUser }
	for _, warehouseID := range user.WarehouseIDs { if warehouseID <= 0 { return ErrInvalidUser } }
	return nil
}

func uniqueSorted(values []string) []string {
	seen := make(map[string]struct{}, len(values))
	out := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" { continue }
		if _, exists := seen[value]; exists { continue }
		seen[value] = struct{}{}
		out = append(out, value)
	}
	sort.Strings(out)
	return out
}

func nonNilStrings(values []string) []string {
	if values == nil { return []string{} }
	return values
}

func nonNilInt64s(values []int64) []int64 {
	if values == nil { return []int64{} }
	return values
}
