package inventoryledger

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
	"sync"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/domain/inventory"
)

const (
	ledgerKind = "inventory-ledger"
	ledgerID   = "global"
)

var (
	ErrInvalidOperationID  = errors.New("operation_id must contain 1-128 ASCII letters, digits, '-' or '_'")
	ErrIdempotencyConflict = errors.New("operation_id was already used with a different command")
	ErrCorruptLedger       = errors.New("persisted inventory ledger is invalid")
)

type Location struct {
	WarehouseID int64  `json:"warehouse_id"`
	BinID       int64  `json:"bin_id"`
	ItemID      int64  `json:"item_id"`
	LotNumber   string `json:"lot_number,omitempty"`
}

func (l Location) balance() inventory.Balance {
	return inventory.Balance{
		WarehouseID: l.WarehouseID,
		BinID:       l.BinID,
		ItemID:      l.ItemID,
		LotNumber:   l.LotNumber,
	}
}

type AdjustCommand struct {
	OperationID string `json:"operation_id"`
	WarehouseID int64  `json:"warehouse_id"`
	BinID       int64  `json:"bin_id"`
	ItemID      int64  `json:"item_id"`
	LotNumber   string `json:"lot_number,omitempty"`
	Delta       int64  `json:"delta"`
}

type QuantityCommand struct {
	OperationID string `json:"operation_id"`
	WarehouseID int64  `json:"warehouse_id"`
	BinID       int64  `json:"bin_id"`
	ItemID      int64  `json:"item_id"`
	LotNumber   string `json:"lot_number,omitempty"`
	Quantity    int64  `json:"quantity"`
}

type MoveCommand struct {
	OperationID string   `json:"operation_id"`
	Source      Location `json:"source"`
	Destination Location `json:"destination"`
	Quantity    int64    `json:"quantity"`
}

type Result struct {
	OperationID string              `json:"operation_id"`
	Version     uint64              `json:"version"`
	Balances    []inventory.Balance `json:"balances"`
	Replayed    bool                `json:"replayed"`
}

type operation struct {
	Fingerprint string `json:"fingerprint"`
	Result      Result `json:"result"`
}

type state struct {
	Version    uint64                       `json:"version"`
	Balances   map[string]inventory.Balance `json:"balances"`
	Operations map[string]operation         `json:"operations"`
}

// Ledger stores the complete stock projection in one Core-backed WMS record.
// One successful command becomes one append to one PrismaTec organism.
type Ledger struct {
	store *corestore.Store
	mu    sync.Mutex
}

func New(store *corestore.Store) *Ledger { return &Ledger{store: store} }

func (l *Ledger) Adjust(cmd AdjustCommand) (Result, error) {
	if err := validateLocation(Location{
		WarehouseID: cmd.WarehouseID, BinID: cmd.BinID, ItemID: cmd.ItemID, LotNumber: cmd.LotNumber,
	}); err != nil {
		return Result{}, err
	}
	if cmd.Delta == 0 {
		return Result{}, inventory.ErrInvalidMovement
	}
	return l.execute(cmd.OperationID, cmd, func(st *state) ([]inventory.Balance, error) {
		key := balanceKey(cmd.WarehouseID, cmd.BinID, cmd.ItemID, cmd.LotNumber)
		balance, ok := st.Balances[key]
		if !ok {
			balance = Location{
				WarehouseID: cmd.WarehouseID, BinID: cmd.BinID, ItemID: cmd.ItemID, LotNumber: cmd.LotNumber,
			}.balance()
		}
		next, err := balance.Adjust(cmd.Delta)
		if err != nil {
			return nil, err
		}
		st.Balances[key] = next
		return []inventory.Balance{next}, nil
	})
}

func (l *Ledger) Allocate(cmd QuantityCommand) (Result, error) {
	location := Location{WarehouseID: cmd.WarehouseID, BinID: cmd.BinID, ItemID: cmd.ItemID, LotNumber: cmd.LotNumber}
	if err := validateLocation(location); err != nil {
		return Result{}, err
	}
	if cmd.Quantity <= 0 {
		return Result{}, inventory.ErrInvalidMovement
	}
	return l.execute(cmd.OperationID, cmd, func(st *state) ([]inventory.Balance, error) {
		key := balanceKey(cmd.WarehouseID, cmd.BinID, cmd.ItemID, cmd.LotNumber)
		balance, ok := st.Balances[key]
		if !ok {
			balance = location.balance()
		}
		next, err := balance.Allocate(cmd.Quantity)
		if err != nil {
			return nil, err
		}
		st.Balances[key] = next
		return []inventory.Balance{next}, nil
	})
}

func (l *Ledger) Release(cmd QuantityCommand) (Result, error) {
	location := Location{WarehouseID: cmd.WarehouseID, BinID: cmd.BinID, ItemID: cmd.ItemID, LotNumber: cmd.LotNumber}
	if err := validateLocation(location); err != nil {
		return Result{}, err
	}
	if cmd.Quantity <= 0 {
		return Result{}, inventory.ErrInvalidMovement
	}
	return l.execute(cmd.OperationID, cmd, func(st *state) ([]inventory.Balance, error) {
		key := balanceKey(cmd.WarehouseID, cmd.BinID, cmd.ItemID, cmd.LotNumber)
		balance, ok := st.Balances[key]
		if !ok {
			return nil, inventory.ErrInsufficientAvailable
		}
		next, err := balance.Release(cmd.Quantity)
		if err != nil {
			return nil, err
		}
		st.Balances[key] = next
		return []inventory.Balance{next}, nil
	})
}

func (l *Ledger) Move(cmd MoveCommand) (Result, error) {
	if err := validateLocation(cmd.Source); err != nil {
		return Result{}, err
	}
	if err := validateLocation(cmd.Destination); err != nil {
		return Result{}, err
	}
	if cmd.Quantity <= 0 {
		return Result{}, inventory.ErrInvalidMovement
	}
	return l.execute(cmd.OperationID, cmd, func(st *state) ([]inventory.Balance, error) {
		sourceKey := balanceKey(cmd.Source.WarehouseID, cmd.Source.BinID, cmd.Source.ItemID, cmd.Source.LotNumber)
		destinationKey := balanceKey(cmd.Destination.WarehouseID, cmd.Destination.BinID, cmd.Destination.ItemID, cmd.Destination.LotNumber)
		source, ok := st.Balances[sourceKey]
		if !ok {
			source = cmd.Source.balance()
		}
		destination, ok := st.Balances[destinationKey]
		if !ok {
			destination = cmd.Destination.balance()
		}
		nextSource, nextDestination, err := inventory.ValidateMove(source, destination, cmd.Quantity)
		if err != nil {
			return nil, err
		}
		st.Balances[sourceKey] = nextSource
		st.Balances[destinationKey] = nextDestination
		return []inventory.Balance{nextSource, nextDestination}, nil
	})
}

func (l *Ledger) List() ([]inventory.Balance, uint64, error) {
	l.mu.Lock()
	defer l.mu.Unlock()
	st, err := l.load()
	if err != nil {
		return nil, 0, err
	}
	keys := make([]string, 0, len(st.Balances))
	for key := range st.Balances {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	out := make([]inventory.Balance, 0, len(keys))
	for _, key := range keys {
		out = append(out, st.Balances[key])
	}
	return out, st.Version, nil
}

func (l *Ledger) execute(operationID string, command any, apply func(*state) ([]inventory.Balance, error)) (Result, error) {
	if !validOperationID(operationID) {
		return Result{}, ErrInvalidOperationID
	}
	fingerprintBytes, err := json.Marshal(command)
	if err != nil {
		return Result{}, fmt.Errorf("encode inventory command: %w", err)
	}
	sum := sha256.Sum256(fingerprintBytes)
	fingerprint := hex.EncodeToString(sum[:])

	l.mu.Lock()
	defer l.mu.Unlock()

	st, err := l.load()
	if err != nil {
		return Result{}, err
	}
	if previous, ok := st.Operations[operationID]; ok {
		if previous.Fingerprint != fingerprint {
			return Result{}, ErrIdempotencyConflict
		}
		result := previous.Result
		result.Replayed = true
		if err := l.store.Sync(ledgerKind, ledgerID); err != nil {
			return result, fmt.Errorf("retry pending inventory replication: %w", err)
		}
		return result, nil
	}

	changed, err := apply(&st)
	if err != nil {
		return Result{}, err
	}
	st.Version++
	result := Result{OperationID: operationID, Version: st.Version, Balances: changed}
	st.Operations[operationID] = operation{Fingerprint: fingerprint, Result: result}

	data, err := json.Marshal(st)
	if err != nil {
		return Result{}, fmt.Errorf("encode inventory state: %w", err)
	}
	if _, err := l.store.Put(ledgerKind, ledgerID, data); err != nil {
		return Result{}, fmt.Errorf("persist inventory transaction in PrismaTec: %w", err)
	}
	return result, nil
}

func (l *Ledger) load() (state, error) {
	if l.store == nil {
		return state{}, fmt.Errorf("inventory ledger has no Core store")
	}
	record, found, err := l.store.Get(ledgerKind, ledgerID)
	if err != nil {
		return state{}, fmt.Errorf("load inventory ledger: %w", err)
	}
	if !found {
		return state{Balances: make(map[string]inventory.Balance), Operations: make(map[string]operation)}, nil
	}
	var st state
	if err := json.Unmarshal(record.Data, &st); err != nil {
		return state{}, fmt.Errorf("%w: %v", ErrCorruptLedger, err)
	}
	if st.Balances == nil {
		st.Balances = make(map[string]inventory.Balance)
	}
	if st.Operations == nil {
		st.Operations = make(map[string]operation)
	}
	for key, balance := range st.Balances {
		if err := balance.Validate(); err != nil || key != balanceKey(balance.WarehouseID, balance.BinID, balance.ItemID, balance.LotNumber) {
			return state{}, fmt.Errorf("%w: invalid balance or key", ErrCorruptLedger)
		}
	}
	return st, nil
}

func validateLocation(location Location) error {
	if len(location.LotNumber) > 128 || strings.TrimSpace(location.LotNumber) != location.LotNumber {
		return inventory.ErrInvalidBalance
	}
	return location.balance().Validate()
}

func balanceKey(warehouseID, binID, itemID int64, lot string) string {
	return fmt.Sprintf("%d|%d|%d|%s", warehouseID, binID, itemID, lot)
}

func validOperationID(value string) bool {
	if len(value) == 0 || len(value) > 128 {
		return false
	}
	for _, r := range value {
		if !(r >= 'a' && r <= 'z') && !(r >= 'A' && r <= 'Z') &&
			!(r >= '0' && r <= '9') && r != '-' && r != '_' {
			return false
		}
	}
	return true
}
