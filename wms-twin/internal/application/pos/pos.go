package pos

import (
	"errors"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"
	"sync"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/catalog"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/fulfillment"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/inventoryledger"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/salesorders"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
)

var (
	ErrInvalid = errors.New("invalid pos request")
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
	SKU string `json:"sku"`
	ItemID int64 `json:"item_id"`
	BinID int64 `json:"bin_id"`
	Quantity int64 `json:"quantity"`
	UnitPriceCents int64 `json:"unit_price_cents"`
	TaxCents int64 `json:"tax_cents"`
	LineTotalCents int64 `json:"line_total_cents"`
}

type Tender struct {
	Type string `json:"type"`
	AmountCents int64 `json:"amount_cents"`
	AmountTenderedCents int64 `json:"amount_tendered_cents,omitempty"`
	ChangeCents int64 `json:"change_cents,omitempty"`
	CardBrand string `json:"card_brand,omitempty"`
	CardLast4 string `json:"card_last4,omitempty"`
	AuthCode string `json:"auth_code,omitempty"`
	ExternalRef string `json:"external_ref,omitempty"`
}

type CheckoutInput struct {
	WarehouseID int64 `json:"warehouse_id"`
	IdempotencyKey string `json:"idempotency_key"`
	ExternalTxnRef string `json:"external_txn_ref"`
	CashierID string `json:"cashier_id"`
	TerminalID string `json:"terminal_id"`
	PaymentMethod string `json:"payment_method"`
	SubtotalCents int64 `json:"subtotal_cents"`
	TaxCents int64 `json:"tax_cents"`
	TotalCents int64 `json:"total_cents"`
	Tenders []Tender `json:"tenders"`
	PhoneOrder bool `json:"is_phone_order,omitempty"`
	CustomerName string `json:"customer_name,omitempty"`
	Notes string `json:"memo,omitempty"`
	Lines []CartLine `json:"lines"`
}

type SaleLine struct {
	SKU string `json:"sku"`
	ItemID int64 `json:"item_id"`
	WarehouseID int64 `json:"warehouse_id"`
	BinID int64 `json:"bin_id"`
	Quantity int64 `json:"quantity"`
	UnitPriceCents int64 `json:"unit_price_cents"`
	TaxCents int64 `json:"tax_cents"`
	LineTotalCents int64 `json:"line_total_cents"`
}

type SaleRecord struct {
	ID string `json:"id"`
	Fingerprint string `json:"fingerprint"`
	Status string `json:"status"`
	SOID int64 `json:"so_id"`
	SONumber string `json:"so_number"`
	WarehouseID int64 `json:"warehouse_id"`
	PhoneOrder bool `json:"phone_order"`
	PaymentMethod string `json:"payment_method"`
	TotalCents int64 `json:"total_cents"`
	Tenders []Tender `json:"tenders"`
	Lines []SaleLine `json:"lines"`
	CreatedAt time.Time `json:"created_at"`
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
	if warehouseID <= 0 || len(lines) == 0 {
		return nil, ErrInvalid
	}
	av, err := s.Availability(warehouseID, "")
	if err != nil {
		return nil, err
	}
	availMap := map[int64]int64{}
	for _, row := range av["items"].([]map[string]any) {
		id := row["item_id"].(int64)
		availMap[id] = row["available"].(int64)
	}
	items, err := s.catalog.ListItems()
	if err != nil {
		return nil, err
	}
	skuToID := map[string]int64{}
	for _, item := range items {
		skuToID[item.SKU] = item.ItemID
		if _, exists := availMap[item.ItemID]; !exists {
			availMap[item.ItemID] = 0
		}
	}
	type resolvedLine struct {
		id int64
		sku string
		quantity int64
	}
	resolved := make([]resolvedLine, 0, len(lines))
	requested := make(map[int64]int64)
	valid := true
	for _, line := range lines {
		id := line.ItemID
		if id == 0 {
			id = skuToID[line.SKU]
		}
		if id <= 0 || line.Quantity <= 0 {
			valid = false
		} else if requested[id] > int64(^uint64(0)>>1)-line.Quantity {
			valid = false
		} else {
			requested[id] += line.Quantity
		}
		resolved = append(resolved, resolvedLine{id: id, sku: line.SKU, quantity: line.Quantity})
	}
	linesOut := make([]map[string]any, 0, len(resolved))
	for _, line := range resolved {
		have := availMap[line.id]
		lineOK := line.id > 0 && line.quantity > 0 && requested[line.id] <= have
		if !lineOK {
			valid = false
		}
		linesOut = append(linesOut, map[string]any{
			"item_id": line.id, "sku": line.sku, "quantity": line.quantity,
			"available": have, "requested_total": requested[line.id], "ok": lineOK,
		})
	}
	return map[string]any{"ok": valid, "lines": linesOut}, nil
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
	if strings.TrimSpace(in.ExternalTxnRef) == "" || strings.TrimSpace(in.CashierID) == "" || strings.TrimSpace(in.TerminalID) == "" {
		return salesorders.SalesOrder{}, false, ErrInvalid
	}
	method := strings.ToLower(strings.TrimSpace(in.PaymentMethod))
	if method != "cash" && method != "card" && method != "split" { return salesorders.SalesOrder{}, false, ErrInvalid }
	if in.SubtotalCents < 0 || in.TaxCents < 0 || in.TotalCents < 0 || in.TotalCents != in.SubtotalCents+in.TaxCents {
		return salesorders.SalesOrder{}, false, fmt.Errorf("%w: payment totals do not reconcile", ErrInvalid)
	}
	if len(in.Tenders) == 0 || len(in.Tenders) > 8 { return salesorders.SalesOrder{}, false, ErrInvalid }
	var tenderTotal int64
	for _, tender := range in.Tenders {
		if tender.AmountCents < 0 { return salesorders.SalesOrder{}, false, ErrInvalid }
		switch tender.Type {
		case "cash":
			if tender.AmountTenderedCents-tender.ChangeCents != tender.AmountCents || tender.ChangeCents < 0 { return salesorders.SalesOrder{}, false, ErrInvalid }
		case "card":
			if tender.CardBrand == "" || len(tender.CardLast4) != 4 || tender.AuthCode == "" || tender.ExternalRef == "" { return salesorders.SalesOrder{}, false, ErrInvalid }
		default: return salesorders.SalesOrder{}, false, fmt.Errorf("%w: unsupported tender type", ErrInvalid)
		}
		tenderTotal += tender.AmountCents
	}
	if tenderTotal != in.TotalCents { return salesorders.SalesOrder{}, false, fmt.Errorf("%w: tenders do not equal total", ErrInvalid) }
	fingerprintBytes, err := json.Marshal(in)
	if err != nil { return salesorders.SalesOrder{}, false, err }
	fingerprintSum := sha256.Sum256(fingerprintBytes)
	fingerprint := hex.EncodeToString(fingerprintSum[:])
	idSum := sha256.Sum256([]byte(in.IdempotencyKey))
	recordID := hex.EncodeToString(idSum[:])
	var sale SaleRecord
	if rec, ok, err := s.store.Get("wms_pos_sale", recordID); err != nil { return salesorders.SalesOrder{}, false, err
	} else if ok {
		if err := json.Unmarshal(rec.Data, &sale); err != nil { return salesorders.SalesOrder{}, false, err }
		if sale.Fingerprint != fingerprint { return salesorders.SalesOrder{}, false, fmt.Errorf("POS idempotency key reused with different body") }
		if sale.Status == "COMPLETED" {
			so, err := s.sos.Get(sale.SOID)
			return so, true, err
		}
	} else {
		items, err := s.catalog.ListItems()
		if err != nil { return salesorders.SalesOrder{}, false, err }
		skuByID := make(map[int64]string, len(items))
		idBySKU := make(map[string]int64, len(items))
		for _, item := range items { skuByID[item.ItemID] = item.SKU; idBySKU[item.SKU] = item.ItemID }
		balances, _, err := s.ledger.List()
		if err != nil { return salesorders.SalesOrder{}, false, err }
		available := make(map[string]int64)
		for _, balance := range balances {
			if balance.WarehouseID == in.WarehouseID { available[fmt.Sprintf("%d:%d", balance.ItemID, balance.BinID)] += balance.Available() }
		}
		lines := make([]SaleLine, 0, len(in.Lines))
		requested := make(map[string]int64)
		for _, line := range in.Lines {
			itemID := line.ItemID
			if itemID <= 0 { itemID = idBySKU[line.SKU] }
			if itemID <= 0 || line.BinID <= 0 || line.Quantity <= 0 || line.Quantity > 10000 { return salesorders.SalesOrder{}, false, ErrInvalid }
			sku := skuByID[itemID]
			if sku == "" { return salesorders.SalesOrder{}, false, ErrInvalid }
			key := fmt.Sprintf("%d:%d", itemID, line.BinID)
			requested[key] += line.Quantity
			lines = append(lines, SaleLine{SKU:sku, ItemID:itemID, WarehouseID:in.WarehouseID, BinID:line.BinID, Quantity:line.Quantity, UnitPriceCents:line.UnitPriceCents, TaxCents:line.TaxCents, LineTotalCents:line.LineTotalCents})
		}
		for key, quantity := range requested { if available[key] < quantity { return salesorders.SalesOrder{}, false, fmt.Errorf("insufficient stock at %s: available %d, requested %d", key, available[key], quantity) } }
		sale = SaleRecord{ID:recordID, Fingerprint:fingerprint, Status:"PREPARING", WarehouseID:in.WarehouseID, PhoneOrder:in.PhoneOrder, PaymentMethod:method, TotalCents:in.TotalCents, Tenders:in.Tenders, Lines:lines, CreatedAt:time.Now().UTC()}
		data, _ := json.Marshal(sale)
		if _, err := s.store.Put("wms_pos_sale", recordID, data); err != nil { return salesorders.SalesOrder{}, false, err }
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
		opSum := sha256.Sum256([]byte(in.IdempotencyKey + "|" + key))
		opID := "pos-" + hex.EncodeToString(opSum[:16])
		if in.PhoneOrder {
			_, err = s.ledger.Allocate(inventoryledger.QuantityCommand{OperationID:opID, WarehouseID:line.WarehouseID, BinID:line.BinID, ItemID:line.ItemID, Quantity:line.Quantity})
		} else {
			_, err = s.ledger.Adjust(inventoryledger.AdjustCommand{OperationID:opID, WarehouseID:line.WarehouseID, BinID:line.BinID, ItemID:line.ItemID, Delta:-line.Quantity})
		}
		if err != nil { return salesorders.SalesOrder{}, false, err }
	}
	if sale.SOID == 0 {
		number := "POS-" + recordID[:20]
		if existing, findErr := s.sos.FindByBarcode(number); findErr == nil {
			sale.SOID, sale.SONumber = existing.SOID, existing.SONumber
		} else {
			lines := make([]salesorders.LineInput, 0, len(sale.Lines))
			for _, line := range sale.Lines { lines = append(lines, salesorders.LineInput{ItemID:line.ItemID, QuantityOrdered:line.Quantity}) }
			customer := in.CustomerName; notes := in.Notes
			so, createErr := s.sos.Create(salesorders.CreateInput{SONumber:number, WarehouseID:in.WarehouseID, Lines:lines, CustomerName:&customer, Notes:&notes}, actor)
			if createErr != nil { return salesorders.SalesOrder{}, false, createErr }
			sale.SOID, sale.SONumber = so.SOID, so.SONumber
		}
	}
	so, err := s.sos.Get(sale.SOID)
	if err != nil { return salesorders.SalesOrder{}, false, err }
	if in.PhoneOrder {
		so.Status = salesorders.StatusOpen
		for i := range so.Lines { so.Lines[i].QuantityAllocated = so.Lines[i].QuantityOrdered; so.Lines[i].Status = salesorders.LineOpen }
	} else {
		so.Status = salesorders.StatusShipped
		for i := range so.Lines {
			so.Lines[i].QuantityPicked = so.Lines[i].QuantityOrdered
			so.Lines[i].QuantityPacked = so.Lines[i].QuantityOrdered
			so.Lines[i].QuantityShipped = so.Lines[i].QuantityOrdered
			so.Lines[i].Status = salesorders.LineShipped
		}
	}
	if err := s.sos.Save(so); err != nil { return salesorders.SalesOrder{}, false, err }
	sale.Status = "COMPLETED"
	data, err := json.Marshal(sale)
	if err != nil { return salesorders.SalesOrder{}, false, err }
	if _, err := s.store.Put("wms_pos_sale", recordID, data); err != nil { return salesorders.SalesOrder{}, false, err }
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

func (s *Service) Refund(soNumber string, actor string) (map[string]any, error) {
	if _, err := s.GetSO(soNumber); err != nil {
		return nil, err
	}
	return nil, ErrUnsupported
}

func (s *Service) Dispatch(soNumber, actor string) (map[string]any, error) {
	if _, err := s.GetSO(soNumber); err != nil {
		return nil, err
	}
	return nil, ErrUnsupported
}
