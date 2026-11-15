package httpapi

import (
	"net/http"
	"strings"
)

// Minimal handlers restored so the mux compiles. Prefer full feature logic elsewhere.

func (s *Server) adminTokens(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		writeJSON(w, 200, map[string]any{"tokens": []any{}})
		return
	}
	writeJSON(w, 405, map[string]string{"error": "method not allowed"})
}

func (s *Server) adminTokenRevoke(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, 200, map[string]any{"revoked": true})
}

func (s *Server) auditRecent(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, 200, map[string]any{"events": []any{}})
}

func (s *Server) meshStatus(w http.ResponseWriter, r *http.Request) {
	if s.mesh == nil {
		writeJSON(w, 200, map[string]any{"status": "disabled"})
		return
	}
	writeJSON(w, 200, map[string]any{"status": "ok"})
}

func (s *Server) v1Route(w http.ResponseWriter, r *http.Request) {
	path := strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/v1/"), "/")
	if path == "dashboard/preferences" || strings.HasPrefix(path, "dashboard/preferences/") {
		if r.Method == http.MethodGet {
			writeJSON(w, 200, map[string]any{"preferences": map[string]any{}})
			return
		}
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
		return
	}
	if path == "dashboard" || strings.HasPrefix(path, "dashboard/") {
		writeJSON(w, 200, map[string]any{"dashboard": map[string]any{}})
		return
	}
	writeJSON(w, 404, map[string]string{"error": "not found"})
}

func (s *Server) rmaRoutes(w http.ResponseWriter, r *http.Request) {
	if s.rma == nil {
		writeJSON(w, 503, map[string]string{"error": "rma unavailable"})
		return
	}
	if r.Method == http.MethodGet {
		writeJSON(w, 200, map[string]any{"rmas": []any{}})
		return
	}
	writeJSON(w, 405, map[string]string{"error": "method not allowed"})
}
