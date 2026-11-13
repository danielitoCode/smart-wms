package lookup

import (
	"errors"
	"strconv"
	"strings"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/features/catalog"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/features/inventoryledger"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/features/salesorders"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/domain/inventory"
)

var ErrNotFound = errors.New("not found")

type Service struct {
	master *catalog.Repository
	ledger *inventoryledger.Ledger
	sos    *salesorders.Repository
}

func New(master *catalog.Repository, ledger *inventoryledger.Ledger, sos *salesorders.Repository) *Service {
	return &Service{master: master, ledger: ledger, sos: sos}
}

func (s *Service) ItemByBarcode(barcode string) (map[string]any, error) {
	barcode = strings.TrimSpace(barcode)
	items, err := s.master.ListItems()
	if err != nil {
		return nil, err
	}
	var item catalog.Item
	found := false
	// Mobile scans barcodes/SKU; numeric path segments may be item_id.
	if id, err := strconv.ParseInt(barcode, 10, 64); err == nil && id > 0 {
		if it, err := s.master.GetItem(id); err == nil && it.IsActive {
			item, found = it, true
		}
	}
	for _, it := range items {
		if found {
			break
		}
		if !it.IsActive {
			continue
		}
		if it.SKU == barcode || it.ItemName == barcode {
			item, found = it, true
			break
		}
		if it.UPC != nil && *it.UPC == barcode {
			item, found = it, true
			break
		}
		for _, a := range it.BarcodeAliases {
			if a == barcode {
				item, found = it, true
				break
			}
		}
		if found {
			break
		}
	}
	if !found {
		return nil, ErrNotFound
	}
	balances, _, err := s.ledger.List()
	if err != nil {
		return nil, err
	}
	bins, _ := s.master.ListBins()
	binByID := map[int64]catalog.Bin{}
	for _, b := range bins {
		binByID[b.BinID] = b
	}
	locations := []map[string]any{}
	var total int64
	for _, bal := range balances {
		if bal.ItemID != item.ItemID || bal.OnHand <= 0 {
			continue
		}
		bin := binByID[bal.BinID]
		locations = append(locations, map[string]any{
			"bin_id": bal.BinID, "bin_code": bin.BinCode, "warehouse_id": bal.WarehouseID,
			"quantity_on_hand": bal.OnHand, "quantity_allocated": bal.Allocated,
			"lot_number": bal.LotNumber,
		})
		total += bal.OnHand
	}
	return map[string]any{
		"item_id": item.ItemID, "sku": item.SKU, "item_name": item.ItemName,
		"upc": item.UPC, "locations": locations, "total_on_hand": total,
	}, nil
}

func (s *Service) BinByBarcode(barcode string) (map[string]any, error) {
	barcode = strings.TrimSpace(barcode)
	bins, err := s.master.ListBins()
	if err != nil {
		return nil, err
	}
	var bin catalog.Bin
	found := false
	for _, b := range bins {
		if b.BinBarcode == barcode || b.BinCode == barcode {
			bin, found = b, true
			break
		}
	}
	if !found {
		return nil, ErrNotFound
	}
	balances, _, err := s.ledger.List()
	if err != nil {
		return nil, err
	}
	contents := []map[string]any{}
	for _, bal := range balances {
		if bal.BinID != bin.BinID || bal.OnHand <= 0 {
			continue
		}
		item, err := s.master.GetItem(bal.ItemID)
		if err != nil {
			continue
		}
		contents = append(contents, map[string]any{
			"item_id": item.ItemID, "sku": item.SKU, "item_name": item.ItemName,
			"quantity_on_hand": bal.OnHand, "quantity_allocated": bal.Allocated, "lot_number": bal.LotNumber,
		})
	}
	return map[string]any{
		"bin_id": bin.BinID, "bin_code": bin.BinCode, "bin_barcode": bin.BinBarcode,
		"bin_type": bin.BinType, "warehouse_id": bin.WarehouseID, "contents": contents,
	}, nil
}

func (s *Service) SOByBarcode(barcode string) (salesorders.SalesOrder, error) {
	return s.sos.FindByBarcode(barcode)
}

func (s *Service) SearchItems(q string) ([]catalog.Item, error) {
	q = strings.ToLower(strings.TrimSpace(q))
	items, err := s.master.ListItems()
	if err != nil {
		return nil, err
	}
	if q == "" {
		return items, nil
	}
	out := []catalog.Item{}
	for _, it := range items {
		if strings.Contains(strings.ToLower(it.SKU), q) || strings.Contains(strings.ToLower(it.ItemName), q) {
			out = append(out, it)
			continue
		}
		if it.UPC != nil && strings.Contains(strings.ToLower(*it.UPC), q) {
			out = append(out, it)
		}
	}
	return out, nil
}

func (s *Service) SearchBins(q string) ([]catalog.Bin, error) {
	q = strings.ToLower(strings.TrimSpace(q))
	bins, err := s.master.ListBins()
	if err != nil {
		return nil, err
	}
	if q == "" {
		return bins, nil
	}
	out := []catalog.Bin{}
	for _, b := range bins {
		if strings.Contains(strings.ToLower(b.BinCode), q) || strings.Contains(strings.ToLower(b.BinBarcode), q) {
			out = append(out, b)
		}
	}
	return out, nil
}

// Balances exposes ledger balances for inventory views.
func (s *Service) Balances() ([]inventory.Balance, error) {
	b, _, err := s.ledger.List()
	return b, err
}
