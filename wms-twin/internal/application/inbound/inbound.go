package inbound

import (
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/catalog"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/salesorders"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
)

type Service struct {
	store *corestore.Store
	cat   *catalog.Repository
	sos   *salesorders.Repository
	mu    sync.Mutex
}

func New(store *corestore.Store, cat *catalog.Repository, sos *salesorders.Repository) *Service {
	return &Service{store: store, cat: cat, sos: sos}
}

func MappingSchema() map[string]any {
	return map[string]any{
		"version":   1,
		"resources": []string{"sales_orders", "items", "purchase_orders"},
		"fields": map[string]any{
			"sales_orders":    []string{"external_id", "so_number", "warehouse_id", "warehouse_code", "lines"},
			"items":           []string{"sku", "item_name", "upc"},
			"purchase_orders": []string{"po_number", "warehouse_code", "lines"},
		},
		"engine": "PrismaTec-Core",
	}
}

type WriteRequest struct {
	Resource string           `json:"resource"`
	Records  []map[string]any `json:"records"`
}

func (s *Service) Write(req WriteRequest, actor string) (map[string]any, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	resource := strings.ToLower(strings.TrimSpace(req.Resource))
	created := make([]map[string]any, 0)
	errorsOut := make([]map[string]any, 0)
	for i, rec := range req.Records {
		var out map[string]any
		var err error
		switch resource {
		case "items":
			out, err = s.writeItem(rec)
		case "sales_orders", "sales-orders":
			out, err = s.writeSO(rec, actor)
		case "purchase_orders", "purchase-orders":
			out, err = s.writePOShadow(rec, actor)
		default:
			return nil, fmt.Errorf("unsupported resource %q", req.Resource)
		}
		if err != nil {
			errorsOut = append(errorsOut, map[string]any{"index": i, "error": err.Error()})
			continue
		}
		created = append(created, out)
	}
	return map[string]any{
		"resource": resource, "created": created, "errors": errorsOut,
		"total_ok": len(created), "total_err": len(errorsOut), "actor": actor,
		"at": time.Now().UTC(), "engine": "PrismaTec-Core",
	}, nil
}

func (s *Service) writeItem(rec map[string]any) (map[string]any, error) {
	sku, _ := rec["sku"].(string)
	name, _ := rec["item_name"].(string)
	if sku == "" || name == "" {
		return nil, fmt.Errorf("sku and item_name required")
	}
	var upc *string
	if u, ok := rec["upc"].(string); ok && u != "" {
		upc = &u
	}
	item, err := s.cat.CreateItem(catalog.ItemInput{SKU: sku, ItemName: name, UPC: upc})
	if err != nil {
		return nil, err
	}
	return map[string]any{"item_id": item.ItemID, "sku": item.SKU}, nil
}

func (s *Service) writeSO(rec map[string]any, actor string) (map[string]any, error) {
	soNumber, _ := rec["so_number"].(string)
	if soNumber == "" {
		if eid, ok := rec["external_id"].(string); ok {
			soNumber = eid
		}
	}
	if soNumber == "" {
		return nil, fmt.Errorf("so_number required")
	}
	wid := int64(0)
	switch v := rec["warehouse_id"].(type) {
	case float64:
		wid = int64(v)
	case int64:
		wid = v
	case int:
		wid = int64(v)
	}
	if wid == 0 {
		return nil, fmt.Errorf("warehouse_id required")
	}
	rawLines, _ := rec["lines"].([]any)
	lines := make([]salesorders.LineInput, 0)
	for _, rl := range rawLines {
		m, ok := rl.(map[string]any)
		if !ok {
			continue
		}
		itemID := int64(0)
		switch v := m["item_id"].(type) {
		case float64:
			itemID = int64(v)
		case int64:
			itemID = v
		}
		qty := int64(0)
		switch v := m["quantity"].(type) {
		case float64:
			qty = int64(v)
		case int64:
			qty = v
		}
		if itemID > 0 && qty > 0 {
			lines = append(lines, salesorders.LineInput{ItemID: itemID, QuantityOrdered: qty})
		}
	}
	if len(lines) == 0 {
		return nil, fmt.Errorf("at least one line required")
	}
	so, err := s.sos.Create(salesorders.CreateInput{SONumber: soNumber, WarehouseID: wid, Lines: lines}, actor)
	if err != nil {
		return nil, err
	}
	return map[string]any{"so_id": so.SOID, "so_number": so.SONumber}, nil
}

func (s *Service) writePOShadow(rec map[string]any, actor string) (map[string]any, error) {
	poNumber, _ := rec["po_number"].(string)
	if poNumber == "" {
		return nil, fmt.Errorf("po_number required")
	}
	return map[string]any{
		"po_number": poNumber, "status": "ACCEPTED_SHADOW",
		"note": "PO write maps to shadow record; use /api/admin purchase-orders for full PO lifecycle",
		"actor": actor,
	}, nil
}
