package inbound

import (
	"encoding/json"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math"
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
		"version":   2,
		"resources": []string{"sales_orders", "items", "purchase_orders"},
		"fields": map[string]any{
			"sales_orders":    []string{"external_id", "external_version", "so_number", "so_barcode", "warehouse_id", "warehouse_code", "customer_name", "notes", "lines[item_id|sku,quantity]"},
			"items":           []string{"external_id", "external_version", "sku", "item_name", "upc", "mpn", "category", "description", "weight_lbs", "default_bin_id", "reorder_point", "reorder_qty", "is_active"},
			"purchase_orders": []string{"external_id", "external_version", "po_number", "po_barcode", "warehouse_id", "warehouse_code", "vendor_name", "expected_date", "notes", "lines[item_id|sku,quantity_ordered,unit_cost,line_number]"},
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
			if sourceSystem == "" || len(sourceSystem) > 128 || strings.TrimSpace(externalID) == "" || len(externalID) > 256 || (strings.TrimSpace(externalVersion) == "" || len(externalVersion) > 128) {
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
	if err := validateStringFields(rec,"sku","item_name","description","upc","mpn","category"); err != nil { return nil, err }
	sku, _ := rec["sku"].(string)
	name, _ := rec["item_name"].(string)
	if strings.TrimSpace(sku) == "" || strings.TrimSpace(name) == "" { return nil, fmt.Errorf("sku and item_name required") }
	description := optionalString(rec,"description")
	upc := optionalString(rec,"upc")
	mpn := optionalString(rec,"mpn")
	category := optionalString(rec,"category")
	var weight *float64
	if raw, exists := rec["weight_lbs"]; exists {
		value, ok := floatField(raw); if !ok || value < 0 || value > 99999 { return nil, fmt.Errorf("weight_lbs must be a finite non-negative number") }
		weight = &value
	}
	var defaultBin *int64
	if raw, exists := rec["default_bin_id"]; exists {
		value, ok := integerField(raw); if !ok || value <= 0 { return nil, fmt.Errorf("default_bin_id must be a positive integer") }
		defaultBin = &value
	}
	var reorderPoint, reorderQty *int64
	if raw, exists := rec["reorder_point"]; exists {
		value, ok := integerField(raw); if !ok || value < 0 { return nil, fmt.Errorf("reorder_point must be a non-negative integer") }
		reorderPoint = &value
	}
	if raw, exists := rec["reorder_qty"]; exists {
		value, ok := integerField(raw); if !ok || value < 0 { return nil, fmt.Errorf("reorder_qty must be a non-negative integer") }
		reorderQty = &value
	}
	var active *bool
	if raw, exists := rec["is_active"]; exists {
		value, ok := raw.(bool); if !ok { return nil, fmt.Errorf("is_active must be boolean") }
		active = &value
	}
	items, err := s.cat.ListItems()
	if err != nil { return nil, err }
	var itemID int64
	for _, existing := range items {
		if existing.SKU == sku {
			if existing.ItemName != name { return nil, fmt.Errorf("SKU already exists with a different canonical item name") }
			itemID = existing.ItemID
			break
		}
	}
	if itemID == 0 {
		item, err := s.cat.CreateItem(catalog.ItemInput{SKU:sku,ItemName:name,Description:description,UPC:upc,MPN:mpn,Category:category,WeightLbs:weight,DefaultBinID:defaultBin})
		if err != nil { return nil, err }
		itemID = item.ItemID
	}
	patch := catalog.ItemPatch{
		Description:description, UPC:upc, MPN:mpn, Category:category,
		WeightLbs:weight, DefaultBinID:defaultBin, ReorderPoint:reorderPoint,
		ReorderQty:reorderQty, IsActive:active,
	}
	if description != nil || upc != nil || mpn != nil || category != nil || weight != nil || defaultBin != nil || reorderPoint != nil || reorderQty != nil || active != nil {
		if _, err := s.cat.UpdateItem(itemID,patch); err != nil { return nil, err }
	}
	return map[string]any{"item_id":itemID,"sku":sku},nil
}

func (s *Service) writeSO(rec map[string]any, actor string) (map[string]any, error) {
	if err := validateStringFields(rec,"so_number","so_barcode","warehouse_code","customer_name","notes"); err != nil { return nil, err }
	soNumber, _ := rec["so_number"].(string)
	if strings.TrimSpace(soNumber) == "" { soNumber, _ = rec["external_id"].(string) }
	if strings.TrimSpace(soNumber) == "" { return nil, fmt.Errorf("so_number required") }
	wid, _ := integerField(rec["warehouse_id"])
	if wid == 0 {
		if code, ok := rec["warehouse_code"].(string); ok && strings.TrimSpace(code) != "" {
			warehouses, err := s.cat.ListWarehouses(); if err != nil { return nil, err }
			for _, warehouse := range warehouses { if warehouse.WarehouseCode == code { wid = warehouse.WarehouseID; break } }
		}
	}
	if wid <= 0 { return nil, fmt.Errorf("warehouse_id or a valid warehouse_code is required") }
	rawLines, ok := rec["lines"].([]any)
	if !ok || len(rawLines) == 0 || len(rawLines) > 500 { return nil, fmt.Errorf("sales order requires 1..500 lines") }
	items, err := s.cat.ListItems(); if err != nil { return nil, err }
	idBySKU := make(map[string]int64,len(items))
	for _, item := range items { idBySKU[item.SKU] = item.ItemID }
	lines := make([]salesorders.LineInput,0,len(rawLines))
	for i, raw := range rawLines {
		line, ok := raw.(map[string]any); if !ok { return nil, fmt.Errorf("sales order line %d must be an object",i) }
		itemID, okID := integerField(line["item_id"])
		if !okID || itemID <= 0 { if sku, exists := line["sku"].(string); exists { itemID = idBySKU[strings.TrimSpace(sku)] } }
		quantity, okQty := integerField(line["quantity"])
		if !okQty { quantity, okQty = integerField(line["quantity_ordered"]) }
		if itemID <= 0 || !okQty || quantity <= 0 { return nil, fmt.Errorf("sales order line %d requires a known item and positive integer quantity",i) }
		lines = append(lines,salesorders.LineInput{ItemID:itemID,QuantityOrdered:quantity})
	}
	barcode := optionalString(rec,"so_barcode")
	customer := optionalString(rec,"customer_name")
	notes := optionalString(rec,"notes")
	expectedBarcode := soNumber; if barcode != nil && *barcode != "" { expectedBarcode = *barcode }
	existingOrders, err := s.sos.List(); if err != nil { return nil, err }
	for _, existing := range existingOrders {
		if existing.SONumber != soNumber { continue }
		if existing.WarehouseID != wid || existing.SOBarcode != expectedBarcode || existing.CustomerName != derefString(customer) || existing.Notes != derefString(notes) || len(existing.Lines) != len(lines) {
			return nil, fmt.Errorf("sales-order number already exists with a different canonical payload")
		}
		for i, line := range lines {
			if existing.Lines[i].ItemID != line.ItemID || existing.Lines[i].QuantityOrdered != line.QuantityOrdered {
				return nil, fmt.Errorf("sales-order number already exists with a different canonical payload")
			}
		}
		return map[string]any{"so_id":existing.SOID,"so_number":existing.SONumber,"status":existing.Status,"warehouse_id":existing.WarehouseID,"lines":existing.Lines,"recovered":true},nil
	}
	so, err := s.sos.Create(salesorders.CreateInput{SONumber:soNumber,WarehouseID:wid,Lines:lines,SOBarcode:barcode,CustomerName:customer,Notes:notes},actor)
	if err != nil { return nil, err }
	return map[string]any{"so_id":so.SOID,"so_number":so.SONumber,"status":so.Status,"warehouse_id":so.WarehouseID,"lines":so.Lines,"created_by":actor},nil
}

func (s *Service) writePO(rec map[string]any, actor string) (map[string]any, error) {
	if err := validateStringFields(rec,"po_number","po_barcode","warehouse_code","vendor_name","expected_date","notes"); err != nil { return nil, err }
	if s.pos == nil { return nil, fmt.Errorf("purchase-order repository is not configured") }
	poNumber, _ := rec["po_number"].(string)
	if strings.TrimSpace(poNumber) == "" { return nil, fmt.Errorf("po_number required") }
	warehouseID, ok := integerField(rec["warehouse_id"])
	if !ok || warehouseID <= 0 {
		if code, exists := rec["warehouse_code"].(string); exists && strings.TrimSpace(code) != "" {
			warehouses, err := s.cat.ListWarehouses(); if err != nil { return nil, err }
			for _, warehouse := range warehouses { if warehouse.WarehouseCode == code { warehouseID, ok = warehouse.WarehouseID, true; break } }
		}
	}
	if !ok || warehouseID <= 0 { return nil, fmt.Errorf("warehouse_id or valid warehouse_code required") }
	rawLines, ok := rec["lines"].([]any)
	if !ok || len(rawLines) == 0 || len(rawLines) > 500 { return nil, fmt.Errorf("purchase order requires 1..500 lines") }
	items, err := s.cat.ListItems(); if err != nil { return nil, err }
	idBySKU := make(map[string]int64,len(items)); for _, item := range items { idBySKU[item.SKU] = item.ItemID }
	lines := make([]purchaseorders.LineInput,0,len(rawLines))
	for i, raw := range rawLines {
		line, ok := raw.(map[string]any); if !ok { return nil, fmt.Errorf("purchase-order line %d must be an object",i) }
		itemID, okID := integerField(line["item_id"])
		if !okID || itemID <= 0 { if sku, exists := line["sku"].(string); exists { itemID = idBySKU[strings.TrimSpace(sku)] } }
		quantity, okQty := integerField(line["quantity_ordered"])
		if !okQty { quantity, okQty = integerField(line["quantity"]) }
		if itemID <= 0 || !okQty || quantity <= 0 { return nil, fmt.Errorf("purchase-order line %d requires a known item and positive integer quantity",i) }
		var unitCost *float64
		if rawCost, exists := line["unit_cost"]; exists {
			value, ok := floatField(rawCost); if !ok || value < 0 { return nil, fmt.Errorf("purchase-order line %d has invalid unit_cost",i) }
			unitCost = &value
		}
		var lineNumber *int
		if rawNumber, exists := line["line_number"]; exists {
			value, ok := integerField(rawNumber); if !ok || value < 1 || value > 500 { return nil, fmt.Errorf("purchase-order line %d has invalid line_number",i) }
			n := int(value); lineNumber = &n
		}
		lines = append(lines,purchaseorders.LineInput{ItemID:itemID,QuantityOrdered:quantity,UnitCost:unitCost,LineNumber:lineNumber})
	}
	barcode := optionalString(rec,"po_barcode")
	vendor := optionalString(rec,"vendor_name")
	expected := optionalString(rec,"expected_date")
	notes := optionalString(rec,"notes")
	expectedBarcode := poNumber; if barcode != nil { expectedBarcode = *barcode }
	existingOrders, err := s.pos.List(); if err != nil { return nil, err }
	for _, existing := range existingOrders {
		if existing.PONumber != poNumber { continue }
		if existing.WarehouseID != warehouseID || existing.POBarcode != expectedBarcode || !sameOptionalString(existing.VendorName,vendor) || !sameOptionalString(existing.ExpectedDate,expected) || !sameOptionalString(existing.Notes,notes) || len(existing.Lines) != len(lines) {
			return nil, fmt.Errorf("purchase-order number already exists with a different canonical payload")
		}
		for i, line := range lines {
			if existing.Lines[i].ItemID != line.ItemID || existing.Lines[i].QuantityOrdered != line.QuantityOrdered || !sameOptionalFloat(existing.Lines[i].UnitCost,line.UnitCost) {
				return nil, fmt.Errorf("purchase-order number already exists with a different canonical payload")
			}
			if line.LineNumber != nil && existing.Lines[i].LineNumber != *line.LineNumber { return nil, fmt.Errorf("purchase-order number already exists with a different canonical payload") }
		}
		return map[string]any{"po_id":existing.POID,"po_number":existing.PONumber,"status":existing.Status,"warehouse_id":existing.WarehouseID,"lines":existing.Lines,"recovered":true},nil
	}
	po, err := s.pos.Create(purchaseorders.CreateInput{PONumber:poNumber,WarehouseID:warehouseID,Lines:lines,POBarcode:barcode,VendorName:vendor,ExpectedDate:expected,Notes:notes},actor)
	if err != nil { return nil, err }
	return map[string]any{"po_id":po.POID,"po_number":po.PONumber,"status":po.Status,"warehouse_id":po.WarehouseID,"lines":po.Lines,"created_by":actor},nil
}

func validateStringFields(record map[string]any, keys ...string) error {
	for _, key := range keys {
		raw, exists := record[key]
		if !exists { continue }
		if _, ok := raw.(string); !ok { return fmt.Errorf("%s must be a string",key) }
	}
	return nil
}
func optionalString(record map[string]any, key string) *string {
	value, exists := record[key]
	if !exists { return nil }
	text, ok := value.(string)
	if !ok { return nil }
	return &text
}
func derefString(value *string) string { if value == nil { return "" }; return *value }
func sameOptionalString(a,b *string) bool {
	if a == nil || b == nil { return a == nil && b == nil }
	return *a == *b
}
func sameOptionalFloat(a,b *float64) bool {
	if a == nil || b == nil { return a == nil && b == nil }
	return *a == *b
}
func floatField(value any) (float64,bool) {
	var number float64
	switch v := value.(type) {
	case float64: number = v
	case float32: number = float64(v)
	case int: number = float64(v)
	case int64: number = float64(v)
	case json.Number: parsed,err:=v.Float64(); if err!=nil{return 0,false}; number=parsed
	default: return 0,false
	}
	if math.IsNaN(number) || math.IsInf(number,0) { return 0,false }
	return number,true
}

func integerField(value any) (int64, bool) {
	switch number := value.(type) {
	case float64:
		if math.IsNaN(number) || math.IsInf(number,0) || math.Trunc(number) != number || number >= float64(math.MaxInt64) || number < float64(math.MinInt64) {
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
