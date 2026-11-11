package httpapi

import (
	"encoding/hex"
	"net/http"
	"sort"
	"strconv"
	"strings"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/catalog"
)

func (s *Server) itemRoutes(w http.ResponseWriter, r *http.Request, parts []string) {
	if len(parts) == 0 {
		switch r.Method {
		case http.MethodGet:
			values, err := s.catalog.ListItems()
			if err != nil {
				writeCatalogError(w, err)
				return
			}
			category := r.URL.Query().Get("category")
			active := r.URL.Query().Get("active")
			query := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("q")))
			for i := 0; i < len(values); {
				v := values[i]
				keep := true
				if category != "" && (v.Category == nil || *v.Category != category) {
					keep = false
				}
				if active != "" && v.IsActive != strings.EqualFold(active, "true") {
					keep = false
				}
				if query != "" && !itemMatches(v, query) {
					keep = false
				}
				if !keep {
					values = append(values[:i], values[i+1:]...)
				} else {
					i++
				}
			}
			page, perPage := pagination(r)
			items, total, page, pages := catalog.Paginate(values, page, perPage)
			preferred, err := s.catalog.ListPreferredBins()
			if err != nil {
				writeCatalogError(w, err)
				return
			}
			bins := map[int64]catalog.Bin{}
			for _, pb := range preferred {
				if pb.Priority == 1 {
					if b, e := s.catalog.GetBin(pb.BinID); e == nil {
						bins[pb.ItemID] = b
					}
				}
			}
			response := make([]map[string]any, 0, len(items))
			for _, item := range items {
				defaultID := item.DefaultBinID
				if b, ok := bins[item.ItemID]; ok {
					id := b.BinID
					defaultID = &id
				}
				binCode := ""
				if defaultID != nil {
					if b, err := s.catalog.GetBin(*defaultID); err == nil {
						binCode = b.BinCode
					}
				}
				response = append(response, map[string]any{"item_id": item.ItemID, "sku": item.SKU, "item_name": item.ItemName, "upc": item.UPC, "mpn": item.MPN, "category": item.Category, "weight_lbs": item.WeightLbs, "default_bin_id": defaultID, "default_bin_code": binCode, "is_active": item.IsActive, "created_at": item.CreatedAt})
			}
			writeJSON(w, 200, map[string]any{"items": response, "total": total, "page": page, "per_page": perPage, "pages": pages})
		case http.MethodPost:
			var input catalog.ItemInput
			if err := decodeStrictJSON(r, &input); err != nil {
				writeJSON(w, 400, map[string]string{"error": err.Error()})
				return
			}
			item, err := s.catalog.CreateItem(input)
			if err != nil {
				writeCatalogError(w, err)
				return
			}
			writeJSON(w, 201, itemCreateResponse(item))
		default:
			writeJSON(w, 405, map[string]string{"error": "method not allowed"})
		}
		return
	}
	if len(parts) == 2 && parts[1] == "archive" {
		id, ok := positivePathID(parts[0])
		if !ok {
			writeJSON(w, 400, map[string]string{"error": "invalid item_id"})
			return
		}
		if r.Method != http.MethodPost {
			writeJSON(w, 405, map[string]string{"error": "method not allowed"})
			return
		}
		item, err := s.catalog.ToggleItemArchive(id)
		if err != nil {
			writeCatalogError(w, err)
			return
		}
		message := "Item archived"
		if item.IsActive {
			message = "Item restored"
		}
		writeJSON(w, 200, map[string]any{"message": message, "is_active": item.IsActive})
		return
	}
	if len(parts) != 1 {
		writeJSON(w, 400, map[string]string{"error": "invalid item path"})
		return
	}
	id, ok := positivePathID(parts[0])
	if !ok {
		writeJSON(w, 400, map[string]string{"error": "invalid item_id"})
		return
	}
	switch r.Method {
	case http.MethodGet:
		item, err := s.catalog.GetItem(id)
		if err != nil {
			writeCatalogError(w, err)
			return
		}
		balances, _, err := s.ledger.List()
		if err != nil {
			writeCatalogError(w, err)
			return
		}
		bins, err := s.catalog.ListBins()
		if err != nil {
			writeCatalogError(w, err)
			return
		}
		binByID := map[int64]catalog.Bin{}
		for _, b := range bins {
			binByID[b.BinID] = b
		}
		zones, err := s.catalog.ListZones()
		if err != nil {
			writeCatalogError(w, err)
			return
		}
		zoneByID := map[int64]catalog.Zone{}
		for _, z := range zones {
			zoneByID[z.ZoneID] = z
		}
		inventoryRows := make([]map[string]any, 0)
		for _, b := range balances {
			if b.ItemID == id {
				bin := binByID[b.BinID]
				zone := zoneByID[bin.ZoneID]
				inventoryRows = append(inventoryRows, map[string]any{"item_id": b.ItemID, "bin_id": b.BinID, "bin_code": bin.BinCode, "zone_name": zone.ZoneName, "quantity_on_hand": b.OnHand, "quantity_allocated": b.Allocated})
			}
		}
		preferred, err := s.catalog.ListPreferredBins()
		if err != nil {
			writeCatalogError(w, err)
			return
		}
		preferredRows := make([]map[string]any, 0)
		for _, pb := range preferred {
			if pb.ItemID == id {
				bin := binByID[pb.BinID]
				zone := zoneByID[bin.ZoneID]
				preferredRows = append(preferredRows, map[string]any{"preferred_bin_id": pb.PreferredBinID, "bin_id": pb.BinID, "bin_code": bin.BinCode, "zone_name": zone.ZoneName, "priority": pb.Priority})
			}
		}
		writeJSON(w, 200, map[string]any{"item": item, "inventory": inventoryRows, "preferred_bins": preferredRows})
	case http.MethodPut:
		var patch catalog.ItemPatch
		if err := decodeStrictJSON(r, &patch); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		item, err := s.catalog.UpdateItem(id, patch)
		if err != nil {
			writeCatalogError(w, err)
			return
		}
		writeJSON(w, 200, itemUpdateResponse(item))
	case http.MethodDelete:
		if err := s.catalog.DeleteItem(id); err != nil {
			writeCatalogError(w, err)
			return
		}
		writeJSON(w, 200, map[string]string{"message": "Item deleted"})
	default:
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
	}
}
func itemMatches(v catalog.Item, q string) bool {
	values := []string{v.SKU, v.ItemName}
	if v.UPC != nil {
		values = append(values, *v.UPC)
	}
	if v.MPN != nil {
		values = append(values, *v.MPN)
	}
	values = append(values, v.BarcodeAliases...)
	for _, value := range values {
		if strings.Contains(strings.ToLower(value), q) {
			return true
		}
	}
	return false
}
func itemCreateResponse(v catalog.Item) map[string]any {
	return map[string]any{"item_id": v.ItemID, "sku": v.SKU, "item_name": v.ItemName, "description": v.Description, "upc": v.UPC, "mpn": v.MPN, "category": v.Category, "weight_lbs": v.WeightLbs, "default_bin_id": v.DefaultBinID, "is_active": v.IsActive, "created_at": v.CreatedAt}
}
func itemUpdateResponse(v catalog.Item) map[string]any {
	return map[string]any{"item_id": v.ItemID, "sku": v.SKU, "item_name": v.ItemName, "upc": v.UPC, "mpn": v.MPN, "category": v.Category, "weight_lbs": v.WeightLbs, "default_bin_id": v.DefaultBinID, "is_active": v.IsActive, "created_at": v.CreatedAt, "updated_at": v.UpdatedAt}
}

func (s *Server) preferredBinRoutes(w http.ResponseWriter, r *http.Request, parts []string) {
	if len(parts) == 0 {
		switch r.Method {
		case http.MethodGet:
			values, err := s.catalog.ListPreferredBins()
			if err != nil {
				writeCatalogError(w, err)
				return
			}
			itemID, _ := strconv.ParseInt(r.URL.Query().Get("item_id"), 10, 64)
			binID, _ := strconv.ParseInt(r.URL.Query().Get("bin_id"), 10, 64)
			q := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("q")))
			items, err := s.catalog.ListItems()
			if err != nil {
				writeCatalogError(w, err)
				return
			}
			itemByID := map[int64]catalog.Item{}
			for _, item := range items {
				itemByID[item.ItemID] = item
			}
			bins, err := s.catalog.ListBins()
			if err != nil {
				writeCatalogError(w, err)
				return
			}
			binByID := map[int64]catalog.Bin{}
			for _, b := range bins {
				binByID[b.BinID] = b
			}
			zones, err := s.catalog.ListZones()
			if err != nil {
				writeCatalogError(w, err)
				return
			}
			zoneByID := map[int64]catalog.Zone{}
			for _, z := range zones {
				zoneByID[z.ZoneID] = z
			}
			response := make([]map[string]any, 0)
			for _, pb := range values {
				item := itemByID[pb.ItemID]
				bin := binByID[pb.BinID]
				zone := zoneByID[bin.ZoneID]
				if itemID > 0 && pb.ItemID != itemID || binID > 0 && pb.BinID != binID {
					continue
				}
				if q != "" && !strings.Contains(strings.ToLower(item.SKU), q) && !strings.Contains(strings.ToLower(item.ItemName), q) {
					continue
				}
				response = append(response, map[string]any{"preferred_bin_id": pb.PreferredBinID, "item_id": pb.ItemID, "bin_id": pb.BinID, "priority": pb.Priority, "notes": pb.Notes, "updated_at": pb.UpdatedAt, "sku": item.SKU, "item_name": item.ItemName, "bin_code": bin.BinCode, "zone_name": zone.ZoneName})
			}
			sort.Slice(response, func(i, j int) bool {
				if response[i]["sku"] == response[j]["sku"] {
					return response[i]["priority"].(int) < response[j]["priority"].(int)
				}
				return response[i]["sku"].(string) < response[j]["sku"].(string)
			})
			writeJSON(w, 200, map[string]any{"preferred_bins": response})
		case http.MethodPost:
			var input catalog.PreferredBinInput
			if err := decodeStrictJSON(r, &input); err != nil {
				writeJSON(w, 400, map[string]string{"error": err.Error()})
				return
			}
			if input.Priority == 0 {
				input.Priority = 1
			}
			if err := s.catalog.CreatePreferredBin(input); err != nil {
				writeCatalogError(w, err)
				return
			}
			writeJSON(w, 200, map[string]string{"message": "Preferred bin saved"})
		default:
			writeJSON(w, 405, map[string]string{"error": "method not allowed"})
		}
		return
	}
	if len(parts) != 1 {
		writeJSON(w, 400, map[string]string{"error": "invalid preferred-bin path"})
		return
	}
	id, ok := positivePathID(parts[0])
	if !ok {
		writeJSON(w, 400, map[string]string{"error": "invalid preferred_bin_id"})
		return
	}
	switch r.Method {
	case http.MethodPut:
		var input struct {
			Priority int `json:"priority"`
		}
		if err := decodeStrictJSON(r, &input); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		if err := s.catalog.UpdatePreferredBin(id, input.Priority); err != nil {
			writeCatalogError(w, err)
			return
		}
		writeJSON(w, 200, map[string]string{"message": "Priority updated"})
	case http.MethodDelete:
		if err := s.catalog.DeletePreferredBin(id); err != nil {
			writeCatalogError(w, err)
			return
		}
		writeJSON(w, 200, map[string]string{"message": "Preferred bin deleted"})
	default:
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
	}
}

func (s *Server) vendorRoutes(w http.ResponseWriter, r *http.Request, parts []string) {
	if len(parts) == 0 {
		switch r.Method {
		case http.MethodGet:
			values, err := s.catalog.ListVendors()
			if err != nil {
				writeCatalogError(w, err)
				return
			}
			q := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("q")))
			active := r.URL.Query().Get("active")
			filtered := values[:0]
			for _, v := range values {
				if active != "" && v.IsActive != strings.EqualFold(active, "true") {
					continue
				}
				if q != "" && !strings.Contains(strings.ToLower(v.VendorName), q) && !optionalContains(v.ContactName, q) && !optionalContains(v.Email, q) {
					continue
				}
				filtered = append(filtered, v)
			}
			page, perPage := pagination(r)
			items, total, page, pages := catalog.Paginate(filtered, page, perPage)
			writeJSON(w, 200, map[string]any{"vendors": items, "total": total, "page": page, "per_page": perPage, "pages": pages})
		case http.MethodPost:
			var input catalog.VendorInput
			if err := decodeStrictJSON(r, &input); err != nil {
				writeJSON(w, 400, map[string]string{"error": err.Error()})
				return
			}
			v, err := s.catalog.CreateVendor(input)
			if err != nil {
				writeCatalogError(w, err)
				return
			}
			writeJSON(w, 201, map[string]any{"vendor": v})
		default:
			writeJSON(w, 405, map[string]string{"error": "method not allowed"})
		}
		return
	}
	if len(parts) != 1 || !validUUID(parts[0]) {
		writeJSON(w, 404, map[string]string{"error": "Not found"})
		return
	}
	switch r.Method {
	case http.MethodGet:
		v, err := s.catalog.GetVendor(parts[0])
		if err != nil {
			writeCatalogError(w, err)
			return
		}
		writeJSON(w, 200, map[string]any{"vendor": v})
	case http.MethodPut:
		var patch catalog.VendorPatch
		if err := decodeStrictJSON(r, &patch); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		v, err := s.catalog.UpdateVendor(parts[0], patch)
		if err != nil {
			writeCatalogError(w, err)
			return
		}
		writeJSON(w, 200, map[string]any{"vendor": v})
	case http.MethodDelete:
		if err := s.catalog.DeleteVendor(parts[0]); err != nil {
			writeCatalogError(w, err)
			return
		}
		writeJSON(w, 200, map[string]bool{"deleted": true})
	default:
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
	}
}
func optionalContains(value *string, q string) bool {
	return value != nil && strings.Contains(strings.ToLower(*value), q)
}
func validUUID(value string) bool {
	if len(value) != 36 || value[8] != '-' || value[13] != '-' || value[18] != '-' || value[23] != '-' {
		return false
	}
	raw := strings.ReplaceAll(value, "-", "")
	decoded, err := hex.DecodeString(raw)
	return err == nil && len(decoded) == 16
}
