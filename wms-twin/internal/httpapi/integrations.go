package httpapi

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/inbound"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/pos"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/rma"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/security/wmstoken"
)

func extractBearer(r *http.Request) string {
	h := strings.TrimSpace(r.Header.Get("Authorization"))
	if strings.HasPrefix(strings.ToLower(h), "bearer ") {
		return strings.TrimSpace(h[7:])
	}
	if t := strings.TrimSpace(r.Header.Get("X-WMS-Token")); t != "" {
		return t
	}
	return ""
}

func (s *Server) requireWMSToken(scope string, next func(http.ResponseWriter, *http.Request, wmstoken.TokenRecord)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if s.wmsTokens == nil {
			writeJSON(w, 503, map[string]string{"error": "wms tokens not configured"})
			return
		}
		rec, err := s.wmsTokens.Authenticate(extractBearer(r), scope)
		if err != nil {
			code, body := wmstoken.FormatAuthError(err)
			writeJSON(w, code, body)
			return
		}
		if s.wmsAudit != nil {
			_, _ = s.wmsAudit.Record(rec.TokenID, "wms_token", scope, true, r.Method+" "+r.URL.Path, map[string]any{"token_id": rec.TokenID})
		}
		next(w, r, rec)
	}
}

func (s *Server) v1Route(w http.ResponseWriter, r *http.Request) {
	path := strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/v1/"), "/")
	parts := strings.Split(path, "/")
	if len(parts) == 0 || parts[0] == "" {
		writeJSON(w, 404, map[string]string{"error": "not found"})
		return
	}
	switch parts[0] {
	case "pos":
		s.posV1(w, r, strings.Join(parts[1:], "/"))
	case "dockd":
		s.dockdV1(w, r, strings.Join(parts[1:], "/"))
	case "inbound":
		s.inboundV1(w, r, strings.Join(parts[1:], "/"))
	case "events":
		s.eventsV1(w, r, strings.Join(parts[1:], "/"))
	case "snapshot":
		s.snapshotV1(w, r, strings.Join(parts[1:], "/"))
	case "webhooks":
		s.webhooksV1(w, r, strings.Join(parts[1:], "/"))
	default:
		writeJSON(w, 404, map[string]string{"error": "not found"})
	}
}

func (s *Server) posV1(w http.ResponseWriter, r *http.Request, rest string) {
	switch {
	case r.Method == http.MethodGet && rest == "availability":
		s.requireWMSToken("pos.availability", func(w http.ResponseWriter, r *http.Request, rec wmstoken.TokenRecord) {
			wid, _ := strconv.ParseInt(r.URL.Query().Get("warehouse_id"), 10, 64)
			if rec.WarehouseID != nil {
				wid = *rec.WarehouseID
			}
			out, err := s.pos.Availability(wid, r.URL.Query().Get("sku"))
			if err != nil {
				writeJSON(w, 500, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, 200, out)
		})(w, r)
	case r.Method == http.MethodPost && rest == "validate-cart":
		s.requireWMSToken("pos.validate-cart", func(w http.ResponseWriter, r *http.Request, rec wmstoken.TokenRecord) {
			var in struct {
				WarehouseID int64          `json:"warehouse_id"`
				Lines       []pos.CartLine `json:"lines"`
			}
			if err := decodeBody(r, &in); err != nil {
				writeJSON(w, 400, map[string]string{"error": "Invalid request body"})
				return
			}
			if rec.WarehouseID != nil {
				in.WarehouseID = *rec.WarehouseID
			}
			out, err := s.pos.ValidateCart(in.WarehouseID, in.Lines)
			if err != nil {
				writeJSON(w, 400, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, 200, out)
		})(w, r)
	case r.Method == http.MethodPost && rest == "checkout":
		s.requireWMSToken("pos.checkout", func(w http.ResponseWriter, r *http.Request, rec wmstoken.TokenRecord) {
			var in struct {
				WarehouseID int64          `json:"warehouse_id"`
				Lines       []pos.CartLine `json:"lines"`
			}
			if err := decodeBody(r, &in); err != nil {
				writeJSON(w, 400, map[string]string{"error": "Invalid request body"})
				return
			}
			if rec.WarehouseID != nil {
				in.WarehouseID = *rec.WarehouseID
			}
			so, err := s.pos.Checkout(in.WarehouseID, in.Lines, rec.Name)
			if err != nil {
				if errors.Is(err, pos.ErrUnsupported) {
					writeJSON(w, 501, map[string]string{"error": err.Error()})
				} else {
					writeJSON(w, 400, map[string]string{"error": err.Error()})
				}
				return
			}
			if s.events != nil {
				_, _ = s.events.Emit("pos.checkout", map[string]any{"so_id": so.SOID, "so_number": so.SONumber})
			}
			if s.webhooks != nil {
				s.webhooks.Deliver("pos.checkout", so)
			}
			writeJSON(w, 201, so)
		})(w, r)
	case r.Method == http.MethodPost && rest == "refund":
		s.requireWMSToken("pos.refund", func(w http.ResponseWriter, r *http.Request, rec wmstoken.TokenRecord) {
			var in struct {
				SONumber string `json:"so_number"`
			}
			if err := decodeBody(r, &in); err != nil {
				writeJSON(w, 400, map[string]string{"error": "Invalid request body"})
				return
			}
			out, err := s.pos.Refund(in.SONumber, rec.Name)
			if err != nil {
				if errors.Is(err, pos.ErrUnsupported) {
					writeJSON(w, 501, map[string]string{"error": err.Error()})
				} else {
					writeJSON(w, 404, map[string]string{"error": err.Error()})
				}
				return
			}
			if s.events != nil {
				_, _ = s.events.Emit("pos.refund", out)
			}
			writeJSON(w, 200, out)
		})(w, r)
	case r.Method == http.MethodPost && rest == "dispatch":
		s.requireWMSToken("pos.dispatch", func(w http.ResponseWriter, r *http.Request, rec wmstoken.TokenRecord) {
			var in struct {
				SONumber string `json:"so_number"`
			}
			if err := decodeBody(r, &in); err != nil {
				writeJSON(w, 400, map[string]string{"error": "Invalid request body"})
				return
			}
			out, err := s.pos.Dispatch(in.SONumber, rec.Name)
			if err != nil {
				if errors.Is(err, pos.ErrUnsupported) {
					writeJSON(w, 501, map[string]string{"error": err.Error()})
				} else {
					writeJSON(w, 404, map[string]string{"error": err.Error()})
				}
				return
			}
			if s.events != nil {
				_, _ = s.events.Emit("pos.dispatch", out)
			}
			writeJSON(w, 200, out)
		})(w, r)
	case r.Method == http.MethodGet && strings.HasPrefix(rest, "sales-orders/"):
		s.requireWMSToken("pos.sales-orders", func(w http.ResponseWriter, r *http.Request, rec wmstoken.TokenRecord) {
			num := strings.TrimPrefix(rest, "sales-orders/")
			so, err := s.pos.GetSO(num)
			if err != nil {
				writeJSON(w, 404, map[string]string{"error": "not found"})
				return
			}
			writeJSON(w, 200, so)
		})(w, r)
	case r.Method == http.MethodPost && rest == "reference-orders":
		s.requireWMSToken("pos.reference-orders", func(w http.ResponseWriter, r *http.Request, rec wmstoken.TokenRecord) {
			writeJSON(w, 501, map[string]string{"error": "reference-order lookup is not implemented"})
		})(w, r)
	default:
		writeJSON(w, 404, map[string]string{"error": "not found"})
	}
}

func (s *Server) dockdV1(w http.ResponseWriter, r *http.Request, rest string) {
	parts := strings.Split(rest, "/")
	switch {
	case r.Method == http.MethodGet && len(parts) == 2 && parts[0] == "orders":
		s.requireWMSToken("dockd.orders", func(w http.ResponseWriter, r *http.Request, rec wmstoken.TokenRecord) {
			so, err := s.dockd.Order(parts[1])
			if err != nil {
				writeJSON(w, 404, map[string]string{"error": "not found"})
				return
			}
			writeJSON(w, 200, so)
		})(w, r)
	case r.Method == http.MethodGet && len(parts) == 2 && parts[0] == "items":
		s.requireWMSToken("dockd.items", func(w http.ResponseWriter, r *http.Request, rec wmstoken.TokenRecord) {
			out, err := s.dockd.Item(parts[1])
			if err != nil {
				writeJSON(w, 404, map[string]string{"error": "not found"})
				return
			}
			writeJSON(w, 200, out)
		})(w, r)
	case r.Method == http.MethodPost && len(parts) == 3 && parts[0] == "orders" && parts[2] == "ship":
		s.requireWMSToken("dockd.ship", func(w http.ResponseWriter, r *http.Request, rec wmstoken.TokenRecord) {
			var in struct {
				Carrier        string `json:"carrier"`
				TrackingNumber string `json:"tracking_number"`
			}
			_ = decodeBody(r, &in)
			allowed := []int64{}
			if rec.WarehouseID != nil {
				allowed = []int64{*rec.WarehouseID}
			}
			out, err := s.dockd.Ship(parts[1], in.Carrier, in.TrackingNumber, rec.Name, allowed, rec.WarehouseID == nil)
			if err != nil {
				writeJSON(w, 400, map[string]string{"error": err.Error()})
				return
			}
			if s.events != nil {
				_, _ = s.events.Emit("dockd.ship", out)
			}
			if s.webhooks != nil {
				s.webhooks.Deliver("dockd.ship", out)
			}
			writeJSON(w, 200, out)
		})(w, r)
	case r.Method == http.MethodPost && len(parts) == 3 && parts[0] == "orders" && parts[2] == "void-ship":
		s.requireWMSToken("dockd.void-ship", func(w http.ResponseWriter, r *http.Request, rec wmstoken.TokenRecord) {
			out, err := s.dockd.VoidShip(parts[1], rec.Name)
			if err != nil {
				writeJSON(w, 404, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, 200, out)
		})(w, r)
	default:
		writeJSON(w, 404, map[string]string{"error": "not found"})
	}
}

func (s *Server) inboundV1(w http.ResponseWriter, r *http.Request, rest string) {
	if r.Method == http.MethodGet && rest == "mapping-schema" {
		s.requireWMSToken("inbound.mapping-schema", func(w http.ResponseWriter, r *http.Request, rec wmstoken.TokenRecord) {
			writeJSON(w, 200, inbound.MappingSchema())
		})(w, r)
		return
	}
	if r.Method == http.MethodPost && rest == "write" {
		s.requireWMSToken("inbound.write", func(w http.ResponseWriter, r *http.Request, rec wmstoken.TokenRecord) {
			var req inbound.WriteRequest
			if err := decodeBody(r, &req); err != nil {
				writeJSON(w, 400, map[string]string{"error": "Invalid request body"})
				return
			}
			out, err := s.inbound.Write(req, rec.Name)
			if err != nil {
				writeJSON(w, 400, map[string]string{"error": err.Error()})
				return
			}
			if s.events != nil {
				_, _ = s.events.Emit("inbound.write", out)
			}
			if s.wmsAudit != nil {
				_, _ = s.wmsAudit.Record(rec.TokenID, "inbound.write", req.Resource, true, fmt.Sprintf("ok=%v", out["total_ok"]), nil)
			}
			writeJSON(w, 200, out)
		})(w, r)
		return
	}
	writeJSON(w, 404, map[string]string{"error": "not found"})
}

func (s *Server) eventsV1(w http.ResponseWriter, r *http.Request, rest string) {
	switch {
	case r.Method == http.MethodGet && (rest == "" || rest == "/"):
		s.requireWMSToken("events.read", func(w http.ResponseWriter, r *http.Request, rec wmstoken.TokenRecord) {
			list, err := s.events.List(100)
			if err != nil {
				writeJSON(w, 500, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, 200, map[string]any{"events": list, "total": len(list)})
		})(w, r)
	case r.Method == http.MethodGet && rest == "types":
		s.requireWMSToken("events.read", func(w http.ResponseWriter, r *http.Request, rec wmstoken.TokenRecord) {
			writeJSON(w, 200, map[string]any{"types": s.events.Types()})
		})(w, r)
	case r.Method == http.MethodPost && rest == "ack":
		s.requireWMSToken("events.ack", func(w http.ResponseWriter, r *http.Request, rec wmstoken.TokenRecord) {
			var in struct {
				EventID string `json:"event_id"`
			}
			if err := decodeBody(r, &in); err != nil || in.EventID == "" {
				writeJSON(w, 400, map[string]string{"error": "event_id required"})
				return
			}
			if err := s.events.Ack(in.EventID); err != nil {
				writeJSON(w, 404, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, 200, map[string]any{"ok": true})
		})(w, r)
	default:
		writeJSON(w, 404, map[string]string{"error": "not found"})
	}
}

func (s *Server) snapshotV1(w http.ResponseWriter, r *http.Request, rest string) {
	if (r.Method == http.MethodGet || r.Method == http.MethodPost) && rest == "inventory" {
		s.requireWMSToken("snapshot.inventory", func(w http.ResponseWriter, r *http.Request, rec wmstoken.TokenRecord) {
			wid, _ := strconv.ParseInt(r.URL.Query().Get("warehouse_id"), 10, 64)
			if rec.WarehouseID != nil {
				wid = *rec.WarehouseID
			}
			if r.Method == http.MethodPost {
				out, err := s.snapshot.CreateInventory(wid)
				if err != nil {
					writeJSON(w, 500, map[string]string{"error": err.Error()})
					return
				}
				writeJSON(w, 201, out)
				return
			}
			out, err := s.snapshot.Inventory(wid)
			if err != nil {
				writeJSON(w, 500, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, 200, out)
		})(w, r)
		return
	}
	if r.Method == http.MethodGet && strings.HasPrefix(rest, "snapshots/") {
		s.requireWMSToken("snapshot.inventory", func(w http.ResponseWriter, r *http.Request, rec wmstoken.TokenRecord) {
			id := strings.TrimPrefix(rest, "snapshots/")
			if id == "" || strings.Contains(id, "/") {
				writeJSON(w, 400, map[string]string{"error": "invalid snapshot id"})
				return
			}
			out, err := s.snapshot.Get(id)
			if err != nil {
				writeJSON(w, 404, map[string]string{"error": err.Error()})
				return
			}
			if rec.WarehouseID != nil && out.WarehouseID != 0 && out.WarehouseID != *rec.WarehouseID {
				writeJSON(w, 404, map[string]string{"error": "snapshot not found"})
				return
			}
			writeJSON(w, 200, out)
		})(w, r)
		return
	}
	writeJSON(w, 404, map[string]string{"error": "not found"})
}

func (s *Server) webhooksV1(w http.ResponseWriter, r *http.Request, rest string) {
	user, ok := s.authenticatedUser(w, r)
	if !ok {
		return
	}
	if user.Role != "ADMIN" {
		writeJSON(w, 403, map[string]string{"error": "ADMIN required"})
		return
	}
	if rest == "" || rest == "/" {
		switch r.Method {
		case http.MethodGet:
			list, err := s.webhooks.List()
			if err != nil {
				writeJSON(w, 500, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, 200, map[string]any{"webhooks": list, "total": len(list)})
		case http.MethodPost:
			var in struct {
				URL        string   `json:"url"`
				Secret     string   `json:"secret"`
				EventTypes []string `json:"event_types"`
			}
			if err := decodeBody(r, &in); err != nil || in.URL == "" {
				writeJSON(w, 400, map[string]string{"error": "url required"})
				return
			}
			sub, err := s.webhooks.Create(in.URL, in.Secret, in.EventTypes)
			if err != nil {
				writeJSON(w, 500, map[string]string{"error": err.Error()})
				return
			}
			sub.Secret = ""
			writeJSON(w, 201, sub)
		default:
			writeJSON(w, 405, map[string]string{"error": "method not allowed"})
		}
		return
	}
	writeJSON(w, 404, map[string]string{"error": "not found"})
}

func (s *Server) adminTokens(w http.ResponseWriter, r *http.Request) {
	user, ok := s.authenticatedUser(w, r)
	if !ok {
		return
	}
	if user.Role != "ADMIN" {
		writeJSON(w, 403, map[string]string{"error": "ADMIN required"})
		return
	}
	switch r.Method {
	case http.MethodGet:
		list, err := s.wmsTokens.List()
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]any{"tokens": list, "known_scopes": wmstoken.KnownScopes})
	case http.MethodPost:
		var in struct {
			Name        string   `json:"name"`
			Endpoints   []string `json:"endpoints"`
			WarehouseID *int64   `json:"warehouse_id"`
		}
		if err := decodeBody(r, &in); err != nil || strings.TrimSpace(in.Name) == "" {
			writeJSON(w, 400, map[string]string{"error": "name required"})
			return
		}
		tok, err := s.wmsTokens.Create(in.Name, in.Endpoints, in.WarehouseID)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		if s.wmsAudit != nil {
			_, _ = s.wmsAudit.Record(user.Username, "token.create", tok.TokenID, true, tok.Name, nil)
		}
		writeJSON(w, 201, tok)
	default:
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
	}
}

func (s *Server) adminTokenRevoke(w http.ResponseWriter, r *http.Request) {
	user, ok := s.authenticatedUser(w, r)
	if !ok {
		return
	}
	if user.Role != "ADMIN" {
		writeJSON(w, 403, map[string]string{"error": "ADMIN required"})
		return
	}
	if r.Method != http.MethodDelete && r.Method != http.MethodPost {
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
		return
	}
	id := strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/admin/wms-tokens/"), "/")
	if id == "" {
		writeJSON(w, 400, map[string]string{"error": "token_id required"})
		return
	}
	if err := s.wmsTokens.Revoke(id); err != nil {
		writeJSON(w, 404, map[string]string{"error": err.Error()})
		return
	}
	if s.wmsAudit != nil {
		_, _ = s.wmsAudit.Record(user.Username, "token.revoke", id, true, "revoked", nil)
	}
	writeJSON(w, 200, map[string]any{"ok": true, "token_id": id})
}

func (s *Server) auditRecent(w http.ResponseWriter, r *http.Request) {
	user, ok := s.authenticatedUser(w, r)
	if !ok {
		return
	}
	if user.Role != "ADMIN" {
		writeJSON(w, 403, map[string]string{"error": "ADMIN required"})
		return
	}
	n, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if n <= 0 {
		n = 50
	}
	if err := s.wmsAudit.Verify(); err != nil {
		writeJSON(w, 503, map[string]any{"error": "audit_integrity_unverified", "message": err.Error()})
		return
	}
	list, err := s.wmsAudit.Recent(n)
	if err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, 200, map[string]any{"entries": list, "total": len(list), "integrity_verified": true})
}

func (s *Server) meshStatus(w http.ResponseWriter, r *http.Request) {
	user, ok := s.authenticatedUser(w, r)
	if !ok {
		return
	}
	if user.Role != "ADMIN" {
		writeJSON(w, 403, map[string]string{"error": "ADMIN required"})
		return
	}
	if s.mesh == nil {
		writeJSON(w, 200, map[string]any{"peers": []any{}, "engine": "PrismaTec-Core"})
		return
	}
	writeJSON(w, 200, map[string]any{
		"peers": s.mesh.Peers(), "closest": s.mesh.Closest(string(s.node.ID()), 8),
		"engine": "PrismaTec-Core", "layer": "peer-table+ttl-gossip",
	})
}

func (s *Server) rmaRoutes(w http.ResponseWriter, r *http.Request) {
	user, ok := s.authenticatedUser(w, r)
	if !ok {
		return
	}
	path := strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/rma/"), "/")
	switch {
	case r.Method == http.MethodGet && path == "":
		list, err := s.rma.List()
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]any{"rmas": list})
	case r.Method == http.MethodGet && path == "backorders":
		list, err := s.rma.ListBackorders()
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]any{"backorders": list})
	case r.Method == http.MethodPost && path == "":
		var in struct {
			SONumber  string `json:"so_number"`
			Reason    string `json:"reason"`
			Backorder bool   `json:"backorder"`
		}
		if err := decodeBody(r, &in); err != nil {
			writeJSON(w, 400, map[string]string{"error": "Invalid request body"})
			return
		}
		out, err := s.rma.Create(in.SONumber, in.Reason, user.Username, in.Backorder)
		if err != nil {
			if errors.Is(err, rma.ErrNotFound) || strings.Contains(err.Error(), "not found") {
				writeJSON(w, 404, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		if s.events != nil {
			_, _ = s.events.Emit("rma.created", map[string]any{"rma_id": out.RMAID, "so_number": out.SONumber})
		}
		writeJSON(w, 201, out)
	case r.Method == http.MethodGet && path != "" && !strings.Contains(path, "/"):
		id, err := strconv.ParseInt(path, 10, 64)
		if err != nil {
			writeJSON(w, 400, map[string]string{"error": "invalid rma id"})
			return
		}
		out, err := s.rma.Get(id)
		if err != nil {
			writeJSON(w, 404, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, out)
	case r.Method == http.MethodPost && strings.HasSuffix(path, "/receive"):
		id, _ := strconv.ParseInt(strings.TrimSuffix(path, "/receive"), 10, 64)
		out, err := s.rma.Receive(id, user.Username)
		if err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		if s.events != nil {
			_, _ = s.events.Emit("rma.received", map[string]any{"rma_id": out.RMAID})
		}
		writeJSON(w, 200, out)
	case r.Method == http.MethodPost && strings.HasSuffix(path, "/complete"):
		id, _ := strconv.ParseInt(strings.TrimSuffix(path, "/complete"), 10, 64)
		out, err := s.rma.Complete(id, user.Username)
		if err != nil {
			if errors.Is(err, rma.ErrRestockRequired) {
				writeJSON(w, 409, map[string]string{"error": err.Error()})
			} else {
				writeJSON(w, 400, map[string]string{"error": err.Error()})
			}
			return
		}
		if s.events != nil {
			_, _ = s.events.Emit("rma.completed", map[string]any{"rma_id": out.RMAID})
		}
		writeJSON(w, 200, out)
	case r.Method == http.MethodPost && strings.HasSuffix(path, "/cancel"):
		id, _ := strconv.ParseInt(strings.TrimSuffix(path, "/cancel"), 10, 64)
		out, err := s.rma.Cancel(id, user.Username)
		if err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, out)
	default:
		writeJSON(w, 404, map[string]string{"error": "not found"})
	}
}
