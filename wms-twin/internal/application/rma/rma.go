package rma

import (
	"encoding/json"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/danielitoCode/smart-wms/wms-twin/internal/application/salesorders"
	"github.com/danielitoCode/smart-wms/wms-twin/internal/corestore"
)

const kind = "wms_rma"

var ErrNotFound = errors.New("rma not found")

type RMA struct {
	RMAID     int64     `json:"rma_id"`
	SOID      int64     `json:"so_id"`
	SONumber  string    `json:"so_number"`
	Status    string    `json:"status"`
	Reason    string    `json:"reason"`
	CreatedAt time.Time `json:"created_at"`
	CreatedBy string    `json:"created_by"`
	Backorder bool      `json:"backorder"`
	UpdatedAt time.Time `json:"updated_at,omitempty"`
	Notes     string    `json:"notes,omitempty"`
}

type Service struct {
	store *corestore.Store
	sos   *salesorders.Repository
	mu    sync.Mutex
	seq   int64
}

func New(store *corestore.Store, sos *salesorders.Repository) *Service {
	return &Service{store: store, sos: sos}
}

func (s *Service) Create(soNumber, reason, actor string, backorder bool) (RMA, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
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
	s.seq++
	r := RMA{
		RMAID: s.seq, SOID: so.SOID, SONumber: so.SONumber,
		Status: "OPEN", Reason: reason, CreatedAt: time.Now().UTC(),
		CreatedBy: actor, Backorder: backorder, UpdatedAt: time.Now().UTC(),
	}
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

func (s *Service) Complete(id int64, actor string) (RMA, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	r, err := s.Get(id)
	if err != nil {
		return RMA{}, err
	}
	if r.Status != "OPEN" && r.Status != "RECEIVED" {
		return RMA{}, fmt.Errorf("rma status %s cannot complete", r.Status)
	}
	r.Status = "COMPLETED"
	r.UpdatedAt = time.Now().UTC()
	r.Notes = "completed by " + actor + "; restock deferred to inventory adjust"
	data, _ := json.Marshal(r)
	_, err = s.store.Put(kind, formatID(r.RMAID), data)
	return r, err
}

func (s *Service) Cancel(id int64, actor string) (RMA, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	r, err := s.Get(id)
	if err != nil {
		return RMA{}, err
	}
	if r.Status == "COMPLETED" {
		return RMA{}, fmt.Errorf("cannot cancel completed rma")
	}
	r.Status = "CANCELLED"
	r.UpdatedAt = time.Now().UTC()
	r.Notes = "cancelled by " + actor
	data, _ := json.Marshal(r)
	_, err = s.store.Put(kind, formatID(r.RMAID), data)
	return r, err
}

func formatID(id int64) string { return fmt.Sprintf("%d", id) }
