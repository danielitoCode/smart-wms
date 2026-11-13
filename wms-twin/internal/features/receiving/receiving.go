package receiving

import (
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/features/catalog"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/features/inventoryledger"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/features/purchaseorders"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
)

var (
	ErrNotFound  = errors.New("not found")
	ErrInvalid   = errors.New("invalid receiving request")
	ErrWarehouse = errors.New("warehouse scope denied")
	ErrPOLocked  = errors.New("purchase order cannot receive")
	ErrBin       = errors.New("invalid staging or destination bin")
	ErrReceipt   = errors.New("receipt not found or mismatch")
)

const receiptKind = "receipts"
const receiptSeqKind = "receipt-sequences"

type Receipt struct {
	ReceiptID   int64     `json:"receipt_id"`
	POID        int64     `json:"po_id"`
	POLineID    int64     `json:"po_line_id"`
	ItemID      int64     `json:"item_id"`
	Quantity    int64     `json:"quantity"`
	BinID       int64     `json:"bin_id"`
	WarehouseID int64     `json:"warehouse_id"`
	LotNumber   string    `json:"lot_number,omitempty"`
	Notes       string    `json:"notes,omitempty"`
	Cancelled   bool      `json:"cancelled"`
	CreatedAt   time.Time `json:"created_at"`
	CreatedBy   string    `json:"created_by"`
}

type ReceiveItem struct {
	ItemID    int64  `json:"item_id"`
	Quantity  int64  `json:"quantity"`
	BinID     int64  `json:"bin_id"`
	LotNumber string `json:"lot_number"`
	Notes     string `json:"notes"`
}

type ReceiveInput struct {
	POID  int64         `json:"po_id"`
	Items []ReceiveItem `json:"items"`
}

type CancelInput struct {
	POID       int64   `json:"po_id"`
	ReceiptIDs []int64 `json:"receipt_ids"`
}

type ConfirmPutawayInput struct {
	ItemID    int64  `json:"item_id"`
	FromBinID int64  `json:"from_bin_id"`
	ToBinID   int64  `json:"to_bin_id"`
	Quantity  int64  `json:"quantity"`
	LotNumber string `json:"lot_number"`
}

type Service struct {
	store  *corestore.Store
	master *catalog.Repository
	pos    *purchaseorders.Repository
	ledger *inventoryledger.Ledger
	mu     sync.Mutex
}

func New(store *corestore.Store, master *catalog.Repository, pos *purchaseorders.Repository, ledger *inventoryledger.Ledger) *Service {
	return &Service{store: store, master: master, pos: pos, ledger: ledger}
}

func (s *Service) nextReceiptID() (int64, error) {
	record, found, err := s.store.Get(receiptSeqKind, "global")
	if err != nil {
		return 0, err
	}
	next := int64(1)
	if found {
		var state struct {
			Next int64 `json:"next"`
		}
		_ = json.Unmarshal(record.Data, &state)
		if state.Next > 0 {
			next = state.Next
		}
	}
	payload, _ := json.Marshal(map[string]int64{"next": next + 1})
	if _, err := s.store.Put(receiptSeqKind, "global", payload); err != nil {
		return 0, err
	}
	return next, nil
}

func containsID(ids []int64, id int64) bool {
	for _, v := range ids {
		if v == id {
			return true
		}
	}
	return false
}

func (s *Service) LookupPO(barcode string, allowed []int64, isAdmin bool) (purchaseorders.PurchaseOrder, error) {
	barcode = strings.TrimSpace(barcode)
	if barcode == "" {
		return purchaseorders.PurchaseOrder{}, ErrInvalid
	}
	list, err := s.pos.List()
	if err != nil {
		return purchaseorders.PurchaseOrder{}, err
	}
	for _, po := range list {
		if po.POBarcode == barcode || po.PONumber == barcode {
			if !isAdmin && !containsID(allowed, po.WarehouseID) {
				return purchaseorders.PurchaseOrder{}, ErrNotFound
			}
			return po, nil
		}
	}
	return purchaseorders.PurchaseOrder{}, ErrNotFound
}

func derivePOStatus(po purchaseorders.PurchaseOrder) string {
	if len(po.Lines) == 0 {
		return purchaseorders.StatusOpen
	}
	allRecv, anyRecv := true, false
	for _, l := range po.Lines {
		if l.QuantityReceived > 0 {
			anyRecv = true
		}
		if l.QuantityReceived < l.QuantityOrdered {
			allRecv = false
		}
	}
	if allRecv {
		return purchaseorders.StatusReceived
	}
	if anyRecv {
		return purchaseorders.StatusPartial
	}
	return purchaseorders.StatusOpen
}

func (s *Service) Receive(in ReceiveInput, actor string, allowed []int64, isAdmin bool) ([]Receipt, purchaseorders.PurchaseOrder, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if in.POID <= 0 || len(in.Items) == 0 {
		return nil, purchaseorders.PurchaseOrder{}, ErrInvalid
	}
	po, err := s.pos.Get(in.POID)
	if err != nil {
		return nil, purchaseorders.PurchaseOrder{}, ErrNotFound
	}
	if !isAdmin && !containsID(allowed, po.WarehouseID) {
		return nil, purchaseorders.PurchaseOrder{}, ErrWarehouse
	}
	if po.Status == purchaseorders.StatusClosed || po.Status == purchaseorders.StatusArchived {
		return nil, purchaseorders.PurchaseOrder{}, ErrPOLocked
	}
	var receipts []Receipt
	for i, item := range in.Items {
		if item.ItemID <= 0 || item.Quantity <= 0 || item.BinID <= 0 {
			return nil, purchaseorders.PurchaseOrder{}, ErrInvalid
		}
		bin, err := s.master.GetBin(item.BinID)
		if err != nil || bin.WarehouseID != po.WarehouseID {
			return nil, purchaseorders.PurchaseOrder{}, ErrBin
		}
		if bin.BinType != "Staging" && bin.BinType != "PickableStaging" {
			return nil, purchaseorders.PurchaseOrder{}, ErrBin
		}
		lineIdx := -1
		for li, line := range po.Lines {
			if line.ItemID == item.ItemID {
				lineIdx = li
				break
			}
		}
		if lineIdx < 0 {
			return nil, purchaseorders.PurchaseOrder{}, fmt.Errorf("%w: item not on PO", ErrInvalid)
		}
		opID := fmt.Sprintf("recv-%d-%d-%d", in.POID, item.ItemID, time.Now().UnixNano()+int64(i))
		if _, err := s.ledger.Adjust(inventoryledger.AdjustCommand{
			OperationID: opID, WarehouseID: po.WarehouseID, BinID: item.BinID,
			ItemID: item.ItemID, LotNumber: item.LotNumber, Delta: item.Quantity,
		}); err != nil {
			return nil, purchaseorders.PurchaseOrder{}, err
		}
		rid, err := s.nextReceiptID()
		if err != nil {
			return nil, purchaseorders.PurchaseOrder{}, err
		}
		rec := Receipt{
			ReceiptID: rid, POID: po.POID, POLineID: po.Lines[lineIdx].POLineID,
			ItemID: item.ItemID, Quantity: item.Quantity, BinID: item.BinID,
			WarehouseID: po.WarehouseID, LotNumber: item.LotNumber, Notes: item.Notes,
			CreatedAt: time.Now().UTC(), CreatedBy: actor,
		}
		payload, _ := json.Marshal(rec)
		if _, err := s.store.Put(receiptKind, fmt.Sprintf("%d", rid), payload); err != nil {
			return nil, purchaseorders.PurchaseOrder{}, err
		}
		po.Lines[lineIdx].QuantityReceived += item.Quantity
		if po.Lines[lineIdx].QuantityReceived >= po.Lines[lineIdx].QuantityOrdered {
			po.Lines[lineIdx].QuantityReceived = po.Lines[lineIdx].QuantityOrdered
			po.Lines[lineIdx].Status = purchaseorders.LineReceived
		} else if po.Lines[lineIdx].QuantityReceived > 0 {
			po.Lines[lineIdx].Status = purchaseorders.LinePartial
		}
		receipts = append(receipts, rec)
	}
	po.Status = derivePOStatus(po)
	if po.Status == purchaseorders.StatusReceived {
		now := time.Now().UTC()
		po.ReceivedAt = &now
	}
	if err := s.pos.Save(po); err != nil {
		return nil, purchaseorders.PurchaseOrder{}, err
	}
	return receipts, po, nil
}

func (s *Service) Cancel(in CancelInput, actor string, allowed []int64, isAdmin bool) ([]Receipt, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if in.POID <= 0 || len(in.ReceiptIDs) == 0 {
		return nil, ErrInvalid
	}
	po, err := s.pos.Get(in.POID)
	if err != nil {
		return nil, ErrNotFound
	}
	if !isAdmin && !containsID(allowed, po.WarehouseID) {
		return nil, ErrWarehouse
	}
	var out []Receipt
	for _, rid := range in.ReceiptIDs {
		record, found, err := s.store.Get(receiptKind, fmt.Sprintf("%d", rid))
		if err != nil {
			return nil, err
		}
		if !found {
			return nil, ErrReceipt
		}
		var rec Receipt
		if err := json.Unmarshal(record.Data, &rec); err != nil {
			return nil, err
		}
		if rec.POID != in.POID || rec.Cancelled {
			return nil, ErrReceipt
		}
		opID := fmt.Sprintf("cancel-recv-%d-%d", rid, time.Now().UnixNano())
		if _, err := s.ledger.Adjust(inventoryledger.AdjustCommand{
			OperationID: opID, WarehouseID: rec.WarehouseID, BinID: rec.BinID,
			ItemID: rec.ItemID, LotNumber: rec.LotNumber, Delta: -rec.Quantity,
		}); err != nil {
			return nil, err
		}
		rec.Cancelled = true
		payload, _ := json.Marshal(rec)
		if _, err := s.store.Put(receiptKind, fmt.Sprintf("%d", rid), payload); err != nil {
			return nil, err
		}
		for i := range po.Lines {
			if po.Lines[i].POLineID == rec.POLineID {
				po.Lines[i].QuantityReceived -= rec.Quantity
				if po.Lines[i].QuantityReceived < 0 {
					po.Lines[i].QuantityReceived = 0
				}
				if po.Lines[i].QuantityReceived == 0 {
					po.Lines[i].Status = purchaseorders.LinePending
				} else {
					po.Lines[i].Status = purchaseorders.LinePartial
				}
			}
		}
		out = append(out, rec)
	}
	po.Status = derivePOStatus(po)
	po.ReceivedAt = nil
	_ = actor
	return out, s.pos.Save(po)
}

func (s *Service) PendingPutaway(warehouseID int64, allowed []int64, isAdmin bool) ([]map[string]any, error) {
	if warehouseID <= 0 {
		return nil, ErrInvalid
	}
	if !isAdmin && !containsID(allowed, warehouseID) {
		return nil, ErrWarehouse
	}
	balances, _, err := s.ledger.List()
	if err != nil {
		return nil, err
	}
	bins, err := s.master.ListBins()
	if err != nil {
		return nil, err
	}
	binByID := map[int64]catalog.Bin{}
	for _, b := range bins {
		binByID[b.BinID] = b
	}
	var pending []map[string]any
	for _, bal := range balances {
		if bal.WarehouseID != warehouseID || bal.OnHand <= 0 {
			continue
		}
		bin, ok := binByID[bal.BinID]
		if !ok || (bin.BinType != "Staging" && bin.BinType != "PickableStaging") {
			continue
		}
		item, err := s.master.GetItem(bal.ItemID)
		if err != nil {
			continue
		}
		suggested, _ := s.SuggestBin(bal.ItemID, warehouseID)
		pending = append(pending, map[string]any{
			"item_id": item.ItemID, "sku": item.SKU, "item_name": item.ItemName,
			"quantity": bal.OnHand, "bin_id": bin.BinID, "bin_code": bin.BinCode,
			"lot_number": bal.LotNumber, "suggested_bin": suggested,
		})
	}
	sort.Slice(pending, func(i, j int) bool {
		return fmt.Sprint(pending[i]["sku"]) < fmt.Sprint(pending[j]["sku"])
	})
	return pending, nil
}

func (s *Service) SuggestBin(itemID, warehouseID int64) (string, error) {
	prefs, err := s.master.ListPreferredBins()
	if err != nil {
		return "", err
	}
	bins, err := s.master.ListBins()
	if err != nil {
		return "", err
	}
	binByID := map[int64]catalog.Bin{}
	for _, b := range bins {
		binByID[b.BinID] = b
	}
	type pref struct {
		Priority int
		Code     string
	}
	var matches []pref
	for _, p := range prefs {
		if p.ItemID != itemID {
			continue
		}
		b, ok := binByID[p.BinID]
		if !ok || b.WarehouseID != warehouseID || !b.IsActive {
			continue
		}
		matches = append(matches, pref{Priority: p.Priority, Code: b.BinCode})
	}
	sort.Slice(matches, func(i, j int) bool { return matches[i].Priority < matches[j].Priority })
	if len(matches) > 0 {
		return matches[0].Code, nil
	}
	item, err := s.master.GetItem(itemID)
	if err != nil {
		return "", err
	}
	if item.DefaultBinID != nil {
		if b, ok := binByID[*item.DefaultBinID]; ok && b.WarehouseID == warehouseID {
			return b.BinCode, nil
		}
	}
	return "", nil
}

func (s *Service) ConfirmPutaway(in ConfirmPutawayInput, allowed []int64, isAdmin bool) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if in.ItemID <= 0 || in.FromBinID <= 0 || in.ToBinID <= 0 || in.Quantity <= 0 || in.FromBinID == in.ToBinID {
		return ErrInvalid
	}
	from, err := s.master.GetBin(in.FromBinID)
	if err != nil {
		return ErrBin
	}
	to, err := s.master.GetBin(in.ToBinID)
	if err != nil || from.WarehouseID != to.WarehouseID {
		return ErrBin
	}
	if !isAdmin && !containsID(allowed, from.WarehouseID) {
		return ErrWarehouse
	}
	if from.BinType != "Staging" && from.BinType != "PickableStaging" {
		return ErrBin
	}
	opID := fmt.Sprintf("putaway-%d-%d-%d", in.ItemID, in.FromBinID, time.Now().UnixNano())
	_, err = s.ledger.Move(inventoryledger.MoveCommand{
		OperationID: opID,
		Source:      inventoryledger.Location{WarehouseID: from.WarehouseID, BinID: in.FromBinID, ItemID: in.ItemID, LotNumber: in.LotNumber},
		Destination: inventoryledger.Location{WarehouseID: to.WarehouseID, BinID: in.ToBinID, ItemID: in.ItemID, LotNumber: in.LotNumber},
		Quantity:    in.Quantity,
	})
	return err
}
