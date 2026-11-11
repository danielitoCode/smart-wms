package fulfillment

import (
	"errors"
	"encoding/json"
	"fmt"
	"strconv"
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
	store *corestore.Store
	sos *salesorders.Repository
	mu  sync.Mutex
}

const shipmentKind = "wms_fulfillment"

func New(store *corestore.Store, sos *salesorders.Repository) *Service {
	return &Service{store: store, sos: sos}
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
	PreShipStatus  string    `json:"pre_ship_status"`
	VoidedAt       *time.Time `json:"voided_at,omitempty"`
	VoidedBy       string     `json:"voided_by,omitempty"`
	VoidReason     string     `json:"void_reason,omitempty"`
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
	if strings.TrimSpace(in.Carrier) == "" || strings.TrimSpace(in.TrackingNumber) == "" {
		return Shipment{}, ErrInvalid
	}
	if len(so.Lines) == 0 { return Shipment{}, ErrState }
	for i := range so.Lines {
		line := &so.Lines[i]
		qty := line.QuantityPacked
		if qty == 0 { qty = line.QuantityPicked }
		if qty < line.QuantityOrdered { return Shipment{}, ErrState }
	}
	now := time.Now().UTC()
	shipment := Shipment{
		SOID: so.SOID, Carrier: strings.TrimSpace(in.Carrier),
		TrackingNumber: strings.TrimSpace(in.TrackingNumber),
		ShippedAt: now, Status: "PREPARING", PreShipStatus: so.Status,
	}
	if s.store == nil {
		return Shipment{}, fmt.Errorf("fulfillment store is not configured")
	}
	data, err := json.Marshal(shipment)
	if err != nil { return Shipment{}, err }
	if _, err := s.store.Put(shipmentKind, strconv.FormatInt(so.SOID, 10), data); err != nil {
		return Shipment{}, err
	}
	for i := range so.Lines {
		line := &so.Lines[i]
		qty := line.QuantityPacked
		if qty == 0 { qty = line.QuantityPicked }
		line.QuantityShipped = qty
		line.Status = salesorders.LineShipped
	}
	so.Status = salesorders.StatusShipped
	if err := s.sos.Save(so); err != nil {
		return Shipment{}, err
	}
	shipment.Status = "SHIPPED"
	data, err = json.Marshal(shipment)
	if err != nil { return Shipment{}, err }
	if _, err := s.store.Put(shipmentKind, strconv.FormatInt(so.SOID, 10), data); err != nil {
		return Shipment{}, fmt.Errorf("order shipped but shipment marker persistence failed: %w", err)
	}
	return shipment, nil
}

// Void reverses the latest shipment record for an order. The transition is
// persisted as VOIDING before the order is changed, so a retry can finish a
// crash-interrupted void without applying the reversal twice.
func (s *Service) Void(soID int64, actor, reason string) (Shipment, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.store == nil { return Shipment{}, fmt.Errorf("fulfillment store is not configured") }
	key := strconv.FormatInt(soID, 10)
	rec, ok, err := s.store.Get(shipmentKind, key)
	if err != nil { return Shipment{}, err }
	if !ok { return Shipment{}, ErrNotFound }
	var shipment Shipment
	if err := json.Unmarshal(rec.Data, &shipment); err != nil { return Shipment{}, err }
	if shipment.Status == "VOIDED" { return shipment, nil }
	if shipment.Status != "SHIPPED" && shipment.Status != "VOIDING" {
		return Shipment{}, ErrState
	}
	so, err := s.sos.Get(soID)
	if err != nil { return Shipment{}, ErrNotFound }
	if shipment.PreShipStatus == "" { shipment.PreShipStatus = salesorders.StatusPicked }
	if shipment.Status != "VOIDING" {
		shipment.Status = "VOIDING"
		data, _ := json.Marshal(shipment)
		if _, err := s.store.Put(shipmentKind, key, data); err != nil { return Shipment{}, err }
	}
	if so.Status == salesorders.StatusShipped {
		so.Status = shipment.PreShipStatus
		for i := range so.Lines {
			line := &so.Lines[i]
			line.QuantityShipped = 0
			if shipment.PreShipStatus == salesorders.StatusPacked {
				line.Status = salesorders.LinePacked
			} else {
				line.Status = salesorders.LinePicked
			}
		}
		if err := s.sos.Save(so); err != nil { return Shipment{}, err }
	} else if so.Status != shipment.PreShipStatus {
		return Shipment{}, fmt.Errorf("%w: order is %s, expected SHIPPED or %s", ErrState, so.Status, shipment.PreShipStatus)
	}
	now := time.Now().UTC()
	shipment.Status, shipment.VoidedAt, shipment.VoidedBy, shipment.VoidReason = "VOIDED", &now, actor, strings.TrimSpace(reason)
	data, err := json.Marshal(shipment)
	if err != nil { return Shipment{}, err }
	if _, err := s.store.Put(shipmentKind, key, data); err != nil { return Shipment{}, err }
	return shipment, nil
}
