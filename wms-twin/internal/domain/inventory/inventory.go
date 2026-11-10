package inventory

import "errors"

var (
	ErrNegativeQuantity = errors.New("quantity cannot be negative")
	ErrInsufficientAvailable = errors.New("insufficient available quantity")
	ErrInvalidMovement = errors.New("source and destination must differ")
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
	if b.OnHand < 0 || b.Allocated < 0 {
		return ErrNegativeQuantity
	}
	if b.Allocated > b.OnHand {
		return ErrInsufficientAvailable
	}
	if b.WarehouseID <= 0 || b.BinID <= 0 || b.ItemID <= 0 {
		return errors.New("warehouse_id, bin_id and item_id must be positive")
	}
	return nil
}

func (b Balance) Allocate(quantity int64) (Balance, error) {
	if quantity < 0 { return b, ErrNegativeQuantity }
	if quantity > b.Available() { return b, ErrInsufficientAvailable }
	b.Allocated += quantity
	return b, nil
}

func (b Balance) Release(quantity int64) (Balance, error) {
	if quantity < 0 { return b, ErrNegativeQuantity }
	if quantity > b.Allocated { return b, ErrInsufficientAvailable }
	b.Allocated -= quantity
	return b, nil
}

func (b Balance) Adjust(delta int64) (Balance, error) {
	next := b.OnHand + delta
	if next < b.Allocated { return b, ErrInsufficientAvailable }
	if next < 0 { return b, ErrNegativeQuantity }
	b.OnHand = next
	return b, nil
}

func ValidateMove(source, destination Balance, quantity int64) (Balance, Balance, error) {
	if quantity < 0 { return source, destination, ErrNegativeQuantity }
	if source.WarehouseID == destination.WarehouseID && source.BinID == destination.BinID && source.ItemID == destination.ItemID && source.LotNumber == destination.LotNumber {
		return source, destination, ErrInvalidMovement
	}
	if quantity > source.Available() { return source, destination, ErrInsufficientAvailable }
	source.OnHand -= quantity
	destination.OnHand += quantity
	if err := source.Validate(); err != nil { return source, destination, err }
	if err := destination.Validate(); err != nil { return source, destination, err }
	return source, destination, nil
}
