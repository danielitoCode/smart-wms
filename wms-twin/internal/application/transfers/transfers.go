package transfers

import (
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/catalog"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/inventoryledger"
)

var (
	ErrInvalid = errors.New("invalid transfer")
	ErrScope   = errors.New("warehouse scope denied")
	ErrBin     = errors.New("invalid bin")
)

type MoveInput struct {
	ItemID      int64  `json:"item_id"`
	FromBinID   int64  `json:"from_bin_id"`
	ToBinID     int64  `json:"to_bin_id"`
	Quantity    int64  `json:"quantity"`
	LotNumber   string `json:"lot_number"`
	WarehouseID int64  `json:"warehouse_id"`
}

type Service struct {
	master *catalog.Repository
	ledger *inventoryledger.Ledger
	mu     sync.Mutex
}

func New(master *catalog.Repository, ledger *inventoryledger.Ledger) *Service {
	return &Service{master: master, ledger: ledger}
}

func contains(ids []int64, id int64) bool {
	for _, v := range ids {
		if v == id {
			return true
		}
	}
	return false
}

func (s *Service) Move(in MoveInput, allowed []int64, isAdmin bool) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if in.ItemID <= 0 || in.FromBinID <= 0 || in.ToBinID <= 0 || in.Quantity <= 0 || in.FromBinID == in.ToBinID {
		return ErrInvalid
	}
	from, err := s.master.GetBin(in.FromBinID)
	if err != nil {
		return ErrBin
	}
	to, err := s.master.GetBin(in.ToBinID)
	if err != nil {
		return ErrBin
	}
	if from.WarehouseID != to.WarehouseID {
		return fmt.Errorf("%w: cross-warehouse not supported in this cut", ErrInvalid)
	}
	if in.WarehouseID > 0 && in.WarehouseID != from.WarehouseID {
		return ErrInvalid
	}
	if !isAdmin && !contains(allowed, from.WarehouseID) {
		return ErrScope
	}
	opID := fmt.Sprintf("xfer-%d-%d-%d", in.FromBinID, in.ToBinID, time.Now().UnixNano())
	_, err = s.ledger.Move(inventoryledger.MoveCommand{
		OperationID: opID,
		Source:      inventoryledger.Location{WarehouseID: from.WarehouseID, BinID: in.FromBinID, ItemID: in.ItemID, LotNumber: in.LotNumber},
		Destination: inventoryledger.Location{WarehouseID: to.WarehouseID, BinID: in.ToBinID, ItemID: in.ItemID, LotNumber: in.LotNumber},
		Quantity:    in.Quantity,
	})
	return err
}
