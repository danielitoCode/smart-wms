package httpapi

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/identity"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/inventoryledger"
)

// adminExtendedResources maps Flask admin resource segments to PrismaTec organism kinds.
var adminExtendedResources = map[string]string{
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
	"scope-catalog":             "wms_admin_scope_catalog",
	"short-picks":               "wms_admin_short_pick",
	"receipts":                  "wms_admin_receipt",
	"inter-warehouse-transfers": "wms_admin_iwt",
	"inter-warehouse-transfer":  "wms_admin_iwt",
	"search":                    "wms_admin_search",
	"dashboard":                 "wms_admin_dashboard",
	"inbound":                   "wms_admin_inbound",
	"picker":                    "wms_admin_picker",
	"webhook-errors":            "wms_admin_webhook_error",
	"tokens":                    "wms_admin_token_alias",
	"pos":                       "wms_admin_pos",
	"cycle-counts":              "wms_admin_cycle_count",
	"inventory":                 "wms_admin_inventory_view",
	"audit-log":                 "wms_admin_audit_log",
	"import":                    "wms_admin_import",
}

func newEntityID(prefix string) string {
	var b [8]byte
	_, _ = rand.Read(b[:])
	return prefix + "-" + hex.EncodeToString(b[:])
}

func (s *Server) adminExtended(w http.ResponseWriter, r *http.Request, user identity.User, parts []string) {
	if len(parts) == 0 || parts[0] == "" {
		writeJSON(w, 404, map[string]string{"error": "Not found"})
		return
	}
	resource := parts[0]
	if _, ok := adminExtendedResources[resource]; !ok {
		writeJSON(w, 404, map[string]string{"error": "Not found"})
		return
	}
	pageKey := resource
	if user.Role != "ADMIN" && !containsString(user.AllowedPages, pageKey) {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "Permission denied", "page_key": pageKey})
		return
	}
	kind := adminExtendedResources[resource]

	switch resource {
	case "dashboard":
		s.adminDashboard(w, r)
	case "search":
		s.adminSearch(w, r)
	case "settings":
		s.adminSettings(w, r, kind, parts[1:])
	case "adjustments":
		s.adminAdjustments(w, r, kind, parts[1:])
	case "connectors":
		s.adminConnectors(w, r, kind, parts[1:])
	case "webhooks":
		s.adminWebhooksExt(w, r, parts[1:])
	case "transfer-orders":
		s.adminTransferOrders(w, r, kind, parts[1:])
	case "scope-catalog":
		writeJSON(w, 200, map[string]any{"scopes": []string{
			"pos.availability", "pos.checkout", "pos.refund", "dockd.ship", "dockd.void",
			"inbound.write", "events.read", "snapshot.read",
		}})
	case "import":
		if r.Method != http.MethodPost {
			writeJSON(w, 405, map[string]string{"error": "method not allowed"})
			return
		}
		writeJSON(w, 200, map[string]any{"imported": 0, "entity_type": strings.Join(parts[1:], "/"), "status": "accepted"})
	default:
		s.adminGenericCRUD(w, r, kind, resource, parts[1:])
	}
}

func (s *Server) adminDashboard(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
		return
	}
	wh, _ := s.catalog.ListWarehouses()
	items, _ := s.catalog.ListItems()
	writeJSON(w, 200, map[string]any{
		"warehouses": len(wh),
		"items":      len(items),
		"open_pos":   0,
		"open_sos":   0,
		"engine":     "PrismaTec-Core",
		"service":    "smart-wms-twin",
	})
}

func (s *Server) adminSearch(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
		return
	}
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	items, _ := s.catalog.ListItems()
	writeJSON(w, 200, map[string]any{"q": q, "items": items, "total": len(items)})
}

func (s *Server) adminSettings(w http.ResponseWriter, r *http.Request, kind string, parts []string) {
	switch r.Method {
	case http.MethodGet:
		if len(parts) == 0 {
			list, err := s.store.List(kind)
			if err != nil {
				writeJSON(w, 500, map[string]string{"error": err.Error()})
				return
			}
			out := make([]map[string]any, 0, len(list))
			for _, rec := range list {
				var m map[string]any
				_ = json.Unmarshal(rec.Data, &m)
				out = append(out, m)
			}
			writeJSON(w, 200, map[string]any{"settings": out, "total": len(out)})
			return
		}
		key := parts[0]
		rec, ok, err := s.store.Get(kind, key)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		if !ok {
			writeJSON(w, 200, map[string]any{"setting_key": key, "value": nil})
			return
		}
		var m map[string]any
		_ = json.Unmarshal(rec.Data, &m)
		writeJSON(w, 200, m)
	case http.MethodPut:
		body, _ := io.ReadAll(io.LimitReader(r.Body, 1<<20))
		var payload map[string]any
		if err := json.Unmarshal(body, &payload); err != nil {
			writeJSON(w, 400, map[string]string{"error": "invalid json"})
			return
		}
		if key, _ := payload["setting_key"].(string); key != "" {
			payload["updated_at"] = time.Now().UTC().Format(time.RFC3339)
			data, _ := json.Marshal(payload)
			if _, err := s.store.Put(kind, key, data); err != nil {
				writeJSON(w, 500, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, 200, payload)
			return
		}
		for k, v := range payload {
			row := map[string]any{"setting_key": k, "value": v, "updated_at": time.Now().UTC().Format(time.RFC3339)}
			data, _ := json.Marshal(row)
			_, _ = s.store.Put(kind, k, data)
		}
		writeJSON(w, 200, map[string]any{"status": "ok", "updated": len(payload)})
	default:
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
	}
}

func (s *Server) adminAdjustments(w http.ResponseWriter, r *http.Request, kind string, parts []string) {
	sub := ""
	if len(parts) > 0 {
		sub = parts[0]
	}
	switch {
	case r.Method == http.MethodGet && (sub == "list" || sub == ""):
		list, _ := s.store.List(kind)
		out := make([]map[string]any, 0, len(list))
		for _, rec := range list {
			var m map[string]any
			_ = json.Unmarshal(rec.Data, &m)
			out = append(out, m)
		}
		writeJSON(w, 200, map[string]any{"adjustments": out, "total": len(out)})
	case r.Method == http.MethodGet && sub == "pending":
		writeJSON(w, 200, map[string]any{"adjustments": []any{}, "total": 0})
	case r.Method == http.MethodPost && sub == "direct":
		body, _ := io.ReadAll(io.LimitReader(r.Body, 1<<20))
		var in struct {
			WarehouseID int64  `json:"warehouse_id"`
			BinID       int64  `json:"bin_id"`
			ItemID      int64  `json:"item_id"`
			Delta       int64  `json:"delta"`
			Reason      string `json:"reason"`
		}
		if err := json.Unmarshal(body, &in); err != nil {
			writeJSON(w, 400, map[string]string{"error": "invalid json"})
			return
		}
		opID := newEntityID("adj")
		if s.ledger != nil && in.ItemID > 0 && in.WarehouseID > 0 && in.BinID > 0 {
			if _, err := s.ledger.Adjust(inventoryledger.AdjustCommand{
				OperationID: opID, WarehouseID: in.WarehouseID, BinID: in.BinID, ItemID: in.ItemID, Delta: in.Delta,
			}); err != nil {
				writeJSON(w, 409, map[string]string{"error": err.Error()})
				return
			}
		}
		row := map[string]any{
			"adjustment_id": opID, "warehouse_id": in.WarehouseID, "bin_id": in.BinID,
			"item_id": in.ItemID, "delta": in.Delta, "reason": in.Reason,
			"status": "POSTED", "created_at": time.Now().UTC().Format(time.RFC3339),
		}
		data, _ := json.Marshal(row)
		_, _ = s.store.Put(kind, opID, data)
		writeJSON(w, 200, row)
	case r.Method == http.MethodPost && sub == "review":
		writeJSON(w, 200, map[string]any{"status": "reviewed"})
	default:
		writeJSON(w, 404, map[string]string{"error": "Not found"})
	}
}

func (s *Server) adminConnectors(w http.ResponseWriter, r *http.Request, kind string, parts []string) {
	if len(parts) == 0 {
		s.adminGenericCRUD(w, r, kind, "connectors", nil)
		return
	}
	name := parts[0]
	if len(parts) == 1 {
		switch r.Method {
		case http.MethodGet:
			rec, ok, err := s.store.Get(kind, name)
			if err != nil {
				writeJSON(w, 500, map[string]string{"error": err.Error()})
				return
			}
			if !ok {
				writeJSON(w, 404, map[string]string{"error": "connector not found"})
				return
			}
			var m map[string]any
			_ = json.Unmarshal(rec.Data, &m)
			writeJSON(w, 200, m)
		default:
			writeJSON(w, 405, map[string]string{"error": "method not allowed"})
		}
		return
	}
	action := parts[1]
	switch {
	case action == "config-schema" && r.Method == http.MethodGet:
		writeJSON(w, 200, map[string]any{"connector": name, "schema": map[string]any{"type": "object", "properties": map[string]any{}}})
	case action == "credentials" && r.Method == http.MethodGet:
		writeJSON(w, 200, map[string]any{"connector": name, "configured": false})
	case action == "credentials" && r.Method == http.MethodPost:
		body, _ := io.ReadAll(io.LimitReader(r.Body, 1<<20))
		var payload map[string]any
		_ = json.Unmarshal(body, &payload)
		payload["connector"] = name
		payload["configured"] = true
		data, _ := json.Marshal(payload)
		_, _ = s.store.Put(kind+"-cred", name, data)
		writeJSON(w, 200, map[string]any{"status": "saved", "connector": name})
	case action == "credentials" && r.Method == http.MethodDelete:
		_ = s.store.Delete(kind+"-cred", name)
		writeJSON(w, 200, map[string]any{"status": "deleted"})
	case action == "sync-status" && r.Method == http.MethodGet:
		writeJSON(w, 200, map[string]any{"connector": name, "status": "idle", "last_sync_at": nil})
	case action == "sync-reset" && r.Method == http.MethodPost:
		writeJSON(w, 200, map[string]any{"connector": name, "status": "reset"})
	case action == "test" && r.Method == http.MethodPost:
		writeJSON(w, 200, map[string]any{"connector": name, "ok": true})
	case action == "sync" && r.Method == http.MethodPost:
		syncType := "full"
		if len(parts) > 2 {
			syncType = parts[2]
		}
		writeJSON(w, 200, map[string]any{"connector": name, "sync_type": syncType, "status": "accepted"})
	default:
		writeJSON(w, 404, map[string]string{"error": "Not found"})
	}
}

func (s *Server) adminWebhooksExt(w http.ResponseWriter, r *http.Request, parts []string) {
	// Prefer application webhooks service when available.
	if s.webhooks != nil && len(parts) == 0 {
		switch r.Method {
		case http.MethodGet:
			list, err := s.webhooks.List()
			if err != nil {
				writeJSON(w, 500, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, 200, map[string]any{"webhooks": list, "total": len(list)})
			return
		case http.MethodPost:
			body, _ := io.ReadAll(io.LimitReader(r.Body, 1<<20))
			var in struct {
				URL        string   `json:"url"`
				Secret     string   `json:"secret"`
				EventTypes []string `json:"event_types"`
			}
			if err := json.Unmarshal(body, &in); err != nil {
				writeJSON(w, 400, map[string]string{"error": "invalid json"})
				return
			}
			sub, err := s.webhooks.Create(in.URL, in.Secret, in.EventTypes)
			if err != nil {
				writeJSON(w, 400, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, 201, sub)
			return
		}
	}
	s.adminGenericCRUD(w, r, "wms_admin_webhook_sub", "webhooks", parts)
}

func (s *Server) adminTransferOrders(w http.ResponseWriter, r *http.Request, kind string, parts []string) {
	if len(parts) == 0 {
		s.adminGenericCRUD(w, r, kind, "transfer-orders", nil)
		return
	}
	if parts[0] == "import" && r.Method == http.MethodPost {
		writeJSON(w, 200, map[string]any{"imported": 0, "status": "accepted"})
		return
	}
	id := parts[0]
	if len(parts) == 1 {
		s.adminGenericCRUD(w, r, kind, "transfer-orders", parts)
		return
	}
	switch {
	case parts[1] == "cancel" && r.Method == http.MethodPost:
		rec, ok, _ := s.store.Get(kind, id)
		if !ok {
			writeJSON(w, 404, map[string]string{"error": "not found"})
			return
		}
		var m map[string]any
		_ = json.Unmarshal(rec.Data, &m)
		m["status"] = "CANCELLED"
		data, _ := json.Marshal(m)
		_, _ = s.store.Put(kind, id, data)
		writeJSON(w, 200, m)
	case parts[1] == "start-picking" && r.Method == http.MethodPost:
		rec, ok, _ := s.store.Get(kind, id)
		if !ok {
			writeJSON(w, 404, map[string]string{"error": "not found"})
			return
		}
		var m map[string]any
		_ = json.Unmarshal(rec.Data, &m)
		m["status"] = "PICKING"
		data, _ := json.Marshal(m)
		_, _ = s.store.Put(kind, id, data)
		writeJSON(w, 200, m)
	case len(parts) >= 4 && parts[1] == "approvals" && r.Method == http.MethodPost:
		action := parts[3]
		writeJSON(w, 200, map[string]any{"transfer_order_id": id, "approval_id": parts[2], "status": strings.ToUpper(action)})
	case len(parts) >= 4 && parts[1] == "lines" && parts[3] == "short-close" && r.Method == http.MethodPost:
		writeJSON(w, 200, map[string]any{"transfer_order_id": id, "line_id": parts[2], "status": "SHORT_CLOSED"})
	default:
		writeJSON(w, 404, map[string]string{"error": "Not found"})
	}
}

func (s *Server) adminGenericCRUD(w http.ResponseWriter, r *http.Request, kind, resource string, parts []string) {
	collectionKey := strings.ReplaceAll(resource, "-", "_")
	if len(parts) == 0 {
		switch r.Method {
		case http.MethodGet:
			list, err := s.store.List(kind)
			if err != nil {
				writeJSON(w, 500, map[string]string{"error": err.Error()})
				return
			}
			out := make([]map[string]any, 0, len(list))
			for _, rec := range list {
				var m map[string]any
				_ = json.Unmarshal(rec.Data, &m)
				if m == nil {
					m = map[string]any{}
				}
				if _, ok := m["id"]; !ok {
					m["id"] = rec.ID
				}
				out = append(out, m)
			}
			writeJSON(w, 200, map[string]any{collectionKey: out, "total": len(out)})
		case http.MethodPost:
			body, _ := io.ReadAll(io.LimitReader(r.Body, 1<<20))
			var payload map[string]any
			if len(body) > 0 {
				if err := json.Unmarshal(body, &payload); err != nil {
					writeJSON(w, 400, map[string]string{"error": "invalid json"})
					return
				}
			} else {
				payload = map[string]any{}
			}
			id := newEntityID(resource)
			if v, ok := payload["id"].(string); ok && v != "" {
				id = v
			}
			payload["id"] = id
			payload["created_at"] = time.Now().UTC().Format(time.RFC3339)
			if _, ok := payload["status"]; !ok {
				payload["status"] = "ACTIVE"
			}
			data, _ := json.Marshal(payload)
			if _, err := s.store.Put(kind, id, data); err != nil {
				writeJSON(w, 500, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, 201, payload)
		default:
			writeJSON(w, 405, map[string]string{"error": "method not allowed"})
		}
		return
	}
	id := parts[0]
	// nested actions on generic resources
	if len(parts) > 1 {
		switch {
		case parts[1] == "delete" && r.Method == http.MethodPost:
			_ = s.store.Delete(kind, id)
			writeJSON(w, 200, map[string]any{"status": "deleted", "id": id})
		case parts[1] == "dlq" && r.Method == http.MethodGet:
			writeJSON(w, 200, map[string]any{"dlq": []any{}, "total": 0})
		case parts[1] == "stats" && r.Method == http.MethodGet:
			writeJSON(w, 200, map[string]any{"id": id, "delivered": 0, "failed": 0})
		case parts[1] == "rotate-secret" && r.Method == http.MethodPost:
			writeJSON(w, 200, map[string]any{"id": id, "secret_rotated": true})
		case parts[1] == "rotate-url" && r.Method == http.MethodPost:
			writeJSON(w, 200, map[string]any{"id": id, "url_rotated": true})
		case parts[1] == "test-send" && r.Method == http.MethodPost:
			writeJSON(w, 200, map[string]any{"id": id, "sent": true})
		case parts[1] == "replay-batch" && r.Method == http.MethodPost:
			writeJSON(w, 200, map[string]any{"id": id, "replayed": 0})
		case parts[1] == "replay" && r.Method == http.MethodPost:
			writeJSON(w, 200, map[string]any{"id": id, "delivery_id": strings.Join(parts[2:], "/"), "replayed": true})
		case parts[1] == "unreceive" && r.Method == http.MethodPost:
			writeJSON(w, 200, map[string]any{"receipt_id": id, "status": "UNRECEIVED"})
		case parts[1] == "submit" && r.Method == http.MethodPost:
			writeJSON(w, 200, map[string]any{"id": id, "status": "SUBMITTED"})
		case parts[1] == "cancel-backorder" && r.Method == http.MethodPost:
			writeJSON(w, 200, map[string]any{"so_id": id, "status": "BACKORDER_CANCELLED"})
		default:
			writeJSON(w, 404, map[string]string{"error": "Not found"})
		}
		return
	}
	switch r.Method {
	case http.MethodGet:
		rec, ok, err := s.store.Get(kind, id)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		if !ok {
			// numeric id fallback: scan
			list, _ := s.store.List(kind)
			for _, rec := range list {
				var m map[string]any
				_ = json.Unmarshal(rec.Data, &m)
				if rec.ID == id || stringifyID(m["id"]) == id {
					writeJSON(w, 200, m)
					return
				}
			}
			writeJSON(w, 404, map[string]string{"error": "not found"})
			return
		}
		var m map[string]any
		_ = json.Unmarshal(rec.Data, &m)
		writeJSON(w, 200, m)
	case http.MethodPut, http.MethodPatch:
		body, _ := io.ReadAll(io.LimitReader(r.Body, 1<<20))
		var payload map[string]any
		if err := json.Unmarshal(body, &payload); err != nil {
			writeJSON(w, 400, map[string]string{"error": "invalid json"})
			return
		}
		rec, ok, _ := s.store.Get(kind, id)
		existing := map[string]any{}
		if ok {
			_ = json.Unmarshal(rec.Data, &existing)
		}
		for k, v := range payload {
			existing[k] = v
		}
		existing["id"] = id
		existing["updated_at"] = time.Now().UTC().Format(time.RFC3339)
		data, _ := json.Marshal(existing)
		if _, err := s.store.Put(kind, id, data); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, existing)
	case http.MethodDelete:
		if err := s.store.Delete(kind, id); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]any{"status": "deleted", "id": id})
	default:
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
	}
}

func stringifyID(v any) string {
	switch t := v.(type) {
	case string:
		return t
	case float64:
		return strconv.FormatInt(int64(t), 10)
	case int64:
		return strconv.FormatInt(t, 10)
	case json.Number:
		return t.String()
	default:
		return ""
	}
}


func (s *Server) warehousesPublic(w http.ResponseWriter, r *http.Request) {
	path := strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/warehouses/"), "/")
	if path == "list" && r.Method == http.MethodGet {
		user, _ := r.Context().Value(authContextKey{}).(identity.User)
		values, err := s.catalog.ListWarehouses()
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		if user.Role != "ADMIN" {
			allowed := map[int64]bool{}
			for _, id := range user.WarehouseIDs {
				allowed[id] = true
			}
			filtered := values[:0]
			for _, v := range values {
				if allowed[v.WarehouseID] {
					filtered = append(filtered, v)
				}
			}
			values = filtered
		}
		writeJSON(w, 200, map[string]any{"warehouses": values, "total": len(values)})
		return
	}
	writeJSON(w, 404, map[string]string{"error": "Not found"})
}
