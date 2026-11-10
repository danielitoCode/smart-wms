package inventoryledger

import (
	"errors"
	"fmt"
	"sync"
	"testing"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/domain/inventory"
	"github.com/yecharlot/PrismaTec-Core/core"
)

func newLedger(t *testing.T, dir string) *Ledger {
	t.Helper()
	node, err := core.NewNode(core.Config{DataDir: dir, Name: "wms-ledger-test"})
	if err != nil {
		t.Fatal(err)
	}
	return New(corestore.New(node.Organisms()))
}

func TestAdjustAllocateReleaseAndIdempotency(t *testing.T) {
	ledger := newLedger(t, t.TempDir())
	adjust := AdjustCommand{OperationID: "adjust-1", WarehouseID: 1, BinID: 10, ItemID: 20, Delta: 10}
	first, err := ledger.Adjust(adjust)
	if err != nil {
		t.Fatal(err)
	}
	replayed, err := ledger.Adjust(adjust)
	if err != nil {
		t.Fatal(err)
	}
	if !replayed.Replayed || replayed.Version != first.Version {
		t.Fatalf("expected idempotent replay, got %+v", replayed)
	}
	adjust.Delta = 11
	if _, err := ledger.Adjust(adjust); !errors.Is(err, ErrIdempotencyConflict) {
		t.Fatalf("expected idempotency conflict, got %v", err)
	}
	if _, err := ledger.Allocate(QuantityCommand{OperationID: "allocate-1", WarehouseID: 1, BinID: 10, ItemID: 20, Quantity: 4}); err != nil {
		t.Fatal(err)
	}
	if _, err := ledger.Release(QuantityCommand{OperationID: "release-1", WarehouseID: 1, BinID: 10, ItemID: 20, Quantity: 2}); err != nil {
		t.Fatal(err)
	}
	balances, version, err := ledger.List()
	if err != nil {
		t.Fatal(err)
	}
	if version != 3 || len(balances) != 1 || balances[0].OnHand != 10 || balances[0].Allocated != 2 || balances[0].Available() != 8 {
		t.Fatalf("unexpected ledger projection: version=%d balances=%+v", version, balances)
	}
}

func TestMovePersistsBothBalancesInOneLedgerWrite(t *testing.T) {
	ledger := newLedger(t, t.TempDir())
	if _, err := ledger.Adjust(AdjustCommand{OperationID: "seed", WarehouseID: 1, BinID: 10, ItemID: 20, Delta: 12}); err != nil {
		t.Fatal(err)
	}
	result, err := ledger.Move(MoveCommand{
		OperationID: "move-1",
		Source:      Location{WarehouseID: 1, BinID: 10, ItemID: 20},
		Destination: Location{WarehouseID: 2, BinID: 30, ItemID: 20},
		Quantity:    5,
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(result.Balances) != 2 || result.Balances[0].OnHand != 7 || result.Balances[1].OnHand != 5 {
		t.Fatalf("unexpected movement result: %+v", result)
	}
	balances, _, err := ledger.List()
	if err != nil {
		t.Fatal(err)
	}
	if len(balances) != 2 {
		t.Fatalf("expected two balances, got %d", len(balances))
	}
}

func TestLedgerSurvivesCoreNodeRestart(t *testing.T) {
	dir := t.TempDir()
	first := newLedger(t, dir)
	if _, err := first.Adjust(AdjustCommand{OperationID: "durable-1", WarehouseID: 1, BinID: 2, ItemID: 3, Delta: 17}); err != nil {
		t.Fatal(err)
	}
	restarted := newLedger(t, dir)
	balances, version, err := restarted.List()
	if err != nil {
		t.Fatal(err)
	}
	if version != 1 || len(balances) != 1 || balances[0].OnHand != 17 {
		t.Fatalf("state not restored after restart: version=%d balances=%+v", version, balances)
	}
}

func TestConcurrentAdjustmentsAreSerializedInOneRuntime(t *testing.T) {
	ledger := newLedger(t, t.TempDir())
	const count = 24
	var wg sync.WaitGroup
	errs := make(chan error, count)
	for i := 0; i < count; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			_, err := ledger.Adjust(AdjustCommand{
				OperationID: fmt.Sprintf("parallel-%d", i),
				WarehouseID: 1, BinID: 2, ItemID: 3, Delta: 1,
			})
			if err != nil {
				errs <- err
			}
		}(i)
	}
	wg.Wait()
	close(errs)
	for err := range errs {
		t.Error(err)
	}
	balances, version, err := ledger.List()
	if err != nil {
		t.Fatal(err)
	}
	if version != count || len(balances) != 1 || balances[0].OnHand != count {
		t.Fatalf("lost concurrent update: version=%d balances=%+v", version, balances)
	}
}
