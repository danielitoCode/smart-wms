package fulfillment

import (
	"errors"
	"strings"
	"sync"
	"time"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/salesorders"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
)

var (
	ErrNotFound = errors.New("order not found")
	ErrInvalid  = errors.New("invalid fulfillment request")
	ErrState    = errors.New("order not in required state")
	ErrScope    = errors.New("warehouse scope denied")
)

type Service struct {
	sos *salesorders.Repository
	mu  sync.Mutex
}

func New(_ *corestore.Store, sos *salesorders.Repository) *Service {
	return &Service{sos: sos}
}

func contains(ids []int64, id int64) bool {
	for _, v := range ids {
		if v == id {
			return true
		}
	}
	return false
}

func (s *Service) LookupPackOrder(barcode string, allowed []int64, isAdmin bool) (salesorders.SalesOrder, error) {
	so, err := s.sos.FindByBarcode(barcode)
	if err != nil {
		return salesorders.SalesOrder{}, ErrNotFound
	}
	if !isAdmin && !contains(allowed, so.WarehouseID) {
		return salesorders.SalesOrder{}, ErrNotFound
	}
	return so, nil
}

func (s *Service) VerifyPack(soID, itemID int64, qty int64, allowed []int64, isAdmin bool) (salesorders.SalesOrder, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	so, err := s.sos.Get(soID)
	if err != nil {
		return salesorders.SalesOrder{}, ErrNotFound
	}
	if !isAdmin && !contains(allowed, so.WarehouseID) {
		return salesorders.SalesOrder{}, ErrScope
	}
	found := false
	for i := range so.Lines {
		if so.Lines[i].ItemID == itemID {
			found = true
			so.Lines[i].QuantityPacked += qty
			if so.Lines[i].QuantityPacked > so.Lines[i].QuantityOrdered {
				so.Lines[i].QuantityPacked = so.Lines[i].QuantityOrdered
			}
			if so.Lines[i].QuantityPacked >= so.Lines[i].QuantityOrdered {
				so.Lines[i].Status = salesorders.LinePacked
			}
		}
	}
	if !found {
		return salesorders.SalesOrder{}, ErrInvalid
	}
	return so, s.sos.Save(so)
}

func (s *Service) CompletePack(soID int64, allowed []int64, isAdmin bool) (salesorders.SalesOrder, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	so, err := s.sos.Get(soID)
	if err != nil {
		return salesorders.SalesOrder{}, ErrNotFound
	}
	if !isAdmin && !contains(allowed, so.WarehouseID) {
		return salesorders.SalesOrder{}, ErrScope
	}
	for i := range so.Lines {
		line := &so.Lines[i]
		if line.QuantityPacked < line.QuantityOrdered {
			if line.QuantityPacked == 0 && line.QuantityPicked > 0 {
				line.QuantityPacked = line.QuantityPicked
			}
			if line.QuantityPacked < line.QuantityOrdered {
				return salesorders.SalesOrder{}, ErrState
			}
		}
		line.Status = salesorders.LinePacked
	}
	so.Status = salesorders.StatusPacked
	return so, s.sos.Save(so)
}

type FulfillInput struct {
	SOID            int64  `json:"so_id"`
	Carrier         string `json:"carrier"`
	TrackingNumber  string `json:"tracking_number"`
	WarehouseID     int64  `json:"warehouse_id"`
}

type Shipment struct {
	SOID           int64     `json:"so_id"`
	Carrier        string    `json:"carrier"`
	TrackingNumber string    `json:"tracking_number"`
	ShippedAt      time.Time `json:"shipped_at"`
	Status         string    `json:"status"`
}

func (s *Service) Fulfill(in FulfillInput, allowed []int64, isAdmin bool) (Shipment, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	so, err := s.sos.Get(in.SOID)
	if err != nil {
		return Shipment{}, ErrNotFound
	}
	if !isAdmin && !contains(allowed, so.WarehouseID) {
		return Shipment{}, ErrScope
	}
	if so.Status != salesorders.StatusPacked && so.Status != salesorders.StatusPicked {
		// allow shipping picked orders if packing skipped by config
		if so.Status != salesorders.StatusPicked {
			return Shipment{}, ErrState
		}
	}
	so.Status = salesorders.StatusShipped
	if err := s.sos.Save(so); err != nil {
		return Shipment{}, err
	}
	return Shipment{
		SOID: so.SOID, Carrier: strings.TrimSpace(in.Carrier),
		TrackingNumber: strings.TrimSpace(in.TrackingNumber),
		ShippedAt: time.Now().UTC(), Status: "SHIPPED",
	}, nil
}
