package salesorders

import (
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/catalog"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
)

var (
	ErrNotFound = errors.New("sales order not found")
	ErrInvalid  = errors.New("invalid sales order")
	ErrLocked   = errors.New("sales order locked")
)

const (
	soKind    = "sales-orders"
	soSeqKind = "sales-order-sequences"
	StatusOpen     = "OPEN"
	StatusPicked   = "PICKED"
	StatusPacked   = "PACKED"
	StatusShipped  = "SHIPPED"
	StatusRefunded = "REFUNDED"
	StatusPartiallyRefunded = "PARTIALLY_REFUNDED"
	StatusClosed   = "CLOSED"
	LineOpen       = "OPEN"
	LinePicked     = "PICKED"
	LinePacked     = "PACKED"
	LineShipped    = "SHIPPED"
	LineRefunded   = "REFUNDED"
)

type Line struct {
	SOLineID         int64 `json:"so_line_id"`
	LineNumber       int   `json:"line_number"`
	ItemID           int64 `json:"item_id"`
	QuantityOrdered  int64 `json:"quantity_ordered"`
	QuantityAllocated int64 `json:"quantity_allocated"`
	QuantityPicked   int64 `json:"quantity_picked"`
	QuantityPacked   int64 `json:"quantity_packed"`
	QuantityShipped  int64 `json:"quantity_shipped"`
	Status           string `json:"status"`
}

type SalesOrder struct {
	SOID        int64     `json:"so_id"`
	SONumber    string    `json:"so_number"`
	SOBarcode   string    `json:"so_barcode"`
	WarehouseID int64     `json:"warehouse_id"`
	Status      string    `json:"status"`
	CustomerName string   `json:"customer_name,omitempty"`
	Notes       string    `json:"notes,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	CreatedBy   string    `json:"created_by"`
	Lines       []Line    `json:"lines"`
}

type LineInput struct {
	ItemID          int64 `json:"item_id"`
	QuantityOrdered int64 `json:"quantity_ordered"`
}

type CreateInput struct {
	SONumber     string      `json:"so_number"`
	WarehouseID  int64       `json:"warehouse_id"`
	Lines        []LineInput `json:"lines"`
	SOBarcode    *string     `json:"so_barcode"`
	CustomerName *string     `json:"customer_name"`
	Notes        *string     `json:"notes"`
}

type Repository struct {
	store   *corestore.Store
	catalog *catalog.Repository
	mu      sync.Mutex
}

func New(store *corestore.Store, master *catalog.Repository) *Repository {
	return &Repository{store: store, catalog: master}
}

func (r *Repository) nextID(kind string) (int64, error) {
	record, found, err := r.store.Get(soSeqKind, kind)
	if err != nil {
		return 0, err
	}
	next := int64(1)
	if found {
		var state struct {
			Next int64 `json:"next"`
		}
		if err := json.Unmarshal(record.Data, &state); err != nil {
			return 0, err
		}
		if state.Next > 0 {
			next = state.Next
		}
	}
	data, _ := json.Marshal(map[string]int64{"next": next + 1})
	if _, err := r.store.Put(soSeqKind, kind, data); err != nil {
		return 0, err
	}
	return next, nil
}

func (r *Repository) persist(so SalesOrder) error {
	data, err := json.Marshal(so)
	if err != nil {
		return err
	}
	_, err = r.store.Put(soKind, strconv.FormatInt(so.SOID, 10), data)
	return err
}

func (r *Repository) List() ([]SalesOrder, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	records, err := r.store.List(soKind)
	if err != nil {
		return nil, err
	}
	out := make([]SalesOrder, 0, len(records))
	for _, record := range records {
		var so SalesOrder
		if err := json.Unmarshal(record.Data, &so); err != nil {
			return nil, err
		}
		out = append(out, so)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].SOID > out[j].SOID })
	return out, nil
}

func (r *Repository) Get(id int64) (SalesOrder, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.getLocked(id)
}

func (r *Repository) getLocked(id int64) (SalesOrder, error) {
	var so SalesOrder
	record, ok, err := r.store.Get(soKind, strconv.FormatInt(id, 10))
	if err != nil {
		return so, err
	}
	if !ok {
		return so, ErrNotFound
	}
	if err := json.Unmarshal(record.Data, &so); err != nil {
		return so, err
	}
	if so.Lines == nil {
		so.Lines = []Line{}
	}
	return so, nil
}

func (r *Repository) Save(so SalesOrder) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.persist(so)
}

func (r *Repository) FindByBarcode(barcode string) (SalesOrder, error) {
	barcode = strings.TrimSpace(barcode)
	all, err := r.List()
	if err != nil {
		return SalesOrder{}, err
	}
	for _, so := range all {
		if so.SOBarcode == barcode || so.SONumber == barcode {
			return so, nil
		}
	}
	return SalesOrder{}, ErrNotFound
}

func (r *Repository) Create(input CreateInput, username string) (SalesOrder, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if strings.TrimSpace(input.SONumber) == "" || input.WarehouseID <= 0 || len(input.Lines) == 0 {
		return SalesOrder{}, ErrInvalid
	}
	if _, err := r.catalog.GetWarehouse(input.WarehouseID); err != nil {
		return SalesOrder{}, ErrInvalid
	}
	id, err := r.nextID("sales-orders")
	if err != nil {
		return SalesOrder{}, err
	}
	barcode := input.SONumber
	if input.SOBarcode != nil && *input.SOBarcode != "" {
		barcode = *input.SOBarcode
	}
	so := SalesOrder{
		SOID: id, SONumber: input.SONumber, SOBarcode: barcode,
		WarehouseID: input.WarehouseID, Status: StatusOpen,
		CreatedAt: time.Now().UTC(), CreatedBy: username, Lines: []Line{},
	}
	if input.CustomerName != nil {
		so.CustomerName = *input.CustomerName
	}
	if input.Notes != nil {
		so.Notes = *input.Notes
	}
	for i, line := range input.Lines {
		if line.ItemID <= 0 || line.QuantityOrdered <= 0 {
			return SalesOrder{}, ErrInvalid
		}
		if _, err := r.catalog.GetItem(line.ItemID); err != nil {
			return SalesOrder{}, fmt.Errorf("%w: item", ErrInvalid)
		}
		lid, err := r.nextID("sales-order-lines")
		if err != nil {
			return SalesOrder{}, err
		}
		so.Lines = append(so.Lines, Line{
			SOLineID: lid, LineNumber: i + 1, ItemID: line.ItemID,
			QuantityOrdered: line.QuantityOrdered, Status: LineOpen,
		})
	}
	if err := r.persist(so); err != nil {
		return SalesOrder{}, err
	}
	return so, nil
}
