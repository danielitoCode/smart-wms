// Package admindata is the data layer for admin resources that are still
// migrating off Flask. Handlers must not invent JSON; they call this store.
// Records live as PrismaTec-Core organisms so list/get/put look like a DB.
package admindata

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"sort"
	"time"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
)

// Kind maps Flask-ish resource names to organism kinds.
func Kind(resource string) string {
	m := map[string]string{
		"channels":                  "wms_admin_channel",
		"connectors":                "wms_admin_connector",
		"connector-registry":        "wms_admin_connector_registry",
		"consumer-groups":           "wms_admin_consumer_group",
		"notification-webhooks":     "wms_admin_notification_webhook",
		"webhooks":                  "wms_admin_webhook_sub",
		"transfer-orders":           "wms_admin_transfer_order",
		"adjustments":               "wms_admin_adjustment",
		"backorders":                "wms_admin_backorder",
		"settings":                  "wms_admin_setting",
		"pick-batches":              "wms_admin_pick_batch",
		"source-systems":            "wms_admin_source_system",
		"short-picks":               "wms_admin_short_pick",
		"receipts":                  "wms_admin_receipt",
		"inter-warehouse-transfers": "wms_admin_iwt",
		"inter-warehouse-transfer":  "wms_admin_iwt",
		"inbound-activity":          "wms_admin_inbound_activity",
		"webhook-errors":            "wms_admin_webhook_error",
		"cycle-counts":              "wms_admin_cycle_count",
		"audit-log":                 "wms_admin_audit_log",
	}
	if k, ok := m[resource]; ok {
		return k
	}
	return "wms_admin_" + resource
}

// IDField is the primary key name the admin UI expects per resource.
func IDField(resource string) string {
	switch resource {
	case "channels":
		return "channel_id"
	case "webhooks", "notification-webhooks":
		return "subscription_id"
	case "consumer-groups":
		return "consumer_group_id"
	case "transfer-orders":
		return "to_id"
	case "connector-registry":
		return "connector_id"
	default:
		return "id"
	}
}

type Store struct {
	core *corestore.Store
}

func New(core *corestore.Store) *Store {
	return &Store{core: core}
}

func newID(prefix string) string {
	var b [8]byte
	_, _ = rand.Read(b[:])
	return prefix + "-" + hex.EncodeToString(b[:])
}

// List returns documents as maps. Empty collections may be seeded once so the
// UI sees BD-shaped rows while the real domain is still migrating.
func (s *Store) List(resource string) ([]map[string]any, error) {
	kind := Kind(resource)
	recs, err := s.core.List(kind)
	if err != nil {
		return nil, err
	}
	if len(recs) == 0 {
		if err := s.seedIfEmpty(resource); err != nil {
			return nil, err
		}
		recs, err = s.core.List(kind)
		if err != nil {
			return nil, err
		}
	}
	out := make([]map[string]any, 0, len(recs))
	idField := IDField(resource)
	for _, rec := range recs {
		m := decode(rec.Data)
		if m == nil {
			m = map[string]any{}
		}
		if _, ok := m["id"]; !ok {
			m["id"] = rec.ID
		}
		if _, ok := m[idField]; !ok {
			m[idField] = m["id"]
		}
		out = append(out, m)
	}
	sort.Slice(out, func(i, j int) bool {
		return fmt.Sprint(out[i]["id"]) < fmt.Sprint(out[j]["id"])
	})
	return out, nil
}

func (s *Store) Get(resource, id string) (map[string]any, bool, error) {
	rec, ok, err := s.core.Get(Kind(resource), id)
	if err != nil || !ok {
		return nil, ok, err
	}
	m := decode(rec.Data)
	if m == nil {
		m = map[string]any{}
	}
	m["id"] = rec.ID
	idField := IDField(resource)
	if _, exists := m[idField]; !exists {
		m[idField] = rec.ID
	}
	return m, true, nil
}

func (s *Store) Put(resource, id string, doc map[string]any) (map[string]any, error) {
	if id == "" {
		id = newID(resource)
	}
	if doc == nil {
		doc = map[string]any{}
	}
	doc["id"] = id
	idField := IDField(resource)
	doc[idField] = id
	if _, ok := doc["created_at"]; !ok {
		doc["created_at"] = time.Now().UTC().Format(time.RFC3339)
	}
	doc["updated_at"] = time.Now().UTC().Format(time.RFC3339)
	if _, ok := doc["status"]; !ok {
		doc["status"] = "ACTIVE"
	}
	data, err := json.Marshal(doc)
	if err != nil {
		return nil, err
	}
	if _, err := s.core.Put(Kind(resource), id, data); err != nil {
		return nil, err
	}
	return doc, nil
}

func (s *Store) Delete(resource, id string) error {
	return s.core.Delete(Kind(resource), id)
}

func (s *Store) GetSetting(key string) (map[string]any, error) {
	rec, ok, err := s.core.Get(Kind("settings"), key)
	if err != nil {
		return nil, err
	}
	if !ok {
		return map[string]any{"setting_key": key, "value": nil}, nil
	}
	m := decode(rec.Data)
	if m == nil {
		m = map[string]any{"setting_key": key, "value": nil}
	}
	return m, nil
}

func (s *Store) PutSetting(key string, value any) (map[string]any, error) {
	row := map[string]any{
		"setting_key": key,
		"value":       value,
		"updated_at":  time.Now().UTC().Format(time.RFC3339),
	}
	data, _ := json.Marshal(row)
	if _, err := s.core.Put(Kind("settings"), key, data); err != nil {
		return nil, err
	}
	return row, nil
}

// seedIfEmpty writes BD-shaped demo rows once. Remove seeds as each resource
// gains a real application service (Daniel: quit mocks as you migrate).
func (s *Store) seedIfEmpty(resource string) error {
	now := time.Now().UTC().Format(time.RFC3339)
	var rows []map[string]any
	switch resource {
	case "channels":
		rows = []map[string]any{{
			"name": "seed-channel", "status": "ACTIVE", "created_at": now,
			"description": "seed row — replace when channel domain is migrated",
		}}
	case "consumer-groups":
		rows = []map[string]any{{
			"name": "seed-consumers", "status": "ACTIVE", "created_at": now,
		}}
	case "source-systems":
		rows = []map[string]any{{
			"code": "SEED", "name": "Seed source system", "status": "ACTIVE", "created_at": now,
		}}
	case "inbound-activity":
		// empty is fine; activity is append-only from inbound writes
		return nil
	default:
		return nil
	}
	for _, row := range rows {
		id := newID(resource)
		row["id"] = id
		row[IDField(resource)] = id
		data, _ := json.Marshal(row)
		if _, err := s.core.Put(Kind(resource), id, data); err != nil {
			return err
		}
	}
	return nil
}

func decode(raw json.RawMessage) map[string]any {
	var m map[string]any
	if len(raw) == 0 {
		return nil
	}
	_ = json.Unmarshal(raw, &m)
	return m
}
