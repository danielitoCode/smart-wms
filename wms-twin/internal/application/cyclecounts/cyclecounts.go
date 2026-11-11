package cyclecounts

import (
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"sync"
	"time"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/catalog"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/inventoryledger"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
)

var (
	ErrNotFound = errors.New("cycle count not found")
	ErrInvalid  = errors.New("invalid cycle count")
	ErrScope    = errors.New("warehouse scope denied")
)

const (
	kind            = "cycle-counts"
	seqKind         = "cycle-count-sequences"
	StatusOpen      = "OPEN"
	StatusSubmitted = "SUBMITTED"
)

type Line struct {
	BinID            int64  `json:"bin_id"`
	ItemID           int64  `json:"item_id"`
	ExpectedQuantity int64  `json:"expected_quantity"`
	CountedQuantity  *int64 `json:"counted_quantity"`
	LotNumber        string `json:"lot_number,omitempty"`
}

type Count struct {
	CountID     int64     `json:"count_id"`
	WarehouseID int64     `json:"warehouse_id"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
	CreatedBy   string    `json:"created_by"`
	Lines       []Line    `json:"lines"`
}

type Service struct {
	store  *corestore.Store
	master *catalog.Repository
	ledger *inventoryledger.Ledger
	mu     sync.Mutex
}

func New(store *corestore.Store, master *catalog.Repository, ledger *inventoryledger.Ledger) *Service {
	return &Service{store: store, master: master, ledger: ledger}
}

func contains(ids []int64, id int64) bool {
	for _, v := range ids {
		if v == id {
			return true
		}
	}
	return false
}

func (s *Service) nextID() (int64, error) {
	record, found, err := s.store.Get(seqKind, "global")
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
	if _, err := s.store.Put(seqKind, "global", data); err != nil {
		return 0, err
	}
	return next, nil
}

func (s *Service) Create(warehouseID int64, binIDs []int64, actor string, allowed []int64, isAdmin bool) (Count, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if warehouseID <= 0 {
		return Count{}, ErrInvalid
	}
	if !isAdmin && !contains(allowed, warehouseID) {
		return Count{}, ErrScope
	}
	balances, _, err := s.ledger.List()
	if err != nil {
		return Count{}, err
	}
	binFilter := map[int64]bool{}
	for _, id := range binIDs {
		binFilter[id] = true
	}
	id, err := s.nextID()
	if err != nil {
		return Count{}, err
	}
	c := Count{
		CountID: id, WarehouseID: warehouseID, Status: StatusOpen,
		CreatedAt: time.Now().UTC(), CreatedBy: actor, Lines: []Line{},
	}
	for _, bal := range balances {
		if bal.WarehouseID != warehouseID || bal.OnHand < 0 {
			continue
		}
		if len(binFilter) > 0 && !binFilter[bal.BinID] {
			continue
		}
		c.Lines = append(c.Lines, Line{
			BinID: bal.BinID, ItemID: bal.ItemID,
			ExpectedQuantity: bal.OnHand, LotNumber: bal.LotNumber,
		})
	}
	data, _ := json.Marshal(c)
	if _, err := s.store.Put(kind, strconv.FormatInt(id, 10), data); err != nil {
		return Count{}, err
	}
	return c, nil
}

func (s *Service) Get(id int64) (Count, error) {
	record, ok, err := s.store.Get(kind, strconv.FormatInt(id, 10))
	if err != nil {
		return Count{}, err
	}
	if !ok {
		return Count{}, ErrNotFound
	}
	var c Count
	if err := json.Unmarshal(record.Data, &c); err != nil {
		return Count{}, err
	}
	return c, nil
}

type SubmitLine struct {
	BinID           int64  `json:"bin_id"`
	ItemID          int64  `json:"item_id"`
	CountedQuantity int64  `json:"counted_quantity"`
	LotNumber       string `json:"lot_number"`
}

func (s *Service) Submit(id int64, lines []SubmitLine, allowed []int64, isAdmin bool) (Count, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	c, err := s.Get(id)
	if err != nil {
		return Count{}, err
	}
	if !isAdmin && !contains(allowed, c.WarehouseID) {
		return Count{}, ErrScope
	}
	if c.Status != StatusOpen {
		return Count{}, ErrInvalid
	}
	counted := map[string]int64{}
	for _, l := range lines {
		key := fmt.Sprintf("%d:%d:%s", l.BinID, l.ItemID, l.LotNumber)
		counted[key] = l.CountedQuantity
	}
	for i := range c.Lines {
		key := fmt.Sprintf("%d:%d:%s", c.Lines[i].BinID, c.Lines[i].ItemID, c.Lines[i].LotNumber)
		if v, ok := counted[key]; ok {
			val := v
			c.Lines[i].CountedQuantity = &val
			delta := v - c.Lines[i].ExpectedQuantity
			if delta != 0 {
				opID := fmt.Sprintf("cc-%d-%d-%d", id, c.Lines[i].BinID, c.Lines[i].ItemID)
				_, err := s.ledger.Adjust(inventoryledger.AdjustCommand{
					OperationID: opID, WarehouseID: c.WarehouseID, BinID: c.Lines[i].BinID,
					ItemID: c.Lines[i].ItemID, LotNumber: c.Lines[i].LotNumber, Delta: delta,
				})
				if err != nil {
					return Count{}, err
				}
			}
		}
	}
	c.Status = StatusSubmitted
	data, _ := json.Marshal(c)
	if _, err := s.store.Put(kind, strconv.FormatInt(id, 10), data); err != nil {
		return Count{}, err
	}
	return c, nil
}
