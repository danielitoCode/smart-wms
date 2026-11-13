package picking

import (
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/features/catalog"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/features/inventoryledger"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/features/salesorders"
)

var (
	ErrNotFound = errors.New("not found")
	ErrInvalid  = errors.New("invalid picking request")
	ErrLocked   = errors.New("batch locked")
	ErrBarcode  = errors.New("barcode mismatch")
	ErrScope    = errors.New("warehouse scope denied")
)

const (
	batchKind        = "pick-batches"
	taskKind         = "pick-tasks"
	seqKind          = "pick-sequences"
	StatusOpen       = "OPEN"
	StatusInProgress = "IN_PROGRESS"
	StatusComplete   = "COMPLETE"
	StatusCancelled  = "CANCELLED"
	TaskPending      = "PENDING"
	TaskPicked       = "PICKED"
	TaskShort        = "SHORT"
)

type Task struct {
	PickTaskID      int64  `json:"pick_task_id"`
	BatchID         int64  `json:"batch_id"`
	SOID            int64  `json:"so_id"`
	SOLineID        int64  `json:"so_line_id"`
	ItemID          int64  `json:"item_id"`
	BinID           int64  `json:"bin_id"`
	QuantityOrdered int64  `json:"quantity_ordered"`
	QuantityPicked  int64  `json:"quantity_picked"`
	Status          string `json:"status"`
	SKU             string `json:"sku,omitempty"`
	ItemName        string `json:"item_name,omitempty"`
	BinCode         string `json:"bin_code,omitempty"`
	WalkSequence    int    `json:"walk_sequence"`
}

type Batch struct {
	BatchID     int64     `json:"batch_id"`
	WarehouseID int64     `json:"warehouse_id"`
	AssignedTo  string    `json:"assigned_to"`
	Status      string    `json:"status"`
	TotalOrders int       `json:"total_orders"`
	CreatedAt   time.Time `json:"created_at"`
	SOIDs       []int64   `json:"so_ids"`
}

type Service struct {
	store  *corestore.Store
	master *catalog.Repository
	sos    *salesorders.Repository
	ledger *inventoryledger.Ledger
	mu     sync.Mutex
}

func New(store *corestore.Store, master *catalog.Repository, sos *salesorders.Repository, ledger *inventoryledger.Ledger) *Service {
	return &Service{store: store, master: master, sos: sos, ledger: ledger}
}

func (s *Service) nextID(kind string) (int64, error) {
	record, found, err := s.store.Get(seqKind, kind)
	if err != nil {
		return 0, err
	}
	next := int64(1)
	if found {
		var st struct {
			Next int64 `json:"next"`
		}
		_ = json.Unmarshal(record.Data, &st)
		if st.Next > 0 {
			next = st.Next
		}
	}
	data, _ := json.Marshal(map[string]int64{"next": next + 1})
	if _, err := s.store.Put(seqKind, kind, data); err != nil {
		return 0, err
	}
	return next, nil
}

func contains(ids []int64, id int64) bool {
	for _, v := range ids {
		if v == id {
			return true
		}
	}
	return false
}

func (s *Service) ActiveBatch(username string) (map[string]any, error) {
	records, err := s.store.List(batchKind)
	if err != nil {
		return nil, err
	}
	for _, rec := range records {
		var b Batch
		if err := json.Unmarshal(rec.Data, &b); err != nil {
			continue
		}
		if b.AssignedTo == username && (b.Status == StatusOpen || b.Status == StatusInProgress) {
			tasks, _ := s.tasksForBatch(b.BatchID)
			completed := 0
			for _, t := range tasks {
				if t.Status == TaskPicked || t.Status == TaskShort {
					completed++
				}
			}
			return map[string]any{
				"active": true, "batch_id": b.BatchID, "total_orders": b.TotalOrders,
				"total_picks": len(tasks), "completed_picks": completed, "status": b.Status,
			}, nil
		}
	}
	return map[string]any{"active": false}, nil
}

func (s *Service) tasksForBatch(batchID int64) ([]Task, error) {
	records, err := s.store.List(taskKind)
	if err != nil {
		return nil, err
	}
	var out []Task
	for _, rec := range records {
		var t Task
		if err := json.Unmarshal(rec.Data, &t); err != nil {
			continue
		}
		if t.BatchID == batchID {
			out = append(out, t)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].WalkSequence < out[j].WalkSequence })
	return out, nil
}

func (s *Service) CreateBatch(soIdentifiers []string, warehouseID int64, username string, allowed []int64, isAdmin bool) (Batch, []Task, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if len(soIdentifiers) == 0 || warehouseID <= 0 {
		return Batch{}, nil, ErrInvalid
	}
	if !isAdmin && !contains(allowed, warehouseID) {
		return Batch{}, nil, ErrScope
	}
	var sos []salesorders.SalesOrder
	var soIDs []int64
	for _, id := range soIdentifiers {
		so, err := s.sos.FindByBarcode(id)
		if err != nil {
			if n, e := strconv.ParseInt(id, 10, 64); e == nil {
				so, err = s.sos.Get(n)
			}
		}
		if err != nil {
			return Batch{}, nil, fmt.Errorf("%w: %s", ErrNotFound, id)
		}
		if so.WarehouseID != warehouseID {
			return Batch{}, nil, ErrScope
		}
		sos = append(sos, so)
		soIDs = append(soIDs, so.SOID)
	}
	balances, _, err := s.ledger.List()
	if err != nil {
		return Batch{}, nil, err
	}
	bins, _ := s.master.ListBins()
	binByID := map[int64]catalog.Bin{}
	for _, b := range bins {
		binByID[b.BinID] = b
	}
	batchID, err := s.nextID("batches")
	if err != nil {
		return Batch{}, nil, err
	}
	batch := Batch{
		BatchID: batchID, WarehouseID: warehouseID, AssignedTo: username,
		Status: StatusOpen, TotalOrders: len(sos), CreatedAt: time.Now().UTC(), SOIDs: soIDs,
	}
	seq := 0
	var tasks []Task
	for _, so := range sos {
		for _, line := range so.Lines {
			need := line.QuantityOrdered - line.QuantityPicked
			if need <= 0 {
				continue
			}
			// find pickable bin with stock
			var bestBin int64
			var bestCode string
			for _, bal := range balances {
				if bal.WarehouseID != warehouseID || bal.ItemID != line.ItemID || bal.OnHand-bal.Allocated < need {
					continue
				}
				bin, ok := binByID[bal.BinID]
				if !ok || (bin.BinType != "Pickable" && bin.BinType != "PickableStaging") {
					continue
				}
				bestBin = bal.BinID
				bestCode = bin.BinCode
				break
			}
			if bestBin == 0 {
				continue
			}
			item, _ := s.master.GetItem(line.ItemID)
			tid, err := s.nextID("tasks")
			if err != nil {
				return Batch{}, nil, err
			}
			seq++
			t := Task{
				PickTaskID: tid, BatchID: batchID, SOID: so.SOID, SOLineID: line.SOLineID,
				ItemID: line.ItemID, BinID: bestBin, QuantityOrdered: need, Status: TaskPending,
				SKU: item.SKU, ItemName: item.ItemName, BinCode: bestCode, WalkSequence: seq,
			}
			data, _ := json.Marshal(t)
			if _, err := s.store.Put(taskKind, strconv.FormatInt(tid, 10), data); err != nil {
				return Batch{}, nil, err
			}
			// allocate
			opID := fmt.Sprintf("alloc-pick-%d", tid)
			_, _ = s.ledger.Allocate(inventoryledger.QuantityCommand{
				OperationID: opID, WarehouseID: warehouseID, BinID: bestBin, ItemID: line.ItemID, Quantity: need,
			})
			tasks = append(tasks, t)
		}
	}
	if len(tasks) == 0 {
		return Batch{}, nil, fmt.Errorf("%w: no pickable stock", ErrInvalid)
	}
	data, _ := json.Marshal(batch)
	if _, err := s.store.Put(batchKind, strconv.FormatInt(batchID, 10), data); err != nil {
		return Batch{}, nil, err
	}
	return batch, tasks, nil
}

func (s *Service) GetBatch(batchID int64) (Batch, []Task, error) {
	record, ok, err := s.store.Get(batchKind, strconv.FormatInt(batchID, 10))
	if err != nil {
		return Batch{}, nil, err
	}
	if !ok {
		return Batch{}, nil, ErrNotFound
	}
	var b Batch
	if err := json.Unmarshal(record.Data, &b); err != nil {
		return Batch{}, nil, err
	}
	tasks, err := s.tasksForBatch(batchID)
	return b, tasks, err
}

func (s *Service) NextTask(batchID int64) (map[string]any, error) {
	tasks, err := s.tasksForBatch(batchID)
	if err != nil {
		return nil, err
	}
	for _, t := range tasks {
		if t.Status == TaskPending {
			return map[string]any{"task": t, "done": false}, nil
		}
	}
	return map[string]any{"done": true}, nil
}

func (s *Service) Confirm(taskID int64, scanned string, qty int64) (Task, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	record, ok, err := s.store.Get(taskKind, strconv.FormatInt(taskID, 10))
	if err != nil {
		return Task{}, err
	}
	if !ok {
		return Task{}, ErrNotFound
	}
	var t Task
	if err := json.Unmarshal(record.Data, &t); err != nil {
		return Task{}, err
	}
	if t.Status != TaskPending {
		return Task{}, ErrLocked
	}
	item, err := s.master.GetItem(t.ItemID)
	if err != nil {
		return Task{}, err
	}
	scanned = strings.TrimSpace(scanned)
	if scanned != item.SKU && scanned != item.ItemName {
		if item.UPC == nil || *item.UPC != scanned {
			bin, _ := s.master.GetBin(t.BinID)
			if bin.BinBarcode != scanned && bin.BinCode != scanned {
				return Task{}, ErrBarcode
			}
		}
	}
	if qty <= 0 {
		qty = t.QuantityOrdered
	}
	if qty > t.QuantityOrdered {
		qty = t.QuantityOrdered
	}
	// release allocation then reduce on-hand (pick removes from bin)
	opRel := fmt.Sprintf("rel-pick-%d", taskID)
	_, _ = s.ledger.Release(inventoryledger.QuantityCommand{
		OperationID: opRel, WarehouseID: 0, BinID: t.BinID, ItemID: t.ItemID, Quantity: t.QuantityOrdered,
	})
	// get warehouse from batch
	bRec, ok, _ := s.store.Get(batchKind, strconv.FormatInt(t.BatchID, 10))
	var warehouseID int64
	if ok {
		var b Batch
		_ = json.Unmarshal(bRec.Data, &b)
		warehouseID = b.WarehouseID
		if b.Status == StatusOpen {
			b.Status = StatusInProgress
			bd, _ := json.Marshal(b)
			_, _ = s.store.Put(batchKind, strconv.FormatInt(b.BatchID, 10), bd)
		}
	}
	opAdj := fmt.Sprintf("pick-%d", taskID)
	_, err = s.ledger.Adjust(inventoryledger.AdjustCommand{
		OperationID: opAdj, WarehouseID: warehouseID, BinID: t.BinID, ItemID: t.ItemID, Delta: -qty,
	})
	if err != nil {
		return Task{}, err
	}
	t.QuantityPicked = qty
	t.Status = TaskPicked
	data, _ := json.Marshal(t)
	if _, err := s.store.Put(taskKind, strconv.FormatInt(taskID, 10), data); err != nil {
		return Task{}, err
	}
	// update SO line
	so, err := s.sos.Get(t.SOID)
	if err == nil {
		for i := range so.Lines {
			if so.Lines[i].SOLineID == t.SOLineID {
				so.Lines[i].QuantityPicked += qty
				if so.Lines[i].QuantityPicked >= so.Lines[i].QuantityOrdered {
					so.Lines[i].Status = salesorders.LinePicked
				}
			}
		}
		allPicked := true
		for _, l := range so.Lines {
			if l.QuantityPicked < l.QuantityOrdered {
				allPicked = false
				break
			}
		}
		if allPicked {
			so.Status = salesorders.StatusPicked
		}
		_ = s.sos.Save(so)
	}
	return t, nil
}

func (s *Service) Short(taskID int64, qtyAvailable int64) (Task, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	record, ok, err := s.store.Get(taskKind, strconv.FormatInt(taskID, 10))
	if err != nil || !ok {
		return Task{}, ErrNotFound
	}
	var t Task
	if err := json.Unmarshal(record.Data, &t); err != nil {
		return Task{}, err
	}
	if t.Status != TaskPending {
		return Task{}, ErrLocked
	}
	if qtyAvailable < 0 {
		qtyAvailable = 0
	}
	opRel := fmt.Sprintf("rel-short-%d", taskID)
	_, _ = s.ledger.Release(inventoryledger.QuantityCommand{
		OperationID: opRel, BinID: t.BinID, ItemID: t.ItemID, Quantity: t.QuantityOrdered,
	})
	if qtyAvailable > 0 {
		bRec, ok, _ := s.store.Get(batchKind, strconv.FormatInt(t.BatchID, 10))
		var warehouseID int64
		if ok {
			var b Batch
			_ = json.Unmarshal(bRec.Data, &b)
			warehouseID = b.WarehouseID
		}
		opAdj := fmt.Sprintf("short-pick-%d", taskID)
		_, _ = s.ledger.Adjust(inventoryledger.AdjustCommand{
			OperationID: opAdj, WarehouseID: warehouseID, BinID: t.BinID, ItemID: t.ItemID, Delta: -qtyAvailable,
		})
		t.QuantityPicked = qtyAvailable
	}
	t.Status = TaskShort
	data, _ := json.Marshal(t)
	_, err = s.store.Put(taskKind, strconv.FormatInt(taskID, 10), data)
	return t, err
}

func (s *Service) CompleteBatch(batchID int64) (Batch, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	record, ok, err := s.store.Get(batchKind, strconv.FormatInt(batchID, 10))
	if err != nil || !ok {
		return Batch{}, ErrNotFound
	}
	var b Batch
	if err := json.Unmarshal(record.Data, &b); err != nil {
		return Batch{}, err
	}
	tasks, _ := s.tasksForBatch(batchID)
	for _, t := range tasks {
		if t.Status == TaskPending {
			return Batch{}, fmt.Errorf("%w: pending tasks remain", ErrLocked)
		}
	}
	b.Status = StatusComplete
	data, _ := json.Marshal(b)
	_, err = s.store.Put(batchKind, strconv.FormatInt(batchID, 10), data)
	return b, err
}

func (s *Service) CancelBatch(batchID int64) (Batch, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	record, ok, err := s.store.Get(batchKind, strconv.FormatInt(batchID, 10))
	if err != nil || !ok {
		return Batch{}, ErrNotFound
	}
	var b Batch
	if err := json.Unmarshal(record.Data, &b); err != nil {
		return Batch{}, err
	}
	if b.Status == StatusComplete {
		return Batch{}, ErrLocked
	}
	tasks, _ := s.tasksForBatch(batchID)
	for _, t := range tasks {
		if t.Status == TaskPending {
			opRel := fmt.Sprintf("rel-cancel-%d", t.PickTaskID)
			_, _ = s.ledger.Release(inventoryledger.QuantityCommand{
				OperationID: opRel, BinID: t.BinID, ItemID: t.ItemID, Quantity: t.QuantityOrdered,
			})
			t.Status = StatusCancelled
			td, _ := json.Marshal(t)
			_, _ = s.store.Put(taskKind, strconv.FormatInt(t.PickTaskID, 10), td)
		}
	}
	b.Status = StatusCancelled
	data, _ := json.Marshal(b)
	_, err = s.store.Put(batchKind, strconv.FormatInt(batchID, 10), data)
	return b, err
}
