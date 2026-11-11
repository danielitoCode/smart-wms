package pos

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strings"
	"sync"
	"time"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/catalog"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/fulfillment"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/inventoryledger"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/salesorders"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
)

var (
	ErrInvalid     = errors.New("invalid pos request")
	ErrUnsupported = errors.New("POS operation is not implemented by the current WMS contract")
)

type Service struct {
	catalog *catalog.Repository
	sos     *salesorders.Repository
	ledger  *inventoryledger.Ledger
	store   *corestore.Store
	fulfill *fulfillment.Service
	mu      sync.Mutex
}

func New(store *corestore.Store, cat *catalog.Repository, sos *salesorders.Repository, ledger *inventoryledger.Ledger, fulfill *fulfillment.Service) *Service {
	return &Service{store: store, catalog: cat, sos: sos, ledger: ledger, fulfill: fulfill}
}

type CartLine struct {
	SKU            string `json:"sku"`
	ItemID         int64  `json:"item_id"`
	BinID          int64  `json:"bin_id"`
	Quantity       int64  `json:"quantity"`
	UnitPriceCents int64  `json:"unit_price_cents"`
	TaxCents       int64  `json:"tax_cents"`
	LineTotalCents int64  `json:"line_total_cents"`
}

type Tender struct {
	Type                string `json:"type"`
	AmountCents         int64  `json:"amount_cents"`
	AmountTenderedCents int64  `json:"amount_tendered_cents,omitempty"`
	ChangeCents         int64  `json:"change_cents,omitempty"`
	CardBrand           string `json:"card_brand,omitempty"`
	CardLast4           string `json:"card_last4,omitempty"`
	AuthCode            string `json:"auth_code,omitempty"`
	ExternalRef         string `json:"external_ref,omitempty"`
}

type CheckoutInput struct {
	WarehouseID    int64      `json:"warehouse_id"`
	IdempotencyKey string     `json:"idempotency_key"`
	ExternalTxnRef string     `json:"external_txn_ref"`
	CashierID      string     `json:"cashier_id"`
	TerminalID     string     `json:"terminal_id"`
	ShippingCents  int64      `json:"shipping_cents,omitempty"`
	PaymentMethod  string     `json:"payment_method"`
	SubtotalCents  int64      `json:"subtotal_cents"`
	TaxCents       int64      `json:"tax_cents"`
	TotalCents     int64      `json:"total_cents"`
	Tenders        []Tender   `json:"tenders"`
	PhoneOrder     bool       `json:"is_phone_order,omitempty"`
	CustomerName   string     `json:"customer_name,omitempty"`
	Notes          string     `json:"memo,omitempty"`
	Lines          []CartLine `json:"lines"`
}

type SaleLine struct {
	SKU            string `json:"sku"`
	ItemID         int64  `json:"item_id"`
	WarehouseID    int64  `json:"warehouse_id"`
	BinID          int64  `json:"bin_id"`
	Quantity       int64  `json:"quantity"`
	UnitPriceCents int64  `json:"unit_price_cents"`
	TaxCents       int64  `json:"tax_cents"`
	LineTotalCents int64  `json:"line_total_cents"`
}

type SaleRecord struct {
	ID                  string     `json:"id"`
	Fingerprint         string     `json:"fingerprint"`
	Status              string     `json:"status"`
	SOID                int64      `json:"so_id"`
	SONumber            string     `json:"so_number"`
	WarehouseID         int64      `json:"warehouse_id"`
	PhoneOrder          bool       `json:"phone_order"`
	PaymentMethod       string     `json:"payment_method"`
	ExternalTxnRef      string     `json:"external_txn_ref"`
	CashierID           string     `json:"cashier_id"`
	TerminalID          string     `json:"terminal_id"`
	ShippingCents       int64      `json:"shipping_cents"`
	CustomerName        string     `json:"customer_name,omitempty"`
	Notes               string     `json:"notes,omitempty"`
	TotalCents          int64      `json:"total_cents"`
	Tenders             []Tender   `json:"tenders"`
	Lines               []SaleLine `json:"lines"`
	AppliedKeys         []string   `json:"applied_keys,omitempty"`
	DispatchKey         string     `json:"dispatch_key,omitempty"`
	DispatchFingerprint string     `json:"dispatch_fingerprint,omitempty"`
	CreatedAt           time.Time  `json:"created_at"`
}

func (s *Service) Availability(warehouseID int64, sku string) (map[string]any, error) {
	if warehouseID <= 0 {
		return nil, ErrInvalid
	}
	items, err := s.catalog.ListItems()
	if err != nil {
		return nil, err
	}
	balances, _, err := s.ledger.List()
	if err != nil {
		return nil, err
	}
	byItem := map[int64]int64{}
	for _, b := range balances {
		if warehouseID != 0 && b.WarehouseID != warehouseID {
			continue
		}
		byItem[b.ItemID] += b.OnHand - b.Allocated
	}
	out := make([]map[string]any, 0)
	for _, it := range items {
		if !it.IsActive {
			continue
		}
		if sku != "" && it.SKU != sku {
			continue
		}
		avail := byItem[it.ItemID]
		if avail < 0 {
			avail = 0
		}
		out = append(out, map[string]any{
			"item_id": it.ItemID, "sku": it.SKU, "item_name": it.ItemName,
			"available": avail, "warehouse_id": warehouseID,
		})
	}
	return map[string]any{"items": out, "total": len(out)}, nil
}

func (s *Service) ValidateCart(warehouseID int64, lines []CartLine) (map[string]any, error) {
	if warehouseID <= 0 || len(lines) == 0 || len(lines) > 200 {
		return nil, ErrInvalid
	}
	items, err := s.catalog.ListItems()
	if err != nil {
		return nil, err
	}
	idBySKU := make(map[string]int64, len(items))
	skuByID := make(map[int64]string, len(items))
	activeByID := make(map[int64]bool, len(items))
	for _, item := range items {
		idBySKU[item.SKU] = item.ItemID
		skuByID[item.ItemID] = item.SKU
		activeByID[item.ItemID] = item.IsActive
	}
	balances, _, err := s.ledger.List()
	if err != nil {
		return nil, err
	}
	available := make(map[string]int64)
	for _, balance := range balances {
		if balance.WarehouseID == warehouseID {
			available[fmt.Sprintf("%d:%d", balance.ItemID, balance.BinID)] += balance.Available()
		}
	}
	type resolved struct {
		itemID   int64
		sku      string
		binID    int64
		quantity int64
	}
	resolvedLines := make([]resolved, 0, len(lines))
	requested := make(map[string]int64)
	valid := true
	for _, line := range lines {
		itemID := line.ItemID
		if itemID <= 0 {
			itemID = idBySKU[strings.TrimSpace(line.SKU)]
		}
		if itemID <= 0 || !activeByID[itemID] || line.BinID <= 0 || line.Quantity <= 0 || (line.SKU != "" && skuByID[itemID] != line.SKU) {
			valid = false
			resolvedLines = append(resolvedLines, resolved{itemID: itemID, sku: line.SKU, binID: line.BinID, quantity: line.Quantity})
			continue
		}
		bin, err := s.catalog.GetBin(line.BinID)
		if err != nil || bin.WarehouseID != warehouseID || !bin.IsActive || (bin.BinType != "Pickable" && bin.BinType != "PickableStaging") {
			valid = false
		}
		key := fmt.Sprintf("%d:%d", itemID, line.BinID)
		if requested[key] > int64(^uint64(0)>>1)-line.Quantity {
			valid = false
		} else {
			requested[key] += line.Quantity
		}
		sku := line.SKU
		if sku == "" {
			for _, item := range items {
				if item.ItemID == itemID {
					sku = item.SKU
					break
				}
			}
		}
		resolvedLines = append(resolvedLines, resolved{itemID: itemID, sku: sku, binID: line.BinID, quantity: line.Quantity})
	}
	out := make([]map[string]any, 0, len(resolvedLines))
	for _, line := range resolvedLines {
		key := fmt.Sprintf("%d:%d", line.itemID, line.binID)
		have := available[key]
		ok := line.itemID > 0 && line.quantity > 0 && requested[key] <= have
		if !ok {
			valid = false
		}
		out = append(out, map[string]any{"item_id": line.itemID, "sku": line.sku, "bin_id": line.binID, "quantity": line.quantity, "available": have, "requested_total": requested[key], "ok": ok})
	}
	return map[string]any{"ok": valid, "lines": out}, nil
}

// CheckoutTransaction runs an idempotent POS saga. Each inventory movement is
// an idempotent ledger operation and the durable sale record records progress,
// allowing a retry after a process restart to resume without double-decrementing.
func (s *Service) CheckoutTransaction(in CheckoutInput, actor string) (salesorders.SalesOrder, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if in.WarehouseID <= 0 || len(in.Lines) == 0 || len(in.Lines) > 200 || strings.TrimSpace(in.IdempotencyKey) == "" || len(in.IdempotencyKey) > 128 {
		return salesorders.SalesOrder{}, false, ErrInvalid
	}
	if strings.TrimSpace(in.ExternalTxnRef) == "" || len(in.ExternalTxnRef) > 256 || strings.TrimSpace(in.CashierID) == "" || len(in.CashierID) > 128 || strings.TrimSpace(in.TerminalID) == "" || len(in.TerminalID) > 128 || len(in.CustomerName) > 256 || len(in.Notes) > 2000 {
		return salesorders.SalesOrder{}, false, ErrInvalid
	}
	method := strings.ToLower(strings.TrimSpace(in.PaymentMethod))
	if method != "cash" && method != "card" && method != "split" {
		return salesorders.SalesOrder{}, false, ErrInvalid
	}
	if in.SubtotalCents < 0 || in.TaxCents < 0 || in.ShippingCents < 0 || in.TotalCents < 0 || in.SubtotalCents > math.MaxInt64-in.TaxCents || in.SubtotalCents+in.TaxCents > math.MaxInt64-in.ShippingCents || in.TotalCents != in.SubtotalCents+in.TaxCents+in.ShippingCents {
		return salesorders.SalesOrder{}, false, fmt.Errorf("%w: payment totals do not reconcile", ErrInvalid)
	}
	if len(in.Tenders) == 0 || len(in.Tenders) > 8 {
		return salesorders.SalesOrder{}, false, ErrInvalid
	}
	var tenderTotal int64
	hasCash, hasCard := false, false
	for _, tender := range in.Tenders {
		if tender.AmountCents < 0 {
			return salesorders.SalesOrder{}, false, ErrInvalid
		}
		switch tender.Type {
		case "cash":
			hasCash = true
			if tender.AmountTenderedCents < 0 || tender.AmountTenderedCents < tender.ChangeCents || tender.AmountTenderedCents-tender.ChangeCents != tender.AmountCents || tender.ChangeCents < 0 {
				return salesorders.SalesOrder{}, false, ErrInvalid
			}
		case "card":
			hasCard = true
			if tender.CardBrand == "" || len(tender.CardBrand) > 40 || len(tender.CardLast4) != 4 || tender.AuthCode == "" || len(tender.AuthCode) > 128 || tender.ExternalRef == "" || len(tender.ExternalRef) > 256 {
				return salesorders.SalesOrder{}, false, ErrInvalid
			}
			for _, digit := range tender.CardLast4 {
				if digit < '0' || digit > '9' {
					return salesorders.SalesOrder{}, false, ErrInvalid
				}
			}
		default:
			return salesorders.SalesOrder{}, false, fmt.Errorf("%w: unsupported tender type", ErrInvalid)
		}
		if tenderTotal > math.MaxInt64-tender.AmountCents {
			return salesorders.SalesOrder{}, false, ErrInvalid
		}
		tenderTotal += tender.AmountCents
	}
	if (method == "cash" && (!hasCash || hasCard)) || (method == "card" && (!hasCard || hasCash)) || (method == "split" && (!hasCash || !hasCard)) {
		return salesorders.SalesOrder{}, false, fmt.Errorf("%w: tender types do not match payment method", ErrInvalid)
	}
	if tenderTotal != in.TotalCents {
		return salesorders.SalesOrder{}, false, fmt.Errorf("%w: tenders do not equal total", ErrInvalid)
	}
	var calculatedSubtotal, calculatedTax int64
	for _, line := range in.Lines {
		if line.Quantity <= 0 || line.UnitPriceCents < 0 || line.TaxCents < 0 || line.LineTotalCents < 0 || (line.UnitPriceCents > 0 && line.Quantity > math.MaxInt64/line.UnitPriceCents) {
			return salesorders.SalesOrder{}, false, ErrInvalid
		}
		lineSubtotal := line.UnitPriceCents * line.Quantity
		if calculatedSubtotal > math.MaxInt64-lineSubtotal || calculatedTax > math.MaxInt64-line.TaxCents {
			return salesorders.SalesOrder{}, false, ErrInvalid
		}
		if lineSubtotal > math.MaxInt64-line.TaxCents {
			return salesorders.SalesOrder{}, false, ErrInvalid
		}
		if line.LineTotalCents != lineSubtotal+line.TaxCents {
			return salesorders.SalesOrder{}, false, fmt.Errorf("%w: line total does not reconcile for SKU %s", ErrInvalid, line.SKU)
		}
		calculatedSubtotal += lineSubtotal
		calculatedTax += line.TaxCents
	}
	if calculatedSubtotal != in.SubtotalCents || calculatedTax != in.TaxCents {
		return salesorders.SalesOrder{}, false, fmt.Errorf("%w: cart lines do not reconcile to payment summary", ErrInvalid)
	}
	fingerprintBytes, err := json.Marshal(struct {
		Request CheckoutInput `json:"request"`
		Actor   string        `json:"actor"`
	}{Request: in, Actor: actor})
	if err != nil {
		return salesorders.SalesOrder{}, false, err
	}
	fingerprintSum := sha256.Sum256(fingerprintBytes)
	fingerprint := hex.EncodeToString(fingerprintSum[:])
	idSum := sha256.Sum256([]byte(in.IdempotencyKey))
	recordID := hex.EncodeToString(idSum[:])
	var sale SaleRecord
	if rec, ok, err := s.store.Get("wms_pos_sale", recordID); err != nil {
		return salesorders.SalesOrder{}, false, err
	} else if ok {
		if err := json.Unmarshal(rec.Data, &sale); err != nil {
			return salesorders.SalesOrder{}, false, err
		}
		if sale.Fingerprint != fingerprint {
			return salesorders.SalesOrder{}, false, fmt.Errorf("POS idempotency key reused with different body")
		}
		if sale.Status == "FAILED" {
			return salesorders.SalesOrder{}, false, fmt.Errorf("previous POS checkout attempt was compensated and failed; use a new idempotency key")
		}
		if sale.Status == "COMPLETED" {
			so, err := s.sos.Get(sale.SOID)
			return so, true, err
		}
	} else {
		// A different idempotency key must not be able to reuse a gateway
		// transaction reference and create a second sale for one payment.
		existingSales, err := s.store.List("wms_pos_sale")
		if err != nil {
			return salesorders.SalesOrder{}, false, err
		}
		for _, record := range existingSales {
			var prior SaleRecord
			if json.Unmarshal(record.Data, &prior) != nil {
				continue
			}
			if prior.TerminalID == in.TerminalID && prior.ExternalTxnRef == in.ExternalTxnRef {
				return salesorders.SalesOrder{}, false, fmt.Errorf("external transaction reference already belongs to another POS sale")
			}
		}
		items, err := s.catalog.ListItems()
		if err != nil {
			return salesorders.SalesOrder{}, false, err
		}
		skuByID := make(map[int64]string, len(items))
		idBySKU := make(map[string]int64, len(items))
		activeByID := make(map[int64]bool, len(items))
		for _, item := range items {
			skuByID[item.ItemID] = item.SKU
			idBySKU[item.SKU] = item.ItemID
			activeByID[item.ItemID] = item.IsActive
		}
		balances, _, err := s.ledger.List()
		if err != nil {
			return salesorders.SalesOrder{}, false, err
		}
		available := make(map[string]int64)
		for _, balance := range balances {
			if balance.WarehouseID == in.WarehouseID {
				available[fmt.Sprintf("%d:%d", balance.ItemID, balance.BinID)] += balance.Available()
			}
		}
		lines := make([]SaleLine, 0, len(in.Lines))
		requested := make(map[string]int64)
		for _, line := range in.Lines {
			itemID := line.ItemID
			if itemID <= 0 {
				itemID = idBySKU[line.SKU]
			}
			if itemID <= 0 || !activeByID[itemID] || line.BinID <= 0 || line.Quantity <= 0 || line.Quantity > 10000 || len(line.SKU) > 128 {
				return salesorders.SalesOrder{}, false, ErrInvalid
			}
			bin, binErr := s.catalog.GetBin(line.BinID)
			if binErr != nil || bin.WarehouseID != in.WarehouseID || !bin.IsActive || (bin.BinType != "Pickable" && bin.BinType != "PickableStaging") {
				return salesorders.SalesOrder{}, false, fmt.Errorf("%w: POS bin is inactive, non-pickable or outside the warehouse", ErrInvalid)
			}
			sku := skuByID[itemID]
			if line.SKU != "" && line.SKU != sku {
				return salesorders.SalesOrder{}, false, fmt.Errorf("%w: item_id and SKU do not identify the same item", ErrInvalid)
			}
			if sku == "" {
				return salesorders.SalesOrder{}, false, ErrInvalid
			}
			key := fmt.Sprintf("%d:%d", itemID, line.BinID)
			requested[key] += line.Quantity
			lines = append(lines, SaleLine{SKU: sku, ItemID: itemID, WarehouseID: in.WarehouseID, BinID: line.BinID, Quantity: line.Quantity, UnitPriceCents: line.UnitPriceCents, TaxCents: line.TaxCents, LineTotalCents: line.LineTotalCents})
		}
		for key, quantity := range requested {
			if available[key] < quantity {
				return salesorders.SalesOrder{}, false, fmt.Errorf("insufficient stock at %s: available %d, requested %d", key, available[key], quantity)
			}
		}
		sale = SaleRecord{ID: recordID, Fingerprint: fingerprint, Status: "PREPARING", WarehouseID: in.WarehouseID, PhoneOrder: in.PhoneOrder, PaymentMethod: method, ExternalTxnRef: in.ExternalTxnRef, CashierID: in.CashierID, TerminalID: in.TerminalID, ShippingCents: in.ShippingCents, CustomerName: in.CustomerName, Notes: in.Notes, TotalCents: in.TotalCents, Tenders: in.Tenders, Lines: lines, CreatedAt: time.Now().UTC()}
		data, _ := json.Marshal(sale)
		if _, err := s.store.Put("wms_pos_sale", recordID, data); err != nil {
			return salesorders.SalesOrder{}, false, err
		}
	}
	aggregated := make(map[string]SaleLine)
	for _, line := range sale.Lines {
		key := fmt.Sprintf("%d:%d:%d", line.WarehouseID, line.BinID, line.ItemID)
		current := aggregated[key]
		current.WarehouseID, current.BinID, current.ItemID = line.WarehouseID, line.BinID, line.ItemID
		current.Quantity += line.Quantity
		aggregated[key] = current
	}
	compensate := func() error {
		// Inspect the ledger's durable operation journal rather than trusting
		// AppliedKeys alone. A process can die after the ledger commit but
		// before the corresponding saga progress write.
		for key, line := range aggregated {
			opSum := sha256.Sum256([]byte(in.IdempotencyKey + "|" + key))
			opID := "pos-" + hex.EncodeToString(opSum[:16])
			applied, lookupErr := s.ledger.HasOperation(opID)
			if lookupErr != nil {
				return lookupErr
			}
			if !applied {
				continue
			}
			compID := "pos-cmp-" + hex.EncodeToString(opSum[:12])
			if in.PhoneOrder {
				if _, e := s.ledger.Release(inventoryledger.QuantityCommand{OperationID: compID, WarehouseID: line.WarehouseID, BinID: line.BinID, ItemID: line.ItemID, Quantity: line.Quantity}); e != nil {
					return e
				}
			} else {
				if _, e := s.ledger.Adjust(inventoryledger.AdjustCommand{OperationID: compID, WarehouseID: line.WarehouseID, BinID: line.BinID, ItemID: line.ItemID, Delta: line.Quantity}); e != nil {
					return e
				}
			}
		}
		sale.Status = "FAILED"
		data, e := json.Marshal(sale)
		if e != nil {
			return e
		}
		_, e = s.store.Put("wms_pos_sale", sale.ID, data)
		return e
	}
	if sale.Status == "COMPENSATING" {
		if err := compensate(); err != nil {
			return salesorders.SalesOrder{}, false, fmt.Errorf("POS checkout compensation remains pending: %w", err)
		}
		return salesorders.SalesOrder{}, false, fmt.Errorf("previous POS checkout attempt was compensated; use a new idempotency key")
	}
	for key, line := range aggregated {
		opSum := sha256.Sum256([]byte(in.IdempotencyKey + "|" + key))
		opID := "pos-" + hex.EncodeToString(opSum[:16])
		if in.PhoneOrder {
			_, err = s.ledger.Allocate(inventoryledger.QuantityCommand{OperationID: opID, WarehouseID: line.WarehouseID, BinID: line.BinID, ItemID: line.ItemID, Quantity: line.Quantity})
		} else {
			_, err = s.ledger.Adjust(inventoryledger.AdjustCommand{OperationID: opID, WarehouseID: line.WarehouseID, BinID: line.BinID, ItemID: line.ItemID, Delta: -line.Quantity})
		}
		if err != nil {
			sale.Status = "COMPENSATING"
			data, _ := json.Marshal(sale)
			if _, persistErr := s.store.Put("wms_pos_sale", sale.ID, data); persistErr != nil {
				return salesorders.SalesOrder{}, false, fmt.Errorf("inventory mutation failed (%v) and compensation marker failed: %w", err, persistErr)
			}
			if compensationErr := compensate(); compensationErr != nil {
				return salesorders.SalesOrder{}, false, fmt.Errorf("inventory mutation failed (%v); compensation pending: %w", err, compensationErr)
			}
			return salesorders.SalesOrder{}, false, err
		}
		alreadyApplied := false
		for _, appliedKey := range sale.AppliedKeys {
			if appliedKey == key {
				alreadyApplied = true
				break
			}
		}
		if !alreadyApplied {
			sale.AppliedKeys = append(sale.AppliedKeys, key)
		}
		data, err := json.Marshal(sale)
		if err != nil {
			return salesorders.SalesOrder{}, false, err
		}
		if _, err := s.store.Put("wms_pos_sale", sale.ID, data); err != nil {
			return salesorders.SalesOrder{}, false, err
		}
	}
	if sale.SOID == 0 {
		number := "POS-" + recordID[:20]
		if existing, findErr := s.sos.FindByBarcode(number); findErr == nil {
			if existing.WarehouseID != in.WarehouseID || len(existing.Lines) != len(sale.Lines) {
				return salesorders.SalesOrder{}, false, fmt.Errorf("deterministic POS order number is occupied by a different order")
			}
			for i, line := range sale.Lines {
				if existing.Lines[i].ItemID != line.ItemID || existing.Lines[i].QuantityOrdered != line.Quantity {
					return salesorders.SalesOrder{}, false, fmt.Errorf("deterministic POS order number is occupied by a different order")
				}
			}
			sale.SOID, sale.SONumber = existing.SOID, existing.SONumber
		} else {
			lines := make([]salesorders.LineInput, 0, len(sale.Lines))
			for _, line := range sale.Lines {
				lines = append(lines, salesorders.LineInput{ItemID: line.ItemID, QuantityOrdered: line.Quantity})
			}
			customer := in.CustomerName
			notes := in.Notes
			so, createErr := s.sos.Create(salesorders.CreateInput{SONumber: number, WarehouseID: in.WarehouseID, Lines: lines, CustomerName: &customer, Notes: &notes}, actor)
			if createErr != nil {
				return salesorders.SalesOrder{}, false, createErr
			}
			sale.SOID, sale.SONumber = so.SOID, so.SONumber
		}
	}
	so, err := s.sos.Get(sale.SOID)
	if err != nil {
		return salesorders.SalesOrder{}, false, err
	}
	if in.PhoneOrder {
		so.Status = salesorders.StatusOpen
		for i := range so.Lines {
			so.Lines[i].QuantityAllocated = so.Lines[i].QuantityOrdered
			so.Lines[i].Status = salesorders.LineOpen
		}
	} else {
		so.Status = salesorders.StatusShipped
		for i := range so.Lines {
			so.Lines[i].QuantityPicked = so.Lines[i].QuantityOrdered
			so.Lines[i].QuantityPacked = so.Lines[i].QuantityOrdered
			so.Lines[i].QuantityShipped = so.Lines[i].QuantityOrdered
			so.Lines[i].Status = salesorders.LineShipped
		}
	}
	if err := s.sos.Save(so); err != nil {
		return salesorders.SalesOrder{}, false, err
	}
	sale.Status = "COMPLETED"
	data, err := json.Marshal(sale)
	if err != nil {
		return salesorders.SalesOrder{}, false, err
	}
	if _, err := s.store.Put("wms_pos_sale", recordID, data); err != nil {
		return salesorders.SalesOrder{}, false, err
	}
	return so, false, nil
}

func (s *Service) Checkout(warehouseID int64, lines []CartLine, actor string) (salesorders.SalesOrder, error) {
	// A real POS checkout must atomically bind tender/payment, inventory
	// commitment, the POS order metadata and its audit event. The current
	// Go request contract carries none of the tender/refund fields required
	// by the Flask contract, so creating an ordinary OPEN sales order here
	// would falsely report a completed sale.
	return salesorders.SalesOrder{}, ErrUnsupported
}

func (s *Service) GetSO(soNumber string) (salesorders.SalesOrder, error) {
	list, err := s.sos.List()
	if err != nil {
		return salesorders.SalesOrder{}, err
	}
	for _, so := range list {
		if so.SONumber == soNumber || so.SOBarcode == soNumber {
			return so, nil
		}
	}
	return salesorders.SalesOrder{}, salesorders.ErrNotFound
}

type RefundLine struct {
	ItemID   int64  `json:"item_id"`
	SKU      string `json:"sku"`
	BinID    int64  `json:"bin_id"`
	Quantity int64  `json:"quantity"`
}

type RefundInput struct {
	SONumber            string       `json:"so_number"`
	IdempotencyKey      string       `json:"idempotency_key"`
	ExternalRefundRef   string       `json:"external_refund_ref"`
	CashierID           string       `json:"cashier_id"`
	Reason              string       `json:"reason"`
	PaymentMethod       string       `json:"payment_method"`
	TotalCents          int64        `json:"total_cents"`
	ShippingRefundCents int64        `json:"shipping_refund_cents,omitempty"`
	Lines               []RefundLine `json:"lines,omitempty"`
}

type RefundRecord struct {
	ID                  string     `json:"id"`
	SaleID              string     `json:"sale_id"`
	Fingerprint         string     `json:"fingerprint"`
	Status              string     `json:"status"`
	TotalCents          int64      `json:"total_cents"`
	ShippingRefundCents int64      `json:"shipping_refund_cents"`
	AllItemsReturned    bool       `json:"all_items_returned"`
	ExternalRefundRef   string     `json:"external_refund_ref"`
	CashierID           string     `json:"cashier_id"`
	Reason              string     `json:"reason"`
	Lines               []SaleLine `json:"lines"`
	FullyRefunded       bool       `json:"fully_refunded"`
	CreatedAt           time.Time  `json:"created_at"`
}

func (s *Service) RefundTransaction(in RefundInput, actor string) (map[string]any, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if strings.TrimSpace(in.SONumber) == "" || len(in.SONumber) > 128 || len(in.Lines) > 200 || strings.TrimSpace(in.IdempotencyKey) == "" || len(in.IdempotencyKey) > 128 || strings.TrimSpace(in.ExternalRefundRef) == "" || len(in.ExternalRefundRef) > 256 || strings.TrimSpace(in.CashierID) == "" || len(in.CashierID) > 128 || strings.TrimSpace(in.Reason) == "" || len(in.Reason) > 500 || in.TotalCents <= 0 {
		return nil, false, ErrInvalid
	}
	so, err := s.GetSO(in.SONumber)
	if err != nil {
		return nil, false, err
	}
	records, err := s.store.List("wms_pos_sale")
	if err != nil {
		return nil, false, err
	}
	var sale SaleRecord
	found := false
	for _, record := range records {
		var candidate SaleRecord
		if json.Unmarshal(record.Data, &candidate) == nil && candidate.SOID == so.SOID {
			sale, found = candidate, true
			break
		}
	}
	if !found {
		return nil, false, salesorders.ErrNotFound
	}

	fingerprintBytes, err := json.Marshal(struct {
		Request RefundInput `json:"request"`
		Actor   string      `json:"actor"`
	}{Request: in, Actor: actor})
	if err != nil {
		return nil, false, err
	}
	fingerprintSum := sha256.Sum256(fingerprintBytes)
	fingerprint := hex.EncodeToString(fingerprintSum[:])
	idSum := sha256.Sum256([]byte(in.IdempotencyKey))
	refundID := hex.EncodeToString(idSum[:])
	if record, ok, err := s.store.Get("wms_pos_refund", refundID); err != nil {
		return nil, false, err
	} else if ok {
		var prior RefundRecord
		if err := json.Unmarshal(record.Data, &prior); err != nil {
			return nil, false, err
		}
		if prior.Fingerprint != fingerprint {
			return nil, false, fmt.Errorf("refund idempotency key reused with different body")
		}
		if prior.Status == "COMPLETED" {
			if prior.FullyRefunded {
				sale.Status = "REFUNDED"
				so.Status = salesorders.StatusRefunded
				for i := range so.Lines {
					so.Lines[i].Status = salesorders.LineRefunded
				}
			} else if sale.Status == "COMPLETED" || sale.Status == "DISPATCHED" {
				sale.Status = "PARTIALLY_REFUNDED"
				so.Status = salesorders.StatusPartiallyRefunded
			}
			saleData, marshalErr := json.Marshal(sale)
			if marshalErr != nil {
				return nil, false, marshalErr
			}
			if _, persistErr := s.store.Put("wms_pos_sale", sale.ID, saleData); persistErr != nil {
				return nil, false, persistErr
			}
			if saveErr := s.sos.Save(so); saveErr != nil {
				return nil, false, saveErr
			}
			return map[string]any{"refund_id": prior.ID, "original_so_number": in.SONumber, "fully_refunded": prior.FullyRefunded, "all_items_returned": prior.AllItemsReturned, "total_cents": prior.TotalCents, "replayed": true}, true, nil
		}
	}
	if !found || (sale.Status != "COMPLETED" && sale.Status != "DISPATCHED" && sale.Status != "PARTIALLY_REFUNDED") || (so.Status != salesorders.StatusShipped && so.Status != salesorders.StatusPartiallyRefunded) {
		return nil, false, salesorders.ErrNotFound
	}
	if time.Since(sale.CreatedAt) > 90*24*time.Hour {
		return nil, false, fmt.Errorf("refund window expired")
	}
	if strings.ToLower(strings.TrimSpace(in.PaymentMethod)) != sale.PaymentMethod {
		return nil, false, fmt.Errorf("tender mismatch: original sale used %s", sale.PaymentMethod)
	}
	original := make(map[string]SaleLine)
	for _, line := range sale.Lines {
		key := fmt.Sprintf("%d:%d", line.ItemID, line.BinID)
		current, exists := original[key]
		if !exists {
			current = line
			current.Quantity = 0
			current.LineTotalCents = 0
			current.TaxCents = 0
		}
		current.Quantity += line.Quantity
		current.LineTotalCents += line.LineTotalCents
		current.TaxCents += line.TaxCents
		original[key] = current
	}
	already := make(map[string]int64)
	refundRecords, err := s.store.List("wms_pos_refund")
	if err != nil {
		return nil, false, err
	}
	for _, record := range refundRecords {
		var prior RefundRecord
		if json.Unmarshal(record.Data, &prior) != nil {
			continue
		}
		if prior.ExternalRefundRef == in.ExternalRefundRef && prior.ID != refundID {
			return nil, false, fmt.Errorf("external refund reference already belongs to another refund")
		}
		if prior.SaleID != sale.ID {
			continue
		}
		if prior.Status == "PREPARING" && prior.ID != refundID {
			return nil, false, fmt.Errorf("another refund transaction is still pending for this sale")
		}
		if prior.Status != "COMPLETED" {
			continue
		}
		for _, line := range prior.Lines {
			already[fmt.Sprintf("%d:%d", line.ItemID, line.BinID)] += line.Quantity
		}
	}
	requested := make([]SaleLine, 0)
	if len(in.Lines) == 0 {
		for key, line := range original {
			remaining := line.Quantity - already[key]
			if remaining > 0 {
				line.Quantity = remaining
				requested = append(requested, line)
			}
		}
	} else {
		for _, line := range in.Lines {
			itemID := line.ItemID
			if itemID <= 0 {
				for _, originalLine := range sale.Lines {
					if originalLine.SKU == line.SKU {
						itemID = originalLine.ItemID
						break
					}
				}
			}
			key := fmt.Sprintf("%d:%d", itemID, line.BinID)
			base, exists := original[key]
			if !exists || (line.SKU != "" && line.SKU != base.SKU) || line.Quantity <= 0 || line.Quantity > base.Quantity-already[key] {
				return nil, false, fmt.Errorf("refund line is not in the original sale or exceeds remaining quantity")
			}
			base.Quantity = line.Quantity
			requested = append(requested, base)
		}
		// Normalize repeated cart rows to one refund movement per item/bin.
		// The ledger operation ID is location-scoped; retaining duplicate rows
		// here would cause the second movement to be treated as an idempotent replay.
		aggregated := make(map[string]SaleLine)
		order := make([]string, 0, len(requested))
		for _, requestedLine := range requested {
			key := fmt.Sprintf("%d:%d", requestedLine.ItemID, requestedLine.BinID)
			current, exists := aggregated[key]
			if !exists {
				current = requestedLine
				current.Quantity = 0
				order = append(order, key)
			}
			if current.Quantity > math.MaxInt64-requestedLine.Quantity {
				return nil, false, ErrInvalid
			}
			current.Quantity += requestedLine.Quantity
			aggregated[key] = current
		}
		requested = requested[:0]
		for _, key := range order {
			line := aggregated[key]
			if line.Quantity > original[key].Quantity-already[key] {
				return nil, false, fmt.Errorf("repeated refund lines exceed remaining quantity")
			}
			requested = append(requested, line)
		}
	}
	// Consolidate repeated request lines by item/bin before creating ledger
	// operations. The operation ID is location-scoped, so applying two lines
	// separately with that same ID would otherwise replay only the first delta.
	if len(requested) > 1 {
		byLocation := make(map[string]SaleLine, len(requested))
		order := make([]string, 0, len(requested))
		for _, line := range requested {
			key := fmt.Sprintf("%d:%d", line.ItemID, line.BinID)
			current, exists := byLocation[key]
			if !exists {
				current = line
				current.Quantity = 0
				order = append(order, key)
			}
			if current.Quantity > math.MaxInt64-line.Quantity {
				return nil, false, ErrInvalid
			}
			current.Quantity += line.Quantity
			byLocation[key] = current
		}
		consolidated := make([]SaleLine, 0, len(order))
		for _, key := range order {
			consolidated = append(consolidated, byLocation[key])
		}
		requested = consolidated
	}
	if len(requested) == 0 && in.ShippingRefundCents <= 0 {
		return nil, false, fmt.Errorf("sale has no refundable quantity or shipping amount remaining")
	}
	var alreadyTotal int64
	for _, value := range already {
		alreadyTotal += value
	}
	var alreadyCents, alreadyShipping int64
	for _, record := range refundRecords {
		var prior RefundRecord
		if json.Unmarshal(record.Data, &prior) == nil && prior.SaleID == sale.ID && prior.Status == "COMPLETED" {
			alreadyCents += prior.TotalCents
			alreadyShipping += prior.ShippingRefundCents
		}
	}
	var originalTotal int64
	for _, value := range original {
		originalTotal += value.Quantity
	}
	var requestedTotal int64
	for _, value := range requested {
		requestedTotal += value.Quantity
	}
	allItemsReturned := alreadyTotal+requestedTotal == originalTotal
	if in.ShippingRefundCents < 0 || in.ShippingRefundCents > sale.ShippingCents-alreadyShipping {
		return nil, false, fmt.Errorf("shipping refund exceeds the remaining shipping charge")
	}
	var expectedLineRefund int64
	amountAtQuantity := func(total, quantity, sold int64) int64 {
		if sold <= 0 || quantity <= 0 {
			return 0
		}
		unit, remainder := total/sold, total%sold
		return unit*quantity + (remainder*quantity)/sold
	}
	for i := range requested {
		key := fmt.Sprintf("%d:%d", requested[i].ItemID, requested[i].BinID)
		before := amountAtQuantity(original[key].LineTotalCents, already[key], original[key].Quantity)
		after := amountAtQuantity(original[key].LineTotalCents, already[key]+requested[i].Quantity, original[key].Quantity)
		requested[i].LineTotalCents = after - before
		expectedLineRefund += requested[i].LineTotalCents
	}
	if expectedLineRefund > math.MaxInt64-in.ShippingRefundCents || in.TotalCents != expectedLineRefund+in.ShippingRefundCents {
		return nil, false, fmt.Errorf("refund amount does not reconcile to returned lines and shipping")
	}
	if in.TotalCents > sale.TotalCents-alreadyCents {
		return nil, false, fmt.Errorf("refund amount exceeds remaining sale total")
	}
	fullyRefunded := allItemsReturned && alreadyCents+in.TotalCents == sale.TotalCents && alreadyShipping+in.ShippingRefundCents == sale.ShippingCents
	refund := RefundRecord{ID: refundID, SaleID: sale.ID, Fingerprint: fingerprint, Status: "PREPARING", TotalCents: in.TotalCents, ShippingRefundCents: in.ShippingRefundCents, AllItemsReturned: allItemsReturned, ExternalRefundRef: in.ExternalRefundRef, CashierID: in.CashierID, Reason: in.Reason, Lines: requested, CreatedAt: time.Now().UTC()}
	data, _ := json.Marshal(refund)
	if _, err := s.store.Put("wms_pos_refund", refundID, data); err != nil {
		return nil, false, err
	}
	for _, line := range requested {
		opSum := sha256.Sum256([]byte(in.IdempotencyKey + "|" + fmt.Sprintf("%d:%d:%d", line.WarehouseID, line.BinID, line.ItemID)))
		opID := "pos-ref-" + hex.EncodeToString(opSum[:16])
		if _, err := s.ledger.Adjust(inventoryledger.AdjustCommand{OperationID: opID, WarehouseID: line.WarehouseID, BinID: line.BinID, ItemID: line.ItemID, Delta: line.Quantity}); err != nil {
			return nil, false, err
		}
	}
	refund.Status, refund.FullyRefunded = "COMPLETED", fullyRefunded
	data, err = json.Marshal(refund)
	if err != nil {
		return nil, false, err
	}
	if _, err := s.store.Put("wms_pos_refund", refundID, data); err != nil {
		return nil, false, err
	}
	if fullyRefunded {
		sale.Status = "REFUNDED"
		so.Status = salesorders.StatusRefunded
		for i := range so.Lines {
			so.Lines[i].Status = salesorders.LineRefunded
		}
	} else {
		sale.Status = "PARTIALLY_REFUNDED"
		so.Status = salesorders.StatusPartiallyRefunded
	}
	data, err = json.Marshal(sale)
	if err != nil {
		return nil, false, err
	}
	if _, err := s.store.Put("wms_pos_sale", sale.ID, data); err != nil {
		return nil, false, err
	}
	if err := s.sos.Save(so); err != nil {
		return nil, false, err
	}
	return map[string]any{"refund_id": refundID, "original_so_number": in.SONumber, "fully_refunded": fullyRefunded, "all_items_returned": allItemsReturned, "shipping_refund_cents": in.ShippingRefundCents, "total_cents": in.TotalCents, "external_refund_ref": in.ExternalRefundRef, "actor": actor, "replayed": false}, false, nil
}

func (s *Service) Refund(soNumber string, actor string) (map[string]any, error) {
	if _, err := s.GetSO(soNumber); err != nil {
		return nil, err
	}
	return nil, ErrUnsupported
}

func (s *Service) DispatchWithDetails(soNumber, carrier, tracking, actor, operationID string, allowed []int64, isAdmin bool) (map[string]any, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.fulfill == nil {
		return nil, ErrUnsupported
	}
	so, err := s.GetSO(soNumber)
	if err != nil {
		return nil, err
	}
	if !isAdmin {
		inScope := false
		for _, id := range allowed {
			if id == so.WarehouseID {
				inScope = true
				break
			}
		}
		if !inScope {
			return nil, fulfillment.ErrScope
		}
	}
	records, err := s.store.List("wms_pos_sale")
	if err != nil {
		return nil, err
	}
	var sale *SaleRecord
	for _, record := range records {
		var candidate SaleRecord
		if json.Unmarshal(record.Data, &candidate) == nil && candidate.SOID == so.SOID {
			copy := candidate
			sale = &copy
			break
		}
	}
	if sale == nil {
		return nil, fmt.Errorf("POS sale metadata not found")
	}
	if !sale.PhoneOrder {
		return nil, fmt.Errorf("only phone orders can use POS dispatch")
	}
	if strings.TrimSpace(operationID) == "" || len(operationID) > 128 {
		return nil, ErrInvalid
	}
	fingerprintSum := sha256.Sum256([]byte(soNumber + "|" + carrier + "|" + tracking + "|" + actor))
	fingerprint := hex.EncodeToString(fingerprintSum[:])
	if so.Status != salesorders.StatusShipped && so.Status != salesorders.StatusPicked && so.Status != salesorders.StatusPacked {
		return nil, fulfillment.ErrState
	}
	if so.Status == salesorders.StatusShipped && sale.Status != "DISPATCHING" && sale.Status != "DISPATCHED" {
		return nil, fulfillment.ErrState
	}
	if sale.DispatchKey != "" && (sale.DispatchKey != operationID || sale.DispatchFingerprint != fingerprint) {
		return nil, fmt.Errorf("POS dispatch idempotency key reused with different command")
	}
	if sale.DispatchKey == "" {
		sale.DispatchKey, sale.DispatchFingerprint = operationID, fingerprint
		data, _ := json.Marshal(sale)
		if _, err := s.store.Put("wms_pos_sale", sale.ID, data); err != nil {
			return nil, err
		}
	}
	if sale.Status == "DISPATCHED" && so.Status != salesorders.StatusShipped {
		return nil, fulfillment.ErrState
	}
	if so.Status != salesorders.StatusShipped && so.Status != salesorders.StatusPicked && so.Status != salesorders.StatusPacked {
		return nil, fulfillment.ErrState
	}
	if so.Status == salesorders.StatusShipped && (sale.Status == "DISPATCHING" || sale.Status == "DISPATCHED") {
		shipment, err := s.fulfill.GetShipment(so.SOID)
		if err != nil {
			return nil, err
		}
		if shipment.Status != "SHIPPED" || strings.TrimSpace(carrier) != shipment.Carrier || strings.TrimSpace(tracking) != shipment.TrackingNumber {
			return nil, fulfillment.ErrState
		}
		if sale.Status != "DISPATCHED" {
			sale.Status = "DISPATCHED"
			data, _ := json.Marshal(sale)
			if _, err := s.store.Put("wms_pos_sale", sale.ID, data); err != nil {
				return nil, err
			}
		}
		return map[string]any{"so_id": so.SOID, "so_number": so.SONumber, "status": shipment.Status, "carrier": shipment.Carrier, "tracking_number": shipment.TrackingNumber, "shipped_at": shipment.ShippedAt, "actor": actor, "replayed": true}, nil
	}
	if sale.Status == "DISPATCHED" {
		return nil, fulfillment.ErrState
	}
	if sale.Status != "COMPLETED" && sale.Status != "DISPATCHING" {
		return nil, fulfillment.ErrState
	}
	aggregated := make(map[string]SaleLine)
	for _, line := range sale.Lines {
		key := fmt.Sprintf("%d:%d:%d", line.WarehouseID, line.BinID, line.ItemID)
		current := aggregated[key]
		current.WarehouseID, current.BinID, current.ItemID = line.WarehouseID, line.BinID, line.ItemID
		current.Quantity += line.Quantity
		aggregated[key] = current
	}
	for key, line := range aggregated {
		base := sha256.Sum256([]byte(sale.ID + "|dispatch|" + operationID + "|" + key))
		releaseID := "pos-rel-" + hex.EncodeToString(base[:12])
		commitID := "pos-out-" + hex.EncodeToString(base[:12])
		if _, err := s.ledger.Release(inventoryledger.QuantityCommand{OperationID: releaseID, WarehouseID: line.WarehouseID, BinID: line.BinID, ItemID: line.ItemID, Quantity: line.Quantity}); err != nil {
			return nil, err
		}
		if _, err := s.ledger.Adjust(inventoryledger.AdjustCommand{OperationID: commitID, WarehouseID: line.WarehouseID, BinID: line.BinID, ItemID: line.ItemID, Delta: -line.Quantity}); err != nil {
			return nil, err
		}
	}
	sale.Status = "DISPATCHING"
	data, _ := json.Marshal(sale)
	if _, err := s.store.Put("wms_pos_sale", sale.ID, data); err != nil {
		return nil, err
	}
	shipment, err := s.fulfill.Fulfill(fulfillment.FulfillInput{SOID: so.SOID, Carrier: carrier, TrackingNumber: tracking, WarehouseID: so.WarehouseID, POSDispatchKey: operationID}, allowed, isAdmin)
	if err != nil {
		return nil, err
	}
	sale.Status = "DISPATCHED"
	data, _ = json.Marshal(sale)
	if _, err := s.store.Put("wms_pos_sale", sale.ID, data); err != nil {
		return nil, err
	}
	return map[string]any{"so_id": so.SOID, "so_number": so.SONumber, "status": shipment.Status, "carrier": shipment.Carrier, "tracking_number": shipment.TrackingNumber, "shipped_at": shipment.ShippedAt, "actor": actor, "replayed": false}, nil
}

func (s *Service) Dispatch(soNumber, actor string) (map[string]any, error) {
	if _, err := s.GetSO(soNumber); err != nil {
		return nil, err
	}
	return nil, ErrUnsupported
}
