package httpapi

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/cyclecounts"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/lookup"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/transfers"
)

func (s *Server) lookupRoute(w http.ResponseWriter, r *http.Request) {
	path := strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/lookup/"), "/")
	parts := strings.Split(path, "/")
	if r.Method != http.MethodGet {
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
		return
	}
	switch {
	case path == "item/search" || (len(parts) == 2 && parts[0] == "item" && parts[1] == "search"):
		items, err := s.lookup.SearchItems(r.URL.Query().Get("q"))
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]any{"items": items})
	case path == "bin/search" || (len(parts) == 2 && parts[0] == "bin" && parts[1] == "search"):
		bins, err := s.lookup.SearchBins(r.URL.Query().Get("q"))
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]any{"bins": bins})
	case len(parts) == 2 && parts[0] == "item":
		out, err := s.lookup.ItemByBarcode(parts[1])
		if errors.Is(err, lookup.ErrNotFound) {
			writeJSON(w, 404, map[string]string{"error": "item not found"})
			return
		}
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, out)
	case len(parts) == 2 && parts[0] == "bin":
		out, err := s.lookup.BinByBarcode(parts[1])
		if errors.Is(err, lookup.ErrNotFound) {
			writeJSON(w, 404, map[string]string{"error": "bin not found"})
			return
		}
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, out)
	case len(parts) == 2 && parts[0] == "so":
		so, err := s.lookup.SOByBarcode(parts[1])
		if err != nil {
			writeJSON(w, 404, map[string]string{"error": "order not found"})
			return
		}
		writeJSON(w, 200, so)
	default:
		writeJSON(w, 404, map[string]string{"error": "not found"})
	}
}

func (s *Server) transfersRoute(w http.ResponseWriter, r *http.Request) {
	path := strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/transfers/"), "/")
	user := userFrom(r)
	allowed, isAdmin := warehouseAccess(user)
	if r.Method == http.MethodPost && path == "move" {
		var in transfers.MoveInput
		if err := decodeBody(r, &in); err != nil {
			writeJSON(w, 400, map[string]string{"error": "Invalid request body"})
			return
		}
		if err := s.transfers.Move(in, allowed, isAdmin); err != nil {
			status := 400
			if errors.Is(err, transfers.ErrScope) {
				status = 403
			}
			writeJSON(w, status, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]any{"status": "ok"})
		return
	}
	writeJSON(w, 404, map[string]string{"error": "not found"})
}

func (s *Server) inventoryRoute(w http.ResponseWriter, r *http.Request) {
	path := strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/inventory/"), "/")
	parts := strings.Split(path, "/")
	user := userFrom(r)
	allowed, isAdmin := warehouseAccess(user)
	actor := ""
	if user != nil {
		actor = user.Username
	}
	switch {
	case r.Method == http.MethodPost && path == "cycle-count/create":
		var in struct {
			WarehouseID int64   `json:"warehouse_id"`
			BinIDs      []int64 `json:"bin_ids"`
		}
		if err := decodeBody(r, &in); err != nil {
			writeJSON(w, 400, map[string]string{"error": "Invalid request body"})
			return
		}
		c, err := s.cycleCounts.Create(in.WarehouseID, in.BinIDs, actor, allowed, isAdmin)
		if err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 201, c)
	case r.Method == http.MethodGet && len(parts) == 2 && parts[0] == "cycle-count":
		id, _ := strconv.ParseInt(parts[1], 10, 64)
		c, err := s.cycleCounts.Get(id)
		if errors.Is(err, cyclecounts.ErrNotFound) {
			writeJSON(w, 404, map[string]string{"error": "not found"})
			return
		}
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, c)
	case r.Method == http.MethodPost && path == "cycle-count/submit":
		var in struct {
			CountID int64                    `json:"count_id"`
			Lines   []cyclecounts.SubmitLine `json:"lines"`
		}
		if err := decodeBody(r, &in); err != nil {
			writeJSON(w, 400, map[string]string{"error": "Invalid request body"})
			return
		}
		c, err := s.cycleCounts.Submit(in.CountID, in.Lines, allowed, isAdmin)
		if err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, c)
	default:
		writeJSON(w, 404, map[string]string{"error": "not found"})
	}
}

// Wave helpers on picking routes (validate + create from SO ids)
func (s *Server) waveValidate(w http.ResponseWriter, r *http.Request) {
	user := userFrom(r)
	allowed, isAdmin := warehouseAccess(user)
	var in struct {
		Barcode     string `json:"barcode"`
		SOBarcode   string `json:"so_barcode"`
		WarehouseID int64  `json:"warehouse_id"`
	}
	if err := decodeBody(r, &in); err != nil {
		writeJSON(w, 400, map[string]string{"error": "Invalid request body"})
		return
	}
	code := in.Barcode
	if code == "" {
		code = in.SOBarcode
	}
	so, err := s.salesOrders.FindByBarcode(code)
	if err != nil {
		writeJSON(w, 404, map[string]string{"error": "order not found"})
		return
	}
	if so.WarehouseID != in.WarehouseID {
		writeJSON(w, 400, map[string]string{"error": "warehouse mismatch"})
		return
	}
	if !isAdmin {
		ok := false
		for _, id := range allowed {
			if id == so.WarehouseID {
				ok = true
				break
			}
		}
		if !ok {
			writeJSON(w, 403, map[string]string{"error": "forbidden"})
			return
		}
	}
	writeJSON(w, 200, map[string]any{"valid": true, "so_id": so.SOID, "so_number": so.SONumber})
}

func (s *Server) waveCreate(w http.ResponseWriter, r *http.Request) {
	user := userFrom(r)
	allowed, isAdmin := warehouseAccess(user)
	username := ""
	if user != nil {
		username = user.Username
	}
	var in struct {
		SOIDs       []int64 `json:"so_ids"`
		WarehouseID int64   `json:"warehouse_id"`
	}
	if err := decodeBody(r, &in); err != nil {
		writeJSON(w, 400, map[string]string{"error": "Invalid request body"})
		return
	}
	ids := make([]string, 0, len(in.SOIDs))
	for _, id := range in.SOIDs {
		ids = append(ids, strconv.FormatInt(id, 10))
	}
	batch, tasks, err := s.picking.CreateBatch(ids, in.WarehouseID, username, allowed, isAdmin)
	if err != nil {
		writeJSON(w, 400, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, 200, map[string]any{"batch": batch, "tasks": tasks, "wave": true})
}
