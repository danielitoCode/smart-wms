package httpapi

import (
	"crypto/subtle"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/catalog"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/cyclecounts"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/dockd"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/events"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/fulfillment"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/identity"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/inbound"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/inventoryledger"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/lookup"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/picking"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/pos"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/purchaseorders"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/receiving"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/rma"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/salesorders"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/snapshot"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/transfers"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/webhooks"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/wmsaudit"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/mesh"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/security/wmstoken"
	"github.com/yecharlot/PrismaTec-Core/core"
)

type Server struct {
	node             *core.Node
	store            *corestore.Store
	ledger           *inventoryledger.Ledger
	catalog          *catalog.Repository
	purchaseOrders   *purchaseorders.Repository
	salesOrders      *salesorders.Repository
	receiving        *receiving.Service
	picking          *picking.Service
	fulfillment      *fulfillment.Service
	lookup           *lookup.Service
	transfers        *transfers.Service
	cycleCounts      *cyclecounts.Service
	pos              *pos.Service
	dockd            *dockd.Service
	inbound          *inbound.Service
	events           *events.Service
	webhooks         *webhooks.Service
	snapshot         *snapshot.Service
	rma              *rma.Service
	wmsTokens        *wmstoken.Store
	wmsAudit         *wmsaudit.Service
	mesh             *mesh.Mesh
	token            string
	users            *identity.Repository
	jwtSecret        []byte
	maxLoginAttempts int
	loginLockout     time.Duration
	requirePacking   bool
}

func New(node *core.Node, store *corestore.Store, token string) *Server {
	return NewWithIdentity(node, store, token, identity.New(store), []byte(os.Getenv("JWT_SECRET")), 5, 15*time.Minute, true)
}

func NewWithIdentity(node *core.Node, store *corestore.Store, token string, users *identity.Repository, jwtSecret []byte, maxLoginAttempts int, loginLockout time.Duration, requirePacking bool) *Server {
	if users == nil {
		users = identity.New(store)
	}
	if maxLoginAttempts < 1 {
		maxLoginAttempts = 5
	}
	if loginLockout <= 0 {
		loginLockout = 15 * time.Minute
	}
	ledger := inventoryledger.New(store)
	master := catalog.New(store, ledger)
	poRepo := purchaseorders.New(store, master)
	sos := salesorders.New(store, master)
	ful := fulfillment.New(store, sos)
	transport := node.Transport()
	meshLayer := mesh.New(string(node.ID()), transport)
	if transport != nil {
		for _, p := range transport.Peers() {
			addr := ""
			if len(p.Addrs) > 0 {
				addr = p.Addrs[0]
			}
			meshLayer.UpsertPeer(p.NodeID, addr)
		}
	}
	auditSvc := wmsaudit.New(store, node.Audit())
	wh := webhooks.New(store)
	ev := events.New(store, meshLayer)
	ev.OnRemote(func(event events.Event) {
		_ = wh.DeliverEvent(event.EventID, event.Type, event.Payload)
	})
	posSvc := pos.New(store, master, sos, ledger, ful)
	return &Server{
		node: node, store: store, ledger: ledger, catalog: master,
		purchaseOrders: poRepo, salesOrders: sos,
		receiving:   receiving.New(store, master, poRepo, ledger),
		picking:     picking.New(store, master, sos, ledger),
		fulfillment: ful,
		lookup:      lookup.New(master, ledger, sos),
		transfers:   transfers.New(master, ledger),
		cycleCounts: cyclecounts.New(store, master, ledger),
		pos:         posSvc,
		dockd:       dockd.New(sos, master, ful),
		inbound:     inbound.New(store, master, sos, poRepo),
		events:      ev,
		webhooks:    wh,
		snapshot:    snapshot.New(store, ledger),
		rma:         rma.New(store, sos, master, ledger),
		wmsTokens:   wmstoken.NewStore(store),
		wmsAudit:    auditSvc,
		mesh:        meshLayer,
		token:       token,
		users:       users, jwtSecret: append([]byte(nil), jwtSecret...),
		maxLoginAttempts: maxLoginAttempts, loginLockout: loginLockout,
		requirePacking: requirePacking,
	}
}
// StartBackground starts supervised outbox workers under the runtime context.
func (s *Server) StartBackground(ctx context.Context) {
	if s.mesh != nil {
		if err := s.mesh.Start(ctx); err != nil { log.Printf("WMS mesh startup: %v", err) }
	}
	if s.webhooks != nil { go s.webhooks.Run(ctx, time.Second) }
	if s.events != nil {
		go func() {
			ticker := time.NewTicker(5 * time.Second)
			defer ticker.Stop()
			for {
				select {
				case <-ctx.Done(): return
				case <-ticker.C: _ = s.events.PublishPending()
				}
			}
		}()
	}
}

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/health", s.health)
	mux.HandleFunc("/api/auth/", s.authRoute)
	mux.HandleFunc("/api/admin/system-info", s.RequireAuth(s.systemInfo))
	mux.HandleFunc("/api/admin/users", s.RequireAuth(s.adminUsers))
	mux.HandleFunc("/api/admin/wms-tokens", s.RequireAuth(s.adminTokens))
	mux.HandleFunc("/api/admin/wms-tokens/", s.RequireAuth(s.adminTokenRevoke))
	mux.HandleFunc("/api/admin/audit", s.RequireAuth(s.auditRecent))
	mux.HandleFunc("/api/admin/mesh", s.RequireAuth(s.meshStatus))
	mux.HandleFunc("/api/admin/", s.RequireAuth(s.adminCatalog))
	mux.HandleFunc("/api/v1/", s.v1Route)
	mux.HandleFunc("/api/rma", s.RequireAuth(s.rmaRoutes))
	mux.HandleFunc("/api/rma/", s.RequireAuth(s.rmaRoutes))
	mux.HandleFunc("/api/receiving/", s.RequireAuth(s.receivingRoute))
	mux.HandleFunc("/api/putaway/", s.RequireAuth(s.putawayRoute))
	mux.HandleFunc("/api/picking/", s.RequireAuth(s.pickingRoute))
	mux.HandleFunc("/api/packing/", s.RequireAuth(s.packingRoute))
	mux.HandleFunc("/api/shipping/", s.RequireAuth(s.shippingRoute))
	mux.HandleFunc("/api/lookup/", s.RequireAuth(s.lookupRoute))
	mux.HandleFunc("/api/transfers/", s.RequireAuth(s.transfersRoute))
	mux.HandleFunc("/api/inventory/", s.RequireAuth(s.inventoryRoute))
	mux.HandleFunc("/api/twin/info", s.authorize(s.info))
	mux.HandleFunc("/api/twin/records/", s.authorize(s.records))
	mux.HandleFunc("/api/twin/inventory/", s.authorize(s.inventory))
	return withCORS(mux)
}

// withCORS permite la demo HTML (file:// u otro origen) contra el twin local.
func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin == "" {
			origin = "*"
		}
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-CSRF-Token, X-Requested-With, X-WMS-Token")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Vary", "Origin")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
func (s *Server) health(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
		return
	}
	// Compat: el original responde service=sentry-wms. En modo compat se iguala
	// para que probes/monitores compartidos no fallen.
	service := "smart-wms-twin"
	if strings.EqualFold(strings.TrimSpace(os.Getenv("WMS_TWIN_HEALTH_SERVICE")), "sentry-wms") {
		service = "sentry-wms"
	}
	writeJSON(w, 200, map[string]any{
		"status": "ok", "service": service, "engine": "PrismaTec-Core",
		"twin": "smart-wms-twin", "time": time.Now().UTC(),
	})
}
func (s *Server) authorize(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if s.token == "" {
			writeJSON(w, 503, map[string]string{"error": "WMS_TWIN_API_TOKEN is not configured"})
			return
		}
		authorization := strings.TrimSpace(r.Header.Get("Authorization"))
		scheme, v, ok := strings.Cut(authorization, " ")
		v = strings.TrimSpace(v)
		if !ok || !strings.EqualFold(scheme, "Bearer") || v == "" || len(v) != len(s.token) || subtle.ConstantTimeCompare([]byte(v), []byte(s.token)) != 1 {
			writeJSON(w, 401, map[string]string{"error": "Unauthorized"})
			return
		}
		next(w, r)
	}
}
func (s *Server) info(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
		return
	}
	writeJSON(w, 200, map[string]any{"service": "smart-wms-twin", "core": s.node.Info(), "aip_base": "/aip/v1", "storage": "PrismaTec organism memory + local CID block store"})
}
func (s *Server) records(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/twin/records/"), "/"), "/")
	if len(parts) < 1 || !validPathPart(parts[0]) {
		writeJSON(w, 400, map[string]string{"error": "invalid record kind"})
		return
	}
	kind := parts[0]
	if len(parts) == 1 {
		switch r.Method {
		case http.MethodGet:
			records, err := s.store.List(kind)
			if err != nil {
				writeJSON(w, 500, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, 200, map[string]any{"records": records, "total": len(records)})
		case http.MethodPost:
			body, err := readJSON(r)
			if err != nil {
				writeJSON(w, 400, map[string]string{"error": err.Error()})
				return
			}
			id := fmt.Sprint(body["id"])
			if id == "" || id == "<nil>" {
				id = strconv.FormatInt(time.Now().UTC().UnixNano(), 10)
			}
			delete(body, "id")
			data, _ := json.Marshal(body)
			rec, err := s.store.Put(kind, id, data)
			if err != nil {
				writeStoreError(w, err, rec)
				return
			}
			writeJSON(w, 201, rec)
		default:
			writeJSON(w, 405, map[string]string{"error": "method not allowed"})
		}
		return
	}
	if len(parts) != 2 || !validPathPart(parts[1]) {
		writeJSON(w, 400, map[string]string{"error": "invalid record id"})
		return
	}
	id := parts[1]
	switch r.Method {
	case http.MethodGet:
		rec, ok, err := s.store.Get(kind, id)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		if !ok {
			writeJSON(w, 404, map[string]string{"error": "record not found"})
			return
		}
		writeJSON(w, 200, rec)
	case http.MethodPut, http.MethodPatch:
		body, err := readJSON(r)
		if err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		delete(body, "id")
		data, _ := json.Marshal(body)
		rec, err := s.store.Put(kind, id, data)
		if err != nil {
			writeStoreError(w, err, rec)
			return
		}
		writeJSON(w, 200, rec)
	case http.MethodDelete:
		if err := s.store.Delete(kind, id); err != nil {
			var re *corestore.ReplicationError
			if errors.As(err, &re) {
				writeJSON(w, 503, map[string]any{"error": "replication_pending", "message": err.Error(), "local_commit": true})
				return
			}
			if errors.Is(err, corestore.ErrNotPrimary) {
				writeJSON(w, 409, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]string{"message": "record deleted"})
	default:
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
	}
}
func writeStoreError(w http.ResponseWriter, err error, rec corestore.Record) {
	var re *corestore.ReplicationError
	if errors.As(err, &re) {
		writeJSON(w, 503, map[string]any{"error": "replication_pending", "message": err.Error(), "local_commit": true, "record": rec})
		return
	}
	if errors.Is(err, corestore.ErrNotPrimary) {
		writeJSON(w, 409, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, 400, map[string]string{"error": err.Error()})
}
func readJSON(r *http.Request) (map[string]any, error) {
	defer r.Body.Close()
	data, err := io.ReadAll(io.LimitReader(r.Body, (1<<20)+1))
	if err != nil {
		return nil, err
	}
	if len(data) > 1<<20 {
		return nil, fmt.Errorf("request body exceeds 1 MiB")
	}
	var body map[string]any
	if err := json.Unmarshal(data, &body); err != nil {
		return nil, err
	}
	if body == nil {
		return nil, fmt.Errorf("JSON object is required")
	}
	return body, nil
}
func validPathPart(v string) bool {
	if v == "" || len(v) > 128 {
		return false
	}
	for _, r := range v {
		if !(r >= 'a' && r <= 'z') && !(r >= 'A' && r <= 'Z') && !(r >= '0' && r <= '9') && r != '-' && r != '_' {
			return false
		}
	}
	return true
}
