package snapshot

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/domain/inventory"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/features/catalog"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/features/inventoryledger"
)

const snapshotKind = "wms_inventory_snapshot"
const restoreKind = "wms_inventory_restore"

type InventorySnapshot struct {
	ID          string         `json:"snapshot_id"`
	WarehouseID int64          `json:"warehouse_id,omitempty"`
	Version     uint64         `json:"ledger_version"`
	CreatedAt   time.Time      `json:"created_at"`
	Rows        []InventoryRow `json:"rows"`
	SHA256      string         `json:"sha256"`
}

type InventoryRow struct {
	WarehouseID int64  `json:"warehouse_id"`
	BinID       int64  `json:"bin_id"`
	ItemID      int64  `json:"item_id"`
	LotNumber   string `json:"lot_number,omitempty"`
	OnHand      int64  `json:"on_hand"`
	Allocated   int64  `json:"allocated"`
	Available   int64  `json:"available"`
}

type Service struct {
	store   *corestore.Store
	ledger  *inventoryledger.Ledger
	catalog *catalog.Repository
}

func New(store *corestore.Store, ledger *inventoryledger.Ledger, catalogs ...*catalog.Repository) *Service {
	service := &Service{store: store, ledger: ledger}
	if len(catalogs) > 0 {
		service.catalog = catalogs[0]
	}
	return service
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
	balances, version, err := s.ledger.List()
	if err != nil {
		return InventorySnapshot{}, err
	}
	rows := make([]InventoryRow, 0, len(balances))
	for _, balance := range balances {
		if warehouseID != 0 && balance.WarehouseID != warehouseID {
			continue
		}
		rows = append(rows, InventoryRow{
			WarehouseID: balance.WarehouseID, BinID: balance.BinID,
			ItemID: balance.ItemID, LotNumber: balance.LotNumber,
			OnHand: balance.OnHand, Allocated: balance.Allocated,
			Available: balance.OnHand - balance.Allocated,
		})
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

type RestoreResult struct {
	Result           inventoryledger.Result `json:"result"`
	BackupSnapshotID string                 `json:"backup_snapshot_id"`
	Replayed         bool                   `json:"replayed"`
}

type restoreOperation struct {
	ID               string                 `json:"id"`
	SnapshotID       string                 `json:"snapshot_id"`
	Fingerprint      string                 `json:"fingerprint"`
	BackupSnapshotID string                 `json:"backup_snapshot_id"`
	Status           string                 `json:"status"`
	Result           inventoryledger.Result `json:"result"`
}

// RestoreSafely verifies the immutable export, takes a backup of the current
// ledger projection, and restores only if expectedVersion still matches.
// The operation record and ledger operation ID make recovery safe after a
// process interruption between the ledger write and completion marker.
func (s *Service) RestoreSafely(id, operationID string, expectedVersion uint64) (RestoreResult, error) {
	if !validRestoreOperationID(operationID) {
		return RestoreResult{}, fmt.Errorf("valid operation_id is required")
	}
	snap, err := s.Get(id)
	if err != nil {
		return RestoreResult{}, err
	}
	balances := make([]inventory.Balance, 0, len(snap.Rows))
	for _, row := range snap.Rows {
		if row.Available != row.OnHand-row.Allocated || row.OnHand < 0 || row.Allocated < 0 || row.Allocated > row.OnHand {
			return RestoreResult{}, fmt.Errorf("snapshot %s contains inconsistent inventory quantities", id)
		}
		balance := inventory.Balance{WarehouseID: row.WarehouseID, BinID: row.BinID, ItemID: row.ItemID, LotNumber: row.LotNumber, OnHand: row.OnHand, Allocated: row.Allocated}
		if err := balance.Validate(); err != nil {
			return RestoreResult{}, fmt.Errorf("snapshot %s contains invalid balance: %w", id, err)
		}
		if s.catalog == nil {
			return RestoreResult{}, fmt.Errorf("snapshot restore requires a catalog repository to validate warehouse, bin and item references")
		}
		warehouse, err := s.catalog.GetWarehouse(row.WarehouseID)
		if err != nil || warehouse.WarehouseID != row.WarehouseID {
			return RestoreResult{}, fmt.Errorf("snapshot %s references unknown warehouse %d", id, row.WarehouseID)
		}
		bin, err := s.catalog.GetBin(row.BinID)
		if err != nil || bin.BinID != row.BinID || bin.WarehouseID != row.WarehouseID {
			return RestoreResult{}, fmt.Errorf("snapshot %s references bin %d outside warehouse %d", id, row.BinID, row.WarehouseID)
		}
		item, err := s.catalog.GetItem(row.ItemID)
		if err != nil || item.ItemID != row.ItemID {
			return RestoreResult{}, fmt.Errorf("snapshot %s references unknown item %d", id, row.ItemID)
		}
		balances = append(balances, balance)
	}
	fingerprintBytes := sha256.Sum256([]byte(fmt.Sprintf("%s|%d|%d", id, expectedVersion, snap.WarehouseID)))
	fingerprint := hex.EncodeToString(fingerprintBytes[:])
	op := restoreOperation{ID: operationID, SnapshotID: id, Fingerprint: fingerprint, Status: "PREPARING"}
	if record, exists, err := s.store.Get(restoreKind, operationID); err != nil {
		return RestoreResult{}, err
	} else if exists {
		if err := json.Unmarshal(record.Data, &op); err != nil {
			return RestoreResult{}, err
		}
		if op.Fingerprint != fingerprint {
			return RestoreResult{}, fmt.Errorf("snapshot restore operation_id reused with a different command")
		}
		if op.Status == "COMPLETED" {
			result := op.Result
			result.Replayed = true
			return RestoreResult{Result: result, BackupSnapshotID: op.BackupSnapshotID, Replayed: true}, nil
		}
	} else {
		_, currentVersion, err := s.ledger.List()
		if err != nil {
			return RestoreResult{}, err
		}
		if currentVersion != expectedVersion {
			return RestoreResult{}, inventoryledger.ErrVersionConflict
		}
		backup, err := s.CreateInventory(snap.WarehouseID)
		if err != nil {
			return RestoreResult{}, fmt.Errorf("create pre-restore backup: %w", err)
		}
		if backup.Version != expectedVersion {
			return RestoreResult{}, inventoryledger.ErrVersionConflict
		}
		op.BackupSnapshotID = backup.ID
		data, err := json.Marshal(op)
		if err != nil {
			return RestoreResult{}, err
		}
		if _, err := s.store.Put(restoreKind, operationID, data); err != nil {
			return RestoreResult{}, err
		}
	}
	if op.BackupSnapshotID == "" {
		backup, err := s.CreateInventory(snap.WarehouseID)
		if err != nil {
			return RestoreResult{}, fmt.Errorf("create pre-restore backup: %w", err)
		}
		if backup.Version != expectedVersion {
			return RestoreResult{}, inventoryledger.ErrVersionConflict
		}
		op.BackupSnapshotID = backup.ID
		data, err := json.Marshal(op)
		if err != nil {
			return RestoreResult{}, err
		}
		if _, err := s.store.Put(restoreKind, operationID, data); err != nil {
			return RestoreResult{}, err
		}
	}
	result, err := s.ledger.RestoreBalances(operationID, expectedVersion, snap.WarehouseID, balances)
	if err != nil {
		return RestoreResult{}, err
	}
	op.Status, op.Result = "COMPLETED", result
	data, err := json.Marshal(op)
	if err != nil {
		return RestoreResult{}, err
	}
	if _, err := s.store.Put(restoreKind, operationID, data); err != nil {
		return RestoreResult{}, err
	}
	return RestoreResult{Result: result, BackupSnapshotID: op.BackupSnapshotID, Replayed: result.Replayed}, nil
}

// Restore preserves the original service contract for internal callers.
func (s *Service) Restore(id, operationID string, expectedVersion uint64) (inventoryledger.Result, error) {
	result, err := s.RestoreSafely(id, operationID, expectedVersion)
	if err != nil {
		return inventoryledger.Result{}, err
	}
	return result.Result, nil
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

func validRestoreOperationID(value string) bool {
	if len(value) == 0 || len(value) > 128 {
		return false
	}
	for _, r := range value {
		if !(r >= 'a' && r <= 'z') && !(r >= 'A' && r <= 'Z') && !(r >= '0' && r <= '9') && r != '-' && r != '_' {
			return false
		}
	}
	return true
}
