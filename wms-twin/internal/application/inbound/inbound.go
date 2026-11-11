package inbound

import (
	"encoding/json"
	"crypto/sha256"
	"encoding/hex"
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
			"sales_orders":    []string{"external_id", "external_version", "so_number", "warehouse_id", "warehouse_code", "customer_name", "notes", "lines[item_id|sku,quantity]"},
			"items":           []string{"external_id", "external_version", "sku", "item_name", "upc", "mpn", "category", "description"},
			"purchase_orders": []string{"external_id", "external_version", "po_number", "warehouse_id", "warehouse_code", "vendor_name", "expected_date", "notes", "lines[item_id|sku,quantity_ordered]"},
		},
		"idempotency": map[string]any{"key": "source_system + resource + external_id", "same_version_same_payload": "replay cached result", "same_version_different_payload": "409 conflict", "newer_version": "requires explicit canonical update mapping"},
		"engine": "PrismaTec-Core",
	}
}

type WriteRequest struct {
	SourceSystem string `json:"source_system"`
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
		sourceSystem := strings.TrimSpace(req.SourceSystem)
		if sourceSystem == "" { sourceSystem, _ = rec["source_system"].(string) }
		externalID, _ := rec["external_id"].(string)
		externalVersion, _ := rec["external_version"].(string)
		idemKey := ""
		fingerprint := ""
		if sourceSystem != "" || externalID != "" {
			if sourceSystem == "" || strings.TrimSpace(externalID) == "" {
				err = fmt.Errorf("source_system and external_id must be supplied together")
			} else {
				canonical, marshalErr := json.Marshal(rec)
				if marshalErr != nil { err = marshalErr } else {
					sum := sha256.Sum256(canonical); fingerprint = hex.EncodeToString(sum[:])
					keySum := sha256.Sum256([]byte(sourceSystem+"|"+resource+"|"+externalID))
					idemKey = hex.EncodeToString(keySum[:])
					if saved, found, readErr := s.store.Get("wms_inbound_idempotency", idemKey); readErr != nil {
						err = readErr
					} else if found {
						var prior struct { Fingerprint string `json:"fingerprint"`; Version string `json:"external_version"`; Result map[string]any `json:"result"` }
						if unmarshalErr := json.Unmarshal(saved.Data, &prior); unmarshalErr != nil { err = unmarshalErr
						} else if prior.Fingerprint == fingerprint && prior.Version == externalVersion { out = prior.Result
						} else if prior.Version == externalVersion { err = fmt.Errorf("inbound idempotency conflict: same external version has a different payload")
						} else { err = fmt.Errorf("inbound version conflict: canonical supersession is not supported for this resource") }
					}
				}
			}
		}
		if err == nil && out == nil {
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
			if err == nil && idemKey != "" {
				data, marshalErr := json.Marshal(map[string]any{"source_system":sourceSystem,"resource":resource,"external_id":externalID,"external_version":externalVersion,"fingerprint":fingerprint,"result":out,"applied_at":time.Now().UTC()})
				if marshalErr != nil { err = marshalErr } else if _, putErr := s.store.Put("wms_inbound_idempotency", idemKey, data); putErr != nil { err = putErr }
			}
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
	wid, _ := integerField(rec["warehouse_id"])
	if wid == 0 {
		if code, ok := rec["warehouse_code"].(string); ok && strings.TrimSpace(code) != "" {
			warehouses, err := s.cat.ListWarehouses()
			if err != nil { return nil, err }
			for _, warehouse := range warehouses { if warehouse.WarehouseCode == code { wid = warehouse.WarehouseID; break } }
		}
	}
	if wid <= 0 { return nil, fmt.Errorf("warehouse_id or a valid warehouse_code is required") }
	rawLines, _ := rec["lines"].([]any)
	lines := make([]salesorders.LineInput, 0)
	for _, rl := range rawLines {
		m, ok := rl.(map[string]any)
		if !ok {
			continue
		}
		itemID, _ := integerField(m["item_id"])
		if itemID <= 0 {
			if sku, ok := m["sku"].(string); ok && strings.TrimSpace(sku) != "" {
				items, err := s.cat.ListItems()
				if err != nil { return nil, err }
				for _, item := range items { if item.SKU == sku { itemID = item.ItemID; break } }
			}
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
	var customerName *string
	if value, ok := rec["customer_name"].(string); ok { customerName = &value }
	var notes *string
	if value, ok := rec["notes"].(string); ok { notes = &value }
	so, err := s.sos.Create(salesorders.CreateInput{SONumber: soNumber, WarehouseID: wid, Lines: lines, CustomerName: customerName, Notes: notes}, actor)
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
		if code, exists := rec["warehouse_code"].(string); exists && strings.TrimSpace(code) != "" {
			warehouses, err := s.cat.ListWarehouses()
			if err != nil { return nil, err }
			for _, warehouse := range warehouses { if warehouse.WarehouseCode == code { warehouseID = warehouse.WarehouseID; ok = true; break } }
		}
	}
	if !ok || warehouseID <= 0 { return nil, fmt.Errorf("warehouse_id or valid warehouse_code required") }
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
		if !okID {
			if sku, exists := line["sku"].(string); exists && strings.TrimSpace(sku) != "" {
				items, err := s.cat.ListItems()
				if err != nil { return nil, err }
				for _, item := range items { if item.SKU == sku { itemID, okID = item.ItemID, true; break } }
			}
		}
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
