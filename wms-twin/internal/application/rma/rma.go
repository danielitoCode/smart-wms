package rma

import (
	"encoding/json"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"sync"
	"strings"
	"strconv"
	"time"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/salesorders"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/catalog"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/inventoryledger"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
)

const kind = "wms_rma"

var (
	ErrNotFound = errors.New("rma not found")
	ErrRestockRequired = errors.New("RMA cannot complete until returned inventory is dispositioned and restocked")
)

type RMALine struct {
	ItemID int64 `json:"item_id"`
	Expected int64 `json:"quantity_expected"`
	Received int64 `json:"quantity_received"`
	Disposition string `json:"disposition,omitempty"`
	Receipts []RMAReceipt `json:"receipts,omitempty"`
}

type RMAReceipt struct {
	OperationID string `json:"operation_id"`
	Quantity int64 `json:"quantity"`
	BinID int64 `json:"bin_id,omitempty"`
	LotNumber string `json:"lot_number,omitempty"`
	Disposition string `json:"disposition"`
	ReceivedAt time.Time `json:"received_at"`
	ReceivedBy string `json:"received_by"`
	Reversed bool `json:"reversed,omitempty"`
}

type RMA struct {
	RMAID     int64     `json:"rma_id"`
	SOID      int64     `json:"so_id"`
	SONumber  string    `json:"so_number"`
	WarehouseID int64 `json:"warehouse_id"`
	Status    string    `json:"status"`
	Reason    string    `json:"reason"`
	CreatedAt time.Time `json:"created_at"`
	CreatedBy string    `json:"created_by"`
	Backorder bool      `json:"backorder"`
	UpdatedAt time.Time `json:"updated_at,omitempty"`
	Notes     string    `json:"notes,omitempty"`
	Lines []RMALine `json:"lines"`
}

type Service struct {
	store *corestore.Store
	sos *salesorders.Repository
	cat *catalog.Repository
	ledger *inventoryledger.Ledger
	mu sync.Mutex
	seq int64
}

func New(store *corestore.Store, sos *salesorders.Repository, cat *catalog.Repository, ledger *inventoryledger.Ledger) *Service {
	service := &Service{store: store, sos: sos, cat: cat, ledger: ledger}
	if records, err := store.List(kind); err == nil {
		for _, record := range records {
			if id, err := strconv.ParseInt(record.ID, 10, 64); err == nil && id > service.seq {
				service.seq = id
			}
		}
	}
	return service
}

func (s *Service) Create(soNumber, reason, actor string, backorder bool) (RMA, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if strings.TrimSpace(soNumber) == "" || len(soNumber) > 128 || strings.TrimSpace(reason) == "" || len(reason) > 500 || strings.TrimSpace(actor) == "" || len(actor) > 128 { return RMA{}, fmt.Errorf("sales order, reason and actor are required within length limits") }
	list, err := s.sos.List()
	if err != nil {
		return RMA{}, err
	}
	var so *salesorders.SalesOrder
	for i := range list {
		if list[i].SONumber == soNumber || list[i].SOBarcode == soNumber {
			so = &list[i]
			break
		}
	}
	if so == nil {
		return RMA{}, salesorders.ErrNotFound
	}
	if so.Status != salesorders.StatusShipped && so.Status != salesorders.StatusPartiallyRefunded {
		return RMA{}, fmt.Errorf("only shipped or partially refunded sales orders can be returned")
	}
	saleID := ""
	saleRecords, err := s.store.List("wms_pos_sale")
	if err != nil { return RMA{}, err }
	for _, record := range saleRecords {
		var sale struct { ID string `json:"id"`; SOID int64 `json:"so_id"` }
		if json.Unmarshal(record.Data, &sale) == nil && sale.SOID == so.SOID { saleID = sale.ID; break }
	}
	refundedByItem := make(map[int64]int64)
	if saleID != "" {
		refundRecords, err := s.store.List("wms_pos_refund")
		if err != nil { return RMA{}, err }
		matchedRefundHistory := false
		for _, record := range refundRecords {
			var refund struct {
				SaleID string `json:"sale_id"`
				Status string `json:"status"`
				Lines []struct { ItemID int64 `json:"item_id"`; Quantity int64 `json:"quantity"` } `json:"lines"`
			}
			if json.Unmarshal(record.Data, &refund) != nil || refund.SaleID != saleID { continue }
			matchedRefundHistory = true
			if refund.Status == "PREPARING" { return RMA{}, fmt.Errorf("POS refund is pending; RMA creation must wait for its completion") }
			if refund.Status != "COMPLETED" { continue }
			for _, line := range refund.Lines { refundedByItem[line.ItemID] += line.Quantity }
		}
		if so.Status == salesorders.StatusPartiallyRefunded && !matchedRefundHistory { return RMA{}, fmt.Errorf("partial refund records are missing; cannot determine remaining returnable quantities") }
	} else if so.Status == salesorders.StatusPartiallyRefunded {
		return RMA{}, fmt.Errorf("POS refund ledger is missing; cannot determine remaining returnable quantities")
	}
	s.seq++
	r := RMA{
		RMAID: s.seq, SOID: so.SOID, SONumber: so.SONumber, WarehouseID: so.WarehouseID,
		Status: "OPEN", Reason: reason, CreatedAt: time.Now().UTC(),
		CreatedBy: actor, Backorder: backorder, UpdatedAt: time.Now().UTC(),
		Lines: []RMALine{},
	}
	expectedByItem := make(map[int64]int64)
	itemOrder := make([]int64,0)
	reservedByExistingRMA := make(map[int64]int64)
	existingRecords, err := s.store.List(kind)
	if err != nil { return RMA{}, err }
	for _, record := range existingRecords {
		var existing RMA
		if json.Unmarshal(record.Data, &existing) != nil || existing.SOID != so.SOID { continue }
		for _, line := range existing.Lines {
			// An active RMA reserves its full outstanding claim. A cancelled
			// RMA releases only the quantity never received; already received
			// units remain consumed even when their disposition was SCRAP/HOLD.
			reserved := line.Expected
			if existing.Status == "CANCELLED" { reserved = line.Received }
			reservedByExistingRMA[line.ItemID] += reserved
		}
	}
	for _, line := range so.Lines {
		// Only quantities whose shipment was committed can be returned.
		// Ordered, picked or packed quantities do not prove physical dispatch.
		expected := line.QuantityShipped
		if expected <= 0 { continue }
		if _, exists := expectedByItem[line.ItemID]; !exists { itemOrder = append(itemOrder,line.ItemID) }
		expectedByItem[line.ItemID] += expected
	}
	for _, itemID := range itemOrder {
		expected := expectedByItem[itemID] - refundedByItem[itemID] - reservedByExistingRMA[itemID]
		if expected < 0 { return RMA{}, fmt.Errorf("refunded quantity exceeds shipped quantity for item %d",itemID) }
		if expected > 0 { r.Lines = append(r.Lines, RMALine{ItemID:itemID,Expected:expected,Receipts:[]RMAReceipt{}}) }
	}
	if len(r.Lines) == 0 { return RMA{}, fmt.Errorf("sales order has no returnable lines") }
	data, _ := json.Marshal(r)
	_, err = s.store.Put(kind, formatID(r.RMAID), data)
	return r, err
}

func (s *Service) Get(id int64) (RMA, error) {
	rec, ok, err := s.store.Get(kind, formatID(id))
	if err != nil {
		return RMA{}, err
	}
	if !ok {
		return RMA{}, ErrNotFound
	}
	var r RMA
	if err := json.Unmarshal(rec.Data, &r); err != nil {
		return RMA{}, err
	}
	return r, nil
}

func (s *Service) List() ([]RMA, error) {
	records, err := s.store.List(kind)
	if err != nil {
		return nil, err
	}
	out := make([]RMA, 0, len(records))
	for _, rec := range records {
		var r RMA
		if json.Unmarshal(rec.Data, &r) == nil {
			out = append(out, r)
		}
	}
	return out, nil
}

func (s *Service) ListBackorders() ([]RMA, error) {
	all, err := s.List()
	if err != nil {
		return nil, err
	}
	out := make([]RMA, 0)
	for _, r := range all {
		if r.Backorder && (r.Status == "OPEN" || r.Status == "RECEIVED") {
			out = append(out, r)
		}
	}
	return out, nil
}

func (s *Service) Receive(id int64, actor string) (RMA, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	r, err := s.Get(id)
	if err != nil {
		return RMA{}, err
	}
	if r.Status != "OPEN" {
		return RMA{}, fmt.Errorf("rma status %s cannot receive", r.Status)
	}
	r.Status = "RECEIVED"
	r.UpdatedAt = time.Now().UTC()
	r.Notes = "received by " + actor
	data, _ := json.Marshal(r)
	_, err = s.store.Put(kind, formatID(r.RMAID), data)
	return r, err
}

// ReceiveLine books a returned quantity against one RMA line. RESTOCK updates
// the inventory ledger through an idempotent operation; SCRAP and HOLD are
// recorded dispositions and do not increase available stock.
func (s *Service) ReceiveLine(id, itemID, quantity, binID int64, lot, disposition, operationID, actor string) (RMA, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	r, err := s.Get(id)
	if err != nil { return RMA{}, err }
	if quantity <= 0 || !validRMAOperationID(operationID) || strings.TrimSpace(actor) == "" || len(actor) > 128 || len(lot) > 128 || strings.TrimSpace(lot) != lot { return RMA{}, fmt.Errorf("positive quantity, valid operation_id and actor are required") }
	disposition = strings.ToUpper(strings.TrimSpace(disposition))
	if disposition != "RESTOCK" && disposition != "SCRAP" && disposition != "HOLD" { return RMA{}, fmt.Errorf("disposition must be RESTOCK, SCRAP or HOLD") }
	var target *RMALine
	for i := range r.Lines { if r.Lines[i].ItemID == itemID { target = &r.Lines[i]; break } }
	if target == nil { return RMA{}, fmt.Errorf("item is not part of this RMA") }
	for _, existingLine := range r.Lines {
		for _, prior := range existingLine.Receipts {
			if prior.OperationID == operationID {
				if existingLine.ItemID != itemID || prior.Quantity != quantity || prior.BinID != binID || prior.LotNumber != lot || prior.Disposition != disposition || prior.ReceivedBy != actor {
					return RMA{}, fmt.Errorf("RMA receipt operation_id reused with different command")
				}
				return r, nil
			}
		}
	}
	if priorRecord, exists, err := s.store.Get("wms_rma_receipt_ops", operationID); err != nil {
		return RMA{}, err
	} else if exists {
		var prior struct { RMAID int64 `json:"rma_id"`; ItemID int64 `json:"item_id"`; Quantity int64 `json:"quantity"`; BinID int64 `json:"bin_id"`; Lot string `json:"lot"`; Disposition string `json:"disposition"`; Actor string `json:"actor"` }
		if err := json.Unmarshal(priorRecord.Data, &prior); err != nil { return RMA{}, err }
		if prior.RMAID != id || prior.ItemID != itemID || prior.Quantity != quantity || prior.BinID != binID || prior.Lot != lot || prior.Disposition != disposition || prior.Actor != actor {
			return RMA{}, fmt.Errorf("RMA receipt operation_id already belongs to another command")
		}
		return r, nil
	}
	if r.Status != "OPEN" && r.Status != "RECEIVED" { return RMA{}, fmt.Errorf("rma status %s cannot receive", r.Status) }
	if quantity > target.Expected-target.Received { return RMA{}, fmt.Errorf("receipt exceeds remaining return quantity") }
	if disposition == "RESTOCK" {
		if binID <= 0 || s.cat == nil || s.ledger == nil { return RMA{}, fmt.Errorf("RESTOCK requires a configured inventory ledger and destination bin") }
		bin, err := s.cat.GetBin(binID)
		if err != nil || bin.WarehouseID != r.WarehouseID || !bin.IsActive { return RMA{}, fmt.Errorf("destination bin is invalid or outside the RMA warehouse") }
		_, err = s.ledger.Adjust(inventoryledger.AdjustCommand{
			OperationID: operationID, WarehouseID: r.WarehouseID, BinID: binID,
			ItemID: itemID, LotNumber: lot, Delta: quantity,
		})
		if err != nil { return RMA{}, err }
	}
	target.Received += quantity
	if target.Disposition == "" {
		target.Disposition = disposition
	} else if target.Disposition != disposition {
		target.Disposition = "MIXED"
	}
	target.Receipts = append(target.Receipts, RMAReceipt{
		OperationID: operationID, Quantity: quantity, BinID: binID, LotNumber: lot,
		Disposition: disposition, ReceivedAt: time.Now().UTC(), ReceivedBy: actor,
	})
	r.Status = "RECEIVED"
	r.UpdatedAt = time.Now().UTC()
	r.Notes = "last receipt by " + actor
	data, err := json.Marshal(r)
	if err != nil { return RMA{}, err }
	if _, err := s.store.Put(kind, formatID(r.RMAID), data); err != nil { return RMA{}, err }
	opData, err := json.Marshal(map[string]any{"rma_id":id,"item_id":itemID,"quantity":quantity,"bin_id":binID,"lot":lot,"disposition":disposition,"actor":actor})
	if err != nil { return RMA{}, err }
	if _, err := s.store.Put("wms_rma_receipt_ops", operationID, opData); err != nil { return RMA{}, err }
	return r, nil
}

func (s *Service) Complete(id int64, actor string) (RMA, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	r, err := s.Get(id)
	if err != nil { return RMA{}, err }
	if r.Status == "COMPLETED" { return r, nil }
	if r.Status != "RECEIVED" { return RMA{}, fmt.Errorf("rma must be RECEIVED before completion") }
	for _, line := range r.Lines {
		if line.Received != line.Expected { return RMA{}, fmt.Errorf("%w: item %d received %d of %d", ErrRestockRequired, line.ItemID, line.Received, line.Expected) }
		if line.Disposition == "" { return RMA{}, ErrRestockRequired }
	}
	r.Status = "COMPLETED"
	r.UpdatedAt = time.Now().UTC()
	r.Notes = "completed by " + actor
	data, err := json.Marshal(r)
	if err != nil { return RMA{}, err }
	_, err = s.store.Put(kind, formatID(r.RMAID), data)
	return r, err
}

func (s *Service) Cancel(id int64, actor string) (RMA, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if strings.TrimSpace(actor) == "" || len(actor) > 128 {
		return RMA{}, fmt.Errorf("valid actor is required")
	}
	r, err := s.Get(id)
	if err != nil {
		return RMA{}, err
	}
	if r.Status == "COMPLETED" {
		return RMA{}, fmt.Errorf("cannot cancel completed rma")
	}
	if r.Status == "CANCELLED" {
		return r, nil
	}
	// Persist the intent before compensating stock movements. A retry after a
	// crash resumes from each receipt's Reversed marker and uses a stable
	// ledger operation ID, so the same stock is never removed twice.
	if r.Status != "CANCELLING" {
		r.Status = "CANCELLING"
		r.UpdatedAt = time.Now().UTC()
		r.Notes = "cancellation started by " + actor
		if err := s.save(r); err != nil { return RMA{}, err }
	}
	for i := range r.Lines {
		for j := range r.Lines[i].Receipts {
			receipt := &r.Lines[i].Receipts[j]
			if receipt.Disposition != "RESTOCK" || receipt.Reversed { continue }
			sum := sha256.Sum256([]byte("rma-cancel|" + receipt.OperationID))
			reverseID := "rma-cancel-" + hex.EncodeToString(sum[:16])
			if s.ledger == nil { return RMA{}, fmt.Errorf("inventory ledger is unavailable; RMA cancellation remains pending") }
			_, err := s.ledger.Adjust(inventoryledger.AdjustCommand{
				OperationID: reverseID, WarehouseID: r.WarehouseID, BinID: receipt.BinID,
				ItemID: r.Lines[i].ItemID, LotNumber: receipt.LotNumber, Delta: -receipt.Quantity,
			})
			if err != nil { return RMA{}, fmt.Errorf("reverse RMA restock %s; cancellation remains pending: %w", receipt.OperationID, err) }
			receipt.Reversed = true
			r.UpdatedAt = time.Now().UTC()
			if err := s.save(r); err != nil { return RMA{}, fmt.Errorf("inventory reversal applied but RMA progress could not be persisted: %w", err) }
		}
	}
	r.Status = "CANCELLED"
	r.UpdatedAt = time.Now().UTC()
	r.Notes = "cancelled by " + actor
	if err := s.save(r); err != nil { return RMA{}, err }
	return r, nil
}

func (s *Service) save(r RMA) error {
	data, err := json.Marshal(r)
	if err != nil { return err }
	_, err = s.store.Put(kind, formatID(r.RMAID), data)
	return err
}

func formatID(id int64) string { return fmt.Sprintf("%d", id) }

func validRMAOperationID(value string) bool {
	if len(value) == 0 || len(value) > 128 { return false }
	for _, r := range value {
		if !(r >= 'a' && r <= 'z') && !(r >= 'A' && r <= 'Z') && !(r >= '0' && r <= '9') && r != '-' && r != '_' { return false }
	}
	return true
}
