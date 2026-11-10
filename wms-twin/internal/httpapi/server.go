package httpapi

import (
	"crypto/subtle"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/yecharlot/PrismaTec-Core/core"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
)

type Server struct {
	node  *core.Node
	store *corestore.Store
	token string
}

func New(node *core.Node, store *corestore.Store, token string) *Server {
	return &Server{node: node, store: store, token: token}
}

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/health", s.health)
	mux.HandleFunc("/api/twin/info", s.authorize(s.info))
	mux.HandleFunc("/api/twin/records/", s.authorize(s.records))
	return mux
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func (s *Server) health(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok", "service": "smart-wms-twin", "time": time.Now().UTC()})
}

func (s *Server) authorize(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if s.token == "" {
			writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "WMS_TWIN_API_TOKEN is not configured"})
			return
		}
		header := strings.TrimSpace(strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer "))
		if header == "" || len(header) != len(s.token) || subtle.ConstantTimeCompare([]byte(header), []byte(s.token)) != 1 {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
			return
		}
		next(w, r)
	}
}

func (s *Server) info(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"service": "smart-wms-twin",
		"core": s.node.Info(),
		"aip_base": "/aip/v1",
		"storage": "PrismaTec organism memory + local CID block store",
	})
}

func (s *Server) records(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/twin/records/"), "/"), "/")
	if len(parts) < 1 || !validPathPart(parts[0]) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid record kind"})
		return
	}
	kind := parts[0]
	if len(parts) == 1 {
		switch r.Method {
		case http.MethodGet:
			records, err := s.store.List(kind)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, http.StatusOK, map[string]any{"records": records, "total": len(records)})
		case http.MethodPost:
			body, err := readJSON(r)
			if err != nil {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
				return
			}
			id := fmt.Sprint(body["id"])
			if id == "" || id == "<nil>" {
				id = strconv.FormatInt(time.Now().UTC().UnixNano(), 10)
			}
			delete(body, "id")
			data, _ := json.Marshal(body)
			record, err := s.store.Put(kind, id, data)
			if err != nil {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, http.StatusCreated, record)
		default:
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		}
		return
	}
	if len(parts) != 2 || !validPathPart(parts[1]) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid record id"})
		return
	}
	id := parts[1]
	switch r.Method {
	case http.MethodGet:
		record, ok, err := s.store.Get(kind, id)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		if !ok {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "record not found"})
			return
		}
		writeJSON(w, http.StatusOK, record)
	case http.MethodPut, http.MethodPatch:
		body, err := readJSON(r)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		delete(body, "id")
		data, _ := json.Marshal(body)
		record, err := s.store.Put(kind, id, data)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, record)
	case http.MethodDelete:
		if err := s.store.Delete(kind, id); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"message": "record deleted"})
	default:
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
	}
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

func validPathPart(value string) bool {
	if value == "" || len(value) > 128 {
		return false
	}
	for _, r := range value {
		if !(r >= 'a' && r <= 'z') && !(r >= 'A' && r <= 'Z') && !(r >= '0' && r <= '9') && r != '-' && r != '_' {
			return false
		}
	}
	return true
}
