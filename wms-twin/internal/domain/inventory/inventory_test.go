package inventory

import (
	"errors"
	"math"
	"testing"
)

func TestAllocateCannotOversell(t *testing.T) {
	b := Balance{WarehouseID:1,BinID:2,ItemID:3,OnHand:10,Allocated:4}
	got, err := b.Allocate(7)
	if !errors.Is(err, ErrInsufficientAvailable) { t.Fatalf("expected insufficient stock, got %v", err) }
	if got.Allocated != 4 { t.Fatal("failed allocation must not mutate the balance") }
}

func TestAllocateAndRelease(t *testing.T) {
	b := Balance{WarehouseID:1,BinID:2,ItemID:3,OnHand:10}
	allocated, err := b.Allocate(6)
	if err != nil { t.Fatal(err) }
	released, err := allocated.Release(2)
	if err != nil { t.Fatal(err) }
	if released.Available() != 6 { t.Fatalf("expected 6 available, got %d", released.Available()) }
}

func TestAdjustCannotRemoveAllocatedStock(t *testing.T) {
	b := Balance{WarehouseID:1,BinID:2,ItemID:3,OnHand:5,Allocated:4}
	got, err := b.Adjust(-2)
	if !errors.Is(err, ErrInsufficientAvailable) { t.Fatalf("expected insufficient stock, got %v", err) }
	if got.OnHand != 5 { t.Fatal("failed adjustment must not mutate the balance") }
}

func TestMoveRequiresSameItemAndReturnsOriginalOnError(t *testing.T) {
	source := Balance{WarehouseID:1,BinID:2,ItemID:3,OnHand:10}
	destination := Balance{WarehouseID:1,BinID:4,ItemID:9,OnHand:1}
	gotSource, gotDestination, err := ValidateMove(source,destination,2)
	if !errors.Is(err, ErrInvalidMovement) { t.Fatalf("expected invalid movement, got %v", err) }
	if gotSource != source || gotDestination != destination { t.Fatal("failed move must return original balances") }
}

func TestMoveChecksOverflow(t *testing.T) {
	source := Balance{WarehouseID:1,BinID:2,ItemID:3,OnHand:10}
	destination := Balance{WarehouseID:2,BinID:4,ItemID:3,OnHand:math.MaxInt64}
	gotSource, gotDestination, err := ValidateMove(source,destination,1)
	if !errors.Is(err, ErrQuantityOverflow) { t.Fatalf("expected overflow, got %v", err) }
	if gotSource != source || gotDestination != destination { t.Fatal("failed move must return original balances") }
}
