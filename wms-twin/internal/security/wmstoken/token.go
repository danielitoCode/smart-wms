// Package wmstoken implements scoped integration tokens (not JWT user sessions).
package wmstoken

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
	"golang.org/x/crypto/bcrypt"
)

const kind = "wms_token"

var (
	ErrUnauthorized = errors.New("invalid or revoked wms token")
	ErrScope        = errors.New("endpoint_scope_violation")
	ErrInactive     = errors.New("token inactive")
)

var KnownScopes = []string{
	"pos.availability", "pos.validate-cart", "pos.checkout", "pos.refund", "pos.sales-orders", "pos.reference-orders", "pos.dispatch",
	"dockd.orders", "dockd.items", "dockd.ship", "dockd.void-ship",
	"inbound.mapping-schema", "inbound.write",
	"events.read", "events.ack", "events.publish", "snapshot.inventory", "snapshot.restore", "webhooks.manage",
}

type TokenRecord struct {
	TokenID     string     `json:"token_id"`
	Name        string     `json:"name"`
	SecretHash  string     `json:"secret_hash"`
	Endpoints   []string   `json:"endpoints"`
	WarehouseID *int64     `json:"warehouse_id,omitempty"`
	Active      bool       `json:"active"`
	CreatedAt   time.Time  `json:"created_at"`
	LastUsedAt  *time.Time `json:"last_used_at,omitempty"`
}

type PublicToken struct {
	TokenID     string    `json:"token_id"`
	Name        string    `json:"name"`
	Endpoints   []string  `json:"endpoints"`
	WarehouseID *int64    `json:"warehouse_id,omitempty"`
	Active      bool      `json:"active"`
	CreatedAt   time.Time `json:"created_at"`
	Token       string    `json:"token,omitempty"`
}

type Store struct {
	store *corestore.Store
	mu    sync.Mutex
}

func NewStore(store *corestore.Store) *Store { return &Store{store: store} }

func (s *Store) Create(name string, endpoints []string, warehouseID *int64) (PublicToken, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	plain, err := randomToken()
	if err != nil {
		return PublicToken{}, err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(plain), 12)
	if err != nil {
		return PublicToken{}, err
	}
	raw := make([]byte, 8)
	_, _ = rand.Read(raw)
	id := "wt_" + hex.EncodeToString(raw)
	rec := TokenRecord{
		TokenID: id, Name: strings.TrimSpace(name), SecretHash: string(hash),
		Endpoints: normalizeScopes(endpoints), WarehouseID: warehouseID,
		Active: true, CreatedAt: time.Now().UTC(),
	}
	data, _ := json.Marshal(rec)
	if _, err := s.store.Put(kind, rec.TokenID, data); err != nil {
		return PublicToken{}, err
	}
	return PublicToken{
		TokenID: rec.TokenID, Name: rec.Name, Endpoints: rec.Endpoints,
		WarehouseID: rec.WarehouseID, Active: true, CreatedAt: rec.CreatedAt, Token: plain,
	}, nil
}

func (s *Store) Authenticate(plain, requiredScope string) (TokenRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	plain = strings.TrimSpace(plain)
	if plain == "" {
		return TokenRecord{}, ErrUnauthorized
	}
	records, err := s.store.List(kind)
	if err != nil {
		return TokenRecord{}, err
	}
	for _, r := range records {
		var rec TokenRecord
		if err := json.Unmarshal(r.Data, &rec); err != nil {
			continue
		}
		if err := bcrypt.CompareHashAndPassword([]byte(rec.SecretHash), []byte(plain)); err != nil {
			continue
		}
		if !rec.Active {
			return TokenRecord{}, ErrInactive
		}
		if requiredScope != "" && !scopeAllows(rec.Endpoints, requiredScope) {
			return TokenRecord{}, ErrScope
		}
		now := time.Now().UTC()
		rec.LastUsedAt = &now
		data, _ := json.Marshal(rec)
		_, _ = s.store.Put(kind, rec.TokenID, data)
		return rec, nil
	}
	return TokenRecord{}, ErrUnauthorized
}

func (s *Store) List() ([]PublicToken, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	records, err := s.store.List(kind)
	if err != nil {
		return nil, err
	}
	out := make([]PublicToken, 0, len(records))
	for _, r := range records {
		var rec TokenRecord
		if err := json.Unmarshal(r.Data, &rec); err != nil {
			continue
		}
		out = append(out, PublicToken{
			TokenID: rec.TokenID, Name: rec.Name, Endpoints: rec.Endpoints,
			WarehouseID: rec.WarehouseID, Active: rec.Active, CreatedAt: rec.CreatedAt,
		})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.Before(out[j].CreatedAt) })
	return out, nil
}

func (s *Store) Revoke(tokenID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	recRaw, ok, err := s.store.Get(kind, tokenID)
	if err != nil {
		return err
	}
	if !ok {
		return fmt.Errorf("token not found")
	}
	var rec TokenRecord
	if err := json.Unmarshal(recRaw.Data, &rec); err != nil {
		return err
	}
	rec.Active = false
	data, _ := json.Marshal(rec)
	_, err = s.store.Put(kind, tokenID, data)
	return err
}

func scopeAllows(have []string, need string) bool {
	need = strings.TrimSpace(need)
	for _, s := range have {
		if s == "*" || s == need {
			return true
		}
		if strings.HasSuffix(s, ".*") && strings.HasPrefix(need, strings.TrimSuffix(s, ".*")+".") {
			return true
		}
	}
	return false
}

func normalizeScopes(in []string) []string {
	seen := map[string]struct{}{}
	out := make([]string, 0, len(in))
	for _, s := range in {
		s = strings.TrimSpace(s)
		if s == "" {
			continue
		}
		if _, ok := seen[s]; ok {
			continue
		}
		seen[s] = struct{}{}
		out = append(out, s)
	}
	if len(out) == 0 {
		return []string{"*"}
	}
	sort.Strings(out)
	return out
}

func randomToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return "wms_" + hex.EncodeToString(b), nil
}

func ConstantTimeMatch(a, b string) bool {
	return subtle.ConstantTimeCompare([]byte(a), []byte(b)) == 1
}

func FormatAuthError(err error) (int, map[string]string) {
	switch {
	case errors.Is(err, ErrScope):
		return 403, map[string]string{"error": "endpoint_scope_violation"}
	case errors.Is(err, ErrInactive):
		return 403, map[string]string{"error": "token_inactive"}
	case errors.Is(err, ErrUnauthorized):
		return 401, map[string]string{"error": "Unauthorized"}
	default:
		return 500, map[string]string{"error": fmt.Sprint(err)}
	}
}
