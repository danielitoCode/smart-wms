package inbound

import (
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/catalog"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/purchaseorders"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/salesorders"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
)

type Service struct {
	store *corestore.Store
	cat   *catalog.Repository
	sos   *salesorders.Repository
	pos   *purchaseorders.Repository
	mu    sync.Mutex
}

func New(store *corestore.Store, cat *catalog.Repository, sos *salesorders.Repository, pos *purchaseorders.Repository) *Service {
	return &Service{store: store, cat: cat, sos: sos, pos: pos}
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
			out, err = s.writePO(rec, actor)
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

func (s *Service) writePO(rec map[string]any, actor string) (map[string]any, error) {
	if s.pos == nil {
		return nil, fmt.Errorf("purchase-order repository is not configured")
	}
	poNumber, _ := rec["po_number"].(string)
	if strings.TrimSpace(poNumber) == "" {
		return nil, fmt.Errorf("po_number required")
	}
	warehouseID, ok := integerField(rec["warehouse_id"])
	if !ok || warehouseID <= 0 {
		return nil, fmt.Errorf("warehouse_id must be a positive integer")
	}
	rawLines, ok := rec["lines"].([]any)
	if !ok || len(rawLines) == 0 {
		return nil, fmt.Errorf("at least one purchase-order line is required")
	}
	lines := make([]purchaseorders.LineInput, 0, len(rawLines))
	for i, raw := range rawLines {
		line, ok := raw.(map[string]any)
		if !ok {
			return nil, fmt.Errorf("line %d must be an object", i)
		}
		itemID, okID := integerField(line["item_id"])
		quantity, okQty := integerField(line["quantity_ordered"])
		if !okQty {
			quantity, okQty = integerField(line["quantity"])
		}
		if !okID || !okQty || itemID <= 0 || quantity <= 0 {
			return nil, fmt.Errorf("line %d requires positive item_id and quantity", i)
		}
		lines = append(lines, purchaseorders.LineInput{ItemID: itemID, QuantityOrdered: quantity})
	}
	var vendor *string
	if value, ok := rec["vendor_name"].(string); ok && strings.TrimSpace(value) != "" {
		vendor = &value
	}
	var expected *string
	if value, ok := rec["expected_date"].(string); ok && value != "" {
		expected = &value
	}
	var notes *string
	if value, ok := rec["notes"].(string); ok && value != "" {
		notes = &value
	}
	po, err := s.pos.Create(purchaseorders.CreateInput{
		PONumber: poNumber, WarehouseID: warehouseID, Lines: lines,
		VendorName: vendor, ExpectedDate: expected, Notes: notes,
	}, actor)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"po_id": po.POID, "po_number": po.PONumber, "status": po.Status,
		"warehouse_id": po.WarehouseID, "lines": po.Lines, "created_by": actor,
	}, nil
}

func integerField(value any) (int64, bool) {
	switch number := value.(type) {
	case float64:
		if number != float64(int64(number)) {
			return 0, false
		}
		return int64(number), true
	case int:
		return int64(number), true
	case int64:
		return number, true
	case json.Number:
		parsed, err := number.Int64()
		return parsed, err == nil
	default:
		return 0, false
	}
}
