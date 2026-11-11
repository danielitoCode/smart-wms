package snapshot

import (
	"time"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/inventoryledger"
)

type Service struct {
	ledger *inventoryledger.Ledger
}

func New(ledger *inventoryledger.Ledger) *Service { return &Service{ledger: ledger} }

func (s *Service) Inventory(warehouseID int64) (map[string]any, error) {
	balances, version, err := s.ledger.List()
	if err != nil {
		return nil, err
	}
	rows := make([]map[string]any, 0, len(balances))
	for _, b := range balances {
		if warehouseID != 0 && b.WarehouseID != warehouseID {
			continue
		}
		rows = append(rows, map[string]any{
			"warehouse_id": b.WarehouseID, "bin_id": b.BinID, "item_id": b.ItemID,
			"lot_number": b.LotNumber, "on_hand": b.OnHand, "allocated": b.Allocated,
			"available": b.OnHand - b.Allocated,
		})
	}
	return map[string]any{
		"version": version, "generated_at": time.Now().UTC(),
		"rows": rows, "total": len(rows), "engine": "PrismaTec-Core",
	}, nil
}
