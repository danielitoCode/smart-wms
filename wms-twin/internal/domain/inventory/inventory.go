package inventory

import (
	"errors"
	"math"
)

var (
	ErrNegativeQuantity       = errors.New("quantity cannot be negative")
	ErrInsufficientAvailable  = errors.New("insufficient available quantity")
	ErrInvalidMovement        = errors.New("invalid inventory movement")
	ErrQuantityOverflow       = errors.New("quantity overflow")
	ErrInvalidBalance         = errors.New("invalid inventory balance")
)

// Balance models one item/lot in one bin. Available stock is on-hand less
// allocated stock; reservations never silently create negative availability.
type Balance struct {
	WarehouseID int64  `json:"warehouse_id"`
	BinID       int64  `json:"bin_id"`
	ItemID      int64  `json:"item_id"`
	LotNumber   string `json:"lot_number,omitempty"`
	OnHand      int64  `json:"quantity_on_hand"`
	Allocated   int64  `json:"quantity_allocated"`
}

func (b Balance) Available() int64 { return b.OnHand - b.Allocated }

func (b Balance) Validate() error {
	if b.WarehouseID <= 0 || b.BinID <= 0 || b.ItemID <= 0 || b.OnHand < 0 || b.Allocated < 0 || b.Allocated > b.OnHand {
		return ErrInvalidBalance
	}
	return nil
}

func (b Balance) Allocate(quantity int64) (Balance, error) {
	if quantity < 0 { return b, ErrNegativeQuantity }
	if err := b.Validate(); err != nil { return b, err }
	if quantity > b.Available() { return b, ErrInsufficientAvailable }
	b.Allocated += quantity
	return b, nil
}

func (b Balance) Release(quantity int64) (Balance, error) {
	if quantity < 0 { return b, ErrNegativeQuantity }
	if err := b.Validate(); err != nil { return b, err }
	if quantity > b.Allocated { return b, ErrInsufficientAvailable }
	b.Allocated -= quantity
	return b, nil
}

func (b Balance) Adjust(delta int64) (Balance, error) {
	if err := b.Validate(); err != nil { return b, err }
	if delta > 0 && b.OnHand > math.MaxInt64-delta { return b, ErrQuantityOverflow }
	if delta < 0 && b.OnHand < math.MinInt64-delta { return b, ErrQuantityOverflow }
	next := b.OnHand + delta
	if next < b.Allocated { return b, ErrInsufficientAvailable }
	if next < 0 { return b, ErrNegativeQuantity }
	b.OnHand = next
	return b, nil
}

// ValidateMove is a pure operation: on any error it returns the original
// balances, so callers cannot accidentally persist a partial movement.
func ValidateMove(source, destination Balance, quantity int64) (Balance, Balance, error) {
	originalSource, originalDestination := source, destination
	if quantity < 0 { return source, destination, ErrNegativeQuantity }
	if quantity == 0 { return source, destination, ErrInvalidMovement }
	if err := source.Validate(); err != nil { return originalSource, originalDestination, err }
	if err := destination.Validate(); err != nil { return originalSource, originalDestination, err }
	if source.WarehouseID == destination.WarehouseID && source.BinID == destination.BinID {
		return source, destination, ErrInvalidMovement
	}
	if source.ItemID != destination.ItemID || source.LotNumber != destination.LotNumber {
		return source, destination, ErrInvalidMovement
	}
	if quantity > source.Available() { return source, destination, ErrInsufficientAvailable }
	if destination.OnHand > math.MaxInt64-quantity { return source, destination, ErrQuantityOverflow }

	source.OnHand -= quantity
	destination.OnHand += quantity
	if err := source.Validate(); err != nil { return originalSource, originalDestination, err }
	if err := destination.Validate(); err != nil { return originalSource, originalDestination, err }
	return source, destination, nil
}
