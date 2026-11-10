package inventory

import (
	"errors"
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

func TestMoveRejectsSameBucket(t *testing.T) {
	b := Balance{WarehouseID:1,BinID:2,ItemID:3,OnHand:10}
	_, _, err := ValidateMove(b,b,1)
	if !errors.Is(err, ErrInvalidMovement) { t.Fatalf("expected invalid movement, got %v", err) }
}
