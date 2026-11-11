package snapshot

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/inventoryledger"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
)

const snapshotKind = "wms_inventory_snapshot"

type InventorySnapshot struct {
	ID          string           `json:"snapshot_id"`
	WarehouseID int64            `json:"warehouse_id,omitempty"`
	Version     uint64           `json:"ledger_version"`
	CreatedAt   time.Time        `json:"created_at"`
	Rows        []map[string]any `json:"rows"`
	SHA256      string           `json:"sha256"`
}

type Service struct {
	store  *corestore.Store
	ledger *inventoryledger.Ledger
}

func New(store *corestore.Store, ledger *inventoryledger.Ledger) *Service {
	return &Service{store: store, ledger: ledger}
}

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

// CreateInventory stores an immutable, versioned inventory export in Core.
// The checksum covers the snapshot metadata and rows; this is an export,
// not a transactional restore point for the underlying ledger.
func (s *Service) CreateInventory(warehouseID int64) (InventorySnapshot, error) {
	if s.store == nil {
		return InventorySnapshot{}, fmt.Errorf("snapshot store is not configured")
	}
	view, err := s.Inventory(warehouseID)
	if err != nil {
		return InventorySnapshot{}, err
	}
	rows, ok := view["rows"].([]map[string]any)
	if !ok {
		return InventorySnapshot{}, fmt.Errorf("inventory snapshot rows have an unexpected type")
	}
	version, ok := view["version"].(uint64)
	if !ok {
		return InventorySnapshot{}, fmt.Errorf("inventory snapshot version has an unexpected type")
	}
	now := time.Now().UTC()
	id := strconv.FormatInt(now.UnixNano(), 10)
	snap := InventorySnapshot{
		ID: id, WarehouseID: warehouseID, Version: version,
		CreatedAt: now, Rows: rows,
	}
	snap.SHA256, err = checksum(snap)
	if err != nil {
		return InventorySnapshot{}, err
	}
	data, err := json.Marshal(snap)
	if err != nil {
		return InventorySnapshot{}, err
	}
	if _, err := s.store.Put(snapshotKind, id, data); err != nil {
		return InventorySnapshot{}, err
	}
	return snap, nil
}

func (s *Service) Get(id string) (InventorySnapshot, error) {
	record, ok, err := s.store.Get(snapshotKind, id)
	if err != nil {
		return InventorySnapshot{}, err
	}
	if !ok {
		return InventorySnapshot{}, fmt.Errorf("snapshot %s not found", id)
	}
	var snap InventorySnapshot
	if err := json.Unmarshal(record.Data, &snap); err != nil {
		return InventorySnapshot{}, fmt.Errorf("decode snapshot: %w", err)
	}
	expected, err := checksum(snap)
	if err != nil {
		return InventorySnapshot{}, err
	}
	if !equalChecksum(expected, snap.SHA256) {
		return InventorySnapshot{}, fmt.Errorf("snapshot %s checksum mismatch", id)
	}
	return snap, nil
}

func checksum(s InventorySnapshot) (string, error) {
	s.SHA256 = ""
	data, err := json.Marshal(s)
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256(data)
	return hex.EncodeToString(sum[:]), nil
}

func equalChecksum(a, b string) bool {
	if len(a) != len(b) {
		return false
	}
	var diff byte
	for i := range a {
		diff |= a[i] ^ b[i]
	}
	return diff == 0
}
