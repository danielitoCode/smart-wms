package fulfillment

import (
	"errors"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/salesorders"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/inventoryledger"
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
	ledger *inventoryledger.Ledger
	mu  sync.Mutex
}

const shipmentKind = "wms_fulfillment"

func New(store *corestore.Store, sos *salesorders.Repository, ledgers ...*inventoryledger.Ledger) *Service {
	service := &Service{store: store, sos: sos}
	if len(ledgers) > 0 { service.ledger = ledgers[0] }
	return service
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
	VoidOperationID string `json:"void_operation_id,omitempty"`
	VoidFingerprint string `json:"void_fingerprint,omitempty"`
	Replayed bool `json:"replayed,omitempty"`
	VoidReversedKeys []string `json:"void_reversed_keys,omitempty"`
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
	if s.store != nil {
		if record, exists, readErr := s.store.Get(shipmentKind, strconv.FormatInt(so.SOID, 10)); readErr != nil {
			return Shipment{}, readErr
		} else if exists {
			var prior Shipment
			if json.Unmarshal(record.Data, &prior) == nil && (prior.Status == "SHIPPED" || prior.Status == "PREPARING") && so.Status == salesorders.StatusShipped {
				if strings.TrimSpace(in.Carrier) != prior.Carrier || strings.TrimSpace(in.TrackingNumber) != prior.TrackingNumber { return Shipment{}, ErrState }
				if prior.Status == "PREPARING" {
					prior.Status = "SHIPPED"
					data, _ := json.Marshal(prior)
					if _, err := s.store.Put(shipmentKind, strconv.FormatInt(so.SOID, 10), data); err != nil { return Shipment{}, err }
				}
				prior.Replayed = true
				return prior, nil
			}
		}
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
func (s *Service) GetShipment(soID int64) (Shipment, error) {
	if s.store == nil { return Shipment{}, fmt.Errorf("fulfillment store is not configured") }
	rec, ok, err := s.store.Get(shipmentKind, strconv.FormatInt(soID, 10))
	if err != nil { return Shipment{}, err }
	if !ok { return Shipment{}, ErrNotFound }
	var shipment Shipment
	if err := json.Unmarshal(rec.Data, &shipment); err != nil { return Shipment{}, err }
	return shipment, nil
}

func (s *Service) Void(soID int64, actor, reason string) (Shipment, error) {
	return s.VoidWithID(soID, actor, reason, fmt.Sprintf("legacy-void-%d", soID))
}

func (s *Service) VoidWithID(soID int64, actor, reason, operationID string) (Shipment, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.store == nil { return Shipment{}, fmt.Errorf("fulfillment store is not configured") }
	if strings.TrimSpace(operationID) == "" || len(operationID) > 128 || strings.TrimSpace(actor) == "" || strings.TrimSpace(reason) == "" || len(reason) > 500 { return Shipment{}, ErrInvalid }
	key := strconv.FormatInt(soID, 10)
	rec, ok, err := s.store.Get(shipmentKind, key)
	if err != nil { return Shipment{}, err }
	if !ok { return Shipment{}, ErrNotFound }
	var shipment Shipment
	if err := json.Unmarshal(rec.Data, &shipment); err != nil { return Shipment{}, err }
	fingerprintBytes := sha256.Sum256([]byte(fmt.Sprintf("%d|%s|%s", soID, actor, reason)))
	fingerprint := hex.EncodeToString(fingerprintBytes[:])
	if shipment.Status == "VOIDED" {
		if shipment.VoidOperationID == operationID && shipment.VoidFingerprint == fingerprint {
			// Complete a sale marker if the process stopped after persisting the
			// shipment's terminal state. Reversed ledger operation IDs prevent
			// any stock movement from being applied twice.
			if err := s.reversePOSDispatch(&shipment, operationID); err != nil { return Shipment{}, err }
			shipment.Replayed = true
			return shipment, nil
		}
		return Shipment{}, fmt.Errorf("%w: shipment already voided by a different operation", ErrState)
	}
	if shipment.Status == "VOIDING" && (shipment.VoidOperationID != operationID || shipment.VoidFingerprint != fingerprint) {
		return Shipment{}, fmt.Errorf("%w: another void operation is in progress", ErrState)
	}
	if shipment.Status != "SHIPPED" && shipment.Status != "VOIDING" { return Shipment{}, ErrState }
	shipment.VoidOperationID, shipment.VoidFingerprint = operationID, fingerprint
	so, err := s.sos.Get(soID)
	if err != nil { return Shipment{}, ErrNotFound }
	if shipment.PreShipStatus == "" { shipment.PreShipStatus = salesorders.StatusPicked }
	if so.Status != salesorders.StatusShipped && so.Status != shipment.PreShipStatus {
		return Shipment{}, fmt.Errorf("%w: order is %s, expected SHIPPED or %s", ErrState, so.Status, shipment.PreShipStatus)
	}
	if shipment.Status != "VOIDING" {
		shipment.Status = "VOIDING"
		data, _ := json.Marshal(shipment)
		if _, err := s.store.Put(shipmentKind, key, data); err != nil { return Shipment{}, err }
	}
	if err := s.reversePOSDispatch(&shipment, operationID); err != nil { return Shipment{}, err }
	if so.Status == salesorders.StatusShipped {
		// A corrective admin shipment can have SHIPPED as its pre-ship
		// status. In that case the original order/line shipment data belongs
		// to the imported order and must not be erased by voiding this marker.
		if shipment.PreShipStatus != salesorders.StatusShipped {
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
		}
	}
	now := time.Now().UTC()
	shipment.Status, shipment.VoidedAt, shipment.VoidedBy, shipment.VoidReason = "VOIDED", &now, actor, strings.TrimSpace(reason)
	data, err := json.Marshal(shipment)
	if err != nil { return Shipment{}, err }
	if _, err := s.store.Put(shipmentKind, key, data); err != nil { return Shipment{}, err }
	return shipment, nil
}

func (s *Service) reversePOSDispatch(shipment *Shipment, operationID string) error {
	records, err := s.store.List("wms_pos_sale")
	if err != nil { return err }
	for _, record := range records {
		var sale struct {
			ID string `json:"id"`
			SOID int64 `json:"so_id"`
			Status string `json:"status"`
			PhoneOrder bool `json:"phone_order"`
			DispatchKey string `json:"dispatch_key"`
			DispatchFingerprint string `json:"dispatch_fingerprint"`
			Lines []struct {
				WarehouseID int64 `json:"warehouse_id"`
				BinID int64 `json:"bin_id"`
				ItemID int64 `json:"item_id"`
				Quantity int64 `json:"quantity"`
			} `json:"lines"`
		}
		if err := json.Unmarshal(record.Data, &sale); err != nil { continue }
		if sale.SOID != shipment.SOID { continue }
		switch sale.Status {
		case "VOIDED":
			return nil
		case "PARTIALLY_REFUNDED", "REFUNDED":
			return fmt.Errorf("%w: POS sale has refunds; shipment void requires a reconciled refund workflow", ErrState)
		case "DISPATCHING":
			return fmt.Errorf("%w: POS dispatch is still in progress", ErrState)
		case "DISPATCHED":
			// A phone order reaches this state only after its reservation has
			// been released and its on-hand stock has been committed.
		case "COMPLETED":
			// A completed phone sale with its dispatch key cleared and every
			// reversal recorded is the durable post-void state. This also
			// repairs a crash after the sale marker but before shipment finalization.
			if sale.PhoneOrder {
				if len(shipment.VoidReversedKeys) > 0 && sale.DispatchKey == "" { return nil }
				return fmt.Errorf("%w: phone order must complete POS dispatch before shipment void", ErrState)
			}
			// Checkout decrements on-hand stock immediately for counter sales.
		default:
			return nil
		}
		if s.ledger == nil { return fmt.Errorf("POS shipment void requires an inventory ledger") }
		aggregated := make(map[string]struct{ WarehouseID, BinID, ItemID, Quantity int64 })
		order := make([]string, 0)
		for _, line := range sale.Lines {
			if line.WarehouseID <= 0 || line.BinID <= 0 || line.ItemID <= 0 || line.Quantity <= 0 { return fmt.Errorf("POS sale contains invalid inventory movement") }
			key := fmt.Sprintf("%d:%d:%d", line.WarehouseID, line.BinID, line.ItemID)
			current, exists := aggregated[key]
			if !exists { current.WarehouseID, current.BinID, current.ItemID = line.WarehouseID, line.BinID, line.ItemID; order = append(order,key) }
			if current.Quantity > int64(^uint64(0)>>1)-line.Quantity { return fmt.Errorf("POS sale quantity overflow") }
			current.Quantity += line.Quantity
			aggregated[key] = current
		}
		reversed := make(map[string]bool,len(shipment.VoidReversedKeys))
		for _, key := range shipment.VoidReversedKeys { reversed[key] = true }
		for _, key := range order {
			if reversed[key] { continue }
			line := aggregated[key]
			sum := sha256.Sum256([]byte("fulfillment-void-pos|" + operationID + "|" + key))
			ledgerOperationID := "void-pos-" + hex.EncodeToString(sum[:16])
			if _, err := s.ledger.Adjust(inventoryledger.AdjustCommand{
				OperationID:ledgerOperationID, WarehouseID:line.WarehouseID, BinID:line.BinID,
				ItemID:line.ItemID, Delta:line.Quantity,
			}); err != nil { return fmt.Errorf("restore POS on-hand inventory movement %s: %w",key,err) }
			// Phone-order checkout had reserved this quantity before dispatch.
			// A void must restore that reservation as well as on-hand. A regular
			// POS sale had no reservation, so allocating it here would overstate
			// allocated inventory.
			if sale.PhoneOrder {
				allocateSum := sha256.Sum256([]byte("fulfillment-void-pos-allocation|" + operationID + "|" + key))
				allocateID := "void-pos-alloc-" + hex.EncodeToString(allocateSum[:12])
				if _, err := s.ledger.Allocate(inventoryledger.QuantityCommand{
					OperationID:allocateID, WarehouseID:line.WarehouseID, BinID:line.BinID,
					ItemID:line.ItemID, Quantity:line.Quantity,
				}); err != nil { return fmt.Errorf("restore POS reservation %s: %w",key,err) }
			}
			shipment.VoidReversedKeys = append(shipment.VoidReversedKeys,key)
			data, err := json.Marshal(shipment)
			if err != nil { return err }
			if _, err := s.store.Put(shipmentKind,strconv.FormatInt(shipment.SOID,10),data); err != nil { return err }
		}
		// Return the sale to its paid-but-not-dispatched state. A phone order
		// may now be dispatched again with a fresh idempotency key.
		sale.Status = "COMPLETED"
		if sale.PhoneOrder { sale.DispatchKey, sale.DispatchFingerprint = "", "" }
		data, err := json.Marshal(sale)
		if err != nil { return err }
		if _, err := s.store.Put("wms_pos_sale",sale.ID,data); err != nil { return err }
		return nil
	}
	return nil
}

func (s *Service) VoidLegacy(soID int64, actor, reason string) (Shipment, error) {
	if s.store == nil { return Shipment{}, fmt.Errorf("fulfillment store is not configured") }
	key := strconv.FormatInt(soID,10)
	record, exists, err := s.store.Get(shipmentKind,key)
	if err != nil { return Shipment{}, err }
	if !exists { return Shipment{}, ErrNotFound }
	var shipment Shipment
	if err := json.Unmarshal(record.Data,&shipment); err != nil { return Shipment{}, err }
	operationID := shipment.VoidOperationID
	if operationID == "" {
		// The shipment timestamp changes on every new fulfillment generation.
		// This keeps retries of the same legacy request idempotent without
		// reusing a compensation operation after a later redispatch.
		operationID = fmt.Sprintf("legacy-void-%d-%d",soID,shipment.ShippedAt.UTC().UnixNano())
	}
	return s.VoidWithID(soID,actor,reason,operationID)
}
