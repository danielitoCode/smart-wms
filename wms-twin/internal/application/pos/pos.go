package pos

import (
	"errors"
	"fmt"
	"sync"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/catalog"
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
	mu      sync.Mutex
}

func New(store *corestore.Store, cat *catalog.Repository, sos *salesorders.Repository, ledger *inventoryledger.Ledger) *Service {
	return &Service{store: store, catalog: cat, sos: sos, ledger: ledger}
}

type CartLine struct {
	SKU      string `json:"sku"`
	ItemID   int64  `json:"item_id"`
	Quantity int64  `json:"quantity"`
}

func (s *Service) Availability(warehouseID int64, sku string) (map[string]any, error) {
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
	if warehouseID == 0 || len(lines) == 0 {
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
	items, _ := s.catalog.ListItems()
	skuToID := map[string]int64{}
	for _, it := range items {
		skuToID[it.SKU] = it.ItemID
		if _, ok := availMap[it.ItemID]; !ok {
			availMap[it.ItemID] = 0
		}
	}
	linesOut := make([]map[string]any, 0, len(lines))
	ok := true
	for _, ln := range lines {
		id := ln.ItemID
		if id == 0 {
			id = skuToID[ln.SKU]
		}
		have := availMap[id]
		lineOK := id > 0 && ln.Quantity > 0 && have >= ln.Quantity
		if !lineOK {
			ok = false
		}
		linesOut = append(linesOut, map[string]any{
			"item_id": id, "sku": ln.SKU, "quantity": ln.Quantity,
			"available": have, "ok": lineOK,
		})
	}
	return map[string]any{"ok": ok, "lines": linesOut}, nil
}

func (s *Service) Checkout(warehouseID int64, lines []CartLine, actor string) (salesorders.SalesOrder, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	v, err := s.ValidateCart(warehouseID, lines)
	if err != nil {
		return salesorders.SalesOrder{}, err
	}
	if v["ok"] != true {
		return salesorders.SalesOrder{}, fmt.Errorf("%w: insufficient stock", ErrInvalid)
	}
	items, _ := s.catalog.ListItems()
	skuToID := map[string]int64{}
	for _, it := range items {
		skuToID[it.SKU] = it.ItemID
	}
	soLines := make([]salesorders.LineInput, 0, len(lines))
	for _, ln := range lines {
		id := ln.ItemID
		if id == 0 {
			id = skuToID[ln.SKU]
		}
		soLines = append(soLines, salesorders.LineInput{ItemID: id, QuantityOrdered: ln.Quantity})
	}
	num := fmt.Sprintf("POS-%d", time.Now().UTC().UnixNano()%1_000_000_000)
	return s.sos.Create(salesorders.CreateInput{
		SONumber: num, WarehouseID: warehouseID, Lines: soLines,
	}, actor)
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
