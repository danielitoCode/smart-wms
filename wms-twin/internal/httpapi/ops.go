package httpapi

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/fulfillment"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/identity"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/picking"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/receiving"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/salesorders"
)

func userFrom(r *http.Request) *identity.User {
	if v, ok := r.Context().Value(authContextKey{}).(identity.User); ok {
		u := v
		return &u
	}
	return nil
}

func warehouseAccess(user *identity.User) ([]int64, bool) {
	if user == nil {
		return nil, false
	}
	return user.WarehouseIDs, user.Role == "ADMIN"
}

func decodeBody(r *http.Request, dst any) error {
	defer r.Body.Close()
	dec := json.NewDecoder(io.LimitReader(r.Body, 1<<20))
	return dec.Decode(dst)
}

func (s *Server) receivingRoute(w http.ResponseWriter, r *http.Request) {
	path := strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/receiving/"), "/")
	parts := strings.Split(path, "/")
	user := userFrom(r)
	allowed, isAdmin := warehouseAccess(user)
	actor := ""
	if user != nil {
		actor = user.Username
	}
	switch {
	case r.Method == http.MethodGet && len(parts) == 2 && parts[0] == "po":
		po, err := s.receiving.LookupPO(parts[1], allowed, isAdmin)
		if errors.Is(err, receiving.ErrNotFound) {
			writeJSON(w, 404, map[string]string{"error": "Purchase order not found"})
			return
		}
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, po)
	case r.Method == http.MethodPost && parts[0] == "receive":
		var in receiving.ReceiveInput
		if err := decodeBody(r, &in); err != nil {
			writeJSON(w, 400, map[string]string{"error": "Invalid request body"})
			return
		}
		receipts, po, err := s.receiving.Receive(in, actor, allowed, isAdmin)
		if err != nil {
			status := 400
			if errors.Is(err, receiving.ErrNotFound) {
				status = 404
			} else if errors.Is(err, receiving.ErrWarehouse) {
				status = 403
			}
			writeJSON(w, status, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]any{"receipts": receipts, "purchase_order": po})
	case r.Method == http.MethodPost && parts[0] == "cancel":
		var in receiving.CancelInput
		if err := decodeBody(r, &in); err != nil {
			writeJSON(w, 400, map[string]string{"error": "Invalid request body"})
			return
		}
		receipts, err := s.receiving.Cancel(in, actor, allowed, isAdmin)
		if err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]any{"cancelled": receipts})
	default:
		writeJSON(w, 404, map[string]string{"error": "not found"})
	}
}

func (s *Server) putawayRoute(w http.ResponseWriter, r *http.Request) {
	path := strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/putaway/"), "/")
	parts := strings.Split(path, "/")
	user := userFrom(r)
	allowed, isAdmin := warehouseAccess(user)
	switch {
	case r.Method == http.MethodGet && len(parts) == 2 && parts[0] == "pending":
		wid, _ := strconv.ParseInt(parts[1], 10, 64)
		pending, err := s.receiving.PendingPutaway(wid, allowed, isAdmin)
		if err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]any{"pending_items": pending})
	case r.Method == http.MethodGet && len(parts) == 2 && parts[0] == "suggest":
		itemID, _ := strconv.ParseInt(parts[1], 10, 64)
		wid := int64(0)
		if user != nil && len(user.WarehouseIDs) > 0 {
			wid = user.WarehouseIDs[0]
		}
		if q := r.URL.Query().Get("warehouse_id"); q != "" {
			wid, _ = strconv.ParseInt(q, 10, 64)
		}
		code, _ := s.receiving.SuggestBin(itemID, wid)
		writeJSON(w, 200, map[string]any{"suggested_bin": code})
	case r.Method == http.MethodPost && parts[0] == "confirm":
		var in receiving.ConfirmPutawayInput
		if err := decodeBody(r, &in); err != nil {
			writeJSON(w, 400, map[string]string{"error": "Invalid request body"})
			return
		}
		if err := s.receiving.ConfirmPutaway(in, allowed, isAdmin); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]any{"status": "ok"})
	default:
		writeJSON(w, 404, map[string]string{"error": "not found"})
	}
}

func (s *Server) pickingRoute(w http.ResponseWriter, r *http.Request) {
	path := strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/picking/"), "/")
	parts := strings.Split(path, "/")
	user := userFrom(r)
	allowed, isAdmin := warehouseAccess(user)
	username := ""
	if user != nil {
		username = user.Username
	}
	switch {
	case r.Method == http.MethodGet && path == "active-batch":
		out, err := s.picking.ActiveBatch(username)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, out)
	case r.Method == http.MethodPost && path == "create-batch":
		var in struct {
			SOIdentifiers []string `json:"so_identifiers"`
			WarehouseID   int64    `json:"warehouse_id"`
		}
		if err := decodeBody(r, &in); err != nil {
			writeJSON(w, 400, map[string]string{"error": "Invalid request body"})
			return
		}
		batch, tasks, err := s.picking.CreateBatch(in.SOIdentifiers, in.WarehouseID, username, allowed, isAdmin)
		if err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]any{"batch": batch, "tasks": tasks})
	case r.Method == http.MethodGet && len(parts) == 2 && parts[0] == "batch":
		id, _ := strconv.ParseInt(parts[1], 10, 64)
		batch, tasks, err := s.picking.GetBatch(id)
		if errors.Is(err, picking.ErrNotFound) {
			writeJSON(w, 404, map[string]string{"error": "batch not found"})
			return
		}
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]any{"batch": batch, "tasks": tasks})
	case r.Method == http.MethodGet && len(parts) == 3 && parts[0] == "batch" && parts[2] == "next":
		id, _ := strconv.ParseInt(parts[1], 10, 64)
		out, err := s.picking.NextTask(id)
		if err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, out)
	case r.Method == http.MethodPost && path == "confirm":
		var in struct {
			PickTaskID     int64  `json:"pick_task_id"`
			ScannedBarcode string `json:"scanned_barcode"`
			QuantityPicked int64  `json:"quantity_picked"`
		}
		if err := decodeBody(r, &in); err != nil {
			writeJSON(w, 400, map[string]string{"error": "Invalid request body"})
			return
		}
		task, err := s.picking.Confirm(in.PickTaskID, in.ScannedBarcode, in.QuantityPicked)
		if err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, task)
	case r.Method == http.MethodPost && path == "short":
		var in struct {
			PickTaskID        int64 `json:"pick_task_id"`
			QuantityAvailable int64 `json:"quantity_available"`
		}
		if err := decodeBody(r, &in); err != nil {
			writeJSON(w, 400, map[string]string{"error": "Invalid request body"})
			return
		}
		task, err := s.picking.Short(in.PickTaskID, in.QuantityAvailable)
		if err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, task)
	case r.Method == http.MethodPost && path == "complete-batch":
		var in struct {
			BatchID int64 `json:"batch_id"`
		}
		if err := decodeBody(r, &in); err != nil {
			writeJSON(w, 400, map[string]string{"error": "Invalid request body"})
			return
		}
		batch, err := s.picking.CompleteBatch(in.BatchID)
		if err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, batch)
	case r.Method == http.MethodPost && path == "cancel-batch":
		var in struct {
			BatchID int64 `json:"batch_id"`
		}
		if err := decodeBody(r, &in); err != nil {
			writeJSON(w, 400, map[string]string{"error": "Invalid request body"})
			return
		}
		batch, err := s.picking.CancelBatch(in.BatchID)
		if err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, batch)
	default:
		writeJSON(w, 404, map[string]string{"error": "not found"})
	}
}

func (s *Server) packingRoute(w http.ResponseWriter, r *http.Request) {
	path := strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/packing/"), "/")
	parts := strings.Split(path, "/")
	user := userFrom(r)
	allowed, isAdmin := warehouseAccess(user)
	switch {
	case r.Method == http.MethodGet && len(parts) == 2 && parts[0] == "order":
		so, err := s.fulfillment.LookupPackOrder(parts[1], allowed, isAdmin)
		if errors.Is(err, fulfillment.ErrNotFound) {
			writeJSON(w, 404, map[string]string{"error": "order not found"})
			return
		}
		writeJSON(w, 200, so)
	case r.Method == http.MethodPost && path == "verify":
		var in struct {
			SOID     int64 `json:"so_id"`
			ItemID   int64 `json:"item_id"`
			Quantity int64 `json:"quantity"`
		}
		if err := decodeBody(r, &in); err != nil {
			writeJSON(w, 400, map[string]string{"error": "Invalid request body"})
			return
		}
		so, err := s.fulfillment.VerifyPack(in.SOID, in.ItemID, in.Quantity, allowed, isAdmin)
		if err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, so)
	case r.Method == http.MethodPost && path == "complete":
		var in struct {
			SOID int64 `json:"so_id"`
		}
		if err := decodeBody(r, &in); err != nil {
			writeJSON(w, 400, map[string]string{"error": "Invalid request body"})
			return
		}
		so, err := s.fulfillment.CompletePack(in.SOID, allowed, isAdmin)
		if err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, so)
	default:
		writeJSON(w, 404, map[string]string{"error": "not found"})
	}
}

func (s *Server) shippingRoute(w http.ResponseWriter, r *http.Request) {
	path := strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/shipping/"), "/")
	parts := strings.Split(path, "/")
	user := userFrom(r)
	allowed, isAdmin := warehouseAccess(user)
	switch {
	case r.Method == http.MethodGet && len(parts) == 2 && parts[0] == "order":
		so, err := s.fulfillment.LookupPackOrder(parts[1], allowed, isAdmin)
		if err != nil {
			writeJSON(w, 404, map[string]string{"error": "order not found"})
			return
		}
		writeJSON(w, 200, so)
	case r.Method == http.MethodPost && path == "fulfill":
		var in fulfillment.FulfillInput
		if err := decodeBody(r, &in); err != nil {
			writeJSON(w, 400, map[string]string{"error": "Invalid request body"})
			return
		}
		ship, err := s.fulfillment.Fulfill(in, allowed, isAdmin)
		if err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, ship)
	default:
		writeJSON(w, 404, map[string]string{"error": "not found"})
	}
}

func (s *Server) salesOrdersAdmin(w http.ResponseWriter, r *http.Request, rest string) {
	user := userFrom(r)
	allowed, isAdmin := warehouseAccess(user)
	parts := strings.Split(strings.Trim(rest, "/"), "/")
	if r.Method == http.MethodGet && (rest == "" || rest == "/") {
		list, err := s.salesOrders.List()
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		out := make([]salesorders.SalesOrder, 0)
		for _, so := range list {
			if isAdmin || containsInt64(allowed, so.WarehouseID) {
				out = append(out, so)
			}
		}
		writeJSON(w, 200, map[string]any{"sales_orders": out})
		return
	}
	if r.Method == http.MethodPost && (rest == "" || rest == "/") {
		var in salesorders.CreateInput
		if err := decodeBody(r, &in); err != nil {
			writeJSON(w, 400, map[string]string{"error": "Invalid request body"})
			return
		}
		if !isAdmin && !containsInt64(allowed, in.WarehouseID) {
			writeJSON(w, 403, map[string]string{"error": "Access denied"})
			return
		}
		actor := ""
		if user != nil {
			actor = user.Username
		}
		so, err := s.salesOrders.Create(in, actor)
		if err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 201, so)
		return
	}
	if len(parts) >= 1 && parts[0] != "" {
		id, _ := strconv.ParseInt(parts[0], 10, 64)
		so, err := s.salesOrders.Get(id)
		if err != nil {
			writeJSON(w, 404, map[string]string{"error": "not found"})
			return
		}
		writeJSON(w, 200, so)
		return
	}
	writeJSON(w, 404, map[string]string{"error": "not found"})
}
