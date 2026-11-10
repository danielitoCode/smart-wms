package httpapi

import (
	"crypto/subtle"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/inventoryledger"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
	"github.com/yecharlot/PrismaTec-Core/core"
)

type Server struct {
	node   *core.Node
	store  *corestore.Store
	ledger *inventoryledger.Ledger
	token  string
}

func New(node *core.Node, store *corestore.Store, token string) *Server {
	return &Server{node: node, store: store, ledger: inventoryledger.New(store), token: token}
}
func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/health", s.health)
	mux.HandleFunc("/api/twin/info", s.authorize(s.info))
	mux.HandleFunc("/api/twin/records/", s.authorize(s.records))
	mux.HandleFunc("/api/twin/inventory/", s.authorize(s.inventory))
	return mux
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
	writeJSON(w, 200, map[string]any{"status": "ok", "service": "smart-wms-twin", "time": time.Now().UTC()})
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
